const packagesService = require("./packages.service");
const { sendSuccess } = require("../../utils/apiResponse");
const { NotFoundError } = require("../../utils/AppError");
const asyncHandler = require("../../utils/asyncHandler");
const HTTP_STATUS = require("../../core/constants/httpStatus");
const packageMapper = require("./packages.mapper");

const getAllPackages = asyncHandler(async (req, res) => {
  const packages = await packagesService.getAllPackages(req.query);

  return sendSuccess(res, "Travel packages retrieved successfully", packages);
});

const createPackage = asyncHandler(async (req, res) => {
  const packageDto = packageMapper.toCreatePackageDto(req.body);

  const createdPackage = await packagesService.createPackage(packageDto);
  const response = packageMapper.toPackageResponseDto(createdPackage);

  return sendSuccess(
    res,
    "Travel package created successfully",
    response,
    HTTP_STATUS.CREATED,
  );
});

const getPackageById = asyncHandler(async (req, res) => {
  const travelPackage = await packagesService.getPackageById(req.params.id);
  const response = packageMapper.toPackageResponseDto(travelPackage);

  if (!travelPackage) {
    throw new NotFoundError("Travel package not found");
  }

  return sendSuccess(res, "Travel package retrieved successfully", response);
});

const updatePackage = asyncHandler(async (req, res) => {
  const packageDto = packageMapper.toUpdatePackageDto(req.body);

  const updatedPackage = await packagesService.updatePackage(
    req.params.id,
    packageDto,
  );

  const response = packageMapper.toPackageResponseDto(updatedPackage);
  return sendSuccess(res, "Travel package updated successfully", response);
});

const deletePackage = asyncHandler(async (req, res) => {
  await packagesService.deletePackage(req.params.id);

  return sendSuccess(res, "Travel package deleted successfully");
});

module.exports = {
  getAllPackages,
  createPackage,
  getPackageById,
  updatePackage,
  deletePackage,
};
