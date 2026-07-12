const crypto = require("crypto");
const env = require("../../../config/env");

const authRepository = require("../repositories/auth.repository");

const {
  comparePassword,
} = require("./auth.password");

const {
  generateAccessToken,
  generateRefreshToken,
} = require("./auth.token");

const {
  hashToken,
} = require("./auth.tokenHash");

const {
  UnauthorizedError,
  ForbiddenError,
} = require("../../../utils/AppError");

const {
  AUTH_MESSAGES,
} = require("../auth.constants");

/**
 * Verify local account credentials.
 */
const verifyLocalCredentials = async (loginDto) => {
  const user = await authRepository.findUserByEmail(loginDto.email);

  if (!user || !user.passwordHash || user.provider !== "LOCAL") {
    throw new UnauthorizedError(AUTH_MESSAGES.INVALID_CREDENTIALS);
  }

  const validPassword = await comparePassword(
    loginDto.password,
    user.passwordHash
  );

  if (!validPassword) {
    throw new UnauthorizedError(AUTH_MESSAGES.INVALID_CREDENTIALS);
  }

  if (user.status !== "ACTIVE") {
    throw new ForbiddenError(AUTH_MESSAGES.ACCOUNT_NOT_ACTIVE);
  }

  return user;
};

/**
 * Create a login session.
 */
const createUserSession = async (
  user,
  loginContext = {}
) => {

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
    sessionId,
    tokenHash,
    deviceName: loginContext.deviceName || null,
    ipAddress: loginContext.ipAddress || null,
    userAgent: loginContext.userAgent || null,
    expiresAt: new Date(
      Date.now() + env.cookie.refreshTokenMaxAgeMs
    ),
  });

  return {
    accessToken,
    refreshToken,
    sessionId,
  };
};

module.exports = {
  verifyLocalCredentials,
  createUserSession,
};