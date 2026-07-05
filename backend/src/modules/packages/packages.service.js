const packagesRepository = require("./packages.repository");
const { NotFoundError } = require("../../utils/AppError");
const getPagination = require("../../core/pagination/getPagination");

const getAllPackages = async (query) => {
const { page, limit, skip, take } = getPagination(query);
  const filters = {};

  if (query.status) {
    filters.status = query.status;
  }

  if (query.destination) {
    filters.destination = {
      contains: query.destination,
      mode: "insensitive",
    };
  }

  const [packages, total] = await Promise.all([
    packagesRepository.findPackages({ skip, take, filters }),
    packagesRepository.countPackages(filters),
  ]);

  return {
    items: packages,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const createPackage = async (packageData) => {
  return packagesRepository.createPackage(packageData);
};

const getPackageById = async (id) => {
  return packagesRepository.findPackageById(id);
};

const updatePackage = async (id, packageData) => {
  const existingPackage = await packagesRepository.findPackageById(id);

  if (!existingPackage) {
   throw new NotFoundError("Travel package not found");
  }

  return packagesRepository.updatePackage(id, packageData);
};

const deletePackage = async (id) => {
  const existingPackage = await packagesRepository.findPackageById(id);

  if (!existingPackage) {
   throw new NotFoundError("Travel package not found");
  }

  return packagesRepository.deletePackage(id);
};

module.exports = {
  getAllPackages,
  createPackage,
  getPackageById,
  updatePackage,
  deletePackage,
};