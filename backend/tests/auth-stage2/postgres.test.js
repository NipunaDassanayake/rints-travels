const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const http = require("node:http");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { createSessionRepository } = require("../../src/modules/auth/repositories/session.repository");
const { createBoundSessionService } = require("../../src/modules/auth/services/boundSession.service");
const { classifySession } = require("../../src/modules/auth/helpers/auth.boundSession");
const { generateBinding } = require("../../src/modules/auth/helpers/auth.browserBinding");
const { config, observed } = require("./fixtures");

// Deliberately fail rather than silently skip a database-validation command.
// No dotenv URL is accepted; the caller must explicitly select the disposable DB.
const target = "rints_travels_cr033_stage2_tmp";
const url = new URL(process.env.CR033_DISPOSABLE_DATABASE_URL);
assert.equal(url.hostname, "localhost"); assert.equal(url.port, "5433");
assert.equal(url.pathname, `/${target}`);
const { PrismaClient } = require(process.env.CR033_TEST_CLIENT_DIR);
const db = new PrismaClient({ datasources: { db: { url: url.href } } });
const repo = createSessionRepository(db);
const cfg = config();
const service = createBoundSessionService({ repository: repo, config: cfg });
let server, root, runtime, env, user;
const sensitive = new Set();
const logs = [];
const originalWrite = process.stdout.write;
const remember = (result) => {
  for (const field of ["refreshToken", "accessToken", "binding"]) if (result[field]) sensitive.add(result[field]);
  return result;
};
const createUser = (role = "TOURIST") => db.user.create({ data: { firstName: "Synthetic", lastName: "CR033",
  email: `e2e-cr033-${crypto.randomUUID()}@travora.com`, role, passwordHash: bcrypt.hashSync("Synthetic-only-123", 4) } });
const fresh = async () => {
  const account = await createUser();
  return { user: account, login: remember(await service.create(account)) };
};
const read = (login) => db.refreshToken.findUnique({ where: { sessionId: login.sessionId } });
const request = async (route, options = {}) => {
  const response = await globalThis.fetch(root + route, { method: "POST", ...options,
    headers: { Origin: "https://travora.example", ...options.headers } });
  return { status: response.status, cookies: response.headers.getSetCookie(), headers: response.headers,
    body: await response.json() };
};
const credentialCookies = (lines) => lines.filter((c) => !/Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(c))
  .map((c) => c.split(";")[0]).join("; ");
const loginHttp = async (enabled) => {
  env.refreshRecovery.issuanceEnabled = enabled;
  return request("/api/auth/login", { headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, password: "Synthetic-only-123" }) });
};

before(async () => {
  const [identity] = await db.$queryRaw`SELECT current_database() AS name`;
  assert.equal(identity.name, target); // MUST precede every test's synthetic writes.
  const migrations = await db.$queryRaw`SELECT count(*)::int AS n FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
  assert.equal(migrations[0].n, 18);
  Object.assign(process.env, { DATABASE_URL: url.href, NODE_ENV: "production", COOKIE_SECURE: "true",
    COOKIE_SAME_SITE: "lax", FRONTEND_URL: "https://travora.example", DOTENV_CONFIG_QUIET: "true",
    JWT_ACCESS_SECRET: cfg.jwt.accessSecret, JWT_REFRESH_SECRET: cfg.jwt.refreshSecret,
    JWT_ACCESS_EXPIRES_IN: "15m", JWT_REFRESH_EXPIRES_IN: "1h", AUTH_RATE_LIMIT_ENABLED: "false",
    AUTH_BOUND_SESSIONS_ENABLED: "true", STRIPE_SECRET_KEY: "sk_test_synthetic",
    BOOKING_CONFIRMATION_SECRET: "synthetic-booking-only-00000000000000000",
    AUTH_REFRESH_RECOVERY_KEYS: JSON.stringify({ test: cfg.refreshRecovery.keys.get("test").toString("base64") }),
    AUTH_REFRESH_RECOVERY_ACTIVE_KEY_ID: "test" });
  for (const name of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "BOOKING_CONFIRMATION_SECRET", "AUTH_REFRESH_RECOVERY_KEYS"])
    sensitive.add(process.env[name]);
  // Inject only the client into the real app; routes/services are not replaced.
  const prismaPath = require.resolve("../../src/config/prisma");
  require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: db };
  process.stdout.write = function (chunk, ...args) {
    if (String(chunk).startsWith('{"level":')) { logs.push(String(chunk)); return true; }
    return originalWrite.call(this, chunk, ...args);
  };
  const app = require("../../src/app");
  env = require("../../src/config/env");
  runtime = require("../../src/modules/auth/services/session.runtime");
  server = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
  root = `http://127.0.0.1:${server.address().port}`;
  user = await createUser();
});
after(async () => {
  if (server) { await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }); }
  await db.$disconnect();
  process.stdout.write = originalWrite;
});

