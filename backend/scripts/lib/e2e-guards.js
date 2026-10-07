const path = require("path");

/**
 * =========================================================
 * E2E Script Guards
 * =========================================================
 *
 * Shared by every E2E fixture / maintenance script. These
 * scripts write (or delete) data directly through Prisma, so
 * they must never run against production or a non-local
 * database, whatever NODE_ENV says.
 */

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/**
 * Scripts are executed from the frontend directory by
 * Playwright, so always load backend/.env explicitly.
 */
function loadBackendEnv() {
  require("dotenv").config({
    path: path.resolve(__dirname, "../../.env"),
    quiet: true,
  });
}

function isLocalUrl(value) {
  try {
    return LOCAL_HOSTNAMES.has(new URL(value).hostname);
  } catch {
    return false;
  }
}

/**
 * Exits the process (before Prisma is ever loaded) unless the
 * environment is a local, non-production one.
 */
function assertSafeE2EEnvironment(scriptLabel) {
  if (process.env.NODE_ENV === "production") {
    console.error(`${scriptLabel}: disabled in production.`);

    process.exit(1);
  }

  if (!isLocalUrl(process.env.DATABASE_URL)) {
    console.error(`${scriptLabel}: only runs against a local database.`);

    process.exit(1);
  }
}

module.exports = {
  loadBackendEnv,
  isLocalUrl,
  assertSafeE2EEnvironment,
};
