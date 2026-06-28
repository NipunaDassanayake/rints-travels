const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const { sendSuccess } = require("./utils/apiResponse");

const healthRoutes = require("./modules/health/health.routes");

const errorHandler = require("./middlewares/errorHandler");


app.get("/", (req, res) => {
  return sendSuccess(res, "Welcome to Rints Travels API");
});

app.use("/api/health", healthRoutes);
app.use(errorHandler);



//Test error route for testing error handling middleware
app.get("/api/test-error", (req, res, next) => {
  const error = new Error("This is a test error");
  error.statusCode = 400;
  next(error);
});

module.exports = app;