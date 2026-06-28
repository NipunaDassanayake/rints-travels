const app = require("./app");
const env = require("./config/env");

app.listen(env.port, () => {
  console.log(`Rints Travels API running on port ${env.port}`);
  console.log(`Environment: ${env.nodeEnv}`);
});