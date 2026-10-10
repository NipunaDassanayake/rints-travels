const {
  verifyLocalCredentials,
  createUserSession,
} = require("../helpers/auth.helpers");

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
    ...session,
    user: session.user || user,
  };
};

module.exports = {
  login,
};
