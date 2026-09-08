import { expect, test, type Page } from "@playwright/test";

import { execFile } from "node:child_process";

import crypto from "node:crypto";

import path from "node:path";

import { promisify } from "node:util";

/**
 * =========================================================
 * Child Process Helper
 * =========================================================
 */

const execFileAsync = promisify(execFile);

/**
 * =========================================================
 * Test Users
 * =========================================================
 */

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@travora.com";

const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "Admin12345";

const TOURIST_EMAIL = process.env.E2E_TOURIST_EMAIL ?? "nipuna@example.com";

const TOURIST_PASSWORD = process.env.E2E_TOURIST_PASSWORD ?? "Password123";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api";

/**
 * =========================================================
 * Fixture Guides
 * =========================================================
 *
 * Unique per run so parallel projects/executions never
 * collide on email or name.
 */

const uniqueSuffix = `${Date.now()}-${crypto
  .randomBytes(3)
  .toString("hex")
  .toUpperCase()}`;

const GUIDE_A_FIRST_NAME = "Playwright";

const GUIDE_A_LAST_NAME = `GuideA${uniqueSuffix}`;

const GUIDE_A_NAME = `${GUIDE_A_FIRST_NAME} ${GUIDE_A_LAST_NAME}`;

const GUIDE_A_EMAIL = `e2e-guide-a-${uniqueSuffix}@travora.com`.toLowerCase();

const GUIDE_A_PASSWORD = "GuideE2e123";

const GUIDE_B_FIRST_NAME = "Playwright";

const GUIDE_B_LAST_NAME = `GuideB${uniqueSuffix}`;

const GUIDE_B_NAME = `${GUIDE_B_FIRST_NAME} ${GUIDE_B_LAST_NAME}`;

const GUIDE_B_EMAIL = `e2e-guide-b-${uniqueSuffix}@travora.com`.toLowerCase();

const GUIDE_B_PASSWORD = "GuideE2e123";

/**
 * =========================================================
 * Fixture Type
 * =========================================================
 */

interface BookingLifecycleFixture {
  bookingId: string;

  bookingReference: string;

  status: "CONFIRMED";
}

let fixture: BookingLifecycleFixture | undefined;

let guideAId: string | undefined;

let guideBId: string | undefined;

/**
 * =========================================================
 * Helpers
 * =========================================================
 */

async function clearSession(page: Page) {
  await page.context().clearCookies();

  await page.goto("/");

  await page.evaluate(() => {
    localStorage.clear();

    sessionStorage.clear();
  });
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");

  await page.getByLabel("Email").fill(email);

  await page.getByLabel("Password").fill(password);

  await page
    .getByRole("button", {
      name: "Sign in",
    })
    .click();

  await expect(page).not.toHaveURL(/\/login/, {
    timeout: 10_000,
  });
}

async function loginAsAdmin(page: Page) {
  await clearSession(page);

  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
}

/**
 * =========================================================
 * Prepare Fresh Backend Fixture
 * =========================================================
 *
 * Reuses the same fixture script as the booking lifecycle
 * suite: a fresh CONFIRMED booking with no guide assigned.
 */

async function createBookingFixture(): Promise<BookingLifecycleFixture> {
  const scriptPath = path.resolve(
    process.cwd(),
    "../backend/scripts/prepare-booking-lifecycle-e2e.js",
  );

  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    [scriptPath],
    {
      env: {
        ...process.env,

        E2E_TOURIST_EMAIL: TOURIST_EMAIL,
      },

      timeout: 30_000,

      maxBuffer: 1024 * 1024,
    },
  );

  if (stderr.trim()) {
    console.log("E2E fixture stderr:", stderr.trim());
  }

  const fixtureLine = stdout
    .split(/\r?\n/)
    .find((line) => line.startsWith("E2E_FIXTURE_JSON="));

  if (!fixtureLine) {
    throw new Error(
      `Unable to find E2E fixture output.\n\nBackend output:\n${stdout}`,
    );
  }

  const json = fixtureLine.slice("E2E_FIXTURE_JSON=".length);

  const result = JSON.parse(json) as BookingLifecycleFixture;

  if (!result.bookingId) {
    throw new Error("E2E fixture did not return a booking ID.");
  }

  if (result.status !== "CONFIRMED") {
    throw new Error(
      `Expected fixture booking to be CONFIRMED but received ${result.status}.`,
    );
  }

  return result;
}

