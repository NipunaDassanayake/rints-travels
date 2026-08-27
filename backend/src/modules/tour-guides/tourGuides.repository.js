const prisma = require("../../config/prisma");

/**
 * =========================================================
 * Shared Guide Includes
 * =========================================================
 */

const publicGuideInclude = {
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
};

const adminGuideInclude = {
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      status: true,
    },
  },
};

/**
 * =========================================================
 * User
 * =========================================================
 */

const findUserByEmail = async (email) => {
  return prisma.user.findUnique({
    where: {
      email,
    },
  });
};

/**
 * =========================================================
 * Create Tour Guide
 * =========================================================
 */

const createTourGuide = async ({ userData, profileData }) => {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: userData,
    });

    const profile = await tx.tourGuideProfile.create({
      data: {
        ...profileData,
        userId: user.id,
      },

      include: adminGuideInclude,
    });

    return profile;
  });
};

/**
 * =========================================================
 * Public - Available Guides
 * =========================================================
 */

const findAllPublicTourGuides = async () => {
  return prisma.tourGuideProfile.findMany({
    where: {
      deletedAt: null,
      isAvailable: true,

      user: {
        status: "ACTIVE",
        deletedAt: null,
      },
    },

    include: publicGuideInclude,

    orderBy: [
      {
        averageRating: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });
};

/**
 * =========================================================
 * Admin - All Non-deleted Guides
 * =========================================================
 */

const findAllAdminTourGuides = async ({ isAvailable, search } = {}) => {
  const where = {
    deletedAt: null,
  };

  if (typeof isAvailable === "boolean") {
    where.isAvailable = isAvailable;
  }

  if (search) {
    where.OR = [
      {
        location: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        user: {
          firstName: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
      {
        user: {
          lastName: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
      {
        user: {
          email: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
    ];
  }

  return prisma.tourGuideProfile.findMany({
    where,

    include: adminGuideInclude,

    orderBy: [
      {
        isAvailable: "desc",
      },
      {
        averageRating: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });
};

/**
 * =========================================================
 * Find Guide By ID
 * =========================================================
 */

const findTourGuideById = async (id) => {
  return prisma.tourGuideProfile.findFirst({
    where: {
      id,
      deletedAt: null,
    },

    include: adminGuideInclude,
  });
};

/**
 * =========================================================
 * Update Tour Guide
 * =========================================================
 */

const updateTourGuide = async (guideId, userData, profileData) => {
  return prisma.$transaction(async (tx) => {
    const guide = await tx.tourGuideProfile.findFirst({
      where: {
        id: guideId,
        deletedAt: null,
      },
    });

    if (!guide) {
      return null;
    }

    if (Object.keys(userData).length > 0) {
      await tx.user.update({
        where: {
          id: guide.userId,
        },

        data: userData,
      });
    }

    if (Object.keys(profileData).length > 0) {
      await tx.tourGuideProfile.update({
        where: {
          id: guideId,
        },

        data: profileData,
      });
    }

    return tx.tourGuideProfile.findUnique({
      where: {
        id: guideId,
      },

      include: adminGuideInclude,
    });
  });
};

/**
 * =========================================================
 * Update Availability
 * =========================================================
 */

const updateTourGuideAvailability = async (guideId, isAvailable) => {
  return prisma.tourGuideProfile.update({
    where: {
      id: guideId,
    },

    data: {
      isAvailable,
    },

    include: adminGuideInclude,
  });
};

/**
 * =========================================================
 * Safe Deactivation
 * =========================================================
 *
 * Historical:
 *
 * bookings
 * quotations
 * reviews
 *
 * remain unchanged.
 *
 * The profile is soft-deleted and the
 * related user account becomes INACTIVE.
 */

const deactivateTourGuide = async (guideId) => {
  return prisma.$transaction(async (tx) => {
    const guide = await tx.tourGuideProfile.findFirst({
      where: {
        id: guideId,
        deletedAt: null,
      },
    });

    if (!guide) {
      return null;
    }

    await tx.tourGuideProfile.update({
      where: {
        id: guideId,
      },

      data: {
        isAvailable: false,
        deletedAt: new Date(),
      },
    });

    await tx.user.update({
      where: {
        id: guide.userId,
      },

      data: {
        status: "INACTIVE",
      },
    });

    return tx.tourGuideProfile.findUnique({
      where: {
        id: guideId,
      },

      include: adminGuideInclude,
    });
  });
};

/**
 * =========================================================
 * Active Booking Check
 * =========================================================
 */

const findActiveBookingByGuideId = async (guideId) => {
  return prisma.booking.findFirst({
    where: {
      status: {
        in: ["CONFIRMED", "IN_PROGRESS"],
      },

      quotation: {
        guideId,
      },
    },

    select: {
      id: true,
      bookingReference: true,
      status: true,
      startDate: true,
      endDate: true,
    },
  });
};

module.exports = {
  findUserByEmail,

  createTourGuide,

  findAllPublicTourGuides,
  findAllAdminTourGuides,

  findTourGuideById,

  updateTourGuide,
  updateTourGuideAvailability,

  deactivateTourGuide,

  findActiveBookingByGuideId,
};