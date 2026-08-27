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

/**
 * Guide account.
 *
 * These values must match a real guide account.
 */

const GUIDE_EMAIL = process.env.E2E_GUIDE_EMAIL ?? "nimal.guide@travora.com";

const GUIDE_PASSWORD = process.env.E2E_GUIDE_PASSWORD ?? "Guide12345";

const GUIDE_NAME = process.env.E2E_GUIDE_NAME ?? "Nimal Perera";

/**
 * =========================================================
 * Fixture Type
 * =========================================================
 */

interface BookingLifecycleFixture {
  bookingId: string;

  bookingReference: string;

  tourRequestId: string;

  quotationId: string;

  paymentId: string;

  touristId: string;

  touristEmail: string;

  startDate: string;

  endDate: string;

  status: "CONFIRMED";
}

/**
 * =========================================================
 * Runtime Fixture
 * =========================================================
 */

let fixture: BookingLifecycleFixture | undefined;

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

/**
 * =========================================================
 * Prepare Fresh Backend Fixture
 * =========================================================
 */

async function createBookingFixture(): Promise<BookingLifecycleFixture> {
  /**
   * Playwright is normally executed from:
   *
   * rints-travels/frontend
   *
   * Therefore backend is one directory above.
   */

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

        /**
         * Make sure the backend fixture and
         * frontend test use the same tourist.
         */
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
 * Booking Lifecycle
 * =========================================================
 */

test.describe("Travora booking lifecycle", () => {
  test.describe.configure({
    mode: "serial",
  });

  /**
   * =====================================================
   * Prepare Fresh Booking
   * =====================================================
   *
   * Every Playwright execution gets a completely new:
   *
   * TourRequest
   * Quotation
   * Successful Payment
   * Confirmed Booking
   *
   * No manual E2E_BOOKING_ID is needed anymore.
   */

  test.beforeAll(async () => {
    fixture = await createBookingFixture();

    console.log("Created E2E booking:", fixture.bookingId);

    console.log("Booking reference:", fixture.bookingReference);
  });

  test("admin assigns guide, guide completes tour, tourist submits review", async ({
    page,
  }) => {
    if (!fixture) {
      throw new Error("Booking lifecycle fixture was not created.");
    }

    const bookingId = fixture.bookingId;

    const reviewComment = `Playwright lifecycle review ${Date.now()}`;

    /**
     * =================================================
     * STEP 1
     * Admin Login
     * =================================================
     */

    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    /**
     * =================================================
     * STEP 2
     * Open Fresh Confirmed Booking
     * =================================================
     */

    await page.goto(`/admin/bookings/${bookingId}`);

    await expect(page).toHaveURL(`/admin/bookings/${bookingId}`);

    await expect(
      page.getByText("Booking management", {
        exact: true,
      }),
    ).toBeVisible();

    /**
     * Verify the fixture's booking reference.
     *
     * This is stronger than accidentally matching
     * another "Confirmed" label on the page.
     */

    await expect(
      page.getByText(fixture.bookingReference, {
        exact: true,
      }),
    ).toBeVisible();

    /**
     * =================================================
     * STEP 3
     * Select Guide
     * =================================================
     */

    const guideSelect = page.locator("#booking-guide");

    await expect(guideSelect).toBeVisible({
      timeout: 10_000,
    });

    const guideOption = guideSelect.locator("option").filter({
      hasText: GUIDE_NAME,
    });

    await expect(guideOption).toHaveCount(1);

    const guideId = await guideOption.getAttribute("value");

    if (!guideId) {
      throw new Error(
        `Guide option "${GUIDE_NAME}" does not contain a valid guide ID.`,
      );
    }

    await guideSelect.selectOption({
      value: guideId,
    });

    await expect(guideSelect).toHaveValue(guideId);

    /**
     * =================================================
     * STEP 4
     * Assign Guide
     * =================================================
     */

    const assignButton = page.getByRole("button", {
      name: /assign guide|change guide/i,
    });

    await expect(assignButton).toBeVisible();

    await expect(assignButton).toBeEnabled();

    const assignResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/bookings/${bookingId}/guide`) &&
        response.request().method() === "PATCH",
    );

    await assignButton.click();

    const assignResponse = await assignResponsePromise;

    expect(assignResponse.ok()).toBeTruthy();

    /**
     * Verify the actual rendered current-guide area,
     * rather than asserting visibility of the hidden
     * <option>.
     */

    await expect(
      page.getByText(GUIDE_NAME, {
        exact: true,
      }),
    ).toBeVisible({
      timeout: 10_000,
    });

    /**
     * Admin must not control normal tour progression.
     */

    await expect(
      page.getByRole("button", {
        name: "Start tour",
      }),
    ).toHaveCount(0);

    await expect(
      page.getByRole("button", {
        name: "Complete tour",
      }),
    ).toHaveCount(0);

    await expect(
      page.getByText(/tour status is managed by the assigned guide/i),
    ).toBeVisible();

    /**
     * =================================================
     * STEP 5
     * Clear Admin Session
     * =================================================
     */

    await clearSession(page);

    /**
     * =================================================
     * STEP 6
     * Guide Login
     * =================================================
     */

    await login(page, GUIDE_EMAIL, GUIDE_PASSWORD);

    /**
     * =================================================
     * STEP 7
     * Guide Opens Assigned Booking
     * =================================================
     */

    await page.goto(`/guide/bookings/${bookingId}`);

    await expect(page).toHaveURL(`/guide/bookings/${bookingId}`);

    await expect(
      page.getByText("Assigned tour", {
        exact: true,
      }),
    ).toBeVisible();

    /**
     * =================================================
     * STEP 8
     * Start Tour
     * =================================================
     */

    const startTourButton = page.getByRole("button", {
      name: "Start tour",
    });

    await expect(startTourButton).toBeVisible();

    await expect(startTourButton).toBeEnabled();

    const startResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/bookings/guide/${bookingId}/start`) &&
        response.request().method() === "PATCH",
    );

    await startTourButton.click();

    const startResponse = await startResponsePromise;

    expect(startResponse.ok()).toBeTruthy();

    await expect(
      page
        .getByText("In Progress", {
          exact: true,
        })
        .first(),
    ).toBeVisible({
      timeout: 10_000,
    });

    /**
     * =================================================
     * STEP 9
     * Complete Tour
     * =================================================
     */

    const completeTourButton = page.getByRole("button", {
      name: "Complete tour",
    });

    await expect(completeTourButton).toBeVisible();

    await expect(completeTourButton).toBeEnabled();

    const completeResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/bookings/guide/${bookingId}/complete`) &&
        response.request().method() === "PATCH",
    );

    await completeTourButton.click();

    const completeResponse = await completeResponsePromise;

    expect(completeResponse.ok()).toBeTruthy();

    await expect(
      page
        .getByText("Completed", {
          exact: true,
        })
        .first(),
    ).toBeVisible({
      timeout: 10_000,
    });

    await expect(
      page.getByText("Tour completed", {
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("button", {
        name: "Start tour",
      }),
    ).toHaveCount(0);

    await expect(
      page.getByRole("button", {
        name: "Complete tour",
      }),
    ).toHaveCount(0);

    /**
     * =================================================
     * STEP 10
     * Clear Guide Session
     * =================================================
     */

    await clearSession(page);

    /**
     * =================================================
     * STEP 11
     * Tourist Login
     * =================================================
     */

    await login(page, TOURIST_EMAIL, TOURIST_PASSWORD);

    /**
     * =================================================
     * STEP 12
     * Tourist Opens Completed Booking
     * =================================================
     */

    await page.goto(`/tourist/bookings/${bookingId}`);

    await expect(page).toHaveURL(`/tourist/bookings/${bookingId}`);

    await expect(
      page
        .getByText("Completed", {
          exact: true,
        })
        .first(),
    ).toBeVisible();

    /**
     * Review form only appears when:
     *
     * booking.status === COMPLETED
     * AND
     * booking has an assigned guide.
     */

    await expect(
      page.getByText("Rate your tour guide", {
        exact: true,
      }),
    ).toBeVisible({
      timeout: 10_000,
    });

    /**
     * =================================================
     * STEP 13
     * Select 5 Stars
     * =================================================
     */

    await page
      .getByRole("button", {
        name: "Rate 5 out of 5",
      })
      .click();

    await expect(
      page.getByText("Excellent", {
        exact: true,
      }),
    ).toBeVisible();

    /**
     * =================================================
     * STEP 14
     * Write Review
     * =================================================
     */

    await page.getByLabel("Tell us about your experience").fill(reviewComment);

    /**
     * =================================================
     * STEP 15
     * Submit Review
     * =================================================
     */

    const submitReviewButton = page.getByRole("button", {
      name: "Submit review",
    });

    await expect(submitReviewButton).toBeEnabled();

    const reviewResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/reviews") &&
        response.request().method() === "POST",
    );

    await submitReviewButton.click();

    const reviewResponse = await reviewResponsePromise;

    expect(reviewResponse.ok()).toBeTruthy();

    /**
     * =================================================
     * STEP 16
     * Verify Success
     * =================================================
     */

    await expect(
      page.getByText("Thank you for your review", {
        exact: true,
      }),
    ).toBeVisible({
      timeout: 10_000,
    });

    console.log("Booking lifecycle completed successfully:", bookingId);

    console.log("Assigned guide:", GUIDE_NAME);

    console.log("Review:", reviewComment);
  });
});