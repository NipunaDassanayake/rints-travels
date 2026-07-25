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

// Package Itineraries
const addPackageItinerary = async (
  packageId,
  itineraryData
) => {
  const travelPackage =
    await packagesRepository.findPackageById(packageId);

  if (!travelPackage) {
    throw new NotFoundError("Travel package not found");
  }

  const existingDay =
    await packagesRepository.findPackageItineraryByDayNumber(
      packageId,
      itineraryData.dayNumber
    );

  if (existingDay) {
    throw new ConflictError(
      `Day ${itineraryData.dayNumber} already exists for this package`
    );
  }

  return packagesRepository.createPackageItinerary({
    packageId: Number(packageId),
    ...itineraryData,
  });
};

const updatePackageItinerary = async (
  packageId,
  itineraryId,
  itineraryData
) => {
  const travelPackage =
    await packagesRepository.findPackageById(packageId);

  if (!travelPackage) {
    throw new NotFoundError("Travel package not found");
  }

  const existingItinerary =
    await packagesRepository.findPackageItineraryById(
      packageId,
      itineraryId
    );

  if (!existingItinerary) {
    throw new NotFoundError(
      "Package itinerary item not found"
    );
  }

  if (
    itineraryData.dayNumber &&
    itineraryData.dayNumber !== existingItinerary.dayNumber
  ) {
    const existingDay =
      await packagesRepository.findPackageItineraryByDayNumber(
        packageId,
        itineraryData.dayNumber
      );

    if (existingDay) {
      throw new ConflictError(
        `Day ${itineraryData.dayNumber} already exists for this package`
      );
    }
  }

  return packagesRepository.updatePackageItinerary(
    itineraryId,
    itineraryData
  );
};

const deletePackageItinerary = async (
  packageId,
  itineraryId
) => {
  const existingItinerary =
    await packagesRepository.findPackageItineraryById(
      packageId,
      itineraryId
    );

  if (!existingItinerary) {
    throw new NotFoundError(
      "Package itinerary item not found"
    );
  }

  return packagesRepository.deletePackageItinerary(
    itineraryId
  );
};

// Package Inclusions
const addPackageInclusion = async (
  packageId,
  inclusionData
) => {
  const travelPackage =
    await packagesRepository.findPackageById(packageId);

  if (!travelPackage) {
    throw new NotFoundError("Travel package not found");
  }

  return packagesRepository.createPackageInclusion({
    packageId: Number(packageId),
    title: inclusionData.title,
  });
};

const updatePackageInclusion = async (
  packageId,
  inclusionId,
  inclusionData
) => {
  const existingInclusion =
    await packagesRepository.findPackageInclusionById(
      packageId,
      inclusionId
    );

  if (!existingInclusion) {
    throw new NotFoundError(
      "Package inclusion not found"
    );
  }

  return packagesRepository.updatePackageInclusion(
    inclusionId,
    inclusionData
  );
};

const deletePackageInclusion = async (
  packageId,
  inclusionId
) => {
  const existingInclusion =
    await packagesRepository.findPackageInclusionById(
      packageId,
      inclusionId
    );

  if (!existingInclusion) {
    throw new NotFoundError(
      "Package inclusion not found"
    );
  }

  return packagesRepository.deletePackageInclusion(
    inclusionId
  );
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

  addPackageItinerary,
  updatePackageItinerary,
  deletePackageItinerary,
};
