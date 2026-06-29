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

module.exports = {
  findAll,
  create,
};