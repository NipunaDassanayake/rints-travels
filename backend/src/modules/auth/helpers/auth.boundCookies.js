const { UUID, parseGeneration } = require("./auth.boundProtocol");
const { parseBinding } = require("./auth.browserBinding");
const { invalidCredential } = require("./auth.recoveryError");

const MAX_CANDIDATES = 16;
const MAX_TOKEN_BYTES = 2048;

const createBoundCookies = ({ secure, sameSite, nodeEnv }) => {
  if (typeof secure !== "boolean" || !["strict", "lax", "none"].includes(sameSite) ||
      !["production", "development", "test"].includes(nodeEnv) ||
      (!secure && (nodeEnv === "production" || sameSite === "none"))) throw invalidCredential();
  const prefix = secure ? "__Host-" : "";
  const bindingName = `${prefix}travora_session_binding`;
  const refreshPrefix = `${prefix}travora_refresh_v2_`;
  const attributes = Object.freeze({ httpOnly: true, secure, sameSite, path: "/" });
  const cookieName = (sessionId, generation) => {
    if (!UUID.test(sessionId)) throw invalidCredential();
    parseGeneration(generation);
    return `${refreshPrefix}${sessionId.replaceAll("-", "")}_${generation}`;
  };
  const parseName = (name) => {
    if (typeof name !== "string" || !name.startsWith(refreshPrefix)) throw invalidCredential();
    const match = /^([0-9a-f]{32})_(0|[1-9][0-9]{0,18})(?![\s\S])/.exec(name.slice(refreshPrefix.length));
    if (!match) throw invalidCredential();
    parseGeneration(match[2]);
    const id = match[1];
    return { sessionId: `${id.slice(0,8)}-${id.slice(8,12)}-${id.slice(12,16)}-${id.slice(16,20)}-${id.slice(20)}`, generation: match[2] };
  };
  const options = (expires) => {
    if (!(expires instanceof Date) || !Number.isFinite(expires.getTime())) throw invalidCredential();
    return { ...attributes, expires: new Date(expires) };
  };
  const clear = (name) => ({ name, value: "", options: { ...attributes, expires: new Date(0), maxAge: 0 } });

  // Parse raw Cookie, not cookie-parser's object: duplicate names must not disappear.
  // Returned candidates are UNTRUSTED until signature, binding and locked DB hash checks.
  const parse = (rawCookie) => {
    if (rawCookie === undefined) return { binding: null, candidates: [] };
    if (typeof rawCookie !== "string" || /[\r\n\0]/.test(rawCookie)) throw invalidCredential();
    let binding = null;
    const candidates = [];
    const seen = new Set();
    for (const part of rawCookie.split(";")) {
      const piece = part.trim();
      const split = piece.indexOf("=");
      const name = split === -1 ? piece : piece.slice(0, split);
      const relevant = /^(?:__Host-)?travora_(?:session_binding|refresh_v2_)/.test(name);
      if (!relevant) continue;
      if (split === -1 || seen.has(name)) throw invalidCredential();
      seen.add(name);
      const value = piece.slice(split + 1);
      if (name === bindingName) {
        parseBinding(value);
        binding = value;
      } else {
        const identity = parseName(name); // Also rejects mixed secure/insecure namespaces.
        if (candidates.length >= MAX_CANDIDATES || !value || Buffer.byteLength(value, "utf8") > MAX_TOKEN_BYTES ||
            !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) throw invalidCredential();
        candidates.push({ name, token: value, ...identity });
      }
    }
    return { binding, candidates };
  };
  const clearLowerGenerations = (observed, sessionId, returnedGeneration) => {
    const current = parseGeneration(returnedGeneration);
    if (!UUID.test(sessionId) || !Array.isArray(observed) || observed.length > MAX_CANDIDATES) throw invalidCredential();
    const names = new Set();
    for (const candidate of observed) {
      const parsed = parseName(candidate.name);
      if (parsed.sessionId === sessionId && parseGeneration(parsed.generation) < current) names.add(candidate.name);
    }
    return [...names].map(clear);
  };
  return { bindingName, cookieName, parseName, parse, options, clearLowerGenerations,
    clearBinding: () => clear(bindingName) };
};

module.exports = { MAX_CANDIDATES, MAX_TOKEN_BYTES, createBoundCookies };
