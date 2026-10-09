const { authFailure } = require("../modules/auth/helpers/auth.recoveryError");

const rejectOrigin = () => authFailure("AUTH_ORIGIN_REJECTED", 403);

const normalizeOrigin = (value) => {
  try {
    // Origin grammar is an origin only, never a URL path, credentials or a list.
    if (typeof value !== "string" || !/^https?:\/\/[^\s,/?#@\\]+$/.test(value)) throw rejectOrigin();
    const url = new URL(value);
    if (url.username || url.password || url.origin === "null") throw rejectOrigin();
    return url.origin;
  } catch {
    throw rejectOrigin();
  }
};

const trustedFrontendOrigin = (frontendUrl, nodeEnv) => {
  try {
    const url = new URL(frontendUrl);
    if (url.username || url.password || url.search || url.hash ||
        !["http:", "https:"].includes(url.protocol) ||
        (nodeEnv === "production" && url.protocol !== "https:")) throw rejectOrigin();
    return normalizeOrigin(url.origin);
  } catch {
    throw new Error("AUTH_ORIGIN_CONFIG_INVALID");
  }
};

// Factory only in Stage 1: no route registration or cookie/DB dependencies.
const createTrustedAuthOrigin = ({ frontendUrl, nodeEnv }) => {
  const trusted = trustedFrontendOrigin(frontendUrl, nodeEnv);
  return (req, res, next) => {
    try {
      const raw = req.rawHeaders;
      if (!Array.isArray(raw)) throw rejectOrigin();
      const values = [];
      for (let i = 0; i < raw.length; i += 2) {
        if (String(raw[i]).toLowerCase() === "origin") values.push(raw[i + 1]);
      }
      if (values.length !== 1 || normalizeOrigin(values[0]) !== trusted) throw rejectOrigin();
      next();
    } catch {
      next(rejectOrigin());
    }
  };
};

module.exports = { normalizeOrigin, trustedFrontendOrigin, createTrustedAuthOrigin };
