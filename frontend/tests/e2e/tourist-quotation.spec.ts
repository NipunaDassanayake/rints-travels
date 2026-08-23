import { expect, test, type Page } from "@playwright/test";

/**
 * =========================================================
 * Global Test Timeout
 * =========================================================
 */

test.setTimeout(60_000);

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

const TRIP = {
  title: `Playwright Acceptance Trip ${TEST_ID}`,

  destinations: "Kandy, Nuwara Eliya, Ella and Yala",

  startDate: "2026-12-05",

  endDate: "2026-12-11",

  adults: "2",

  children: "0",

  budget: "2400",

  currency: "USD",
};

const QUOTATION = {
  title: `Travora Acceptance Journey ${TEST_ID}`,

  description:
    "A personalized Sri Lanka journey prepared for automated acceptance testing.",

  subtotal: "2200",

  discount: "100",

  tax: "50",

  total: "2150",

  currency: "USD",
};

/**
 * =========================================================
 * Session Helper
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

/**
 * =========================================================
 * Login Helpers
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

  await expect(page).toHaveURL(/\/admin/, {
    timeout: 10_000,
  });
}

/**
 * =========================================================
 * Tourist Creates Request
 * =========================================================
 */

async function createTourRequest(page: Page): Promise<string> {
  await loginAsTourist(page);

  await page.goto("/tourist/requests/new");

  await expect(page).toHaveURL("/tourist/requests/new");

  /**
   * =======================================================
   * Request Type
   * =======================================================
   */

  await page
    .getByRole("radio", {
      name: /create from scratch/i,
    })
    .check();

  /**
   * =======================================================
   * Custom Trip
   * =======================================================
   */

  await page.getByLabel("Trip title").fill(TRIP.title);

  await page.getByLabel("Destination preferences").fill(TRIP.destinations);

  /**
   * =======================================================
   * Dates
   * =======================================================
   */

  await page.getByLabel("Preferred start date").fill(TRIP.startDate);

  await page.getByLabel("Preferred end date").fill(TRIP.endDate);

  /**
   * =======================================================
   * Travelers
   * =======================================================
   */

  await page.getByLabel("Adults").fill(TRIP.adults);

  await page.getByLabel("Children").fill(TRIP.children);

  /**
   * =======================================================
   * Budget
   * =======================================================
   */

  await page.getByLabel("Approximate budget").fill(TRIP.budget);

  await page.getByLabel("Currency").fill(TRIP.currency);

  /**
   * =======================================================
   * Submit Request
   * =======================================================
   */

  const submitButton = page.getByRole("button", {
    name: "Submit tour request",
  });

  await expect(submitButton).toBeEnabled();

  await submitButton.click();

  /**
   * =======================================================
   * Wait For Real Request Route
   * =======================================================
   *
   * Important:
   *
   * /tourist/requests/new also matches a broad
   * /tourist/requests/:id pattern.
   *
   * Therefore we explicitly ensure the final
   * path segment is NOT "new".
   */

  await page.waitForURL(
    (url) => {
      const match = url.pathname.match(/^\/tourist\/requests\/([^/]+)$/);

      return Boolean(match && match[1] !== "new");
    },
    {
      timeout: 15_000,
    },
  );

  /**
   * =======================================================
   * Extract Request ID
   * =======================================================
   */

  const requestId = new URL(page.url()).pathname
    .split("/")
    .filter(Boolean)
    .at(-1);

  if (!requestId || requestId === "new") {
    throw new Error(
      `Unable to determine created request ID. Current URL: ${page.url()}`,
    );
  }

  /**
   * Verify request details loaded.
   */

  await expect(
    page.getByText(TRIP.title, {
      exact: true,
    }),
  ).toBeVisible({
    timeout: 10_000,
  });

  console.log(`Created request: ${requestId}`);

  return requestId;
}

/**
 * =========================================================
 * Admin Creates And Sends Quotation
 * =========================================================
 */

