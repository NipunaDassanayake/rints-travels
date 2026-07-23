const express = require("express");

const packagesController = require("./packages.controller");

const validateRequest = require("../../middlewares/validateRequest");
const authenticate = require("../../middlewares/authenticate");
const authorize = require("../../middlewares/authorize");

const {
  createPackageSchema,
  updatePackageSchema,
} = require("./packages.validation");

const {
  USER_ROLES,
} = require("../../core/constants/auth.constants");

const router = express.Router();

/**
 * Public routes
 */

// Get all travel packages
router.get(
  "/",
  packagesController.getAllPackages
);

// Get travel package by ID
router.get(
  "/:id",
  packagesController.getPackageById
);

/**
 * Admin protected routes
 */

// Create travel package
router.post(
  "/",
  authenticate,
  authorize(
    USER_ROLES.ADMIN,
    USER_ROLES.SYSTEM_ADMIN
  ),
  validateRequest(createPackageSchema),
  packagesController.createPackage
);

// Update travel package
router.put(
  "/:id",
  authenticate,
  authorize(
    USER_ROLES.ADMIN,
    USER_ROLES.SYSTEM_ADMIN
  ),
  validateRequest(updatePackageSchema),
  packagesController.updatePackage
);

// Delete travel package
router.delete(
  "/:id",
  authenticate,
  authorize(
    USER_ROLES.ADMIN,
    USER_ROLES.SYSTEM_ADMIN
  ),
  packagesController.deletePackage
);

module.exports = router;