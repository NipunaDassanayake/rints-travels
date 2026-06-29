const packagesService = require("./packages.service");
const { sendSuccess } = require("../../utils/apiResponse");

const getAllPackages = async (req, res, next) => {
  try {
    const packages = await packagesService.getAllPackages();

    return sendSuccess(res, "Travel packages retrieved successfully", packages);
  } catch (error) {
    next(error);
  }
};

const createPackage = async (req, res, next) => {
  try {
    const createdPackage = await packagesService.createPackage(req.body);

    return sendSuccess(res, "Travel package created successfully", createdPackage, 201);
  } catch (error) {
    next(error);
  }
};

const getPackageById = async (req, res, next) => {
  try {
    const travelPackage = await packagesService.getPackageById(req.params.id);

    if (!travelPackage) {
      const error = new Error("Travel package not found");
      error.statusCode = 404;
      throw error;
    }

    return sendSuccess(res, "Travel package retrieved successfully", travelPackage);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPackages,
  createPackage,
  getPackageById,
};