const paymentsService = require("./payments.service");

const asyncHandler = require("../../utils/asyncHandler");

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
 * Placeholder for now.
 *
 * Signature verification will be implemented
 * immediately after Checkout is verified.
 */

const handleStripeWebhook = asyncHandler(async (req, res) => {
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