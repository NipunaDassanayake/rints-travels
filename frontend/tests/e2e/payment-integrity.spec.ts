import { expect, test, type Page, type TestInfo } from "@playwright/test";

import { createFixtureTourist, type FixtureTourist } from "./support/fixture-identities";

import { execFile } from "node:child_process";

import path from "node:path";

import { promisify } from "node:util";

/**
 * =========================================================
 * CR-007 Stripe Payment Integrity
 * =========================================================
 *
 * Backend scenarios run through
 * backend/scripts/prepare-payment-integrity-e2e.js:
 *
 * - mock-*     Checkout Session creation against a mocked
 *              Stripe client (deterministic races/errors, no
 *              network, never the configured key).
 * - webhook-*  Signed Stripe events (test signature, local
 *              webhook secret) posted to the running backend.
 *              The backend never calls Stripe for these.
 *
 * The "real Stripe test mode" group calls the Stripe test API
 * through the backend, only after verifying the configured key
 * is an sk_test_ key. It creates and expires Checkout Sessions;
 * it never completes a payment, so nothing is ever charged.
 */

const execFileAsync = promisify(execFile);

/**
 * Throwaway tourist created per run (CR-032 Stage 3A) -- never a real
 * account. The standard E2E cleanup deletes it and everything it owns.
 */
let e2eTourist: FixtureTourist;

test.beforeAll(async () => {
  e2eTourist = await createFixtureTourist("payment-int");
});

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api";

const CHECKOUT_IN_PROGRESS_MESSAGE =
  "Your checkout session is still being prepared. Please try again in a moment.";

/**
 * =========================================================
 * Helpers
 * =========================================================
 */

async function runPaymentScenario<T>(
  scenario: string,
  ...args: string[]
): Promise<T> {
  const scriptPath = path.resolve(
    process.cwd(),
    "../backend/scripts/prepare-payment-integrity-e2e.js",
  );

  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    [scriptPath, scenario, ...args],
    {
      env: {
        ...process.env,

        E2E_TOURIST_EMAIL: e2eTourist.email,

        PAYMENT_E2E_API_BASE_URL: API_BASE_URL,
      },

      timeout: 60_000,

      maxBuffer: 4 * 1024 * 1024,
    },
  );

  const fixtureLine = stdout
    .split(/\r?\n/)
    .find((line) => line.startsWith("E2E_FIXTURE_JSON="));

  if (!fixtureLine) {
    throw new Error(
      `Unable to find payment scenario output for "${scenario}".\n\nstderr:\n${stderr}`,
    );
  }

  return JSON.parse(fixtureLine.slice("E2E_FIXTURE_JSON=".length)) as T;
}

/**
 * Backend-only scenarios do not depend on the browser, so run
 * them once instead of once per Playwright project.
 */
function skipOutsideChromium(testInfo: TestInfo) {
  test.skip(
    testInfo.project.name !== "chromium",
    "Backend payment scenarios run once, in the chromium project.",
  );
}

