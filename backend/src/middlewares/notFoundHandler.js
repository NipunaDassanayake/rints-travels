const { sendError } = require("../utils/apiResponse");

const notFoundHandler = (req, res) => {
  return sendError(res, `Route not found: ${req.originalUrl}`, null, 404);
};

module.exports = notFoundHandler;