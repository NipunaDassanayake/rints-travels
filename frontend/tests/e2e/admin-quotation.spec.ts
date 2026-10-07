import { expect, test, type Page } from "@playwright/test";

/**
 * =========================================================
 * Accounts
 * =========================================================
 */

const TOURIST_EMAIL = "nipuna@example.com";

const TOURIST_PASSWORD = "Password123";

const ADMIN_EMAIL = "admin@travora.com";

const ADMIN_PASSWORD = "Admin12345";

/**
 * =========================================================
 * Test Data
 * =========================================================
 */

const TEST_ID = Date.now();

const TEST_TRIP = {
  title: `Playwright Quotation Trip ${TEST_ID}`,

  destinations: "Sigiriya, Kandy, Ella and Yala",

  startDate: "2026-11-10",

  endDate: "2026-11-16",

  adults: "2",

  children: "0",

  budget: "2200",

  currency: "USD",

  hotel: "Comfortable 4-star accommodation",

  transport: "Private air-conditioned vehicle",

  requirements: "Vegetarian meals preferred.",
};

const TEST_QUOTATION = {
  title: `Travora Sri Lanka Journey ${TEST_ID}`,

  description: "A personalized six-day Sri Lanka journey prepared by Travora.",

  subtotal: "2000",

  discount: "100",

  tax: "50",

  currency: "USD",

  notes: "Airport pickup will be coordinated before arrival.",

  terms: "Subject to hotel and guide availability at the time of confirmation.",
};

/**
 * =========================================================
 * Authentication Helpers
 * =========================================================
 */

async function loginAsTourist(page: Page) {
  await page.goto("/login");

  await page.getByLabel("Email").fill(TOURIST_EMAIL);

  await page.getByLabel("Password").fill(TOURIST_PASSWORD);

  await page
    .getByRole("button", {
      name: "Sign in",
    })
    .click();

  await expect(page).toHaveURL("/");
}

async function loginAsAdmin(page: Page) {
  await page.goto("/login");

  await page.getByLabel("Email").fill(ADMIN_EMAIL);

  await page.getByLabel("Password").fill(ADMIN_PASSWORD);

  await page
    .getByRole("button", {
      name: "Sign in",
    })
    .click();

  /**
   * Admin normal login should go
   * to the admin dashboard.
   */
  await expect(page).toHaveURL(/\/admin/, {
    timeout: 10_000,
  });
}

/**
 * =========================================================
 * Tourist Request Creation
 * =========================================================
 */

async function createTourRequest(page: Page): Promise<string> {
  await loginAsTourist(page);

  await page.goto("/tourist/requests/new");

  await expect(
    page.getByRole("heading", {
      name: /tell us about your trip/i,
    }),
  ).toBeVisible();

  /**
   * Custom request.
   */
  await page
    .getByRole("radio", {
      name: /create from scratch/i,
    })
    .check();

  await page.getByLabel("Trip title").fill(TEST_TRIP.title);

  await page.getByLabel("Destination preferences").fill(TEST_TRIP.destinations);

  await page.getByLabel("Preferred start date").fill(TEST_TRIP.startDate);

  await page.getByLabel("Preferred end date").fill(TEST_TRIP.endDate);

  await page.getByLabel("Adults").fill(TEST_TRIP.adults);

  await page.getByLabel("Children").fill(TEST_TRIP.children);

  await page.getByLabel("Approximate budget").fill(TEST_TRIP.budget);

  await page.getByLabel("Currency").fill(TEST_TRIP.currency);

  await page.getByLabel("Hotel preference").fill(TEST_TRIP.hotel);

  await page.getByLabel("Transport preference").fill(TEST_TRIP.transport);

  await page.getByLabel("Preferred contact method").selectOption("EMAIL");

  await page.getByLabel("Special requirements").fill(TEST_TRIP.requirements);

  await page
    .getByRole("button", {
      name: "Submit tour request",
    })
    .click();

  /**
   * Wait for generated request details URL.
   */
  await expect(page).toHaveURL(/\/tourist\/requests\/[^/]+$/, {
    timeout: 10_000,
  });

  await expect(
    page.getByText(TEST_TRIP.title, {
      exact: true,
    }),
  ).toBeVisible();

  const url = new URL(page.url());

  const requestId = url.pathname.split("/").filter(Boolean).at(-1);

  if (!requestId) {
    throw new Error("Unable to determine created tour request ID.");
  }

  return requestId;
}

/**
 * =========================================================
 * Admin Quotation Flow
 * =========================================================
 */

