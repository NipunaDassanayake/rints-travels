const authRepository = require("../repositories/auth.repository");

const logoutAll = async (userId) => {
  await authRepository.revokeAllUserRefreshTokens(userId);
};

module.exports = {
  logoutAll,
};