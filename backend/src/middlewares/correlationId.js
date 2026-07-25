//crypto module is used to generate a unique correlation ID for each incoming request. This ID can be used for tracking and logging purposes, making it easier to trace requests through the system.
const crypto = require("crypto");

const correlationId = (req, res, next) => {
  const incomingCorrelationId = req.headers["x-correlation-id"];

  req.correlationId = incomingCorrelationId || crypto.randomUUID();

  res.setHeader("X-Correlation-Id", req.correlationId);

  next();
};

module.exports = correlationId;