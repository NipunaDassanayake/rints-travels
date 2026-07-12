const authService = require("./auth.service");
const authMapper = require("./auth.mapper");
const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const HTTP_STATUS = require("../../core/constants/httpStatus");
const { AUTH_MESSAGES } = require("./auth.constants");

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

module.exports = {
  register,
};