async function createAndSendQuotation(
  page: Page,
  requestId: string,
): Promise<string> {
  /**
   * =======================================================
   * Switch Session
   * =======================================================
   */

  await clearSession(page);

  await loginAsAdmin(page);

  /**
   * =======================================================
   * Open Exact Request
   * =======================================================
   */

  await page.goto(`/admin/tour-requests/${requestId}`);

  await expect(page).toHaveURL(`/admin/tour-requests/${requestId}`);

  await expect(
    page.getByRole("heading", {
      name: TRIP.title,
    }),
  ).toBeVisible({
    timeout: 10_000,
  });

  /**
   * =======================================================
   * PENDING_REVIEW
   * -> UNDER_DISCUSSION
   * =======================================================
   */

  const startDiscussionButton = page.getByRole("button", {
    name: "Start discussion",
  });

  await expect(startDiscussionButton).toBeVisible({
    timeout: 10_000,
  });

  await startDiscussionButton.click();

  /**
   * =======================================================
   * UNDER_DISCUSSION
   * -> READY_FOR_QUOTATION
   * =======================================================
   */

  const readyButton = page.getByRole("button", {
    name: "Mark ready for quotation",
  });

  await expect(readyButton).toBeVisible({
    timeout: 10_000,
  });

  await readyButton.click();

  /**
   * =======================================================
   * Create Quotation
   * =======================================================
   */

  const createButton = page.getByRole("button", {
    name: "Create quotation",
  });

  await expect(createButton).toBeVisible({
    timeout: 10_000,
  });

  await createButton.click();

  /**
   * =======================================================
   * Fill Quotation
   * =======================================================
   */

  await page
    .getByLabel("Title", {
      exact: true,
    })
    .fill(QUOTATION.title);

  await page
    .getByLabel("Description", {
      exact: true,
    })
    .fill(QUOTATION.description);

  /**
   * Verify request dates carried over.
   */

  await expect(
    page.getByLabel("Start date", {
      exact: true,
    }),
  ).toHaveValue(TRIP.startDate);

  await expect(
    page.getByLabel("End date", {
      exact: true,
    }),
  ).toHaveValue(TRIP.endDate);

  /**
   * =======================================================
   * Pricing
   * =======================================================
   */

  await page
    .getByLabel("Subtotal", {
      exact: true,
    })
    .fill(QUOTATION.subtotal);

  await page
    .getByLabel("Discount", {
      exact: true,
    })
    .fill(QUOTATION.discount);

  await page
    .getByLabel("Tax", {
      exact: true,
    })
    .fill(QUOTATION.tax);

  await page
    .getByLabel("Currency", {
      exact: true,
    })
    .fill(QUOTATION.currency);

  /**
   * Verify:
   *
   * 2200 - 100 + 50
   * = 2150
   */

  await expect(
    page.getByText(`USD ${QUOTATION.total}.00`, {
      exact: true,
    }),
  ).toBeVisible();

  /**
   * =======================================================
   * Create Draft
   * =======================================================
   */

  const createDraftButton = page.getByRole("button", {
    name: "Create draft quotation",
  });

  await expect(createDraftButton).toBeEnabled();

  await createDraftButton.click();

  /**
   * Wait until draft quotation card appears.
   */

  await expect(
    page.getByText(QUOTATION.title, {
      exact: true,
    }),
  ).toBeVisible({
    timeout: 10_000,
  });

  await expect(
    page
      .getByText("Draft", {
        exact: true,
      })
      .first(),
  ).toBeVisible({
    timeout: 10_000,
  });

  /**
   * =======================================================
   * Send Quotation
   * =======================================================
   */

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("Send this quotation to the tourist?");

    await dialog.accept();
  });

  /**
   * Capture quotation ID from backend send response.
   */

  const sendResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/quotations/") &&
      response.url().endsWith("/send") &&
      response.request().method() === "POST",
  );

  await page
    .getByRole("button", {
      name: "Send quotation",
    })
    .click();

  const sendResponse = await sendResponsePromise;

  expect(sendResponse.ok()).toBeTruthy();

  /**
   * =======================================================
   * Extract Quotation ID
   * =======================================================
   */

  const responseBody = await sendResponse.json();

  const quotationId = responseBody?.data?.id;

  if (!quotationId) {
    throw new Error("Unable to determine quotation ID from send response.");
  }

  /**
   * Verify sent state.
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

  await expect(
    page
      .getByText("Quotation Sent", {
        exact: true,
      })
      .first(),
  ).toBeVisible({
    timeout: 10_000,
  });

  console.log(`Created quotation: ${quotationId}`);

  return quotationId;
}

/**
 * =========================================================
 * Tourist Acceptance
 * =========================================================
 */

