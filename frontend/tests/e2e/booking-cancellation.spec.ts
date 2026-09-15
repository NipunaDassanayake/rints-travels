import { expect, test, type Page } from "@playwright/test";

import { execFile } from "node:child_process";

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

const TOURIST_EMAIL = process.env.E2E_TOURIST_EMAIL ?? "nipuna@example.com";

const TOURIST_PASSWORD = process.env.E2E_TOURIST_PASSWORD ?? "Password123";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@travora.com";

const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "Admin12345";

const GUIDE_EMAIL = process.env.E2E_GUIDE_EMAIL ?? "nimal.guide@travora.com";

const GUIDE_PASSWORD = process.env.E2E_GUIDE_PASSWORD ?? "Guide12345";

const GUIDE_NAME = process.env.E2E_GUIDE_NAME ?? "Nimal Perera";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api";

/**
 * =========================================================
 * Fixture Types
 * =========================================================
 */

interface BookingFixture {
  bookingId: string;

  bookingReference: string;

  touristEmail: string;

  status: "CONFIRMED";
}

interface ConflictFixture {
  bookingAId: string;

  bookingAReference: string;

  bookingBId: string;

  bookingBReference: string;

  guideId: string;

  guideName: string;
}

let confirmedFixture: BookingFixture | undefined;

let completedFixture: BookingFixture | undefined;

let rolesFixture: BookingFixture | undefined;

let conflictFixture: ConflictFixture | undefined;

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
 * Captures the Bearer Authorization header the app attaches
 * to an authenticated API request.
 *
 * Travora stores the access token in-memory only (no cookie,
 * no localStorage) -- see frontend/src/lib/auth/tokenStore.ts
 * -- so a direct `page.request` call to a protected endpoint
 * needs this header rather than relying on shared session
 * cookies.
 */
async function captureAuthorizationHeader(
  page: Page,
  visitPath: string,
  urlIncludes: string,
) {
  const requestPromise = page.waitForRequest(
    (request) =>
      request.url().includes(urlIncludes) &&
      Boolean(request.headers()["authorization"]),
    {
      timeout: 10_000,
    },
  );

  await page.goto(visitPath);

  const request = await requestPromise;

  const header = request.headers()["authorization"];

  if (!header) {
    throw new Error(
      `Unable to capture an Authorization header while visiting ${visitPath}.`,
    );
  }

  return header;
}

/**
 * =========================================================
 * Prepare Fresh Backend Fixtures
 * =========================================================
 *
 * Playwright is normally executed from:
 *
 * rints-travels/frontend
 *
 * Therefore backend is one directory above.
 */

async function createBookingFixture(): Promise<BookingFixture> {
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

  const result = JSON.parse(json) as BookingFixture;

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

async function createConflictFixture(): Promise<ConflictFixture> {
  const scriptPath = path.resolve(
    process.cwd(),
    "../backend/scripts/prepare-booking-cancellation-conflict-e2e.js",
  );

  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    [scriptPath],
    {
      env: {
        ...process.env,

        E2E_TOURIST_EMAIL: TOURIST_EMAIL,

        E2E_GUIDE_EMAIL: GUIDE_EMAIL,
      },

      timeout: 30_000,

      maxBuffer: 1024 * 1024,
    },
  );

  if (stderr.trim()) {
    console.log("E2E conflict fixture stderr:", stderr.trim());
  }

  const fixtureLine = stdout
    .split(/\r?\n/)
    .find((line) => line.startsWith("E2E_FIXTURE_JSON="));

  if (!fixtureLine) {
    throw new Error(
      `Unable to find E2E conflict fixture output.\n\nBackend output:\n${stdout}`,
    );
  }

  const json = fixtureLine.slice("E2E_FIXTURE_JSON=".length);

  const result = JSON.parse(json) as ConflictFixture;

  if (!result.bookingAId || !result.bookingBId) {
    throw new Error("E2E conflict fixture did not return both booking IDs.");
  }

  return result;
}

/**
 * =========================================================
 * Booking Cancellation
 * =========================================================
 */

