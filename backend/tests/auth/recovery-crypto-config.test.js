const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const { parseRecoveryConfiguration } = require("../../src/config/refreshRecovery");
const { createRefreshRecovery } = require("../../src/modules/auth/helpers/auth.refreshRecovery");
const f = require("./fixtures");
const key = Buffer.alloc(32, 71);
const encoded = key.toString("base64");
const keys = new Map([["unit-key", key], ["prior-key", Buffer.alloc(32, 72)]]);
const engine = (overrides = {}) => createRefreshRecovery({ keys, activeKeyId: "unit-key", jwtSecret: f.secret, ...overrides });

test("key config accepts canonical multiple keys, independently of issuance flag", () => {
  for (const issuanceEnabled of [true, false]) {
    const config = parseRecoveryConfiguration({ keysJson: JSON.stringify({ a: encoded, b: encoded }), activeKeyId: "b", issuanceEnabled });
    assert.equal(config.keys.size, 2);
    assert.equal(config.activeKeyId, "b");
    assert.equal(config.issuanceEnabled, issuanceEnabled);
  }
  const defaults = parseRecoveryConfiguration({ keysJson: JSON.stringify({ a: encoded }), activeKeyId: "a" });
  assert.equal(defaults.issuanceEnabled, false);
});

for (const [label, input] of [
  ["malformed JSON", { keysJson: "{" }], ["array", { keysJson: "[]" }], ["null", { keysJson: "null" }],
  ["invalid ID", { keysJson: JSON.stringify({ "bad.id": encoded }), activeKeyId: "bad.id" }],
  ["long ID", { keysJson: JSON.stringify({ ["a".repeat(33)]: encoded }), activeKeyId: "a".repeat(33) }],
  ["noncanonical base64", { keysJson: JSON.stringify({ a: encoded.slice(0, -1) }) }],
  ["invalid base64", { keysJson: JSON.stringify({ a: "!".repeat(44) }) }],
  ["wrong key length", { keysJson: JSON.stringify({ a: Buffer.alloc(31).toString("base64") }) }],
  ["missing active key", { activeKeyId: undefined }], ["unknown active key", { activeKeyId: "missing" }],
  ["empty keyring", { keysJson: "{}" }], ["duplicate key IDs", { keysJson: `{"a":"${encoded}","a":"${encoded}"}` }],
  ["escaped duplicate key", { keysJson: `{"a":"${encoded}","\\u0061":"${encoded}"}` }],
  ["ID with newline", { keysJson: JSON.stringify({ "a\n": encoded }), activeKeyId: "a\n" }],
]) {
  test(`key config safely rejects ${label}`, () => {
    let caught;
    try { parseRecoveryConfiguration({ keysJson: JSON.stringify({ a: encoded }), activeKeyId: "a", ...input }); } catch (error) { caught = error; }
    assert.equal(caught?.message, "AUTH_RECOVERY_CONFIG_INVALID");
    assert.ok(!JSON.stringify(caught).includes(encoded));
  });
}
test("recovery keys are mandatory independently of issuance including its default", () => {
  for (const issuanceEnabled of [undefined, false, true]) {
    for (const settings of [{}, { activeKeyId: "a" }, { keysJson: JSON.stringify({ a: encoded }) }]) {
      assert.throws(() => parseRecoveryConfiguration({ ...settings, issuanceEnabled }), { message: "AUTH_RECOVERY_CONFIG_INVALID" });
    }
  }
});

test("recovery envelope roundtrip uses fresh IVs and contains no plaintext credentials", () => {
  const one = engine().encrypt(f.token, f.metadata(), f.now);
  const two = engine().encrypt(f.token, f.metadata(), f.now);
  assert.ok(one !== two);
  assert.equal(Buffer.from(one.split(".")[2], "base64url").length, 12);
  assert.equal(Buffer.from(one.split(".")[4], "base64url").length, 16);
  assert.ok(engine().decrypt(one, f.metadata(), f.now) === f.token);
  assert.ok(!one.includes(f.token));
  assert.ok(!one.includes(encoded));
  const previous = engine({ activeKeyId: "prior-key" }).encrypt(f.token, f.metadata(), f.now);
  assert.ok(engine().decrypt(previous, f.metadata(), f.now) === f.token);
});

const expectUnavailable = (fn) => {
  let caught;
  try { fn(); } catch (error) { caught = error; }
  assert.equal(caught?.code, "AUTH_RECOVERY_UNAVAILABLE");
  assert.equal(caught.statusCode, 503);
  assert.equal(caught.message, "AUTH_RECOVERY_UNAVAILABLE");
  assert.equal(caught.cause, undefined);
  const rendered = String(caught.stack) + JSON.stringify(caught);
  assert.ok(!rendered.includes(f.token) && !rendered.includes(encoded));
};

