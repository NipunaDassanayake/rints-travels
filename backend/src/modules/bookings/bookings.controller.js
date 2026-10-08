const bookingsService = require("./bookings.service");

const asyncHandler = require("../../utils/asyncHandler");

const { sendSuccess } = require("../../utils/apiResponse");

/**
 * =========================================================
 * Tourist - My Bookings
 * =========================================================
 */

const getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await bookingsService.getMyBookings(req.user.id);

  return sendSuccess(res, "Bookings retrieved successfully", bookings);
});

/**
 * =========================================================
 * Tour Guide - My Assigned Bookings
 * =========================================================
 */

const getMyGuideBookings = asyncHandler(async (req, res) => {
  const bookings = await bookingsService.getMyGuideBookings(req.user.id);

  return sendSuccess(res, "Guide bookings retrieved successfully", bookings);
});

/**
 * =========================================================
 * Admin - All Bookings
 * =========================================================
 */

const getAllBookings = asyncHandler(async (req, res) => {
  const bookings = await bookingsService.getAllBookings(req.query);

  return sendSuccess(res, "Bookings retrieved successfully", bookings);
});

/**
 * =========================================================
 * Booking Details
 * =========================================================
 */

const getBookingById = asyncHandler(async (req, res) => {
  const booking = await bookingsService.getBookingById(req.params.id, req.user);

  return sendSuccess(res, "Booking retrieved successfully", booking);
});

/**
 * =========================================================
 * Admin - Update Booking Status
 * =========================================================
 */

const updateBookingStatus = asyncHandler(async (req, res) => {
  const booking = await bookingsService.updateBookingStatus(
    req.params.id,
    req.body.status,
    req.user,
  );

  return sendSuccess(res, "Booking status updated successfully", booking);
});

/**
 * =========================================================
 * Admin - Assign Guide
 * =========================================================
 */

const assignBookingGuide = asyncHandler(async (req, res) => {
  const booking = await bookingsService.assignBookingGuide(
    req.params.id,
    req.body.guideId,
    req.user,
  );

  return sendSuccess(res, "Tour guide assigned successfully", booking);
});

/**
 * =========================================================
 * Tourist - Generate Tour Confirmation Code (CR-032)
 * =========================================================
 *
 * The response carries the plaintext code, so it must never be
 * cached.
 */

const createLifecycleChallenge = asyncHandler(async (req, res) => {
  const challenge = await bookingsService.createLifecycleChallenge(
    req.params.id,
    req.body.action,
    req.user,
  );

  res.set("Cache-Control", "no-store");

  return sendSuccess(res, "Confirmation code created", challenge, 201);
});

/**
 * =========================================================
 * Guide - Start Tour (traveler's code, CR-032)
 * =========================================================
 */

const startGuideTour = asyncHandler(async (req, res) => {
  const booking = await bookingsService.verifyLifecycleChallenge(
    req.params.id,
    "START",
    req.body.code,
    req.user,
  );

  return sendSuccess(res, "Tour started successfully", booking);
});

/**
 * =========================================================
 * Guide - Complete Tour (traveler's code, CR-032)
 * =========================================================
 */

const completeGuideTour = asyncHandler(async (req, res) => {
  const booking = await bookingsService.verifyLifecycleChallenge(
    req.params.id,
    "COMPLETE",
    req.body.code,
    req.user,
  );

  return sendSuccess(res, "Tour completed successfully", booking);
});

module.exports = {
  getMyBookings,

  getMyGuideBookings,

  getAllBookings,

  getBookingById,

  updateBookingStatus,

  assignBookingGuide,

  createLifecycleChallenge,

  startGuideTour,
  completeGuideTour,
};