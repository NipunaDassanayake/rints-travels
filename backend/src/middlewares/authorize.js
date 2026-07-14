const { ForbiddenError } = require("../utils/AppError");

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