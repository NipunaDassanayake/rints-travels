const packagesRepository = require("./packages.repository");
const { NotFoundError } = require("../../utils/AppError");

const getAllPackages = async (query) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

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
    packagesRepository.findAll({ skip, take: limit, filters }),
    packagesRepository.count(filters),
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
  return packagesRepository.create(packageData);
};

const getPackageById = async (id) => {
  return packagesRepository.findById(id);
};

const updatePackage = async (id, packageData) => {
  const existingPackage = await packagesRepository.findById(id);

  if (!existingPackage) {
   throw new NotFoundError("Travel package not found");
  }

  return packagesRepository.update(id, packageData);
};

const deletePackage = async (id) => {
  const existingPackage = await packagesRepository.findById(id);

  if (!existingPackage) {
   throw new NotFoundError("Travel package not found");
  }

  return packagesRepository.remove(id);
};

module.exports = {
  getAllPackages,
  createPackage,
  getPackageById,
  updatePackage,
  deletePackage,
};