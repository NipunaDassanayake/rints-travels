/**
 * =========================================================
 * CR-012 Security E2E Helpers (test-only)
 * =========================================================
 *
 * Used by frontend/tests/e2e/security-hardening.spec.ts.
 * Local, non-production databases only (e2e-guards). Every
 * scenario that reads or writes data is restricted to accounts
 * the suite created itself: TOURIST accounts matching
 * e2e-*@travora.com (the CR-018 cleanup scope).
 *
 * Scenarios (output: one E2E_FIXTURE_JSON=<json> line):
 *   mint-legacy-access <userId>
 *   mint-hs512-access <userId> <sessionId>
 *   session-state <sessionId>
 *   backdate-session <sessionId> <lastUsedAt|createdAt> <ms>
 *   seed-cleanup-fixtures <userId>
 *   ratelimit-harness
 */

const crypto = require("crypto");

const {
  loadBackendEnv,
  assertSafeE2EEnvironment,
} = require("./lib/e2e-guards");

loadBackendEnv();

assertSafeE2EEnvironment("Security E2E helpers");

const DAY_MS = 24 * 60 * 60 * 1000;

class HelperError extends Error {}

function output(result) {
  console.log(`E2E_FIXTURE_JSON=${JSON.stringify(result)}`);
}

function getPrisma() {
  return require("../src/config/prisma");
}

async function assertE2EUser(prisma, userId) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  if (
    !user ||
    user.role !== "TOURIST" ||
    !user.email.startsWith("e2e-") ||
    !user.email.endsWith("@travora.com")
  ) {
    throw new HelperError(
      "refused: only E2E-created tourist accounts (e2e-*@travora.com) are allowed.",
    );
  }

  return user;
}

async function findE2ESession(prisma, sessionId) {
  const session = await prisma.refreshToken.findUnique({
    where: {
      sessionId,
    },
  });

  if (!session) {
    throw new HelperError("refused: unknown session.");
  }

  await assertE2EUser(prisma, session.userId);

  return session;
}

/**
 * =========================================================
 * Tokens
 * =========================================================
 */

async function mintLegacyAccess(userId) {
  const prisma = getPrisma();

  const user = await assertE2EUser(prisma, userId);

  const env = require("../src/config/env");

  const jwt = require("jsonwebtoken");

  // The pre-CR-012 access-token shape: no session id.
  const token = jwt.sign(
    {
      sub: user.id,
      role: user.role,
      type: "access",
    },
    env.jwt.accessSecret,
    {
      algorithm: "HS256",
      expiresIn: "5m",
    },
  );

  return {
    token,
  };
}

async function mintHs512Access(userId, sessionId) {
  const prisma = getPrisma();

  const user = await assertE2EUser(prisma, userId);

  const session = await findE2ESession(prisma, sessionId);

  if (session.userId !== user.id) {
    throw new HelperError("refused: session belongs to another user.");
  }

  const env = require("../src/config/env");

  const jwt = require("jsonwebtoken");

  // Correct secret and claims, but a non-pinned algorithm.
  const token = jwt.sign(
    {
      sub: user.id,
      sid: session.sessionId,
      role: user.role,
      type: "access",
    },
    env.jwt.accessSecret,
    {
      algorithm: "HS512",
      expiresIn: "5m",
    },
  );

  return {
    token,
  };
}

/**
 * =========================================================
 * Sessions
 * =========================================================
 */

async function sessionState(sessionId) {
  const prisma = getPrisma();

  const session = await findE2ESession(prisma, sessionId);

  return {
    revoked: session.revokedAt !== null,
    expiresAt: session.expiresAt.toISOString(),
    createdAt: session.createdAt.toISOString(),
    lastUsedAt: session.lastUsedAt ? session.lastUsedAt.toISOString() : null,
  };
}

async function backdateSession(sessionId, field, msRaw) {
  if (!["lastUsedAt", "createdAt"].includes(field)) {
    throw new HelperError("refused: field must be lastUsedAt or createdAt.");
  }

  const ms = Number(msRaw);

  if (!Number.isInteger(ms) || ms <= 0) {
    throw new HelperError("refused: ms must be a positive integer.");
  }

  const prisma = getPrisma();

  const session = await findE2ESession(prisma, sessionId);

  const base = session[field] ?? new Date();

  await prisma.refreshToken.update({
    where: {
      id: session.id,
    },
    data: {
      [field]: new Date(base.getTime() - ms),
    },
  });

  return sessionState(sessionId);
}

