const packagesRepository = require("./packages.repository");
const { NotFoundError } = require("../../utils/AppError");
const getPagination = require("../../core/pagination/getPagination");
const buildFilters = require("../../core/query/buildFilters");
const buildSorting = require("../../core/query/buildSorting");
const { buildPackageQueryOptions } = require("./packages.query");

const getAllPackages = async (query) => {
  const options = buildPackageQueryOptions(query);

  const [packages, total] = await Promise.all([
    packagesRepository.findPackages(options),
    packagesRepository.countPackages(options.filters),
  ]);

  return {
    items: packages,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit),
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
