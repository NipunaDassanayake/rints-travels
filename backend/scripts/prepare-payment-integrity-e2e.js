const path = require("path");
const crypto = require("crypto");
const Module = require("module");

/**
 * =========================================================
 * Load Backend Environment
 * =========================================================
 *
 * This script is executed from the frontend directory by
 * Playwright, so load backend/.env explicitly.
 */

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
});

/**
 * =========================================================
 * Production Protection
 * =========================================================
 */

if (process.env.NODE_ENV === "production") {
  console.error("E2E fixture creation is disabled in production.");

  process.exit(1);
}

/**
 * =========================================================
 * Local-Only Protection
 * =========================================================
 *
 * This script writes fixture rows directly through Prisma and
 * sends signed webhooks to the API. Refuse to run unless BOTH
 * the database and the API are on this machine, regardless of
 * NODE_ENV.
 */

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function isLocalUrl(value) {
  try {
    return LOCAL_HOSTNAMES.has(new URL(value).hostname);
  } catch {
    return false;
  }
}

const API_BASE_URL =
  process.env.PAYMENT_E2E_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:5000/api";

if (!isLocalUrl(process.env.DATABASE_URL)) {
  console.error("Payment integrity fixtures only run against a local database.");

  process.exit(1);
}

if (!isLocalUrl(API_BASE_URL)) {
  console.error("Payment integrity fixtures only run against a local API.");

  process.exit(1);
}

/**
 * =========================================================
 * Stripe Client Injection (mocked scenarios)
 * =========================================================
 *
 * Replaces src/config/stripe.js for THIS process before any
 * payment module is loaded, so the payment service under test
 * never talks to Stripe with the configured key. Each mocked
 * scenario installs its own implementation; anything else
 * attempting a Stripe call fails loudly.
 *
 * Scenarios that intentionally use the real Stripe test-mode
 * API construct their own client via getRealTestModeStripe().
 */

const Stripe = require("stripe");

const STRIPE_CONFIG_PATH = require.resolve("../src/config/stripe");

const unexpectedStripe = {
  checkout: {
    sessions: {
      create: async () => {
        throw new Error("Unexpected Stripe call in payment-integrity fixture");
      },

      retrieve: async () => {
        throw new Error("Unexpected Stripe call in payment-integrity fixture");
      },
    },
  },
};

const stripeSwitch = {
  impl: unexpectedStripe,
};

const injectedStripeModule = new Module(STRIPE_CONFIG_PATH);

injectedStripeModule.filename = STRIPE_CONFIG_PATH;

injectedStripeModule.loaded = true;

injectedStripeModule.exports = {
  get checkout() {
    return stripeSwitch.impl.checkout;
  },
};

require.cache[STRIPE_CONFIG_PATH] = injectedStripeModule;

const env = require("../src/config/env");

const prisma = require("../src/config/prisma");

const paymentsService = require("../src/modules/payments/payments.service");

/**
 * =========================================================
 * Configuration
 * =========================================================
 */

const TOURIST_EMAIL = process.env.E2E_TOURIST_EMAIL ?? "nipuna@example.com";

const AGED_CLAIM_MS = 5 * 60 * 1000;

/**
 * =========================================================
 * Helpers
 * =========================================================
 */

