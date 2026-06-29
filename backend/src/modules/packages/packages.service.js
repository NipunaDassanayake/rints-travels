const packagesRepository = require("./packages.repository");

const getAllPackages = async () => {
  return packagesRepository.findAll();
};

const createPackage = async (packageData) => {
  return packagesRepository.create(packageData);
};

const getPackageById = async (id) => {
  return packagesRepository.findById(id);
}

module.exports = {
  getAllPackages,
  createPackage,
  getPackageById,
};