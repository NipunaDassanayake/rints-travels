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

// Additional function to find tour requests by touristId
const findTourRequestsByTouristId = async (touristId) => {
  return prisma.tourRequest.findMany({
    where: {
      touristId,
      deletedAt: null,
    },
    include: {
      travelPackage: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

module.exports = {
  createTourRequest,
  findTourRequestById,
  findTourRequestsByTouristId,
};