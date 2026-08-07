const crypto = require("crypto");

const quotationsRepository = require("./quotations.repository");
const tourRequestsRepository = require(
  "../tour-requests/tourRequests.repository"
);
const tourGuidesRepository = require(
  "../tour-guides/tourGuides.repository"
);

const {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} = require("../../utils/AppError");

const {
  USER_ROLES,
} = require("../../core/constants/auth.constants");

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

  const guide =
    await tourGuidesRepository.findTourGuideById(guideId);

  if (!guide || !guide.isAvailable) {
    throw new NotFoundError(
      "Available tour guide not found"
    );
  }
};

const createQuotation = async (
  tourRequestId,
  data
) => {
  const tourRequest =
    await tourRequestsRepository.findTourRequestById(
      tourRequestId
    );

  if (!tourRequest) {
    throw new NotFoundError("Tour request not found");
  }

  if (
    ![
      "UNDER_DISCUSSION",
      "READY_FOR_QUOTATION",
    ].includes(tourRequest.status)
  ) {
    throw new BadRequestError(
      "Tour request is not ready for quotation"
    );
  }

  await validateGuide(data.guideId);

  const latestRevision =
    await quotationsRepository.getLatestRevisionNumber(
      tourRequestId
    );

  const revisionNumber = latestRevision + 1;

  return quotationsRepository.createQuotation({
    ...data,
    tourRequestId,
    revisionNumber,
    quotationNumber: generateQuotationNumber(),
  });
};

const getQuotationsByTourRequest = async (
  tourRequestId,
  currentUser
) => {
  const tourRequest =
    await tourRequestsRepository.findTourRequestById(
      tourRequestId
    );

  if (!tourRequest) {
    throw new NotFoundError("Tour request not found");
  }

  const isOwner =
    tourRequest.touristId === currentUser.id;

  const isAdmin =
    currentUser.role === USER_ROLES.ADMIN ||
    currentUser.role === USER_ROLES.SYSTEM_ADMIN;

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError(
      "You do not have permission to view these quotations"
    );
  }

  return quotationsRepository.findQuotationsByTourRequest(
    tourRequestId
  );
};

const getQuotationById = async (
  quotationId,
  currentUser
) => {
  const quotation =
    await quotationsRepository.findQuotationById(
      quotationId
    );

  if (!quotation) {
    throw new NotFoundError("Quotation not found");
  }

  const isOwner =
    quotation.tourRequest.touristId === currentUser.id;

  const isAdmin =
    currentUser.role === USER_ROLES.ADMIN ||
    currentUser.role === USER_ROLES.SYSTEM_ADMIN;

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError(
      "You do not have permission to view this quotation"
    );
  }

  return quotation;
};

const updateQuotation = async (
  quotationId,
  data
) => {
  const quotation =
    await quotationsRepository.findQuotationById(
      quotationId
    );

  if (!quotation) {
    throw new NotFoundError("Quotation not found");
  }

  if (quotation.status !== "DRAFT") {
    throw new BadRequestError(
      "Only draft quotations can be edited"
    );
  }

  if (data.guideId !== undefined) {
    await validateGuide(data.guideId);
  }

  return quotationsRepository.updateQuotation(
    quotationId,
    data
  );
};

const sendQuotation = async (quotationId) => {
  const quotation =
    await quotationsRepository.findQuotationById(
      quotationId
    );

  if (!quotation) {
    throw new NotFoundError("Quotation not found");
  }

  if (quotation.status !== "DRAFT") {
    throw new BadRequestError(
      "Only draft quotations can be sent"
    );
  }

  if (
    quotation.validUntil &&
    quotation.validUntil <= new Date()
  ) {
    throw new BadRequestError(
      "Cannot send an expired quotation"
    );
  }

  const updated =
    await quotationsRepository.updateQuotationStatus(
      quotationId,
      {
        status: "SENT",
        sentAt: new Date(),
      }
    );

  await tourRequestsRepository.updateTourRequestStatus(
    quotation.tourRequestId,
    "QUOTATION_SENT"
  );

  return updated;
};

const acceptQuotation = async (
  quotationId,
  touristId
) => {
  const quotation =
    await quotationsRepository.findQuotationById(
      quotationId
    );

  if (!quotation) {
    throw new NotFoundError("Quotation not found");
  }

  if (quotation.tourRequest.touristId !== touristId) {
    throw new ForbiddenError(
      "You do not have permission to accept this quotation"
    );
  }

  if (quotation.status !== "SENT") {
    throw new BadRequestError(
      "Only sent quotations can be accepted"
    );
  }

  if (
    quotation.validUntil &&
    quotation.validUntil <= new Date()
  ) {
    await quotationsRepository.updateQuotationStatus(
      quotationId,
      {
        status: "EXPIRED",
      }
    );

    throw new BadRequestError(
      "Quotation has expired"
    );
  }

  await quotationsRepository.supersedeOtherQuotations(
    quotation.tourRequestId,
    quotationId
  );

  const accepted =
    await quotationsRepository.updateQuotationStatus(
      quotationId,
      {
        status: "ACCEPTED",
        respondedAt: new Date(),
      }
    );

  await tourRequestsRepository.updateTourRequestStatus(
    quotation.tourRequestId,
    "ACCEPTED"
  );

  return accepted;
};

const rejectQuotation = async (
  quotationId,
  touristId,
  reason
) => {
  const quotation =
    await quotationsRepository.findQuotationById(
      quotationId
    );

  if (!quotation) {
    throw new NotFoundError("Quotation not found");
  }

  if (quotation.tourRequest.touristId !== touristId) {
    throw new ForbiddenError(
      "You do not have permission to reject this quotation"
    );
  }

  if (quotation.status !== "SENT") {
    throw new BadRequestError(
      "Only sent quotations can be rejected"
    );
  }

  const rejected =
    await quotationsRepository.updateQuotationStatus(
      quotationId,
      {
        status: "REJECTED",
        respondedAt: new Date(),
        notes: reason
          ? `${quotation.notes || ""}\nRejection reason: ${reason}`.trim()
          : quotation.notes,
      }
    );

  await tourRequestsRepository.updateTourRequestStatus(
    quotation.tourRequestId,
    "REJECTED"
  );

  return rejected;
};

module.exports = {
  createQuotation,
  getQuotationsByTourRequest,
  getQuotationById,
  updateQuotation,
  sendQuotation,
  acceptQuotation,
  rejectQuotation,
};