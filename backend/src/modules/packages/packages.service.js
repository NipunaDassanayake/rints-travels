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

const updatePackage = async (id, packageData) => {
  const existingPackage = await packagesRepository.findById(id);

  if (!existingPackage) {
    const error = new Error("Travel package not found");
    error.statusCode = 404;
    throw error;
  }

  return packagesRepository.update(id, packageData);
};

module.exports = {
  getAllPackages,
  createPackage,
  getPackageById,
  updatePackage,
};