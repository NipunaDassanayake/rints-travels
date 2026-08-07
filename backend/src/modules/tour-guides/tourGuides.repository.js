const prisma = require("../../config/prisma");

const findUserByEmail = async (email) => {
  return prisma.user.findUnique({
    where: {
      email,
    },
  });
};

const createTourGuide = async ({
  userData,
  profileData,
}) => {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: userData,
    });

    const profile = await tx.tourGuideProfile.create({
      data: {
        ...profileData,
        userId: user.id,
      },
    });

    return {
      user,
      profile,
    };
  });
};

// Additional function to find all available tour guides
const findAllTourGuides = async () => {
  return prisma.tourGuideProfile.findMany({
    where: {
      deletedAt: null,
      isAvailable: true,
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      averageRating: "desc",
    },
  });
};

const findTourGuideById = async (id) => {
  return prisma.tourGuideProfile.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });
};

const updateTourGuide = async (
  guideId,
  userData,
  profileData
) => {
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

    await tx.tourGuideProfile.update({
      where: {
        id: guideId,
      },
      data: profileData,
    });

    return tx.tourGuideProfile.findUnique({
      where: {
        id: guideId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });
  });
};

const updateTourGuideAvailability = async (
  guideId,
  isAvailable
) => {
  return prisma.tourGuideProfile.update({
    where: {
      id: guideId,
    },
    data: {
      isAvailable,
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    },
  });
};

module.exports = {
  findUserByEmail,
  createTourGuide,
  findAllTourGuides,
  findTourGuideById,
  updateTourGuide,
  updateTourGuideAvailability,
};