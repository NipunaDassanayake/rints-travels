const { BadRequestError } = require("../utils/AppError");

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => detail.message);
      return next(new BadRequestError("Validation failed", errors));
    }

    req.body = value;
    next();
  };
};

module.exports = validateRequest;