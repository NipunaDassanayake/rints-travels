const crypto = require("crypto");
const env = require("../../../config/env");
const {
  USER_STATUS,
  AUTH_PROVIDERS,
  TOKEN_TYPES,
} = require("../../../core/constants/auth.constants");

const authRepository = require("../repositories/auth.repository");

const { comparePassword, hashPassword } = require("./auth.password");

const { generateAccessToken, generateRefreshToken } = require("./auth.token");

const { hashToken } = require("./auth.tokenHash");

const {
  UnauthorizedError,
  ForbiddenError,
} = require("../../../utils/AppError");

const { AUTH_MESSAGES } = require("../auth.constants");

/*
 * A bcrypt hash (same cost as real passwords) of a random value,
 * compared against when no usable account exists, so a login
 * for an unknown email takes as long as one for a known email.
 * Created once, when this module loads.
 */
let dummyPasswordHashPromise = null;

const getDummyPasswordHash = () => {
  if (!dummyPasswordHashPromise) {
    dummyPasswordHashPromise = hashPassword(crypto.randomBytes(32).toString("hex"));
  }

  return dummyPasswordHashPromise;
};

getDummyPasswordHash();

/**
 * Verify local account credentials.
 */
const verifyLocalCredentials = async (loginDto) => {
  const user = await authRepository.findUserByEmail(loginDto.email);

  if (!user || !user.passwordHash || user.provider !== AUTH_PROVIDERS.LOCAL) {
    await comparePassword(loginDto.password, await getDummyPasswordHash());

    throw new UnauthorizedError(AUTH_MESSAGES.INVALID_CREDENTIALS);
  }

  const validPassword = await comparePassword(
    loginDto.password,
    user.passwordHash,
  );

  if (!validPassword) {
    throw new UnauthorizedError(AUTH_MESSAGES.INVALID_CREDENTIALS);
  }

  if (user.status !== USER_STATUS.ACTIVE) {
    throw new ForbiddenError(AUTH_MESSAGES.ACCOUNT_NOT_ACTIVE);
  }

  return user;
};

/**
 * Issue an access/refresh token pair for a session.
 *
 * - sid binds the access token to its session: authenticate
 *   rejects it as soon as the session is revoked or expired.
 * - rid makes every refresh token unique, so rotation never
 *   depends on two requests landing in different seconds.
 */
const issueSessionTokens = (user, sessionId) => {
  const accessToken = generateAccessToken({
    sub: user.id,
    sid: sessionId,
    role: user.role,
    type: TOKEN_TYPES.ACCESS,
  });

  const refreshToken = generateRefreshToken({
    sub: user.id,
    jti: sessionId,
    rid: crypto.randomUUID(),
    type: TOKEN_TYPES.REFRESH,
  });

  return {
    accessToken,
    refreshToken,
  };
};

/**
 * Create a login session.
 */
const createUserSession = async (user, loginContext = {}) => {
  const sessionId = crypto.randomUUID();

  const { accessToken, refreshToken } = issueSessionTokens(user, sessionId);

  const tokenHash = hashToken(refreshToken);

  await authRepository.createRefreshToken({
    userId: user.id,
    sessionId,
    tokenHash,
    deviceName: loginContext.deviceName || null,
    ipAddress: loginContext.ipAddress || null,
    userAgent: loginContext.userAgent || null,
    expiresAt: new Date(
      Date.now() +
        Math.min(env.cookie.refreshTokenMaxAgeMs, env.session.absoluteMaxAgeMs),
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
  issueSessionTokens,
  createUserSession,
};