function createUniqueSuffix() {
  return `${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

function randomToken() {
  return crypto.randomBytes(8).toString("hex");
}

function createTravelDates() {
  const startDate = new Date();

  startDate.setUTCHours(0, 0, 0, 0);

  const randomOffset = crypto.randomInt(1, 3650);

  startDate.setUTCDate(startDate.getUTCDate() + 365 + randomOffset);

  const endDate = new Date(startDate);

  endDate.setUTCDate(endDate.getUTCDate() + 5);

  return {
    startDate,
    endDate,
  };
}

async function getTourist() {
  const tourist = await prisma.user.findUnique({
    where: {
      email: TOURIST_EMAIL,
    },
  });

  if (!tourist) {
    throw new Error(`E2E tourist "${TOURIST_EMAIL}" was not found.`);
  }

  if (tourist.role !== "TOURIST" || tourist.status !== "ACTIVE") {
    throw new Error(`E2E user "${TOURIST_EMAIL}" must be an ACTIVE TOURIST.`);
  }

  return tourist;
}

/**
 * An ACCEPTED tour request with an ACCEPTED quotation -- the
 * only state in which CR-006 allows payment.
 */
async function createAcceptedQuotation() {
  const uniqueSuffix = createUniqueSuffix();

  const { startDate, endDate } = createTravelDates();

  const tourist = await getTourist();

  const tourRequest = await prisma.tourRequest.create({
    data: {
      touristId: tourist.id,

      requestType: "CUSTOM",

      title: `E2E Payment Integrity ${uniqueSuffix}`,

      preferredStartDate: startDate,

      preferredEndDate: endDate,

      adultCount: 2,

      childCount: 0,

      destinationPreferences: "Sigiriya, Kandy and Ella",

      budget: "1500.00",

      currency: "USD",

      specialRequirements: "Automated Playwright payment integrity fixture.",

      contactMethod: "EMAIL",

      status: "ACCEPTED",
    },
  });

  const quotation = await prisma.tourQuotation.create({
    data: {
      tourRequestId: tourRequest.id,

      guideId: null,

      quotationNumber: `E2E-PAY-QTN-${uniqueSuffix}`,

      revisionNumber: 1,

      title: `Playwright Payment Integrity Journey ${uniqueSuffix}`,

      description:
        "A dedicated Travora journey created automatically for the Playwright payment integrity test.",

      startDate,

      endDate,

      adultCount: 2,

      childCount: 0,

      subtotal: "1200.00",

      discountAmount: "50.00",

      taxAmount: "25.00",

      totalAmount: "1175.00",

      currency: "USD",

      notes: "Automatically generated E2E quotation.",

      termsConditions: "For automated testing only.",

      status: "ACCEPTED",

      sentAt: new Date(),

      respondedAt: new Date(),
    },
  });

  return {
    uniqueSuffix,
    tourist,
    tourRequest,
    quotation,
  };
}

async function createPayment(fixture, { status = "PENDING", stripeCheckoutSessionId = null } = {}) {
  return prisma.payment.create({
    data: {
      quotationId: fixture.quotation.id,

      touristId: fixture.tourist.id,

      paymentReference: `E2E-PAY-${fixture.uniqueSuffix}`,

      amount: fixture.quotation.totalAmount,

      currency: fixture.quotation.currency,

      paymentMethod: "CARD",

      status,

      stripeCheckoutSessionId,
    },
  });
}

/**
 * Accepted quotation + PENDING payment with a stored (fake)
 * Checkout Session id, ready to receive signed webhooks. The
 * backend never calls Stripe while processing a webhook, so
 * the session id does not need to exist in Stripe.
 */
async function createWebhookFixture() {
  const fixture = await createAcceptedQuotation();

  const payment = await createPayment(fixture, {
    stripeCheckoutSessionId: `cs_test_e2e_${randomToken()}`,
  });

  return {
    ...fixture,
    payment,
  };
}

async function snapshot(fixture, eventIds = []) {
  const payment = await prisma.payment.findUnique({
    where: {
      id: fixture.payment.id,
    },
  });

  const paymentCount = await prisma.payment.count({
    where: {
      quotationId: fixture.quotation.id,
    },
  });

  const bookingCount = await prisma.booking.count({
    where: {
      tourRequestId: fixture.tourRequest.id,
    },
  });

  const tourRequest = await prisma.tourRequest.findUnique({
    where: {
      id: fixture.tourRequest.id,
    },
  });

  const events = await prisma.stripeWebhookEvent.findMany({
    where: {
      id: {
        in: eventIds,
      },
    },
  });

  return {
    paymentStatus: payment.status,

    storedCheckoutSessionId: payment.stripeCheckoutSessionId,

    stripePaymentIntentId: payment.stripePaymentIntentId,

    paidAtSet: Boolean(payment.paidAt),

    paymentCount,

    bookingCount,

    tourRequestStatus: tourRequest.status,

    ledger: Object.fromEntries(
      eventIds.map((id) => {
        const row = events.find((event) => event.id === id);

        return [
          id,
          row
            ? {
                status: row.status,
                failureReason: row.failureReason,
              }
            : null,
        ];
      }),
    ),
  };
}

function describeError(error) {
  if (!error) {
    return null;
  }

  return {
    name: error.constructor?.name ?? error.name,

    statusCode: error.statusCode ?? null,

    code: error.code ?? null,

    message: error.message,
  };
}

/**
 * =========================================================
 * Stripe Mocks
 * =========================================================
 */

/**
 * Behaves like Stripe's idempotency layer for Checkout Session
 * creation: the same idempotency key always yields the same
 * session. `barrierSize` holds every create call until that
 * many callers have arrived, forcing a deterministic overlap.
 */
function createCheckoutSessionMock({ barrierSize = 1, onCreate = null } = {}) {
  const sessionsById = new Map();

  const sessionsByKey = new Map();

  const createCalls = [];

  let arrivals = 0;

  let releaseBarrier;

  const barrier = new Promise((resolve) => {
    releaseBarrier = resolve;
  });

  let barrierTimedOut = false;

  const barrierTimeout = setTimeout(() => {
    barrierTimedOut = true;

    releaseBarrier();
  }, 10_000);

  const register = (session) => {
    sessionsById.set(session.id, session);

    return session;
  };

  const mock = {
    register,

    createCalls,

    get barrierTimedOut() {
      return barrierTimedOut;
    },

    distinctSessionsCreated: () => sessionsByKey.size,

    dispose: () => clearTimeout(barrierTimeout),

    checkout: {
      sessions: {
        create: async (params, options = {}) => {
          createCalls.push({
            idempotencyKey: options.idempotencyKey ?? null,

            maxNetworkRetries: options.maxNetworkRetries ?? null,
          });

          arrivals += 1;

          if (arrivals >= barrierSize) {
            releaseBarrier();
          }

          await barrier;

          if (onCreate) {
            await onCreate(params, options);
          }

          let session = sessionsByKey.get(options.idempotencyKey);

          if (!session) {
            const id = `cs_test_mock_${randomToken()}`;

            session = register({
              id,
              status: "open",
              url: `https://checkout.stripe.test/c/pay/${id}`,
            });

            sessionsByKey.set(options.idempotencyKey, session);
          }

          return session;
        },

        retrieve: async (id) => {
          const session = sessionsById.get(id);

          if (!session) {
            throw new Error(`Mock has no Checkout Session ${id}`);
          }

          return session;
        },
      },
    },
  };

  return mock;
}

