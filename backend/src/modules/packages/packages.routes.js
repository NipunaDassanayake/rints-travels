const express = require("express");
const packagesController = require("./packages.controller");

const router = express.Router();

router.get("/", packagesController.getAllPackages);

module.exports = router;