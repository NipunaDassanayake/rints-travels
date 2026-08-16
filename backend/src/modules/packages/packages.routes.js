const express = require("express");

const packagesController = require("./packages.controller");

const validateRequest = require("../../middlewares/validateRequest");

const authenticate = require("../../middlewares/authenticate");

const authorize = require("../../middlewares/authorize");

const uploadPackageImage = require("../../middlewares/uploadPackageImage");

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

const { USER_ROLES } = require("../../core/constants/auth.constants");

const router = express.Router();

/**
 * =========================================================
 * Public Package Routes
 * =========================================================
 */

/**
 * Public - Get active travel packages
 */
router.get("/", packagesController.getAllPackages);

/**
 * Public - Get package by slug
 *
 * Keep this before the generic /:id route.
 */
router.get("/slug/:slug", packagesController.getPackageBySlug);

/**
 * =========================================================
 * Admin Package Management
 * =========================================================
 */

/**
 * Admin - Get all packages
 *
 * Includes ACTIVE and INACTIVE packages.
 * Soft-deleted packages remain excluded.
 */
router.get(
  "/admin",
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN),
  packagesController.getAllPackagesAdmin,
);

/**
 * Admin - Create package
 */
router.post(
  "/",
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN),
  validateRequest(createPackageSchema),
  packagesController.createPackage,
);

/**
 * Admin - Update package
 */
router.put(
  "/:id",
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN),
  validateRequest(updatePackageSchema),
  packagesController.updatePackage,
);

/**
 * Admin - Soft delete package
 */
router.delete(
  "/:id",
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN),
  packagesController.deletePackage,
);

/**
 * =========================================================
 * Package Image Management
 * =========================================================
 */

/**
 * Admin - Upload package image from PC
 *
 * multipart/form-data
 *
 * Fields:
 * image        -> file
 * altText      -> optional string
 * isPrimary    -> optional boolean-like string
 * displayOrder -> optional number-like string
 */
router.post(
  "/:packageId/images/upload",
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN),
  uploadPackageImage.single("image"),
  packagesController.uploadPackageImage,
);

/**
 * Admin - Add package image using image URL
 *
 * We can keep this temporarily.
 * Later, if you want, we can remove it completely
 * and support uploads only.
 */
router.post(
  "/:packageId/images",
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN),
  validateRequest(createPackageImageSchema),
  packagesController.addPackageImage,
);

/**
 * Admin - Update package image metadata
 */
router.patch(
  "/:packageId/images/:imageId",
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN),
  validateRequest(updatePackageImageSchema),
  packagesController.updatePackageImage,
);

/**
 * Admin - Delete package image
 */
router.delete(
  "/:packageId/images/:imageId",
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN),
  packagesController.deletePackageImage,
);

/**
 * =========================================================
 * Package Itinerary Management
 * =========================================================
 */

/**
 * Admin - Add itinerary item
 */
router.post(
  "/:packageId/itineraries",
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN),
  validateRequest(createPackageItinerarySchema),
  packagesController.addPackageItinerary,
);

/**
 * Admin - Update itinerary item
 */
router.patch(
  "/:packageId/itineraries/:itineraryId",
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN),
  validateRequest(updatePackageItinerarySchema),
  packagesController.updatePackageItinerary,
);

/**
 * Admin - Delete itinerary item
 */
router.delete(
  "/:packageId/itineraries/:itineraryId",
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN),
  packagesController.deletePackageItinerary,
);

/**
 * =========================================================
 * Package Inclusion Management
 * =========================================================
 */

router.post(
  "/:packageId/inclusions",
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN),
  validateRequest(createPackageInclusionSchema),
  packagesController.addPackageInclusion,
);

router.patch(
  "/:packageId/inclusions/:inclusionId",
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN),
  validateRequest(updatePackageInclusionSchema),
  packagesController.updatePackageInclusion,
);

router.delete(
  "/:packageId/inclusions/:inclusionId",
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN),
  packagesController.deletePackageInclusion,
);

/**
 * =========================================================
 * Package Exclusion Management
 * =========================================================
 */

router.post(
  "/:packageId/exclusions",
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN),
  validateRequest(createPackageExclusionSchema),
  packagesController.addPackageExclusion,
);

router.patch(
  "/:packageId/exclusions/:exclusionId",
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN),
  validateRequest(updatePackageExclusionSchema),
  packagesController.updatePackageExclusion,
);

router.delete(
  "/:packageId/exclusions/:exclusionId",
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN),
  packagesController.deletePackageExclusion,
);

/**
 * =========================================================
 * Package FAQ Management
 * =========================================================
 */

router.post(
  "/:packageId/faqs",
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN),
  validateRequest(createPackageFaqSchema),
  packagesController.addPackageFaq,
);

router.patch(
  "/:packageId/faqs/:faqId",
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN),
  validateRequest(updatePackageFaqSchema),
  packagesController.updatePackageFaq,
);

router.delete(
  "/:packageId/faqs/:faqId",
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN),
  packagesController.deletePackageFaq,
);

/**
 * =========================================================
 * Generic Public Detail Route
 * =========================================================
 */

/**
 * Public - Get package by ID
 *
 * Keep the generic /:id route near the bottom.
 */
router.get("/:id", packagesController.getPackageById);

module.exports = router;