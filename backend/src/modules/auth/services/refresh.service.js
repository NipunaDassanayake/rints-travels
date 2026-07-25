const env = require("../../../config/env");
const authRepository = require("../repositories/auth.repository");

const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../helpers/auth.token");

const { hashToken } = require("../helpers/auth.tokenHash");

const {
  UnauthorizedError,
  ForbiddenError,
} = require("../../../utils/AppError");

const { AUTH_MESSAGES } = require("../auth.constants");

const refresh = async (rawRefreshToken, refreshContext = {}) => {
  if (!rawRefreshToken) {
    throw new UnauthorizedError(
      AUTH_MESSAGES.REFRESH_TOKEN_REQUIRED
    );
  }

  let payload;

  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch (error) {
    throw new UnauthorizedError(
      AUTH_MESSAGES.INVALID_REFRESH_TOKEN
    );
  }

  if (
    payload.type !== "refresh" ||
    !payload.sub ||
    !payload.jti
  ) {
    throw new UnauthorizedError(
      AUTH_MESSAGES.INVALID_REFRESH_TOKEN
    );
  }

  const session =
    await authRepository.findRefreshTokenBySessionId(
      payload.jti
    );

  if (!session) {
    throw new UnauthorizedError(
      AUTH_MESSAGES.INVALID_REFRESH_TOKEN
    );
  }

  if (
    session.userId !== payload.sub ||
    session.revokedAt ||
    session.expiresAt <= new Date()
  ) {
    throw new UnauthorizedError(
      AUTH_MESSAGES.INVALID_REFRESH_TOKEN
    );
  }

  const presentedTokenHash = hashToken(rawRefreshToken);

  /*
   * If the token's hash does not match the current database hash,
   * an old rotated token may be getting reused.
   * Revoke the session as a security precaution.
   */
  if (session.tokenHash !== presentedTokenHash) {
    await authRepository.revokeRefreshToken(session.id);

    throw new UnauthorizedError(
      AUTH_MESSAGES.INVALID_REFRESH_TOKEN
    );
  }

  if (session.user.status !== "ACTIVE") {
    await authRepository.revokeRefreshToken(session.id);

    throw new ForbiddenError(
      AUTH_MESSAGES.ACCOUNT_NOT_ACTIVE
    );
  }

  const newAccessToken = generateAccessToken({
    sub: session.user.id,
    role: session.user.role,
    type: "access",
  });

  /*
   * Keep the same session ID because this is the same browser/device
   * session. Only the refresh token itself is rotated.
   */
  const newRefreshToken = generateRefreshToken({
    sub: session.user.id,
    jti: session.sessionId,
    type: "refresh",
  });

  const newTokenHash = hashToken(newRefreshToken);

  await authRepository.updateRefreshTokenUsage(
    session.id,
    {
      tokenHash: newTokenHash,
      expiresAt: new Date(
        Date.now() + env.cookie.refreshTokenMaxAgeMs
      ),
      ipAddress:
        refreshContext.ipAddress || session.ipAddress,
      userAgent:
        refreshContext.userAgent || session.userAgent,
    }
  );

  return {
    user: session.user,
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};

module.exports = {
  refresh,
};