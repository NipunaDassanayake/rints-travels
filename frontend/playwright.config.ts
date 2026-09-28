import { defineConfig, devices } from "@playwright/test";

/**
 * =========================================================
 * Server Ownership (CR-018)
 * =========================================================
 *
 * By default Playwright starts AND stops both servers itself,
 * so every run uses fresh servers and nothing is left behind.
 * A stale or orphaned server on either port makes the run fail
 * immediately with Playwright's "is already used" error rather
 * than silently reusing it.
 *
 * To run against servers you started yourself, opt in with
 * E2E_REUSE_SERVERS=true.
 */
const reuseExistingServer = process.env.E2E_REUSE_SERVERS === "true";

export default defineConfig({
  testDir: "./tests/e2e",

  /**
   * All specs share the same seeded accounts, so tests must not
   * run concurrently.
   */
  fullyParallel: false,

  workers: 1,

  forbidOnly: !!process.env.CI,

  /**
   * No retries anywhere, including CI: a retry would turn a real
   * failure into a hidden "flaky" pass.
   */
  retries: 0,

  reporter: [["list"], ["html", { open: "never" }]],

  /**
   * Environment preflight, E2E test-data cleanup and server
   * warm-up (runs after the web servers are up).
   */
  globalSetup: "./tests/e2e/support/global-setup.ts",

  use: {
    baseURL: "http://localhost:3000",

    // With zero retries, "on-first-retry" would never record a trace.
    trace: "retain-on-failure",

    screenshot: "only-on-failure",

    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },

    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 5"],
      },
    },
  ],

  webServer: [
    {
      command: "npm run start",
      cwd: "../backend",
      url: "http://localhost:5000/api/health",
      reuseExistingServer,
      timeout: 60_000,
    },

    {
      command: "npm run dev",
      url: "http://localhost:3000",
      reuseExistingServer,
      timeout: 120_000,
    },
  ],
});
