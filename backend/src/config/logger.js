const pino = require("pino");
const env = require("./env");

const logger = pino({
  level: env.nodeEnv === "production" ? "info" : "debug",
  transport:
    env.nodeEnv !== "production"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        }
      : undefined,
});

module.exports = logger;