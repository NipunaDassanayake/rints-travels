const express = require("express");
const cors = require("cors");

const requestLogger = require("./middlewares/requestLogger");
const notFoundHandler = require("./middlewares/notFoundHandler");
const errorHandler = require("./middlewares/errorHandler");
const healthRoutes = require("./modules/health/health.routes");
const { sendSuccess } = require("./utils/apiResponse");

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.use("/api/health", healthRoutes);

app.get("/", (req, res) => {
  return sendSuccess(res, "Welcome to Rints Travels API");
});

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;