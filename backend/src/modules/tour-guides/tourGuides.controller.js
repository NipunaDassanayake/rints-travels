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

module.exports = {
  createTourGuide,
};