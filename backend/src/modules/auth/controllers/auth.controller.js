const env = require("../../../config/env");
const authService = require("../auth.service");
const authMapper = require("../mappers/auth.mapper");
const asyncHandler = require("../../../utils/asyncHandler");
const { sendSuccess } = require("../../../utils/apiResponse");
const HTTP_STATUS = require("../../../core/constants/httpStatus");
const { AUTH_MESSAGES } = require("../auth.constants");
const { setRefreshTokenCookie } = require("../helpers/auth.cookie");

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

module.exports = {
  register,
  login,
};