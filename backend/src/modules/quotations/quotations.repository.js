const prisma = require("../../config/prisma");

/**
 * =========================================================
 * Shared Include
 * =========================================================
 */

const quotationInclude = {
  tourRequest: true,

  guide: {
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

  itineraries: {
    orderBy: {
      dayNumber: "asc",
    },
  },

  inclusions: true,

  exclusions: true,
};

/**
 * =========================================================
 * Find Quotation By ID
 * =========================================================
 */

const findQuotationById = async (id) => {
  return prisma.tourQuotation.findFirst({
    where: {
      id,
      deletedAt: null,
    },

    include: quotationInclude,
  });
};

/**
 * =========================================================
 * Find Quotations For Tour Request
 * =========================================================
 */

const findQuotationsByTourRequest = async (tourRequestId) => {
  return prisma.tourQuotation.findMany({
    where: {
      tourRequestId,
      deletedAt: null,
    },

    include: quotationInclude,

    orderBy: {
      revisionNumber: "desc",
    },
  });
};

/**
 * =========================================================
 * Latest Revision
 * =========================================================
 */

const getLatestRevisionNumber = async (tourRequestId) => {
  const result = await prisma.tourQuotation.aggregate({
    where: {
      tourRequestId,
    },

    _max: {
      revisionNumber: true,
    },
  });

  return result._max.revisionNumber || 0;
};

/**
 * =========================================================
 * Create Quotation
 * =========================================================
 */

const createQuotation = async (data) => {
  return prisma.$transaction(async (tx) => {
    const quotation = await tx.tourQuotation.create({
      data: {
        tourRequestId: data.tourRequestId,

        guideId: data.guideId,

        quotationNumber: data.quotationNumber,

        revisionNumber: data.revisionNumber,

        title: data.title,

        description: data.description,

        startDate: data.startDate,

        endDate: data.endDate,

        adultCount: data.adultCount,

        childCount: data.childCount,

        subtotal: data.subtotal,

        discountAmount: data.discountAmount,

        taxAmount: data.taxAmount,

        totalAmount: data.totalAmount,

        currency: data.currency,

        notes: data.notes,

        termsConditions: data.termsConditions,

        validUntil: data.validUntil,

        itineraries: {
          create: data.itineraries || [],
        },

        inclusions: {
          create: (data.inclusions || []).map((title) => ({
            title,
          })),
        },

        exclusions: {
          create: (data.exclusions || []).map((title) => ({
            title,
          })),
        },
      },
    });

    return tx.tourQuotation.findUnique({
      where: {
        id: quotation.id,
      },

      include: quotationInclude,
    });
  });
};

/**
 * =========================================================
 * Update Quotation
 * =========================================================
 */

const updateQuotation = async (id, data) => {
  return prisma.tourQuotation.update({
    where: {
      id,
    },

    data,

    include: quotationInclude,
  });
};

/**
 * =========================================================
 * Update Quotation Status
 * =========================================================
 */

const updateQuotationStatus = async (id, data) => {
  return prisma.tourQuotation.update({
    where: {
      id,
    },

    data,

    include: quotationInclude,
  });
};

/**
 * =========================================================
 * Supersede Previous Quotations
 * =========================================================
 */

const supersedeOtherQuotations = async (tourRequestId, excludeQuotationId) => {
  return prisma.tourQuotation.updateMany({
    where: {
      tourRequestId,

      id: {
        not: excludeQuotationId,
      },

      status: {
        in: ["DRAFT", "SENT"],
      },
    },

    data: {
      status: "SUPERSEDED",
    },
  });
};

/**
 * =========================================================
 * Accept Quotation Transaction
 * =========================================================
 */

const acceptQuotationTransaction = async ({ quotationId, tourRequestId }) => {
  return prisma.$transaction(async (tx) => {
    /**
     * Supersede any competing quotations.
     */

    await tx.tourQuotation.updateMany({
      where: {
        tourRequestId,

        id: {
          not: quotationId,
        },

        status: {
          in: ["DRAFT", "SENT"],
        },
      },

      data: {
        status: "SUPERSEDED",
      },
    });

    /**
     * Accept selected quotation.
     */

    const acceptedQuotation = await tx.tourQuotation.update({
      where: {
        id: quotationId,
      },

      data: {
        status: "ACCEPTED",

        respondedAt: new Date(),
      },

      include: quotationInclude,
    });

    /**
     * Update request status.
     */

    await tx.tourRequest.update({
      where: {
        id: tourRequestId,
      },

      data: {
        status: "ACCEPTED",
      },
    });

    return acceptedQuotation;
  });
};

module.exports = {
  findQuotationById,
  findQuotationsByTourRequest,
  getLatestRevisionNumber,

  createQuotation,

  updateQuotation,
  updateQuotationStatus,

  supersedeOtherQuotations,

  acceptQuotationTransaction,
};