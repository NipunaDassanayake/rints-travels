const authRepository = require("../repositories/auth.repository");
const { hashPassword } = require("../helpers/auth.password");
const { ConflictError } = require("../../../utils/AppError");
const { AUTH_MESSAGES } = require("../auth.constants");

const register = async (registerDto) => {
  const existingUser = await authRepository.findUserByEmail(
    registerDto.email
  );

  if (existingUser) {
    throw new ConflictError(AUTH_MESSAGES.EMAIL_ALREADY_EXISTS);
  }

  const passwordHash = await hashPassword(registerDto.password);

  return authRepository.createUser({
    firstName: registerDto.firstName,
    lastName: registerDto.lastName,
    email: registerDto.email,
    phone: registerDto.phone,
    passwordHash,
    role: "TOURIST",
    provider: "LOCAL",
    isEmailVerified: false,
    status: "ACTIVE",
  });
};

module.exports = {
  register,
};