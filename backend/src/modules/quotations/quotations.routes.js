const express = require("express");

const quotationsController =
  require("./quotations.controller");

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
  updateQuotationSchema,
  rejectQuotationSchema,
} = require("./quotations.validation");

const router = express.Router();

router.get(
  "/:id",
  authenticate,
  quotationsController.getQuotationById
);

router.patch(
  "/:id",
  authenticate,
  authorize(
    USER_ROLES.ADMIN,
    USER_ROLES.SYSTEM_ADMIN
  ),
  validateRequest(updateQuotationSchema),
  quotationsController.updateQuotation
);

router.post(
  "/:id/send",
  authenticate,
  authorize(
    USER_ROLES.ADMIN,
    USER_ROLES.SYSTEM_ADMIN
  ),
  quotationsController.sendQuotation
);

router.post(
  "/:id/accept",
  authenticate,
  authorize(USER_ROLES.TOURIST),
  quotationsController.acceptQuotation
);

router.post(
  "/:id/reject",
  authenticate,
  authorize(USER_ROLES.TOURIST),
  validateRequest(rejectQuotationSchema),
  quotationsController.rejectQuotation
);

module.exports = router;