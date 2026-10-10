const env = require("../config/env");
const { createTrustedAuthOrigin } = require("./trustedAuthOrigin");

module.exports = createTrustedAuthOrigin({ frontendUrl: env.frontend.url, nodeEnv: env.nodeEnv });
