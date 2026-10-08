const crypto = require("crypto");

const logger = require("../../config/logger");

const bookingsRepository = require("./bookings.repository");

const tourGuidesRepository = require("../tour-guides/tourGuides.repository");

const {
  AppError,
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
} = require("../../utils/AppError");

const {
  CODE_TTL_MS,
  generateCode,
  hashCode,
  codeMatches,
} = require("./bookingLifecycleChallenge");

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
 * Booking Status Transitions
 * =========================================================
 */

/*
 * Transitions an admin may request directly. Starting and
 * completing a tour are not here: they only happen through the
 * traveler-confirmed lifecycle (CR-032).
 */
const BOOKING_STATUS_TRANSITIONS = {
  CONFIRMED: ["CANCELLED"],

  IN_PROGRESS: ["CANCELLED"],

  COMPLETED: [],

  CANCELLED: [],
};

/**
 * =========================================================
 * Create Booking From Payment
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

  let booking;

  try {
    booking = await bookingsRepository.confirmBookingFromPayment({
      paymentId,

      bookingReference: generateBookingReference(),
    });
  } catch (error) {
    logger.error({
      event: "BOOKING_CONFIRMATION_BLOCKED",

      paymentId,

      reason: error.message,
    });

    throw error;
  }

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
 * Tourist - My Bookings
 * =========================================================
 */

const getMyBookings = async (touristId) => {
  return bookingsRepository.findBookingsByTouristId(touristId);
};

/**
 * =========================================================
 * Tour Guide - My Assigned Bookings
 * =========================================================
 */

const getMyGuideBookings = async (userId) => {
  return bookingsRepository.findBookingsByGuideUserId(userId);
};

/**
 * =========================================================
 * Admin - All Bookings
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
 * Booking Details
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

  const isAssignedGuide =
    currentUser.role === USER_ROLES.TOUR_GUIDE &&
    booking.quotation.guide?.userId === currentUser.id;

  if (!isOwner && !isAdmin && !isAssignedGuide) {
    throw new ForbiddenError("You do not have permission to view this booking");
  }

  return booking;
};

/**
 * =========================================================
 * Admin - Update Booking Status (cancellation only, CR-032)
 * =========================================================
 *
 * The generic admin status endpoint can only cancel. Starting
 * and completing a tour need the traveler's confirmation code
 * (verifyLifecycleChallenge); no admin path bypasses that.
 */

const updateBookingStatus = async (bookingId, newStatus, currentUser) => {
  if (newStatus !== "CANCELLED") {
    throw new BadRequestError(
      "Bookings can only be cancelled here. Tours are started and completed by the assigned guide with the traveler's confirmation code.",
    );
  }

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

  const result = await bookingsRepository.cancelBookingTransaction({ bookingId });

  if (result.outcome === "NOT_FOUND") {
    throw new NotFoundError("Booking not found");
  }

  if (result.outcome === "STATUS_MISMATCH") {
    throw new ConflictError(
      `Cannot change booking status from ${result.currentStatus} to ${newStatus}`,
      { code: "BOOKING_STATUS_MISMATCH", currentStatus: result.currentStatus },
    );
  }

  const updatedBooking = result.booking;

  logger.info({
    event: "BOOKING_STATUS_CHANGED",

    bookingId: updatedBooking.id,

    bookingReference: updatedBooking.bookingReference,

    touristId: updatedBooking.touristId,

    tourRequestId: updatedBooking.tourRequestId,

    quotationId: updatedBooking.quotationId,

    paymentId: updatedBooking.paymentId,

    previousStatus: result.previousStatus,

    newStatus: updatedBooking.status,

    invalidatedChallenges: result.invalidatedChallenges,

    changedByUserId: currentUser.id,

    changedByRole: currentUser.role,
  });

  return updatedBooking;
};

/**
 * =========================================================
 * Admin - Assign Guide
 * =========================================================
 */

