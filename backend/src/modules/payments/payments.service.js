const crypto = require("crypto");

const logger = require("../../config/logger");

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

const generatePaymentReference = () => {
  return `PAY-${Date.now()}-${crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase()}`;
};

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

const getMyPayments = async (touristId) => {
  return paymentsRepository.findPaymentsByTouristId(touristId);
};

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

const markPaymentSuccessful = async (paymentId, gatewayReference) => {
  const payment = await paymentsRepository.findPaymentById(paymentId);

  if (!payment) {
    throw new NotFoundError("Payment not found");
  }

  /*
   * Idempotency:
   * The payment gateway may send the same
   * SUCCESS callback more than once.
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

    /*
     * Make sure a booking exists even if a
     * previous request updated the payment
     * but failed before booking creation.
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

  await bookingsService.createBookingFromPayment(successfulPayment.id);

  return successfulPayment;
};

const markPaymentFailed = async (paymentId, data) => {
  const payment = await paymentsRepository.findPaymentById(paymentId);

  if (!payment) {
    throw new NotFoundError("Payment not found");
  }

  /*
   * Never allow a late FAILED callback
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
  getMyPayments,
  getPaymentById,
  markPaymentSuccessful,
  markPaymentFailed,
};