for (const field of ["iv", "ciphertext", "tag"]) {
  test(`tampered ${field} fails without sensitive error details`, () => {
    const parts = engine().encrypt(f.token, f.metadata(), f.now).split(".");
    const index = { iv: 2, ciphertext: 3, tag: 4 }[field];
    const bytes = Buffer.from(parts[index], "base64url");
    bytes[0] ^= 1;
    parts[index] = bytes.toString("base64url");
    expectUnavailable(() => engine().decrypt(parts.join("."), f.metadata(), f.now));
  });
}
test("wrong/missing/unknown keys and malformed envelopes fail closed", () => {
  const envelope = engine().encrypt(f.token, f.metadata(), f.now);
  expectUnavailable(() => engine({ keys: new Map([["unit-key", Buffer.alloc(32)]]) }).decrypt(envelope, f.metadata(), f.now));
  expectUnavailable(() => engine({ keys: new Map() }).decrypt(envelope, f.metadata(), f.now));
  expectUnavailable(() => engine().decrypt(envelope.replace("unit-key", "absent"), f.metadata(), f.now));
  for (const bad of ["", "v2.a.b.c.d", envelope + ".extra", envelope + "=", "a".repeat(8193), null]) {
    expectUnavailable(() => engine().decrypt(bad, f.metadata(), f.now));
  }
});

test("all locked-row AAD and token identity fields are bound", () => {
  const envelope = engine().encrypt(f.token, f.metadata(), f.now);
  for (const patch of [{ sessionId: f.otherId }, { userId: f.otherId }, { generation: "2" },
    { tokenHash: "c".repeat(64) }, { browserBindingHash: "d".repeat(64) },
    { effectiveExpiresAt: new Date(+f.now + 2000) }, { recoveryExpiresAt: new Date(+f.now + 1000) }, { absoluteExpiresAt: 1 }]) {
    expectUnavailable(() => engine().decrypt(envelope, { ...f.metadata(), ...patch }, f.now));
  }
  expectUnavailable(() => engine().decrypt(envelope, f.metadata(), f.metadata().recoveryExpiresAt));
  expectUnavailable(() => engine({ jwtSecret: "wrong" }).decrypt(envelope, f.metadata(), f.now));
});

// Construct authenticated yet invalid payloads to test post-authentication checks.
test("authenticated payload schema/mismatches are rejected, not just bad GCM tags", () => {
  const m = f.metadata();
  const associatedData = Buffer.from(JSON.stringify(["travora.refresh-recovery", 1, "unit-key", m.sessionId,
    m.generation, m.tokenHash, m.browserBindingHash, m.effectiveExpiresAt.toISOString(), m.recoveryExpiresAt.toISOString()]));
  const payload = { v: 1, sid: m.sessionId, gen: m.generation, token: f.token, sha256: m.tokenHash, effectiveExpiresAt: m.effectiveExpiresAt.toISOString() };
  for (const patch of [{ v: 2 }, { sid: f.otherId }, { gen: "2" },
    { sha256: "e".repeat(64) }, { effectiveExpiresAt: f.now.toISOString() }, { extra: true }]) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
    cipher.setAAD(associatedData);
    const bytes = Buffer.concat([cipher.update(JSON.stringify({ ...payload, ...patch })), cipher.final()]);
    const envelope = ["v1", "unit-key", iv.toString("base64url"), bytes.toString("base64url"), cipher.getAuthTag().toString("base64url")].join(".");
    expectUnavailable(() => engine().decrypt(envelope, m, f.now));
  }
});

test("authenticated hash-consistent recovery rejects a legacy JWT protocol", () => {
  // Construct both envelopes independently of the production encrypt validator.
  // The positive control proves the payload/AAD construction is otherwise valid.
  for (const type of ["refresh_bound_v2", "refresh"]) {
    const token = f.sign({ type });
    const m = { ...f.metadata(), tokenHash: f.hash(token) };
    const payload = { v: 1, sid: m.sessionId, gen: m.generation, token,
      sha256: m.tokenHash, effectiveExpiresAt: m.effectiveExpiresAt.toISOString() };
    const associatedData = Buffer.from(JSON.stringify(["travora.refresh-recovery", 1, "unit-key", m.sessionId,
      m.generation, m.tokenHash, m.browserBindingHash, m.effectiveExpiresAt.toISOString(), m.recoveryExpiresAt.toISOString()]));
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
    cipher.setAAD(associatedData);
    const bytes = Buffer.concat([cipher.update(JSON.stringify(payload)), cipher.final()]);
    const envelope = ["v1", "unit-key", iv.toString("base64url"), bytes.toString("base64url"), cipher.getAuthTag().toString("base64url")].join(".");
    if (type === "refresh_bound_v2") assert.ok(engine().decrypt(envelope, m, f.now) === token);
    else expectUnavailable(() => engine().decrypt(envelope, m, f.now));
  }
});
