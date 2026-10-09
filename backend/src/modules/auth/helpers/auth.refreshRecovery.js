const crypto = require("crypto");
const { KEY_ID } = require("../../../config/refreshRecovery");
const { UUID, parseGeneration, verifyBoundRefreshToken } = require("./auth.boundProtocol");
const { recoveryUnavailable } = require("./auth.recoveryError");

const sha256 = (value) => crypto.createHash("sha256").update(value, "utf8").digest("hex");
const validHash = (value) => typeof value === "string" && value.length === 64 && /^[0-9a-f]{64}$/.test(value);
const date = (value) => {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) throw recoveryUnavailable();
  return value.toISOString();
};
const decode = (value, length) => {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw recoveryUnavailable();
  const bytes = Buffer.from(value, "base64url");
  if (bytes.toString("base64url") !== value || (length !== undefined && bytes.length !== length)) throw recoveryUnavailable();
  return bytes;
};
const aad = (keyId, metadata) => {
  const m = metadata;
  if (!KEY_ID.test(keyId) || !UUID.test(m.sessionId) || !UUID.test(m.userId) ||
      !validHash(m.tokenHash) || !validHash(m.browserBindingHash) ||
      !Number.isSafeInteger(m.absoluteExpiresAt) || m.absoluteExpiresAt <= 0) throw recoveryUnavailable();
  if (parseGeneration(m.generation) === 0n) throw recoveryUnavailable();
  return Buffer.from(JSON.stringify(["travora.refresh-recovery", 1, keyId, m.sessionId, m.generation,
    m.tokenHash, m.browserBindingHash, date(m.effectiveExpiresAt), date(m.recoveryExpiresAt)]), "utf8");
};

const validatePayload = (payload, metadata, jwtSecret, now) => {
  const m = metadata;
  if (!payload || Object.keys(payload).sort().join(",") !== "effectiveExpiresAt,gen,sha256,sid,token,v" ||
      payload.v !== 1 || payload.sid !== m.sessionId || payload.gen !== m.generation ||
      payload.sha256 !== m.tokenHash || payload.effectiveExpiresAt !== date(m.effectiveExpiresAt) ||
      typeof payload.token !== "string" || Buffer.byteLength(payload.token, "utf8") > 2048 ||
      sha256(payload.token) !== m.tokenHash || !(now instanceof Date) || !Number.isFinite(now.getTime()) ||
      now >= m.recoveryExpiresAt || now >= m.effectiveExpiresAt || m.recoveryExpiresAt > m.effectiveExpiresAt) throw recoveryUnavailable();
  const claims = verifyBoundRefreshToken(payload.token, { secret: jwtSecret, now, sessionId: m.sessionId,
    userId: m.userId, generation: m.generation, absoluteExpiresAt: m.absoluteExpiresAt });
  if (claims.exp * 1000 < m.effectiveExpiresAt.getTime()) throw recoveryUnavailable();
  return payload.token;
};

// Key/clock injection only. No env loading, DB writes, logger, response or token issuance.
const createRefreshRecovery = ({ keys, activeKeyId, jwtSecret }) => {
  const key = (id) => {
    const value = keys.get(id);
    if (!Buffer.isBuffer(value) || value.length !== 32) throw recoveryUnavailable();
    return value;
  };
  const encrypt = (token, metadata, now) => {
    try {
      const associatedData = aad(activeKeyId, metadata);
      const payload = { v: 1, sid: metadata.sessionId, gen: metadata.generation, token,
        sha256: metadata.tokenHash, effectiveExpiresAt: date(metadata.effectiveExpiresAt) };
      validatePayload(payload, metadata, jwtSecret, now);
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv("aes-256-gcm", key(activeKeyId), iv, { authTagLength: 16 });
      cipher.setAAD(associatedData);
      const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
      return ["v1", activeKeyId, iv.toString("base64url"), ciphertext.toString("base64url"), cipher.getAuthTag().toString("base64url")].join(".");
    } catch {
      throw recoveryUnavailable();
    }
  };
  const decrypt = (envelope, metadata, now) => {
    try {
      if (typeof envelope !== "string" || envelope.length > 8192) throw recoveryUnavailable();
      const parts = envelope.split(".");
      if (parts.length !== 5 || parts[0] !== "v1" || !KEY_ID.test(parts[1])) throw recoveryUnavailable();
      const decipher = crypto.createDecipheriv("aes-256-gcm", key(parts[1]), decode(parts[2], 12), { authTagLength: 16 });
      decipher.setAAD(aad(parts[1], metadata));
      decipher.setAuthTag(decode(parts[4], 16));
      // No parsing or use until final() has authenticated the whole plaintext.
      const plaintext = Buffer.concat([decipher.update(decode(parts[3])), decipher.final()]);
      return validatePayload(JSON.parse(plaintext.toString("utf8")), metadata, jwtSecret, now);
    } catch {
      throw recoveryUnavailable();
    }
  };
  return { encrypt, decrypt };
};

module.exports = { createRefreshRecovery };
