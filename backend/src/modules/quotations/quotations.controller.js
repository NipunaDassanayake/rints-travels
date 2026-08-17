const quotationsService = require("./quotations.service");

const asyncHandler = require("../../utils/asyncHandler");

const { sendSuccess } = require("../../utils/apiResponse");

const HTTP_STATUS = require("../../core/constants/httpStatus");

/**
 * =========================================================
 * Create Quotation
 * =========================================================
 */

const createQuotation = asyncHandler(async (req, res) => {
  const quotation = await quotationsService.createQuotation(
    req.params.tourRequestId,
    req.body,
  );

  return sendSuccess(
    res,
    "Quotation created successfully",
    quotation,
    HTTP_STATUS.CREATED,
  );
});

/**
 * =========================================================
 * Get Quotations For Tour Request
 * =========================================================
 */

const getTourRequestQuotations = asyncHandler(async (req, res) => {
  const quotations = await quotationsService.getQuotationsByTourRequest(
    req.params.tourRequestId,
    req.user,
  );

  return sendSuccess(res, "Quotations retrieved successfully", quotations);
});

/**
 * =========================================================
 * Get Quotation By ID
 * =========================================================
 */

const getQuotationById = asyncHandler(async (req, res) => {
  const quotation = await quotationsService.getQuotationById(
    req.params.id,
    req.user,
  );

  return sendSuccess(res, "Quotation retrieved successfully", quotation);
});

/**
 * =========================================================
 * Update Draft Quotation
 * =========================================================
 */

const updateQuotation = asyncHandler(async (req, res) => {
  const quotation = await quotationsService.updateQuotation(
    req.params.id,
    req.body,
  );

  return sendSuccess(res, "Quotation updated successfully", quotation);
});

/**
 * =========================================================
 * Send Quotation
 * =========================================================
 */

const sendQuotation = asyncHandler(async (req, res) => {
  const quotation = await quotationsService.sendQuotation(req.params.id);

  return sendSuccess(res, "Quotation sent successfully", quotation);
});

/**
 * =========================================================
 * Accept Quotation
 * =========================================================
 */

const acceptQuotation = asyncHandler(async (req, res) => {
  const quotation = await quotationsService.acceptQuotation(
    req.params.id,
    req.user.id,
  );

  return sendSuccess(res, "Quotation accepted successfully", quotation);
});

/**
 * =========================================================
 * Reject Quotation
 * =========================================================
 */

const rejectQuotation = asyncHandler(async (req, res) => {
  const quotation = await quotationsService.rejectQuotation(
    req.params.id,
    req.user.id,
    req.body.reason,
  );

  return sendSuccess(res, "Quotation rejected successfully", quotation);
});

/**
 * =========================================================
 * Create Revision
 * =========================================================
 */

const createRevision = asyncHandler(async (req, res) => {
  const quotation = await quotationsService.createRevision(
    req.params.id,
    req.body,
  );

  return sendSuccess(
    res,
    "Quotation revision created successfully",
    quotation,
    HTTP_STATUS.CREATED,
  );
});

module.exports = {
  createQuotation,
  getTourRequestQuotations,
  getQuotationById,
  updateQuotation,
  sendQuotation,
  acceptQuotation,
  rejectQuotation,
  createRevision,
};