test.describe("Tourist quotation acceptance flow", () => {
  test.describe.configure({
    mode: "serial",
  });

  test("tourist can open and accept a sent quotation", async ({ page }) => {
    /**
     * ===================================================
     * STEP 1
     * Tourist creates request
     * ===================================================
     */

    const requestId = await createTourRequest(page);

    /**
     * ===================================================
     * STEP 2
     * Admin prepares and sends quotation
     * ===================================================
     */

    const quotationId = await createAndSendQuotation(page, requestId);

    /**
     * ===================================================
     * STEP 3
     * Switch Back To Tourist
     * ===================================================
     */

    await clearSession(page);

    await loginAsTourist(page);

    /**
     * ===================================================
     * STEP 4
     * Verify Quotation In Tourist List
     * ===================================================
     */

    await page.goto("/tourist/quotations");

    await expect(
      page.getByText(QUOTATION.title, {
        exact: true,
      }),
    ).toBeVisible({
      timeout: 10_000,
    });

    await expect(
      page
        .getByText("Sent", {
          exact: true,
        })
        .first(),
    ).toBeVisible();

    /**
     * ===================================================
     * STEP 5
     * Open Exact Quotation
     * ===================================================
     */

    await page.goto(`/tourist/quotations/${quotationId}`);

    await expect(page).toHaveURL(`/tourist/quotations/${quotationId}`);

    await expect(
      page.getByRole("heading", {
        name: QUOTATION.title,
      }),
    ).toBeVisible({
      timeout: 10_000,
    });

    /**
     * Verify pricing.
     */

    await expect(
      page.getByText(`USD ${QUOTATION.total}`, {
        exact: true,
      }),
    ).toBeVisible();

    /**
     * ===================================================
     * STEP 6
     * Verify Accept Action
     * ===================================================
     */

    const acceptButton = page.getByRole("button", {
      name: "Accept quotation",
    });

    await expect(acceptButton).toBeVisible();

    await expect(acceptButton).toBeEnabled();

    /**
     * ===================================================
     * STEP 7
     * Accept Quotation
     * ===================================================
     */

    const acceptResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/quotations/${quotationId}/accept`) &&
        response.request().method() === "POST",
    );

    await acceptButton.click();

    const acceptResponse = await acceptResponsePromise;

    expect(acceptResponse.ok()).toBeTruthy();

    /**
     * ===================================================
     * STEP 8
     * Verify Accepted State
     * ===================================================
     */

    await expect(
      page.getByText("Quotation accepted", {
        exact: true,
      }),
    ).toBeVisible({
      timeout: 10_000,
    });

    await expect(
      page.getByRole("button", {
        name: "Accept quotation",
      }),
    ).not.toBeVisible();

    /**
     * ===================================================
     * STEP 9
     * Verify Payment Stage Is Unlocked
     * ===================================================
     */

    await expect(
      page.getByText(/you can now continue to payment/i),
    ).toBeVisible();

    console.log(`Quotation accepted successfully: ${quotationId}`);
  });
});