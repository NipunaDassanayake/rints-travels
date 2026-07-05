const prisma = require("../../config/prisma");

const findPackages = async ({ skip, take, filters, orderBy }) => {
  return prisma.travelPackage.findMany({
    where: filters,
    include: {
      images: true,
      itineraries: true,
      inclusions: true,
      exclusions: true,
      faqs: true,
    },
    orderBy,
    skip,
    take,
  });
};

const countPackages = async (filters) => {
  return prisma.travelPackage.count({
    where: filters,
  });
};

const createPackage = async (data) => {
  return prisma.travelPackage.create({
    data,
  });
};

const findPackageById = async (id) => {
  return prisma.travelPackage.findUnique({
    where: {
      id: Number(id),
    },
    include: {
      images: true,
      itineraries: true,
      inclusions: true,
      exclusions: true,
      faqs: true,
    },
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
  return prisma.travelPackage.delete({
    where: {
      id: Number(id),
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
};