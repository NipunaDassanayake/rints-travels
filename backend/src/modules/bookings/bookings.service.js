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

const BOOKING_STATUS_TRANSITIONS = {
  CONFIRMED: ["IN_PROGRESS", "CANCELLED"],

  IN_PROGRESS: ["COMPLETED", "CANCELLED"],

  COMPLETED: [],

  CANCELLED: [],
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

    totalAmount: booking.totalAmount,

    currency: booking.currency,

    status: booking.status,

    confirmedAt: booking.confirmedAt,
  });

  return booking;
};

const getMyBookings = async (touristId) => {
  return bookingsRepository.findBookingsByTouristId(touristId);
};

const getAllBookings = async (query = {}) => {
  return bookingsRepository.findAllBookings({
    status: query.status,

    touristId: query.touristId,
  });
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

const updateBookingStatus = async (bookingId, newStatus, currentUser) => {
  const booking = await bookingsRepository.findBookingById(bookingId);

  if (!booking) {
    throw new NotFoundError("Booking not found");
  }

  const allowedStatuses = BOOKING_STATUS_TRANSITIONS[booking.status] || [];

  if (!allowedStatuses.includes(newStatus)) {
    throw new BadRequestError(
      `Cannot change booking status from ${booking.status} to ${newStatus}`,
    );
  }

  const updatedBooking = await bookingsRepository.updateBookingStatus(
    bookingId,
    newStatus,
  );

  logger.info({
    event: "BOOKING_STATUS_CHANGED",

    bookingId: updatedBooking.id,

    bookingReference: updatedBooking.bookingReference,

    touristId: updatedBooking.touristId,

    tourRequestId: updatedBooking.tourRequestId,

    quotationId: updatedBooking.quotationId,

    paymentId: updatedBooking.paymentId,

    previousStatus: booking.status,

    newStatus: updatedBooking.status,

    changedByUserId: currentUser.id,

    changedByRole: currentUser.role,
  });

  return updatedBooking;
};

module.exports = {
  createBookingFromPayment,
  getMyBookings,
  getAllBookings,
  getBookingById,
  updateBookingStatus,
};