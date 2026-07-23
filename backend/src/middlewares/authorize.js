const { ForbiddenError } = require("../utils/AppError");
const { AUTH_MESSAGES } = require("../modules/auth/auth.constants");

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new ForbiddenError(AUTH_MESSAGES.NOT_AUTHENTICATED)
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(AUTH_MESSAGES.FORBIDDEN)
      );
    }

    next();
  };
};

module.exports = authorize;