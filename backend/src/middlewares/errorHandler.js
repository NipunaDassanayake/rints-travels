const { sendError } = require("../utils/apiResponse");

const errorHandler = (err, req, res, next) => {
  console.error(err);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  return sendError(res, message, err.errors || null, statusCode);
};

module.exports = errorHandler;