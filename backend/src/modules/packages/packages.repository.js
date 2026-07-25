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
  });
};

//find package by slug
const findPackageBySlug = async (slug) => {
  return prisma.travelPackage.findUnique({
    where: {
      slug,
    },
  });
};

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
};