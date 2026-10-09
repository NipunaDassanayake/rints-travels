const { AppError } = require("../../../utils/AppError");

// Never attach input, crypto errors, cookies, keys, or a cause to these errors.
const authFailure = (code, statusCode = 401) => {
  const error = new AppError(code, statusCode, { code });
  error.code = code;
  return error;
};

const recoveryUnavailable = () => authFailure("AUTH_RECOVERY_UNAVAILABLE", 503);
const invalidCredential = () => authFailure("AUTH_SESSION_INVALID");
const invalidSessionState = () => authFailure("AUTH_SESSION_STATE_INVALID", 503);

module.exports = { authFailure, recoveryUnavailable, invalidCredential, invalidSessionState };
