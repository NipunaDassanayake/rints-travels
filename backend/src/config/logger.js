const pino = require("pino");
const env = require("./env");

const logger = pino({
  level: env.nodeEnv === "production" ? "info" : "debug",
  /*
   * Backstop for booking confirmation codes (CR-032): the code, its
   * hash and the HMAC secret are never logged on purpose; these
   * paths are censored in case one ever is. Explicit paths only, so
   * error codes such as err.code stay visible (no "*.code").
   */
  redact: {
    paths: [
      "code",
      "body.code",
      "req.body.code",
      "confirmationCode",
      "pin",
      "*.pin",
      "req.body.pin",
      "codeHash",
      "*.codeHash",
      "*.*.codeHash",
      "secret",
      "*.secret",
      "*.*.secret",
      "BOOKING_CONFIRMATION_SECRET",
      "*.BOOKING_CONFIRMATION_SECRET",
      "AUTH_REFRESH_RECOVERY_KEYS",
      "*.AUTH_REFRESH_RECOVERY_KEYS",
      "refreshRecovery",
      "*.refreshRecovery",
      "browserBindingHash",
      "*.browserBindingHash",
      "binding",
      "*.binding",
      "refreshToken",
      "*.refreshToken",
      "accessToken",
      "*.accessToken",
      "tokenHash",
      "*.tokenHash",
      "previousTokenHash",
      "*.previousTokenHash",
      "refreshRecoveryCiphertext",
      "*.refreshRecoveryCiphertext",
      "req.headers.cookie",
      "req.headers.authorization",
      "headers.cookie",
      "headers.authorization",
      'res.headers["set-cookie"]',
    ],
    censor: "[REDACTED]",
  },
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
