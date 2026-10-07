import { expect, test, type Page } from "@playwright/test";

const TOURIST_EMAIL = "nipuna@example.com";

const TOURIST_PASSWORD = "Password123";

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