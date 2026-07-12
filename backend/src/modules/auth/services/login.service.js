const {
  verifyLocalCredentials,
  createUserSession,
} = require("../auth.helpers");

const login = async (
  loginDto,
  loginContext = {}
) => {

  const user = await verifyLocalCredentials(loginDto);

  const session = await createUserSession(
    user,
    loginContext
  );

  return {
    user,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  };
};

module.exports = {
  login,
};