const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const { sendSuccess } = require("./utils/apiResponse");

const healthRoutes = require("./modules/health/health.routes");

app.get("/", (req, res) => {
  return sendSuccess(res, "Welcome to Rints Travels API");
});

app.use("/api/health", healthRoutes);

module.exports = app;