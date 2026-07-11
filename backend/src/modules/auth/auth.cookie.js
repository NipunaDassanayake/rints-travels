const env = require("../../config/env");
const { AUTH_COOKIE_PATH } = require("./auth.constants");

const getRefreshTokenCookieOptions = () => ({
  httpOnly: true,
  secure: env.cookie.secure,
  sameSite: env.cookie.sameSite,
  maxAge: env.cookie.refreshTokenMaxAgeMs,
  path: AUTH_COOKIE_PATH,
});

const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie(
    env.cookie.refreshTokenName,
    refreshToken,
    getRefreshTokenCookieOptions()
  );
};

const clearRefreshTokenCookie = (res) => {
  res.clearCookie(env.cookie.refreshTokenName, {
    httpOnly: true,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
    path: AUTH_COOKIE_PATH,
  });
};

module.exports = {
  getRefreshTokenCookieOptions,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
};