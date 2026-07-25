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

module.exports = router;