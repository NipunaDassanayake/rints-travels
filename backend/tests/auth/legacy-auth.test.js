const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const errors = require("../../src/utils/AppError");
const constants = require("../../src/core/constants/auth.constants");
const messages = require("../../src/modules/auth/auth.constants");
const f = require("./fixtures");

const source = (relative, dependencies, clock) => {
  const module = { exports: {} };
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [clock.now])); }
    static now() { return clock.now; }
  }
  const filename = path.resolve(__dirname, "../../src", relative);
  const run = vm.runInNewContext(`(function(require,module,exports){${fs.readFileSync(filename, "utf8")}\n})`, { Date: FixedDate }, { filename });
  run((name) => {
    if (!(name in dependencies)) throw new Error("Unexpected auth test dependency");
    return dependencies[name];
  }, module, module.exports);
  return module.exports;
};

const harness = (patch = {}) => {
  const clock = { now: +f.now };
  const token = f.sign({ type: "refresh", gen: undefined, aexp: undefined });
  const state = { id: f.otherId, sessionId: f.sessionId, userId: f.userId, tokenHash: f.hash(token), previousTokenHash: null,
    expiresAt: new Date(+f.now + 3600_000), createdAt: new Date(+f.now - 1000), lastUsedAt: null, revokedAt: null,
    user: { id: f.userId, status: "ACTIVE", role: "TOURIST" }, ...patch };
  const counts = { reads: 0, rotates: 0, revokes: 0 };
  const repo = {
    async findRefreshTokenBySessionId() { counts.reads++; return structuredClone(state); },
    async rotateRefreshToken(id, expected, data) {
      if (id !== state.id || state.revokedAt || state.tokenHash !== expected) return false;
      counts.rotates++;
      Object.assign(state, data, { previousTokenHash: expected, lastUsedAt: new Date(clock.now) });
      return true;
    },
    async revokeRefreshToken() { counts.revokes++; state.revokedAt = new Date(clock.now); },
    async revokeAllUserRefreshTokens() { counts.revokes++; state.revokedAt = new Date(clock.now); },
  };
  const verify = (value) => jwt.verify(value, f.secret, { algorithms: ["HS256"], clockTimestamp: clock.now / 1000 });
  const deps = {
    "../../../config/env": { session: { refreshReuseGraceMs: 10_000, absoluteMaxAgeMs: 30 * 86400_000 }, cookie: { refreshTokenMaxAgeMs: 3600_000 } },
    "../repositories/auth.repository": repo,
    "../helpers/auth.token": { verifyRefreshToken: verify },
    "../helpers/auth.helpers": { issueSessionTokens: () => ({ accessToken: "synthetic-access", refreshToken: f.sign({ type: "refresh", rid: crypto.randomUUID() }) }) },
    "../helpers/auth.tokenHash": { hashToken: f.hash },
    "../../../utils/AppError": errors,
    "../../../core/constants/auth.constants": constants,
    "../auth.constants": messages,
  };
  return { token, state, counts, clock, repo, deps,
    refresh: source("modules/auth/services/refresh.service.js", deps, clock).refresh,
    logout: source("modules/auth/services/logout.service.js", deps, clock).logout,
    logoutAll: source("modules/auth/services/logoutAll.service.js", deps, clock).logoutAll,
  };
};

test("actual legacy service still rotates, returns 409 within grace, and revokes old reuse", async () => {
  const h = harness();
  const result = await h.refresh(h.token);
  assert.ok(result.refreshToken !== h.token);
  assert.equal(h.counts.rotates, 1);
  await assert.rejects(h.refresh(h.token), { statusCode: 409 });
  assert.equal(h.counts.revokes, 0);
  const next = await h.refresh(result.refreshToken);
  assert.ok(next.refreshToken !== result.refreshToken);
  await assert.rejects(h.refresh(h.token), { statusCode: 401 });
  assert.equal(h.counts.revokes, 1);
});

