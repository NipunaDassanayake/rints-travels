const app = require("./app");
const env = require("./config/env");
const logger = require("./config/logger");

app.listen(env.port, () => {
  logger.info(`Rints Travels API running on port ${env.port}`);
  logger.info(`Environment: ${env.nodeEnv}`);
});