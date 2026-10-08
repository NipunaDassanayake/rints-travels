/**
 * =========================================================
 * CR-032 Booking Lifecycle Confirmation E2E Helpers (test-only)
 * =========================================================
 *
 * Used by frontend/tests/e2e/tour-confirmation.spec.ts.
 * Local, non-production databases only (e2e-guards). Writes are
 * restricted to E2E fixture data:
 *
 *   create-guide <label>
 *     Creates a dedicated fixture guide (e2e-guide-*@travora.com,
 *     the CR-018 cleanup scope; *@e2e.travora.test is not used
 *     because the login API rejects that TLD) through the real tour-guide
 *     service. Outputs its id, email, name and a random
 *     password -- the spec logs in as this guide.
 *
 *   challenges <bookingId>
 *     Read-only: the booking's lifecycle fields and its
 *     confirmation-code rows (including the stored hash, so the
 *     spec can check the plaintext code is never stored).
 *
 *   expire <bookingId> <START|COMPLETE>
 *     Moves the usable code's expiry into the past, as if its
 *     5 minutes had elapsed. Fixture bookings only.
 *
 *   duplicate-open <bookingId> <START|COMPLETE>
 *     Inserts a second OPEN code (random hash) next to the open
 *     one, breaking the one-open-code invariant on purpose, so
 *     the spec can prove verification fails closed.
 *
 *   lifecycle-ratelimit <bookingA> <bookingB>
 *     Requires AUTH_RATE_LIMIT_ENABLED=true in THIS process's
 *     environment (set by the spec; backend/.env is untouched).
 *     Boots the real backend app on an ephemeral loopback port
 *     -- real routes, auth, validation and limiters, fresh
 *     in-memory limiter stores -- and drives the confirmation
 *     endpoints past their limits. Tokens come from the
 *     environment (E2E_RL_TOURIST_TOKEN, E2E_RL_GUIDE_TOKEN, and
 *     E2E_RL_OTHER_TOURIST_TOKEN / E2E_RL_OTHER_GUIDE_TOKEN to prove
 *     other actors never share a bucket).
 *
 *   unassign-guide <bookingId>
 *     Removes the guide from a fixture booking's quotation -- a state
 *     the app cannot reach once a tour is underway -- so the spec can
 *     prove completion cannot be confirmed without a guide.
 *
 *   create-system-admin
 *     Creates a temporary SYSTEM_ADMIN (e2e-sysadmin-*@travora.com)
 *     owning no business data; outputs its credentials. Any leftover
 *     from an earlier, interrupted run is removed first.
 *
 *   remove-system-admins
 *     Deletes every e2e-sysadmin-*@travora.com SYSTEM_ADMIN (and, by
 *     cascade, its sessions). Refuses if one owns business data. No
 *     other admin account can ever match.
 *
 *   logger-redaction
 *     Logs code / pin / hash / secret shaped fields through the real
 *     backend logger in a child process and reports, as booleans
 *     only, whether any of the sentinel values reached the output.
 *
 *   error-handler-probe
 *     Feeds the real error handler, in a child process, Prisma errors
 *     whose message and meta contain a fake code hash, a fake code
 *     and the real secret, plus an ordinary application error, and
 *     reports (booleans and safe fields only) what reached the log and
 *     the responses.
 *
 * A fixture booking is one created by prepare-booking-lifecycle-e2e.js
 * (tour request title "E2E Booking Lifecycle ...") for a throwaway
 * E2E tourist (e2e-*@travora.com), so the helper can never touch
 * a real account's booking.
 *
 * Output: one E2E_FIXTURE_JSON=<json> line.
 */

const crypto = require("crypto");

const {
  loadBackendEnv,
  assertSafeE2EEnvironment,
} = require("./lib/e2e-guards");

loadBackendEnv();

assertSafeE2EEnvironment("Booking lifecycle confirmation E2E helpers");

const prisma = require("../src/config/prisma");

const FIXTURE_REQUEST_TITLE_PREFIX = "E2E Booking Lifecycle ";

class HelperError extends Error {}

function output(result) {
  console.log(`E2E_FIXTURE_JSON=${JSON.stringify(result)}`);
}

