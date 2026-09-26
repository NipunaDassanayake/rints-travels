const crypto = require("crypto");

const logger = require("../../config/logger");

const stripe = require("../../config/stripe");

const env = require("../../config/env");

const paymentsRepository = require("./payments.repository");

const quotationsRepository = require("../quotations/quotations.repository");

const tourRequestsLifecycle = require("../tour-requests/tourRequests.lifecycle");

const bookingsService = require("../bookings/bookings.service");

const {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  ConflictError,
} = require("../../utils/AppError");

const { USER_ROLES } = require("../../core/constants/auth.constants");

/**
 * =========================================================
 * Permanent Webhook Verification Error
 * =========================================================
 *
 * Deliberately NOT a subclass of BadRequestError/ConflictError.
 * The webhook handler uses `instanceof` on this exact class to
 * decide "this event can never succeed on retry" (mark the
 * ledger FAILED) versus "something else went wrong, leave the
 * ledger claim open for a retry to repair" (e.g. a ConflictError
 * from the CR-006 booking guard, or a genuinely transient
 * error). Reusing an existing AppError subclass here would risk
 * misclassifying an unrelated error thrown deeper in
 * markPaymentSuccessful/createBookingFromPayment as permanent.
 */
class PermanentWebhookVerificationError extends Error {
  constructor(message) {
    super(message);

    this.name = "PermanentWebhookVerificationError";

    this.statusCode = 400;
  }
}

/**
 * =========================================================
 * Helpers
 * =========================================================
 */

const generatePaymentReference = () => {
  return `PAY-${Date.now()}-${crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase()}`;
};

/**
 * Convert Travora amount into Stripe's
 * smallest currency unit.
 *
 * Current Travora Stripe flow uses
 * two-decimal currencies such as USD.
 */
const convertAmountToStripeMinorUnit = (amount, currency) => {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new BadRequestError("Invalid payment amount");
  }

  const normalizedCurrency = currency?.trim().toUpperCase();

  if (!normalizedCurrency) {
    throw new BadRequestError("Payment currency is required");
  }

  return Math.round(numericAmount * 100);
};

/**
 * =========================================================
 * Checkout Session Idempotency Key
 * =========================================================
 *
 * One key per session-creation ATTEMPT, not one key per
 * Payment -- Stripe replays the identical cached response for
 * a repeated key within its 24h retention window regardless of
 * what later happened to the object it returned, so reusing
 * `payment.id` alone for every attempt would make Stripe hand
 * back an already-expired session forever instead of creating
 * a real replacement.
 *
 * - No stored session yet (first attempt): `${payment.id}:initial`.
 * - A stored session exists but is being replaced (expired):
 *   `${payment.id}:retry:${payment.stripeCheckoutSessionId}` --
 *   keyed off the SPECIFIC session being replaced, which
 *   guarantees a key Stripe has never seen, while staying
 *   deterministic so concurrent callers replacing the *same*
 *   expired session converge on the same new one.
 *
 * Callers must read this BEFORE overwriting
 * `payment.stripeCheckoutSessionId` with the new session's id.
 */
const buildCheckoutSessionIdempotencyKey = (payment) => {
  return payment.stripeCheckoutSessionId
    ? `${payment.id}:retry:${payment.stripeCheckoutSessionId}`
    : `${payment.id}:initial`;
};

/**
 * Stripe answers a request whose idempotency key is still being
 * processed by a concurrent request with HTTP 409
 * `idempotency_key_in_use`. The SDK retries 409s with the SAME
 * key (never a new one), so a few extra retries let a concurrent
 * caller converge on the first caller's cached session instead
 * of surfacing an error. Never resolve this by generating a
 * different key -- that would create a second session.
 */
const CHECKOUT_SESSION_MAX_NETWORK_RETRIES = 4;

const CHECKOUT_SESSION_IN_PROGRESS_MESSAGE =
  "Your checkout session is still being prepared. Please try again in a moment.";

/**
 * Inspect the session currently stored on a payment.
 *
 * - open     -> reusable, returned to the caller
 * - complete -> the tourist already paid; awaiting the webhook
 * - expired  -> null (caller decides whether to replace it)
 */
