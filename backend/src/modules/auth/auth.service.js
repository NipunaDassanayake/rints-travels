const { register } = require("./services/register.service");
const { login } = require("./services/login.service");
const { refresh } = require("./services/refresh.service");

module.exports = {
  register,
  login,
  refresh,
};