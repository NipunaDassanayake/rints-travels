import { expect, test } from "@playwright/test";

test.describe("Travora public pages", () => {
  test("homepage loads successfully", async ({ page, isMobile }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: /your journey,\s*your way/i,
      }),
    ).toBeVisible();

    if (isMobile) {
      const menuButton = page.getByRole("button", {
        name: /open navigation|toggle navigation|menu/i,
      });

      await expect(menuButton).toBeVisible();

      await menuButton.click();

      await expect(
        page.getByRole("link", {
          name: "Packages",
          exact: true,
        }),
      ).toBeVisible();

      await expect(
        page.getByRole("link", {
          name: "Tour Guides",
          exact: true,
        }),
      ).toBeVisible();
    } else {
      await expect(
        page.getByRole("link", {
          name: "Packages",
          exact: true,
        }),
      ).toBeVisible();

      await expect(
        page.getByRole("link", {
          name: "Tour Guides",
          exact: true,
        }),
      ).toBeVisible();
    }
  });

  test("packages page loads", async ({ page }) => {
    await page.goto("/packages");

    await expect(
      page.getByRole("heading", {
        name: /travel packages built to inspire your journey/i,
      }),
    ).toBeVisible();

    await expect(page.getByText(/browse our travel templates/i)).toBeVisible();
  });

  test("guides page loads", async ({ page }) => {
    await page.goto("/guides");

    await expect(
      page.getByRole("heading", {
        name: /meet our tour guides/i,
      }),
    ).toBeVisible();
  });
});