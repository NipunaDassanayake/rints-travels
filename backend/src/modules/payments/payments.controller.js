const paymentsService = require("./payments.service");

const asyncHandler = require("../../utils/asyncHandler");

const stripe = require("../../config/stripe");

const env = require("../../config/env");

const logger = require("../../config/logger");

const { sendSuccess } = require("../../utils/apiResponse");

const HTTP_STATUS = require("../../core/constants/httpStatus");

/**
 * =========================================================
 * Initiate Payment
 * =========================================================
 *
 * Temporary legacy endpoint.
 */

const initiatePayment = asyncHandler(async (req, res) => {
  const payment = await paymentsService.initiatePayment(req.user.id, req.body);

  return sendSuccess(
    res,
    "Payment initiated successfully",
    payment,
    HTTP_STATUS.CREATED,
  );
});

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
 * Temporary Manual Success
 * =========================================================
 *
 * This endpoint will be removed once the Stripe webhook
 * flow is completely verified.
 */

const markPaymentSuccessful = asyncHandler(async (req, res) => {
  const payment = await paymentsService.markPaymentSuccessful(
    req.params.id,
    req.body.gatewayReference,
  );

  return sendSuccess(res, "Payment completed successfully", payment);
});

/**
 * =========================================================
 * Temporary Manual Failure
 * =========================================================
 *
 * This endpoint will also be removed after Stripe is fully
 * handling payment completion/failure.
 */

const markPaymentFailed = asyncHandler(async (req, res) => {
  const payment = await paymentsService.markPaymentFailed(
    req.params.id,
    req.body,
  );

  return sendSuccess(res, "Payment marked as failed", payment);
});

/**
 * =========================================================
 * Stripe Webhook
 * =========================================================
 *
 * IMPORTANT:
 *
 * This endpoint must receive the raw request body.
 *
 * app.js must register it BEFORE:
 *
 * app.use(express.json())
 *
 * Example:
 *
 * app.post(
 *   "/api/payments/stripe/webhook",
 *   express.raw({ type: "application/json" }),
 *   paymentsController.handleStripeWebhook,
 * );
 */

const handleStripeWebhook = asyncHandler(async (req, res) => {
  /**
   * =======================================================
   * Stripe Signature
   * =======================================================
   */

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

  /**
   * Make sure webhook secret exists.
   */
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
   * =======================================================
   * Verify Webhook Signature
   * =======================================================
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
      message: error.message,
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
   * =======================================================
   * checkout.session.completed
   * =======================================================
   *
   * Stripe sends this when Checkout finishes.
   */

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    /**
     * Checkout may technically complete without
     * the payment being fully paid in some flows.
     *
     * We only finalize Travora payment when Stripe
     * explicitly reports payment_status = "paid".
     */
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

    /**
     * =====================================================
     * Recover Travora Payment ID
     * =====================================================
     *
     * This was added when creating the Checkout Session:
     *
     * metadata: {
     *   paymentId,
     *   quotationId,
     *   touristId,
     * }
     */

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

    /**
     * =====================================================
     * Gateway Reference
     * =====================================================
     *
     * Normally this will be a Stripe PaymentIntent:
     *
     * pi_...
     */

    const gatewayReference =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.id;

    /**
     * =====================================================
     * Complete Travora Payment
     * =====================================================
     *
     * Your existing service already handles:
     *
     * PENDING / PROCESSING -> SUCCESS
     *
     * gatewayReference
     * paidAt
     * failureReason = null
     *
     * AND:
     *
     * bookingsService.createBookingFromPayment()
     *
     * It is also idempotent, which is important because
     * Stripe may retry webhook events.
     */

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
   * =======================================================
   * Other Stripe Events
   * =======================================================
   *
   * For now we simply acknowledge events that Travora
   * doesn't need.
   *
   * Later we can support:
   *
   * checkout.session.expired
   * payment_intent.payment_failed
   * charge.refunded
   */

  return res.status(200).json({
    received: true,
  });
});

module.exports = {
  initiatePayment,

  createCheckoutSession,

  getMyPayments,

  getPaymentById,

  markPaymentSuccessful,

  markPaymentFailed,

  handleStripeWebhook,
};