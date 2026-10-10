const authRepository = require("../repositories/auth.repository");

const {
  verifyRefreshToken,
} = require("../helpers/auth.token");

/**
 * Revoke the refresh-token session.
 *
 * Logout is intentionally idempotent. Missing, invalid, expired,
 * or previously revoked tokens do not cause logout to fail.
 *
 * Any validly signed, unexpired refresh token of the session
 * ends it -- not only the current one -- so whoever holds a
 * newer token (e.g. after a theft) cannot stop the user from
 * terminating the session (CR-012).
 */
const logout = async (rawRefreshToken) => {
  if (!rawRefreshToken) {
    return;
  }

  let payload;

  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch (error) {
    return;
  }

  if (
    payload.type !== "refresh" ||
    !payload.sub ||
    !payload.jti
  ) {
    return;
  }

  const session =
    await authRepository.findRefreshTokenBySessionId(
      payload.jti
    );

  if (
    !session ||
    session.revokedAt ||
    session.userId !== payload.sub ||
    session.browserBindingHash != null || session.refreshGeneration != null ||
    session.refreshRecoveryCiphertext != null || session.refreshRecoveryExpiresAt != null
  ) {
    return;
  }

  await authRepository.revokeRefreshToken(session.id);
};

module.exports = {
  logout,
};