const findReusableCheckoutSession = async (payment) => {
  const existingSession = await stripe.checkout.sessions.retrieve(
    payment.stripeCheckoutSessionId,
  );

  if (existingSession.status === "open") {
    logger.info({
      event: "STRIPE_CHECKOUT_SESSION_REUSED",

      paymentId: payment.id,

      checkoutSessionId: existingSession.id,
    });

    return {
      payment,

      checkoutSessionId: existingSession.id,

      checkoutUrl: existingSession.url,
    };
  }

  if (existingSession.status === "complete") {
    throw new ConflictError(
      "This payment has already been completed and is awaiting confirmation",
    );
  }

  return null;
};

/**
 * Called when the compare-and-swap in createCheckoutSession
 * lost: another request stored a session after this request
 * read the payment. Never overwrite the stored session -- use
 * it if it is ours (identical idempotent result) or still open.
 */
const resolveLostCheckoutSessionRace = async (paymentId, createdSession) => {
  const current = await paymentsRepository.findPaymentById(paymentId);

  if (!current) {
    throw new NotFoundError("Payment not found");
  }

  if (current.status === "SUCCESS" || current.status === "REFUNDED") {
    throw new ConflictError("This quotation has already been paid");
  }

  logger.info({
    event: "STRIPE_CHECKOUT_SESSION_PERSIST_RACE_LOST",

    paymentId,

    createdCheckoutSessionId: createdSession.id,

    storedCheckoutSessionId: current.stripeCheckoutSessionId,
  });

  if (current.stripeCheckoutSessionId === createdSession.id) {
    return {
      payment: current,

      checkoutSessionId: createdSession.id,

      checkoutUrl: createdSession.url,
    };
  }

  if (current.stripeCheckoutSessionId) {
    const reusable = await findReusableCheckoutSession(current);

    if (reusable) {
      return reusable;
    }
  }

  throw new ConflictError(CHECKOUT_SESSION_IN_PROGRESS_MESSAGE);
};

/**
 * =========================================================
 * Initiate Local Payment
 * =========================================================
 *
 * Internal method.
 *
 * This is no longer exposed directly through
 * an HTTP endpoint.
 */