test.describe("Travora admin quotation flow", () => {
  test.describe.configure({
    mode: "serial",
  });

  test("admin can process a tourist request and send a quotation", async ({
    page,
  }) => {
    /**
     * ===================================================
     * STEP 1
     * Tourist creates request
     * ===================================================
     */

    const requestId = await createTourRequest(page);

    console.log(`Created request: ${requestId}`);

    /**
     * ===================================================
     * STEP 2
     * Logout tourist
     * ===================================================
     *
     * We intentionally start a clean browser context
     * instead of relying on the application's logout UI.
     */

    await page.context().clearCookies();

    /**
     * Clear browser-side access token/session data.
     */
    await page.goto("/");

    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    /**
     * ===================================================
     * STEP 3
     * Admin login
     * ===================================================
     */

    await loginAsAdmin(page);

    /**
     * ===================================================
     * STEP 4
     * Open exact request
     * ===================================================
     */

    await page.goto(`/admin/tour-requests/${requestId}`);

    await expect(page).toHaveURL(`/admin/tour-requests/${requestId}`);

    await expect(
      page.getByRole("heading", {
        name: TEST_TRIP.title,
      }),
    ).toBeVisible({
      timeout: 10_000,
    });

    /**
     * ===================================================
     * STEP 5
     * Pending Review -> Under Discussion
     * ===================================================
     */

    const startDiscussion = page.getByRole("button", {
      name: "Start discussion",
    });

    await expect(startDiscussion).toBeVisible();

    await startDiscussion.click();

    /**
     * After query invalidation the next action
     * should become available.
     */

    const readyButton = page.getByRole("button", {
      name: "Mark ready for quotation",
    });

    await expect(readyButton).toBeVisible({
      timeout: 10_000,
    });

    /**
     * ===================================================
     * STEP 6
     * Under Discussion -> Ready For Quotation
     * ===================================================
     */

    await readyButton.click();

    await expect(
      page
        .getByText("Ready for quotation", {
          exact: true,
        })
        .first(),
    ).toBeVisible({
      timeout: 10_000,
    });

    /**
     * ===================================================
     * STEP 7
     * Open quotation form
     * ===================================================
     */

    const createQuotationButton = page.getByRole("button", {
      name: "Create quotation",
    });

    await expect(createQuotationButton).toBeVisible({
      timeout: 10_000,
    });

    await createQuotationButton.click();

    /**
     * ===================================================
     * STEP 8
     * Fill quotation
     * ===================================================
     */

    await page
      .getByLabel("Title", {
        exact: true,
      })
      .fill(TEST_QUOTATION.title);

    await page
      .getByLabel("Description", {
        exact: true,
      })
      .fill(TEST_QUOTATION.description);

    /**
     * Start/end dates and traveler counts are
     * pre-populated from the tour request.
     *
     * Verify them rather than unnecessarily
     * replacing them.
     */

    await expect(
      page.getByLabel("Start date", {
        exact: true,
      }),
    ).toHaveValue(TEST_TRIP.startDate);

    await expect(
      page.getByLabel("End date", {
        exact: true,
      }),
    ).toHaveValue(TEST_TRIP.endDate);

    await expect(
      page.getByLabel("Adults", {
        exact: true,
      }),
    ).toHaveValue(TEST_TRIP.adults);

    await expect(
      page.getByLabel("Children", {
        exact: true,
      }),
    ).toHaveValue(TEST_TRIP.children);

    /**
     * Pricing
     */

    await page
      .getByLabel("Subtotal", {
        exact: true,
      })
      .fill(TEST_QUOTATION.subtotal);

    await page
      .getByLabel("Discount", {
        exact: true,
      })
      .fill(TEST_QUOTATION.discount);

    await page
      .getByLabel("Tax", {
        exact: true,
      })
      .fill(TEST_QUOTATION.tax);

    await page
      .getByLabel("Currency", {
        exact: true,
      })
      .fill(TEST_QUOTATION.currency);

    /**
     * Optional information.
     */

    await page
      .getByLabel("Notes", {
        exact: true,
      })
      .fill(TEST_QUOTATION.notes);

    await page
      .getByLabel("Terms & conditions", {
        exact: true,
      })
      .fill(TEST_QUOTATION.terms);

    /**
     * Expected:
     *
     * 2000 - 100 + 50
     * = USD 1950
     */

    await expect(
      page.getByText("USD 1950.00", {
        exact: true,
      }),
    ).toBeVisible();

    /**
     * ===================================================
     * STEP 9
     * Create draft
     * ===================================================
     */

    const createDraftButton = page.getByRole("button", {
      name: "Create draft quotation",
    });

    await expect(createDraftButton).toBeEnabled();

    await createDraftButton.click();

    /**
     * Form closes and quotation card appears.
     */

    await expect(
      page.getByText(TEST_QUOTATION.title, {
        exact: true,
      }),
    ).toBeVisible({
      timeout: 10_000,
    });

    await expect(
      page.getByText("Draft", {
        exact: true,
      }),
    ).toBeVisible({
      timeout: 10_000,
    });

    /**
     * Verify calculated quotation amount.
     */

    await expect(page.getByText(/USD\s+1950/)).toBeVisible();

    /**
     * ===================================================
     * STEP 10
     * Send quotation
     * ===================================================
     *
     * The application calls window.confirm().
     * Playwright must accept the dialog.
     */

    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("Send this quotation to the tourist?");

      await dialog.accept();
    });

    await page
      .getByRole("button", {
        name: "Send quotation",
      })
      .click();

    /**
     * ===================================================
     * STEP 11
     * Verify quotation sent
     * ===================================================
     */

    await expect(
      page
        .getByText("Sent", {
          exact: true,
        })
        .first(),
    ).toBeVisible({
      timeout: 10_000,
    });

    /**
     * Request itself should now be
     * QUOTATION_SENT.
     */

    await expect(
      page
        .getByText("Quotation Sent", {
          exact: true,
        })
        .first(),
    ).toBeVisible({
      timeout: 10_000,
    });

    /**
     * Send button must disappear because
     * sent quotations cannot be resent or edited.
     */

    await expect(
      page.getByRole("button", {
        name: "Send quotation",
      }),
    ).not.toBeVisible();

    console.log(`Quotation sent successfully for request: ${requestId}`);
  });
});
