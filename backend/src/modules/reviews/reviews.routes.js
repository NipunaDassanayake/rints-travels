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
 * Tourist - Review For Booking
 * =========================================================
 *
 * Used by the booking details page to determine
 * whether the tourist has already reviewed the tour.
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