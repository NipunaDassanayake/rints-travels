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
  const booking = await reviewsRepository.findBookingForReview(data.bookingId);

  if (!booking) {
    throw new NotFoundError("Booking not found");
  }

  if (booking.touristId !== touristId) {
    throw new ForbiddenError(
      "You do not have permission to review this booking",
    );
  }

  if (booking.status !== "COMPLETED") {
    throw new BadRequestError("You can only review a completed tour");
  }

  const guide = booking.quotation.guide;

  if (!guide) {
    throw new BadRequestError(
      "This booking does not have an assigned tour guide",
    );
  }

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
 * Guide - My Reviews
 * =========================================================
 */

const getMyGuideReviews = async (userId) => {
  const guide = await reviewsRepository.findGuideByUserId(userId);

  if (!guide) {
    throw new NotFoundError("Tour guide profile not found");
  }

  const reviews = await reviewsRepository.findReviewsByGuideId(guide.id);

  const stats = await reviewsRepository.getGuideReviewStats(guide.id);

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
 * Tourist - Review By Booking
 * =========================================================
 */

const getReviewByBookingId = async (bookingId, touristId) => {
  const booking = await reviewsRepository.findBookingForReview(bookingId);

  if (!booking) {
    throw new NotFoundError("Booking not found");
  }

  if (booking.touristId !== touristId) {
    throw new ForbiddenError("You do not have permission to view this review");
  }

  return reviewsRepository.findReviewByBookingId(bookingId);
};

module.exports = {
  createReview,

  getMyReviews,

  getGuideReviews,

  getMyGuideReviews,

  getReviewByBookingId,
};