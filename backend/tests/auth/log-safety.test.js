const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const pino = require("pino");

test("actual logger configuration redacts auth secrets and recovery metadata", () => {
  let output = "";
  const module = { exports: {} };
  const source = fs.readFileSync(path.resolve(__dirname, "../../src/config/logger.js"), "utf8");
  const run = vm.runInNewContext(`(function(require,module){${source}\n})`);
  run((id) => {
    if (id === "./env") return { nodeEnv: "production" };
    if (id === "pino") return (options) => pino(options, { write(chunk) { output += chunk; } });
    throw new Error("Unexpected logger dependency");
  }, module);
  const sentinel = "SYNTHETIC_SENSITIVE_VALUE_DO_NOT_EMIT";
  module.exports.info({
    AUTH_REFRESH_RECOVERY_KEYS: sentinel, refreshRecovery: { keys: sentinel }, binding: sentinel,
    browserBindingHash: sentinel, refreshToken: sentinel, accessToken: sentinel,
    tokenHash: sentinel, previousTokenHash: sentinel, refreshRecoveryCiphertext: sentinel,
    req: { headers: { cookie: sentinel, authorization: sentinel } },
    res: { headers: { "set-cookie": sentinel } }, BOOKING_CONFIRMATION_SECRET: sentinel,
  }, "Auth redaction test");
  assert.ok(!output.includes(sentinel));
  assert.ok(output.includes("[REDACTED]"));
});
