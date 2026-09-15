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

const GUIDE_EMAIL = process.env.E2E_GUIDE_EMAIL ?? "nimal.guide@travora.com";

const GUIDE_PASSWORD = process.env.E2E_GUIDE_PASSWORD ?? "Guide12345";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api";

/**
 * =========================================================
 * Fixture Type
 * =========================================================
 */

interface QuotationRevisionFixture {
  tourRequestId: string;

  quotationId: string;

  quotationNumber: string;

  revisionNumber: number;

  touristId: string;

  touristEmail: string;

  status: "SENT";
}

let fixtureA: QuotationRevisionFixture | undefined;

let fixtureB: QuotationRevisionFixture | undefined;

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

async function loginAsAdmin(page: Page) {
  await clearSession(page);

  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
}

/**
 * Captures the Bearer Authorization header the app attaches
 * to an authenticated API request.
 *
 * Travora stores the access token in-memory only (no cookie,
 * no localStorage) -- see frontend/src/lib/auth/tokenStore.ts
 * -- so a direct `page.request` call to a protected endpoint
 * needs this header rather than relying on shared session
 * cookies.
 */
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
 * =========================================================
 * Prepare Fresh Backend Fixture
 * =========================================================
 *
 * Playwright is normally executed from:
 *
 * rints-travels/frontend
 *
 * Therefore backend is one directory above.
 */

