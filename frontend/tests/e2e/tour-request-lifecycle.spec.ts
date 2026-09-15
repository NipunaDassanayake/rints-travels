import { expect, test, type Page } from "@playwright/test";

import crypto from "node:crypto";

/**
 * =========================================================
 * Test Users
 * =========================================================
 */

const TOURIST_EMAIL = process.env.E2E_TOURIST_EMAIL ?? "nipuna@example.com";

const TOURIST_PASSWORD = process.env.E2E_TOURIST_PASSWORD ?? "Password123";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@travora.com";

const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "Admin12345";

const ADMIN_NAME = process.env.E2E_ADMIN_NAME ?? "Travora Admin";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api";

/**
 * =========================================================
 * Helpers
 * =========================================================
 */

function uniqueTitle(label: string) {
  return `Playwright ${label} ${Date.now()}`;
}

function uniqueEmail(label: string) {
  const suffix = `${Date.now()}-${crypto
    .randomBytes(3)
    .toString("hex")
    .toUpperCase()}`;

  return `e2e-tour-request-${label}-${suffix}@travora.com`.toLowerCase();
}

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

async function loginAsTourist(page: Page) {
  await login(page, TOURIST_EMAIL, TOURIST_PASSWORD);
}

async function loginAsAdmin(page: Page) {
  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

  await expect(page).toHaveURL(/\/admin/, {
    timeout: 10_000,
  });
}

async function captureAuthorizationHeader(page: Page, visitPath: string) {
  const requestPromise = page.waitForRequest(
    (request) =>
      request.url().startsWith(API_BASE_URL) &&
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
 * Tourist creates a minimal custom tour request and lands on its
 * detail page. Returns the created request ID.
 */
async function createCustomTourRequest(
  page: Page,
  title: string,
): Promise<string> {
  await page.goto("/tourist/requests/new");

  await expect(
    page.getByRole("heading", {
      name: /tell us about your trip/i,
    }),
  ).toBeVisible();

  await page
    .getByRole("radio", {
      name: /create from scratch/i,
    })
    .check();

  await page.getByLabel("Trip title").fill(title);

  await page.getByLabel("Destination preferences").fill("Galle and Mirissa");

  await page.getByLabel("Preferred start date").fill("2026-12-01");

  await page.getByLabel("Preferred end date").fill("2026-12-07");

  await page.getByLabel("Adults").fill("2");

  await page.getByLabel("Children").fill("0");

  await page
    .getByRole("button", {
      name: "Submit tour request",
    })
    .click();

  await expect(page).toHaveURL(/\/tourist\/requests\/[^/]+$/, {
    timeout: 10_000,
  });

  await expect(
    page.getByText(title, {
      exact: true,
    }),
  ).toBeVisible({
    timeout: 10_000,
  });

  const url = new URL(page.url());

  const requestId = url.pathname.split("/").filter(Boolean).at(-1);

  if (!requestId) {
    throw new Error("Unable to determine created tour request ID.");
  }

  return requestId;
}

/**
 * Drives a PENDING_REVIEW request all the way through to
 * QUOTATION_SENT, as the admin. Assumes the caller is already on
 * `/admin/tour-requests/{requestId}`.
 */
async function driveRequestToQuotationSent(page: Page) {
  await page
    .getByRole("button", {
      name: "Start discussion",
    })
    .click();

  const readyButton = page.getByRole("button", {
    name: "Mark ready for quotation",
  });

  await expect(readyButton).toBeVisible({
    timeout: 10_000,
  });

  await readyButton.click();

  const createQuotationButton = page.getByRole("button", {
    name: "Create quotation",
  });

  await expect(createQuotationButton).toBeVisible({
    timeout: 10_000,
  });

  await createQuotationButton.click();

  await page
    .getByLabel("Subtotal", {
      exact: true,
    })
    .fill("1500");

  const createDraftButton = page.getByRole("button", {
    name: "Create draft quotation",
  });

  await expect(createDraftButton).toBeEnabled();

  await createDraftButton.click();

  await expect(
    page
      .getByText("Draft", {
        exact: true,
      })
      .first(),
  ).toBeVisible({
    timeout: 10_000,
  });

  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });

  await page
    .getByRole("button", {
      name: "Send quotation",
    })
    .click();

  await expect(
    page
      .getByText("Quotation Sent", {
        exact: true,
      })
      .first(),
  ).toBeVisible({
    timeout: 10_000,
  });
}

