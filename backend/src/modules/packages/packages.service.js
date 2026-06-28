const packagesRepository = require("./packages.repository");

const getAllPackages = async () => {
  return packagesRepository.findAll();
};

module.exports = {
  getAllPackages,
};