const prisma = require("../../config/prisma");

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

const findQuotationById = async (id) => {
  return prisma.tourQuotation.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    include: quotationInclude,
  });
};

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

const updateQuotation = async (id, data) => {
  return prisma.tourQuotation.update({
    where: {
      id,
    },
    data,
    include: quotationInclude,
  });
};

const updateQuotationStatus = async (id, data) => {
  return prisma.tourQuotation.update({
    where: {
      id,
    },
    data,
    include: quotationInclude,
  });
};

const supersedeOtherQuotations = async (
  tourRequestId,
  excludeQuotationId
) => {
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

module.exports = {
  findQuotationById,
  findQuotationsByTourRequest,
  getLatestRevisionNumber,
  createQuotation,
  updateQuotation,
  updateQuotationStatus,
  supersedeOtherQuotations,
};