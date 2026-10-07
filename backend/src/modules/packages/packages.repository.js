const prisma = require("../../config/prisma");

const packageInclude = require("./packages.include");

const findPackages = async ({ skip, take, filters, orderBy }) => {
  return prisma.travelPackage.findMany({
    where: {
      ...filters,

      deletedAt: null,
    },

    include: packageInclude,

    orderBy,

    skip,

    take,
  });
};

const countPackages = async (filters) => {
  return prisma.travelPackage.count({
    where: {
      ...filters,

      deletedAt: null,
    },
  });
};

const createPackage = async (data) => {
  return prisma.travelPackage.create({
    data,

    include: packageInclude,
  });
};

const findPackageById = async (id) => {
  return prisma.travelPackage.findFirst({
    where: {
      id: Number(id),

      deletedAt: null,
    },

    include: packageInclude,
  });
};

const updatePackage = async (id, data) => {
  return prisma.travelPackage.update({
    where: {
      id: Number(id),
    },

    data,

    include: packageInclude,
  });
};

const deletePackage = async (id) => {
  return prisma.travelPackage.update({
    where: {
      id: Number(id),
    },

    data: {
      status: "INACTIVE",

      deletedAt: new Date(),
    },

    include: packageInclude,
  });
};

/**
 * Find package by slug
 */
const findPackageBySlug = async (slug) => {
  return prisma.travelPackage.findFirst({
    where: {
      slug,

      deletedAt: null,
    },

    include: packageInclude,
  });
};

/**
 * =========================================================
 * Package Images
 * =========================================================
 */

const createPackageImage = async (data) => {
  return prisma.packageImage.create({
    data,
  });
};

const findPackageImageById = async (packageId, imageId) => {
  return prisma.packageImage.findFirst({
    where: {
      id: Number(imageId),

      packageId: Number(packageId),
    },
  });
};

const updatePackageImage = async (imageId, data) => {
  return prisma.packageImage.update({
    where: {
      id: Number(imageId),
    },

    data,
  });
};

const deletePackageImage = async (imageId) => {
  return prisma.packageImage.delete({
    where: {
      id: Number(imageId),
    },
  });
};

const unsetPrimaryPackageImages = async (packageId) => {
  return prisma.packageImage.updateMany({
    where: {
      packageId: Number(packageId),

      isPrimary: true,
    },

    data: {
      isPrimary: false,
    },
  });
};

/**
 * =========================================================
 * Package Itineraries
 * =========================================================
 */

const createPackageItinerary = async (data) => {
  return prisma.packageItinerary.create({
    data,
  });
};

const findPackageItineraryById = async (packageId, itineraryId) => {
  return prisma.packageItinerary.findFirst({
    where: {
      id: Number(itineraryId),

      packageId: Number(packageId),
    },
  });
};

const findPackageItineraryByDayNumber = async (packageId, dayNumber) => {
  return prisma.packageItinerary.findFirst({
    where: {
      packageId: Number(packageId),

      dayNumber,
    },
  });
};

const updatePackageItinerary = async (itineraryId, data) => {
  return prisma.packageItinerary.update({
    where: {
      id: Number(itineraryId),
    },

    data,
  });
};

const deletePackageItinerary = async (itineraryId) => {
  return prisma.packageItinerary.delete({
    where: {
      id: Number(itineraryId),
    },
  });
};

/**
 * =========================================================
 * Package Inclusions
 * =========================================================
 */

const createPackageInclusion = async (data) => {
  return prisma.packageInclusion.create({
    data,
  });
};

const findPackageInclusionById = async (packageId, inclusionId) => {
  return prisma.packageInclusion.findFirst({
    where: {
      id: Number(inclusionId),

      packageId: Number(packageId),
    },
  });
};

const updatePackageInclusion = async (inclusionId, data) => {
  return prisma.packageInclusion.update({
    where: {
      id: Number(inclusionId),
    },

    data,
  });
};

const deletePackageInclusion = async (inclusionId) => {
  return prisma.packageInclusion.delete({
    where: {
      id: Number(inclusionId),
    },
  });
};

/**
 * =========================================================
 * Package Exclusions
 * =========================================================
 */

const createPackageExclusion = async (data) => {
  return prisma.packageExclusion.create({
    data,
  });
};

const findPackageExclusionById = async (packageId, exclusionId) => {
  return prisma.packageExclusion.findFirst({
    where: {
      id: Number(exclusionId),

      packageId: Number(packageId),
    },
  });
};

const updatePackageExclusion = async (exclusionId, data) => {
  return prisma.packageExclusion.update({
    where: {
      id: Number(exclusionId),
    },

    data,
  });
};

const deletePackageExclusion = async (exclusionId) => {
  return prisma.packageExclusion.delete({
    where: {
      id: Number(exclusionId),
    },
  });
};

/**
 * =========================================================
 * Package FAQs
 * =========================================================
 */

const createPackageFaq = async (data) => {
  return prisma.packageFAQ.create({
    data,
  });
};

const findPackageFaqById = async (packageId, faqId) => {
  return prisma.packageFAQ.findFirst({
    where: {
      id: Number(faqId),

      packageId: Number(packageId),
    },
  });
};

const updatePackageFaq = async (faqId, data) => {
  return prisma.packageFAQ.update({
    where: {
      id: Number(faqId),
    },

    data,
  });
};

const deletePackageFaq = async (faqId) => {
  return prisma.packageFAQ.delete({
    where: {
      id: Number(faqId),
    },
  });
};

module.exports = {
  findPackages,
  countPackages,

  createPackage,
  findPackageById,
  updatePackage,
  deletePackage,
  findPackageBySlug,

  createPackageImage,
  findPackageImageById,
  updatePackageImage,
  deletePackageImage,
  unsetPrimaryPackageImages,

  createPackageItinerary,
  findPackageItineraryById,
  findPackageItineraryByDayNumber,
  updatePackageItinerary,
  deletePackageItinerary,

  createPackageInclusion,
  findPackageInclusionById,
  updatePackageInclusion,
  deletePackageInclusion,

  createPackageExclusion,
  findPackageExclusionById,
  updatePackageExclusion,
  deletePackageExclusion,

  createPackageFaq,
  findPackageFaqById,
  updatePackageFaq,
  deletePackageFaq,
};