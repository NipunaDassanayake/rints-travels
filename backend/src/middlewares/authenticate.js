const authRepository = require("../modules/auth/repositories/auth.repository");

const {
  verifyAccessToken,
} = require("../modules/auth/helpers/auth.token");

const {
  USER_STATUS,
  TOKEN_TYPES,
} = require("../core/constants/auth.constants");

const {
  UnauthorizedError,
  ForbiddenError,
} = require("../utils/AppError");

const { AUTH_MESSAGES } = require("../modules/auth/auth.constants");

const authenticate = async (req, res, next) => {
  try {
    const authorizationHeader = req.get("authorization");

    if (
      !authorizationHeader ||
      !authorizationHeader.startsWith("Bearer ")
    ) {
      throw new UnauthorizedError(
        AUTH_MESSAGES.ACCESS_TOKEN_REQUIRED
      );
    }

    const accessToken = authorizationHeader
      .slice("Bearer ".length)
      .trim();

    if (!accessToken) {
      throw new UnauthorizedError(
        AUTH_MESSAGES.ACCESS_TOKEN_REQUIRED
      );
    }

    let payload;

    try {
      payload = verifyAccessToken(accessToken);
    } catch (error) {
      throw new UnauthorizedError(
        AUTH_MESSAGES.INVALID_ACCESS_TOKEN
      );
    }

    /*
     * Access tokens are bound to their login session (sid).
     * Tokens without one (issued before CR-012) are rejected
     * with 401; the client then refreshes transparently.
     */
    if (
      payload.type !== TOKEN_TYPES.ACCESS ||
      !payload.sub ||
      !payload.sid
    ) {
      throw new UnauthorizedError(
        AUTH_MESSAGES.INVALID_ACCESS_TOKEN
      );
    }

    /*
     * One query: the session with its user. Logout, logout-all,
     * reuse revocation and session expiry therefore take effect
     * on the very next request, not when the token expires.
     */
    const session =
      await authRepository.findRefreshTokenBySessionId(
        payload.sid
      );

    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt <= new Date()
    ) {
      throw new UnauthorizedError(
        AUTH_MESSAGES.INVALID_ACCESS_TOKEN
      );
    }

    const { user } = session;

    if (user.status !== USER_STATUS.ACTIVE) {
      throw new ForbiddenError(
        AUTH_MESSAGES.ACCOUNT_NOT_ACTIVE
      );
    }

    req.user = {
      id: user.id,
      role: user.role,
      email: user.email,
    };

    req.auth = {
      tokenPayload: payload,
      sessionId: session.sessionId,
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authenticate;