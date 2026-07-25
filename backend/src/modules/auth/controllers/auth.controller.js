const env = require("../../../config/env");
const authService = require("../auth.service");
const authMapper = require("../mappers/auth.mapper");
const asyncHandler = require("../../../utils/asyncHandler");
const { sendSuccess } = require("../../../utils/apiResponse");
const HTTP_STATUS = require("../../../core/constants/httpStatus");
const { AUTH_MESSAGES } = require("../auth.constants");
const { setRefreshTokenCookie,clearRefreshTokenCookie, } = require("../helpers/auth.cookie");

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
  const loginDto = authMapper.toLoginDto(req.body);

  const result = await authService.login(loginDto, {
    ipAddress: req.ip,
    userAgent: req.get("user-agent") || null,
    deviceName: null,
  });

  setRefreshTokenCookie(res, result.refreshToken);

  return sendSuccess(res, AUTH_MESSAGES.LOGIN_SUCCESS, {
    user: authMapper.toAuthUserResponse(result.user),
    accessToken: result.accessToken,
    expiresIn: env.jwt.accessExpiresIn,
  });
});

const refresh = asyncHandler(async (req, res) => {
  const rawRefreshToken =
    req.cookies?.[env.cookie.refreshTokenName];

  const result = await authService.refresh(
    rawRefreshToken,
    {
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
    }
  );

  setRefreshTokenCookie(res, result.refreshToken);

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
  const rawRefreshToken =
    req.cookies?.[env.cookie.refreshTokenName];

  await authService.logout(rawRefreshToken);

  clearRefreshTokenCookie(res);

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
  await authService.logoutAll(req.user.id);

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