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

module.exports = {
  findPackages,
  countPackages,
  createPackage,
  findPackageById,
  updatePackage,
  deletePackage,
};