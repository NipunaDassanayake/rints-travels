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


// Additional function to find all tour requests with optional filters
const findAllTourRequests = async ({
  status,
  requestType,
  touristId,
  assignedAdminId,
}) => {
  const where = {
    deletedAt: null,
  };

  if (status) {
    where.status = status;
  }

  if (requestType) {
    where.requestType = requestType;
  }

  if (touristId) {
    where.touristId = touristId;
  }

  if (assignedAdminId) {
    where.assignedAdminId = assignedAdminId;
  }

  return prisma.tourRequest.findMany({
    where,
    include: {
      travelPackage: true,
      tourist: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
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
  findAllTourRequests,
};