import { expect, test, type TestInfo } from "@playwright/test";

import {
  createFixtureGuide,
  createFixtureTourist,
  type FixtureGuide,
  type FixtureTourist,
} from "./support/fixture-identities";

import { api, apiLogin } from "./support/tour-confirmation";

import { execFile } from "node:child_process";

import path from "node:path";

import { promisify } from "node:util";

/**
 * =========================================================
 * CR-018 E2E Reliability
 * =========================================================
 *
 * A. Auth forms: server-rendered HTML is disabled until React
 *    hydrates (typed input used to be wiped by react-hook-form)
 *    and the forms POST, so credentials can never reach a URL.
 * B. Test-data cleanup is identity-scoped and aborts instead of
 *    touching data outside its scope.
 * C. Guide booking windows never collide with active bookings.
 */

const execFileAsync = promisify(execFile);

/**
 * Throwaway tourist created per run (CR-032 Stage 3A) -- never a real
 * account. The standard E2E cleanup deletes it and everything it owns.
 */
let e2eTourist: FixtureTourist;

test.beforeAll(async () => {
  e2eTourist = await createFixtureTourist("reliability");
});

const BACKEND_SCRIPTS = path.resolve(process.cwd(), "../backend/scripts");

interface ScriptResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

async function runScript(
  script: string,
  args: string[] = [],
  extraEnv: Record<string, string> = {},
): Promise<ScriptResult> {
  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [path.join(BACKEND_SCRIPTS, script), ...args],
      {
        env: {
          ...process.env,
          ...extraEnv,
        },
        timeout: 180_000,
        maxBuffer: 16 * 1024 * 1024,
      },
    );

    return {
      exitCode: 0,
      stdout,
      stderr,
    };
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string };

    return {
      exitCode: typeof failure.code === "number" ? failure.code : 1,
      stdout: failure.stdout ?? "",
      stderr: failure.stderr ?? "",
    };
  }
}

