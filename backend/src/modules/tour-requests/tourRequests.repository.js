const prisma = require("../../config/prisma");

const lifecycle = require("./tourRequests.lifecycle");

const createTourRequest = async (data) => {
  return prisma.tourRequest.create({
    data,

    include: {
      travelPackage: true,
    },
  });
};

/**
 * A preferred guide's personal contact details (email, phone)
 * are only loaded for admin responses; the tourist view never
 * reads them. The tourist's own contact details are included in
 * both views.
 */
const PREFERRED_GUIDE_USER_PUBLIC_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
};

const PREFERRED_GUIDE_USER_SELECTS = {
  admin: {
    ...PREFERRED_GUIDE_USER_PUBLIC_SELECT,
    email: true,
    phone: true,
  },

  tourist: PREFERRED_GUIDE_USER_PUBLIC_SELECT,
};

/**
 * `view` is fail-closed: omitting it returns the "tourist" view
 * (no preferred-guide email/phone). Only a caller that has
 * established the user is an admin may pass `view: "admin"`.
 * Internal callers that merely check status/ownership/dates need
 * no guide contact details and use the default.
 */
const findTourRequestById = async (id, { view = "tourist" } = {}) => {
  if (!Object.hasOwn(PREFERRED_GUIDE_USER_SELECTS, view)) {
    throw new Error(`Unknown tour request view "${view}"`);
  }

  const preferredGuideUserSelect = PREFERRED_GUIDE_USER_SELECTS[view];

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
            select: preferredGuideUserSelect,
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

/**
 * =========================================================
 * Transition Status Transaction
 * =========================================================
 *
 * Moves the tour request from one of `from` to `to`, then
 * supersedes any DRAFT/SENT (or SENT-only, for a recall to
 * UNDER_DISCUSSION) quotations the target status implies --
 * atomically, so a request can never end up CANCELLED/REJECTED
 * with a quotation that still looks live.
 */
const transitionStatusTransaction = async ({ tourRequestId, from, to }) => {
  return prisma.$transaction(async (tx) => {
    await lifecycle.transitionTourRequestStatus(tx, {
      tourRequestId,
      from,
      to,
    });

    await lifecycle.supersedeOpenQuotations(tx, {
      tourRequestId,
      statuses: lifecycle.supersedeStatusesFor(to),
    });

    return tx.tourRequest.findFirst({
      where: {
        id: tourRequestId,
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
              },
            },
          },
        },
      },
    });
  });
};

/**
 * =========================================================
 * Admin Edit Transaction
 * =========================================================
 *
 * Locks the request in one of `allowed` (without changing its
 * status) before applying the edit, so a request that moves out
 * of an editable status mid-request cannot be edited anyway.
 */
const adminEditTransaction = async ({ tourRequestId, allowed, data }) => {
  return prisma.$transaction(async (tx) => {
    await lifecycle.lockTourRequestInStatus(tx, {
      tourRequestId,
      allowed,
    });

    await tx.tourRequest.update({
      where: {
        id: tourRequestId,
      },

      data,
    });

    return tx.tourRequest.findFirst({
      where: {
        id: tourRequestId,
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
              },
            },
          },
        },
      },
    });
  });
};

module.exports = {
  createTourRequest,
  findTourRequestById,
  findTourRequestsByTouristId,
  findAllTourRequests,
  assignAdminToTourRequest,
  transitionStatusTransaction,
  adminEditTransaction,
};
