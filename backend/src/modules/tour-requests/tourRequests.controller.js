const tourRequestsService = require("./tourRequests.service");
const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const HTTP_STATUS = require("../../core/constants/httpStatus");

const createPackageBasedRequest = asyncHandler(async (req, res) => {
  const tourRequest =
    await tourRequestsService.createPackageBasedRequest(
      req.user.id,
      req.body
    );

  return sendSuccess(
    res,
    "Package-based tour request created successfully",
    tourRequest,
    HTTP_STATUS.CREATED
  );
});

const createCustomRequest = asyncHandler(async (req, res) => {
  const tourRequest =
    await tourRequestsService.createCustomRequest(
      req.user.id,
      req.body
    );

  return sendSuccess(
    res,
    "Custom tour request created successfully",
    tourRequest,
    HTTP_STATUS.CREATED
  );
});

module.exports = {
  createPackageBasedRequest,
  createCustomRequest,
};