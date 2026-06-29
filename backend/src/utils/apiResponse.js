const buildMeta = (extraMeta = {}) => {
  return {
    timestamp: new Date().toISOString(),
    ...extraMeta,
  };
};

const sendSuccess = (res, message, data = null, statusCode = 200, meta = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    errors: null,
    meta: buildMeta(meta),
  });
};

const sendError = (res, message, errors = null, statusCode = 500, meta = {}) => {
  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
    errors,
    meta: buildMeta(meta),
  });
};

module.exports = {
  sendSuccess,
  sendError,
};