const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const os = require("node:os");

const envPath = path.resolve(__dirname, "../../src/config/env.js");
const syntheticEnv = {
  PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: os.tmpdir(),
  NODE_ENV: "test", DOTENV_CONFIG_QUIET: "true", DATABASE_URL: "postgresql://test:test@127.0.0.1:1/unreachable",
  JWT_ACCESS_SECRET: "synthetic-access-key-00000000000000000", JWT_REFRESH_SECRET: "synthetic-refresh-key-0000000000000000",
  BOOKING_CONFIRMATION_SECRET: "synthetic-booking-key-0000000000000000", FRONTEND_URL: "http://localhost:3000",
  STRIPE_SECRET_KEY: "sk_test_synthetic", AUTH_BOUND_SESSIONS_ENABLED: "false",
  AUTH_REFRESH_RECOVERY_KEYS: JSON.stringify({ "startup-test": Buffer.alloc(32, 83).toString("base64") }),
  AUTH_REFRESH_RECOVERY_ACTIVE_KEY_ID: "startup-test",
};
const runEnv = (extra) => spawnSync(process.execPath, ["-e",
  `try { require(${JSON.stringify(envPath)}); console.log('STARTUP_OK'); } catch(e) { console.log(e.message); process.exitCode=1; }`],
{ env: { ...syntheticEnv, ...extra }, cwd: os.tmpdir(), encoding: "utf8", timeout: 10_000 });

test("startup supports issuance-disabled deployment with valid recovery keys", () => {
  const result = runEnv({});
  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes("STARTUP_OK"));
});
test("startup rejects invalid key configuration without exposing supplied material", () => {
  const sentinel = "DO_NOT_PRINT_SYNTHETIC_KEY_MATERIAL";
  const result = runEnv({ AUTH_REFRESH_RECOVERY_KEYS: sentinel, AUTH_REFRESH_RECOVERY_ACTIVE_KEY_ID: "a" });
  assert.equal(result.status, 1);
  assert.ok(result.stdout.includes("AUTH_RECOVERY_CONFIG_INVALID"));
  assert.ok(!(result.stdout + result.stderr).includes(sentinel));
});
test("startup requires recovery keys even with issuance disabled or defaulted", () => {
  for (const issuance of [undefined, "false", "true"]) {
    const result = runEnv({ AUTH_BOUND_SESSIONS_ENABLED: issuance,
      AUTH_REFRESH_RECOVERY_KEYS: undefined, AUTH_REFRESH_RECOVERY_ACTIVE_KEY_ID: undefined });
    assert.equal(result.status, 1);
    assert.equal(result.stdout.trim(), "AUTH_RECOVERY_CONFIG_INVALID");
  }
});
test("existing production/local cookie startup and proxy guards remain unchanged", () => {
  for (const sameSite of ["strict", "none"]) {
    assert.equal(runEnv({ NODE_ENV: "production", COOKIE_SECURE: "true", COOKIE_SAME_SITE: sameSite }).status, 0);
  }
  assert.equal(runEnv({ NODE_ENV: "production", COOKIE_SECURE: "false" }).status, 1);
  assert.equal(runEnv({ COOKIE_SECURE: "false", COOKIE_SAME_SITE: "none" }).status, 1);
  assert.equal(runEnv({ COOKIE_SECURE: "false", COOKIE_SAME_SITE: "lax" }).status, 0);
  for (const proxy of ["", "false", "1", "10", "loopback", "loopback, 10.0.0.0/8, 2001:db8::/32, 192.0.2.1"]) {
    assert.equal(runEnv({ TRUST_PROXY: proxy }).status, 0);
  }
  for (const proxy of ["true", "*", "0", "11", "0.0.0.0/0", "::/0"]) {
    assert.equal(runEnv({ TRUST_PROXY: proxy }).status, 1);
  }
});

test("actual backend loads, starts on an ephemeral port and rejects invalid refresh without DB access", () => {
  const appPath = path.resolve(__dirname, "../../src/app.js");
  const child = `
    const app = require(${JSON.stringify(appPath)});
    const server = app.listen(0, '127.0.0.1', async () => {
      try {
        const root = 'http://127.0.0.1:' + server.address().port;
        const health = await fetch(root + '/api/health');
        const missing = await fetch(root + '/api/auth/refresh', {method:'POST'});
        const invalid = await fetch(root + '/api/auth/refresh', {method:'POST', headers:{Cookie:'travora_refresh_token=synthetic-invalid'}});
        if (health.status !== 200 || missing.status !== 401 || invalid.status !== 401) throw new Error('SMOKE_FAILED');
        if (missing.headers.has('set-cookie') || invalid.headers.has('set-cookie')) throw new Error('SMOKE_FAILED');
        console.log('SMOKE_OK');
      } catch { console.log('SMOKE_FAILED'); process.exitCode=1; }
      finally { server.close(); server.closeAllConnections(); }
    });
  `;
  const result = spawnSync(process.execPath, ["-e", child], {
    cwd: os.tmpdir(), env: { ...syntheticEnv, NODE_ENV: "production", COOKIE_SECURE: "true", FRONTEND_URL: "https://travora.example" },
    encoding: "utf8", timeout: 15_000,
  });
  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes("SMOKE_OK"));
  assert.ok(!(result.stdout + result.stderr).includes("synthetic-invalid"));
});