test("real login flag=false creates unchanged legacy cookie/session; true creates bound generation zero", async () => {
  const legacy = await loginHttp(false); assert.equal(legacy.status, 200);
  const legacyCookie = credentialCookies(legacy.cookies);
  assert.ok(legacyCookie.startsWith(env.cookie.refreshTokenName + "="));
  const legacyPayload = jwt.decode(legacyCookie.split("=")[1]);
  assert.equal(legacyPayload.type, "refresh");
  const legacyRow = await db.refreshToken.findUnique({ where: { sessionId: legacyPayload.jti } });
  assert.equal(classifySession(legacyRow), "LEGACY");
  const rotated = await request("/api/auth/refresh", { headers: { Cookie: legacyCookie } });
  assert.equal(rotated.status, 200);
  assert.equal((await request("/api/auth/refresh", { headers: { Cookie: legacyCookie } })).status, 409);
  const bound = await loginHttp(true); assert.equal(bound.status, 200);
  const parsed = runtime.cookies.parse(credentialCookies(bound.cookies));
  assert.equal(parsed.candidates.length, 1); assert.ok(parsed.binding);
  const candidate = parsed.candidates[0];
  const row = await read(candidate);
  assert.equal(classifySession(row), "BOUND"); assert.equal(row.refreshGeneration, 0n);
  assert.equal(row.refreshRecoveryCiphertext, null); assert.equal(row.refreshRecoveryExpiresAt, null);
  for (const line of bound.cookies.filter((c) => c.startsWith("__Host-"))) {
    assert.match(line, /HttpOnly/); assert.match(line, /Secure/); assert.match(line, /Path=\//);
    assert.match(line, /Expires=/); assert.doesNotMatch(line, /Max-Age|Domain=/);
  }
  assert.equal(bound.headers.get("cache-control"), "no-store");
});
test("HTTP lost-response recovery returns the exact stored successor, even with issuance disabled", async () => {
  const login = await loginHttp(true); const old = credentialCookies(login.cookies);
  const first = await request("/api/auth/refresh", { headers: { Cookie: old } }); assert.equal(first.status, 200);
  env.refreshRecovery.issuanceEnabled = false;
  const again = await request("/api/auth/refresh", { headers: { Cookie: old } }); assert.equal(again.status, 200);
  const firstCurrent = runtime.cookies.parse(credentialCookies(first.cookies)).candidates[0];
  const againCurrent = runtime.cookies.parse(credentialCookies(again.cookies)).candidates[0];
  assert.ok(firstCurrent.token === againCurrent.token);
  assert.equal(firstCurrent.generation, "1");
  assert.ok(first.cookies.some((c) => /_0=;/.test(c) && /Max-Age=0/.test(c)));
  assert.ok(!first.cookies.some((c) => c.startsWith(runtime.cookies.bindingName + "=")));
  const binding = runtime.cookies.parse(old).binding;
  remember({ refreshToken: firstCurrent.token, accessToken: first.body.data.accessToken, binding });
  const currentOnly = `${runtime.cookies.bindingName}=${binding}; ${firstCurrent.name}=${firstCurrent.token}`;
  const row = await read(firstCurrent);
  const current = await request("/api/auth/refresh", { headers: { Cookie: currentOnly } });
  assert.equal(current.status, 200); assert.deepEqual(await read(firstCurrent), row);
  const logout = await request("/api/auth/logout", { headers: { Cookie: currentOnly } });
  assert.equal(logout.status, 200);
  assert.ok(logout.cookies.every((c) => /Max-Age=0/.test(c)));
  const late = await request("/api/auth/refresh", { headers: { Cookie: currentOnly } });
  assert.equal(late.status, 401); assert.equal(late.cookies.length, 0);
  const access = await globalThis.fetch(root + "/api/auth/me", { headers: { Authorization: `Bearer ${first.body.data.accessToken}` } });
  assert.equal(access.status, 401);
});
test("HTTP binding rejection has no cookie or revocation side effect", async () => {
  const login = await loginHttp(true), old = runtime.cookies.parse(credentialCookies(login.cookies));
  const row = await read(old.candidates[0]);
  for (const binding of [null, generateBinding(row.sessionId).value, generateBinding(crypto.randomUUID()).value]) {
    const input = [binding && `${runtime.cookies.bindingName}=${binding}`,
      `${old.candidates[0].name}=${old.candidates[0].token}`].filter(Boolean).join("; ");
    for (const route of ["refresh", "logout"]) {
      const response = await request(`/api/auth/${route}`, { headers: { Cookie: input } });
      assert.equal(response.status, 401); assert.equal(response.cookies.length, 0);
      assert.deepEqual(await read(old.candidates[0]), row);
    }
  }
});
test("legacy credentials cannot refresh or revoke a bound row through either cookie protocol", async () => {
  const login = await loginHttp(true), old = runtime.cookies.parse(credentialCookies(login.cookies));
  const candidate = old.candidates[0], row = await read(candidate);
  const token = jwt.sign({ sub: row.userId, jti: row.sessionId, rid: crypto.randomUUID(), type: "refresh" },
    cfg.jwt.refreshSecret, { algorithm: "HS256", expiresIn: "1h" });
  const legacyCookie = `${env.cookie.refreshTokenName}=${token}`;
  assert.equal((await request("/api/auth/refresh", { headers: { Cookie: legacyCookie } })).status, 401);
  assert.equal((await request("/api/auth/logout", { headers: { Cookie: legacyCookie } })).status, 200);
  const boundCookie = `${runtime.cookies.bindingName}=${old.binding}; ${candidate.name}=${token}`;
  const rejected = await request("/api/auth/refresh", { headers: { Cookie: boundCookie } });
  assert.equal(rejected.status, 401); assert.equal(rejected.cookies.length, 0);
  assert.deepEqual(await read(candidate), row);
});
test("Origin enforcement rejects missing/null/malformed/duplicate/untrusted before all affected auth routes", async () => {
  const count = await db.refreshToken.count();
  for (const route of ["/api/auth/login", "/api/auth/refresh", "/api/auth/logout", "/api/auth/logout-all", "/api/tour-guides/11111111-1111-4111-8111-111111111111"]) {
    for (const origins of [[], ["null"], ["https://travora.example/path"], ["https://evil.example"], ["https://travora.example", "https://travora.example"]]) {
      const result = await new Promise((resolve, reject) => {
        const req = http.request(root + route, { method: route.includes("tour-guides") ? "DELETE" : "POST",
          headers: ["Host", new URL(root).host, ...origins.flatMap((origin) => ["Origin", origin])] }, (res) => {
          let body = ""; res.on("data", (chunk) => { body += chunk; });
          res.on("end", () => resolve({ status: res.statusCode, cookies: res.headers["set-cookie"], body: JSON.parse(body) }));
        }); req.on("error", reject); req.end();
      });
      assert.equal(result.status, 403); assert.equal(result.cookies, undefined);
      assert.equal(result.body.message, "AUTH_ORIGIN_REJECTED");
    }
  }
  assert.equal(await db.refreshToken.count(), count);
});

const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };
// Hold the first transaction's REAL account lock. Do not release it until
// PostgreSQL reports the second operation waiting for that lock (no sleeps).
const overlap = async (account, firstOperation, secondOperation) => {
  const entered = deferred(), release = deferred();
  const heldRepo = { ...repo, withUser: (id, work) => repo.withUser(id, async (tx, lockedUser) => {
    entered.resolve(); await release.promise; return work(tx, lockedUser);
  }) };
  const held = createBoundSessionService({ repository: heldRepo, config: cfg });
  const outcome = (promise) => promise.then((value) => ({ value }), (error) => ({ error }));
  const first = outcome(firstOperation(held, heldRepo)); await entered.promise;
  const second = outcome(secondOperation());
  let blocked = false;
  try {
    const end = Date.now() + 2000;
    while (Date.now() < end) {
      const [row] = await db.$queryRaw`SELECT count(*)::int AS n FROM pg_stat_activity
        WHERE datname = ${target} AND wait_event_type = 'Lock' AND query LIKE '%SELECT id FROM users%'`;
      if (row.n > 0) { blocked = true; break; }
    }
    assert.ok(blocked, "second operation must wait on the user lock");
  } finally { release.resolve(); }
  const results = await Promise.all([first, second]);
  assert.ok(account.id);
  return results;
};
test("PostgreSQL refresh + refresh serializes to one generation and one successor", async () => {
  const { user: account, login } = await fresh(); const input = observed(login, login);
  const [one, two] = await overlap(account, (held) => held.refresh(input), () => service.refresh(input));
  assert.equal(one.error, undefined); assert.equal(two.error, undefined);
  assert.ok(one.value.refreshToken === two.value.refreshToken);
  assert.equal((await read(login)).refreshGeneration, 1n);
});
test("PostgreSQL current + predecessor concurrently recover the same successor with no writes", async () => {
  const { user: account, login } = await fresh(); const current = remember(await service.refresh(observed(login, login)));
  const before = await read(login);
  const [one, two] = await overlap(account, (held) => held.refresh(observed(login, current)), () => service.refresh(observed(login, login)));
  assert.equal(one.error, undefined); assert.equal(two.error, undefined);
  assert.ok(one.value.refreshToken === current.refreshToken && two.value.refreshToken === current.refreshToken);
  assert.deepEqual(await read(login), before);
});
for (const all of [false, true]) for (const logoutFirst of [false, true]) {
  test(`PostgreSQL refresh + logout${all ? "-all" : ""}, ${logoutFirst ? "logout" : "refresh"} acquires first: no revival`, async () => {
    const { user: account, login } = await fresh(), input = observed(login, login);
    const logout = (api, repository) => all ? repository.withUser(account.id, (tx) => repository.revokeAll(tx, account.id)) : api.logout(input);
    const results = await overlap(account,
      (held, heldRepo) => logoutFirst ? logout(held, heldRepo) : held.refresh(input),
      () => logoutFirst ? service.refresh(input) : logout(service, repo));
    if (logoutFirst) assert.equal(results[1].error?.statusCode, 401);
    else assert.equal(results[0].error, undefined);
    const row = await read(login); assert.ok(row.revokedAt);
    assert.equal(row.refreshRecoveryCiphertext, null); assert.equal(row.previousTokenHash, null);
    await assert.rejects(service.refresh(input), { statusCode: 401 });
  });
}
test("PostgreSQL predecessor reuse revocation persists after service returns 401", async () => {
  const { login } = await fresh(); await service.refresh(observed(login, login));
  await db.refreshToken.update({ where: { sessionId: login.sessionId }, data: { refreshRecoveryExpiresAt: new Date(0) } });
  await assert.rejects(service.refresh(observed(login, login)), { statusCode: 401 });
  const row = await read(login); assert.ok(row.revokedAt); assert.equal(row.refreshRecoveryCiphertext, null);
});
test("HTTP corrupted recovery is sanitized 503, with no Set-Cookie or database mutation", async () => {
  const login = await loginHttp(true), old = credentialCookies(login.cookies);
  await request("/api/auth/refresh", { headers: { Cookie: old } });
  const candidate = runtime.cookies.parse(old).candidates[0];
  await db.refreshToken.update({ where: { sessionId: candidate.sessionId }, data: { refreshRecoveryCiphertext: "synthetic-corrupt-envelope" } });
  const before = await read(candidate);
  const response = await request("/api/auth/refresh", { headers: { Cookie: old } });
  assert.equal(response.status, 503); assert.equal(response.body.message, "AUTH_RECOVERY_UNAVAILABLE");
  assert.equal(response.cookies.length, 0); assert.deepEqual(await read(candidate), before);
});
test("real PostgreSQL lock timeout returns sanitized 503 without cookies or mutation", async () => {
  const login = await loginHttp(true), old = credentialCookies(login.cookies);
  const candidate = runtime.cookies.parse(old).candidates[0], row = await read(candidate);
  const entered = deferred(), release = deferred();
  const blocker = repo.withUser(row.userId, async () => { entered.resolve(); await release.promise; });
  await entered.promise;
  try {
    const response = await request("/api/auth/refresh", { headers: { Cookie: old } });
    assert.equal(response.status, 503); assert.equal(response.cookies.length, 0);
    assert.equal(response.body.message, "AUTH_SESSION_UNAVAILABLE");
  } finally { release.resolve(); await blocker; }
  assert.deepEqual(await read(candidate), row);
});
test("actual logout-all revokes mixed legacy/bound sessions and clears recovery", async () => {
  await loginHttp(false); const login = await loginHttp(true), old = credentialCookies(login.cookies);
  const refreshed = await request("/api/auth/refresh", { headers: { Cookie: old } });
  const result = await request("/api/auth/logout-all", { headers: { Cookie: old, Authorization: `Bearer ${refreshed.body.data.accessToken}` } });
  assert.equal(result.status, 200);
  const rows = await db.refreshToken.findMany({ where: { userId: user.id } });
  assert.ok(rows.every((row) => row.revokedAt && row.refreshRecoveryCiphertext === null && row.refreshRecoveryExpiresAt === null));
});
test("guide deactivation locks account before sessions and leaves no usable recovery", async () => {
  const guide = await createUser("TOUR_GUIDE");
  const profile = await db.tourGuideProfile.create({ data: { userId: guide.id, languages: [], specializations: [] } });
  const login = await service.create(guide);
  const repository = require("../../src/modules/tour-guides/tourGuides.repository");
  const [refreshed, deactivated] = await overlap(guide, (held) => held.refresh(observed(login, login)), () => repository.deactivateTourGuide(profile.id));
  assert.equal(refreshed.error, undefined); assert.equal(deactivated.error, undefined);
  assert.equal((await db.user.findUnique({ where: { id: guide.id } })).status, "INACTIVE");
  assert.ok((await read(login)).revokedAt); assert.equal((await read(login)).refreshRecoveryCiphertext, null);
  await assert.rejects(service.refresh(observed(login, refreshed.value)), { statusCode: 401 });
});
test("fresh server logs omit credentials, keys, recovery payloads and raw database errors", async () => {
  const rows = await db.refreshToken.findMany();
  for (const row of rows) for (const key of ["tokenHash", "previousTokenHash", "browserBindingHash", "refreshRecoveryCiphertext"])
    if (row[key]) sensitive.add(row[key]);
  const text = logs.join(""); assert.ok(logs.length > 0);
  for (const value of sensitive) assert.ok(!text.includes(value), "sensitive material must not appear in server logs");
  assert.doesNotMatch(text, /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  assert.doesNotMatch(text, /PrismaClient|Invalid .*invocation|SELECT .*refresh_tokens|postgresql:\/\//);
});
