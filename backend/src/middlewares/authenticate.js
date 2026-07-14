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

    if (
      payload.type !== TOKEN_TYPES.ACCESS ||
      !payload.sub
    ) {
      throw new UnauthorizedError(
        AUTH_MESSAGES.INVALID_ACCESS_TOKEN
      );
    }

    const user = await authRepository.findUserById(
      payload.sub
    );

    if (!user) {
      throw new UnauthorizedError(
        AUTH_MESSAGES.INVALID_ACCESS_TOKEN
      );
    }

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
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authenticate;