/**
 * Seven dead/alive sessions around the 7-day retention cutoff
 * for one E2E account that never logs in.
 */
async function seedCleanupFixtures(userId) {
  const prisma = getPrisma();

  const user = await assertE2EUser(prisma, userId);

  const [row] = await prisma.$queryRaw`SELECT now() AS now`;

  const now = new Date(row.now).getTime();

  const at = (days) => new Date(now + days * DAY_MS);

  const fixtures = {
    active: { revokedAt: null, expiresAt: at(1) },
    revoked6DaysAgo: { revokedAt: at(-6), expiresAt: at(1) },
    revoked8DaysAgo: { revokedAt: at(-8), expiresAt: at(-1) },
    expired6DaysAgo: { revokedAt: null, expiresAt: at(-6) },
    expired8DaysAgo: { revokedAt: null, expiresAt: at(-8) },
    revokedLongAgoFutureExpiry: { revokedAt: at(-30), expiresAt: at(5) },
    expiredLongAgoRevokedRecently: { revokedAt: at(-2), expiresAt: at(-60) },
  };

  for (const fixture of Object.values(fixtures)) {
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        sessionId: crypto.randomUUID(),
        tokenHash: crypto.randomBytes(32).toString("hex"),
        userAgent: "cr012-cleanup-fixture",
        ...fixture,
      },
    });
  }

  return {
    seeded: Object.keys(fixtures).length,
  };
}

/**
 * =========================================================
 * Rate-limit harness
 * =========================================================
 *
 * Throwaway Express apps on ephemeral loopback ports using the
 * REAL limiter factories (fresh memory stores per app). With
 * trust proxy = loopback -- inside the harness only -- client
 * addresses can be simulated through X-Forwarded-For.
 */

