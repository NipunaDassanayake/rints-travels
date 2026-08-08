const bookingsService = require("./bookings.service");
const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");

const getMyBookings = asyncHandler(async (req, res) => {
  const bookings =
    await bookingsService.getMyBookings(req.user.id);

  return sendSuccess(
    res,
    "Bookings retrieved successfully",
    bookings
  );
});

const getBookingById = asyncHandler(async (req, res) => {
  const booking =
    await bookingsService.getBookingById(
      req.params.id,
      req.user
    );

  return sendSuccess(
    res,
    "Booking retrieved successfully",
    booking
  );
});

module.exports = {
  getMyBookings,
  getBookingById,
};