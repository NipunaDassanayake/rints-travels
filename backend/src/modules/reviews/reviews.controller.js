const reviewsService = require("./reviews.service");

const asyncHandler = require("../../utils/asyncHandler");

const { sendSuccess } = require("../../utils/apiResponse");

const HTTP_STATUS = require("../../core/constants/httpStatus");

/**
 * =========================================================
 * Tourist - Create Review
 * =========================================================
 */

const createReview = asyncHandler(async (req, res) => {
  const review = await reviewsService.createReview(req.user.id, req.body);

  return sendSuccess(
    res,
    "Guide review submitted successfully",
    review,
    HTTP_STATUS.CREATED,
  );
});

/**
 * =========================================================
 * Tourist - My Reviews
 * =========================================================
 */

const getMyReviews = asyncHandler(async (req, res) => {
  const reviews = await reviewsService.getMyReviews(req.user.id);

  return sendSuccess(res, "Reviews retrieved successfully", reviews);
});

/**
 * =========================================================
 * Public - Guide Reviews
 * =========================================================
 */

const getGuideReviews = asyncHandler(async (req, res) => {
  const result = await reviewsService.getGuideReviews(req.params.guideId);

  return sendSuccess(res, "Guide reviews retrieved successfully", result);
});

/**
 * =========================================================
 * Tourist - Review For Booking
 * =========================================================
 */

const getReviewByBookingId = asyncHandler(async (req, res) => {
  const review = await reviewsService.getReviewByBookingId(
    req.params.bookingId,
    req.user.id,
  );

  return sendSuccess(
    res,
    review
      ? "Review retrieved successfully"
      : "No review found for this booking",
    review,
  );
});

module.exports = {
  createReview,

  getMyReviews,

  getGuideReviews,

  getReviewByBookingId,
};