const initiatePayment = async (touristId, data) => {
  const quotation = await quotationsRepository.findQuotationById(
    data.quotationId,
  );

  if (!quotation) {
    throw new NotFoundError("Quotation not found");
  }

  if (quotation.tourRequest.touristId !== touristId) {
    throw new ForbiddenError(
      "You do not have permission to pay for this quotation",
    );
  }

  if (quotation.status !== "ACCEPTED") {
    throw new BadRequestError(
      "Payment is only allowed for an accepted quotation",
    );
  }

  /**
   * =======================================================
   * Lifecycle Guard
   * =======================================================
   *
   * Payment may only proceed while the tour request is still
   * ACCEPTED (the quotation.status !== "ACCEPTED" check above
   * already guarantees the quotation side). This runs before
   * any Stripe call so a stale/cancelled request never reaches
   * the payment gateway.
   */

  if (!tourRequestsLifecycle.PAYMENT_ALLOWED.includes(quotation.tourRequest.status)) {
    throw new BadRequestError(
      `Payment is not allowed while the tour request is ${quotation.tourRequest.status}`,
    );
  }

  /**
   * =======================================================
   * Reuse / Reset / Create
   * =======================================================
   *
   * Payment.quotationId is unique (CR-007) -- at most one
   * Payment row can ever exist for this quotation.
   */

  const existingPayment = await paymentsRepository.findByQuotationId(
    quotation.id,
  );

  if (existingPayment) {
    if (existingPayment.status === "SUCCESS" || existingPayment.status === "REFUNDED") {
      logger.info({
        event: "PAYMENT_ALREADY_COMPLETED",

        paymentId: existingPayment.id,

        paymentReference: existingPayment.paymentReference,

        quotationId: existingPayment.quotationId,

        touristId: existingPayment.touristId,

        status: existingPayment.status,
      });

      throw new ConflictError("This quotation has already been paid");
    }

    if (["PENDING", "PROCESSING"].includes(existingPayment.status)) {
      logger.info({
        event: "PAYMENT_ACTIVE_REUSED",

        paymentId: existingPayment.id,

        paymentReference: existingPayment.paymentReference,

        quotationId: existingPayment.quotationId,

        touristId: existingPayment.touristId,

        amount: existingPayment.amount,

        currency: existingPayment.currency,

        paymentMethod: existingPayment.paymentMethod,

        status: existingPayment.status,
      });

      return existingPayment;
    }

    /**
     * status is FAILED or CANCELLED.
     *
     * NOT reachable today -- see paymentsRepository.resetForRetry.
     * Kept for domain-model forward-compatibility only.
     */
    await paymentsRepository.resetForRetry(existingPayment.id, {
      amount: quotation.totalAmount,

      currency: quotation.currency,

      paymentMethod: data.paymentMethod,
    });

    const resetPayment = await paymentsRepository.findPaymentById(
      existingPayment.id,
    );

    if (!resetPayment) {
      throw new NotFoundError("Payment not found");
    }

    if (resetPayment.status === "SUCCESS") {
      // A concurrent payment attempt won a race in between -- stay consistent.
      throw new ConflictError("This quotation has already been paid");
    }

    logger.info({
      event: "PAYMENT_RESET_FOR_RETRY",

      paymentId: resetPayment.id,

      quotationId: resetPayment.quotationId,

      touristId: resetPayment.touristId,
    });

    return resetPayment;
  }

  /**
   * =======================================================
   * Create Local Payment
   * =======================================================
   */

  try {
    const payment = await paymentsRepository.createPayment({
      quotationId: quotation.id,

      touristId,

      paymentReference: generatePaymentReference(),

      amount: quotation.totalAmount,

      currency: quotation.currency,

      paymentMethod: data.paymentMethod,

      status: "PENDING",
    });

    logger.info({
      event: "PAYMENT_INITIATED",

      paymentId: payment.id,

      paymentReference: payment.paymentReference,

      quotationId: payment.quotationId,

      touristId: payment.touristId,

      amount: payment.amount,

      currency: payment.currency,

      paymentMethod: payment.paymentMethod,

      status: payment.status,
    });

    return payment;
  } catch (error) {
    if (error.code === "P2002") {
      /**
       * Lost a concurrent create race to another request for the
       * same quotation -- Payment.quotationId's unique constraint
       * rejected this insert. Resolve to the winner's row instead
       * of erroring, so concurrent first-time checkout requests
       * converge on one Payment row.
       */
      const winner = await paymentsRepository.findByQuotationId(quotation.id);

      if (winner) {
        logger.info({
          event: "PAYMENT_CREATE_RACE_RESOLVED",

          paymentId: winner.id,

          quotationId: quotation.id,
        });

        if (winner.status === "SUCCESS" || winner.status === "REFUNDED") {
          throw new ConflictError("This quotation has already been paid");
        }

        return winner;
      }
    }

    throw error;
  }
};

/**
 * =========================================================
 * Create Stripe Checkout Session
 * =========================================================
 */