/**
 * A real Stripe SDK client whose transport always answers
 * HTTP 409 `idempotency_key_in_use`, recording the
 * Idempotency-Key header of every attempt. This exercises the
 * SDK's actual retry behaviour (same key on every retry) with
 * no network access.
 */
class StaticJsonResponse extends Stripe.HttpClientResponse {
  constructor(statusCode, headers, body) {
    super(statusCode, headers);

    this.body = body;
  }

  getRawResponse() {
    return this.body;
  }

  toStream() {
    throw new Error("Streaming is not supported by the E2E mock transport");
  }

  toJSON() {
    return Promise.resolve(this.body);
  }
}

class IdempotencyKeyInUseHttpClient extends Stripe.HttpClient {
  constructor(attempts) {
    super();

    this.attempts = attempts;
  }

  getClientName() {
    return "payment-integrity-e2e-mock";
  }

  makeRequest(host, port, requestPath, method, headers) {
    const idempotencyKey =
      Object.entries(headers).find(
        ([name]) => name.toLowerCase() === "idempotency-key",
      )?.[1] ?? null;

    this.attempts.push({
      method,
      path: requestPath,
      idempotencyKey,
    });

    return Promise.resolve(
      new StaticJsonResponse(
        409,
        {
          "request-id": "req_e2e_mock",
        },
        {
          error: {
            type: "invalid_request_error",

            code: "idempotency_key_in_use",

            message:
              "There is currently another in-progress request using this idempotent key.",
          },
        },
      ),
    );
  }
}

/**
 * =========================================================
 * Real Stripe Test Mode (guarded)
 * =========================================================
 */

function isStripeTestModeKey() {
  return String(env.stripe.secretKey ?? "").startsWith("sk_test_");
}

function getRealTestModeStripe() {
  if (!isStripeTestModeKey()) {
    throw new Error(
      "Refusing to call Stripe: the configured secret key is not a test-mode (sk_test_) key.",
    );
  }

  return new Stripe(env.stripe.secretKey);
}

/**
 * =========================================================
 * Signed Webhook Delivery
 * =========================================================
 */

const webhookSigner = new Stripe("sk_test_e2e_webhook_signer_only");

function getWebhookSecret() {
  if (!env.stripe.webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured for the backend.");
  }

  return env.stripe.webhookSecret;
}

function newEventId() {
  return `evt_test_e2e_${randomToken()}`;
}

function buildCheckoutCompletedEvent(
  fixture,
  {
    eventId = newEventId(),
    sessionId = fixture.payment.stripeCheckoutSessionId,
    amountTotal = Math.round(Number(fixture.payment.amount) * 100),
    currency = fixture.payment.currency.toLowerCase(),
    paymentStatus = "paid",
    metadata = {
      paymentId: fixture.payment.id,
      paymentReference: fixture.payment.paymentReference,
      quotationId: fixture.payment.quotationId,
      touristId: fixture.payment.touristId,
    },
  } = {},
) {
  return {
    id: eventId,

    object: "event",

    type: "checkout.session.completed",

    created: Math.floor(Date.now() / 1000),

    livemode: false,

    data: {
      object: {
        id: sessionId,

        object: "checkout.session",

        mode: "payment",

        status: "complete",

        payment_status: paymentStatus,

        amount_total: amountTotal,

        currency,

        payment_intent: `pi_test_e2e_${randomToken()}`,

        client_reference_id: fixture.payment.id,

        metadata,
      },
    },
  };
}

