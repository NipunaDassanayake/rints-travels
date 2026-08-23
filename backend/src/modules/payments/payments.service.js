const crypto = require("crypto");

const logger = require("../../config/logger");

const stripe = require("../../config/stripe");

const env = require("../../config/env");

const paymentsRepository = require("./payments.repository");

const quotationsRepository = require("../quotations/quotations.repository");

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
 * Stripe expects the amount in the smallest
 * currency unit.
 *
 * Example:
 *
 * USD 2150.00
 * ->
 * 215000 cents
 */
const convertAmountToStripeMinorUnit = (amount) => {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new BadRequestError("Invalid payment amount");
  }

  return Math.round(numericAmount * 100);
};

/**
 * =========================================================
 * Initiate Local Payment
 * =========================================================
 */

const initiatePayment = async (touristId, data) => {
  const quotation = await quotationsRepository.findQuotationById(
    data.quotationId,
  );

  if (!quotation) {
    throw new NotFoundError("Quotation not found");
  }

  /**
   * Only the tourist who owns the request
   * may pay the quotation.
   */
  if (quotation.tourRequest.touristId !== touristId) {
    throw new ForbiddenError(
      "You do not have permission to pay for this quotation",
    );
  }

  /**
   * Payment should only become available
   * after the tourist accepts the quotation.
   */
  if (quotation.status !== "ACCEPTED") {
    throw new BadRequestError(
      "Payment is only allowed for an accepted quotation",
    );
  }

  /**
   * =======================================================
   * Already Paid
   * =======================================================
   */

  const successfulPayment =
    await paymentsRepository.findSuccessfulPaymentByQuotationId(quotation.id);

  if (successfulPayment) {
    logger.info({
      event: "PAYMENT_ALREADY_COMPLETED",

      paymentId: successfulPayment.id,

      paymentReference: successfulPayment.paymentReference,

      quotationId: successfulPayment.quotationId,

      touristId: successfulPayment.touristId,

      status: successfulPayment.status,
    });

    throw new ConflictError("This quotation has already been paid");
  }

  /**
   * =======================================================
   * Reuse Active Payment
   * =======================================================
   *
   * Prevent duplicate pending payment records
   * when the tourist clicks the payment button
   * more than once.
   */

  const activePayment = await paymentsRepository.findActivePaymentByQuotationId(
    quotation.id,
  );

  if (activePayment) {
    logger.info({
      event: "PAYMENT_ACTIVE_REUSED",

      paymentId: activePayment.id,

      paymentReference: activePayment.paymentReference,

      quotationId: activePayment.quotationId,

      touristId: activePayment.touristId,

      amount: activePayment.amount,

      currency: activePayment.currency,

      paymentMethod: activePayment.paymentMethod,

      status: activePayment.status,
    });

    return activePayment;
  }

  /**
   * =======================================================
   * Create Local Payment
   * =======================================================
   */

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
};

/**
 * =========================================================
 * Create Stripe Checkout Session
 * =========================================================
 */

const createCheckoutSession = async (touristId, data) => {
  /**
   * Reuse the existing payment validation
   * and local payment creation logic.
   */
  const payment = await initiatePayment(touristId, {
    quotationId: data.quotationId,

    paymentMethod: "CARD",
  });

  /**
   * Stripe expects lowercase ISO
   * currency codes.
   */
  const currency = payment.currency.toLowerCase();

  const unitAmount = convertAmountToStripeMinorUnit(payment.amount);

  /**
   * =====================================================
   * Stripe Checkout Session
   * =====================================================
   */

  const checkoutSession = await stripe.checkout.sessions.create({
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

    metadata: {
      paymentId: payment.id,

      paymentReference: payment.paymentReference,

      quotationId: payment.quotationId,

      touristId: payment.touristId,
    },

    success_url: `${env.frontend.url}/tourist/payments/success?session_id={CHECKOUT_SESSION_ID}`,

    cancel_url: `${env.frontend.url}/tourist/payments/cancel?paymentId=${payment.id}`,
  });

  if (!checkoutSession.url) {
    throw new BadRequestError("Unable to create Stripe checkout URL");
  }

  logger.info({
    event: "STRIPE_CHECKOUT_SESSION_CREATED",

    paymentId: payment.id,

    paymentReference: payment.paymentReference,

    quotationId: payment.quotationId,

    touristId: payment.touristId,

    checkoutSessionId: checkoutSession.id,
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
 */

const markPaymentSuccessful = async (paymentId, gatewayReference) => {
  const payment = await paymentsRepository.findPaymentById(paymentId);

  if (!payment) {
    throw new NotFoundError("Payment not found");
  }

  /**
   * Idempotency:
   *
   * Stripe may deliver the same webhook
   * more than once.
   */
  if (payment.status === "SUCCESS") {
    logger.info({
      event: "PAYMENT_SUCCESS_REPLAY",

      paymentId: payment.id,

      paymentReference: payment.paymentReference,

      quotationId: payment.quotationId,

      touristId: payment.touristId,

      gatewayReference: payment.gatewayReference,

      status: payment.status,
    });

    /**
     * Ensure booking exists even when
     * payment was previously updated but
     * booking creation failed.
     */
    await bookingsService.createBookingFromPayment(payment.id);

    return payment;
  }

  if (!["PENDING", "PROCESSING"].includes(payment.status)) {
    throw new BadRequestError(
      `Cannot mark payment as successful from ${payment.status} status`,
    );
  }

  const successfulPayment = await paymentsRepository.updatePaymentStatus(
    paymentId,
    {
      status: "SUCCESS",

      gatewayReference,

      failureReason: null,

      paidAt: new Date(),
    },
  );

  logger.info({
    event: "PAYMENT_SUCCESS",

    paymentId: successfulPayment.id,

    paymentReference: successfulPayment.paymentReference,

    quotationId: successfulPayment.quotationId,

    touristId: successfulPayment.touristId,

    amount: successfulPayment.amount,

    currency: successfulPayment.currency,

    paymentMethod: successfulPayment.paymentMethod,

    gatewayReference: successfulPayment.gatewayReference,

    status: successfulPayment.status,
  });

  /**
   * Existing booking creation logic.
   */
  await bookingsService.createBookingFromPayment(successfulPayment.id);

  return successfulPayment;
};

/**
 * =========================================================
 * Mark Payment Failed
 * =========================================================
 */

const markPaymentFailed = async (paymentId, data) => {
  const payment = await paymentsRepository.findPaymentById(paymentId);

  if (!payment) {
    throw new NotFoundError("Payment not found");
  }

  /**
   * Never allow a late failure event
   * to overwrite a successful payment.
   */
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

  /**
   * Idempotent replay.
   */
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
  initiatePayment,

  createCheckoutSession,

  getMyPayments,

  getPaymentById,

  markPaymentSuccessful,

  markPaymentFailed,
};