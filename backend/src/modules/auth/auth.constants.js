const AUTH_COOKIE_PATH = "/api/auth";

const AUTH_MESSAGES = {
  REGISTER_SUCCESS: "Registration completed successfully",
  LOGIN_SUCCESS: "Login successful",
  LOGOUT_SUCCESS: "Logout successful",
  TOKEN_REFRESH_SUCCESS: "Access token refreshed successfully",

  INVALID_CREDENTIALS: "Invalid email or password",
  EMAIL_ALREADY_EXISTS: "An account with this email already exists",
  ACCOUNT_NOT_ACTIVE: "This account is not active",
  REFRESH_TOKEN_REQUIRED: "Refresh token is required",
  INVALID_REFRESH_TOKEN: "Invalid or expired refresh token",

  ACCESS_TOKEN_REQUIRED: "Access token is required",
  INVALID_ACCESS_TOKEN: "Invalid or expired access token",

  FORBIDDEN: "You do not have permission to perform this action",
  NOT_AUTHENTICATED: "Authentication required",
};

module.exports = {
  AUTH_COOKIE_PATH,
  AUTH_MESSAGES,
};