async function loginAsTourist(page: Page) {
  await page.context().clearCookies();

  await page.goto("/login");

  await page.getByLabel("Email").fill(e2eTourist.email);

  await page.getByLabel("Password").fill(e2eTourist.password);

  await page
    .getByRole("button", {
      name: "Sign in",
    })
    .click();

  await expect(page).not.toHaveURL(/\/login/, {
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

  const header = (await requestPromise).headers()["authorization"];

  if (!header) {
    throw new Error(`Unable to capture an Authorization header on ${visitPath}.`);
  }

  return header;
}

/**
 * =========================================================
 * Scenario Result Types
 * =========================================================
 */

interface ScenarioError {
  name: string;
  statusCode: number | null;
  message: string;
}

interface CreateCall {
  idempotencyKey: string | null;
  maxNetworkRetries: number | null;
}

interface ConcurrentCheckoutResult {
  paymentId: string;
  expiredSessionId?: string;
  results: Array<
    | { status: "fulfilled"; checkoutSessionId: string }
    | { status: "rejected"; error: ScenarioError }
  >;
  createCalls: CreateCall[];
  barrierTimedOut: boolean;
  distinctSessionsCreated: number;
  paymentCount: number;
  storedCheckoutSessionId: string | null;
}

interface StaleReplacementResult {
  paymentId: string;
  expiredSessionId: string;
  newerSessionId: string;
  returnedCheckoutSessionId: string | null;
  error: ScenarioError | null;
  createCalls: CreateCall[];
  storedCheckoutSessionId: string | null;
  paymentStatus: string;
}

interface LedgerEntry {
  status: "PROCESSING" | "PROCESSED" | "FAILED";
  failureReason: string | null;
}

interface Snapshot {
  paymentStatus: string;
  storedCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  paidAtSet: boolean;
  paymentCount: number;
  bookingCount: number;
  tourRequestStatus: string;
  ledger: Record<string, LedgerEntry | null>;
}

interface Delivery {
  status: number;
  message: string | null;
}

interface PermanentRejectionResult {
  eventId: string;
  first: Delivery;
  replay: Delivery;
  final: Snapshot;
}

function expectUntouchedPayment(snapshot: Snapshot) {
  expect(snapshot.paymentStatus).toBe("PENDING");

  expect(snapshot.stripePaymentIntentId).toBeNull();

  expect(snapshot.paidAtSet).toBe(false);

  expect(snapshot.paymentCount).toBe(1);

  expect(snapshot.bookingCount).toBe(0);

  expect(snapshot.tourRequestStatus).toBe("ACCEPTED");
}

function expectSingleConfirmedBooking(snapshot: Snapshot) {
  expect(snapshot.paymentStatus).toBe("SUCCESS");

  expect(snapshot.paidAtSet).toBe(true);

  expect(snapshot.stripePaymentIntentId).toMatch(/^pi_test_e2e_/);

  expect(snapshot.paymentCount).toBe(1);

  expect(snapshot.bookingCount).toBe(1);

  expect(snapshot.tourRequestStatus).toBe("BOOKED");
}

/**
 * =========================================================
 * A. Checkout Session Creation (mocked Stripe)
 * =========================================================
 */

test.describe("CR-007 checkout session creation (mocked Stripe)", () => {
  test.beforeEach(({}, testInfo) => {
    skipOutsideChromium(testInfo);
  });

  test("idempotency_key_in_use becomes a friendly conflict and never switches keys", async () => {
    const result = await runPaymentScenario<{
      paymentId: string;
      callErrors: ScenarioError[];
      attemptsPerCall: number[];
      idempotencyKeys: string[];
      attemptPaths: string[];
      paymentCount: number;
      storedCheckoutSessionId: string | null;
    }>("mock-idempotency-in-use");

    for (const error of result.callErrors) {
      expect(error).toMatchObject({
        name: "ConflictError",
        statusCode: 409,
        message: CHECKOUT_IN_PROGRESS_MESSAGE,
      });
    }

    // Real SDK retry loop: 1 attempt + 4 retries per request.
    expect(result.attemptsPerCall).toEqual([5, 5]);

    expect(result.attemptPaths).toEqual(["/v1/checkout/sessions"]);

    // Every attempt -- including the tourist's second click --
    // reused the deterministic initial key.
    expect(new Set(result.idempotencyKeys)).toEqual(
      new Set([`${result.paymentId}:initial`]),
    );

    expect(result.paymentCount).toBe(1);

    expect(result.storedCheckoutSessionId).toBeNull();
  });

  test("concurrent first-time requests converge on one payment and one session", async () => {
    const result = await runPaymentScenario<ConcurrentCheckoutResult>(
      "mock-concurrent-initial",
    );

    expect(result.barrierTimedOut).toBe(false);

    expect(result.results.map((entry) => entry.status)).toEqual([
      "fulfilled",
      "fulfilled",
    ]);

    const sessionIds = result.results.map((entry) =>
      entry.status === "fulfilled" ? entry.checkoutSessionId : null,
    );

    expect(sessionIds[0]).toBe(sessionIds[1]);

    expect(result.createCalls).toEqual([
      { idempotencyKey: `${result.paymentId}:initial`, maxNetworkRetries: 4 },
      { idempotencyKey: `${result.paymentId}:initial`, maxNetworkRetries: 4 },
    ]);

    expect(result.distinctSessionsCreated).toBe(1);

    expect(result.paymentCount).toBe(1);

    expect(result.storedCheckoutSessionId).toBe(sessionIds[0]);
  });

  test("concurrent expired-session replacement converges on one new session", async () => {
    const result = await runPaymentScenario<ConcurrentCheckoutResult>(
      "mock-concurrent-replacement",
    );

    expect(result.barrierTimedOut).toBe(false);

    const sessionIds = result.results.map((entry) =>
      entry.status === "fulfilled" ? entry.checkoutSessionId : null,
    );

    expect(sessionIds[0]).toBeTruthy();

    expect(sessionIds[0]).toBe(sessionIds[1]);

    expect(sessionIds[0]).not.toBe(result.expiredSessionId);

    const replacementKey = `${result.paymentId}:retry:${result.expiredSessionId}`;

    expect(result.createCalls.map((call) => call.idempotencyKey)).toEqual([
      replacementKey,
      replacementKey,
    ]);

    expect(result.distinctSessionsCreated).toBe(1);

    expect(result.paymentCount).toBe(1);

    expect(result.storedCheckoutSessionId).toBe(sessionIds[0]);
  });

  test("a stale replacement never overwrites a newer open session", async () => {
    const result = await runPaymentScenario<StaleReplacementResult>(
      "mock-stale-replacement-open",
    );

    expect(result.error).toBeNull();

    expect(result.returnedCheckoutSessionId).toBe(result.newerSessionId);

    expect(result.storedCheckoutSessionId).toBe(result.newerSessionId);

    expect(result.createCalls.map((call) => call.idempotencyKey)).toEqual([
      `${result.paymentId}:retry:${result.expiredSessionId}`,
    ]);
  });

  test("a stale replacement against a newer expired session asks the tourist to retry", async () => {
    const result = await runPaymentScenario<StaleReplacementResult>(
      "mock-stale-replacement-expired",
    );

    expect(result.returnedCheckoutSessionId).toBeNull();

    expect(result.error).toMatchObject({
      name: "ConflictError",
      statusCode: 409,
      message: CHECKOUT_IN_PROGRESS_MESSAGE,
    });

    expect(result.storedCheckoutSessionId).toBe(result.newerSessionId);

    expect(result.paymentStatus).toBe("PENDING");
  });

  test("a payment completed during session creation is reported as already paid", async () => {
    const result = await runPaymentScenario<StaleReplacementResult>(
      "mock-paid-during-create",
    );

    expect(result.error).toMatchObject({
      name: "ConflictError",
      statusCode: 409,
      message: "This quotation has already been paid",
    });

    expect(result.storedCheckoutSessionId).toBe(result.newerSessionId);

    expect(result.paymentStatus).toBe("SUCCESS");
  });
});

/**
 * =========================================================
 * B. Stripe Webhooks (signed test events)
 * =========================================================
 */

test.describe("CR-007 Stripe webhook integrity", () => {
  test.beforeEach(({}, testInfo) => {
    skipOutsideChromium(testInfo);
  });

  test("a valid success event confirms exactly one booking and duplicates are no-ops", async () => {
    const result = await runPaymentScenario<{
      eventId: string;
      first: Delivery;
      afterFirst: Snapshot;
      duplicate: Delivery;
      afterDuplicate: Snapshot;
    }>("webhook-success-and-duplicate");

    expect(result.first.status).toBe(200);

    expectSingleConfirmedBooking(result.afterFirst);

    expect(result.afterFirst.ledger[result.eventId]?.status).toBe("PROCESSED");

    expect(result.duplicate.status).toBe(200);

    expect(result.afterDuplicate).toEqual(result.afterFirst);
  });

  test("concurrent identical deliveries process the event once", async () => {
    const result = await runPaymentScenario<{
      eventId: string;
      deliveryStatuses: number[];
      afterConcurrent: Snapshot;
      redelivery: Delivery;
      final: Snapshot;
    }>("webhook-concurrent-duplicate");

    for (const status of result.deliveryStatuses) {
      expect([200, 409]).toContain(status);
    }

    expect(result.deliveryStatuses).toContain(200);

    expectSingleConfirmedBooking(result.afterConcurrent);

    expect(result.redelivery.status).toBe(200);

    expectSingleConfirmedBooking(result.final);

    expect(result.final.ledger[result.eventId]?.status).toBe("PROCESSED");
  });

  test("two different events for one payment still create a single booking", async () => {
    const result = await runPaymentScenario<{
      eventIds: string[];
      deliveryStatuses: number[];
      afterConcurrent: Snapshot;
      retries: Array<Delivery & { eventId: string }>;
      final: Snapshot;
    }>("webhook-distinct-events-same-payment");

    expect(result.deliveryStatuses).toContain(200);

    expect(result.afterConcurrent.bookingCount).toBe(1);

    for (const retry of result.retries) {
      expect(retry.status).toBe(200);
    }

    expectSingleConfirmedBooking(result.final);

    for (const eventId of result.eventIds) {
      expect(result.final.ledger[eventId]?.status).toBe("PROCESSED");
    }
  });

  const permanentRejections: Array<[string, string]> = [
    ["webhook-wrong-amount", "Stripe amount does not match the expected payment amount"],
    ["webhook-wrong-currency", "Stripe currency does not match the expected payment currency"],
    ["webhook-session-mismatch", "Stripe session does not match the recorded payment session"],
    ["webhook-unknown-payment", "Payment not found for webhook metadata"],
    ["webhook-missing-payment-id", "Payment ID missing from Stripe metadata"],
  ];

  for (const [scenario, reason] of permanentRejections) {
    test(`${scenario} is rejected permanently without touching the payment`, async () => {
      const result = await runPaymentScenario<PermanentRejectionResult>(scenario);

      expect(result.first).toEqual({
        status: 400,
        message: reason,
      });

      // A replay is answered from the FAILED ledger entry.
      expect(result.replay).toEqual({
        status: 400,
        message: reason,
      });

      expect(result.final.ledger[result.eventId]).toEqual({
        status: "FAILED",
        failureReason: reason,
      });

      expectUntouchedPayment(result.final);
    });
  }

  test("a foreign quotation id in metadata is ignored in favour of the stored payment", async () => {
    const result = await runPaymentScenario<{
      delivery: Delivery;
      bookingQuotationId: string | null;
      expectedQuotationId: string;
      foreignQuotationId: string;
      foreignQuotationBookingCount: number;
      final: Snapshot;
    }>("webhook-foreign-quotation-metadata");

    expect(result.delivery.status).toBe(200);

    expect(result.bookingQuotationId).toBe(result.expectedQuotationId);

    expect(result.foreignQuotationBookingCount).toBe(0);

    expectSingleConfirmedBooking(result.final);
  });

  test("an invalid signature is rejected before the ledger is touched", async () => {
    const result = await runPaymentScenario<{
      delivery: Delivery;
      final: Snapshot;
    }>("webhook-invalid-signature");

    expect(result.delivery).toEqual({
      status: 400,
      message: "Invalid Stripe webhook signature",
    });

    expect(Object.values(result.final.ledger)).toEqual([null]);

    expectUntouchedPayment(result.final);
  });

  test("a fresh claim blocks a concurrent delivery and a stale claim is taken over", async () => {
    const result = await runPaymentScenario<{
      eventId: string;
      whileClaimed: Delivery;
      afterClaimed: Snapshot;
      afterTakeoverDelivery: Delivery;
      final: Snapshot;
    }>("webhook-claim-in-progress-then-takeover");

    expect(result.whileClaimed.status).toBe(409);

    expectUntouchedPayment(result.afterClaimed);

    expect(result.afterClaimed.ledger[result.eventId]?.status).toBe("PROCESSING");

    expect(result.afterTakeoverDelivery.status).toBe(200);

    expectSingleConfirmedBooking(result.final);

    expect(result.final.ledger[result.eventId]?.status).toBe("PROCESSED");
  });

  test("a booking failure after payment success is repaired by the retried event", async () => {
    const result = await runPaymentScenario<{
      eventId: string;
      first: Delivery;
      afterFailure: Snapshot;
      retry: Delivery;
      final: Snapshot;
    }>("webhook-booking-failure-then-retry");

    expect(result.first.status).toBeGreaterThanOrEqual(400);

    expect(result.afterFailure.paymentStatus).toBe("SUCCESS");

    expect(result.afterFailure.bookingCount).toBe(0);

    // Not cached as terminal -- the retry must be able to repair it.
    expect(result.afterFailure.ledger[result.eventId]?.status).toBe("PROCESSING");

    expect(result.retry.status).toBe(200);

    expectSingleConfirmedBooking(result.final);

    expect(result.final.ledger[result.eventId]?.status).toBe("PROCESSED");
  });

  test("unpaid, expired and failed-attempt events leave the payment open for retry", async () => {
    const result = await runPaymentScenario<{
      deliveries: Record<"unpaid" | "expired" | "attemptFailed", Delivery>;
      final: Snapshot;
    }>("webhook-non-success-events");

    for (const delivery of Object.values(result.deliveries)) {
      expect(delivery.status).toBe(200);
    }

    expectUntouchedPayment(result.final);

    for (const entry of Object.values(result.final.ledger)) {
      expect(entry?.status).toBe("PROCESSED");
    }
  });
});

/**
 * =========================================================
 * C. Real Stripe Test Mode (through the backend)
 * =========================================================
 */

test.describe("CR-007 checkout sessions against Stripe test mode", () => {
  test.describe.configure({
    mode: "serial",
  });

  test.beforeEach(({}, testInfo) => {
    skipOutsideChromium(testInfo);
  });

  test("checkout sessions are reused, replaced once expired and never duplicated", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const mode = await runPaymentScenario<{
      isTestModeKey: boolean;
    }>("assert-stripe-test-mode");

    // Hard stop before any request that could reach Stripe.
    expect(mode.isTestModeKey, "Backend Stripe key must be an sk_test_ key").toBe(
      true,
    );

    const fixture = await runPaymentScenario<{
      quotationId: string;
      expectedAmountMinor: number;
      expectedCurrency: string;
    }>("accepted-quotation");

    await loginAsTourist(page);

    const authorization = await captureAuthorizationHeader(
      page,
      "/tourist/payments",
    );

    const requestCheckout = () =>
      page.request.post(`${API_BASE_URL}/payments/checkout-session`, {
        headers: {
          Authorization: authorization,
        },

        data: {
          quotationId: fixture.quotationId,
        },
      });

    // Concurrent first-time requests.
    const concurrent = await Promise.all([requestCheckout(), requestCheckout()]);

    const concurrentSessionIds: string[] = [];

    for (const response of concurrent) {
      const body = await response.json();

      if (response.status() === 201) {
        concurrentSessionIds.push(body.data.checkoutSessionId);
      } else {
        expect(response.status()).toBe(409);

        expect(body.message).toBe(CHECKOUT_IN_PROGRESS_MESSAGE);
      }
    }

    expect(concurrentSessionIds.length).toBeGreaterThan(0);

    expect(new Set(concurrentSessionIds).size).toBe(1);

    const originalSessionId = concurrentSessionIds[0];

    // A repeated request reuses the open session.
    const repeated = await requestCheckout();

    expect(repeated.status()).toBe(201);

    expect((await repeated.json()).data.checkoutSessionId).toBe(originalSessionId);

    // The real session matches the stored payment.
    const inspected = await runPaymentScenario<{
      checkoutSessionId: string;
      livemode: boolean;
      statusBeforeExpire: string;
      paymentStatus: string;
      amountTotal: number;
      currency: string;
      metadataPaymentId: string;
      clientReferenceId: string;
      expectedPaymentId: string;
      expiredStatus: string;
    }>("real-inspect-and-expire", fixture.quotationId);

    expect(inspected).toMatchObject({
      checkoutSessionId: originalSessionId,
      livemode: false,
      statusBeforeExpire: "open",
      paymentStatus: "unpaid",
      amountTotal: fixture.expectedAmountMinor,
      currency: fixture.expectedCurrency,
      metadataPaymentId: inspected.expectedPaymentId,
      clientReferenceId: inspected.expectedPaymentId,
      expiredStatus: "expired",
    });

    // The expired session is replaced by exactly one new session.
    const replacement = await requestCheckout();

    expect(replacement.status()).toBe(201);

    const replacementSessionId = (await replacement.json()).data
      .checkoutSessionId as string;

    expect(replacementSessionId).not.toBe(originalSessionId);

    const afterReplacement = await runPaymentScenario<{
      paymentCount: number;
      status: string;
      storedCheckoutSessionId: string;
    }>("payment-snapshot", fixture.quotationId);

    expect(afterReplacement).toMatchObject({
      paymentCount: 1,
      status: "PENDING",
      storedCheckoutSessionId: replacementSessionId,
    });

    // Clean up: expire the replacement too (never paid).
    const cleanup = await runPaymentScenario<{
      checkoutSessionId: string;
      expiredStatus: string;
    }>("real-inspect-and-expire", fixture.quotationId);

    expect(cleanup).toMatchObject({
      checkoutSessionId: replacementSessionId,
      expiredStatus: "expired",
    });
  });
});

/**
 * =========================================================
 * D. Payment Success Page
 * =========================================================
 */

test.describe("CR-007 payment success page", () => {
  test("the Stripe redirect only confirms once the backend reports a booking", async ({
    page,
  }) => {
    const payment = await runPaymentScenario<{
      paymentId: string;
      checkoutSessionId: string;
      paymentReference: string;
    }>("success-page-payment", "PENDING");

    await loginAsTourist(page);

    await page.goto(
      `/tourist/payments/success?session_id=${payment.checkoutSessionId}&paymentId=${payment.paymentId}`,
    );

    await expect(
      page.getByRole("heading", {
        name: "Confirming your payment",
      }),
    ).toBeVisible();

    await expect(page.getByText(payment.paymentReference)).toBeVisible();

    await expect(
      page.getByRole("heading", {
        name: "Your booking is confirmed",
      }),
    ).toHaveCount(0);

    const completion = await runPaymentScenario<{
      delivery: Delivery;
    }>("complete-payment-via-webhook", payment.paymentId);

    expect(completion.delivery.status).toBe(200);

    await expect(
      page.getByRole("heading", {
        name: "Your booking is confirmed",
      }),
    ).toBeVisible({
      timeout: 15_000,
    });

    await expect(
      page.getByRole("link", {
        name: "View booking",
      }),
    ).toHaveAttribute("href", /\/tourist\/bookings\/[0-9a-f-]{36}$/);
  });

  test("an unconfirmed payment switches to the delayed state", async ({ page }) => {
    const payment = await runPaymentScenario<{
      paymentId: string;
    }>("success-page-payment", "PENDING");

    await loginAsTourist(page);

    await page.clock.install();

    await page.goto(`/tourist/payments/success?paymentId=${payment.paymentId}`);

    await expect(
      page.getByRole("heading", {
        name: "Confirming your payment",
      }),
    ).toBeVisible();

    await page.clock.fastForward(31_000);

    await expect(
      page.getByRole("heading", {
        name: "Confirmation is taking longer than usual",
      }),
    ).toBeVisible();

    await expect(
      page.getByText("Stripe hasn't confirmed your payment with Travora yet."),
    ).toBeVisible();

    await expect(page.getByText("You don't need to pay again.")).toBeVisible();
  });

  test("a successful payment still awaiting its booking is not shown as confirmed", async ({
    page,
  }) => {
    // SUCCESS without a Booking: the webhook updated the payment but
    // booking creation has not completed yet.
    const payment = await runPaymentScenario<{
      paymentId: string;
    }>("success-page-payment", "SUCCESS");

    await loginAsTourist(page);

    await page.clock.install();

    await page.goto(`/tourist/payments/success?paymentId=${payment.paymentId}`);

    await expect(
      page.getByRole("heading", {
        name: "Confirming your payment",
      }),
    ).toBeVisible();

    await page.clock.fastForward(31_000);

    await expect(
      page.getByRole("heading", {
        name: "Confirmation is taking longer than usual",
      }),
    ).toBeVisible();

    await expect(
      page.getByText(
        "Your payment has been received, but your booking is still being finalized.",
      ),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", {
        name: "Your booking is confirmed",
      }),
    ).toHaveCount(0);
  });

  test("a payment that did not complete is not shown as successful", async ({
    page,
  }) => {
    const payment = await runPaymentScenario<{
      paymentId: string;
    }>("success-page-payment", "FAILED");

    await loginAsTourist(page);

    await page.goto(`/tourist/payments/success?paymentId=${payment.paymentId}`);

    await expect(
      page.getByRole("heading", {
        name: "Your payment was not completed",
      }),
    ).toBeVisible();
  });

  test("a success redirect without a payment id shows an error state", async ({
    page,
  }) => {
    await loginAsTourist(page);

    await page.goto("/tourist/payments/success");

    await expect(
      page.getByRole("heading", {
        name: "We couldn't check this payment",
      }),
    ).toBeVisible();
  });
});
