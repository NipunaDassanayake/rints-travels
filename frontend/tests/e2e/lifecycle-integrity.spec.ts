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

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api";

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
 * =========================================================
 * Fixture Runner
 * =========================================================
 *
 * Invokes backend/scripts/prepare-lifecycle-integrity-e2e.js
 * with the given scenario name and returns its parsed JSON
 * output. Each scenario seeds data through either the real
 * service layer (quotation-sent, two-drafts) or, for the
 * legacy-* scenarios, direct rows representing a state CR-006's
 * guards make unreachable through the application going
 * forward.
 */

async function runLifecycleFixture<T>(scenario: string): Promise<T> {
  const scriptPath = path.resolve(
    process.cwd(),
    "../backend/scripts/prepare-lifecycle-integrity-e2e.js",
  );

  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    [scriptPath, scenario],
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
    console.log(`E2E fixture (${scenario}) stderr:`, stderr.trim());
  }

  const fixtureLine = stdout
    .split(/\r?\n/)
    .find((line) => line.startsWith("E2E_FIXTURE_JSON="));

  if (!fixtureLine) {
    throw new Error(
      `Unable to find E2E fixture output for scenario "${scenario}".\n\nBackend output:\n${stdout}`,
    );
  }

  const json = fixtureLine.slice("E2E_FIXTURE_JSON=".length);

  return JSON.parse(json) as T;
}

interface QuotationSentFixture {
  tourRequestId: string;
  quotationId: string;
  touristId: string;
  touristEmail: string;
}

interface TwoDraftsFixture {
  tourRequestId: string;
  quotationAId: string;
  quotationBId: string;
}

interface LegacyQuotationFixture {
  tourRequestId: string;
  quotationId: string;
}

interface LegacyConfirmBookingFixture {
  tourRequestId: string;
  quotationId: string;
  paymentId: string;
  bookingCreated: boolean;
  bookingExists: boolean;
  blockedReason: string | null;
  requestStatus: string;
}

async function getTourRequestStatus(page: Page, authHeader: string, id: string) {
  const response = await page.request.get(
    `${API_BASE_URL}/tour-requests/${id}`,
    {
      headers: {
        Authorization: authHeader,
      },
    },
  );

  const body = await response.json();

  return body.data.status as string;
}

async function getQuotationStatus(page: Page, authHeader: string, id: string) {
  const response = await page.request.get(`${API_BASE_URL}/quotations/${id}`, {
    headers: {
      Authorization: authHeader,
    },
  });

  const body = await response.json();

  return body.data.status as string;
}