async function sendWebhook(event, { secret } = {}) {
  const payload = JSON.stringify(event);

  const signature = webhookSigner.webhooks.generateTestHeaderString({
    payload,

    secret: secret ?? getWebhookSecret(),
  });

  const response = await fetch(`${API_BASE_URL}/payments/stripe/webhook`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",

      "Stripe-Signature": signature,
    },

    body: payload,
  });

  let body = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return {
    status: response.status,

    message: body?.message ?? null,
  };
}

/**
 * Simulates "Stripe retried after the stale-claim window" without
 * a real 60s wait: age the existing PROCESSING claim.
 */
async function ageWebhookClaim(eventId) {
  await prisma.stripeWebhookEvent.update({
    where: {
      id: eventId,
    },

    data: {
      claimedAt: new Date(Date.now() - AGED_CLAIM_MS),
    },
  });
}

/**
 * =========================================================
 * Mocked Scenarios: Checkout Session Creation
 * =========================================================
 */

async function scenarioMockIdempotencyInUse() {
  const fixture = await createAcceptedQuotation();

  const attempts = [];

  stripeSwitch.impl = new Stripe("sk_test_e2e_mock_transport_only", {
    httpClient: new IdempotencyKeyInUseHttpClient(attempts),
  });

  const callErrors = [];

  const attemptsPerCall = [];

  // Two calls: the original request and the tourist clicking "Pay" again.
  for (let call = 0; call < 2; call += 1) {
    const before = attempts.length;

    let error = null;

    try {
      await paymentsService.createCheckoutSession(fixture.tourist.id, {
        quotationId: fixture.quotation.id,
      });
    } catch (caught) {
      error = caught;
    }

    callErrors.push(describeError(error));

    attemptsPerCall.push(attempts.length - before);
  }

  const payment = await prisma.payment.findUnique({
    where: {
      quotationId: fixture.quotation.id,
    },
  });

  return {
    scenario: "mock-idempotency-in-use",

    paymentId: payment.id,

    callErrors,

    attemptsPerCall,

    idempotencyKeys: attempts.map((attempt) => attempt.idempotencyKey),

    attemptPaths: [...new Set(attempts.map((attempt) => attempt.path))],

    paymentCount: await prisma.payment.count({
      where: {
        quotationId: fixture.quotation.id,
      },
    }),

    storedCheckoutSessionId: payment.stripeCheckoutSessionId,
  };
}

async function runConcurrentCheckout(fixture, mock) {
  stripeSwitch.impl = mock;

  const results = await Promise.allSettled([
    paymentsService.createCheckoutSession(fixture.tourist.id, {
      quotationId: fixture.quotation.id,
    }),
    paymentsService.createCheckoutSession(fixture.tourist.id, {
      quotationId: fixture.quotation.id,
    }),
  ]);

  mock.dispose();

  const payment = await prisma.payment.findUnique({
    where: {
      quotationId: fixture.quotation.id,
    },
  });

  return {
    paymentId: payment.id,

    results: results.map((result) =>
      result.status === "fulfilled"
        ? {
            status: "fulfilled",
            checkoutSessionId: result.value.checkoutSessionId,
          }
        : {
            status: "rejected",
            error: describeError(result.reason),
          },
    ),

    createCalls: mock.createCalls,

    barrierTimedOut: mock.barrierTimedOut,

    distinctSessionsCreated: mock.distinctSessionsCreated(),

    paymentCount: await prisma.payment.count({
      where: {
        quotationId: fixture.quotation.id,
      },
    }),

    storedCheckoutSessionId: payment.stripeCheckoutSessionId,
  };
}

async function scenarioMockConcurrentInitial() {
  const fixture = await createAcceptedQuotation();

  const mock = createCheckoutSessionMock({
    barrierSize: 2,
  });

  return {
    scenario: "mock-concurrent-initial",

    ...(await runConcurrentCheckout(fixture, mock)),
  };
}

async function scenarioMockConcurrentReplacement() {
  const fixture = await createAcceptedQuotation();

  const expiredSessionId = `cs_test_mock_expired_${randomToken()}`;

  await createPayment(fixture, {
    stripeCheckoutSessionId: expiredSessionId,
  });

  const mock = createCheckoutSessionMock({
    barrierSize: 2,
  });

  mock.register({
    id: expiredSessionId,
    status: "expired",
    url: null,
  });

  return {
    scenario: "mock-concurrent-replacement",

    expiredSessionId,

    ...(await runConcurrentCheckout(fixture, mock)),
  };
}

