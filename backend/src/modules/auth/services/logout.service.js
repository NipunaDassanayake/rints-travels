const authRepository = require("../repositories/auth.repository");

const {
  verifyRefreshToken,
} = require("../helpers/auth.token");

const {
  hashToken,
} = require("../helpers/auth.tokenHash");

/**
 * Revoke the current refresh-token session.
 *
 * Logout is intentionally idempotent. Missing, invalid, expired,
 * or previously revoked tokens do not cause logout to fail.
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

  if (!session || session.revokedAt) {
    return;
  }

  const presentedTokenHash = hashToken(rawRefreshToken);

  if (
    session.userId !== payload.sub ||
    session.tokenHash !== presentedTokenHash
  ) {
    return;
  }

  await authRepository.revokeRefreshToken(session.id);
};

module.exports = {
  logout,
};