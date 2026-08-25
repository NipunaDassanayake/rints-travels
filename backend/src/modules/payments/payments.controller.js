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
   * Checkout Session Completed
   * =====================================================
   */

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    if (session.payment_status !== "paid") {
      logger.info({
        event: "STRIPE_CHECKOUT_COMPLETED_NOT_PAID",

        checkoutSessionId: session.id,

        paymentStatus: session.payment_status,
      });

      return res.status(200).json({
        received: true,
      });
    }

    const paymentId = session.metadata?.paymentId;

    if (!paymentId) {
      logger.error({
        event: "STRIPE_PAYMENT_ID_MISSING",

        checkoutSessionId: session.id,
      });

      return res.status(400).json({
        received: false,

        message: "Payment ID missing from Stripe metadata",
      });
    }

    const gatewayReference =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.id;

    const successfulPayment = await paymentsService.markPaymentSuccessful(
      paymentId,
      gatewayReference,
    );

    logger.info({
      event: "STRIPE_PAYMENT_COMPLETED",

      stripeEventId: event.id,

      checkoutSessionId: session.id,

      paymentId: successfulPayment.id,

      paymentReference: successfulPayment.paymentReference,

      quotationId: successfulPayment.quotationId,

      touristId: successfulPayment.touristId,

      gatewayReference,

      status: successfulPayment.status,
    });
  }

  /**
   * =====================================================
   * Payment Attempt Failed
   * =====================================================
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
   * =====================================================
   * Checkout Session Expired
   * =====================================================
   *
   * We reuse the same local PENDING payment across
   * checkout attempts.
   *
   * Therefore an old Checkout Session expiring must
   * not automatically fail the local payment.
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
   * =====================================================
   * Other Stripe Events
   * =====================================================
   *
   * Unused events are acknowledged with 200 so
   * Stripe does not retry them unnecessarily.
   */

  return res.status(200).json({
    received: true,
  });
});

module.exports = {
  createCheckoutSession,
  getMyPayments,
  getPaymentById,
  handleStripeWebhook,
};