const express = require("express");

const bookingsController = require("./bookings.controller");

const authenticate = require("../../middlewares/authenticate");

const authorize = require("../../middlewares/authorize");

const validateRequest = require("../../middlewares/validateRequest");

const { USER_ROLES } = require("../../core/constants/auth.constants");

const {
  updateBookingStatusSchema,
  assignBookingGuideSchema,
} = require("./bookings.validation");

const router = express.Router();

/**
 * =========================================================
 * Tourist - Own Bookings
 * =========================================================
 */

router.get(
  "/me",

  authenticate,

  authorize(USER_ROLES.TOURIST),

  bookingsController.getMyBookings,
);

/**
 * =========================================================
 * Admin - All Bookings
 * =========================================================
 */

router.get(
  "/",

  authenticate,

  authorize(USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN),

  bookingsController.getAllBookings,
);

/**
 * =========================================================
 * Admin - Assign Tour Guide
 * =========================================================
 */

router.patch(
  "/:id/guide",

  authenticate,

  authorize(USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN),

  validateRequest(assignBookingGuideSchema),

  bookingsController.assignBookingGuide,
);

/**
 * =========================================================
 * Admin - Update Booking Status
 * =========================================================
 */

router.patch(
  "/:id/status",

  authenticate,

  authorize(USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN),

  validateRequest(updateBookingStatusSchema),

  bookingsController.updateBookingStatus,
);

/**
 * =========================================================
 * Tourist Owner / Admin - Booking Details
 * =========================================================
 */

router.get(
  "/:id",

  authenticate,

  bookingsController.getBookingById,
);

module.exports = router;