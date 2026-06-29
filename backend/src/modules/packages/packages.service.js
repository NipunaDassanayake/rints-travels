const packagesRepository = require("./packages.repository");

const getAllPackages = async () => {
  return packagesRepository.findAll();
};

const createPackage = async (packageData) => {
  return packagesRepository.create(packageData);
};

module.exports = {
  getAllPackages,
  createPackage,
};