test("actual legacy compare-and-swap losers remain 409; only one winner", async () => {
  const h = harness();
  const results = await Promise.allSettled(Array.from({ length: 5 }, () => h.refresh(h.token)));
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.filter((r) => r.status === "rejected" && r.reason.statusCode === 409).length, 4);
  assert.equal(h.counts.rotates, 1);
  assert.equal(h.counts.revokes, 0);
});

test("actual legacy refresh rejects bound JWT before database access", async () => {
  const h = harness();
  await assert.rejects(h.refresh(f.token), { statusCode: 401 });
  assert.equal(h.counts.reads, 0);
  assert.equal(h.counts.rotates, 0);
  assert.equal(h.counts.revokes, 0);
});

test("legacy credential against bound or inconsistent row fails without revocation", async () => {
  for (const patch of [{ browserBindingHash: "a".repeat(64), refreshGeneration: 0n },
    { browserBindingHash: "a".repeat(64) }, { refreshGeneration: 0n },
    { refreshRecoveryCiphertext: "inconsistent" }, { refreshRecoveryExpiresAt: f.now }]) {
    const h = harness(patch);
    await assert.rejects(h.refresh(h.token), { statusCode: 401 });
    assert.equal(h.counts.rotates, 0);
    assert.equal(h.counts.revokes, 0);
  }
});

test("legacy expiry, status, signature and revocation protections remain intact", async () => {
  for (const patch of [{ revokedAt: f.now }, { expiresAt: f.now }, { createdAt: new Date(+f.now - 31 * 86400_000) }]) {
    const h = harness(patch);
    await assert.rejects(h.refresh(h.token), { statusCode: 401 });
    assert.equal(h.counts.rotates, 0);
  }
  const inactive = harness({ user: { id: f.userId, status: "INACTIVE" } });
  await assert.rejects(inactive.refresh(inactive.token), { statusCode: 403 });
  assert.equal(inactive.counts.revokes, 1);
  const h = harness();
  await assert.rejects(h.refresh("malformed"), { statusCode: 401 });
  await h.refresh(h.token);
  h.clock.now += 10_001;
  await assert.rejects(h.refresh(h.token), { statusCode: 401 });
  assert.equal(h.counts.revokes, 1);
});

test("legacy logout remains idempotent and accepts a valid older session token", async () => {
  const h = harness();
  await h.logout(null);
  await h.logout("malformed");
  assert.equal(h.counts.revokes, 0);
  await h.refresh(h.token);
  await h.logout(h.token);
  assert.equal(h.counts.revokes, 1);
  await h.logout(h.token);
  assert.equal(h.counts.revokes, 1);
  await assert.rejects(h.refresh(h.token), { statusCode: 401 });
  const all = harness();
  await all.logoutAll(f.userId);
  await assert.rejects(all.refresh(all.token), { statusCode: 401 });
});

test("actual authentication middleware continues enforcing live session/user state", async () => {
  const clock = { now: +f.now };
  const access = f.sign({ type: "access", sid: f.sessionId });
  const session = { userId: f.userId, expiresAt: new Date(+f.now + 1000), revokedAt: null,
    user: { id: f.userId, role: "TOURIST", status: "ACTIVE" } };
  const authenticate = source("middlewares/authenticate.js", {
    "../modules/auth/repositories/auth.repository": { findRefreshTokenBySessionId: async () => session },
    "../modules/auth/helpers/auth.token": { verifyAccessToken: (token) => jwt.verify(token, f.secret, { algorithms: ["HS256"], clockTimestamp: +f.now / 1000 }) },
    "../core/constants/auth.constants": constants, "../utils/AppError": errors, "../modules/auth/auth.constants": messages,
  }, clock);
  const request = () => ({ get: () => `Bearer ${access}` });
  let outcome;
  const req = request();
  await authenticate(req, {}, (error) => { outcome = error; });
  assert.equal(outcome, undefined);
  assert.equal(req.user.id, f.userId);
  session.revokedAt = f.now;
  await authenticate(request(), {}, (error) => { outcome = error; });
  assert.equal(outcome.statusCode, 401);
  session.revokedAt = null;
  session.user.status = "SUSPENDED";
  await authenticate(request(), {}, (error) => { outcome = error; });
  assert.equal(outcome.statusCode, 403);
});
