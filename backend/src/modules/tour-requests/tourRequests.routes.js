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
  assignAdminSchema,
  updateTourRequestStatusSchema
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

router.get(
  "/",
  authenticate,
  authorize(
    USER_ROLES.ADMIN,
    USER_ROLES.SYSTEM_ADMIN
  ),
  tourRequestsController.getAllTourRequests
);

router.patch(
  "/:id/assign-admin",
  authenticate,
  authorize(
    USER_ROLES.ADMIN,
    USER_ROLES.SYSTEM_ADMIN
  ),
  validateRequest(assignAdminSchema),
  tourRequestsController.assignAdmin
);

router.patch(
  "/:id/status",
  authenticate,
  authorize(
    USER_ROLES.ADMIN,
    USER_ROLES.SYSTEM_ADMIN
  ),
  validateRequest(updateTourRequestStatusSchema),
  tourRequestsController.updateStatus
);

module.exports = router;