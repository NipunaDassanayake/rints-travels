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

/**
 * Throwaway E2E accounts (CR-032 Stage 3A): the e2e-*@travora.com
 * pattern that the standard cleanup deletes together with all of
 * their data. Fixture scripts only ever write data for such
 * accounts -- never for a real or manually used account.
 */
function isThrowawayE2EEmail(email) {
  return (
    typeof email === "string" &&
    /^e2e-[a-z0-9.-]+@travora\.com$/.test(email.trim().toLowerCase())
  );
}

/**
 * Reads a fixture account email (E2E_TOURIST_EMAIL /
 * E2E_GUIDE_EMAIL) from the environment. There is no default: a
 * missing or non-throwaway value exits before any query runs,
 * so a fixture can never fall back to a real account.
 */
function requireFixtureAccountEmail(variable, scriptLabel) {
  const email = (process.env[variable] ?? "").trim().toLowerCase();

  if (!email) {
    console.error(
      `${scriptLabel}: ${variable} is required (a throwaway e2e-*@travora.com account).`,
    );

    process.exit(1);
  }

  if (!isThrowawayE2EEmail(email)) {
    console.error(
      `${scriptLabel}: ${variable} must name a throwaway e2e-*@travora.com account; refusing to use any other account.`,
    );

    process.exit(1);
  }

  return email;
}

module.exports = {
  loadBackendEnv,
  isLocalUrl,
  assertSafeE2EEnvironment,
  isThrowawayE2EEmail,
  requireFixtureAccountEmail,
};