/**
 * This request read the payment while it held an expired
 * session; before its compare-and-swap runs, another request
 * stores a NEWER session. The newer session must never be
 * overwritten.
 */
async function runStaleReplacement({ newerSessionStatus, completePaymentDuringCreate = false }) {
  const fixture = await createAcceptedQuotation();

  const expiredSessionId = `cs_test_mock_expired_${randomToken()}`;

  const newerSessionId = `cs_test_mock_newer_${randomToken()}`;

  const payment = await createPayment(fixture, {
    stripeCheckoutSessionId: expiredSessionId,
  });

  const mock = createCheckoutSessionMock({
    onCreate: async () => {
      await prisma.payment.update({
        where: {
          id: payment.id,
        },

        data: completePaymentDuringCreate
          ? {
              stripeCheckoutSessionId: newerSessionId,
              status: "SUCCESS",
              paidAt: new Date(),
            }
          : {
              stripeCheckoutSessionId: newerSessionId,
            },
      });
    },
  });

  mock.register({
    id: expiredSessionId,
    status: "expired",
    url: null,
  });

  mock.register({
    id: newerSessionId,
    status: newerSessionStatus,
    url:
      newerSessionStatus === "open"
        ? `https://checkout.stripe.test/c/pay/${newerSessionId}`
        : null,
  });

  stripeSwitch.impl = mock;

  let result = null;

  let error = null;

  try {
    result = await paymentsService.createCheckoutSession(fixture.tourist.id, {
      quotationId: fixture.quotation.id,
    });
  } catch (caught) {
    error = caught;
  }

  mock.dispose();

  const finalPayment = await prisma.payment.findUnique({
    where: {
      id: payment.id,
    },
  });

  return {
    paymentId: payment.id,

    expiredSessionId,

    newerSessionId,

    returnedCheckoutSessionId: result ? result.checkoutSessionId : null,

    error: describeError(error),

    createCalls: mock.createCalls,

    storedCheckoutSessionId: finalPayment.stripeCheckoutSessionId,

    paymentStatus: finalPayment.status,
  };
}

async function scenarioMockStaleReplacementOpen() {
  return {
    scenario: "mock-stale-replacement-open",

    ...(await runStaleReplacement({
      newerSessionStatus: "open",
    })),
  };
}

async function scenarioMockStaleReplacementExpired() {
  return {
    scenario: "mock-stale-replacement-expired",

    ...(await runStaleReplacement({
      newerSessionStatus: "expired",
    })),
  };
}

async function scenarioMockPaidDuringCreate() {
  return {
    scenario: "mock-paid-during-create",

    ...(await runStaleReplacement({
      newerSessionStatus: "complete",
      completePaymentDuringCreate: true,
    })),
  };
}

/**
 * =========================================================
 * Webhook Scenarios (signed, sent to the running backend)
 * =========================================================
 */

async function scenarioWebhookSuccessAndDuplicate() {
  const fixture = await createWebhookFixture();

  const event = buildCheckoutCompletedEvent(fixture);

  const first = await sendWebhook(event);

  const afterFirst = await snapshot(fixture, [event.id]);

  const duplicate = await sendWebhook(event);

  const afterDuplicate = await snapshot(fixture, [event.id]);

  return {
    scenario: "webhook-success-and-duplicate",

    eventId: event.id,

    first,

    afterFirst,

    duplicate,

    afterDuplicate,
  };
}

async function scenarioWebhookConcurrentDuplicate() {
  const fixture = await createWebhookFixture();

  const event = buildCheckoutCompletedEvent(fixture);

  const deliveries = await Promise.all(
    Array.from({ length: 5 }, () => sendWebhook(event)),
  );

  const afterConcurrent = await snapshot(fixture, [event.id]);

  const redelivery = await sendWebhook(event);

  return {
    scenario: "webhook-concurrent-duplicate",

    eventId: event.id,

    deliveryStatuses: deliveries.map((delivery) => delivery.status),

    afterConcurrent,

    redelivery,

    final: await snapshot(fixture, [event.id]),
  };
}

/**
 * Two DIFFERENT event ids resolving to the same payment,
 * delivered concurrently. Any delivery that fails is retried
 * the way Stripe would (after the stale-claim window).
 */
