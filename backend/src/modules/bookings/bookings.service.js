const crypto = require("crypto");

const bookingsRepository = require("./bookings.repository");

const {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} = require("../../utils/AppError");

const {
  USER_ROLES,
} = require("../../core/constants/auth.constants");

const generateBookingReference = () => {
  return `BKG-${Date.now()}-${crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase()}`;
};

const createBookingFromPayment = async (paymentId) => {
  const existing =
    await bookingsRepository.findBookingByPaymentId(paymentId);

  if (existing) {
    return existing;
  }

  const booking =
    await bookingsRepository.confirmBookingFromPayment({
      paymentId,
      bookingReference: generateBookingReference(),
    });

  if (!booking) {
    throw new BadRequestError(
      "Booking can only be created from a successful payment"
    );
  }

  return booking;
};

const getMyBookings = async (touristId) => {
  return bookingsRepository.findBookingsByTouristId(touristId);
};

const getBookingById = async (
  bookingId,
  currentUser
) => {
  const booking =
    await bookingsRepository.findBookingById(bookingId);

  if (!booking) {
    throw new NotFoundError("Booking not found");
  }

  const isOwner =
    booking.touristId === currentUser.id;

  const isAdmin =
    currentUser.role === USER_ROLES.ADMIN ||
    currentUser.role === USER_ROLES.SYSTEM_ADMIN;

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError(
      "You do not have permission to view this booking"
    );
  }

  return booking;
};

module.exports = {
  createBookingFromPayment,
  getMyBookings,
  getBookingById,
};