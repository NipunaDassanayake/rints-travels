const prisma = require("../../config/prisma");

/**
 * =========================================================
 * Shared Review Include
 * =========================================================
 */

const reviewInclude = {
  tourist: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },

  guide: {
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  },

  booking: {
    select: {
      id: true,
      bookingReference: true,
      status: true,
      startDate: true,
      endDate: true,

      quotation: {
        select: {
          id: true,
          title: true,
          quotationNumber: true,
        },
      },
    },
  },
};

/**
 * =========================================================
 * Find Booking For Review
 * =========================================================
 */

const findBookingForReview = async (bookingId) => {
  return prisma.booking.findUnique({
    where: {
      id: bookingId,
    },

    include: {
      quotation: {
        include: {
          guide: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      },

      review: true,
    },
  });
};

/**
 * =========================================================
 * Find Review By Booking
 * =========================================================
 */

const findReviewByBookingId = async (bookingId) => {
  return prisma.guideReview.findUnique({
    where: {
      bookingId,
    },

    include: reviewInclude,
  });
};

/**
 * =========================================================
 * Create Review + Recalculate Guide Rating
 * =========================================================
 */

const createReviewAndUpdateGuideStats = async ({
  bookingId,
  touristId,
  guideId,
  rating,
  comment,
}) => {
  return prisma.$transaction(async (tx) => {
    /**
     * Create review first.
     *
     * bookingId has a UNIQUE constraint so the
     * database also protects against duplicate reviews.
     */

    const review = await tx.guideReview.create({
      data: {
        bookingId,

        touristId,

        guideId,

        rating,

        comment,
      },
    });

    /**
     * Recalculate rating from actual reviews.
     *
     * We do not increment counters manually because
     * recalculation avoids rating drift.
     */

    const stats = await tx.guideReview.aggregate({
      where: {
        guideId,
      },

      _avg: {
        rating: true,
      },

      _count: {
        _all: true,
      },
    });

    await tx.tourGuideProfile.update({
      where: {
        id: guideId,
      },

      data: {
        averageRating: stats._avg.rating ?? 0,

        totalReviews: stats._count._all,
      },
    });

    return tx.guideReview.findUnique({
      where: {
        id: review.id,
      },

      include: reviewInclude,
    });
  });
};

/**
 * =========================================================
 * Tourist - My Reviews
 * =========================================================
 */

const findReviewsByTouristId = async (touristId) => {
  return prisma.guideReview.findMany({
    where: {
      touristId,
    },

    include: reviewInclude,

    orderBy: {
      createdAt: "desc",
    },
  });
};

/**
 * =========================================================
 * Public - Reviews For Guide
 * =========================================================
 */

const findReviewsByGuideId = async (guideId) => {
  return prisma.guideReview.findMany({
    where: {
      guideId,
    },

    include: reviewInclude,

    orderBy: {
      createdAt: "desc",
    },
  });
};

/**
 * =========================================================
 * Guide Review Summary
 * =========================================================
 */

const getGuideReviewStats = async (guideId) => {
  return prisma.guideReview.aggregate({
    where: {
      guideId,
    },

    _avg: {
      rating: true,
    },

    _count: {
      _all: true,
    },
  });
};

module.exports = {
  findBookingForReview,

  findReviewByBookingId,

  createReviewAndUpdateGuideStats,

  findReviewsByTouristId,

  findReviewsByGuideId,

  getGuideReviewStats,
};