async function createQuotationRevisionFixture(): Promise<QuotationRevisionFixture> {
  const scriptPath = path.resolve(
    process.cwd(),
    "../backend/scripts/prepare-quotation-revision-e2e.js",
  );

  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    [scriptPath],
    {
      env: {
        ...process.env,

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

  const result = JSON.parse(json) as QuotationRevisionFixture;

  if (!result.quotationId) {
    throw new Error("E2E fixture did not return a quotation ID.");
  }

  if (result.status !== "SENT") {
    throw new Error(
      `Expected fixture quotation to be SENT but received ${result.status}.`,
    );
  }

  return result;
}

/**
 * =========================================================
 * Quotation Revision
 * =========================================================
 */

test.describe("Travora quotation revision", () => {
  test.describe.configure({
    mode: "serial",
  });

  test.beforeAll(async () => {
    fixtureA = await createQuotationRevisionFixture();

    fixtureB = await createQuotationRevisionFixture();

    console.log("Created quotation revision fixtures:", {
      a: fixtureA.quotationId,
      b: fixtureB.quotationId,
    });
  });

  test("admin creates a pre-populated revision, edits it, and sends it; the tourist sees only the current version", async ({
    page,
  }) => {
    if (!fixtureA) {
      throw new Error("Fixture A was not created.");
    }

    await loginAsAdmin(page);

    await page.goto(`/admin/tour-requests/${fixtureA.tourRequestId}`);

    await expect(
      page.getByText(fixtureA.quotationNumber, { exact: true }),
    ).toBeVisible({
      timeout: 10_000,
    });

    await expect(
      page.getByText("Sent", { exact: true }).first(),
    ).toBeVisible();

    /**
     * =====================================================
     * Open the revision form and confirm it is pre-populated
     * from the existing (SENT) quotation.
     * =====================================================
     */

    const revisionTrigger = page.getByRole("button", {
      name: "Create revision",
    });

    await expect(revisionTrigger).toBeVisible();

    await revisionTrigger.click();

    const subtotalInput = page.getByLabel("Subtotal", { exact: true });

    await expect(subtotalInput).toHaveValue(/^1200(\.0+)?$/);

    /**
     * Edit a field before submitting.
     */

    await subtotalInput.fill("1300");

    /**
     * 1300 - 50 + 25 = 1275
     */

    await expect(
      page.getByText("USD 1275.00", { exact: true }),
    ).toBeVisible();

    /**
     * =====================================================
     * Submit the revision.
     * =====================================================
     */

    const reviseResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/quotations/${fixtureA!.quotationId}/revisions`) &&
        response.request().method() === "POST",
    );

    await page
      .getByRole("button", { name: "Create revision" })
      .click();

    const reviseResponse = await reviseResponsePromise;

    expect(reviseResponse.ok()).toBeTruthy();

    const reviseBody = await reviseResponse.json();

    expect(reviseBody.data.status).toBe("DRAFT");

    expect(reviseBody.data.revisionNumber).toBe(
      fixtureA.revisionNumber + 1,
    );

    expect(Number(reviseBody.data.subtotal)).toBe(1300);

    const newQuotationId = reviseBody.data.id as string;

    const newQuotationNumber = reviseBody.data.quotationNumber as string;

    /**
     * The previous quotation is preserved and superseded;
     * the new revision starts in Draft.
     */

    await expect(
      page.getByText("Superseded", { exact: true }).first(),
    ).toBeVisible({
      timeout: 10_000,
    });

    await expect(
      page.getByText("Draft", { exact: true }),
    ).toBeVisible();

    await expect(
      page.getByText(`Revision ${fixtureA.revisionNumber + 1}`, {
        exact: true,
      }),
    ).toBeVisible();

    /**
     * =====================================================
     * Send the new revision using the existing, unmodified
     * send workflow.
     * =====================================================
     */

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });

    const sendResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/quotations/${newQuotationId}/send`) &&
        response.request().method() === "POST",
    );

    await page
      .getByRole("button", { name: "Send quotation" })
      .click();

    const sendResponse = await sendResponsePromise;

    expect(sendResponse.ok()).toBeTruthy();

    await expect(
      page.getByText("Sent", { exact: true }).first(),
    ).toBeVisible({
      timeout: 10_000,
    });

    /**
     * =====================================================
     * Tourist: sees both entries, cannot act on the
     * superseded one, and can act on the current one.
     * =====================================================
     */

    await clearSession(page);

    await login(page, TOURIST_EMAIL, TOURIST_PASSWORD);

    await page.goto("/tourist/quotations");

    await expect(
      page.getByText(fixtureA.quotationNumber, { exact: true }),
    ).toBeVisible({
      timeout: 10_000,
    });

    await expect(
      page.getByText(newQuotationNumber, { exact: true }),
    ).toBeVisible();

    await page.goto(`/tourist/quotations/${fixtureA.quotationId}`);

    await expect(
      page.getByText(
        "This quotation has been replaced by a newer revision.",
        { exact: true },
      ),
    ).toBeVisible({
      timeout: 10_000,
    });

    await expect(
      page.getByRole("button", { name: "Accept quotation" }),
    ).toHaveCount(0);

    await page.goto(`/tourist/quotations/${newQuotationId}`);

    const acceptButton = page.getByRole("button", {
      name: "Accept quotation",
    });

    await expect(acceptButton).toBeVisible({
      timeout: 10_000,
    });

    await expect(acceptButton).toBeEnabled();
  });

  test("a superseded quotation cannot be revised again", async ({
    page,
  }) => {
    if (!fixtureA) {
      throw new Error("Fixture A was not created.");
    }

    await loginAsAdmin(page);

    const authHeader = await captureAuthorizationHeader(
      page,
      `/admin/tour-requests/${fixtureA.tourRequestId}`,
    );

    const response = await page.request.post(
      `${API_BASE_URL}/quotations/${fixtureA.quotationId}/revisions`,
      {
        headers: {
          Authorization: authHeader,
        },

        data: {},
      },
    );

    expect(response.status()).toBe(400);
  });

  test("tourists and guides cannot create quotation revisions directly", async ({
    page,
  }) => {
    if (!fixtureB) {
      throw new Error("Fixture B was not created.");
    }

    await clearSession(page);

    await login(page, TOURIST_EMAIL, TOURIST_PASSWORD);

    const touristAuthHeader = await captureAuthorizationHeader(
      page,
      "/tourist/quotations",
    );

    const touristResponse = await page.request.post(
      `${API_BASE_URL}/quotations/${fixtureB.quotationId}/revisions`,
      {
        headers: {
          Authorization: touristAuthHeader,
        },

        data: {},
      },
    );

    expect(touristResponse.status()).toBe(403);

    await clearSession(page);

    await login(page, GUIDE_EMAIL, GUIDE_PASSWORD);

    const guideAuthHeader = await captureAuthorizationHeader(page, "/guide");

    const guideResponse = await page.request.post(
      `${API_BASE_URL}/quotations/${fixtureB.quotationId}/revisions`,
      {
        headers: {
          Authorization: guideAuthHeader,
        },

        data: {},
      },
    );

    expect(guideResponse.status()).toBe(403);

    /**
     * The quotation must remain untouched by either attempt.
     */

    await loginAsAdmin(page);

    await page.goto(`/admin/tour-requests/${fixtureB.tourRequestId}`);

    await expect(
      page.getByText(fixtureB.quotationNumber, { exact: true }),
    ).toBeVisible({
      timeout: 10_000,
    });

    await expect(
      page.getByText("Sent", { exact: true }).first(),
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: "Create revision" }),
    ).toBeVisible();
  });

  test("the revision submit button is disabled while the request is pending", async ({
    page,
  }) => {
    if (!fixtureB) {
      throw new Error("Fixture B was not created.");
    }

    await loginAsAdmin(page);

    await page.goto(`/admin/tour-requests/${fixtureB.tourRequestId}`);

    await page
      .getByRole("button", { name: "Create revision" })
      .click();

    /**
     * Delay the response so the pending/disabled state is
     * reliably observable instead of racing a fast local
     * response.
     */

    await page.route("**/revisions", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));

      await route.continue();
    });

    const submitButton = page.getByRole("button", {
      name: "Create revision",
    });

    await submitButton.click();

    await expect(
      page.getByRole("button", { name: "Creating revision..." }),
    ).toBeDisabled();

    await expect(
      page.getByText("Superseded", { exact: true }).first(),
    ).toBeVisible({
      timeout: 10_000,
    });
  });
});
