const crypto = require("crypto");

const logger = require("../../config/logger");

const bookingsRepository = require("./bookings.repository");

const {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} = require("../../utils/AppError");

const { USER_ROLES } = require("../../core/constants/auth.constants");

const generateBookingReference = () => {
  return `BKG-${Date.now()}-${crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase()}`;
};

const createBookingFromPayment = async (paymentId) => {
  const existing = await bookingsRepository.findBookingByPaymentId(paymentId);

  if (existing) {
    logger.info({
      event: "BOOKING_ALREADY_EXISTS",

      bookingId: existing.id,

      bookingReference: existing.bookingReference,

      paymentId,

      touristId: existing.touristId,

      quotationId: existing.quotationId,

      tourRequestId: existing.tourRequestId,

      status: existing.status,
    });

    return existing;
  }

  const booking = await bookingsRepository.confirmBookingFromPayment({
    paymentId,

    bookingReference: generateBookingReference(),
  });

  if (!booking) {
    logger.warn({
      event: "BOOKING_CREATION_FAILED",

      paymentId,

      reason: "PAYMENT_NOT_SUCCESSFUL",
    });

    throw new BadRequestError(
      "Booking can only be created from a successful payment",
    );
  }

  logger.info({
    event: "BOOKING_CREATED",

    bookingId: booking.id,

    bookingReference: booking.bookingReference,

    paymentId: booking.paymentId,

    touristId: booking.touristId,

    quotationId: booking.quotationId,

    tourRequestId: booking.tourRequestId,

    guideId: booking.guideId,

    totalAmount: booking.totalAmount,

    currency: booking.currency,

    status: booking.status,

    bookedAt: booking.bookedAt,
  });

  return booking;
};

const getMyBookings = async (touristId) => {
  return bookingsRepository.findBookingsByTouristId(touristId);
};

const getBookingById = async (bookingId, currentUser) => {
  const booking = await bookingsRepository.findBookingById(bookingId);

  if (!booking) {
    throw new NotFoundError("Booking not found");
  }

  const isOwner = booking.touristId === currentUser.id;

  const isAdmin =
    currentUser.role === USER_ROLES.ADMIN ||
    currentUser.role === USER_ROLES.SYSTEM_ADMIN;

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError("You do not have permission to view this booking");
  }

  return booking;
};

module.exports = {
  createBookingFromPayment,
  getMyBookings,
  getBookingById,
};