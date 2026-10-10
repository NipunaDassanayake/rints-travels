const env = require("../../../config/env");
const authService = require("../auth.service");
const authMapper = require("../mappers/auth.mapper");
const asyncHandler = require("../../../utils/asyncHandler");
const { sendSuccess } = require("../../../utils/apiResponse");
const HTTP_STATUS = require("../../../core/constants/httpStatus");
const { AUTH_MESSAGES } = require("../auth.constants");
const { setRefreshTokenCookie,clearRefreshTokenCookie, } = require("../helpers/auth.cookie");
const { bound, cookies } = require("../services/session.runtime");
const { parseBinding } = require("../helpers/auth.browserBinding");

const clearCookies = (res, descriptors) => {
  for (const cookie of descriptors) res.cookie(cookie.name, cookie.value, cookie.options);
};
const setSessionCookie = (res, result, observed) => {
  res.set("Cache-Control", "no-store");
  if (!result.bound) return setRefreshTokenCookie(res, result.refreshToken);
  res.cookie(cookies.cookieName(result.sessionId, result.generation), result.refreshToken, cookies.options(result.expiresAt));
  clearCookies(res, cookies.clearLowerGenerations(observed.candidates, result.sessionId, result.generation));
  if (result.binding) res.cookie(cookies.bindingName, result.binding, cookies.options(result.bindingExpiresAt));
};
const hasBoundCookies = (observed) => observed.binding !== null || observed.candidates.length > 0;

const register = asyncHandler(async (req, res) => {
  const registerDto = authMapper.toRegisterUserDto(req.body);
  const user = await authService.register(registerDto);
  const response = authMapper.toAuthUserResponse(user);

  return sendSuccess(
    res,
    AUTH_MESSAGES.REGISTER_SUCCESS,
    response,
    HTTP_STATUS.CREATED
  );
});

const login = asyncHandler(async (req, res) => {
  const observed = cookies.parse(req.headers.cookie);
  const loginDto = authMapper.toLoginDto(req.body);

  const result = await authService.login(loginDto, {
    ipAddress: req.ip,
    userAgent: req.get("user-agent") || null,
    deviceName: null,
  });

  // A successful new login replaces the browser's previous session selector.
  // Clear only names actually observed; other server sessions are not revoked.
  for (const sid of new Set(observed.candidates.map((candidate) => candidate.sessionId))) {
    clearCookies(res, cookies.clearObservedSession(observed.candidates, sid));
  }
  if (result.bound) clearRefreshTokenCookie(res);
  else if (observed.binding) clearCookies(res, [cookies.clearBinding()]);
  setSessionCookie(res, result, { candidates: [] });

  return sendSuccess(res, AUTH_MESSAGES.LOGIN_SUCCESS, {
    user: authMapper.toAuthUserResponse(result.user),
    accessToken: result.accessToken,
    expiresIn: env.jwt.accessExpiresIn,
  });
});

const refresh = asyncHandler(async (req, res) => {
  const observed = cookies.parse(req.headers.cookie);
  const rawRefreshToken =
    req.cookies?.[env.cookie.refreshTokenName];

  const result = await (hasBoundCookies(observed) ? bound.refresh : authService.refresh)(
    hasBoundCookies(observed) ? observed : rawRefreshToken,
    {
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
    }
  );

  setSessionCookie(res, result, observed);

  return sendSuccess(
    res,
    AUTH_MESSAGES.TOKEN_REFRESH_SUCCESS,
    {
      user: authMapper.toAuthUserResponse(result.user),
      accessToken: result.accessToken,
      expiresIn: env.jwt.accessExpiresIn,
    }
  );
});

const logout = asyncHandler(async (req, res) => {
  const observed = cookies.parse(req.headers.cookie);
  const rawRefreshToken =
    req.cookies?.[env.cookie.refreshTokenName];

  if (hasBoundCookies(observed)) {
    const result = await bound.logout(observed);
    clearCookies(res, [...cookies.clearObservedSession(observed.candidates, result.sessionId), cookies.clearBinding()]);
  } else {
    await authService.logout(rawRefreshToken);
    clearRefreshTokenCookie(res);
  }
  res.set("Cache-Control", "no-store");

  return sendSuccess(
    res,
    AUTH_MESSAGES.LOGOUT_SUCCESS
  );
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user.id);

  return sendSuccess(
    res,
    AUTH_MESSAGES.CURRENT_USER_SUCCESS,
    authMapper.toAuthUserResponse(user)
  );
});

const logoutAll = asyncHandler(async (req, res) => {
  const observed = cookies.parse(req.headers.cookie);
  await authService.logoutAll(req.user.id);
  if (observed.binding && parseBinding(observed.binding).sessionId === req.auth.sessionId) {
    clearCookies(res, [...cookies.clearObservedSession(observed.candidates, req.auth.sessionId), cookies.clearBinding()]);
  }
  res.set("Cache-Control", "no-store");
  clearRefreshTokenCookie(res);

  return sendSuccess(
    res,
    AUTH_MESSAGES.LOGOUT_ALL_SUCCESS
  );
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  getCurrentUser,
  logoutAll,
};
