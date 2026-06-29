const prisma = require("../../config/prisma");

const findAll = async () => {
  return prisma.travelPackage.findMany({
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

module.exports = {
  findAll,
  create,
  findById,
  update,
};