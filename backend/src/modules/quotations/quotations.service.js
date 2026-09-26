const crypto = require("crypto");

const { Prisma } = require("@prisma/client");

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

const isAdminUser = (user) =>
  user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.SYSTEM_ADMIN;

/**
 * Scalar quotation fields an admin may change on a DRAFT or
 * carry into a revision.
 */
const QUOTATION_SCALAR_FIELDS = [
  "guideId",
  "title",
  "description",
  "startDate",
  "endDate",
  "adultCount",
  "childCount",
  "subtotal",
  "discountAmount",
  "taxAmount",
  "totalAmount",
  "currency",
  "notes",
  "termsConditions",
  "validUntil",
];

/**
 * Omitted (undefined) keys inherit the stored value; an explicit
 * null is a deliberate change (e.g. clearing validUntil).
 */
const mergeScalarFields = (changes, stored) => {
  return Object.fromEntries(
    QUOTATION_SCALAR_FIELDS.map((field) => [
      field,
      changes[field] !== undefined ? changes[field] : stored[field],
    ]),
  );
};

/**
 * The server is the source of truth for quotation pricing:
 * totalAmount must equal subtotal - discountAmount + taxAmount.
 *
 * Exact decimal arithmetic (Prisma.Decimal, the same type Prisma
 * returns for NUMERIC columns) -- no binary floating point.
 * Validation guarantees request amounts have at most two decimal
 * places, so these values are exactly what NUMERIC(12,2) stores.
 */
const assertPricingConsistent = ({
  subtotal,
  discountAmount,
  taxAmount,
  totalAmount,
}) => {
  const expectedTotal = new Prisma.Decimal(subtotal)
    .minus(new Prisma.Decimal(discountAmount))
    .plus(new Prisma.Decimal(taxAmount));

  const total = new Prisma.Decimal(totalAmount);

  if (total.lessThanOrEqualTo(0) || !total.equals(expectedTotal)) {
    throw new BadRequestError(
      "Quotation total must equal subtotal - discount + tax",
    );
  }
};

const assertDateRange = (startDate, endDate) => {
  if (new Date(endDate) < new Date(startDate)) {
    throw new BadRequestError("End date must be on or after the start date");
  }
};

/**
 * Whole-quotation consistency rules, applied to the quotation as
 * it will actually be stored.
 */
const assertQuotationConsistent = (quotation) => {
  assertDateRange(quotation.startDate, quotation.endDate);

  assertPricingConsistent(quotation);
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

  assertQuotationConsistent(data);

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

  const isAdmin = isAdminUser(currentUser);

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError(
      "You do not have permission to view these quotations",
    );
  }

  if (isAdmin) {
    return quotationsRepository.findQuotationsByTourRequest(tourRequestId);
  }

  // Tourists never see quotations that were not sent to them.
  return quotationsRepository.findSentQuotationsByTourRequest(tourRequestId);
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

  const isAdmin = isAdminUser(currentUser);

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError(
      "You do not have permission to view this quotation",
    );
  }

  /**
   * A quotation that was never sent (DRAFT, or a draft later
   * SUPERSEDED) does not exist from the tourist's perspective.
   */
  if (!isAdmin && !quotation.sentAt) {
    throw new NotFoundError("Quotation not found");
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

  const { itineraries, inclusions, exclusions, ...scalarChanges } = data;

  if (scalarChanges.guideId !== undefined) {
    await validateGuide(scalarChanges.guideId);
  }

  return quotationsRepository.updateDraftQuotationTransaction({
    id: quotationId,

    // Only the provided scalar fields are written.
    scalars: scalarChanges,

    itineraries,

    inclusions,

    exclusions,

    /**
     * Authoritative check, run inside the transaction on the row
     * as written (this edit applied on top of any concurrently
     * committed edit) while the row lock is held. A stale
     * pre-transaction read cannot be trusted here: two edits
     * that are each valid against the same snapshot can combine
     * into an inconsistent quotation.
     */
    validate: assertQuotationConsistent,
  });
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

  /**
   * Every omitted field -- including each child collection --
   * inherits from the quotation being revised. Provided values
   * (including explicit nulls and empty arrays) override.
   */
  const revisionData = {
    ...mergeScalarFields(data, quotation),

    tourRequestId: quotation.tourRequestId,

    itineraries:
      data.itineraries !== undefined
        ? data.itineraries
        : quotation.itineraries.map((item) => ({
            dayNumber: item.dayNumber,

            title: item.title,

            description: item.description,
          })),

    inclusions:
      data.inclusions !== undefined
        ? data.inclusions
        : quotation.inclusions.map((item) => item.title),

    exclusions:
      data.exclusions !== undefined
        ? data.exclusions
        : quotation.exclusions.map((item) => item.title),

    quotationNumber: generateQuotationNumber(),
  };

  // The source is immutable once SENT/REJECTED, so validating
  // against this read is safe for revisions.
  assertQuotationConsistent(revisionData);

  if (data.guideId !== undefined) {
    await validateGuide(data.guideId);
  }

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