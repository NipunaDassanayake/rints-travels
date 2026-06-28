const prisma = require("../../config/prisma");

const findAll = async () => {
  return prisma.travelPackage.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
};

module.exports = {
  findAll,
};