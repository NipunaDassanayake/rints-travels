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

module.exports = {
  getAllPackages,
};