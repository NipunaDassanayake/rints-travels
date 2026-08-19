const crypto = require("crypto");

const logger = require("../../config/logger");

const bookingsRepository = require("./bookings.repository");

const tourGuidesRepository = require("../tour-guides/tourGuides.repository");

const {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
} = require("../../utils/AppError");

const { USER_ROLES } = require("../../core/constants/auth.constants");

/**
 * =========================================================
 * Booking Reference
 * =========================================================
 */

const generateBookingReference = () => {
  return `BKG-${Date.now()}-${crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase()}`;
};

/**
 * =========================================================
 * Booking Lifecycle
 * =========================================================
 */

const BOOKING_STATUS_TRANSITIONS = {
  CONFIRMED: ["IN_PROGRESS", "CANCELLED"],

  IN_PROGRESS: ["COMPLETED", "CANCELLED"],

  COMPLETED: [],

  CANCELLED: [],
};

/**
 * =========================================================
 * Create Booking
 * =========================================================
 */

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

/**
 * =========================================================
 * Tourist Bookings
 * =========================================================
 */

const getMyBookings = async (touristId) => {
  return bookingsRepository.findBookingsByTouristId(touristId);
};

/**
 * =========================================================
 * Admin Bookings
 * =========================================================
 */

const getAllBookings = async (query = {}) => {
  return bookingsRepository.findAllBookings({
    status: query.status,

    touristId: query.touristId,
  });
};

/**
 * =========================================================
 * Get Booking
 * =========================================================
 */

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

/**
 * =========================================================
 * Update Booking Status
 * =========================================================
 */

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

  /**
   * Don't allow a tour to start without a guide.
   *
   * We can relax this rule later for self-guided tours,
   * but for Travora's guided-tour flow it protects us
   * from starting an incomplete booking.
   */

  if (newStatus === "IN_PROGRESS" && !booking.quotation.guideId) {
    throw new BadRequestError("Assign a tour guide before starting the tour");
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

/**
 * =========================================================
 * Assign Guide
 * =========================================================
 */

const assignBookingGuide = async (bookingId, guideId, currentUser) => {
  const booking = await bookingsRepository.findBookingById(bookingId);

  if (!booking) {
    throw new NotFoundError("Booking not found");
  }

  /**
   * Completed/cancelled bookings should be immutable.
   */

  if (["COMPLETED", "CANCELLED"].includes(booking.status)) {
    throw new BadRequestError(
      `Cannot assign a guide to a ${booking.status.toLowerCase()} booking`,
    );
  }

  /**
   * Validate guide.
   */

  const guide = await tourGuidesRepository.findTourGuideById(guideId);

  if (!guide) {
    throw new NotFoundError("Tour guide not found");
  }

  if (!guide.isAvailable) {
    throw new BadRequestError("This tour guide is currently unavailable");
  }

  /**
   * If the same guide is already assigned,
   * simply return the existing booking.
   */

  if (booking.quotation.guideId === guideId) {
    return booking;
  }

  /**
   * Prevent overlapping assignments.
   */

  const conflict = await bookingsRepository.findGuideBookingConflict({
    guideId,

    startDate: booking.startDate,

    endDate: booking.endDate,

    excludeBookingId: booking.id,
  });

  if (conflict) {
    throw new ConflictError(
      `This guide is already assigned to another booking from ${conflict.startDate.toISOString().slice(0, 10)} to ${conflict.endDate.toISOString().slice(0, 10)}`,
    );
  }

  const updatedBooking = await bookingsRepository.assignGuideToBooking(
    bookingId,
    guideId,
  );

  if (!updatedBooking) {
    throw new NotFoundError("Booking not found");
  }

  logger.info({
    event: "BOOKING_GUIDE_ASSIGNED",

    bookingId: updatedBooking.id,

    bookingReference: updatedBooking.bookingReference,

    quotationId: updatedBooking.quotationId,

    previousGuideId: booking.quotation.guideId,

    guideId,

    assignedByUserId: currentUser.id,

    assignedByRole: currentUser.role,
  });

  return updatedBooking;
};

module.exports = {
  createBookingFromPayment,

  getMyBookings,

  getAllBookings,

  getBookingById,

  updateBookingStatus,

  assignBookingGuide,
};