const express = require("express");

const bookingsController = require("./bookings.controller");

const authenticate = require("../../middlewares/authenticate");

const authorize = require("../../middlewares/authorize");

const validateRequest = require("../../middlewares/validateRequest");

const { USER_ROLES } = require("../../core/constants/auth.constants");

const { updateBookingStatusSchema } = require("./bookings.validation");

const router = express.Router();

/**
 * Tourist - Own bookings
 */

router.get(
  "/me",
  authenticate,
  authorize(USER_ROLES.TOURIST),
  bookingsController.getMyBookings,
);

/**
 * Admin - All bookings
 */

router.get(
  "/",
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN),
  bookingsController.getAllBookings,
);

/**
 * Admin - Update booking status
 */

router.patch(
  "/:id/status",
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN),
  validateRequest(updateBookingStatusSchema),
  bookingsController.updateBookingStatus,
);

/**
 * Tourist owner or Admin - Booking details
 */

router.get("/:id", authenticate, bookingsController.getBookingById);

module.exports = router;