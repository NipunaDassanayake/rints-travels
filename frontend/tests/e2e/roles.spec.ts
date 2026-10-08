import { expect, test, type Page } from "@playwright/test";

import { createFixtureTourist, type FixtureTourist } from "./support/fixture-identities";

/**
 * Throwaway tourist created per run (CR-032 Stage 3A) -- never a real
 * account. The standard E2E cleanup deletes it and everything it owns.
 */
let e2eTourist: FixtureTourist;

test.beforeAll(async () => {
  e2eTourist = await createFixtureTourist("roles");
});

async function loginAsTourist(page: Page) {
  await page.goto("/login");

  await page.getByLabel("Email").fill(e2eTourist.email);

  await page.getByLabel("Password").fill(e2eTourist.password);

  await page
    .getByRole("button", {
      name: "Sign in",
    })
    .click();

  await expect(page).toHaveURL("/");
}

test.describe("Travora role protection", () => {
  test.describe.configure({
    mode: "serial",
  });

  test("guest cannot access admin portal", async ({ page }) => {
    await page.goto("/admin");

    await expect(page).toHaveURL(/\/login\?returnUrl=/);

    const currentUrl = new URL(page.url());

    expect(currentUrl.searchParams.get("returnUrl")).toBe("/admin");
  });

  test("guest cannot access guide portal", async ({ page }) => {
    await page.goto("/guide");

    await expect(page).toHaveURL(/\/login\?returnUrl=/);

    const currentUrl = new URL(page.url());

    expect(currentUrl.searchParams.get("returnUrl")).toBe("/guide");
  });

  test("tourist cannot access admin portal", async ({ page }) => {
    await loginAsTourist(page);

    await page.goto("/admin");

    await expect(page).toHaveURL("/tourist");

    await expect(
      page.getByRole("heading", {
        name: /my travel dashboard/i,
      }),
    ).toBeVisible({
      timeout: 10_000,
    });
  });

  test("tourist cannot access guide portal", async ({ page }) => {
    await loginAsTourist(page);

    await page.goto("/guide");

    await expect(page).toHaveURL("/tourist");

    await expect(
      page.getByRole("heading", {
        name: /my travel dashboard/i,
      }),
    ).toBeVisible({
      timeout: 10_000,
    });
  });
});