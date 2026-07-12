const crypto = require("crypto");
const env = require("../../config/env");
const authRepository = require("./auth.repository");
const { hashPassword, comparePassword } = require("./auth.password");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("./auth.token");
const { hashToken } = require("./auth.tokenHash");
const {
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
} = require("../../utils/AppError");
const { AUTH_MESSAGES } = require("./auth.constants");

const register = async (registerDto) => {
  const existingUser = await authRepository.findUserByEmail(registerDto.email);

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

const login = async (loginDto) => {
  const user = await authRepository.findUserByEmail(loginDto.email);

  if (!user || !user.passwordHash || user.provider !== "LOCAL") {
    throw new UnauthorizedError(AUTH_MESSAGES.INVALID_CREDENTIALS);
  }

  const passwordMatches = await comparePassword(
    loginDto.password,
    user.passwordHash
  );

  if (!passwordMatches) {
    throw new UnauthorizedError(AUTH_MESSAGES.INVALID_CREDENTIALS);
  }

  if (user.status !== "ACTIVE") {
    throw new ForbiddenError(AUTH_MESSAGES.ACCOUNT_NOT_ACTIVE);
  }

  const sessionId = crypto.randomUUID();

  const accessToken = generateAccessToken({
    sub: user.id,
    role: user.role,
    type: "access",
  });

  const refreshToken = generateRefreshToken({
    sub: user.id,
    jti: sessionId,
    type: "refresh",
  });

  const tokenHash = hashToken(refreshToken);

  await authRepository.createRefreshToken({
    userId: user.id,
    tokenHash,
    expiresAt: new Date(
      Date.now() + env.cookie.refreshTokenMaxAgeMs
    ),
  });

  return {
    user,
    accessToken,
    refreshToken,
  };
};

module.exports = {
  register,
  login,
};