const crypto = require("crypto");

const paymentsRepository =
  require("./payments.repository");

const quotationsRepository =
  require("../quotations/quotations.repository");

const bookingsService =
  require("../bookings/bookings.service");

const {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  ConflictError,
} = require("../../utils/AppError");

const {
  USER_ROLES,
} = require("../../core/constants/auth.constants");

const generatePaymentReference = () => {
  return `PAY-${Date.now()}-${crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase()}`;
};

const initiatePayment = async (
  touristId,
  data
) => {
  const quotation =
    await quotationsRepository.findQuotationById(
      data.quotationId
    );

  if (!quotation) {
    throw new NotFoundError(
      "Quotation not found"
    );
  }

  if (
    quotation.tourRequest.touristId !== touristId
  ) {
    throw new ForbiddenError(
      "You do not have permission to pay for this quotation"
    );
  }

  if (quotation.status !== "ACCEPTED") {
    throw new BadRequestError(
      "Payment is only allowed for an accepted quotation"
    );
  }

  const successfulPayment =
    await paymentsRepository
      .findSuccessfulPaymentByQuotationId(
        quotation.id
      );

  if (successfulPayment) {
    throw new ConflictError(
      "This quotation has already been paid"
    );
  }

  const activePayment =
    await paymentsRepository
      .findActivePaymentByQuotationId(
        quotation.id
      );

  if (activePayment) {
    return activePayment;
  }

  return paymentsRepository.createPayment({
    quotationId: quotation.id,
    touristId,

    paymentReference:
      generatePaymentReference(),

    amount: quotation.totalAmount,
    currency: quotation.currency,

    paymentMethod: data.paymentMethod,
    status: "PENDING",
  });
};

const getMyPayments = async (touristId) => {
  return paymentsRepository
    .findPaymentsByTouristId(
      touristId
    );
};

const getPaymentById = async (
  paymentId,
  currentUser
) => {
  const payment =
    await paymentsRepository.findPaymentById(
      paymentId
    );

  if (!payment) {
    throw new NotFoundError(
      "Payment not found"
    );
  }

  const isOwner =
    payment.touristId === currentUser.id;

  const isAdmin =
    currentUser.role === USER_ROLES.ADMIN ||
    currentUser.role === USER_ROLES.SYSTEM_ADMIN;

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError(
      "You do not have permission to view this payment"
    );
  }

  return payment;
};

const markPaymentSuccessful = async (
  paymentId,
  gatewayReference
) => {
  const payment =
    await paymentsRepository.findPaymentById(
      paymentId
    );

  if (!payment) {
    throw new NotFoundError(
      "Payment not found"
    );
  }

  /**
   * Idempotency:
   * The payment gateway may send the same
   * SUCCESS callback more than once.
   */
  if (payment.status === "SUCCESS") {
    /*
     * Make sure a booking exists even if a previous
     * request updated the payment but failed before
     * booking creation.
     */
    await bookingsService.createBookingFromPayment(
      payment.id
    );

    return payment;
  }

  if (
    !["PENDING", "PROCESSING"].includes(
      payment.status
    )
  ) {
    throw new BadRequestError(
      `Cannot mark payment as successful from ${payment.status} status`
    );
  }

  const successfulPayment =
    await paymentsRepository.updatePaymentStatus(
      paymentId,
      {
        status: "SUCCESS",
        gatewayReference,
        failureReason: null,
        paidAt: new Date(),
      }
    );

  await bookingsService.createBookingFromPayment(
    successfulPayment.id
  );

  return successfulPayment;
};

const markPaymentFailed = async (
  paymentId,
  data
) => {
  const payment =
    await paymentsRepository.findPaymentById(
      paymentId
    );

  if (!payment) {
    throw new NotFoundError(
      "Payment not found"
    );
  }

  /**
   * Never allow a late FAILED callback
   * to overwrite a successful payment.
   */
  if (payment.status === "SUCCESS") {
    return payment;
  }

  if (payment.status === "FAILED") {
    return payment;
  }

  if (
    !["PENDING", "PROCESSING"].includes(
      payment.status
    )
  ) {
    throw new BadRequestError(
      `Cannot mark payment as failed from ${payment.status} status`
    );
  }

  return paymentsRepository.updatePaymentStatus(
    paymentId,
    {
      status: "FAILED",
      gatewayReference:
        data.gatewayReference || null,
      failureReason: data.failureReason,
    }
  );
};

module.exports = {
  initiatePayment,
  getMyPayments,
  getPaymentById,
  markPaymentSuccessful,
  markPaymentFailed,
};