async function scenarioWebhookDistinctEventsSamePayment() {
  const fixture = await createWebhookFixture();

  const eventA = buildCheckoutCompletedEvent(fixture);

  const eventB = buildCheckoutCompletedEvent(fixture);

  const deliveries = await Promise.all([
    sendWebhook(eventA),
    sendWebhook(eventB),
  ]);

  const afterConcurrent = await snapshot(fixture, [eventA.id, eventB.id]);

  const retries = [];

  for (const [index, event] of [eventA, eventB].entries()) {
    if (deliveries[index].status !== 200) {
      await ageWebhookClaim(event.id);

      retries.push({
        eventId: event.id,
        ...(await sendWebhook(event)),
      });
    }
  }

  return {
    scenario: "webhook-distinct-events-same-payment",

    eventIds: [eventA.id, eventB.id],

    deliveryStatuses: deliveries.map((delivery) => delivery.status),

    afterConcurrent,

    retries,

    final: await snapshot(fixture, [eventA.id, eventB.id]),
  };
}

async function runPermanentRejection(scenario, buildOverrides) {
  const fixture = await createWebhookFixture();

  const event = buildCheckoutCompletedEvent(fixture, buildOverrides(fixture));

  const first = await sendWebhook(event);

  const replay = await sendWebhook(event);

  return {
    scenario,

    eventId: event.id,

    first,

    replay,

    final: await snapshot(fixture, [event.id]),
  };
}

async function scenarioWebhookWrongAmount() {
  return runPermanentRejection("webhook-wrong-amount", (fixture) => ({
    amountTotal: Math.round(Number(fixture.payment.amount) * 100) + 100,
  }));
}

async function scenarioWebhookWrongCurrency() {
  return runPermanentRejection("webhook-wrong-currency", () => ({
    currency: "eur",
  }));
}

async function scenarioWebhookSessionMismatch() {
  return runPermanentRejection("webhook-session-mismatch", () => ({
    sessionId: `cs_test_e2e_other_${randomToken()}`,
  }));
}

async function scenarioWebhookUnknownPayment() {
  return runPermanentRejection("webhook-unknown-payment", (fixture) => ({
    metadata: {
      paymentId: crypto.randomUUID(),
      quotationId: fixture.quotation.id,
    },
  }));
}

async function scenarioWebhookMissingPaymentId() {
  return runPermanentRejection("webhook-missing-payment-id", (fixture) => ({
    metadata: {
      quotationId: fixture.quotation.id,
    },
  }));
}

/**
 * Metadata names a different quotation, but the payment id,
 * session, amount and currency are genuine. The backend must
 * resolve everything from its own Payment row and ignore the
 * foreign quotation id.
 */
async function scenarioWebhookForeignQuotationMetadata() {
  const fixture = await createWebhookFixture();

  const other = await createAcceptedQuotation();

  const event = buildCheckoutCompletedEvent(fixture, {
    metadata: {
      paymentId: fixture.payment.id,
      paymentReference: fixture.payment.paymentReference,
      quotationId: other.quotation.id,
      touristId: fixture.payment.touristId,
    },
  });

  const delivery = await sendWebhook(event);

  const booking = await prisma.booking.findUnique({
    where: {
      paymentId: fixture.payment.id,
    },
  });

  return {
    scenario: "webhook-foreign-quotation-metadata",

    delivery,

    bookingQuotationId: booking ? booking.quotationId : null,

    expectedQuotationId: fixture.quotation.id,

    foreignQuotationId: other.quotation.id,

    foreignQuotationBookingCount: await prisma.booking.count({
      where: {
        quotationId: other.quotation.id,
      },
    }),

    final: await snapshot(fixture, [event.id]),
  };
}

async function scenarioWebhookInvalidSignature() {
  const fixture = await createWebhookFixture();

  const event = buildCheckoutCompletedEvent(fixture);

  const delivery = await sendWebhook(event, {
    secret: `whsec_wrong_${randomToken()}`,
  });

  return {
    scenario: "webhook-invalid-signature",

    delivery,

    final: await snapshot(fixture, [event.id]),
  };
}

async function scenarioWebhookClaimInProgressThenTakeover() {
  const fixture = await createWebhookFixture();

  const event = buildCheckoutCompletedEvent(fixture);

  // Another delivery of this event holds a FRESH claim.
  await prisma.stripeWebhookEvent.create({
    data: {
      id: event.id,
      type: event.type,
      status: "PROCESSING",
      claimedAt: new Date(),
    },
  });

  const whileClaimed = await sendWebhook(event);

  const afterClaimed = await snapshot(fixture, [event.id]);

  // That delivery crashed; Stripe retries after the stale window.
  await ageWebhookClaim(event.id);

  const afterTakeoverDelivery = await sendWebhook(event);

  return {
    scenario: "webhook-claim-in-progress-then-takeover",

    eventId: event.id,

    whileClaimed,

    afterClaimed,

    afterTakeoverDelivery,

    final: await snapshot(fixture, [event.id]),
  };
}

