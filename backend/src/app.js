const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const { sendSuccess } = require("./utils/apiResponse");

app.get("/", (req, res) => {
  return sendSuccess(res, "Welcome to Rints Travels API");
});

module.exports = app;