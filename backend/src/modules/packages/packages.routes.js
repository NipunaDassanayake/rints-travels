const express = require("express");
const packagesController = require("./packages.controller");
const validateRequest = require("../../middlewares/validateRequest");
const {
  createPackageSchema,
  updatePackageSchema,
} = require("./packages.validation");

const router = express.Router();

router.get("/", packagesController.getAllPackages);
router.post("/", validateRequest(createPackageSchema), packagesController.createPackage);
router.get("/:id", packagesController.getPackageById);
router.put("/:id", validateRequest(updatePackageSchema), packagesController.updatePackage);
router.delete("/:id", packagesController.deletePackage);

module.exports = router;