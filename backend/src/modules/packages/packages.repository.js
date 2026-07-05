const prisma = require("../../config/prisma");
const packageInclude = require("./packages.include");

const findPackages = async ({ skip, take, filters, orderBy }) => {
  return prisma.travelPackage.findMany({
    where: filters,
    include: packageInclude,
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