const createCheckoutSession = async (touristId, data) => {
  const payment = await initiatePayment(touristId, {
    quotationId: data.quotationId,

    paymentMethod: "CARD",
  });

  /**
   * =======================================================
   * Reuse An Existing Live Session
   * =======================================================
   */

  if (payment.stripeCheckoutSessionId) {
    const reusable = await findReusableCheckoutSession(payment);

    if (reusable) {
      return reusable;
    }

    // "expired" (or anything else) falls through to create a fresh session.
  }

  /**
   * The session id this request observed -- the compare-and-swap
   * below only persists the new session if it is still stored.
   */
  const previousCheckoutSessionId = payment.stripeCheckoutSessionId ?? null;

  const currency = payment.currency.trim().toLowerCase();

  const unitAmount = convertAmountToStripeMinorUnit(
    payment.amount,
    payment.currency,
  );

  const idempotencyKey = buildCheckoutSessionIdempotencyKey(payment);

  /**
   * Metadata shared between Checkout
   * Session and PaymentIntent.
   */
  const stripeMetadata = {
    paymentId: payment.id,

    paymentReference: payment.paymentReference,

    quotationId: payment.quotationId,

    touristId: payment.touristId,
  };

  let checkoutSession;

  try {
    checkoutSession = await stripe.checkout.sessions.create(
      {
        mode: "payment",

        payment_method_types: ["card"],

        client_reference_id: payment.id,

        customer_email: payment.tourist.email,

        line_items: [
          {
            quantity: 1,

            price_data: {
              currency,

              unit_amount: unitAmount,

              product_data: {
                name: payment.quotation.title,

                description: `Travora quotation ${payment.quotation.quotationNumber}`,
              },
            },
          },
        ],

        /**
         * Metadata on Checkout Session.
         */
        metadata: stripeMetadata,

        /**
         * Metadata also copied to the
         * underlying PaymentIntent.
         *
         * This lets payment_intent.* webhook
         * events map back to Travora.
         */
        payment_intent_data: {
          metadata: stripeMetadata,
        },

        success_url:
          `${env.frontend.url}` +
          "/tourist/payments/success" +
          `?session_id={CHECKOUT_SESSION_ID}&paymentId=${payment.id}`,

        cancel_url:
          `${env.frontend.url}` +
          "/tourist/payments/cancel" +
          `?paymentId=${payment.id}`,
      },
      {
        idempotencyKey,

        maxNetworkRetries: CHECKOUT_SESSION_MAX_NETWORK_RETRIES,
      },
    );
  } catch (error) {
    if (error?.code === "idempotency_key_in_use") {
      logger.warn({
        event: "STRIPE_CHECKOUT_SESSION_CREATE_IN_PROGRESS",

        paymentId: payment.id,

        idempotencyKey,
      });

      throw new ConflictError(CHECKOUT_SESSION_IN_PROGRESS_MESSAGE);
    }

    throw error;
  }

  if (!checkoutSession.url) {
    throw new BadRequestError("Unable to create Stripe checkout URL");
  }

  const persisted = await paymentsRepository.setCheckoutSessionIfUnchanged(
    payment.id,
    previousCheckoutSessionId,
    checkoutSession.id,
  );

  if (persisted.count === 0) {
    return resolveLostCheckoutSessionRace(payment.id, checkoutSession);
  }

  logger.info({
    event: "STRIPE_CHECKOUT_SESSION_CREATED",

    paymentId: payment.id,

    paymentReference: payment.paymentReference,

    quotationId: payment.quotationId,

    touristId: payment.touristId,

    checkoutSessionId: checkoutSession.id,

    idempotencyKey,
  });

  return {
    payment,

    checkoutSessionId: checkoutSession.id,

    checkoutUrl: checkoutSession.url,
  };
};

/**
 * =========================================================
 * Get My Payments
 * =========================================================
 */

const getMyPayments = async (touristId) => {
  return paymentsRepository.findPaymentsByTouristId(touristId);
};

/**
 * =========================================================
 * Get Payment By ID
 * =========================================================
 */

const getPaymentById = async (paymentId, currentUser) => {
  const payment = await paymentsRepository.findPaymentById(paymentId);

  if (!payment) {
    throw new NotFoundError("Payment not found");
  }

  const isOwner = payment.touristId === currentUser.id;

  const isAdmin =
    currentUser.role === USER_ROLES.ADMIN ||
    currentUser.role === USER_ROLES.SYSTEM_ADMIN;

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError("You do not have permission to view this payment");
  }

  return payment;
};

/**
 * =========================================================
 * Mark Payment Successful
 * =========================================================
 *
 * Internal method used by the Stripe webhook.
 *
 * Uses a conditional update (PENDING/PROCESSING -> SUCCESS).
 * `count === 0` means another delivery already applied this --
 * treated as a safe replay (re-attempt booking creation, which
 * is itself idempotent) rather than an error, UNLESS the row is
 * in some other, genuinely unexpected status.
 */