function parseMarker<T>(result: ScriptResult, marker: string): T {
  const line = result.stdout
    .split(/\r?\n/)
    .find((candidate) => candidate.startsWith(`${marker}=`));

  if (!line) {
    throw new Error(
      `No ${marker} output.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
  }

  return JSON.parse(line.slice(marker.length + 1)) as T;
}

async function helper<T>(scenario: string, ...args: string[]): Promise<T> {
  const result = await runScript("e2e-reliability-helpers.js", [scenario, ...args]);

  expect(result.exitCode, result.stderr).toBe(0);

  return parseMarker<T>(result, "E2E_FIXTURE_JSON");
}

interface UserStatus {
  id: string;
  exists: boolean;
  tourRequests: number;
}

function skipOutsideChromium(testInfo: TestInfo) {
  test.skip(
    testInfo.project.name !== "chromium",
    "Script-level reliability checks run once, in the chromium project.",
  );
}

/**
 * =========================================================
 * A. Hydration-Safe Auth Forms
 * =========================================================
 */

test.describe("CR-018 hydration-safe auth forms", () => {
  for (const formPath of ["/login", "/register"]) {
    test(`${formPath} is disabled in server HTML and never submits with GET`, async ({
      page,
    }) => {
      const html = await (await page.request.get(formPath)).text();

      expect(html).toMatch(/<form[^>]*method="post"/);

      expect(html).toMatch(/<fieldset[^>]*disabled=""/);
    });
  }

  test("login input typed during hydration is kept and login succeeds", async ({
    page,
  }) => {
    await page.context().clearCookies();

    // Do NOT wait for the page to settle: fill as early as possible.
    await page.goto("/login", {
      waitUntil: "commit",
    });

    await page.getByLabel("Email").fill(e2eTourist.email);

    await page.getByLabel("Password").fill(e2eTourist.password);

    // Hydration has certainly finished by now; values must survive it.
    await page.waitForLoadState("networkidle");

    await expect(page.getByLabel("Email")).toHaveValue(e2eTourist.email);

    await expect(page.getByLabel("Password")).toHaveValue(e2eTourist.password);

    await page
      .getByRole("button", {
        name: "Sign in",
      })
      .click();

    await expect(page).not.toHaveURL(/\/login/, {
      timeout: 10_000,
    });

    expect(page.url()).not.toContain("password");

    expect(page.url()).not.toContain(encodeURIComponent(e2eTourist.email));
  });

  test("register input typed during hydration is kept", async ({ page }) => {
    await page.context().clearCookies();

    await page.goto("/register", {
      waitUntil: "commit",
    });

    await page.getByLabel("First name").fill("Hydration");

    await page.getByLabel("Email").fill("hydration-check@example.org");

    await page.waitForLoadState("networkidle");

    await expect(page.getByLabel("First name")).toHaveValue("Hydration");

    await expect(page.getByLabel("Email")).toHaveValue("hydration-check@example.org");

    expect(page.url()).not.toContain("hydration-check");
  });
});

/**
 * =========================================================
 * B. Identity-Scoped Test-Data Cleanup
 * =========================================================
 *
 * These run the REAL cleanup script (the same one global setup
 * runs before every suite).
 */

test.describe("CR-018 test-data cleanup", () => {
  test.beforeEach(({}, testInfo) => {
    skipOutsideChromium(testInfo);
  });

  test("cleanup removes suite-created data and never touches other accounts", async () => {
    const sentinel = await helper<{ userIds: string[] }>("create-sentinel");

    const probe = await helper<{ userIds: string[] }>("create-in-scope-probe");

    try {
      const cleanup = await runScript("cleanup-e2e-data.js", ["--json"]);

      expect(cleanup.exitCode, cleanup.stderr).toBe(0);

      const [sentinelStatus] = await helper<UserStatus[]>(
        "status",
        ...sentinel.userIds,
      );

      const [probeStatus] = await helper<UserStatus[]>("status", ...probe.userIds);

      // Outside every cleanup pattern: untouched.
      expect(sentinelStatus).toMatchObject({
        exists: true,
        tourRequests: 1,
      });

      // e2e-*@travora.com: removed with its data.
      expect(probeStatus).toMatchObject({
        exists: false,
        tourRequests: 0,
      });
    } finally {
      // The sentinel is outside the cleanup scope, so the test must
      // remove it. The probe is in scope: the cleanup above deleted
      // it (and `remove` rejects unknown ids), or, if the cleanup
      // failed, the next regular cleanup will.
      await helper("remove", ...sentinel.userIds);
    }
  });

  test("cleanup aborts and deletes nothing when scoped data is linked outside the scope", async () => {
    const link = await helper<{ userIds: string[] }>("create-foreign-link");

    const probe = await helper<{ userIds: string[] }>("create-in-scope-probe");

    try {
      const cleanup = await runScript("cleanup-e2e-data.js", ["--json"]);

      expect(cleanup.exitCode).not.toBe(0);

      expect(cleanup.stderr).toContain("nothing was deleted");

      const statuses = await helper<UserStatus[]>(
        "status",
        ...link.userIds,
        ...probe.userIds,
      );

      // The whole transaction was refused: even the in-scope probe survives.
      for (const userStatus of statuses) {
        expect(userStatus.exists).toBe(true);
      }
    } finally {
      await helper("remove", ...link.userIds, ...probe.userIds);
    }
  });

  test("cleanup refuses to run when E2E_TOURIST_EMAIL names a non-allow-listed account", async () => {
    // A real-looking tourist outside every cleanup pattern, with data.
    const sentinel = await helper<{ userIds: string[]; email: string }>(
      "create-sentinel",
    );

    const probe = await helper<{ userIds: string[] }>("create-in-scope-probe");

    try {
      // Misconfiguration: point the E2E tourist at the real account.
      const cleanup = await runScript("cleanup-e2e-data.js", ["--json"], {
        E2E_TOURIST_EMAIL: sentinel.email,
      });

      expect(cleanup.exitCode).not.toBe(0);

      expect(cleanup.stderr).toContain("not in the E2E cleanup allow-list");

      const [sentinelStatus, probeStatus] = await helper<UserStatus[]>(
        "status",
        ...sentinel.userIds,
        ...probe.userIds,
      );

      // Nothing deleted: not the real account's data, not even in-scope data.
      expect(sentinelStatus).toMatchObject({
        exists: true,
        tourRequests: 1,
      });

      expect(probeStatus).toMatchObject({
        exists: true,
        tourRequests: 1,
      });
    } finally {
      await helper("remove", ...sentinel.userIds, ...probe.userIds);
    }
  });

  test("the helper remove command refuses accounts it did not create", async () => {
    // In the regular cleanup scope, but not a helper-created account.
    const target = await helper<{ userIds: string[] }>("create-remove-guard-target");

    const sentinel = await helper<{ userIds: string[] }>("create-sentinel");

    const refused = await runScript("e2e-reliability-helpers.js", [
      "remove",
      ...target.userIds,
      ...sentinel.userIds,
    ]);

    expect(refused.exitCode).not.toBe(0);

    expect(refused.stderr).toContain("remove refused");

    const statuses = await helper<UserStatus[]>(
      "status",
      ...target.userIds,
      ...sentinel.userIds,
    );

    // Atomic refusal: even the removable sentinel was kept.
    for (const userStatus of statuses) {
      expect(userStatus).toMatchObject({
        exists: true,
        tourRequests: 1,
      });
    }

    // Unknown ids are refused too.
    const unknown = await runScript("e2e-reliability-helpers.js", [
      "remove",
      "00000000-0000-4000-8000-000000000000",
    ]);

    expect(unknown.exitCode).not.toBe(0);

    // Clean up: the sentinel via the helper; the target is a normal
    // e2e-*@travora.com account removed by the regular cleanup.
    await helper("remove", ...sentinel.userIds);

    const cleanup = await runScript("cleanup-e2e-data.js", ["--json"]);

    expect(cleanup.exitCode, cleanup.stderr).toBe(0);

    const [targetAfterCleanup] = await helper<UserStatus[]>(
      "status",
      ...target.userIds,
    );

    expect(targetAfterCleanup.exists).toBe(false);
  });
});

/**
 * =========================================================
 * C. Guide Booking-Window Allocation
 * =========================================================
 */

test.describe("CR-018 guide booking windows", () => {
  /**
   * A throwaway fixture tourist and guide (CR-032 Stage 3A) instead of
   * the shared accounts, created here because the cleanup tests above
   * delete every earlier E2E account. The guide is given two active
   * bookings first, so the allocation check always has real bookings
   * to steer around.
   */
  let windowTourist: FixtureTourist;

  let windowGuide: FixtureGuide;

  const fixtureEnv = () => ({
    E2E_TOURIST_EMAIL: windowTourist.email,

    E2E_GUIDE_EMAIL: windowGuide.email,
  });

  test.beforeAll(async ({}, testInfo) => {
    if (testInfo.project.name !== "chromium") {
      return;
    }

    windowTourist = await createFixtureTourist("windows");

    windowGuide = await createFixtureGuide("windows");

    const adminToken = await apiLogin(
      process.env.E2E_ADMIN_EMAIL ?? "admin@travora.com",
      process.env.E2E_ADMIN_PASSWORD ?? "Admin12345",
    );

    for (let index = 0; index < 2; index += 1) {
      const result = await runScript("prepare-booking-lifecycle-e2e.js", [], fixtureEnv());

      expect(result.exitCode, result.stderr).toBe(0);

      const { bookingId } = parseMarker<{ bookingId: string }>(result, "E2E_FIXTURE_JSON");

      const assigned = await api("PATCH", `/bookings/${bookingId}/guide`, {
        token: adminToken,
        body: { guideId: windowGuide.id },
      });

      expect(assigned.status, JSON.stringify(assigned.body)).toBe(200);
    }
  });

  test.beforeEach(({}, testInfo) => {
    skipOutsideChromium(testInfo);
  });

  test("allocated windows never conflict with the guide's active bookings", async () => {
    const run = await runScript("e2e-reliability-helpers.js", ["allocation-check"], fixtureEnv());

    expect(run.exitCode, run.stderr).toBe(0);

    const result = parseMarker<{
      activeBookings: number;
      startDate: string;
      endDate: string;
      conflictFound: boolean;
    }>(run, "E2E_FIXTURE_JSON");

    expect(result.activeBookings).toBeGreaterThanOrEqual(2);

    expect(result.conflictFound).toBe(false);

    expect(new Date(result.endDate).getTime()).toBeGreaterThan(
      new Date(result.startDate).getTime(),
    );
  });

  test("consecutive fixtures awaiting guide assignment get non-overlapping windows", async () => {
    // Regression: a spec's setup creates several bookings before
    // assigning the shared guide to any of them. Each must get
    // its own window, or the second assignment collides.
    const fixtures = [];

    for (let index = 0; index < 2; index += 1) {
      const result = await runScript("prepare-booking-lifecycle-e2e.js", [], fixtureEnv());

      expect(result.exitCode, result.stderr).toBe(0);

      fixtures.push(
        parseMarker<{ startDate: string; endDate: string }>(
          result,
          "E2E_FIXTURE_JSON",
        ),
      );
    }

    const [first, second] = fixtures.map((fixture) => ({
      start: new Date(fixture.startDate).getTime(),
      end: new Date(fixture.endDate).getTime(),
    }));

    // Same inclusive rule as the backend guide-conflict check.
    const overlaps = first.start <= second.end && first.end >= second.start;

    expect(overlaps).toBe(false);
  });
});
