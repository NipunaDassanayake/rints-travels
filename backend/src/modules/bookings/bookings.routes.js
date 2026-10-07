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
 * Tour Guide - Assigned Bookings
 * =========================================================
 */

router.get(
  "/guide/me",

  authenticate,

  authorize(USER_ROLES.TOUR_GUIDE),

  bookingsController.getMyGuideBookings,
);

/**
 * =========================================================
 * Tour Guide - Start Assigned Tour
 * =========================================================
 */

router.patch(
  "/guide/:id/start",

  authenticate,

  authorize(USER_ROLES.TOUR_GUIDE),

  bookingsController.startGuideTour,
);

/**
 * =========================================================
 * Tour Guide - Complete Assigned Tour
 * =========================================================
 */

router.patch(
  "/guide/:id/complete",

  authenticate,

  authorize(USER_ROLES.TOUR_GUIDE),

  bookingsController.completeGuideTour,
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
 * Admin - Assign Guide
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
 * Tourist Owner / Admin / Assigned Guide - Booking Details
 * =========================================================
 */

router.get(
  "/:id",

  authenticate,

  bookingsController.getBookingById,
);

module.exports = router;