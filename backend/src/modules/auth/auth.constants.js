const AUTH_COOKIE_PATH = "/api/auth";

const AUTH_MESSAGES = {
  REGISTER_SUCCESS: "Registration completed successfully",
  LOGIN_SUCCESS: "Login successful",
  LOGOUT_SUCCESS: "Logout successful",
  TOKEN_REFRESH_SUCCESS: "Access token refreshed successfully",
  INVALID_CREDENTIALS: "Invalid email or password",
  EMAIL_ALREADY_EXISTS: "An account with this email already exists",
  INVALID_REFRESH_TOKEN: "Invalid or expired refresh token",
  ACCOUNT_NOT_ACTIVE: "This account is not active",
};

module.exports = {
  AUTH_COOKIE_PATH,
  AUTH_MESSAGES,
};