/**
 * Payment becomes SUCCESS but Booking creation fails (CR-006
 * guard: request no longer ACCEPTED). Once the condition is
 * resolved, a retry of the SAME event repairs the booking.
 */
async function scenarioWebhookBookingFailureThenRetry() {
  const fixture = await createWebhookFixture();

  const event = buildCheckoutCompletedEvent(fixture);

  await prisma.tourRequest.update({
    where: {
      id: fixture.tourRequest.id,
    },

    data: {
      status: "CANCELLED",
    },
  });

  const first = await sendWebhook(event);

  const afterFailure = await snapshot(fixture, [event.id]);

  await prisma.tourRequest.update({
    where: {
      id: fixture.tourRequest.id,
    },

    data: {
      status: "ACCEPTED",
    },
  });

  await ageWebhookClaim(event.id);

  const retry = await sendWebhook(event);

  return {
    scenario: "webhook-booking-failure-then-retry",

    eventId: event.id,

    first,

    afterFailure,

    retry,

    final: await snapshot(fixture, [event.id]),
  };
}

async function scenarioWebhookNonSuccessEvents() {
  const fixture = await createWebhookFixture();

  const unpaid = buildCheckoutCompletedEvent(fixture, {
    paymentStatus: "unpaid",
  });

  const expired = {
    id: newEventId(),
    object: "event",
    type: "checkout.session.expired",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    data: {
      object: {
        id: fixture.payment.stripeCheckoutSessionId,
        object: "checkout.session",
        status: "expired",
        payment_status: "unpaid",
        metadata: {
          paymentId: fixture.payment.id,
          quotationId: fixture.quotation.id,
        },
      },
    },
  };

  const attemptFailed = {
    id: newEventId(),
    object: "event",
    type: "payment_intent.payment_failed",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    data: {
      object: {
        id: `pi_test_e2e_${randomToken()}`,
        object: "payment_intent",
        metadata: {
          paymentId: fixture.payment.id,
        },
        last_payment_error: {
          code: "card_declined",
          decline_code: "generic_decline",
          message: "Your card was declined.",
        },
      },
    },
  };

  const deliveries = {
    unpaid: await sendWebhook(unpaid),
    expired: await sendWebhook(expired),
    attemptFailed: await sendWebhook(attemptFailed),
  };

  return {
    scenario: "webhook-non-success-events",

    deliveries,

    final: await snapshot(fixture, [unpaid.id, expired.id, attemptFailed.id]),
  };
}

/**
 * =========================================================
 * Success Page Fixtures
 * =========================================================
 */

async function scenarioSuccessPagePayment() {
  const status = process.argv[3] ?? "PENDING";

  const fixture = await createAcceptedQuotation();

  const payment = await createPayment(fixture, {
    status,
    stripeCheckoutSessionId: `cs_test_e2e_${randomToken()}`,
  });

  return {
    scenario: "success-page-payment",

    paymentId: payment.id,

    checkoutSessionId: payment.stripeCheckoutSessionId,

    paymentReference: payment.paymentReference,

    status,
  };
}

async function scenarioCompletePaymentViaWebhook() {
  const paymentId = process.argv[3];

  const payment = await prisma.payment.findUnique({
    where: {
      id: paymentId,
    },

    include: {
      quotation: true,
    },
  });

  if (!payment) {
    throw new Error(`Payment ${paymentId} was not found.`);
  }

  const fixture = {
    payment,
    quotation: payment.quotation,
    tourRequest: {
      id: payment.quotation.tourRequestId,
    },
  };

  const event = buildCheckoutCompletedEvent(fixture);

  const delivery = await sendWebhook(event);

  return {
    scenario: "complete-payment-via-webhook",

    delivery,

    final: await snapshot(fixture, [event.id]),
  };
}

/**
 * =========================================================
 * Real Stripe Test-Mode Helpers
 * =========================================================
 */

async function scenarioAssertStripeTestMode() {
  return {
    scenario: "assert-stripe-test-mode",

    isTestModeKey: isStripeTestModeKey(),

    webhookSecretConfigured: Boolean(env.stripe.webhookSecret),
  };
}

async function scenarioAcceptedQuotation() {
  const fixture = await createAcceptedQuotation();

  return {
    scenario: "accepted-quotation",

    tourRequestId: fixture.tourRequest.id,

    quotationId: fixture.quotation.id,

    expectedAmountMinor: Math.round(Number(fixture.quotation.totalAmount) * 100),

    expectedCurrency: fixture.quotation.currency.toLowerCase(),
  };
}

