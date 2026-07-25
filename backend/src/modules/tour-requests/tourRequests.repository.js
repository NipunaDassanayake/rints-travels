const prisma = require("../../config/prisma");

const createTourRequest = async (data) => {
  return prisma.tourRequest.create({
    data,
    include: {
      travelPackage: true,
    },
  });
};

const findTourRequestById = async (id) => {
  return prisma.tourRequest.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    include: {
      travelPackage: true,
    },
  });
};

module.exports = {
  createTourRequest,
  findTourRequestById,
};