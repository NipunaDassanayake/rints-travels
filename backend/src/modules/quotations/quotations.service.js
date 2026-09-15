const crypto = require("crypto");

const quotationsRepository = require("./quotations.repository");

const tourRequestsRepository = require("../tour-requests/tourRequests.repository");

const lifecycle = require("../tour-requests/tourRequests.lifecycle");

const tourGuidesRepository = require("../tour-guides/tourGuides.repository");

const {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  ConflictError,
} = require("../../utils/AppError");

const { USER_ROLES } = require("../../core/constants/auth.constants");

/**
 * =========================================================
 * Helpers
 * =========================================================
 */

const generateQuotationNumber = () => {
  return `QTN-${Date.now()}-${crypto
    .randomBytes(3)
    .toString("hex")
    .toUpperCase()}`;
};

const validateGuide = async (guideId) => {
  if (!guideId) {
    return;
  }

  const guide = await tourGuidesRepository.findTourGuideById(guideId);

  if (!guide || !guide.isAvailable) {
    throw new NotFoundError("Available tour guide not found");
  }
};

/**
 * =========================================================
 * Tourist - My Quotations
 * =========================================================
 */

const getMyQuotations = async (touristId) => {
  return quotationsRepository.findQuotationsByTouristId(touristId);
};

/**
 * =========================================================
 * Create Quotation
 * =========================================================
 */

const createQuotation = async (tourRequestId, data) => {
  const tourRequest =
    await tourRequestsRepository.findTourRequestById(tourRequestId);

  if (!tourRequest) {
    throw new NotFoundError("Tour request not found");
  }

  if (!lifecycle.QUOTATION_CREATE_ALLOWED.includes(tourRequest.status)) {
    throw new BadRequestError("Tour request is not ready for quotation");
  }

  await validateGuide(data.guideId);

  return quotationsRepository.createQuotationTransaction({
    tourRequestId,

    data: {
      ...data,

      tourRequestId,

      quotationNumber: generateQuotationNumber(),
    },
  });
};

/**
 * =========================================================
 * Get Quotations For Tour Request
 * =========================================================
 */

const getQuotationsByTourRequest = async (tourRequestId, currentUser) => {
  const tourRequest =
    await tourRequestsRepository.findTourRequestById(tourRequestId);

  if (!tourRequest) {
    throw new NotFoundError("Tour request not found");
  }

  const isOwner = tourRequest.touristId === currentUser.id;

  const isAdmin =
    currentUser.role === USER_ROLES.ADMIN ||
    currentUser.role === USER_ROLES.SYSTEM_ADMIN;

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError(
      "You do not have permission to view these quotations",
    );
  }

  return quotationsRepository.findQuotationsByTourRequest(tourRequestId);
};

/**
 * =========================================================
 * Get Quotation
 * =========================================================
 */

const getQuotationById = async (quotationId, currentUser) => {
  const quotation = await quotationsRepository.findQuotationById(quotationId);

  if (!quotation) {
    throw new NotFoundError("Quotation not found");
  }

  const isOwner = quotation.tourRequest.touristId === currentUser.id;

  const isAdmin =
    currentUser.role === USER_ROLES.ADMIN ||
    currentUser.role === USER_ROLES.SYSTEM_ADMIN;

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError(
      "You do not have permission to view this quotation",
    );
  }

  return quotation;
};

/**
 * =========================================================
 * Update Quotation
 * =========================================================
 */

const updateQuotation = async (quotationId, data) => {
  const quotation = await quotationsRepository.findQuotationById(quotationId);

  if (!quotation) {
    throw new NotFoundError("Quotation not found");
  }

  if (quotation.status !== "DRAFT") {
    throw new BadRequestError("Only draft quotations can be edited");
  }

  if (data.guideId !== undefined) {
    await validateGuide(data.guideId);
  }

  return quotationsRepository.updateQuotation(quotationId, data);
};

/**
 * =========================================================
 * Send Quotation
 * =========================================================
 */

const sendQuotation = async (quotationId) => {
  const quotation = await quotationsRepository.findQuotationById(quotationId);

  if (!quotation) {
    throw new NotFoundError("Quotation not found");
  }

  if (quotation.status !== "DRAFT") {
    throw new BadRequestError("Only draft quotations can be sent");
  }

  if (quotation.validUntil && quotation.validUntil <= new Date()) {
    throw new BadRequestError("Cannot send an expired quotation");
  }

  if (!lifecycle.QUOTATION_SEND.from.includes(quotation.tourRequest.status)) {
    throw new BadRequestError(
      `Cannot send a quotation while the tour request is ${quotation.tourRequest.status}`,
    );
  }

  return quotationsRepository.sendQuotationTransaction({
    quotationId,

    tourRequestId: quotation.tourRequestId,
  });
};

/**
 * =========================================================
 * Accept Quotation
 * =========================================================
 */

