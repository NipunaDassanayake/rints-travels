const tourGuidesService = require("./tourGuides.service");

const asyncHandler = require("../../utils/asyncHandler");

const { sendSuccess } = require("../../utils/apiResponse");

const HTTP_STATUS = require("../../core/constants/httpStatus");

/**
 * =========================================================
 * Create Guide
 * =========================================================
 */

const createTourGuide = asyncHandler(async (req, res) => {
  const result = await tourGuidesService.createTourGuide(req.body);

  return sendSuccess(
    res,
    "Tour guide created successfully",
    result,
    HTTP_STATUS.CREATED,
  );
});

/**
 * =========================================================
 * Public - Available Guides
 * =========================================================
 */

const getAllTourGuides = asyncHandler(async (req, res) => {
  const tourGuides = await tourGuidesService.getAllTourGuides();

  return sendSuccess(res, "Tour guides retrieved successfully", tourGuides);
});

/**
 * =========================================================
 * Admin - All Guides
 * =========================================================
 */

const getAdminTourGuides = asyncHandler(async (req, res) => {
  const tourGuides = await tourGuidesService.getAdminTourGuides(req.query);

  return sendSuccess(
    res,
    "Admin tour guides retrieved successfully",
    tourGuides,
  );
});

/**
 * =========================================================
 * Guide Details (Public)
 * =========================================================
 */

const getTourGuideById = asyncHandler(async (req, res) => {
  const tourGuide = await tourGuidesService.getTourGuideById(req.params.id);

  return sendSuccess(res, "Tour guide retrieved successfully", tourGuide);
});

/**
 * =========================================================
 * Guide Details (Admin)
 * =========================================================
 */

const getAdminTourGuideById = asyncHandler(async (req, res) => {
  const tourGuide = await tourGuidesService.getAdminTourGuideById(
    req.params.id,
  );

  return sendSuccess(res, "Tour guide retrieved successfully", tourGuide);
});

/**
 * =========================================================
 * Update Guide
 * =========================================================
 */

const updateTourGuide = asyncHandler(async (req, res) => {
  const tourGuide = await tourGuidesService.updateTourGuide(
    req.params.id,
    req.body,
  );

  return sendSuccess(res, "Tour guide updated successfully", tourGuide);
});

/**
 * =========================================================
 * Availability
 * =========================================================
 */

const updateTourGuideAvailability = asyncHandler(async (req, res) => {
  const tourGuide = await tourGuidesService.updateTourGuideAvailability(
    req.params.id,
    req.body.isAvailable,
  );

  return sendSuccess(
    res,
    "Tour guide availability updated successfully",
    tourGuide,
  );
});

/**
 * =========================================================
 * Deactivate Guide
 * =========================================================
 */

const deleteTourGuide = asyncHandler(async (req, res) => {
  const tourGuide = await tourGuidesService.deleteTourGuide(req.params.id);

  return sendSuccess(res, "Tour guide deactivated successfully", tourGuide);
});

module.exports = {
  createTourGuide,

  getAllTourGuides,
  getAdminTourGuides,

  getTourGuideById,
  getAdminTourGuideById,

  updateTourGuide,

  updateTourGuideAvailability,

  deleteTourGuide,
};