const markPaymentSuccessful = async (
  paymentId,
  { stripePaymentIntentId, stripeCheckoutSessionId, gatewayReference },
) => {
  const updateResult = await paymentsRepository.markSuccessful(paymentId, {
    stripePaymentIntentId,

    stripeCheckoutSessionId,

    gatewayReference,

    paidAt: new Date(),
  });

  const payment = await paymentsRepository.findPaymentById(paymentId);

  if (!payment) {
    throw new NotFoundError("Payment not found");
  }

  if (updateResult.count === 1) {
    logger.info({
      event: "PAYMENT_SUCCESS",

      paymentId: payment.id,

      paymentReference: payment.paymentReference,

      quotationId: payment.quotationId,

      touristId: payment.touristId,

      amount: payment.amount,

      currency: payment.currency,

      paymentMethod: payment.paymentMethod,

      gatewayReference: payment.gatewayReference,

      status: payment.status,
    });
  } else {
    if (payment.status !== "SUCCESS") {
      throw new BadRequestError(
        `Cannot mark payment as successful from ${payment.status} status`,
      );
    }

    /**
     * Stripe may deliver more than one event that resolves to
     * this same payment (a redelivery of the same event, or a
     * retry after Booking creation previously failed). Ensure
     * the booking exists even if an earlier execution updated
     * the payment but failed before booking creation completed.
     */
    logger.info({
      event: "PAYMENT_SUCCESS_REPLAY",

      paymentId: payment.id,

      paymentReference: payment.paymentReference,

      quotationId: payment.quotationId,

      touristId: payment.touristId,

      gatewayReference: payment.gatewayReference,

      status: payment.status,
    });
  }

  /**
   * Successful payment creates the
   * confirmed booking.
   */
  await bookingsService.createBookingFromPayment(payment.id);

  return payment;
};

/**
 * =========================================================
 * Handle "checkout.session.completed" (paid)
 * =========================================================
 *
 * The only source of PermanentWebhookVerificationError in this
 * module -- every check here runs BEFORE any Payment mutation,
 * and each one can never produce a different outcome on retry
 * (a Stripe object's own amount_total/currency/id are immutable
 * historical facts once it exists), so the webhook handler
 * caches this outcome as a terminal, non-retryable FAILED event.
 */

const handleCheckoutSessionCompleted = async (session) => {
  const paymentId = session.metadata?.paymentId;

  if (!paymentId) {
    throw new PermanentWebhookVerificationError(
      "Payment ID missing from Stripe metadata",
    );
  }

  const payment = await paymentsRepository.findPaymentById(paymentId);

  if (!payment) {
    throw new PermanentWebhookVerificationError(
      "Payment not found for webhook metadata",
    );
  }

  if (
    payment.stripeCheckoutSessionId &&
    payment.stripeCheckoutSessionId !== session.id
  ) {
    throw new PermanentWebhookVerificationError(
      "Stripe session does not match the recorded payment session",
    );
  }

  const expectedMinorUnits = convertAmountToStripeMinorUnit(
    payment.amount,
    payment.currency,
  );

  if (session.amount_total !== expectedMinorUnits) {
    throw new PermanentWebhookVerificationError(
      "Stripe amount does not match the expected payment amount",
    );
  }

  if (session.currency !== payment.currency.trim().toLowerCase()) {
    throw new PermanentWebhookVerificationError(
      "Stripe currency does not match the expected payment currency",
    );
  }

  const stripePaymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;

  const gatewayReference = stripePaymentIntentId || session.id;

  return markPaymentSuccessful(paymentId, {
    stripePaymentIntentId,

    stripeCheckoutSessionId: session.id,

    gatewayReference,
  });
};

/**
 * =========================================================
 * Stripe Webhook Event Claim / Inspect
 * =========================================================
 *
 * See CR-007 plan §9.1. Provides mutual exclusion for
 * concurrent deliveries of the identical event without ever
 * caching a "done" outcome prematurely: PROCESSING (with a
 * claimedAt timestamp) is the only state written before the
 * full unit of work has actually finished.
 */

const STALE_CLAIM_MS = 60_000;

