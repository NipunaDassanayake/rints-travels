const { test } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { createBoundSessionService } = require("../../src/modules/auth/services/boundSession.service");
const { createSessionRepository } = require("../../src/modules/auth/repositories/session.repository");
const { generateBinding, parseBinding } = require("../../src/modules/auth/helpers/auth.browserBinding");
const { classifySession } = require("../../src/modules/auth/helpers/auth.boundSession");
const { createRefreshRecovery } = require("../../src/modules/auth/helpers/auth.refreshRecovery");
const { cookies, observed, harness } = require("./fixtures");
const f = require("../auth/fixtures");

const rotated = async () => {
  const h = harness();
  h.login = await h.service.create(h.user);
  h.first = await h.service.refresh(observed(h.login, h.login));
  return h;
};
const rejected = (status, code = "AUTH_SESSION_INVALID") => (error) => {
  assert.equal(error.statusCode, status);
  assert.equal(error.message, code);
  assert.equal(error.cause, undefined);
  return true;
};

test("bound issuance stores only a binding hash, generation zero and no recovery", async () => {
  const h = harness(); const login = await h.service.create(h.user);
  assert.equal(classifySession(h.state.row), "BOUND");
  assert.equal(h.state.row.refreshGeneration, 0n);
  assert.equal(h.state.row.browserBindingHash, parseBinding(login.binding).hash);
  assert.equal(h.state.row.refreshRecoveryCiphertext, null);
  assert.equal(h.state.row.refreshRecoveryExpiresAt, null);
  assert.ok(!Object.values(h.state.row).includes(login.binding));
  assert.ok(!Object.values(h.state.row).includes(login.refreshToken));
  const claims = jwt.decode(login.refreshToken);
  assert.equal(claims.gen, "0"); assert.equal(claims.type, "refresh_bound_v2");
  assert.equal(claims.aexp * 1000, +login.bindingExpiresAt);
});
test("normal rotation produces one encrypted successor and fixed recovery deadline", async () => {
  const h = await rotated(); const row = h.state.row;
  assert.equal(row.refreshGeneration, 1n); assert.equal(row.previousTokenHash, f.hash(h.login.refreshToken));
  assert.equal(row.tokenHash, f.hash(h.first.refreshToken));
  assert.equal(+row.refreshRecoveryExpiresAt, +h.state.now + 30_000);
  assert.equal(+row.lastUsedAt, +h.state.now);
  assert.ok(!row.refreshRecoveryCiphertext.includes(h.first.refreshToken));
  assert.equal(jwt.decode(h.first.refreshToken).aexp, jwt.decode(h.login.refreshToken).aexp);
});
for (const token of ["first", "login"]) test(`active recovery with ${token === "first" ? "current" : "predecessor"} returns exact successor without writes`, async () => {
  const h = await rotated(); h.state.now = new Date(+h.state.now + 29_999);
  const row = structuredClone(h.state.row), writes = h.state.writes;
  const result = await h.service.refresh(observed(h.login, h[token]));
  assert.equal(result.refreshToken, h.first.refreshToken);
  assert.deepEqual(h.state.row, row); assert.equal(h.state.writes, writes);
});
for (const offset of [30_000, 30_001]) test(`predecessor at recovery offset ${offset} commits revocation before 401`, async () => {
  const h = await rotated(); h.state.now = new Date(+h.state.now + offset);
  const commits = h.state.commits;
  await assert.rejects(h.service.refresh(observed(h.login, h.login)), rejected(401));
  assert.equal(h.state.commits, commits + 1); assert.ok(h.state.row.revokedAt);
  assert.equal(h.state.row.refreshRecoveryCiphertext, null); assert.equal(h.state.row.previousTokenHash, null);
});
test("current at exact deadline rotates once and immutable absolute expiry survives", async () => {
  const h = await rotated(); h.state.now = new Date(+h.state.row.refreshRecoveryExpiresAt);
  const second = await h.service.refresh(observed(h.login, h.first));
  assert.equal(second.generation, "2"); assert.equal(h.state.row.refreshGeneration, 2n);
  assert.equal(jwt.decode(second.refreshToken).aexp, jwt.decode(h.login.refreshToken).aexp);
  assert.equal(h.state.row.previousTokenHash, f.hash(h.first.refreshToken));
});
test("grandparent revokes, but stale siblings do not override a usable current or predecessor", async () => {
  const h = await rotated(); h.state.now = new Date(+h.state.row.refreshRecoveryExpiresAt);
  const second = await h.service.refresh(observed(h.login, h.first));
  for (const preferred of [second, h.first]) {
    const result = await h.service.refresh(observed(h.login, h.login, preferred));
    assert.equal(result.refreshToken, second.refreshToken); assert.equal(h.state.row.revokedAt, null);
  }
  await assert.rejects(h.service.refresh(observed(h.login, h.login)), rejected(401));
  assert.ok(h.state.row.revokedAt);
});
for (const kind of ["missing", "wrong", "cross-session"]) test(`${kind} binding rejects refresh AND logout without any mutation`, async () => {
  const h = await rotated(), row = structuredClone(h.state.row), writes = h.state.writes;
  const input = observed(h.login, h.login);
  input.binding = kind === "missing" ? null : generateBinding(kind === "wrong" ? h.login.sessionId : f.otherId).value;
  for (const operation of [h.service.refresh, h.service.logout]) await assert.rejects(operation(input), rejected(401));
  assert.deepEqual(h.state.row, row); assert.equal(h.state.writes, writes);
});
for (const kind of ["corrupted", "unknown-key", "payload-mismatch"]) test(`${kind} recovery fails sanitized 503 without mutation`, async () => {
  const h = await rotated();
  if (kind === "corrupted") h.state.row.refreshRecoveryCiphertext += "broken";
  if (kind === "unknown-key") h.state.row.refreshRecoveryCiphertext = h.state.row.refreshRecoveryCiphertext.replace(".test.", ".retired.");
  if (kind === "payload-mismatch") {
    const row = h.state.row;
    // Authenticated payload with a different effective expiry than the locked row.
    row.refreshRecoveryCiphertext = createRefreshRecovery({ ...h.config.refreshRecovery, jwtSecret: f.secret }).encrypt(h.first.refreshToken, {
      sessionId: row.sessionId, userId: row.userId, generation: "1", tokenHash: row.tokenHash,
      browserBindingHash: row.browserBindingHash, effectiveExpiresAt: new Date(+row.expiresAt - 1000),
      recoveryExpiresAt: row.refreshRecoveryExpiresAt, absoluteExpiresAt: jwt.decode(h.first.refreshToken).aexp,
    }, h.state.now);
  }
  const row = structuredClone(h.state.row), writes = h.state.writes;
  await assert.rejects(h.service.refresh(observed(h.login, h.login)), rejected(503, "AUTH_RECOVERY_UNAVAILABLE"));
  assert.deepEqual(h.state.row, row); assert.equal(h.state.writes, writes);
});
test("issuance disabled still permits recovery for an already bound session", async () => {
  const h = await rotated(); h.config.refreshRecovery.issuanceEnabled = false;
  const service = createBoundSessionService({ repository: h.repo, config: h.config });
  assert.equal((await service.refresh(observed(h.login, h.login))).refreshToken, h.first.refreshToken);
});
test("revoked, expired and inactive sessions never receive credentials", async () => {
  for (const kind of ["revoked", "expired", "inactive"]) {
    const h = await rotated();
    if (kind === "revoked") await h.service.logout(observed(h.login, h.first));
    if (kind === "expired") h.state.row.expiresAt = new Date(+h.state.now - 1);
    if (kind === "inactive") h.user.status = "SUSPENDED";
    await assert.rejects(h.service.refresh(observed(h.login, h.first)), rejected(401));
    assert.ok(h.state.row.revokedAt);
  }
});
test("logout clears recovery and delayed returned credentials cannot revive a session", async () => {
  const h = await rotated(); await h.service.logout(observed(h.login, h.login));
  assert.equal(h.state.row.refreshRecoveryCiphertext, null);
  assert.equal(h.state.row.refreshRecoveryExpiresAt, null);
  await assert.rejects(h.service.refresh(observed(h.login, h.first)), rejected(401));
});
test("cookie logout clearing is exact; refresh preserves equal/newer generations", () => {
  const entries = ["0", "1", "2"].map((gen) => ({ name: cookies.cookieName(f.sessionId, gen) }));
  assert.equal(cookies.clearObservedSession(entries, f.sessionId).length, 3);
  assert.deepEqual(cookies.clearLowerGenerations(entries, f.sessionId, "1").map((c) => c.name), [entries[0].name]);
  assert.equal(cookies.clearObservedSession(entries, f.otherId).length, 0);
});
test("transaction failures are sanitized and never automatically retried", async () => {
  for (const message of ["lock timeout synthetic-secret", "deadlock synthetic-secret", "ambiguous commit synthetic-secret"]) {
    let calls = 0;
    const repo = createSessionRepository({ async $transaction() { calls++; throw new Error(message); } });
    await assert.rejects(repo.withUser(f.userId, () => {}), rejected(503, "AUTH_SESSION_UNAVAILABLE"));
    assert.equal(calls, 1);
  }
});
test("invalid signatures, legacy protocols and inconsistent rows cannot enter bound rotation", async () => {
  for (const kind of ["signature", "legacy", "inconsistent"]) {
    const h = await rotated(), input = observed(h.login, h.first), writes = h.state.writes;
    if (kind === "signature") input.candidates[0].token = input.candidates[0].token.slice(0, -5) + "wrong";
    if (kind === "legacy") input.candidates[0].token = jwt.sign({ ...jwt.decode(h.first.refreshToken), type: "refresh" }, f.secret);
    if (kind === "inconsistent") h.state.row.refreshGeneration = null;
    await assert.rejects(h.service.refresh(input), { statusCode: kind === "inconsistent" ? 503 : 401 });
    assert.equal(h.state.writes, writes); assert.equal(h.state.row.revokedAt, null);
  }
});
test("a delayed older generation cookie does not override the current generation", async () => {
  const h = await rotated();
  const delayed = h.first;
  h.state.now = new Date(+h.state.row.refreshRecoveryExpiresAt);
  const newer = await h.service.refresh(observed(h.login, h.first));
  // Model Set-Cookie arrival newest first, delayed response last: distinct names
  // preserve the newer credential. Browser transport behavior is a Stage 3 gate.
  const jar = new Map();
  for (const response of [newer, delayed]) jar.set(cookies.cookieName(response.sessionId, response.generation), response);
  assert.equal(jar.size, 2);
  const recovered = await h.service.refresh(observed(h.login, ...jar.values()));
  assert.ok(recovered.refreshToken === newer.refreshToken);
  assert.equal(h.state.row.refreshGeneration, 2n);
});
