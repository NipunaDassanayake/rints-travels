const buildMeta = (req, extraMeta = {}) => {
  return {
    timestamp: new Date().toISOString(),
    correlationId: req?.correlationId || null,
    ...extraMeta,
  };
};

const sendSuccess = (res, message, data = null, statusCode = 200, meta = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    errors: null,
    meta: buildMeta(res.req, meta),
  });
};

const sendError = (res, message, errors = null, statusCode = 500, meta = {}) => {
  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
    errors,
    meta: buildMeta(res.req, meta),
  });
};

module.exports = {
  sendSuccess,
  sendError,
};