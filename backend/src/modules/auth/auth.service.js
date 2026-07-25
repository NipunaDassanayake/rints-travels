const { register } = require("./services/register.service");
const { login } = require("./services/login.service");
const { refresh } = require("./services/refresh.service");
const { logout } = require("./services/logout.service");
const { getCurrentUser } = require("./services/me.service");
const { logoutAll } = require("./services/logoutAll.service");

module.exports = {
  register,
  login,
  refresh,
  logout,
  getCurrentUser,
  logoutAll,
};
