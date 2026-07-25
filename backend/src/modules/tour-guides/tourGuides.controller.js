const tourGuidesService = require("./tourGuides.service");
const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const HTTP_STATUS = require("../../core/constants/httpStatus");

const createTourGuide = asyncHandler(async (req, res) => {
  const result =
    await tourGuidesService.createTourGuide(req.body);

  return sendSuccess(
    res,
    "Tour guide created successfully",
    result,
    HTTP_STATUS.CREATED
  );
});

// Additional functions to retrieve tour guides
const getAllTourGuides = asyncHandler(async (req, res) => {
  const tourGuides =
    await tourGuidesService.getAllTourGuides();

  return sendSuccess(
    res,
    "Tour guides retrieved successfully",
    tourGuides
  );
});

const getTourGuideById = asyncHandler(async (req, res) => {
  const tourGuide =
    await tourGuidesService.getTourGuideById(req.params.id);

  return sendSuccess(
    res,
    "Tour guide retrieved successfully",
    tourGuide
  );
});

module.exports = {
  createTourGuide,
  getAllTourGuides,
  getTourGuideById,
};