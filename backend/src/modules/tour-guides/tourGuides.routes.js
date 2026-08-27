const express = require("express");

const tourGuidesController = require("./tourGuides.controller");

const authenticate = require("../../middlewares/authenticate");

const authorize = require("../../middlewares/authorize");

const validateRequest = require("../../middlewares/validateRequest");

const { USER_ROLES } = require("../../core/constants/auth.constants");

const {
  createTourGuideSchema,
  updateTourGuideSchema,
  updateTourGuideAvailabilitySchema,
} = require("./tourGuides.validation");

const router = express.Router();

/**
 * =========================================================
 * Admin - Create Guide
 * =========================================================
 */

router.post(
  "/",

  authenticate,

  authorize(USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN),

  validateRequest(createTourGuideSchema),

  tourGuidesController.createTourGuide,
);

/**
 * =========================================================
 * Admin - Guide List
 * =========================================================
 *
 * IMPORTANT:
 *
 * This must stay BEFORE "/:id".
 *
 * Examples:
 *
 * GET /api/tour-guides/admin
 * GET /api/tour-guides/admin?isAvailable=true
 * GET /api/tour-guides/admin?isAvailable=false
 * GET /api/tour-guides/admin?search=Nimal
 */

router.get(
  "/admin",

  authenticate,

  authorize(USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN),

  tourGuidesController.getAdminTourGuides,
);

/**
 * =========================================================
 * Public - Available Guides
 * =========================================================
 */

router.get(
  "/",

  tourGuidesController.getAllTourGuides,
);

/**
 * =========================================================
 * Admin - Update Availability
 * =========================================================
 *
 * Keep this BEFORE "/:id".
 */

router.patch(
  "/:id/availability",

  authenticate,

  authorize(USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN),

  validateRequest(updateTourGuideAvailabilitySchema),

  tourGuidesController.updateTourGuideAvailability,
);

/**
 * =========================================================
 * Admin - Update Guide
 * =========================================================
 */

router.patch(
  "/:id",

  authenticate,

  authorize(USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN),

  validateRequest(updateTourGuideSchema),

  tourGuidesController.updateTourGuide,
);

/**
 * =========================================================
 * Admin - Deactivate Guide
 * =========================================================
 *
 * This is a SOFT deactivation.
 *
 * The guide's historical:
 *
 * quotations
 * bookings
 * reviews
 *
 * remain intact.
 */

router.delete(
  "/:id",

  authenticate,

  authorize(USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN),

  tourGuidesController.deleteTourGuide,
);

/**
 * =========================================================
 * Public - Guide Details
 * =========================================================
 *
 * This must remain after "/admin".
 */

router.get(
  "/:id",

  tourGuidesController.getTourGuideById,
);

module.exports = router;