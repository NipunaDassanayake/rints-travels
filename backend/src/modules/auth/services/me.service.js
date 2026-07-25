const authRepository = require("../repositories/auth.repository");

const getCurrentUser = async (userId) => {
  return authRepository.findUserById(userId);
};

module.exports = {
  getCurrentUser,
};