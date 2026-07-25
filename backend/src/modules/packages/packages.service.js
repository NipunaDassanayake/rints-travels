const packagesRepository = require("./packages.repository");
const { NotFoundError, ConflictError } = require("../../utils/AppError");
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
  const existingPackage =
    await packagesRepository.findPackageBySlug(packageData.slug);

  if (existingPackage) {
    throw new ConflictError(
      "A travel package with this slug already exists"
    );
  }

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

// Package Images
const addPackageImage = async (packageId, imageData) => {
  const travelPackage =
    await packagesRepository.findPackageById(packageId);

  if (!travelPackage) {
    throw new NotFoundError("Travel package not found");
  }

  if (imageData.isPrimary) {
    await packagesRepository.unsetPrimaryPackageImages(packageId);
  }

  return packagesRepository.createPackageImage({
    packageId: Number(packageId),
    imageUrl: imageData.imageUrl,
    altText: imageData.altText || null,
    isPrimary: imageData.isPrimary || false,
    displayOrder: imageData.displayOrder || 0,
  });
};

const updatePackageImage = async (
  packageId,
  imageId,
  imageData
) => {
  const travelPackage =
    await packagesRepository.findPackageById(packageId);

  if (!travelPackage) {
    throw new NotFoundError("Travel package not found");
  }

  const existingImage =
    await packagesRepository.findPackageImageById(
      packageId,
      imageId
    );

  if (!existingImage) {
    throw new NotFoundError("Package image not found");
  }

  if (imageData.isPrimary === true) {
    await packagesRepository.unsetPrimaryPackageImages(
      packageId
    );
  }

  return packagesRepository.updatePackageImage(
    imageId,
    imageData
  );
};

const deletePackageImage = async (packageId, imageId) => {
  const travelPackage =
    await packagesRepository.findPackageById(packageId);

  if (!travelPackage) {
    throw new NotFoundError("Travel package not found");
  }

  const existingImage =
    await packagesRepository.findPackageImageById(
      packageId,
      imageId
    );

  if (!existingImage) {
    throw new NotFoundError("Package image not found");
  }

  return packagesRepository.deletePackageImage(imageId);
};

module.exports = {
  getAllPackages,
  createPackage,
  getPackageById,
  updatePackage,
  deletePackage,
  addPackageImage,
  updatePackageImage,
  deletePackageImage,
};
