const express = require("express");

const tourGuidesController =
  require("./tourGuides.controller");

const authenticate =
  require("../../middlewares/authenticate");

const authorize =
  require("../../middlewares/authorize");

const validateRequest =
  require("../../middlewares/validateRequest");

const {
  USER_ROLES,
} = require("../../core/constants/auth.constants");

const {
  createTourGuideSchema,
  updateTourGuideSchema,
  updateTourGuideAvailabilitySchema
} = require("./tourGuides.validation");

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorize(
    USER_ROLES.ADMIN,
    USER_ROLES.SYSTEM_ADMIN
  ),
  validateRequest(createTourGuideSchema),
  tourGuidesController.createTourGuide
);


// Public routes for fetching tour guides
router.get(
  "/",
  tourGuidesController.getAllTourGuides
);

router.get(
  "/:id",
  tourGuidesController.getTourGuideById
);

router.patch(
  "/:id",
  authenticate,
  authorize(
    USER_ROLES.ADMIN,
    USER_ROLES.SYSTEM_ADMIN
  ),
  validateRequest(updateTourGuideSchema),
  tourGuidesController.updateTourGuide
);

router.patch(
  "/:id/availability",
  authenticate,
  authorize(
    USER_ROLES.ADMIN,
    USER_ROLES.SYSTEM_ADMIN
  ),
  validateRequest(updateTourGuideAvailabilitySchema),
  tourGuidesController.updateTourGuideAvailability
);

router.delete(
  "/:id",
  authenticate,
  authorize(
    USER_ROLES.ADMIN,
    USER_ROLES.SYSTEM_ADMIN
  ),
  tourGuidesController.deleteTourGuide
);
module.exports = router;