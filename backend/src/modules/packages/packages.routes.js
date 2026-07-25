const express = require("express");

const packagesController = require("./packages.controller");

const validateRequest = require("../../middlewares/validateRequest");
const authenticate = require("../../middlewares/authenticate");
const authorize = require("../../middlewares/authorize");

const {
  createPackageSchema,
  updatePackageSchema,
  createPackageImageSchema,
  updatePackageImageSchema,
  createPackageItinerarySchema,
  updatePackageItinerarySchema,
  createPackageInclusionSchema,
  updatePackageInclusionSchema,
  createPackageExclusionSchema,
  updatePackageExclusionSchema,
  createPackageFaqSchema,
  updatePackageFaqSchema,
} = require("./packages.validation");

const {
  USER_ROLES,
} = require("../../core/constants/auth.constants");

const router = express.Router();

/**
 * Public Package Routes
 */

// Get all active travel packages
router.get(
  "/",
  packagesController.getAllPackages
);

/**
 * Package Image Management
 * ADMIN / SYSTEM_ADMIN only
 */

// Add package image
router.post(
  "/:packageId/images",
  authenticate,
  authorize(
    USER_ROLES.ADMIN,
    USER_ROLES.SYSTEM_ADMIN
  ),
  validateRequest(createPackageImageSchema),
  packagesController.addPackageImage
);

// Update package image
router.patch(
  "/:packageId/images/:imageId",
  authenticate,
  authorize(
    USER_ROLES.ADMIN,
    USER_ROLES.SYSTEM_ADMIN
  ),
  validateRequest(updatePackageImageSchema),
  packagesController.updatePackageImage
);

// Delete package image
router.delete(
  "/:packageId/images/:imageId",
  authenticate,
  authorize(
    USER_ROLES.ADMIN,
    USER_ROLES.SYSTEM_ADMIN
  ),
  packagesController.deletePackageImage
);

/**
 * Admin Package Management
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

// Soft delete travel package
router.delete(
  "/:id",
  authenticate,
  authorize(
    USER_ROLES.ADMIN,
    USER_ROLES.SYSTEM_ADMIN
  ),
  packagesController.deletePackage
);

/**
 * Public Package Detail Route
 *
 * Keep generic parameter routes near the bottom so that
 * more specific routes can be declared above them.
 */

// Get travel package by ID
router.get(
  "/:id",
  packagesController.getPackageById
);

// Get travel package by slug
router.post(
  "/:packageId/itineraries",
  authenticate,
  authorize(
    USER_ROLES.ADMIN,
    USER_ROLES.SYSTEM_ADMIN
  ),
  validateRequest(createPackageItinerarySchema),
  packagesController.addPackageItinerary
);

router.patch(
  "/:packageId/itineraries/:itineraryId",
  authenticate,
  authorize(
    USER_ROLES.ADMIN,
    USER_ROLES.SYSTEM_ADMIN
  ),
  validateRequest(updatePackageItinerarySchema),
  packagesController.updatePackageItinerary
);

router.delete(
  "/:packageId/itineraries/:itineraryId",
  authenticate,
  authorize(
    USER_ROLES.ADMIN,
    USER_ROLES.SYSTEM_ADMIN
  ),
  packagesController.deletePackageItinerary
);

// Package Inclusions
router.post(
  "/:packageId/inclusions",
  authenticate,
  authorize(
    USER_ROLES.ADMIN,
    USER_ROLES.SYSTEM_ADMIN
  ),
  validateRequest(createPackageInclusionSchema),
  packagesController.addPackageInclusion
);

router.patch(
  "/:packageId/inclusions/:inclusionId",
  authenticate,
  authorize(
    USER_ROLES.ADMIN,
    USER_ROLES.SYSTEM_ADMIN
  ),
  validateRequest(updatePackageInclusionSchema),
  packagesController.updatePackageInclusion
);

router.delete(
  "/:packageId/inclusions/:inclusionId",
  authenticate,
  authorize(
    USER_ROLES.ADMIN,
    USER_ROLES.SYSTEM_ADMIN
  ),
  packagesController.deletePackageInclusion
);


router.post(
  "/:packageId/exclusions",
  authenticate,
  authorize(
    USER_ROLES.ADMIN,
    USER_ROLES.SYSTEM_ADMIN
  ),
  validateRequest(createPackageExclusionSchema),
  packagesController.addPackageExclusion
);

router.patch(
  "/:packageId/exclusions/:exclusionId",
  authenticate,
  authorize(
    USER_ROLES.ADMIN,
    USER_ROLES.SYSTEM_ADMIN
  ),
  validateRequest(updatePackageExclusionSchema),
  packagesController.updatePackageExclusion
);

router.delete(
  "/:packageId/exclusions/:exclusionId",
  authenticate,
  authorize(
    USER_ROLES.ADMIN,
    USER_ROLES.SYSTEM_ADMIN
  ),
  packagesController.deletePackageExclusion
);


// Package FAQs
router.post(
  "/:packageId/faqs",
  authenticate,
  authorize(
    USER_ROLES.ADMIN,
    USER_ROLES.SYSTEM_ADMIN
  ),
  validateRequest(createPackageFaqSchema),
  packagesController.addPackageFaq
);

router.patch(
  "/:packageId/faqs/:faqId",
  authenticate,
  authorize(
    USER_ROLES.ADMIN,
    USER_ROLES.SYSTEM_ADMIN
  ),
  validateRequest(updatePackageFaqSchema),
  packagesController.updatePackageFaq
);

router.delete(
  "/:packageId/faqs/:faqId",
  authenticate,
  authorize(
    USER_ROLES.ADMIN,
    USER_ROLES.SYSTEM_ADMIN
  ),
  packagesController.deletePackageFaq
);

module.exports = router;