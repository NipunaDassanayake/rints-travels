import { expect, test, type Page } from "@playwright/test";

import crypto from "node:crypto";

/**
 * =========================================================
 * Test Data
 * =========================================================
 *
 * Every test generates its own unique email so this spec
 * never touches the shared seeded accounts other specs
 * (auth.spec.ts, booking-lifecycle.spec.ts, etc.) rely on.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api";

const PASSWORD = "RegisterE2e123";

function uniqueEmail(label: string) {
  const suffix = `${Date.now()}-${crypto
    .randomBytes(3)
    .toString("hex")
    .toUpperCase()}`;

  return `e2e-register-${label}-${suffix}@travora.com`.toLowerCase();
}

/**
 * =========================================================
 * Helpers
 * =========================================================
 */

async function fillRegistrationForm(
  page: Page,
  {
    firstName = "Playwright",
    lastName = "Tourist",
    email,
    password = PASSWORD,
  }: {
    firstName?: string;
    lastName?: string;
    email: string;
    password?: string;
  },
) {
  await page.goto("/register");

  await page.getByLabel("First name").fill(firstName);

  await page.getByLabel("Last name").fill(lastName);

  await page.getByLabel("Email").fill(email);

  await page.getByLabel("Password").fill(password);
}

/**
 * =========================================================
 * Tourist Registration
 * =========================================================
 */

test.describe("Travora tourist registration", () => {
  test.describe.configure({
    mode: "serial",
  });

  test("a new tourist can register and then log in", async ({ page }) => {
    const email = uniqueEmail("success");

    await fillRegistrationForm(page, { email });

    const registerResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/auth/register") &&
        response.request().method() === "POST",
    );

    await page.getByRole("button", { name: "Create account" }).click();

    const registerResponse = await registerResponsePromise;

    expect(registerResponse.ok()).toBeTruthy();

    const body = await registerResponse.json();

    expect(body.data.role).toBe("TOURIST");

    await expect(
      page.getByText("Account created", { exact: true }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Continue to sign in" }).click();

    await expect(page).toHaveURL("/login");

    await page.getByLabel("Email").fill(email);

    await page.getByLabel("Password").fill(PASSWORD);

    await page.getByRole("button", { name: "Sign in" }).click();

    /**
     * Normal tourist login returns to the public
     * homepage (see auth.spec.ts) -- confirm the new
     * account is genuinely authenticated by then
     * opening the protected tourist dashboard directly.
     */

    await expect(page).toHaveURL("/");

    await page.goto("/tourist");

    await expect(page).toHaveURL("/tourist");

    await expect(
      page.getByRole("heading", { name: /my travel dashboard/i }),
    ).toBeVisible({
      timeout: 10_000,
    });
  });

  test("registering with an email that already exists is rejected", async ({
    page,
  }) => {
    const email = uniqueEmail("duplicate");

    await fillRegistrationForm(page, { email });

    await page.getByRole("button", { name: "Create account" }).click();

    await expect(
      page.getByText("Account created", { exact: true }),
    ).toBeVisible();

    /**
     * Attempt the same email again.
     */

    await fillRegistrationForm(page, { email });

    const duplicateResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/auth/register") &&
        response.request().method() === "POST",
    );

    await page.getByRole("button", { name: "Create account" }).click();

    const duplicateResponse = await duplicateResponsePromise;

    expect(duplicateResponse.ok()).toBeFalsy();

    await expect(
      page.getByText("An account with this email already exists", {
        exact: true,
      }),
    ).toBeVisible();

    await expect(page).toHaveURL("/register");
  });

  test("an invalid password is rejected client-side before submission", async ({
    page,
  }) => {
    const email = uniqueEmail("invalid-password");

    await fillRegistrationForm(page, {
      email,
      password: "weakpassword",
    });

    let requestSent = false;

    page.on("request", (request) => {
      if (request.url().endsWith("/auth/register")) {
        requestSent = true;
      }
    });

    await page.getByRole("button", { name: "Create account" }).click();

    await expect(
      page.getByText("Password must contain an uppercase letter", {
        exact: true,
      }),
    ).toBeVisible();

    expect(requestSent).toBeFalsy();

    await expect(
      page.getByText("Account created", { exact: true }),
    ).toHaveCount(0);
  });

  test("a caller cannot register themselves as an elevated role", async ({
    page,
  }) => {
    const email = uniqueEmail("escalation");

    const response = await page.request.post(
      `${API_BASE_URL}/auth/register`,
      {
        data: {
          firstName: "Playwright",
          lastName: "Escalation",
          email,
          password: PASSWORD,
          role: "ADMIN",
        },
      },
    );

    expect(response.ok()).toBeTruthy();

    const body = await response.json();

    expect(body.data.role).toBe("TOURIST");
  });

  test("the submit button is disabled while registration is pending", async ({
    page,
  }) => {
    const email = uniqueEmail("pending");

    await fillRegistrationForm(page, { email });

    /**
     * Delay the response so the pending/disabled state
     * is reliably observable instead of racing a fast
     * local response.
     */

    await page.route("**/auth/register", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));

      await route.continue();
    });

    const submitButton = page.getByRole("button", { name: "Create account" });

    await submitButton.click();

    await expect(
      page.getByRole("button", { name: "Creating account..." }),
    ).toBeDisabled();

    await expect(
      page.getByText("Account created", { exact: true }),
    ).toBeVisible({
      timeout: 10_000,
    });
  });

  test("login and registration pages link to each other", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.getByRole("link", { name: "Create one" }).click();

    await expect(page).toHaveURL("/register");

    await page.getByRole("link", { name: "Sign in" }).click();

    await expect(page).toHaveURL("/login");
  });
});
