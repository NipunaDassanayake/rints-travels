import { execFileSync } from "node:child_process";

import path from "node:path";

/**
 * =========================================================
 * Playwright Global Setup (CR-018)
 * =========================================================
 *
 * Runs once per test run, after the web servers are up:
 *
 * 1. Environment preflight -- fail fast with one clear message
 *    if the seeded E2E accounts or Stripe test configuration
 *    are missing.
 * 2. E2E test-data cleanup (identity-scoped; see
 *    backend/scripts/cleanup-e2e-data.js). Skip with
 *    E2E_SKIP_CLEANUP=true.
 * 3. Warm-up -- request the main entry pages once so first-time
 *    dev compilation does not eat into test timeouts.
 */

const BACKEND_SCRIPTS = path.resolve(process.cwd(), "../backend/scripts");

const FRONTEND_URL = "http://localhost:3000";

const WARM_UP_PATHS = [
  "/login",
  "/register",
  "/packages",
  "/tourist",
  "/admin",
  "/guide",
];

function runBackendScript(script: string, args: string[], marker: string) {
  let stdout: string;

  try {
    stdout = execFileSync(
      process.execPath,
      [path.join(BACKEND_SCRIPTS, script), ...args],
      {
        encoding: "utf8",
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 180_000,
        maxBuffer: 16 * 1024 * 1024,
      },
    );
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string };

    throw new Error(
      `E2E global setup: ${script} failed.\n${failure.stdout ?? ""}\n${failure.stderr ?? ""}`,
    );
  }

  const line = stdout
    .split(/\r?\n/)
    .find((candidate) => candidate.startsWith(`${marker}=`));

  if (!line) {
    throw new Error(`E2E global setup: ${script} produced no ${marker} output.`);
  }

  return JSON.parse(line.slice(marker.length + 1));
}

async function warmUp(pagePath: string) {
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${FRONTEND_URL}${pagePath}`);

      if (response.status < 500) {
        return;
      }
    } catch {
      // Server still compiling -- retry below.
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(`E2E global setup: ${pagePath} did not respond during warm-up.`);
}

export default async function globalSetup() {
  const preflight = runBackendScript(
    "check-e2e-environment.js",
    [],
    "E2E_PREFLIGHT_JSON",
  );

  if (!preflight.ok) {
    throw new Error(
      `E2E environment preflight failed:\n- ${preflight.problems.join("\n- ")}`,
    );
  }

  if (process.env.E2E_SKIP_CLEANUP === "true") {
    console.log("E2E cleanup skipped (E2E_SKIP_CLEANUP=true).");
  } else {
    const cleanup = runBackendScript(
      "cleanup-e2e-data.js",
      ["--json"],
      "E2E_CLEANUP_JSON",
    );

    console.log("E2E cleanup:", JSON.stringify(cleanup));
  }

  for (const pagePath of WARM_UP_PATHS) {
    await warmUp(pagePath);
  }
}
