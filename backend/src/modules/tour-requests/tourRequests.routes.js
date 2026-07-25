const express = require("express");

const tourRequestsController = require("./tourRequests.controller");

const authenticate = require("../../middlewares/authenticate");
const authorize = require("../../middlewares/authorize");
const validateRequest = require("../../middlewares/validateRequest");

const {
  USER_ROLES,
} = require("../../core/constants/auth.constants");

const {
  packageBasedTourRequestSchema,
  customTourRequestSchema,
} = require("./tourRequests.validation");

const router = express.Router();

router.post(
  "/package-based",
  authenticate,
  authorize(USER_ROLES.TOURIST),
  validateRequest(packageBasedTourRequestSchema),
  tourRequestsController.createPackageBasedRequest
);

router.post(
  "/custom",
  authenticate,
  authorize(USER_ROLES.TOURIST),
  validateRequest(customTourRequestSchema),
  tourRequestsController.createCustomRequest
);

router.get(
  "/me",
  authenticate,
  authorize(USER_ROLES.TOURIST),
  tourRequestsController.getMyTourRequests
);

router.get(
  "/:id",
  authenticate,
  authorize(USER_ROLES.TOURIST),
  tourRequestsController.getTourRequestById
);

module.exports = router;