test.describe("Travora booking cancellation", () => {
  test.describe.configure({
    mode: "serial",
  });

  test.beforeAll(async () => {
    confirmedFixture = await createBookingFixture();

    completedFixture = await createBookingFixture();

    rolesFixture = await createBookingFixture();

    conflictFixture = await createConflictFixture();

    console.log("Created cancellation fixtures:", {
      confirmed: confirmedFixture.bookingId,
      completed: completedFixture.bookingId,
      roles: rolesFixture.bookingId,
      conflictA: conflictFixture.bookingAId,
      conflictB: conflictFixture.bookingBId,
    });
  });

  test("admin cancels an eligible booking through the confirmation dialog", async ({
    page,
  }) => {
    if (!confirmedFixture) {
      throw new Error("Confirmed booking fixture was not created.");
    }

    const { bookingId, bookingReference, touristEmail } = confirmedFixture;

    await loginAsAdmin(page);

    await page.goto(`/admin/bookings/${bookingId}`);

    await expect(page).toHaveURL(`/admin/bookings/${bookingId}`);

    await expect(
      page.getByText(bookingReference, { exact: true }),
    ).toBeVisible();

    const cancelTrigger = page.getByRole("button", {
      name: "Cancel booking",
    });

    await expect(cancelTrigger).toBeVisible();

    /**
     * Dismissing the confirmation dialog must NOT cancel
     * the booking -- confirmation is explicit and required.
     */

    await cancelTrigger.click();

    await expect(
      page.getByText("Cancel this booking?", { exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Keep booking" }).click();

    await expect(
      page.getByText("Cancel this booking?", { exact: true }),
    ).toHaveCount(0);

    await expect(
      page.getByText("Confirmed", { exact: true }).first(),
    ).toBeVisible();

    /**
     * Confirm cancellation.
     */

    await cancelTrigger.click();

    const cancelResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/bookings/${bookingId}/status`) &&
        response.request().method() === "PATCH",
    );

    await page.getByRole("button", { name: "Yes, cancel booking" }).click();

    const cancelResponse = await cancelResponsePromise;

    expect(cancelResponse.ok()).toBeTruthy();

    await expect(
      page.getByText("Cancelled", { exact: true }).first(),
    ).toBeVisible({
      timeout: 10_000,
    });

    await expect(
      page.getByText("Booking cancelled successfully.", { exact: true }),
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: "Cancel booking" }),
    ).toHaveCount(0);

    await expect(
      page.getByText(
        "This booking has been cancelled. No further status changes are available.",
      ),
    ).toBeVisible();

    /**
     * Cancellation must not imply a refund: the underlying
     * payment stays SUCCESS.
     */

    await expect(page.getByText("Success", { exact: true })).toBeVisible();

    /**
     * Historical relationships (tourist, quotation, payment)
     * remain intact and visible.
     */

    await expect(
      page.getByText(touristEmail, { exact: true }),
    ).toBeVisible();
  });

  test("an already cancelled booking cannot be cancelled again", async ({
    page,
  }) => {
    if (!confirmedFixture) {
      throw new Error("Confirmed booking fixture was not created.");
    }

    const bookingId = confirmedFixture.bookingId;

    await loginAsAdmin(page);

    await page.goto(`/admin/bookings/${bookingId}`);

    await expect(
      page.getByRole("button", { name: "Cancel booking" }),
    ).toHaveCount(0);

    const authHeader = await captureAuthorizationHeader(
      page,
      `/admin/bookings/${bookingId}`,
      `/bookings/${bookingId}`,
    );

    const response = await page.request.patch(
      `${API_BASE_URL}/bookings/${bookingId}/status`,
      {
        headers: {
          Authorization: authHeader,
        },

        data: {
          status: "CANCELLED",
        },
      },
    );

    expect(response.ok()).toBeFalsy();
  });

  test("a completed booking cannot be cancelled", async ({ page }) => {
    if (!completedFixture) {
      throw new Error("Completed booking fixture was not created.");
    }

    const bookingId = completedFixture.bookingId;

    await loginAsAdmin(page);

    await page.goto(`/admin/bookings/${bookingId}`);

    const guideSelect = page.locator("#booking-guide");

    await expect(guideSelect).toBeVisible({
      timeout: 10_000,
    });

    const guideOption = guideSelect.locator("option").filter({
      hasText: GUIDE_NAME,
    });

    await expect(guideOption).toHaveCount(1);

    await guideSelect.selectOption({
      value: (await guideOption.getAttribute("value")) ?? "",
    });

    const assignResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/bookings/${bookingId}/guide`) &&
        response.request().method() === "PATCH",
    );

    await page
      .getByRole("button", { name: /assign guide|change guide/i })
      .click();

    const assignResponse = await assignResponsePromise;

    expect(assignResponse.ok()).toBeTruthy();

    await clearSession(page);

    await login(page, GUIDE_EMAIL, GUIDE_PASSWORD);

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

    await loginAsAdmin(page);

    await page.goto(`/admin/bookings/${bookingId}`);

    await expect(
      page.getByText("Completed", { exact: true }).first(),
    ).toBeVisible({
      timeout: 10_000,
    });

    await expect(
      page.getByRole("button", { name: "Cancel booking" }),
    ).toHaveCount(0);

    await expect(
      page.getByText(
        "This tour has been completed. No further administrative status changes are available.",
      ),
    ).toBeVisible();

    const authHeader = await captureAuthorizationHeader(
      page,
      `/admin/bookings/${bookingId}`,
      `/bookings/${bookingId}`,
    );

    const response = await page.request.patch(
      `${API_BASE_URL}/bookings/${bookingId}/status`,
      {
        headers: {
          Authorization: authHeader,
        },

        data: {
          status: "CANCELLED",
        },
      },
    );

    expect(response.ok()).toBeFalsy();
  });

  test("tourists and guides cannot call the admin cancellation endpoint", async ({
    page,
  }) => {
    if (!rolesFixture) {
      throw new Error("Roles booking fixture was not created.");
    }

    const bookingId = rolesFixture.bookingId;

    await clearSession(page);

    await login(page, TOURIST_EMAIL, TOURIST_PASSWORD);

    const touristAuthHeader = await captureAuthorizationHeader(
      page,
      `/tourist/bookings/${bookingId}`,
      `/bookings/${bookingId}`,
    );

    const touristResponse = await page.request.patch(
      `${API_BASE_URL}/bookings/${bookingId}/status`,
      {
        headers: {
          Authorization: touristAuthHeader,
        },

        data: {
          status: "CANCELLED",
        },
      },
    );

    expect(touristResponse.status()).toBe(403);

    await clearSession(page);

    await login(page, GUIDE_EMAIL, GUIDE_PASSWORD);

    const guideAuthHeader = await captureAuthorizationHeader(
      page,
      `/guide/bookings/${bookingId}`,
      `/bookings/${bookingId}`,
    );

    const guideResponse = await page.request.patch(
      `${API_BASE_URL}/bookings/${bookingId}/status`,
      {
        headers: {
          Authorization: guideAuthHeader,
        },

        data: {
          status: "CANCELLED",
        },
      },
    );

    expect(guideResponse.status()).toBe(403);

    /**
     * The booking must remain untouched by either attempt.
     */

    await loginAsAdmin(page);

    await page.goto(`/admin/bookings/${bookingId}`);

    await expect(
      page.getByText("Confirmed", { exact: true }).first(),
    ).toBeVisible();
  });

  test("cancelling a booking frees the guide for a previously conflicting overlapping booking", async ({
    page,
  }) => {
    if (!conflictFixture) {
      throw new Error("Conflict booking fixture was not created.");
    }

    const { bookingAId, bookingBId, guideName } = conflictFixture;

    await loginAsAdmin(page);

    /**
     * =====================================================
     * STEP 1
     * Assigning the guide to the overlapping booking must
     * conflict while booking A is still CONFIRMED.
     * =====================================================
     */

    await page.goto(`/admin/bookings/${bookingBId}`);

    const guideSelectFirst = page.locator("#booking-guide");

    await expect(guideSelectFirst).toBeVisible({
      timeout: 10_000,
    });

    const guideOptionFirst = guideSelectFirst.locator("option").filter({
      hasText: guideName,
    });

    await expect(guideOptionFirst).toHaveCount(1);

    await guideSelectFirst.selectOption({
      value: (await guideOptionFirst.getAttribute("value")) ?? "",
    });

    const conflictResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/bookings/${bookingBId}/guide`) &&
        response.request().method() === "PATCH",
    );

    await page
      .getByRole("button", { name: /assign guide|change guide/i })
      .click();

    const conflictResponse = await conflictResponsePromise;

    expect(conflictResponse.ok()).toBeFalsy();

    await expect(
      page.getByText(/already assigned to another booking/i),
    ).toBeVisible({
      timeout: 10_000,
    });

    /**
     * =====================================================
     * STEP 2
     * Cancel booking A to free the guide.
     * =====================================================
     */

    await page.goto(`/admin/bookings/${bookingAId}`);

    await page.getByRole("button", { name: "Cancel booking" }).click();

    const cancelResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/bookings/${bookingAId}/status`) &&
        response.request().method() === "PATCH",
    );

    await page.getByRole("button", { name: "Yes, cancel booking" }).click();

    const cancelResponse = await cancelResponsePromise;

    expect(cancelResponse.ok()).toBeTruthy();

    await expect(
      page.getByText("Cancelled", { exact: true }).first(),
    ).toBeVisible({
      timeout: 10_000,
    });

    /**
     * =====================================================
     * STEP 3
     * Assigning the guide to booking B must now succeed --
     * a CANCELLED booking is no longer active for guide
     * conflict calculations.
     * =====================================================
     */

    await page.goto(`/admin/bookings/${bookingBId}`);

    const guideSelectSecond = page.locator("#booking-guide");

    await expect(guideSelectSecond).toBeVisible({
      timeout: 10_000,
    });

    const guideOptionSecond = guideSelectSecond.locator("option").filter({
      hasText: guideName,
    });

    await guideSelectSecond.selectOption({
      value: (await guideOptionSecond.getAttribute("value")) ?? "",
    });

    const assignResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/bookings/${bookingBId}/guide`) &&
        response.request().method() === "PATCH",
    );

    await page
      .getByRole("button", { name: /assign guide|change guide/i })
      .click();

    const assignResponse = await assignResponsePromise;

    expect(assignResponse.ok()).toBeTruthy();

    await expect(
      page.getByText(guideName, { exact: true }),
    ).toBeVisible({
      timeout: 10_000,
    });
  });
});