const assignBookingGuide = async (bookingId, guideId, currentUser) => {
  const booking = await bookingsRepository.findBookingById(bookingId);

  if (!booking) {
    throw new NotFoundError("Booking not found");
  }

  if (["COMPLETED", "CANCELLED"].includes(booking.status)) {
    throw new BadRequestError(
      `Cannot assign a guide to a ${booking.status.toLowerCase()} booking`,
    );
  }

  const guide = await tourGuidesRepository.findTourGuideById(guideId);

  if (!guide) {
    throw new NotFoundError("Tour guide not found");
  }

  if (guide.user.status !== "ACTIVE") {
    throw new BadRequestError("This tour guide's account is not active");
  }

  if (!guide.isAvailable) {
    throw new BadRequestError("This tour guide is currently unavailable");
  }

  if (booking.quotation.guideId === guideId) {
    return booking;
  }

  const conflict = await bookingsRepository.findGuideBookingConflict({
    guideId,

    startDate: booking.startDate,

    endDate: booking.endDate,

    excludeBookingId: booking.id,
  });

  if (conflict) {
    throw new ConflictError(
      `This guide is already assigned to another booking from ${conflict.startDate
        .toISOString()
        .slice(0, 10)} to ${conflict.endDate.toISOString().slice(0, 10)}`,
    );
  }

  const result = await bookingsRepository.assignGuideToBooking(bookingId, guideId);

  if (result.outcome === "NOT_FOUND") {
    throw new NotFoundError("Booking not found");
  }

  if (result.outcome === "STATUS_MISMATCH") {
    throw new BadRequestError(
      `Cannot assign a guide to a ${result.currentStatus.toLowerCase()} booking`,
    );
  }

  const updatedBooking = result.booking;

  logger.info({
    event: "BOOKING_GUIDE_ASSIGNED",

    bookingId: updatedBooking.id,

    bookingReference: updatedBooking.bookingReference,

    quotationId: updatedBooking.quotationId,

    previousGuideId: result.previousGuideId,

    guideId,

    invalidatedChallenges: result.invalidatedChallenges,

    assignedByUserId: currentUser.id,

    assignedByRole: currentUser.role,
  });

  return updatedBooking;
};

/**
 * =========================================================
 * Traveler - Generate Tour Confirmation Code (CR-032)
 * =========================================================
 *
 * Returns the plaintext code exactly once. Only its HMAC is
 * stored, and it is never logged.
 */

const createLifecycleChallenge = async (bookingId, action, currentUser) => {
  const challengeId = crypto.randomUUID();

  const code = generateCode();

  const now = new Date();

  const expiresAt = new Date(now.getTime() + CODE_TTL_MS);

  const result = await bookingsRepository.createLifecycleChallengeTransaction({
    bookingId,

    touristUserId: currentUser.id,

    action,

    challengeId,

    codeHash: hashCode({ challengeId, bookingId, action, code }),

    expiresAt,

    now,
  });

  switch (result.outcome) {
    case "NOT_FOUND":
      throw new NotFoundError("Booking not found");

    case "FORBIDDEN":
      throw new ForbiddenError("You do not have permission to confirm this booking");

    case "STATUS_MISMATCH":
      throw new ConflictError(
        action === "START"
          ? "Only a confirmed booking can be started"
          : "Only a tour in progress can be completed",
        { code: "BOOKING_STATUS_MISMATCH", currentStatus: result.currentStatus },
      );

    case "NO_ASSIGNED_GUIDE":
      throw new ConflictError("A tour guide has not been assigned to this booking yet", {
        code: "NO_ASSIGNED_GUIDE",
      });

    default:
      break;
  }

  logger.info({
    event: "BOOKING_LIFECYCLE_CODE_GENERATED",

    bookingId,

    bookingReference: result.bookingReference,

    action,

    challengeId: result.challenge.id,

    touristUserId: currentUser.id,

    replacedChallenges: result.replacedChallenges,

    expiresAt: result.challenge.expiresAt,
  });

  return {
    action: result.challenge.action,

    code,

    expiresAt: result.challenge.expiresAt,

    guide: result.guide,
  };
};

/**
 * =========================================================
 * Guide - Start / Complete Tour With Code (CR-032)
 * =========================================================
 *
 * The repository transaction returns an outcome and commits
 * (so failed attempts and expiry are recorded); errors are only
 * raised here, after the commit.
 */