test.describe("Tour request lifecycle integrity", () => {
  test.describe.configure({
    mode: "serial",
  });

  /**
   * =========================================================
   * A. Rejection Semantics
   * =========================================================
   */

  test("tourist rejecting a quotation returns the request to UNDER_DISCUSSION, not REJECTED", async ({
    page,
  }) => {
    const fixture = await runLifecycleFixture<QuotationSentFixture>(
      "quotation-sent",
    );

    await loginAsTourist(page);

    const touristAuthHeader = await captureAuthorizationHeader(
      page,
      "/tourist/quotations",
    );

    const rejectResponse = await page.request.post(
      `${API_BASE_URL}/quotations/${fixture.quotationId}/reject`,
      {
        headers: {
          Authorization: touristAuthHeader,
        },

        data: {
          reason: "Budget too high",
        },
      },
    );

    expect(rejectResponse.ok()).toBeTruthy();

    const rejectedQuotation = (await rejectResponse.json()).data;

    expect(rejectedQuotation.status).toBe("REJECTED");

    await clearSession(page);

    await loginAsAdmin(page);

    await page.goto(`/admin/tour-requests/${fixture.tourRequestId}`);

    await expect(
      page.getByText("Under Discussion", { exact: true }).first(),
    ).toBeVisible({
      timeout: 10_000,
    });

    /**
     * The request must never have been forced to the terminal
     * REJECTED status by a tourist's quotation rejection.
     */
    const adminAuthHeader = await captureAuthorizationHeader(
      page,
      `/admin/tour-requests/${fixture.tourRequestId}`,
    );

    expect(
      await getTourRequestStatus(page, adminAuthHeader, fixture.tourRequestId),
    ).toBe("UNDER_DISCUSSION");

    /**
     * The admin can still move the conversation forward: create
     * a revision of the rejected quotation and send it.
     */
    const revisionResponse = await page.request.post(
      `${API_BASE_URL}/quotations/${fixture.quotationId}/revisions`,
      {
        headers: {
          Authorization: adminAuthHeader,
        },

        data: {},
      },
    );

    expect(revisionResponse.ok()).toBeTruthy();

    const revision = (await revisionResponse.json()).data;

    const sendResponse = await page.request.post(
      `${API_BASE_URL}/quotations/${revision.id}/send`,
      {
        headers: {
          Authorization: adminAuthHeader,
        },
      },
    );

    expect(sendResponse.ok()).toBeTruthy();

    expect(
      await getTourRequestStatus(page, adminAuthHeader, fixture.tourRequestId),
    ).toBe("QUOTATION_SENT");
  });

  /**
   * =========================================================
   * B. Closing A Request Supersedes Open Quotations
   * =========================================================
   */

  test("tourist cancelling a QUOTATION_SENT request supersedes the sent quotation", async ({
    page,
  }) => {
    const fixture = await runLifecycleFixture<QuotationSentFixture>(
      "quotation-sent",
    );

    await loginAsTourist(page);

    const authHeader = await captureAuthorizationHeader(
      page,
      "/tourist/requests",
    );

    const cancelResponse = await page.request.patch(
      `${API_BASE_URL}/tour-requests/${fixture.tourRequestId}/cancel`,
      {
        headers: {
          Authorization: authHeader,
        },
      },
    );

    expect(cancelResponse.ok()).toBeTruthy();

    expect(
      await getQuotationStatus(page, authHeader, fixture.quotationId),
    ).toBe("SUPERSEDED");

    const acceptAttempt = await page.request.post(
      `${API_BASE_URL}/quotations/${fixture.quotationId}/accept`,
      {
        headers: {
          Authorization: authHeader,
        },
      },
    );

    expect(acceptAttempt.status()).toBe(400);

    await page.goto(`/tourist/quotations/${fixture.quotationId}`);

    await expect(
      page.getByRole("button", { name: "Accept quotation" }),
    ).toHaveCount(0);
  });

  test("admin rejecting a request with an open draft supersedes it", async ({
    page,
  }) => {
    const fixture = await runLifecycleFixture<QuotationSentFixture>(
      "quotation-sent",
    );

    await loginAsAdmin(page);

    const authHeader = await captureAuthorizationHeader(
      page,
      `/admin/tour-requests/${fixture.tourRequestId}`,
    );

    /**
     * Recall the sent quotation first (B3's own transition),
     * then create a new draft so this test has a DRAFT to
     * supersede via admin rejection.
     */
    const recallResponse = await page.request.patch(
      `${API_BASE_URL}/tour-requests/${fixture.tourRequestId}/status`,
      {
        headers: {
          Authorization: authHeader,
        },

        data: {
          status: "UNDER_DISCUSSION",
        },
      },
    );

    expect(recallResponse.ok()).toBeTruthy();

    expect(
      await getQuotationStatus(page, authHeader, fixture.quotationId),
    ).toBe("SUPERSEDED");

    const draftResponse = await page.request.post(
      `${API_BASE_URL}/quotations/tour-request/${fixture.tourRequestId}`,
      {
        headers: {
          Authorization: authHeader,
        },

        data: {
          title: "Follow-up draft",

          startDate: "2027-01-10",

          endDate: "2027-01-17",

          adultCount: 2,

          subtotal: 900,

          totalAmount: 900,
        },
      },
    );

    expect(draftResponse.ok()).toBeTruthy();

    const draft = (await draftResponse.json()).data;

    const rejectRequestResponse = await page.request.patch(
      `${API_BASE_URL}/tour-requests/${fixture.tourRequestId}/status`,
      {
        headers: {
          Authorization: authHeader,
        },

        data: {
          status: "REJECTED",
        },
      },
    );

    expect(rejectRequestResponse.ok()).toBeTruthy();

    expect(await getQuotationStatus(page, authHeader, draft.id)).toBe(
      "SUPERSEDED",
    );

    const sendAttempt = await page.request.post(
      `${API_BASE_URL}/quotations/${draft.id}/send`,
      {
        headers: {
          Authorization: authHeader,
        },
      },
    );

    expect(sendAttempt.status()).toBe(400);
  });

  /**
   * =========================================================
   * C. Terminal Requests Cannot Be Reopened, Accepted, Paid Or
   *    Booked
   * =========================================================
   */

  test("a rejected request cannot have its (rejected) quotation revised", async ({
    page,
  }) => {
    const fixture = await runLifecycleFixture<QuotationSentFixture>(
      "quotation-sent",
    );

    await loginAsTourist(page);

    const touristAuthHeader = await captureAuthorizationHeader(
      page,
      "/tourist/quotations",
    );

    /**
     * Tourist rejects the quotation first (rule 3): the quotation
     * becomes REJECTED and the request returns to UNDER_DISCUSSION
     * -- REJECTED quotation status alone does not block a revision
     * (createRevision allows SENT or REJECTED quotations).
     */
    const rejectQuotationResponse = await page.request.post(
      `${API_BASE_URL}/quotations/${fixture.quotationId}/reject`,
      {
        headers: {
          Authorization: touristAuthHeader,
        },

        data: {},
      },
    );

    expect(rejectQuotationResponse.ok()).toBeTruthy();

    await clearSession(page);

    await loginAsAdmin(page);

    const authHeader = await captureAuthorizationHeader(
      page,
      `/admin/tour-requests/${fixture.tourRequestId}`,
    );

    expect(
      await getTourRequestStatus(page, authHeader, fixture.tourRequestId),
    ).toBe("UNDER_DISCUSSION");

    /**
     * Now the admin rejects the *overall request* (rule 2, only
     * possible from UNDER_DISCUSSION), the terminal state a
     * quotation-level rejection must never reach on its own.
     */
    const rejectRequestResponse = await page.request.patch(
      `${API_BASE_URL}/tour-requests/${fixture.tourRequestId}/status`,
      {
        headers: {
          Authorization: authHeader,
        },

        data: {
          status: "REJECTED",
        },
      },
    );

    expect(rejectRequestResponse.ok()).toBeTruthy();

    /**
     * The quotation is still REJECTED (revisable by its own
     * status), but the request-status guard must still refuse.
     */
    const revisionAttempt = await page.request.post(
      `${API_BASE_URL}/quotations/${fixture.quotationId}/revisions`,
      {
        headers: {
          Authorization: authHeader,
        },

        data: {},
      },
    );

    expect(revisionAttempt.status()).toBe(400);

    expect(
      await getTourRequestStatus(page, authHeader, fixture.tourRequestId),
    ).toBe("REJECTED");
  });

  test("a legacy cancelled request with a stranded draft cannot have it sent", async ({
    page,
  }) => {
    const fixture = await runLifecycleFixture<LegacyQuotationFixture>(
      "legacy-cancelled-draft",
    );

    await loginAsAdmin(page);

    const authHeader = await captureAuthorizationHeader(page, "/admin");

    const sendAttempt = await page.request.post(
      `${API_BASE_URL}/quotations/${fixture.quotationId}/send`,
      {
        headers: {
          Authorization: authHeader,
        },
      },
    );

    expect(sendAttempt.status()).toBe(400);

    expect(
      await getTourRequestStatus(page, authHeader, fixture.tourRequestId),
    ).toBe("CANCELLED");

    expect(
      await getQuotationStatus(page, authHeader, fixture.quotationId),
    ).toBe("DRAFT");
  });

  test("a legacy cancelled request with a stranded sent quotation cannot have it accepted", async ({
    page,
  }) => {
    const fixture = await runLifecycleFixture<LegacyQuotationFixture>(
      "legacy-cancelled-sent",
    );

    await loginAsTourist(page);

    const authHeader = await captureAuthorizationHeader(
      page,
      "/tourist/quotations",
    );

    const acceptAttempt = await page.request.post(
      `${API_BASE_URL}/quotations/${fixture.quotationId}/accept`,
      {
        headers: {
          Authorization: authHeader,
        },
      },
    );

    expect(acceptAttempt.status()).toBe(400);

    expect(
      await getTourRequestStatus(page, authHeader, fixture.tourRequestId),
    ).toBe("CANCELLED");

    expect(
      await getQuotationStatus(page, authHeader, fixture.quotationId),
    ).toBe("SENT");
  });

  test("payment cannot be initiated for a legacy cancelled request even with an accepted quotation", async ({
    page,
  }) => {
    const fixture = await runLifecycleFixture<LegacyQuotationFixture>(
      "legacy-cancelled-accepted",
    );

    await loginAsTourist(page);

    const authHeader = await captureAuthorizationHeader(
      page,
      "/tourist/payments",
    );

    const paymentsBefore = await page.request.get(
      `${API_BASE_URL}/payments/me`,
      {
        headers: {
          Authorization: authHeader,
        },
      },
    );

    const paymentCountBefore = (await paymentsBefore.json()).data.length;

    const checkoutAttempt = await page.request.post(
      `${API_BASE_URL}/payments/checkout-session`,
      {
        headers: {
          Authorization: authHeader,
        },

        data: {
          quotationId: fixture.quotationId,
        },
      },
    );

    expect(checkoutAttempt.status()).toBe(400);

    const paymentsAfter = await page.request.get(`${API_BASE_URL}/payments/me`, {
      headers: {
        Authorization: authHeader,
      },
    });

    const paymentCountAfter = (await paymentsAfter.json()).data.length;

    expect(paymentCountAfter).toBe(paymentCountBefore);
  });

  test("booking confirmation is blocked for a legacy cancelled request", async () => {
    const fixture = await runLifecycleFixture<LegacyConfirmBookingFixture>(
      "legacy-confirm-booking",
    );

    expect(fixture.bookingCreated).toBe(false);

    expect(fixture.bookingExists).toBe(false);

    expect(fixture.requestStatus).toBe("CANCELLED");

    expect(fixture.blockedReason).toContain("CANCELLED");
  });

  test("admin edit is blocked on a terminal request and rejects a missing preferred guide", async ({
    page,
  }) => {
    const cancelledFixture = await runLifecycleFixture<LegacyQuotationFixture>(
      "legacy-cancelled-draft",
    );

    await loginAsAdmin(page);

    const authHeader = await captureAuthorizationHeader(page, "/admin");

    const editOnCancelled = await page.request.patch(
      `${API_BASE_URL}/tour-requests/${cancelledFixture.tourRequestId}/admin-edit`,
      {
        headers: {
          Authorization: authHeader,
        },

        data: {
          budget: 2000,
        },
      },
    );

    expect(editOnCancelled.status()).toBe(400);

    const sentFixture = await runLifecycleFixture<QuotationSentFixture>(
      "quotation-sent",
    );

    const recallResponse = await page.request.patch(
      `${API_BASE_URL}/tour-requests/${sentFixture.tourRequestId}/status`,
      {
        headers: {
          Authorization: authHeader,
        },

        data: {
          status: "UNDER_DISCUSSION",
        },
      },
    );

    expect(recallResponse.ok()).toBeTruthy();

    const editWithMissingGuide = await page.request.patch(
      `${API_BASE_URL}/tour-requests/${sentFixture.tourRequestId}/admin-edit`,
      {
        headers: {
          Authorization: authHeader,
        },

        data: {
          preferredGuideId: "00000000-0000-0000-0000-000000000000",
        },
      },
    );

    expect(editWithMissingGuide.status()).toBe(404);
  });

  /**
   * =========================================================
   * D. Single Live Offer
   * =========================================================
   */

  test("sending a second quotation supersedes the first; only the second can be accepted", async ({
    page,
  }) => {
    const fixture = await runLifecycleFixture<TwoDraftsFixture>("two-drafts");

    await loginAsAdmin(page);

    const authHeader = await captureAuthorizationHeader(page, "/admin");

    const sendA = await page.request.post(
      `${API_BASE_URL}/quotations/${fixture.quotationAId}/send`,
      {
        headers: {
          Authorization: authHeader,
        },
      },
    );

    expect(sendA.ok()).toBeTruthy();

    const sendB = await page.request.post(
      `${API_BASE_URL}/quotations/${fixture.quotationBId}/send`,
      {
        headers: {
          Authorization: authHeader,
        },
      },
    );

    expect(sendB.ok()).toBeTruthy();

    expect(
      await getQuotationStatus(page, authHeader, fixture.quotationAId),
    ).toBe("SUPERSEDED");

    expect(
      await getQuotationStatus(page, authHeader, fixture.quotationBId),
    ).toBe("SENT");

    await clearSession(page);

    await loginAsTourist(page);

    const touristAuthHeader = await captureAuthorizationHeader(
      page,
      "/tourist/quotations",
    );

    const acceptA = await page.request.post(
      `${API_BASE_URL}/quotations/${fixture.quotationAId}/accept`,
      {
        headers: {
          Authorization: touristAuthHeader,
        },
      },
    );

    expect(acceptA.status()).toBe(400);

    const acceptB = await page.request.post(
      `${API_BASE_URL}/quotations/${fixture.quotationBId}/accept`,
      {
        headers: {
          Authorization: touristAuthHeader,
        },
      },
    );

    expect(acceptB.ok()).toBeTruthy();

    expect(
      await getTourRequestStatus(
        page,
        touristAuthHeader,
        fixture.tourRequestId,
      ),
    ).toBe("ACCEPTED");
  });

  /**
   * =========================================================
   * E. Concurrency
   * =========================================================
   */

  test("concurrent accept and cancel on the same request never both succeed", async ({
    page,
  }) => {
    const fixture = await runLifecycleFixture<QuotationSentFixture>(
      "quotation-sent",
    );

    await loginAsTourist(page);

    const authHeader = await captureAuthorizationHeader(
      page,
      "/tourist/requests",
    );

    const [acceptResponse, cancelResponse] = await Promise.all([
      page.request.post(
        `${API_BASE_URL}/quotations/${fixture.quotationId}/accept`,
        {
          headers: {
            Authorization: authHeader,
          },
        },
      ),

      page.request.patch(
        `${API_BASE_URL}/tour-requests/${fixture.tourRequestId}/cancel`,
        {
          headers: {
            Authorization: authHeader,
          },
        },
      ),
    ]);

    const outcomes = [acceptResponse.status(), cancelResponse.status()];

    const successCount = outcomes.filter(
      (status) => status >= 200 && status < 300,
    ).length;

    const failureCount = outcomes.filter(
      (status) => status === 400 || status === 409,
    ).length;

    expect(successCount).toBe(1);

    expect(failureCount).toBe(1);

    const finalRequestStatus = await getTourRequestStatus(
      page,
      authHeader,
      fixture.tourRequestId,
    );

    const finalQuotationStatus = await getQuotationStatus(
      page,
      authHeader,
      fixture.quotationId,
    );

    const isConsistentAccepted =
      finalRequestStatus === "ACCEPTED" && finalQuotationStatus === "ACCEPTED";

    const isConsistentCancelled =
      finalRequestStatus === "CANCELLED" &&
      finalQuotationStatus === "SUPERSEDED";

    expect(isConsistentAccepted || isConsistentCancelled).toBe(true);

    /**
     * The one combination CR-006 exists to prevent.
     */
    expect(
      finalRequestStatus === "CANCELLED" && finalQuotationStatus === "ACCEPTED",
    ).toBe(false);
  });

  test("concurrent double-accept of the same quotation never both succeed", async ({
    page,
  }) => {
    const fixture = await runLifecycleFixture<QuotationSentFixture>(
      "quotation-sent",
    );

    await loginAsTourist(page);

    const authHeader = await captureAuthorizationHeader(
      page,
      "/tourist/requests",
    );

    const acceptOnce = () =>
      page.request.post(
        `${API_BASE_URL}/quotations/${fixture.quotationId}/accept`,
        {
          headers: {
            Authorization: authHeader,
          },
        },
      );

    const [first, second] = await Promise.all([acceptOnce(), acceptOnce()]);

    const outcomes = [first.status(), second.status()];

    const successCount = outcomes.filter(
      (status) => status >= 200 && status < 300,
    ).length;

    const failureCount = outcomes.filter(
      (status) => status === 400 || status === 409,
    ).length;

    expect(successCount).toBe(1);

    expect(failureCount).toBe(1);

    expect(
      await getTourRequestStatus(page, authHeader, fixture.tourRequestId),
    ).toBe("ACCEPTED");
  });
});
