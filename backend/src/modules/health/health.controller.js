const { sendSuccess } = require("../../utils/apiResponse");

const checkHealth = (req, res) => {
  return sendSuccess(res, "Rints Travels API is healthy", {
    service: "rints-travels-api",
    status: "UP",
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  checkHealth,
};