const prisma = require("../../config/prisma");

const findAll = async ({ skip, take, filters }) => {
  return prisma.travelPackage.findMany({
    where: filters,
    include: {
      images: true,
      itineraries: true,
      inclusions: true,
      exclusions: true,
      faqs: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    skip,
    take,
  });
};

const count = async (filters) => {
  return prisma.travelPackage.count({
    where: filters,
  });
};

const create = async (data) => {
  return prisma.travelPackage.create({
    data,
  });
};

const findById = async (id) => {
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

const update = async (id, data) => {
  return prisma.travelPackage.update({
    where: {
      id: Number(id),
    },
    data,
  });
};

const remove = async (id) => {
  return prisma.travelPackage.delete({
    where: {
      id: Number(id),
    },
  });
};

module.exports = {
  findAll,
  count,
  create,
  findById,
  update,
  remove,
};