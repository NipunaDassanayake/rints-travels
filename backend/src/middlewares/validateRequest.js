const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      error.statusCode = 400;
      error.errors = error.details.map((detail) => detail.message);
      return next(error);
    }

    next();
  };
};

module.exports = validateRequest;