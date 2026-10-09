const crypto = require("crypto");
const jwt = require("jsonwebtoken");

// Synthetic test-only material, never derived from .env or any account/database.
const secret = "cr033-unit-only-jwt-key-not-for-runtime-000000";
const sessionId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const otherId = "33333333-3333-4333-8333-333333333333";
const now = new Date("2026-10-09T00:00:00.000Z");
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const sign = (overrides = {}, signingKey = secret) => jwt.sign({
  type: "refresh_bound_v2", sub: userId, jti: sessionId,
  rid: "44444444-4444-4444-8444-444444444444", gen: "1",
  iat: now.getTime() / 1000 - 1, exp: now.getTime() / 1000 + 3600,
  aexp: now.getTime() / 1000 + 7200, ...overrides,
}, signingKey, { algorithm: "HS256" });
const token = sign();
const metadata = () => ({
  sessionId, userId, generation: "1", tokenHash: hash(token), browserBindingHash: "a".repeat(64),
  effectiveExpiresAt: new Date(now.getTime() + 3600_000),
  recoveryExpiresAt: new Date(now.getTime() + 30_000), absoluteExpiresAt: now.getTime() / 1000 + 7200,
});
const row = () => ({
  sessionId, userId, browserBindingHash: "a".repeat(64), refreshGeneration: 1n,
  refreshRecoveryCiphertext: "synthetic-ciphertext", refreshRecoveryExpiresAt: new Date(now.getTime() + 30_000),
  previousTokenHash: "b".repeat(64), tokenHash: hash(token),
  expiresAt: new Date(now.getTime() + 3600_000), revokedAt: null,
});
module.exports = { secret, sessionId, userId, otherId, now, hash, sign, token, metadata, row };
