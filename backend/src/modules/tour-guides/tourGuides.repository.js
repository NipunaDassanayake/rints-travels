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

module.exports = {
  findUserByEmail,
  createTourGuide,
  findAllTourGuides,
  findTourGuideById,
};