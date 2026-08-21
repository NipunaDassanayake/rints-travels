const logger = require("../../config/logger");

const reviewsRepository = require("./reviews.repository");

const tourGuidesRepository = require("../tour-guides/tourGuides.repository");

const {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
} = require("../../utils/AppError");

/**
 * =========================================================
 * Tourist - Create Guide Review
 * =========================================================
 */

const createReview = async (touristId, data) => {
  /**
   * Find booking and its assigned guide.
   */

  const booking = await reviewsRepository.findBookingForReview(data.bookingId);

  if (!booking) {
    throw new NotFoundError("Booking not found");
  }

  /**
   * Only the tourist who owns the booking
   * may leave the review.
   */

  if (booking.touristId !== touristId) {
    throw new ForbiddenError(
      "You do not have permission to review this booking",
    );
  }

  /**
   * Reviews are only allowed after
   * the tour is completed.
   */

  if (booking.status !== "COMPLETED") {
    throw new BadRequestError("You can only review a completed tour");
  }

  /**
   * A guide must actually have been assigned.
   */

  const guide = booking.quotation.guide;

  if (!guide) {
    throw new BadRequestError(
      "This booking does not have an assigned tour guide",
    );
  }

  /**
   * Prevent duplicate reviews.
   */

  if (booking.review) {
    throw new ConflictError("You have already reviewed this booking");
  }

  try {
    const review = await reviewsRepository.createReviewAndUpdateGuideStats({
      bookingId: booking.id,

      touristId,

      guideId: guide.id,

      rating: data.rating,

      comment: data.comment || null,
    });

    logger.info({
      event: "GUIDE_REVIEW_CREATED",

      reviewId: review.id,

      bookingId: booking.id,

      touristId,

      guideId: guide.id,

      rating: review.rating,
    });

    return review;
  } catch (error) {
    /**
     * Prisma unique constraint protection.
     *
     * This handles the unlikely race condition where
     * two review requests reach the server together.
     */

    if (error?.code === "P2002") {
      throw new ConflictError("You have already reviewed this booking");
    }

    throw error;
  }
};

/**
 * =========================================================
 * Tourist - My Reviews
 * =========================================================
 */

const getMyReviews = async (touristId) => {
  return reviewsRepository.findReviewsByTouristId(touristId);
};

/**
 * =========================================================
 * Public - Guide Reviews
 * =========================================================
 */

const getGuideReviews = async (guideId) => {
  const guide = await tourGuidesRepository.findTourGuideById(guideId);

  if (!guide) {
    throw new NotFoundError("Tour guide not found");
  }

  const reviews = await reviewsRepository.findReviewsByGuideId(guideId);

  const stats = await reviewsRepository.getGuideReviewStats(guideId);

  return {
    guide: {
      id: guide.id,

      firstName: guide.user.firstName,

      lastName: guide.user.lastName,

      averageRating: stats._avg.rating ?? 0,

      totalReviews: stats._count._all,
    },

    reviews,
  };
};

/**
 * =========================================================
 * Review By Booking
 * =========================================================
 *
 * Useful for the tourist booking page to determine
 * whether the booking has already been reviewed.
 */

const getReviewByBookingId = async (bookingId, touristId) => {
  const booking = await reviewsRepository.findBookingForReview(bookingId);

  if (!booking) {
    throw new NotFoundError("Booking not found");
  }

  if (booking.touristId !== touristId) {
    throw new ForbiddenError("You do not have permission to view this review");
  }

  const review = await reviewsRepository.findReviewByBookingId(bookingId);

  return review;
};

module.exports = {
  createReview,

  getMyReviews,

  getGuideReviews,

  getReviewByBookingId,
};