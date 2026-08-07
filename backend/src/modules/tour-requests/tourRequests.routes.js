const express = require("express");

const tourRequestsController = require("./tourRequests.controller");
const quotationsController = require("../quotations/quotations.controller");

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
  updateTourRequestStatusSchema,
  adminEditTourRequestSchema,
} = require("./tourRequests.validation");

const {
  createQuotationSchema,
} = require("../quotations/quotations.validation");

const router = express.Router();

/**
 * Tourist - Create requests
 */

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

/**
 * Tourist - Own requests
 */

router.get(
  "/me",
  authenticate,
  authorize(USER_ROLES.TOURIST),
  tourRequestsController.getMyTourRequests
);

/**
 * Quotations linked to a tour request
 */

router.post(
  "/:tourRequestId/quotations",
  authenticate,
  authorize(
    USER_ROLES.ADMIN,
    USER_ROLES.SYSTEM_ADMIN
  ),
  validateRequest(createQuotationSchema),
  quotationsController.createQuotation
);

router.get(
  "/:tourRequestId/quotations",
  authenticate,
  quotationsController.getTourRequestQuotations
);

/**
 * Admin - Tour Request management
 */

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

router.patch(
  "/:id/admin-edit",
  authenticate,
  authorize(
    USER_ROLES.ADMIN,
    USER_ROLES.SYSTEM_ADMIN
  ),
  validateRequest(adminEditTourRequestSchema),
  tourRequestsController.adminEditTourRequest
);

/**
 * Tourist owner or Admin - Request details
 */

router.get(
  "/:id",
  authenticate,
  authorize(
    USER_ROLES.TOURIST,
    USER_ROLES.ADMIN,
    USER_ROLES.SYSTEM_ADMIN
  ),
  tourRequestsController.getTourRequestById
);

module.exports = router;