const { test } = require("node:test");
const assert = require("node:assert/strict");
const { parseGeneration, nextGeneration, verifyBoundRefreshToken } = require("../../src/modules/auth/helpers/auth.boundProtocol");
const { classifySession, recoveryDeadline, isRecoveryActive, decideBoundRefresh } = require("../../src/modules/auth/helpers/auth.boundSession");
const f = require("./fixtures");

test("bound claim types reject signed arrays, objects and numbers without coercion", () => {
  const crypto = require("node:crypto");
  const jwt = require("jsonwebtoken");
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const valid = jwt.decode(f.token);
  for (const claim of ["sub", "jti", "rid", "gen", "type"]) {
    for (const value of [[valid[claim]], { value: valid[claim] }, 1, null]) {
      // Sign raw claims so jsonwebtoken.sign's own registered-claim validation
      // cannot make this a false-positive test of our verifier.
      const payload = Buffer.from(JSON.stringify({ ...valid, [claim]: value })).toString("base64url");
      const input = `${header}.${payload}`;
      const signature = crypto.createHmac("sha256", f.secret).update(input).digest("base64url");
      const token = `${input}.${signature}`;
      assert.doesNotThrow(() => jwt.verify(token, f.secret, { algorithms: ["HS256"], clockTimestamp: +f.now / 1000 }));
      assert.throws(() => verifyBoundRefreshToken(token, { secret: f.secret, now: f.now }), { code: "AUTH_SESSION_INVALID" });
    }
  }
});

test("protocol validates all bound claims and rejects legacy/wrong identity/signature", () => {
  assert.equal(verifyBoundRefreshToken(f.token, { secret: f.secret, now: f.now }).gen, "1");
  for (const overrides of [{ type: "refresh" }, { gen: "01" }, { gen: 1 }, { sub: "bad" }, { rid: "bad" },
    { sub: f.userId + "\n" }, { aexp: 1 }, { exp: 1 }, { iat: 9999999999 }, { exp: 9999999999 }]) {
    assert.throws(() => verifyBoundRefreshToken(f.sign(overrides), { secret: f.secret, now: f.now }), { code: "AUTH_SESSION_INVALID" });
  }
  for (const options of [{ secret: "wrong" }, { sessionId: f.otherId }, { userId: f.otherId }, { generation: "2" }, { absoluteExpiresAt: 3 }]) {
    assert.throws(() => verifyBoundRefreshToken(f.token, { secret: f.secret, now: f.now, ...options }));
  }
});

test("generations are canonical decimal BIGINTs with checked increment", () => {
  assert.equal(parseGeneration("0"), 0n);
  assert.equal(nextGeneration("0"), "1");
  assert.equal(parseGeneration("9223372036854775807"), 9223372036854775807n);
  for (const bad of [0, 0n, "00", "01", "+1", "-1", "1.0", "1e2", " 1", "1 ", "1\n", "9223372036854775808", "9".repeat(200)]) assert.throws(() => parseGeneration(bad));
  assert.throws(() => nextGeneration("9223372036854775807"));
});

test("session mode rejects inconsistent and unsafe recovery states", () => {
  const legacy = { ...f.row(), browserBindingHash: null, refreshGeneration: null, refreshRecoveryCiphertext: null, refreshRecoveryExpiresAt: null };
  assert.equal(classifySession(legacy), "LEGACY");
  assert.equal(classifySession(f.row()), "BOUND");
  for (const patch of [{ browserBindingHash: null }, { refreshGeneration: null }, { refreshGeneration: -1n },
    { refreshRecoveryCiphertext: null }, { refreshRecoveryExpiresAt: null }, { previousTokenHash: null },
    { refreshGeneration: 0n }, { revokedAt: f.now }, { browserBindingHash: "bad" }]) {
    assert.throws(() => classifySession({ ...f.row(), ...patch }), { code: "AUTH_SESSION_STATE_INVALID" });
  }
  assert.throws(() => classifySession({ ...legacy, refreshRecoveryExpiresAt: f.now }));
});

test("new bound generation zero without a predecessor or recovery is valid", () => {
  assert.equal(classifySession({ ...f.row(), refreshGeneration: 0n, previousTokenHash: null,
    refreshRecoveryCiphertext: null, refreshRecoveryExpiresAt: null }), "BOUND");
});

test("deadline uses the strict boundary and caps window at both expiries", () => {
  const deadline = new Date(f.now.getTime() + 30_000);
  assert.equal(isRecoveryActive(new Date(deadline - 1), deadline), true);
  assert.equal(isRecoveryActive(deadline, deadline), false);
  assert.equal(isRecoveryActive(new Date(+deadline + 1), deadline), false);
  assert.equal(isRecoveryActive(f.now, null), false);
  assert.equal(+recoveryDeadline({ now: f.now, effectiveExpiresAt: new Date(+f.now + 100_000), predecessorExpiresAt: new Date(+f.now + 90_000) }), +deadline);
  assert.equal(+recoveryDeadline({ now: f.now, effectiveExpiresAt: new Date(+f.now + 2000), predecessorExpiresAt: deadline }), +f.now + 2000);
  assert.throws(() => recoveryDeadline({ now: deadline, effectiveExpiresAt: f.now, predecessorExpiresAt: deadline }));
});

test("pure state decisions recover same successor and never slide deadline/increment on recovery", () => {
  const session = f.row();
  const presented = { ...require("jsonwebtoken").decode(f.token), hash: f.hash(f.token) };
  const call = (patch = {}) => decideBoundRefresh({ session, presented, now: f.now, bindingVerified: true, accountActive: true, ...patch });
  const before = structuredClone(session);
  for (const ms of [0, 1000, 29_999]) {
    assert.deepEqual(call({ now: new Date(+f.now + ms) }), { action: "RECOVER", generation: "1", deadline: session.refreshRecoveryExpiresAt });
    assert.equal(call({ now: new Date(+f.now + ms), presented: { ...presented, gen: "0", hash: session.previousTokenHash } }).action, "RECOVER");
  }
  assert.deepEqual(session, before);
  assert.deepEqual(call({ now: session.refreshRecoveryExpiresAt }), { action: "ROTATE", generation: "2" });
  assert.equal(call({ now: session.refreshRecoveryExpiresAt, presented: { ...presented, gen: "0", hash: session.previousTokenHash } }).reason, "REUSE");
  const next = { ...session, refreshGeneration: 2n, previousTokenHash: session.tokenHash, tokenHash: "c".repeat(64) };
  assert.equal(call({ session: next, presented: { ...presented, gen: "0", hash: "d".repeat(64) } }).reason, "REUSE");
  assert.equal(call({ bindingVerified: false }).action, "REJECT");
  assert.equal(call({ accountActive: false }).reason, "ACCOUNT_INACTIVE");
  assert.equal(call({ session: { ...session, expiresAt: f.now } }).reason, "EXPIRED");
  assert.equal(call({ presented: { ...presented, exp: 1 } }).action, "REJECT");
  assert.equal(call({ presented: { ...presented, type: "refresh" } }).reason, "PROTOCOL");
  assert.equal(call({ session: { ...session, revokedAt: f.now, refreshRecoveryCiphertext: null, refreshRecoveryExpiresAt: null } }).reason, "REVOKED");
});