async function findFixtureBooking(bookingId) {
  const booking = await prisma.booking.findUnique({
    where: {
      id: bookingId,
    },

    select: {
      id: true,

      status: true,

      startedAt: true,

      completedAt: true,

      cancelledAt: true,

      tourRequest: {
        select: {
          title: true,
        },
      },

      tourist: {
        select: {
          email: true,
        },
      },
    },
  });

  const isFixture =
    booking &&
    booking.tourRequest.title?.startsWith(FIXTURE_REQUEST_TITLE_PREFIX) &&
    booking.tourist.email.startsWith("e2e-") &&
    booking.tourist.email.endsWith("@travora.com");

  if (!isFixture) {
    throw new HelperError(
      "refused: only booking lifecycle fixture bookings of throwaway E2E tourists are allowed.",
    );
  }

  return booking;
}

/**
 * =========================================================
 * Scenarios
 * =========================================================
 */

async function createGuide(label) {
  if (!/^[a-z0-9-]{1,24}$/.test(label ?? "")) {
    throw new HelperError("usage: create-guide <label: a-z, 0-9, ->");
  }

  const tourGuidesService = require("../src/modules/tour-guides/tourGuides.service");

  const token = `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;

  const password = `E2e!${crypto.randomBytes(12).toString("hex")}`;

  const profile = await tourGuidesService.createTourGuide({
    firstName: "Lifecycle",

    lastName: `Guide ${label} ${token.slice(-6)}`,

    email: `e2e-guide-${label}-${token}@travora.com`,

    password,

    bio: "Dedicated guide created by the CR-032 confirmation fixture.",

    experienceYears: 5,

    languages: ["English"],

    specializations: ["Cultural Tours"],

    location: "Kandy",

    dailyRate: 60,

    isAvailable: true,
  });

  return {
    id: profile.id,

    userId: profile.user.id,

    email: profile.user.email,

    firstName: profile.user.firstName,

    lastName: profile.user.lastName,

    password,
  };
}

async function challenges(bookingId) {
  const booking = await findFixtureBooking(bookingId);

  const rows = await prisma.bookingLifecycleChallenge.findMany({
    where: {
      bookingId,
    },

    orderBy: {
      createdAt: "asc",
    },
  });

  return {
    booking: {
      status: booking.status,

      startedAt: booking.startedAt,

      completedAt: booking.completedAt,

      cancelledAt: booking.cancelledAt,
    },

    challenges: rows.map((row) => ({
      id: row.id,

      action: row.action,

      codeHash: row.codeHash,

      expiresAt: row.expiresAt,

      failedAttempts: row.failedAttempts,

      createdByUserId: row.createdByUserId,

      consumedAt: row.consumedAt,

      consumedByUserId: row.consumedByUserId,

      invalidatedAt: row.invalidatedAt,

      invalidationReason: row.invalidationReason,
    })),
  };
}

async function expire(bookingId, action) {
  if (!["START", "COMPLETE"].includes(action)) {
    throw new HelperError("usage: expire <bookingId> <START|COMPLETE>");
  }

  await findFixtureBooking(bookingId);

  const result = await prisma.bookingLifecycleChallenge.updateMany({
    where: {
      bookingId,

      action,

      consumedAt: null,

      invalidatedAt: null,
    },

    data: {
      expiresAt: new Date(Date.now() - 1000),
    },
  });

  return {
    expired: result.count,
  };
}

async function duplicateOpen(bookingId, action) {
  if (!["START", "COMPLETE"].includes(action)) {
    throw new HelperError("usage: duplicate-open <bookingId> <START|COMPLETE>");
  }

  await findFixtureBooking(bookingId);

  const open = await prisma.bookingLifecycleChallenge.findFirst({
    where: {
      bookingId,

      action,

      consumedAt: null,

      invalidatedAt: null,
    },
  });

  if (!open) {
    throw new HelperError("refused: the booking has no open code to duplicate.");
  }

  const duplicate = await prisma.bookingLifecycleChallenge.create({
    data: {
      bookingId,

      action,

      codeHash: crypto.randomBytes(32).toString("hex"),

      expiresAt: open.expiresAt,

      createdByUserId: open.createdByUserId,
    },

    select: {
      id: true,
    },
  });

  return {
    duplicateId: duplicate.id,
  };
}

async function lifecycleRateLimit(bookingA, bookingB) {
  const env = require("../src/config/env");

  if (!env.rateLimit.enabled) {
    throw new HelperError("refused: AUTH_RATE_LIMIT_ENABLED is not true in this process.");
  }

  const touristToken = process.env.E2E_RL_TOURIST_TOKEN;

  const guideToken = process.env.E2E_RL_GUIDE_TOKEN;

  const otherTouristToken = process.env.E2E_RL_OTHER_TOURIST_TOKEN;

  const otherGuideToken = process.env.E2E_RL_OTHER_GUIDE_TOKEN;

  if (!touristToken || !guideToken || !otherTouristToken || !otherGuideToken) {
    throw new HelperError("usage: E2E_RL_TOURIST_TOKEN, E2E_RL_GUIDE_TOKEN, E2E_RL_OTHER_TOURIST_TOKEN and E2E_RL_OTHER_GUIDE_TOKEN are required.");
  }

  await findFixtureBooking(bookingA);

  await findFixtureBooking(bookingB);

  const app = require("../src/app");

  const server = await new Promise((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });

  const base = `http://127.0.0.1:${server.address().port}/api/bookings`;

  // Status plus the error code: a limiter 429 has no code, an
  // exhausted confirmation code answers 429 TOO_MANY_ATTEMPTS.
  const call = async (path, token, body) => {
    const response = await fetch(`${base}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const json = await response.json().catch(() => null);

    const code = json?.errors && !Array.isArray(json.errors) ? json.errors.code : null;

    return code ? `${response.status}:${code}` : String(response.status);
  };

  const repeat = async (times, request) => {
    const results = [];

    for (let index = 0; index < times; index += 1) {
      results.push(await request());
    }

    return results;
  };

  const generate = (bookingId, action, token = touristToken) =>
    call(`/${bookingId}/lifecycle-challenges`, token, { action });

  const verify = (bookingId, endpoint, token = guideToken) =>
    call(`/guide/${bookingId}/${endpoint}`, token, { code: "000000" });

  try {
    return {
      generation: {
        withinLimit: await repeat(10, () => generate(bookingA, "START")),
        overLimit: await generate(bookingA, "START"),
        otherAction: await generate(bookingA, "COMPLETE"),
        otherBooking: await generate(bookingB, "START"),
        // Another traveler reaches the ownership check (403), not a 429.
        otherUser: await generate(bookingA, "START", otherTouristToken),
      },

      verification: {
        withinLimit: await repeat(20, () => verify(bookingA, "start")),
        overLimit: await verify(bookingA, "start"),
        otherAction: await verify(bookingA, "complete"),
        otherBooking: await verify(bookingB, "start"),
        // Another guide reaches the assignment check (403), not a 429.
        otherGuide: await verify(bookingA, "start", otherGuideToken),
      },
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function unassignGuide(bookingId) {
  await findFixtureBooking(bookingId);

  const booking = await prisma.booking.findUnique({
    where: {
      id: bookingId,
    },

    select: {
      quotationId: true,
    },
  });

  await prisma.tourQuotation.update({
    where: {
      id: booking.quotationId,
    },

    data: {
      guideId: null,
    },
  });

  return {
    unassigned: true,
  };
}

const SYSTEM_ADMIN_FIXTURE = {
  role: "SYSTEM_ADMIN",

  email: {
    startsWith: "e2e-sysadmin-",

    endsWith: "@travora.com",
  },
};

async function removeSystemAdmins() {
  const admins = await prisma.user.findMany({
    where: SYSTEM_ADMIN_FIXTURE,

    select: {
      id: true,

      email: true,

      _count: {
        select: {
          tourRequests: true,

          payments: true,

          bookings: true,

          guideReviews: true,
        },
      },

      tourGuideProfile: {
        select: {
          id: true,
        },
      },
    },
  });

  for (const admin of admins) {
    const owned = Object.values(admin._count).reduce((sum, count) => sum + count, 0);

    if (!/^e2e-sysadmin-[0-9a-z-]+@travora\.com$/.test(admin.email) || owned > 0 || admin.tourGuideProfile) {
      throw new HelperError("refused: a fixture SYSTEM_ADMIN owns data or has an unexpected email.");
    }
  }

  const result = await prisma.user.deleteMany({
    where: {
      id: {
        in: admins.map((admin) => admin.id),
      },

      ...SYSTEM_ADMIN_FIXTURE,
    },
  });

  return {
    removed: result.count,
  };
}

async function createSystemAdmin() {
  await removeSystemAdmins();

  const { hashPassword } = require("../src/modules/auth/helpers/auth.password");

  const token = `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;

  const password = `E2eSys${crypto.randomBytes(9).toString("hex")}`;

  const user = await prisma.user.create({
    data: {
      firstName: "E2E",

      lastName: "System Admin",

      email: `e2e-sysadmin-${token}@travora.com`,

      passwordHash: await hashPassword(password),

      role: "SYSTEM_ADMIN",

      status: "ACTIVE",

      isEmailVerified: true,
    },

    select: {
      id: true,

      email: true,
    },
  });

  return {
    id: user.id,

    email: user.email,

    password,
  };
}

function loggerRedaction() {
  const { execFileSync } = require("child_process");

  const path = require("path");

  const env = require("../src/config/env");

  const sentinels = {
    code: "482913",
    pin: "771204",
    codeHash: crypto.randomBytes(32).toString("hex"),
    secret: env.bookingConfirmation.secret,
  };

  const loggerPath = path.resolve(__dirname, "../src/config/logger.js");

  // The real logger (with its transport) in a child process, so its
  // stdout can be captured; it waits for the transport to flush.
  const probe = `
    const logger = require(${JSON.stringify(loggerPath)});
    const v = JSON.parse(process.env.E2E_REDACTION_SENTINELS);
    logger.info({ code: v.code, pin: v.pin, codeHash: v.codeHash, body: { code: v.code, pin: v.pin } }, "probe-top");
    logger.info({ req: { body: { code: v.code, pin: v.pin } } }, "probe-request");
    logger.info({ challenge: { codeHash: v.codeHash }, row: { challenge: { codeHash: v.codeHash } } }, "probe-hash");
    logger.info({ config: { secret: v.secret }, env: { bookingConfirmation: { secret: v.secret } }, process: { BOOKING_CONFIRMATION_SECRET: v.secret }, BOOKING_CONFIRMATION_SECRET: v.secret }, "probe-secret");
    logger.warn({ err: { code: "P2002" } }, "probe-error-code");
    setTimeout(() => process.exit(0), 1500);
  `;

  const output = execFileSync(process.execPath, ["-e", probe], {
    env: {
      ...process.env,
      E2E_REDACTION_SENTINELS: JSON.stringify(sentinels),
    },
    encoding: "utf8",
    timeout: 20_000,
  });

  const plain = output.replace(/\u001b\[[0-9;]*m/g, "");

  return {
    probesLogged: ["probe-top", "probe-request", "probe-hash", "probe-secret"].every((label) =>
      plain.includes(label),
    ),

    leaked: {
      code: plain.includes(sentinels.code),
      pin: plain.includes(sentinels.pin),
      codeHash: plain.includes(sentinels.codeHash),
      secret: plain.includes(sentinels.secret),
    },

    redactions: (plain.match(/\[REDACTED\]/g) ?? []).length,

    errorCodeVisible: plain.includes("P2002"),
  };
}

function errorHandlerProbe() {
  const { execFileSync } = require("child_process");

  const path = require("path");

  const env = require("../src/config/env");

  const sentinels = {
    code: "593017",
    codeHash: crypto.randomBytes(32).toString("hex"),
    secret: env.bookingConfirmation.secret,
  };

  const handlerPath = path.resolve(__dirname, "../src/middlewares/errorHandler.js");

  const appErrorPath = path.resolve(__dirname, "../src/utils/AppError.js");

  const probe = `
    const { Prisma } = require("@prisma/client");
    const errorHandler = require(${JSON.stringify(handlerPath)});
    const { ConflictError } = require(${JSON.stringify(appErrorPath)});
    const v = JSON.parse(process.env.E2E_PROBE_SENTINELS);
    const clientVersion = Prisma.prismaVersion.client;

    // The shape Prisma uses: the failing call, then its arguments.
    const message = [
      "",
      "Invalid \\\`tx.bookingLifecycleChallenge.create()\\\` invocation in",
      "C:/app/src/modules/bookings/bookings.repository.js:372:58",
      "",
      "  data: {",
      "    codeHash: \\"" + v.codeHash + "\\",",
      "    code: \\"" + v.code + "\\",",
      "    secret: \\"" + v.secret + "\\"",
      "  }",
      "Unique constraint failed on the fields: (id)",
    ].join("\\n");

    const errors = [
      new Prisma.PrismaClientKnownRequestError(message, {
        code: "P2002",
        clientVersion,
        meta: { target: ["id"], codeHash: v.codeHash, code: v.code, secret: v.secret },
      }),
      new Prisma.PrismaClientValidationError(message, { clientVersion }),
      new ConflictError("Only a confirmed booking can be started", {
        code: "BOOKING_STATUS_MISMATCH",
        currentStatus: "IN_PROGRESS",
      }),
    ];

    const responses = errors.map((err) => {
      const req = {
        method: "POST",
        baseUrl: "/api/bookings",
        path: "/probe-booking/lifecycle-challenges",
        originalUrl: "/api/bookings/probe-booking/lifecycle-challenges?probeQuery=1",
        correlationId: "probe-correlation-id",
      };
      const res = {
        req,
        statusCode: 0,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
      };
      errorHandler(err, req, res, () => {});
      return { status: res.statusCode, message: res.body.message, errors: res.body.errors };
    });

    console.log("E2E_PROBE_RESPONSES=" + JSON.stringify(responses));
    setTimeout(() => process.exit(0), 1500);
  `;

  const output = execFileSync(process.execPath, ["-e", probe], {
    cwd: path.resolve(__dirname, ".."),
    env: {
      ...process.env,
      E2E_PROBE_SENTINELS: JSON.stringify(sentinels),
    },
    encoding: "utf8",
    timeout: 30_000,
  });

  const plain = output.replace(/\u001b\[[0-9;]*m/g, "");

  const responsesLine = plain.split(/\r?\n/).find((line) => line.startsWith("E2E_PROBE_RESPONSES="));

  const responses = JSON.parse(responsesLine.slice("E2E_PROBE_RESPONSES=".length));

  return {
    leaked: {
      code: plain.includes(sentinels.code),
      codeHash: plain.includes(sentinels.codeHash),
      secret: plain.includes(sentinels.secret),
      queryString: plain.includes("probeQuery"),
    },

    logged: {
      event: plain.includes("REQUEST_FAILED"),
      prismaCode: plain.includes("P2002"),
      knownErrorName: plain.includes("PrismaClientKnownRequestError"),
      validationErrorName: plain.includes("PrismaClientValidationError"),
      prismaOperation: plain.includes("bookingLifecycleChallenge.create"),
      correlationId: plain.includes("probe-correlation-id"),
      route: plain.includes("POST /api/bookings/probe-booking/lifecycle-challenges"),
      stackFrames: /\bat \S/.test(plain),
      applicationMessage: plain.includes("Only a confirmed booking can be started"),
    },

    responses,
  };
}

/**
 * =========================================================
 * Execute
 * =========================================================
 */

const SCENARIOS = {
  "create-guide": createGuide,
  challenges,
  expire,
  "duplicate-open": duplicateOpen,
  "lifecycle-ratelimit": lifecycleRateLimit,
  "unassign-guide": unassignGuide,
  "create-system-admin": createSystemAdmin,
  "remove-system-admins": removeSystemAdmins,
  "logger-redaction": loggerRedaction,
  "error-handler-probe": errorHandlerProbe,
};

async function main() {
  const [scenario, ...args] = process.argv.slice(2);

  const run = SCENARIOS[scenario];

  if (!run) {
    throw new HelperError(`unknown scenario "${scenario}".`);
  }

  output(await run(...args));
}

main()
  .catch((error) => {
    console.error(
      "Booking lifecycle E2E helper failed:",
      error instanceof HelperError ? error.message : error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