/**
 * =========================================================
 * Admin Guide Management
 * =========================================================
 */

test.describe("Travora admin guide management", () => {
  test.describe.configure({
    mode: "serial",
  });

  test.beforeAll(async () => {
    fixture = await createBookingFixture();

    console.log("Created E2E booking for guide management:", fixture.bookingId);
  });

  test("admin creates a guide", async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto("/admin/guides/new");

    await expect(
      page.getByRole("heading", {
        name: "Add Tour Guide",
      }),
    ).toBeVisible();

    await page.getByLabel("First name").fill(GUIDE_A_FIRST_NAME);

    await page.getByLabel("Last name").fill(GUIDE_A_LAST_NAME);

    await page.getByLabel("Email").fill(GUIDE_A_EMAIL);

    await page.getByLabel("Temporary password").fill(GUIDE_A_PASSWORD);

    await page.getByLabel("Languages").fill("English");

    await page.getByLabel("Experience").fill("3");

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/tour-guides") &&
        response.request().method() === "POST",
    );

    await page.getByRole("button", { name: "Create guide" }).click();

    const createResponse = await createResponsePromise;

    expect(createResponse.ok()).toBeTruthy();

    const body = await createResponse.json();

    guideAId = body.data.id as string;

    expect(guideAId).toBeTruthy();

    await expect(page).toHaveURL("/admin/guides");

    await expect(
      page.getByText(GUIDE_A_NAME, { exact: true }),
    ).toBeVisible();
  });

  test("admin edits a guide", async ({ page }) => {
    if (!guideAId) {
      throw new Error("Guide A was not created.");
    }

    await loginAsAdmin(page);

    await page.goto(`/admin/guides/${guideAId}/edit`);

    await expect(
      page.getByRole("heading", {
        name: `Edit ${GUIDE_A_NAME}`,
      }),
    ).toBeVisible();

    await page.getByLabel("Location").fill("Galle, Sri Lanka");

    const updateResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/tour-guides/${guideAId}`) &&
        response.request().method() === "PATCH",
    );

    await page.getByRole("button", { name: "Save changes" }).click();

    const updateResponse = await updateResponsePromise;

    expect(updateResponse.ok()).toBeTruthy();

    await expect(page).toHaveURL("/admin/guides");

    await expect(page.getByText("Galle, Sri Lanka")).toBeVisible();
  });

  test("admin creates a second guide for the eligible-deactivation scenario", async ({
    page,
  }) => {
    await loginAsAdmin(page);

    await page.goto("/admin/guides/new");

    await page.getByLabel("First name").fill(GUIDE_B_FIRST_NAME);

    await page.getByLabel("Last name").fill(GUIDE_B_LAST_NAME);

    await page.getByLabel("Email").fill(GUIDE_B_EMAIL);

    await page.getByLabel("Temporary password").fill(GUIDE_B_PASSWORD);

    await page.getByLabel("Languages").fill("English");

    await page.getByLabel("Experience").fill("1");

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/tour-guides") &&
        response.request().method() === "POST",
    );

    await page.getByRole("button", { name: "Create guide" }).click();

    const createResponse = await createResponsePromise;

    expect(createResponse.ok()).toBeTruthy();

    const body = await createResponse.json();

    guideBId = body.data.id as string;

    expect(guideBId).toBeTruthy();

    await expect(
      page.getByText(GUIDE_B_NAME, { exact: true }),
    ).toBeVisible();
  });

  test("marking a guide unavailable excludes it from public discovery but keeps the profile reachable", async ({
    page,
  }) => {
    if (!guideAId) {
      throw new Error("Guide A was not created.");
    }

    await loginAsAdmin(page);

    await page.goto("/admin/guides");

    await page.getByLabel("Search guides").fill(GUIDE_A_LAST_NAME);

    await expect(
      page.getByText(GUIDE_A_NAME, { exact: true }),
    ).toBeVisible();

    const availabilityResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/tour-guides/${guideAId}/availability`) &&
        response.request().method() === "PATCH",
    );

    await page.getByRole("button", { name: "Mark unavailable" }).click();

    await availabilityResponsePromise;

    await expect(
      page.getByText("Unavailable", { exact: true }).last(),
    ).toBeVisible();

    /**
     * Public list must exclude the now-unavailable guide.
     */

    await page.goto("/guides");

    await expect(
      page.getByText(GUIDE_A_NAME, { exact: true }),
    ).toHaveCount(0);

    /**
     * Public detail page must remain reachable by direct
     * URL: availability governs new-work eligibility, not
     * public visibility.
     */

    const detailResponse = await page.goto(`/guides/${guideAId}`);

    expect(detailResponse?.status()).toBe(200);

    await expect(
      page.getByRole("heading", {
        name: GUIDE_A_NAME,
        level: 1,
      }),
    ).toBeVisible();

    /**
     * The public projection must never expose account
     * fields, regardless of availability.
     */

    const apiResponse = await page.request.get(
      `${API_BASE_URL}/tour-guides/${guideAId}`,
    );

    expect(apiResponse.ok()).toBeTruthy();

    const apiBody = await apiResponse.json();

    expect(apiBody.data.user).not.toHaveProperty("email");

    expect(apiBody.data.user).not.toHaveProperty("phone");

    expect(apiBody.data.user).not.toHaveProperty("status");

    expect(apiBody.data.user.firstName).toBe(GUIDE_A_FIRST_NAME);

    /**
     * Restore availability so this guide is assignable
     * in the next test.
     */

    await page.goto("/admin/guides");

    await page.getByLabel("Search guides").fill(GUIDE_A_LAST_NAME);

    const restoreResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/tour-guides/${guideAId}/availability`) &&
        response.request().method() === "PATCH",
    );

    await page.getByRole("button", { name: "Mark available" }).click();

    await restoreResponsePromise;

    await expect(
      page.getByText("Available", { exact: true }).last(),
    ).toBeVisible();
  });

  test("a guide with an active booking cannot be deactivated", async ({
    page,
  }) => {
    if (!guideAId || !fixture) {
      throw new Error("Guide A or the booking fixture is missing.");
    }

    await loginAsAdmin(page);

    /**
     * Assign Guide A to the fresh CONFIRMED booking.
     */

    await page.goto(`/admin/bookings/${fixture.bookingId}`);

    const guideSelect = page.locator("#booking-guide");

    await expect(guideSelect).toBeVisible({ timeout: 10_000 });

    const guideOption = guideSelect.locator("option").filter({
      hasText: GUIDE_A_NAME,
    });

    await expect(guideOption).toHaveCount(1);

    await guideSelect.selectOption({
      value: (await guideOption.getAttribute("value")) ?? "",
    });

    const assignResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/bookings/${fixture!.bookingId}/guide`) &&
        response.request().method() === "PATCH",
    );

    await page
      .getByRole("button", { name: /assign guide|change guide/i })
      .click();

    const assignResponse = await assignResponsePromise;

    expect(assignResponse.ok()).toBeTruthy();

    await expect(
      page.getByText(GUIDE_A_NAME, { exact: true }),
    ).toBeVisible();

    /**
     * Attempt deactivation: must be blocked.
     */

    await page.goto("/admin/guides");

    await page.getByLabel("Search guides").fill(GUIDE_A_LAST_NAME);

    await page.getByRole("button", { name: "Deactivate" }).click();

    const deactivateResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/tour-guides/${guideAId}`) &&
        response.request().method() === "DELETE",
    );

    await page.getByRole("button", { name: "Deactivate guide" }).click();

    const deactivateResponse = await deactivateResponsePromise;

    expect(deactivateResponse.ok()).toBeFalsy();

    await expect(
      page.getByText(/active booking/i),
    ).toBeVisible({ timeout: 10_000 });

    /**
     * Guide must remain listed and active.
     */

    await expect(
      page.getByText(GUIDE_A_NAME, { exact: true }),
    ).toBeVisible();
  });

  test("guide completes the tour and receives a review, then can be safely deactivated with history preserved", async ({
    page,
  }) => {
    if (!guideAId || !fixture) {
      throw new Error("Guide A or the booking fixture is missing.");
    }

    const bookingId = fixture.bookingId;

    /**
     * Guide starts and completes the tour.
     */

    await clearSession(page);

    await login(page, GUIDE_A_EMAIL, GUIDE_A_PASSWORD);

    await page.goto(`/guide/bookings/${bookingId}`);

    const startResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/bookings/guide/${bookingId}/start`) &&
        response.request().method() === "PATCH",
    );

    await page.getByRole("button", { name: "Start tour" }).click();

    await startResponsePromise;

    const completeResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/bookings/guide/${bookingId}/complete`) &&
        response.request().method() === "PATCH",
    );

    await page.getByRole("button", { name: "Complete tour" }).click();

    await completeResponsePromise;

    /**
     * Tourist leaves a review.
     */

    await clearSession(page);

    await login(page, TOURIST_EMAIL, TOURIST_PASSWORD);

    await page.goto(`/tourist/bookings/${bookingId}`);

    await expect(
      page.getByText("Rate your tour guide", { exact: true }),
    ).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "Rate 5 out of 5" }).click();

    await page
      .getByLabel("Tell us about your experience")
      .fill(`Playwright admin-guide-management review ${uniqueSuffix}`);

    const reviewResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/reviews") &&
        response.request().method() === "POST",
    );

    await page.getByRole("button", { name: "Submit review" }).click();

    await reviewResponsePromise;

    await expect(
      page.getByText("Thank you for your review", { exact: true }),
    ).toBeVisible({ timeout: 10_000 });

    /**
     * Booking is now COMPLETED: deactivation is now eligible.
     */

    await loginAsAdmin(page);

    await page.goto("/admin/guides");

    await page.getByLabel("Search guides").fill(GUIDE_A_LAST_NAME);

    await page.getByRole("button", { name: "Deactivate" }).click();

    const deactivateResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/tour-guides/${guideAId}`) &&
        response.request().method() === "DELETE",
    );

    await page.getByRole("button", { name: "Deactivate guide" }).click();

    const deactivateResponse = await deactivateResponsePromise;

    expect(deactivateResponse.ok()).toBeTruthy();

    /**
     * Deactivated guide disappears from admin management
     * and public discovery.
     */

    await expect(
      page.getByText(GUIDE_A_NAME, { exact: true }),
    ).toHaveCount(0);

    await page.goto("/guides");

    await expect(
      page.getByText(GUIDE_A_NAME, { exact: true }),
    ).toHaveCount(0);

    /**
     * Checked directly against the backend (rather than via
     * page.goto) to avoid a stale Next.js data-cache hit from
     * the earlier visit to this same guide's detail page.
     */

    const deactivatedApiResponse = await page.request.get(
      `${API_BASE_URL}/tour-guides/${guideAId}`,
    );

    expect(deactivatedApiResponse.status()).toBe(404);

    /**
     * Historical booking and review data remain intact.
     */

    await page.goto(`/admin/bookings/${bookingId}`);

    await expect(
      page.getByText(GUIDE_A_NAME, { exact: true }).first(),
    ).toBeVisible();

    await expect(
      page.getByText("Completed", { exact: true }).first(),
    ).toBeVisible();

    /**
     * Deactivated guide can no longer log in.
     */

    await clearSession(page);

    await page.goto("/login");

    await page.getByLabel("Email").fill(GUIDE_A_EMAIL);

    await page.getByLabel("Password").fill(GUIDE_A_PASSWORD);

    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL("/login");

    await expect(
      page.getByText("Invalid email or password.", { exact: true }),
    ).toBeVisible();
  });

  test("an eligible guide with no bookings can be deactivated immediately", async ({
    page,
  }) => {
    if (!guideBId) {
      throw new Error("Guide B was not created.");
    }

    await loginAsAdmin(page);

    await page.goto("/admin/guides");

    await page.getByLabel("Search guides").fill(GUIDE_B_LAST_NAME);

    await page.getByRole("button", { name: "Deactivate" }).click();

    const deactivateResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/tour-guides/${guideBId}`) &&
        response.request().method() === "DELETE",
    );

    await page.getByRole("button", { name: "Deactivate guide" }).click();

    const deactivateResponse = await deactivateResponsePromise;

    expect(deactivateResponse.ok()).toBeTruthy();

    await expect(
      page.getByText(GUIDE_B_NAME, { exact: true }),
    ).toHaveCount(0);

    await page.goto("/guides");

    await expect(
      page.getByText(GUIDE_B_NAME, { exact: true }),
    ).toHaveCount(0);

    await clearSession(page);

    await page.goto("/login");

    await page.getByLabel("Email").fill(GUIDE_B_EMAIL);

    await page.getByLabel("Password").fill(GUIDE_B_PASSWORD);

    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL("/login");

    await expect(
      page.getByText("Invalid email or password.", { exact: true }),
    ).toBeVisible();
  });

  test("unauthorized roles cannot access admin guide management", async ({
    page,
  }) => {
    await clearSession(page);

    await login(page, TOURIST_EMAIL, TOURIST_PASSWORD);

    await page.goto("/admin/guides");

    await expect(page).toHaveURL("/tourist");
  });
});
