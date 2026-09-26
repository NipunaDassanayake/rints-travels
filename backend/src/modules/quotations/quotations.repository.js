const prisma = require("../../config/prisma");

const lifecycle = require("../tour-requests/tourRequests.lifecycle");

const { ConflictError } = require("../../utils/AppError");

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
 * Tourist - My Quotations
 * =========================================================
 */

/**
 * Tourists only ever see quotations that were actually sent to
 * them (`sentAt` is set atomically by sendQuotationTransaction).
 * This hides admin DRAFTs and drafts that were SUPERSEDED without
 * ever being sent, while keeping sent-then-superseded history.
 */
const TOURIST_VISIBLE_QUOTATION = {
  sentAt: {
    not: null,
  },
};

const findQuotationsByTouristId = async (touristId) => {
  return prisma.tourQuotation.findMany({
    where: {
      deletedAt: null,

      ...TOURIST_VISIBLE_QUOTATION,

      tourRequest: {
        touristId,
      },
    },

    include: quotationInclude,

    orderBy: {
      createdAt: "desc",
    },
  });
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
 * Tourist view of a request's quotations -- see
 * TOURIST_VISIBLE_QUOTATION.
 */
const findSentQuotationsByTourRequest = async (tourRequestId) => {
  return prisma.tourQuotation.findMany({
    where: {
      tourRequestId,
      deletedAt: null,

      ...TOURIST_VISIBLE_QUOTATION,
    },

    include: quotationInclude,

    orderBy: {
      revisionNumber: "desc",
    },
  });
};

/**
 * =========================================================
 * Quotation Create Data
 * =========================================================
 *
 * Shared Prisma `create` input shape, used both for a
 * brand-new quotation and for a revision's new row.
 */

const buildQuotationCreateData = (data) => ({
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
});

/**
 * =========================================================
 * Create Quotation Transaction
 * =========================================================
 *
 * Locks the tour request in a quotation-creatable status
 * before computing the next revision number and creating the
 * quotation, so two concurrent creates for the same request
 * cannot both compute the same revision number.
 */

const createQuotationTransaction = async ({ tourRequestId, data }) => {
  return prisma.$transaction(async (tx) => {
    await lifecycle.lockTourRequestInStatus(tx, {
      tourRequestId,
      allowed: lifecycle.QUOTATION_CREATE_ALLOWED,
    });

    const latestRevisionResult = await tx.tourQuotation.aggregate({
      where: {
        tourRequestId,
      },

      _max: {
        revisionNumber: true,
      },
    });

    const revisionNumber = (latestRevisionResult._max.revisionNumber || 0) + 1;

    const quotation = await tx.tourQuotation.create({
      data: buildQuotationCreateData({
        ...data,

        revisionNumber,
      }),
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
 * Update Draft Quotation Transaction
 * =========================================================
 *
 * Conditional on the quotation still being DRAFT, so an edit
 * racing a send cannot modify a quotation the tourist already
 * received. Each child collection is replaced only when a new
 * array was provided (undefined = leave untouched).
 *
 * Concurrency: the conditional updateMany takes the row lock.
 * A concurrent edit blocks on that lock and, once this
 * transaction commits, applies its own changes on top of the
 * committed row. `validate` then runs inside the transaction on
 * the row exactly as it will be committed -- so two edits that
 * are each valid in isolation cannot combine into an
 * inconsistent quotation. Any throw (validation, child rows)
 * rolls the whole edit back.
 */

const updateDraftQuotationTransaction = async ({
  id,
  scalars,
  itineraries,
  inclusions,
  exclusions,
  validate,
}) => {
  return prisma.$transaction(async (tx) => {
    const updateResult = await tx.tourQuotation.updateMany({
      where: {
        id,
        status: "DRAFT",
        deletedAt: null,
      },

      // Always write updatedAt: an edit may change only child
      // collections, and an empty `data` would skip the
      // conditional DRAFT check entirely (count 0).
      data: {
        ...scalars,

        updatedAt: new Date(),
      },
    });

    if (updateResult.count === 0) {
      throw new ConflictError("Only draft quotations can be edited");
    }

    const written = await tx.tourQuotation.findUnique({
      where: {
        id,
      },
    });

    validate(written);

    if (itineraries !== undefined) {
      await tx.quotationItinerary.deleteMany({
        where: {
          quotationId: id,
        },
      });

      await tx.quotationItinerary.createMany({
        data: itineraries.map((item) => ({
          quotationId: id,
          dayNumber: item.dayNumber,
          title: item.title,
          description: item.description,
        })),
      });
    }

    if (inclusions !== undefined) {
      await tx.quotationInclusion.deleteMany({
        where: {
          quotationId: id,
        },
      });

      await tx.quotationInclusion.createMany({
        data: inclusions.map((title) => ({
          quotationId: id,
          title,
        })),
      });
    }

    if (exclusions !== undefined) {
      await tx.quotationExclusion.deleteMany({
        where: {
          quotationId: id,
        },
      });

      await tx.quotationExclusion.createMany({
        data: exclusions.map((title) => ({
          quotationId: id,
          title,
        })),
      });
    }

    return tx.tourQuotation.findUnique({
      where: {
        id,
      },

      include: quotationInclude,
    });
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
 *
 * Kept for backward compatibility -- no longer called from
 * this module's own transactions (each now supersedes inline,
 * inside its own transaction), but left in place rather than
 * removed as part of an unrelated cleanup.
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
 * Send Quotation Transaction
 * =========================================================
 *
 * Moves the tour request to QUOTATION_SENT (from any status
 * that still allows sending), flips the quotation DRAFT->SENT
 * conditionally, and supersedes any other SENT quotation for
 * the same request so at most one offer stays live.
 */

const sendQuotationTransaction = async ({ quotationId, tourRequestId }) => {
  return prisma.$transaction(async (tx) => {
    await lifecycle.transitionTourRequestStatus(tx, {
      tourRequestId,

      from: lifecycle.QUOTATION_SEND.from,

      to: lifecycle.QUOTATION_SEND.to,
    });

    const sendResult = await tx.tourQuotation.updateMany({
      where: {
        id: quotationId,
        status: "DRAFT",
      },

      data: {
        status: "SENT",

        sentAt: new Date(),
      },
    });

    if (sendResult.count === 0) {
      throw new ConflictError("This quotation is no longer a draft");
    }

    await lifecycle.supersedeOpenQuotations(tx, {
      tourRequestId,

      statuses: ["SENT"],

      excludeQuotationId: quotationId,
    });

    return tx.tourQuotation.findUnique({
      where: {
        id: quotationId,
      },

      include: quotationInclude,
    });
  });
};

/**
 * =========================================================
 * Reject Quotation Transaction
 * =========================================================
 *
 * Returns the tour request to UNDER_DISCUSSION (never to the
 * terminal REJECTED status, which is reserved for an admin
 * rejecting the overall request) and flips the quotation
 * SENT->REJECTED conditionally.
 */

const rejectQuotationTransaction = async ({
  quotationId,
  tourRequestId,
  notes,
}) => {
  return prisma.$transaction(async (tx) => {
    await lifecycle.transitionTourRequestStatus(tx, {
      tourRequestId,

      from: lifecycle.QUOTATION_REJECT.from,

      to: lifecycle.QUOTATION_REJECT.to,
    });

    const rejectResult = await tx.tourQuotation.updateMany({
      where: {
        id: quotationId,
        status: "SENT",
      },

      data: {
        status: "REJECTED",

        respondedAt: new Date(),

        notes,
      },
    });

    if (rejectResult.count === 0) {
      throw new ConflictError("This quotation is no longer awaiting a response");
    }

    return tx.tourQuotation.findUnique({
      where: {
        id: quotationId,
      },

      include: quotationInclude,
    });
  });
};

/**
 * =========================================================
 * Accept Quotation Transaction
 * =========================================================
 *
 * Moves the tour request QUOTATION_SENT->ACCEPTED, flips the
 * quotation SENT->ACCEPTED conditionally (also re-checking it
 * has not expired since the service pre-check ran), then
 * supersedes any other DRAFT/SENT quotation for the request.
 */

const acceptQuotationTransaction = async ({ quotationId, tourRequestId }) => {
  return prisma.$transaction(async (tx) => {
    await lifecycle.transitionTourRequestStatus(tx, {
      tourRequestId,

      from: lifecycle.QUOTATION_ACCEPT.from,

      to: lifecycle.QUOTATION_ACCEPT.to,
    });

    const acceptResult = await tx.tourQuotation.updateMany({
      where: {
        id: quotationId,

        status: "SENT",

        OR: [
          {
            validUntil: null,
          },
          {
            validUntil: {
              gt: new Date(),
            },
          },
        ],
      },

      data: {
        status: "ACCEPTED",

        respondedAt: new Date(),
      },
    });

    if (acceptResult.count === 0) {
      throw new ConflictError("This quotation is no longer available to accept");
    }

    await lifecycle.supersedeOpenQuotations(tx, {
      tourRequestId,

      statuses: ["DRAFT", "SENT"],

      excludeQuotationId: quotationId,
    });

    return tx.tourQuotation.findUnique({
      where: {
        id: quotationId,
      },

      include: quotationInclude,
    });
  });
};

/**
 * =========================================================
 * Create Revision Transaction
 * =========================================================
 *
 * Locks the tour request in a revisable status, conditionally
 * supersedes the source quotation (guarding against it having
 * changed since the service pre-check), then computes the next
 * revision number and creates the new DRAFT -- all atomically,
 * so a failure partway through never leaves the tour request
 * with a SUPERSEDED quotation and no replacement.
 */

const createRevisionTransaction = async ({
  previousQuotationId,
  previousQuotationStatus,
  tourRequestId,
  data,
}) => {
  return prisma.$transaction(async (tx) => {
    await lifecycle.lockTourRequestInStatus(tx, {
      tourRequestId,

      allowed: lifecycle.QUOTATION_REVISE_ALLOWED,
    });

    const supersedeResult = await tx.tourQuotation.updateMany({
      where: {
        id: previousQuotationId,
        status: previousQuotationStatus,
      },

      data: {
        status: "SUPERSEDED",
      },
    });

    if (supersedeResult.count === 0) {
      throw new ConflictError("This quotation can no longer be revised");
    }

    const latestRevisionResult = await tx.tourQuotation.aggregate({
      where: {
        tourRequestId,
      },

      _max: {
        revisionNumber: true,
      },
    });

    const latestRevision = latestRevisionResult._max.revisionNumber || 0;

    const revision = await tx.tourQuotation.create({
      data: buildQuotationCreateData({
        ...data,

        revisionNumber: latestRevision + 1,
      }),
    });

    return tx.tourQuotation.findUnique({
      where: {
        id: revision.id,
      },

      include: quotationInclude,
    });
  });
};

module.exports = {
  findQuotationsByTouristId,

  findQuotationById,

  findQuotationsByTourRequest,

  findSentQuotationsByTourRequest,

  createQuotationTransaction,

  updateDraftQuotationTransaction,

  updateQuotationStatus,

  supersedeOtherQuotations,

  sendQuotationTransaction,

  rejectQuotationTransaction,

  acceptQuotationTransaction,

  createRevisionTransaction,
};