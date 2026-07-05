const packagesService = require("./packages.service");
const { sendSuccess } = require("../../utils/apiResponse");
const { NotFoundError } = require("../../utils/AppError");
const asyncHandler = require("../../utils/asyncHandler");


const getAllPackages = asyncHandler(async (req, res) => {
  const packages = await packagesService.getAllPackages(req.query);

  return sendSuccess(res, "Travel packages retrieved successfully", packages);
});

const createPackage = asyncHandler(async (req, res) => {
  const createdPackage = await packagesService.createPackage(req.body);

  return sendSuccess(res, "Travel package created successfully", createdPackage, 201);
});

const getPackageById = asyncHandler(async (req, res) => {
  const travelPackage = await packagesService.getPackageById(req.params.id);

  if (!travelPackage) {
    throw new NotFoundError("Travel package not found");
  }

  return sendSuccess(res, "Travel package retrieved successfully", travelPackage);
});

const updatePackage = asyncHandler(async (req, res) => {
  const updatedPackage = await packagesService.updatePackage(req.params.id, req.body);

    return sendSuccess(res, "Travel package updated successfully", updatedPackage);
  
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