const express = require("express");
const packagesController = require("./packages.controller");

const router = express.Router();

router.get("/", packagesController.getAllPackages);
router.post("/", packagesController.createPackage);
router.get("/:id", packagesController.getPackageById);
router.put("/:id", packagesController.updatePackage);

module.exports = router;