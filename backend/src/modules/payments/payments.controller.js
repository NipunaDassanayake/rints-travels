const paymentsService = require("./payments.service");

const asyncHandler = require("../../utils/asyncHandler");

const stripe = require("../../config/stripe");

const env = require("../../config/env");

const logger = require("../../config/logger");

const { sendSuccess } = require("../../utils/apiResponse");

const HTTP_STATUS = require("../../core/constants/httpStatus");

/**
 * =========================================================
 * Stripe Checkout Session
 * =========================================================
 */

const createCheckoutSession = asyncHandler(async (req, res) => {
  const checkout = await paymentsService.createCheckoutSession(
    req.user.id,
    req.body,
  );

  return sendSuccess(
    res,
    "Stripe checkout session created successfully",
    checkout,
    HTTP_STATUS.CREATED,
  );
});

/**
 * =========================================================
 * Get My Payments
 * =========================================================
 */

const getMyPayments = asyncHandler(async (req, res) => {
  const payments = await paymentsService.getMyPayments(req.user.id);

  return sendSuccess(res, "Payments retrieved successfully", payments);
});

/**
 * =========================================================
 * Get Payment By ID
 * =========================================================
 */

const getPaymentById = asyncHandler(async (req, res) => {
  const payment = await paymentsService.getPaymentById(req.params.id, req.user);

  return sendSuccess(res, "Payment retrieved successfully", payment);
});

/**
 * =========================================================
 * Stripe Webhook
 * =========================================================
 *
 * IMPORTANT:
 *
 * app.js registers this route before express.json()
 * using express.raw({ type: "application/json" }).
 *
 * CR-007 governing principle (see plan §9): the
 * StripeWebhookEvent ledger's terminal PROCESSED state is only
 * ever written AFTER the complete unit of work for this event
 * -- including Booking creation -- has actually succeeded. Any
 * other failure leaves the claim in PROCESSING so a later
 * delivery can take over the stale claim and genuinely retry,
 * landing on the existing idempotent replay paths in
 * paymentsService.markPaymentSuccessful /
 * bookingsService.createBookingFromPayment. Only the four
 * pre-payment verification checks in
 * paymentsService.handleCheckoutSessionCompleted are ever
 * treated as permanently non-retryable (ledger FAILED).
 */

const handleStripeWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers["stripe-signature"];

  if (!signature) {
    logger.warn({
      event: "STRIPE_WEBHOOK_SIGNATURE_MISSING",
    });

    return res.status(400).json({
      received: false,

      message: "Missing Stripe signature",
    });
  }

  if (!env.stripe.webhookSecret) {
    logger.error({
      event: "STRIPE_WEBHOOK_SECRET_MISSING",
    });

    return res.status(500).json({
      received: false,

      message: "Stripe webhook secret is not configured",
    });
  }

  /**
   * =====================================================
   * Verify Stripe Signature
   * =====================================================
   */

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      env.stripe.webhookSecret,
    );
  } catch (error) {
    logger.warn({
      event: "STRIPE_WEBHOOK_SIGNATURE_INVALID",

      message:
        error instanceof Error
          ? error.message
          : "Unknown Stripe webhook signature error",
    });

    return res.status(400).json({
      received: false,

      message: "Invalid Stripe webhook signature",
    });
  }

  logger.info({
    event: "STRIPE_WEBHOOK_RECEIVED",

    stripeEventId: event.id,

    stripeEventType: event.type,
  });

  /**
   * =====================================================
   * Claim / Inspect The Event Ledger
   * =====================================================
   */

  const claim = await paymentsService.claimOrInspectWebhookEvent(
    event.id,
    event.type,
  );

  if (claim.outcome === "ALREADY_PROCESSED") {
    logger.info({
      event: "STRIPE_WEBHOOK_EVENT_REPLAY_PROCESSED",

      stripeEventId: event.id,
    });

    return res.status(200).json({
      received: true,
    });
  }

  if (claim.outcome === "ALREADY_FAILED") {
    logger.warn({
      event: "STRIPE_WEBHOOK_EVENT_REPLAY_FAILED",

      stripeEventId: event.id,

      reason: claim.failureReason,
    });

    return res.status(400).json({
      received: false,

      message: claim.failureReason,
    });
  }

  if (claim.outcome === "IN_PROGRESS") {
    logger.warn({
      event: "STRIPE_WEBHOOK_EVENT_CONCURRENT",

      stripeEventId: event.id,
    });

    return res.status(409).json({
      received: false,

      message: "Event is already being processed",
    });
  }

  // claim.outcome === "PROCEED" -- we hold the claim.

  try {
    /**
     * ===================================================
     * Checkout Session Completed
     * ===================================================
     */

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      if (session.payment_status !== "paid") {
        logger.info({
          event: "STRIPE_CHECKOUT_COMPLETED_NOT_PAID",

          checkoutSessionId: session.id,

          paymentStatus: session.payment_status,
        });
      } else {
        const successfulPayment =
          await paymentsService.handleCheckoutSessionCompleted(session);

        logger.info({
          event: "STRIPE_PAYMENT_COMPLETED",

          stripeEventId: event.id,

          checkoutSessionId: session.id,

          paymentId: successfulPayment.id,

          paymentReference: successfulPayment.paymentReference,

          quotationId: successfulPayment.quotationId,

          touristId: successfulPayment.touristId,

          gatewayReference: successfulPayment.gatewayReference,

          status: successfulPayment.status,
        });
      }
    }

    /**
     * ===================================================
     * Payment Attempt Failed
     * ===================================================
     *
     * IMPORTANT:
     *
     * We do not mark the Travora payment FAILED
     * immediately.
     *
     * Stripe Checkout may allow the tourist to retry
     * using another card.
     */

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object;

      const paymentId = paymentIntent.metadata?.paymentId;

      const lastPaymentError = paymentIntent.last_payment_error;

      logger.warn({
        event: "STRIPE_PAYMENT_ATTEMPT_FAILED",

        stripeEventId: event.id,

        paymentIntentId: paymentIntent.id,

        paymentId: paymentId ?? null,

        failureCode: lastPaymentError?.code ?? null,

        declineCode: lastPaymentError?.decline_code ?? null,

        failureMessage:
          lastPaymentError?.message ?? "Stripe payment attempt failed",
      });
    }

    /**
     * ===================================================
     * Checkout Session Expired
     * ===================================================
     *
     * We reuse the same local PENDING payment across
     * checkout attempts (see paymentsService.createCheckoutSession's
     * retrieve-and-reuse / retry-keyed logic). Therefore an old
     * Checkout Session expiring must not automatically fail the
     * local payment.
     */

    if (event.type === "checkout.session.expired") {
      const session = event.data.object;

      logger.info({
        event: "STRIPE_CHECKOUT_SESSION_EXPIRED",

        stripeEventId: event.id,

        checkoutSessionId: session.id,

        paymentId: session.metadata?.paymentId ?? null,

        quotationId: session.metadata?.quotationId ?? null,
      });
    }

    /**
     * ===================================================
     * Mark Fully Processed
     * ===================================================
     *
     * Reached only if every branch above completed without
     * throwing -- including, for checkout.session.completed,
     * Booking creation inside handleCheckoutSessionCompleted.
     */

    await paymentsService.markWebhookEventProcessed(event.id);

    return res.status(200).json({
      received: true,
    });
  } catch (error) {
    if (error instanceof paymentsService.PermanentWebhookVerificationError) {
      await paymentsService.markWebhookEventFailed(event.id, error.message);

      logger.error({
        event: "STRIPE_WEBHOOK_PERMANENT_FAILURE",

        stripeEventId: event.id,

        message: error.message,
      });

      return res.status(400).json({
        received: false,

        message: error.message,
      });
    }

    /**
     * Deliberately do NOT mark PROCESSED or FAILED. The row
     * stays PROCESSING with its original claimedAt, so the next
     * delivery's stale-claim takeover (see
     * paymentsService.claimOrInspectWebhookEvent) re-runs this
     * entire block from scratch once Stripe retries.
     */
    logger.error({
      event: "STRIPE_WEBHOOK_PROCESSING_ERROR",

      stripeEventId: event.id,

      message: error.message,
    });

    throw error;
  }
});

module.exports = {
  createCheckoutSession,
  getMyPayments,
  getPaymentById,
  handleStripeWebhook,
};