async function scenarioPaymentSnapshot() {
  const quotationId = process.argv[3];

  const payments = await prisma.payment.findMany({
    where: {
      quotationId,
    },
  });

  return {
    scenario: "payment-snapshot",

    paymentCount: payments.length,

    paymentId: payments[0]?.id ?? null,

    status: payments[0]?.status ?? null,

    storedCheckoutSessionId: payments[0]?.stripeCheckoutSessionId ?? null,
  };
}

/**
 * Inspects the stored Checkout Session in Stripe test mode and
 * then expires it, so the next checkout request must replace it.
 * Expiring an unpaid session never charges anything.
 */
async function scenarioRealInspectAndExpire() {
  const quotationId = process.argv[3];

  const realStripe = getRealTestModeStripe();

  const payment = await prisma.payment.findUnique({
    where: {
      quotationId,
    },
  });

  if (!payment || !payment.stripeCheckoutSessionId) {
    throw new Error(`No stored Checkout Session for quotation ${quotationId}.`);
  }

  const session = await realStripe.checkout.sessions.retrieve(
    payment.stripeCheckoutSessionId,
  );

  let expiredStatus = session.status;

  if (session.status === "open") {
    const expired = await realStripe.checkout.sessions.expire(session.id);

    expiredStatus = expired.status;
  }

  return {
    scenario: "real-inspect-and-expire",

    checkoutSessionId: session.id,

    livemode: session.livemode,

    statusBeforeExpire: session.status,

    paymentStatus: session.payment_status,

    amountTotal: session.amount_total,

    currency: session.currency,

    metadataPaymentId: session.metadata?.paymentId ?? null,

    clientReferenceId: session.client_reference_id,

    expectedPaymentId: payment.id,

    expiredStatus,
  };
}

/**
 * =========================================================
 * Dispatch
 * =========================================================
 */

const SCENARIOS = {
  "mock-idempotency-in-use": scenarioMockIdempotencyInUse,

  "mock-concurrent-initial": scenarioMockConcurrentInitial,

  "mock-concurrent-replacement": scenarioMockConcurrentReplacement,

  "mock-stale-replacement-open": scenarioMockStaleReplacementOpen,

  "mock-stale-replacement-expired": scenarioMockStaleReplacementExpired,

  "mock-paid-during-create": scenarioMockPaidDuringCreate,

  "webhook-success-and-duplicate": scenarioWebhookSuccessAndDuplicate,

  "webhook-concurrent-duplicate": scenarioWebhookConcurrentDuplicate,

  "webhook-distinct-events-same-payment": scenarioWebhookDistinctEventsSamePayment,

  "webhook-wrong-amount": scenarioWebhookWrongAmount,

  "webhook-wrong-currency": scenarioWebhookWrongCurrency,

  "webhook-session-mismatch": scenarioWebhookSessionMismatch,

  "webhook-unknown-payment": scenarioWebhookUnknownPayment,

  "webhook-missing-payment-id": scenarioWebhookMissingPaymentId,

  "webhook-foreign-quotation-metadata": scenarioWebhookForeignQuotationMetadata,

  "webhook-invalid-signature": scenarioWebhookInvalidSignature,

  "webhook-claim-in-progress-then-takeover": scenarioWebhookClaimInProgressThenTakeover,

  "webhook-booking-failure-then-retry": scenarioWebhookBookingFailureThenRetry,

  "webhook-non-success-events": scenarioWebhookNonSuccessEvents,

  "success-page-payment": scenarioSuccessPagePayment,

  "complete-payment-via-webhook": scenarioCompletePaymentViaWebhook,

  "assert-stripe-test-mode": scenarioAssertStripeTestMode,

  "accepted-quotation": scenarioAcceptedQuotation,

  "payment-snapshot": scenarioPaymentSnapshot,

  "real-inspect-and-expire": scenarioRealInspectAndExpire,
};

async function main() {
  const scenario = process.argv[2];

  const handler = SCENARIOS[scenario];

  if (!handler) {
    throw new Error(
      `Unknown or missing scenario "${scenario}". Expected one of: ${Object.keys(SCENARIOS).join(", ")}.`,
    );
  }

  const result = await handler();

  console.log(`E2E_FIXTURE_JSON=${JSON.stringify(result)}`);
}

main()
  .catch((error) => {
    console.error(
      "Unable to run payment integrity E2E scenario:",
      error instanceof Error ? error.message : error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
