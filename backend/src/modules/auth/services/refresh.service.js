const env = require("../../../config/env");
const authRepository = require("../repositories/auth.repository");

const { verifyRefreshToken } = require("../helpers/auth.token");

const { issueSessionTokens } = require("../helpers/auth.helpers");

const { hashToken } = require("../helpers/auth.tokenHash");

const {
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
} = require("../../../utils/AppError");

const {
  USER_STATUS,
  TOKEN_TYPES,
} = require("../../../core/constants/auth.constants");

const { AUTH_MESSAGES } = require("../auth.constants");

/**
 * =========================================================
 * Refresh-token rotation (CR-012)
 * =========================================================
 *
 * Every successful refresh rotates the session's refresh token
 * exactly once (compare-and-swap in the repository). Only a
 * successful rotation returns tokens -- and therefore only a
 * 200 ever sets the refresh cookie, so the browser's cookie can
 * only move forward.
 *
 * A token that is no longer the session's current one is either:
 *
 * - THE token replaced by the latest rotation (previousTokenHash),
 *   presented within the grace window after that rotation: a
 *   request that raced it (a second tab, or a response still in
 *   flight). 409, no tokens, session kept -- the client retries
 *   once the winning response's cookie has arrived; or
 * - anything else -- an older token, or the previous one after
 *   the window: reuse detection revokes the whole session. Later
 *   rotations never widen the grace to older tokens, because
 *   each rotation replaces previousTokenHash.
 */

const isImmediatePredecessorInGrace = (session, presentedTokenHash, now) => {
  const graceMs = env.session.refreshReuseGraceMs;

  return (
    graceMs > 0 &&
    session.previousTokenHash === presentedTokenHash &&
    session.lastUsedAt !== null &&
    now.getTime() - session.lastUsedAt.getTime() <= graceMs
  );
};

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
    payload.type !== TOKEN_TYPES.REFRESH ||
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

  const now = new Date();

  if (
    !session ||
    session.userId !== payload.sub ||
    session.revokedAt ||
    session.expiresAt <= now
  ) {
    throw new UnauthorizedError(
      AUTH_MESSAGES.INVALID_REFRESH_TOKEN
    );
  }

  /*
   * Absolute lifetime: a session cannot be kept alive by
   * refreshing forever.
   */
  const absoluteExpiresAt = new Date(
    session.createdAt.getTime() + env.session.absoluteMaxAgeMs
  );

  if (absoluteExpiresAt <= now) {
    await authRepository.revokeRefreshToken(session.id);

    throw new UnauthorizedError(
      AUTH_MESSAGES.INVALID_REFRESH_TOKEN
    );
  }

  const presentedTokenHash = hashToken(rawRefreshToken);

  if (session.tokenHash !== presentedTokenHash) {
    if (
      isImmediatePredecessorInGrace(session, presentedTokenHash, now)
    ) {
      throw new ConflictError(
        AUTH_MESSAGES.REFRESH_IN_PROGRESS
      );
    }

    /*
     * An old rotated token is being reused.
     * Revoke the session as a security precaution.
     */
    await authRepository.revokeRefreshToken(session.id);

    throw new UnauthorizedError(
      AUTH_MESSAGES.INVALID_REFRESH_TOKEN
    );
  }

  if (session.user.status !== USER_STATUS.ACTIVE) {
    await authRepository.revokeRefreshToken(session.id);

    throw new ForbiddenError(
      AUTH_MESSAGES.ACCOUNT_NOT_ACTIVE
    );
  }

  /*
   * Keep the same session ID because this is the same browser/device
   * session. Only the refresh token itself is rotated.
   */
  const {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  } = issueSessionTokens(session.user, session.sessionId);

  const rotated = await authRepository.rotateRefreshToken(
    session.id,
    presentedTokenHash,
    {
      tokenHash: hashToken(newRefreshToken),
      expiresAt: new Date(
        Math.min(
          now.getTime() + env.cookie.refreshTokenMaxAgeMs,
          absoluteExpiresAt.getTime()
        )
      ),
      ipAddress:
        refreshContext.ipAddress || session.ipAddress,
      userAgent:
        refreshContext.userAgent || session.userAgent,
    }
  );

  if (!rotated) {
    /*
     * Rotated or revoked between our read and our write. A
     * revocation (logout) always wins. If another request just
     * rotated exactly this token, we lost a race: 409. Anything
     * else means this token is already older than the previous
     * one -- treat it like any other reuse.
     */
    const current =
      await authRepository.findRefreshTokenBySessionId(
        payload.jti
      );

    if (!current || current.revokedAt) {
      throw new UnauthorizedError(
        AUTH_MESSAGES.INVALID_REFRESH_TOKEN
      );
    }

    if (current.previousTokenHash === presentedTokenHash) {
      throw new ConflictError(
        AUTH_MESSAGES.REFRESH_IN_PROGRESS
      );
    }

    await authRepository.revokeRefreshToken(current.id);

    throw new UnauthorizedError(
      AUTH_MESSAGES.INVALID_REFRESH_TOKEN
    );
  }

  return {
    user: session.user,
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};

module.exports = {
  refresh,
};