const VERIFY_EVENTS = {
  START: "GUIDE_TOUR_STARTED",

  COMPLETE: "GUIDE_TOUR_COMPLETED",
};

const verifyLifecycleChallenge = async (bookingId, action, code, currentUser) => {
  const result = await bookingsRepository.verifyLifecycleChallengeTransaction({
    bookingId,

    guideUserId: currentUser.id,

    action,

    codeMatches: (challenge) => codeMatches(challenge, code),
  });

  if (result.outcome === "VERIFIED") {
    logger.info({
      event: VERIFY_EVENTS[action],

      bookingId,

      bookingReference: result.bookingReference,

      action,

      challengeId: result.challengeId,

      guideUserId: currentUser.id,

      previousStatus: result.previousStatus,

      newStatus: result.booking.status,

      startedAt: result.booking.startedAt,

      completedAt: result.booking.completedAt,
    });

    return result.booking;
  }

  if (result.outcome === "NOT_FOUND") {
    throw new NotFoundError("Booking not found");
  }

  /*
   * More than one open code for the same booking and action
   * breaks the generation invariant. Fail closed: nothing was
   * counted or transitioned. A newly generated code invalidates
   * every open one, which restores the invariant.
   */
  if (result.outcome === "INTEGRITY_VIOLATION") {
    logger.error({
      event: "BOOKING_LIFECYCLE_INTEGRITY_VIOLATION",

      bookingId,

      bookingReference: result.bookingReference,

      action,

      guideUserId: currentUser.id,

      openChallenges: result.openChallenges,
    });

    throw new AppError(
      "This confirmation code can't be checked right now. Ask the traveler to generate a new code.",
      500,
      {
        code: "CONFIRMATION_INTEGRITY_ERROR",
      },
    );
  }

  logger.warn({
    event: "BOOKING_LIFECYCLE_VERIFY_FAILED",

    bookingId,

    bookingReference: result.bookingReference,

    action,

    challengeId: result.challengeId ?? null,

    guideUserId: currentUser.id,

    reason: result.outcome,

    attemptsRemaining: result.attemptsRemaining ?? null,
  });

  if (result.exhaustedNow) {
    logger.warn({
      event: "BOOKING_LIFECYCLE_ATTEMPTS_EXHAUSTED",

      bookingId,

      bookingReference: result.bookingReference,

      action,

      challengeId: result.challengeId,

      guideUserId: currentUser.id,
    });
  }

  if (result.expiredNow) {
    logger.info({
      event: "BOOKING_LIFECYCLE_CODE_INVALIDATED",

      bookingId,

      action,

      challengeId: result.challengeId,

      reason: "EXPIRED",
    });
  }

  switch (result.outcome) {
    case "NOT_ASSIGNED":
      throw new AppError("You are not assigned to this booking", 403, {
        code: "NOT_ASSIGNED_GUIDE",
      });

    case "STATUS_MISMATCH":
      throw new ConflictError(
        `Tour cannot be ${action === "START" ? "started" : "completed"} from ${result.currentStatus} status`,
        { code: "BOOKING_STATUS_MISMATCH", currentStatus: result.currentStatus },
      );

    case "CODE_EXPIRED":
      throw new ConflictError("This confirmation code has expired", { code: "CODE_EXPIRED" });

    case "ATTEMPTS_EXHAUSTED":
      throw new AppError("Too many incorrect attempts for this confirmation code", 429, {
        code: "TOO_MANY_ATTEMPTS",
      });

    case "CODE_INCORRECT":
      throw new BadRequestError("The confirmation code is incorrect", {
        code: "CODE_INCORRECT",
        attemptsRemaining: result.attemptsRemaining,
      });

    default:
      throw new ConflictError("There is no active confirmation code for this tour", {
        code: "NO_ACTIVE_CODE",
      });
  }
};

module.exports = {
  createBookingFromPayment,

  getMyBookings,
  getMyGuideBookings,

  getAllBookings,

  getBookingById,

  updateBookingStatus,

  assignBookingGuide,

  createLifecycleChallenge,
  verifyLifecycleChallenge,
};
