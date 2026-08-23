import { expect, test, type Page } from "@playwright/test";

const TOURIST_EMAIL = "nipuna@example.com";

const TOURIST_PASSWORD = "Password123";

/**
 * =========================================================
 * Test Data
 * =========================================================
 */

const TEST_TRIP = {
  title: `Playwright Sri Lanka Adventure ${Date.now()}`,

  destinations: "Sigiriya, Kandy, Ella, Yala and Mirissa",

  startDate: "2026-10-10",

  endDate: "2026-10-17",

  adults: "2",

  children: "1",

  budget: "2500",

  currency: "USD",

  hotel: "Boutique hotels and comfortable 4-star accommodation",

  transport: "Private air-conditioned vehicle",

  specialRequirements: "Vegetarian meals and one scenic train journey.",

  contactMethod: "EMAIL",
};

/**
 * =========================================================
 * Helpers
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

/**
 * =========================================================
 * Tour Request Flow
 * =========================================================
 */

test.describe("Tourist tour request flow", () => {
  /**
   * We use one shared tourist account,
   * therefore keep these tests serial.
   */
  test.describe.configure({
    mode: "serial",
  });

  test("tourist can create a custom tour request", async ({ page }) => {
    /**
     * -----------------------------------------
     * Login
     * -----------------------------------------
     */

    await loginAsTourist(page);

    /**
     * -----------------------------------------
     * Open Plan Trip
     * -----------------------------------------
     */

    await page.goto("/tourist/requests/new");

    await expect(page).toHaveURL("/tourist/requests/new");

    await expect(
      page.getByRole("heading", {
        name: /tell us about your trip/i,
      }),
    ).toBeVisible();

    /**
     * -----------------------------------------
     * Request Type
     * -----------------------------------------
     *
     * CUSTOM is already the default when
     * packageId is not provided.
     *
     * We still explicitly select it so the
     * test clearly represents the user flow.
     */

    await page
      .getByRole("radio", {
        name: /create from scratch/i,
      })
      .check();

    /**
     * -----------------------------------------
     * Custom Journey
     * -----------------------------------------
     */

    await page.getByLabel("Trip title").fill(TEST_TRIP.title);

    await page
      .getByLabel("Destination preferences")
      .fill(TEST_TRIP.destinations);

    /**
     * -----------------------------------------
     * Dates
     * -----------------------------------------
     */

    await page.getByLabel("Preferred start date").fill(TEST_TRIP.startDate);

    await page.getByLabel("Preferred end date").fill(TEST_TRIP.endDate);

    /**
     * -----------------------------------------
     * Travelers
     * -----------------------------------------
     */

    await page.getByLabel("Adults").fill(TEST_TRIP.adults);

    await page.getByLabel("Children").fill(TEST_TRIP.children);

    /**
     * -----------------------------------------
     * Budget
     * -----------------------------------------
     */

    await page.getByLabel("Approximate budget").fill(TEST_TRIP.budget);

    await page.getByLabel("Currency").fill(TEST_TRIP.currency);

    /**
     * -----------------------------------------
     * Preferences
     * -----------------------------------------
     */

    await page.getByLabel("Hotel preference").fill(TEST_TRIP.hotel);

    await page.getByLabel("Transport preference").fill(TEST_TRIP.transport);

    await page
      .getByLabel("Preferred contact method")
      .selectOption(TEST_TRIP.contactMethod);

    await page
      .getByLabel("Special requirements")
      .fill(TEST_TRIP.specialRequirements);

    /**
     * -----------------------------------------
     * Submit
     * -----------------------------------------
     */

    const submitButton = page.getByRole("button", {
      name: "Submit tour request",
    });

    await expect(submitButton).toBeEnabled();

    await submitButton.click();

    /**
     * -----------------------------------------
     * Successful Creation
     * -----------------------------------------
     *
     * Your form redirects to:
     *
     * /tourist/requests/{createdRequest.id}
     */

    await expect(page).toHaveURL(/\/tourist\/requests\/[^/]+$/, {
      timeout: 10_000,
    });

    /**
     * Verify the newly created request
     * actually appears on the details page.
     */

    await expect(
      page.getByText(TEST_TRIP.title, {
        exact: true,
      }),
    ).toBeVisible({
      timeout: 10_000,
    });

    await expect(
      page
        .getByText(TEST_TRIP.destinations, {
          exact: true,
        })
        .first(),
    ).toBeVisible();

    /**
     * -----------------------------------------
     * Capture Request ID
     * -----------------------------------------
     */

    const requestUrl = new URL(page.url());

    const requestId = requestUrl.pathname.split("/").filter(Boolean).at(-1);

    expect(requestId).toBeTruthy();

    console.log(`Created tour request: ${requestId}`);
  });
});