async function withHarness({ trustProxy }, run) {
  const express = require("express");

  const {
    createLoginAccountLimiter,
    createLoginIpLimiter,
  } = require("../src/middlewares/rateLimiters");

  const app = express();

  app.set("trust proxy", trustProxy);

  app.use(express.json());

  app.post(
    "/login",
    createLoginAccountLimiter(),
    createLoginIpLimiter(),
    (req, res) => {
      if (req.body.password === "right") {
        return res.status(200).json({ ok: true });
      }

      return res.status(401).json({ ok: false });
    },
  );

  const server = await new Promise((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });

  const { port } = server.address();

  const login = async ({ ip, email, password = "wrong" }) => {
    const headers = {
      "Content-Type": "application/json",
    };

    if (ip) {
      headers["X-Forwarded-For"] = ip;
    }

    const response = await fetch(`http://127.0.0.1:${port}/login`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email, password }),
    });

    await response.text();

    return response.status;
  };

  const repeat = async (times, request) => {
    const statuses = [];

    for (let index = 0; index < times; index += 1) {
      statuses.push(await login(request(index)));
    }

    return statuses;
  };

  try {
    return await run({ login, repeat });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function rateLimitHarness() {
  const env = require("../src/config/env");

  if (!env.rateLimit.enabled) {
    throw new HelperError("refused: AUTH_RATE_LIMIT_ENABLED is false.");
  }

  const { loginAccountMax, loginIpMax } = env.rateLimit;

  const results = {
    loginAccountMax,
    loginIpMax,
  };

  // 1 + 2: one IPv6 /56 is one client; other networks unaffected.
  results.ipv6 = await withHarness({ trustProxy: "loopback" }, async ({ login, repeat }) => {
    const email = "victim@travora.com";

    const failures = await repeat(loginAccountMax, () => ({
      ip: "2001:db8:1::1",
      email,
    }));

    return {
      failures,
      sameSlash56OtherSlash64: await login({ ip: "2001:db8:1:ab::1", email }),
      sameSlash56OtherHost: await login({ ip: "2001:db8:1::ffff", email }),
      otherSlash56: await login({ ip: "2001:db8:2::1", email }),
      otherSlash56CorrectPassword: await login({
        ip: "2001:db8:2::1",
        email,
        password: "right",
      }),
    };
  });

  // 3: IPv4-mapped IPv6 and plain IPv4 are the same client.
  results.mappedIpv4 = await withHarness({ trustProxy: "loopback" }, async ({ login, repeat }) => {
    const email = "mapped@travora.com";

    const failures = await repeat(loginAccountMax, (index) => ({
      ip: index % 2 === 0 ? "::ffff:203.0.113.5" : "203.0.113.5",
      email,
    }));

    return {
      failures,
      plain: await login({ ip: "203.0.113.5", email }),
      mapped: await login({ ip: "::ffff:203.0.113.5", email }),
    };
  });

  // 4: email case / whitespace variants share one bucket.
  results.emailNormalization = await withHarness(
    { trustProxy: "loopback" },
    async ({ login, repeat }) => {
      const failures = await repeat(loginAccountMax, (index) => ({
        ip: "198.51.100.20",
        email: index % 2 === 0 ? "Case@Travora.COM" : "  case@travora.com ",
      }));

      return {
        failures,
        next: await login({ ip: "198.51.100.20", email: "case@travora.com" }),
      };
    },
  );

  // 5: shared IPv4 -- one account locked, another unaffected.
  results.sharedIpv4 = await withHarness({ trustProxy: "loopback" }, async ({ login, repeat }) => {
    const ip = "198.51.100.7";

    const accountAFailures = await repeat(loginAccountMax, () => ({
      ip,
      email: "a@travora.com",
    }));

    return {
      accountAFailures,
      accountANext: await login({ ip, email: "a@travora.com", password: "right" }),
      accountBSuccesses: await repeat(5, () => ({
        ip,
        email: "b@travora.com",
        password: "right",
      })),
      accountBFailure: await login({ ip, email: "b@travora.com" }),
    };
  });

  // 6: credential stuffing across many emails from one IP.
  results.stuffing = await withHarness({ trustProxy: "loopback" }, async ({ login, repeat }) => {
    const ip = "192.0.2.10";

    const failures = await repeat(loginIpMax, (index) => ({
      ip,
      email: `stuffing-${index}@travora.com`,
    }));

    return {
      failures,
      nextNewEmail: await login({ ip, email: "stuffing-new@travora.com" }),
      nextCorrectPassword: await login({
        ip,
        email: "innocent@travora.com",
        password: "right",
      }),
      otherIp: await login({ ip: "192.0.2.11", email: "stuffing-new@travora.com" }),
    };
  });

  // 7: successful logins never count.
  results.successes = await withHarness({ trustProxy: "loopback" }, async ({ login, repeat }) => {
    const ip = "198.51.100.30";

    const email = "busy@travora.com";

    const successes = await repeat(50, () => ({ ip, email, password: "right" }));

    return {
      successes,
      failuresAfter: await repeat(loginAccountMax, () => ({ ip, email })),
      nextAfterFailures: await login({ ip, email }),
    };
  });

  // 8: without trust proxy, X-Forwarded-For cannot split a client.
  results.spoofedForwardedFor = await withHarness({ trustProxy: false }, async ({ login, repeat }) => {
    const email = "spoof@travora.com";

    const failures = await repeat(loginAccountMax, (index) => ({
      ip: `203.0.113.${index + 1}`,
      email,
    }));

    return {
      failures,
      next: await login({ ip: "2001:db8:9::1", email }),
    };
  });

  return results;
}

/**
 * =========================================================
 * Entry point
 * =========================================================
 */

async function main() {
  const [scenario, ...args] = process.argv.slice(2);

  const scenarios = {
    "mint-legacy-access": () => mintLegacyAccess(args[0]),
    "mint-hs512-access": () => mintHs512Access(args[0], args[1]),
    "session-state": () => sessionState(args[0]),
    "backdate-session": () => backdateSession(args[0], args[1], args[2]),
    "seed-cleanup-fixtures": () => seedCleanupFixtures(args[0]),
    "ratelimit-harness": () => rateLimitHarness(),
  };

  if (!scenarios[scenario]) {
    throw new HelperError(`unknown scenario "${scenario}".`);
  }

  output(await scenarios[scenario]());
}

main()
  .catch((error) => {
    console.error(
      error instanceof HelperError ? `Security helper ${error.message}` : error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    const prismaPath = require.resolve("../src/config/prisma");

    if (require.cache[prismaPath]) {
      await require.cache[prismaPath].exports.$disconnect();
    }
  });