/**
 * =========================================================
 * Tourist Self-Cancellation
 * =========================================================
 */

test.describe("Tourist tour request cancellation", () => {
  test.describe.configure({
    mode: "serial",
  });

  test("tourist can cancel their own pending request", async ({ page }) => {
    await loginAsTourist(page);

    const title = uniqueTitle("Cancel Pending");

    await createCustomTourRequest(page, title);

    const cancelTrigger = page.getByRole("button", {
      name: "Cancel request",
    });

    await expect(cancelTrigger).toBeVisible();

    /**
     * Dismissing the confirmation must NOT cancel the request.
     */
    await cancelTrigger.click();

    await expect(
      page.getByText("Cancel this request?", { exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Keep request" }).click();

    await expect(
      page.getByText("Cancel this request?", { exact: true }),
    ).toHaveCount(0);

    /**
     * Confirm cancellation.
     */
    await cancelTrigger.click();

    const cancelResponsePromise = page.waitForResponse(
      (response) =>
        /\/tour-requests\/[^/]+\/cancel$/.test(response.url()) &&
        response.request().method() === "PATCH",
    );

    await page.getByRole("button", { name: "Yes, cancel request" }).click();

    const cancelResponse = await cancelResponsePromise;

    expect(cancelResponse.ok()).toBeTruthy();

    await expect(
      page.getByText("Cancelled", { exact: true }).first(),
    ).toBeVisible({
      timeout: 10_000,
    });

    await expect(
      page.getByRole("button", { name: "Cancel request" }),
    ).toHaveCount(0);
  });

  test("the tourist-only cancel endpoint rejects an admin caller", async ({
    page,
  }) => {
    await loginAsTourist(page);

    const title = uniqueTitle("Cancel Guard");

    const requestId = await createCustomTourRequest(page, title);

    await clearSession(page);

    await loginAsAdmin(page);

    await page.goto(`/admin/tour-requests/${requestId}`);

    const authHeader = await captureAuthorizationHeader(
      page,
      `/admin/tour-requests/${requestId}`,
    );

    /**
     * PATCH /:id/cancel is authorize(TOURIST)-only. An admin
     * calling it directly must be rejected regardless of the
     * request's current status or admin assignment.
     */
    const adminCancelAttempt = await page.request.patch(
      `${API_BASE_URL}/tour-requests/${requestId}/cancel`,
      {
        headers: {
          Authorization: authHeader,
        },
      },
    );

    expect(adminCancelAttempt.status()).toBe(403);
  });
});

/**
 * =========================================================
 * Admin Reject / Cancel Actions
 * =========================================================
 */

test.describe("Admin reject and cancel actions", () => {
  test.describe.configure({
    mode: "serial",
  });

  test("admin can reject a request under discussion", async ({ page }) => {
    await loginAsTourist(page);

    const title = uniqueTitle("Reject Flow");

    const requestId = await createCustomTourRequest(page, title);

    await clearSession(page);

    await loginAsAdmin(page);

    await page.goto(`/admin/tour-requests/${requestId}`);

    await page
      .getByRole("button", {
        name: "Start discussion",
      })
      .click();

    const rejectTrigger = page.getByRole("button", {
      name: "Reject request",
    });

    await expect(rejectTrigger).toBeVisible({
      timeout: 10_000,
    });

    await rejectTrigger.click();

    await expect(
      page.getByText("Reject this request?", { exact: true }),
    ).toBeVisible();

    const statusResponsePromise = page.waitForResponse(
      (response) =>
        /\/tour-requests\/[^/]+\/status$/.test(response.url()) &&
        response.request().method() === "PATCH",
    );

    await page.getByRole("button", { name: "Yes, reject request" }).click();

    const statusResponse = await statusResponsePromise;

    expect(statusResponse.ok()).toBeTruthy();

    await expect(
      page.getByText("Rejected", { exact: true }).first(),
    ).toBeVisible({
      timeout: 10_000,
    });

    await expect(
      page.getByText("This request has been rejected.", { exact: true }),
    ).toBeVisible();
  });

  test("admin can cancel a request that has a sent quotation", async ({
    page,
  }) => {
    await loginAsTourist(page);

    const title = uniqueTitle("Admin Cancel Sent");

    const requestId = await createCustomTourRequest(page, title);

    await clearSession(page);

    await loginAsAdmin(page);

    await page.goto(`/admin/tour-requests/${requestId}`);

    await driveRequestToQuotationSent(page);

    const cancelTrigger = page.getByRole("button", {
      name: "Cancel request",
    });

    await expect(cancelTrigger).toBeVisible();

    await cancelTrigger.click();

    await expect(
      page.getByText("Cancel this request?", { exact: true }),
    ).toBeVisible();

    const statusResponsePromise = page.waitForResponse(
      (response) =>
        /\/tour-requests\/[^/]+\/status$/.test(response.url()) &&
        response.request().method() === "PATCH",
    );

    await page.getByRole("button", { name: "Yes, cancel request" }).click();

    const statusResponse = await statusResponsePromise;

    expect(statusResponse.ok()).toBeTruthy();

    await expect(
      page.getByText("Cancelled", { exact: true }).first(),
    ).toBeVisible({
      timeout: 10_000,
    });

    await expect(
      page.getByRole("button", { name: "Cancel request" }),
    ).toHaveCount(0);
  });
});

/**
 * =========================================================
 * Admin Assignment
 * =========================================================
 */

test.describe("Admin assignment", () => {
  test("admin can assign an admin to a tour request", async ({ page }) => {
    await loginAsTourist(page);

    const title = uniqueTitle("Assignment Flow");

    const requestId = await createCustomTourRequest(page, title);

    await clearSession(page);

    await loginAsAdmin(page);

    await page.goto(`/admin/tour-requests/${requestId}`);

    await expect(
      page.getByText("Not assigned", { exact: true }),
    ).toBeVisible();

    await page.getByLabel("Assign to").selectOption({ label: ADMIN_NAME });

    const assignResponsePromise = page.waitForResponse(
      (response) =>
        /\/tour-requests\/[^/]+\/assign-admin$/.test(response.url()) &&
        response.request().method() === "PATCH",
    );

    await page.getByRole("button", { name: "Assign" }).click();

    const assignResponse = await assignResponsePromise;

    expect(assignResponse.ok()).toBeTruthy();

    const assignedAdminValue = page
      .getByText("Assigned admin", { exact: true })
      .locator("xpath=following-sibling::p[1]");

    await expect(assignedAdminValue).toHaveText(ADMIN_NAME, {
      timeout: 10_000,
    });
  });
});

/**
 * =========================================================
 * Cross-Tenant Authorization
 * =========================================================
 */

test.describe("Cross-tenant tour request authorization", () => {
  test("a tourist cannot view or cancel another tourist's request", async ({
    page,
  }) => {
    await loginAsTourist(page);

    const title = uniqueTitle("Cross Tenant");

    const ownerRequestId = await createCustomTourRequest(page, title);

    await clearSession(page);

    /**
     * Register a throwaway second tourist directly against the
     * API so this spec does not depend on any other seeded
     * account.
     */
    const otherEmail = uniqueEmail("owner-b");

    const otherPassword = "OtherTourist123";

    const registerResponse = await page.request.post(
      `${API_BASE_URL}/auth/register`,
      {
        data: {
          firstName: "Playwright",
          lastName: "OwnerB",
          email: otherEmail,
          password: otherPassword,
        },
      },
    );

    expect(registerResponse.ok()).toBeTruthy();

    await login(page, otherEmail, otherPassword);

    /**
     * UI-level check: the detail page must not render tourist A's
     * request for tourist B.
     */
    await page.goto(`/tourist/requests/${ownerRequestId}`);

    await expect(
      page.getByRole("heading", { name: "Unable to load request" }),
    ).toBeVisible({
      timeout: 10_000,
    });

    /**
     * API-level check: both viewing and cancelling must be
     * rejected with 403, not silently scoped/filtered.
     */
    const authHeader = await captureAuthorizationHeader(
      page,
      "/tourist/requests",
    );

    const viewAttempt = await page.request.get(
      `${API_BASE_URL}/tour-requests/${ownerRequestId}`,
      {
        headers: {
          Authorization: authHeader,
        },
      },
    );

    expect(viewAttempt.status()).toBe(403);

    const cancelAttempt = await page.request.patch(
      `${API_BASE_URL}/tour-requests/${ownerRequestId}/cancel`,
      {
        headers: {
          Authorization: authHeader,
        },
      },
    );

    expect(cancelAttempt.status()).toBe(403);
  });
});
