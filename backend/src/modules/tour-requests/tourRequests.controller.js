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

const getMyTourRequests = asyncHandler(async (req, res) => {
  const tourRequests =
    await tourRequestsService.getMyTourRequests(
      req.user.id
    );

  return sendSuccess(
    res,
    "Tour requests retrieved successfully",
    tourRequests
  );
});

const getTourRequestById = asyncHandler(async (req, res) => {
  const tourRequest =
    await tourRequestsService.getTourRequestById(
      req.params.id,
      req.user
    );

  return sendSuccess(
    res,
    "Tour request retrieved successfully",
    tourRequest
  );
});

const getAllTourRequests = asyncHandler(async (req, res) => {
  const tourRequests =
    await tourRequestsService.getAllTourRequests(req.query);

  return sendSuccess(
    res,
    "Tour requests retrieved successfully",
    tourRequests
  );
});

// Additional controller function to assign an admin to a tour request
const assignAdmin = asyncHandler(async (req, res) => {
  const tourRequest =
    await tourRequestsService.assignAdmin(
      req.params.id,
      req.body.adminId
    );

  return sendSuccess(
    res,
    "Admin assigned to tour request successfully",
    tourRequest
  );
});

module.exports = {
  createPackageBasedRequest,
  createCustomRequest,
  getMyTourRequests,
  getAllTourRequests,
  getTourRequestById,
  assignAdmin,
};