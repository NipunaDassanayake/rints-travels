const jwt = require("jsonwebtoken");
const env = require("../../../config/env");

/*
 * Tokens are only ever signed with HS256; verification refuses
 * every other algorithm (including HS384/HS512 with our secret).
 */
const JWT_ALGORITHM = "HS256";

const generateAccessToken = (payload) => {
  return jwt.sign(payload, env.jwt.accessSecret, {
    algorithm: JWT_ALGORITHM,
    expiresIn: env.jwt.accessExpiresIn,
  });
};

const generateRefreshToken = (payload) => {
  return jwt.sign(payload, env.jwt.refreshSecret, {
    algorithm: JWT_ALGORITHM,
    expiresIn: env.jwt.refreshExpiresIn,
  });
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, env.jwt.accessSecret, {
    algorithms: [JWT_ALGORITHM],
  });
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.jwt.refreshSecret, {
    algorithms: [JWT_ALGORITHM],
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
