const express = require("express");

const quotationsController = require("./quotations.controller");

const authenticate = require("../../middlewares/authenticate");

const authorize = require("../../middlewares/authorize");

const validateRequest = require("../../middlewares/validateRequest");

const { USER_ROLES } = require("../../core/constants/auth.constants");

const {
  createQuotationSchema,
  updateQuotationSchema,
  rejectQuotationSchema,
} = require("./quotations.validation");

const router = express.Router();

/**
 * =========================================================
 * Tourist - My Quotations
 * =========================================================
 *
 * GET /api/quotations/me
 *
 * IMPORTANT:
 * Keep this before /:id
 */

router.get(
  "/me",
  authenticate,
  authorize(USER_ROLES.TOURIST),
  quotationsController.getMyQuotations,
);

/**
 * =========================================================
 * Tour Request Quotations
 * =========================================================
 */

/**
 * Admin - Create quotation for tour request
 *
 * POST /api/quotations/tour-request/:tourRequestId
 */
router.post(
  "/tour-request/:tourRequestId",
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN),
  validateRequest(createQuotationSchema),
  quotationsController.createQuotation,
);

/**
 * Tourist/Admin - Get quotations belonging to a tour request
 *
 * Ownership/role permission is checked inside the service.
 *
 * GET /api/quotations/tour-request/:tourRequestId
 */
router.get(
  "/tour-request/:tourRequestId",
  authenticate,
  quotationsController.getTourRequestQuotations,
);

/**
 * =========================================================
 * Individual Quotation Routes
 * =========================================================
 */

/**
 * Tourist/Admin - Get quotation by ID
 *
 * GET /api/quotations/:id
 */
router.get("/:id", authenticate, quotationsController.getQuotationById);

/**
 * Admin - Update draft quotation
 *
 * PATCH /api/quotations/:id
 */
router.patch(
  "/:id",
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN),
  validateRequest(updateQuotationSchema),
  quotationsController.updateQuotation,
);

/**
 * Admin - Send quotation to tourist
 *
 * POST /api/quotations/:id/send
 */
router.post(
  "/:id/send",
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN),
  quotationsController.sendQuotation,
);

/**
 * Tourist - Accept quotation
 *
 * POST /api/quotations/:id/accept
 */
router.post(
  "/:id/accept",
  authenticate,
  authorize(USER_ROLES.TOURIST),
  quotationsController.acceptQuotation,
);

/**
 * Tourist - Reject quotation
 *
 * POST /api/quotations/:id/reject
 */
router.post(
  "/:id/reject",
  authenticate,
  authorize(USER_ROLES.TOURIST),
  validateRequest(rejectQuotationSchema),
  quotationsController.rejectQuotation,
);

/**
 * Admin - Create quotation revision
 *
 * POST /api/quotations/:id/revisions
 */
router.post(
  "/:id/revisions",
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN),
  validateRequest(updateQuotationSchema),
  quotationsController.createRevision,
);

module.exports = router;