const express = require("express");

const reviewsController = require("./reviews.controller");

const authenticate = require("../../middlewares/authenticate");

const authorize = require("../../middlewares/authorize");

const validateRequest = require("../../middlewares/validateRequest");

const { USER_ROLES } = require("../../core/constants/auth.constants");

const { createGuideReviewSchema } = require("./reviews.validation");

const router = express.Router();

/**
 * =========================================================
 * Tourist - Create Guide Review
 * =========================================================
 */

router.post(
  "/",

  authenticate,

  authorize(USER_ROLES.TOURIST),

  validateRequest(createGuideReviewSchema),

  reviewsController.createReview,
);

/**
 * =========================================================
 * Tourist - My Reviews
 * =========================================================
 */

router.get(
  "/me",

  authenticate,

  authorize(USER_ROLES.TOURIST),

  reviewsController.getMyReviews,
);

/**
 * =========================================================
 * Guide - My Reviews
 * =========================================================
 *
 * IMPORTANT:
 * Keep before /guide/:guideId
 */

router.get(
  "/guide/me",

  authenticate,

  authorize(USER_ROLES.TOUR_GUIDE),

  reviewsController.getMyGuideReviews,
);

/**
 * =========================================================
 * Tourist - Review For Booking
 * =========================================================
 */

router.get(
  "/booking/:bookingId",

  authenticate,

  authorize(USER_ROLES.TOURIST),

  reviewsController.getReviewByBookingId,
);

/**
 * =========================================================
 * Public - Reviews For Guide
 * =========================================================
 */

router.get(
  "/guide/:guideId",

  reviewsController.getGuideReviews,
);

module.exports = router;