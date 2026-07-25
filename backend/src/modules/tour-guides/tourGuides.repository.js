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

module.exports = {
  findUserByEmail,
  createTourGuide,
};