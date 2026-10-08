import { expect, test, type Page } from "@playwright/test";

import { createFixtureTourist, type FixtureTourist } from "./support/fixture-identities";

/**
 * Throwaway tourist created per run (CR-032 Stage 3A) -- never a real
 * account. The standard E2E cleanup deletes it and everything it owns.
 */
let e2eTourist: FixtureTourist;

test.beforeAll(async () => {
  e2eTourist = await createFixtureTourist("auth");
});

/**
 * =========================================================
 * Helpers
 * =========================================================
 */

async function loginAsTourist(page: Page) {
  await page.goto("/login");

  await page.getByLabel("Email").fill(e2eTourist.email);

  await page.getByLabel("Password").fill(e2eTourist.password);

  await page
    .getByRole("button", {
      name: "Sign in",
    })
    .click();

  /**
   * Normal tourist login should return
   * to the public homepage.
   */
  await expect(page).toHaveURL("/");
}

/**
 * =========================================================
 * Authentication
 * =========================================================
 */

test.describe("Travora authentication", () => {
  /**
   * These tests deliberately use the same
   * backend test account.
   *
   * Running them simultaneously can cause
   * refresh-session/token conflicts if the
   * backend rotates sessions on login.
   */
  test.describe.configure({
    mode: "serial",
  });

  test("normal tourist login returns to the public homepage", async ({
    page,
  }) => {
    await loginAsTourist(page);

    await expect(
      page.getByRole("heading", {
        name: /sri lanka, shaped around you/i,
      }),
    ).toBeVisible();
  });

  test("guest accessing tourist dashboard is redirected to login", async ({
    page,
  }) => {
    await page.goto("/tourist");

    await expect(page).toHaveURL(/\/login\?returnUrl=/);

    const currentUrl = new URL(page.url());

    expect(currentUrl.searchParams.get("returnUrl")).toBe("/tourist");
  });

  test("returnUrl sends tourist back to the protected page after login", async ({
    page,
  }) => {
    await page.goto("/tourist/requests/new");

    await expect(page).toHaveURL(/\/login\?returnUrl=/);

    await page.getByLabel("Email").fill(e2eTourist.email);

    await page.getByLabel("Password").fill(e2eTourist.password);

    await page
      .getByRole("button", {
        name: "Sign in",
      })
      .click();

    await expect(page).toHaveURL(/\/tourist\/requests\/new/);

    await expect(
      page.getByRole("heading", {
        name: /tell us about your trip/i,
      }),
    ).toBeVisible();
  });

  test("logged-in tourist can open the tourist dashboard", async ({ page }) => {
    await loginAsTourist(page);

    /**
     * Navigate directly to a protected
     * tourist route after authentication.
     */
    await page.goto("/tourist");

    /**
     * First verify that authentication
     * allowed us to remain on the route.
     */
    await expect(page).toHaveURL("/tourist");

    /**
     * Then verify actual dashboard content.
     */
    await expect(
      page.getByRole("heading", {
        name: /my travel dashboard/i,
      }),
    ).toBeVisible({
      timeout: 10_000,
    });
  });
});