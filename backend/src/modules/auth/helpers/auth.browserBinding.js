const crypto = require("crypto");
const { UUID } = require("./auth.boundProtocol");
const { invalidCredential } = require("./auth.recoveryError");

const validSecret = (value) => typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value) &&
  Buffer.from(value, "base64url").length === 32 && Buffer.from(value, "base64url").toString("base64url") === value;

const hashBinding = (secret) => {
  if (!validSecret(secret)) throw invalidCredential();
  return crypto.createHash("sha256").update(secret, "utf8").digest("hex");
};

const generateBinding = (sessionId) => {
  if (!UUID.test(sessionId)) throw invalidCredential();
  const secret = crypto.randomBytes(32).toString("base64url");
  return { value: `${sessionId}.${secret}`, hash: hashBinding(secret) };
};

const parseBinding = (value) => {
  if (typeof value !== "string") throw invalidCredential();
  const parts = value.split(".");
  if (parts.length !== 2 || !UUID.test(parts[0]) || !validSecret(parts[1])) throw invalidCredential();
  return { sessionId: parts[0], hash: hashBinding(parts[1]) };
};

const equalBindingHashes = (left, right) => {
  if (typeof left !== "string" || typeof right !== "string" ||
      left.length !== 64 || right.length !== 64 ||
      !/^[0-9a-f]{64}$/.test(left) || !/^[0-9a-f]{64}$/.test(right)) return false;
  return crypto.timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
};

// Pure authorization check: no repository, response or cookie-writing dependency.
const requireBinding = (value, session) => {
  const parsed = parseBinding(value);
  if (parsed.sessionId !== session.sessionId || !equalBindingHashes(parsed.hash, session.browserBindingHash)) {
    throw invalidCredential();
  }
  return true;
};

module.exports = { generateBinding, parseBinding, hashBinding, equalBindingHashes, requireBinding };
