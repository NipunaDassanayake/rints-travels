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

      tourist: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },

      preferredGuide: {
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
      },
    },
  });
};

// Find tour requests belonging to a specific tourist
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

// Find all tour requests with optional filters
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

      preferredGuide: {
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

    orderBy: {
      createdAt: "desc",
    },
  });
};

// Assign an admin to a tour request
const assignAdminToTourRequest = async (id, adminId) => {
  return prisma.tourRequest.update({
    where: {
      id,
    },

    data: {
      assignedAdminId: adminId,
    },

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

      preferredGuide: {
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
  });
};

// Update tour request status
const updateTourRequestStatus = async (id, status) => {
  return prisma.tourRequest.update({
    where: {
      id,
    },

    data: {
      status,
    },

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

      preferredGuide: {
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
  });
};

const updateTourRequest = async (id, data) => {
  return prisma.tourRequest.update({
    where: {
      id,
    },

    data,

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

      preferredGuide: {
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
  });
};

module.exports = {
  createTourRequest,
  findTourRequestById,
  findTourRequestsByTouristId,
  findAllTourRequests,
  assignAdminToTourRequest,
  updateTourRequestStatus,
  updateTourRequest,
};