const claimOrInspectWebhookEvent = async (eventId, eventType) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await paymentsRepository.createWebhookEventClaim(eventId, eventType);

      return {
        outcome: "PROCEED",
      };
    } catch (error) {
      if (error.code !== "P2002") {
        throw error;
      }
    }

    const existing = await paymentsRepository.findWebhookEventById(eventId);

    if (!existing) {
      // Vanished between our failed insert and this read; retry the loop.
      continue;
    }

    if (existing.status === "PROCESSED") {
      return {
        outcome: "ALREADY_PROCESSED",
      };
    }

    if (existing.status === "FAILED") {
      return {
        outcome: "ALREADY_FAILED",

        failureReason: existing.failureReason,
      };
    }

    // status === "PROCESSING"
    const isStale =
      Date.now() - existing.claimedAt.getTime() > STALE_CLAIM_MS;

    if (!isStale) {
      return {
        outcome: "IN_PROGRESS",
      };
    }

    const takeover = await paymentsRepository.takeoverStaleWebhookClaim(
      eventId,
      existing.claimedAt,
    );

    if (takeover.count === 1) {
      return {
        outcome: "PROCEED",
      };
    }

    // Someone else resolved/took over first; loop and re-inspect.
  }

  // Safety valve after repeated contention.
  return {
    outcome: "IN_PROGRESS",
  };
};

const markWebhookEventProcessed = async (eventId) => {
  return paymentsRepository.markWebhookEventProcessed(eventId);
};

const markWebhookEventFailed = async (eventId, failureReason) => {
  return paymentsRepository.markWebhookEventFailed(eventId, failureReason);
};

/**
 * =========================================================
 * Mark Payment Failed
 * =========================================================
 *
 * Kept as an internal business method.
 *
 * We are NOT currently calling this for a
 * single Stripe card decline because the
 * tourist may retry another card.
 */

const markPaymentFailed = async (paymentId, data) => {
  const payment = await paymentsRepository.findPaymentById(paymentId);

  if (!payment) {
    throw new NotFoundError("Payment not found");
  }

  if (payment.status === "SUCCESS") {
    logger.warn({
      event: "PAYMENT_FAILURE_IGNORED",

      reason: "PAYMENT_ALREADY_SUCCESS",

      paymentId: payment.id,

      paymentReference: payment.paymentReference,

      quotationId: payment.quotationId,

      touristId: payment.touristId,

      incomingFailureReason: data.failureReason,

      status: payment.status,
    });

    return payment;
  }

  if (payment.status === "FAILED") {
    logger.info({
      event: "PAYMENT_FAILURE_REPLAY",

      paymentId: payment.id,

      paymentReference: payment.paymentReference,

      quotationId: payment.quotationId,

      touristId: payment.touristId,

      status: payment.status,
    });

    return payment;
  }

  if (!["PENDING", "PROCESSING"].includes(payment.status)) {
    throw new BadRequestError(
      `Cannot mark payment as failed from ${payment.status} status`,
    );
  }

  const failedPayment = await paymentsRepository.updatePaymentStatus(
    paymentId,
    {
      status: "FAILED",

      gatewayReference: data.gatewayReference || null,

      failureReason: data.failureReason,
    },
  );

  logger.warn({
    event: "PAYMENT_FAILED",

    paymentId: failedPayment.id,

    paymentReference: failedPayment.paymentReference,

    quotationId: failedPayment.quotationId,

    touristId: failedPayment.touristId,

    amount: failedPayment.amount,

    currency: failedPayment.currency,

    paymentMethod: failedPayment.paymentMethod,

    gatewayReference: failedPayment.gatewayReference,

    failureReason: failedPayment.failureReason,

    status: failedPayment.status,
  });

  return failedPayment;
};

module.exports = {
  PermanentWebhookVerificationError,
  initiatePayment,
  createCheckoutSession,
  getMyPayments,
  getPaymentById,
  markPaymentSuccessful,
  handleCheckoutSessionCompleted,
  claimOrInspectWebhookEvent,
  markWebhookEventProcessed,
  markWebhookEventFailed,
  markPaymentFailed,
};
