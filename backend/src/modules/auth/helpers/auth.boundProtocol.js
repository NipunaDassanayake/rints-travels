const jwt = require("jsonwebtoken");
const { TOKEN_TYPES } = require("../../../core/constants/auth.constants");
const { invalidCredential } = require("./auth.recoveryError");

// Absolute end assertion: unlike $, this must not accept a final line terminator.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?![\s\S])/;
const MAX_GENERATION = 9223372036854775807n;

const parseGeneration = (value) => {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]{0,18})$/.test(value)) throw invalidCredential();
  const generation = BigInt(value);
  if (generation > MAX_GENERATION || generation.toString() !== value) throw invalidCredential();
  return generation;
};

const nextGeneration = (value) => {
  const generation = parseGeneration(value);
  if (generation === MAX_GENERATION) throw invalidCredential();
  return (generation + 1n).toString();
};

const validEpoch = (value) => Number.isSafeInteger(value) && value > 0;

// Explicit clock and key keep this primitive independent of env, DB and issuance.
const verifyBoundRefreshToken = (token, { secret, now, sessionId, userId, generation, absoluteExpiresAt }) => {
  try {
    if (!(now instanceof Date) || !Number.isFinite(now.getTime()) || typeof token !== "string") throw invalidCredential();
    const payload = jwt.verify(token, secret, { algorithms: ["HS256"], clockTimestamp: now.getTime() / 1000 });
    if (!payload || !["sub", "jti", "rid", "gen", "type"].every((claim) => typeof payload[claim] === "string") ||
        payload.type !== TOKEN_TYPES.BOUND_REFRESH || !UUID.test(payload.sub) ||
        !UUID.test(payload.jti) || !UUID.test(payload.rid) || !validEpoch(payload.iat) ||
        !validEpoch(payload.exp) || !validEpoch(payload.aexp) || payload.iat > now.getTime() / 1000 ||
        payload.exp <= payload.iat || payload.exp > payload.aexp || payload.aexp <= now.getTime() / 1000) {
      throw invalidCredential();
    }
    parseGeneration(payload.gen);
    if ((sessionId !== undefined && payload.jti !== sessionId) ||
        (userId !== undefined && payload.sub !== userId) ||
        (generation !== undefined && payload.gen !== generation) ||
        (absoluteExpiresAt !== undefined && payload.aexp !== absoluteExpiresAt)) throw invalidCredential();
    return payload;
  } catch {
    throw invalidCredential();
  }
};

module.exports = { UUID, MAX_GENERATION, parseGeneration, nextGeneration, verifyBoundRefreshToken };