const acceptQuotation = async (quotationId, touristId) => {
  const quotation = await quotationsRepository.findQuotationById(quotationId);

  if (!quotation) {
    throw new NotFoundError("Quotation not found");
  }

  if (quotation.tourRequest.touristId !== touristId) {
    throw new ForbiddenError(
      "You do not have permission to accept this quotation",
    );
  }

  if (quotation.status !== "SENT") {
    throw new BadRequestError("Only sent quotations can be accepted");
  }

  if (quotation.validUntil && quotation.validUntil <= new Date()) {
    await quotationsRepository.updateQuotationStatus(quotationId, {
      status: "EXPIRED",
    });

    throw new BadRequestError("Quotation has expired");
  }

  if (
    !lifecycle.QUOTATION_ACCEPT.from.includes(quotation.tourRequest.status)
  ) {
    throw new BadRequestError(
      `Cannot accept a quotation while the tour request is ${quotation.tourRequest.status}`,
    );
  }

  return quotationsRepository.acceptQuotationTransaction({
    quotationId,

    tourRequestId: quotation.tourRequestId,
  });
};

/**
 * =========================================================
 * Reject Quotation
 * =========================================================
 */

const rejectQuotation = async (quotationId, touristId, reason) => {
  const quotation = await quotationsRepository.findQuotationById(quotationId);

  if (!quotation) {
    throw new NotFoundError("Quotation not found");
  }

  if (quotation.tourRequest.touristId !== touristId) {
    throw new ForbiddenError(
      "You do not have permission to reject this quotation",
    );
  }

  if (quotation.status !== "SENT") {
    throw new BadRequestError("Only sent quotations can be rejected");
  }

  if (
    !lifecycle.QUOTATION_REJECT.from.includes(quotation.tourRequest.status)
  ) {
    throw new BadRequestError(
      `Cannot reject a quotation while the tour request is ${quotation.tourRequest.status}`,
    );
  }

  return quotationsRepository.rejectQuotationTransaction({
    quotationId,

    tourRequestId: quotation.tourRequestId,

    notes: reason
      ? `${quotation.notes || ""}\nRejection reason: ${reason}`.trim()
      : quotation.notes,
  });
};

/**
 * =========================================================
 * Create Revision
 * =========================================================
 */

const createRevision = async (quotationId, data) => {
  const quotation = await quotationsRepository.findQuotationById(quotationId);

  if (!quotation) {
    throw new NotFoundError("Quotation not found");
  }

  if (!["SENT", "REJECTED"].includes(quotation.status)) {
    throw new BadRequestError(
      "Only sent or rejected quotations can be revised",
    );
  }

  if (!lifecycle.QUOTATION_REVISE_ALLOWED.includes(quotation.tourRequest.status)) {
    throw new BadRequestError(
      `Cannot revise a quotation while the tour request is ${quotation.tourRequest.status}`,
    );
  }

  if (data.guideId !== undefined) {
    await validateGuide(data.guideId);
  }

  const revisionData = {
    ...data,

    tourRequestId: quotation.tourRequestId,

    guideId: data.guideId !== undefined ? data.guideId : quotation.guideId,

    title: data.title ?? quotation.title,

    description: data.description ?? quotation.description,

    startDate: data.startDate ?? quotation.startDate,

    endDate: data.endDate ?? quotation.endDate,

    adultCount: data.adultCount ?? quotation.adultCount,

    childCount: data.childCount ?? quotation.childCount,

    subtotal: data.subtotal ?? quotation.subtotal,

    discountAmount: data.discountAmount ?? quotation.discountAmount,

    taxAmount: data.taxAmount ?? quotation.taxAmount,

    totalAmount: data.totalAmount ?? quotation.totalAmount,

    currency: data.currency ?? quotation.currency,

    notes: data.notes ?? quotation.notes,

    termsConditions: data.termsConditions ?? quotation.termsConditions,

    validUntil: data.validUntil ?? quotation.validUntil,

    itineraries:
      data.itineraries ??
      quotation.itineraries.map((item) => ({
        dayNumber: item.dayNumber,

        title: item.title,

        description: item.description,
      })),

    inclusions:
      data.inclusions ?? quotation.inclusions.map((item) => item.title),

    exclusions:
      data.exclusions ?? quotation.exclusions.map((item) => item.title),

    quotationNumber: generateQuotationNumber(),
  };

  try {
    return await quotationsRepository.createRevisionTransaction({
      previousQuotationId: quotation.id,

      previousQuotationStatus: quotation.status,

      tourRequestId: quotation.tourRequestId,

      data: revisionData,
    });
  } catch (error) {
    /**
     * A concurrent duplicate revision attempt can race on the
     * [tourRequestId, revisionNumber] unique constraint. This
     * turns that collision into a clean, user-facing error
     * rather than a raw 500 -- it is duplicate/concurrency
     * protection, not an idempotent retry: the request is
     * rejected, not transparently deduplicated.
     */
    if (error.code === "P2002") {
      throw new ConflictError(
        "This quotation is already being revised. Please try again.",
      );
    }

    throw error;
  }
};

module.exports = {
  getMyQuotations,

  createQuotation,

  getQuotationsByTourRequest,

  getQuotationById,

  updateQuotation,

  sendQuotation,

  acceptQuotation,

  rejectQuotation,

  createRevision,
};