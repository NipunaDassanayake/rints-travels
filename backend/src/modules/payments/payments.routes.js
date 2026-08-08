const express = require("express");

const paymentsController =
  require("./payments.controller");

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
  initiatePaymentSchema,
  paymentSuccessSchema,
  paymentFailureSchema,
} = require("./payments.validation");

const router = express.Router();

/**
 * Tourist routes
 */

router.post(
  "/initiate",
  authenticate,
  authorize(USER_ROLES.TOURIST),
  validateRequest(initiatePaymentSchema),
  paymentsController.initiatePayment
);

router.get(
  "/me",
  authenticate,
  authorize(USER_ROLES.TOURIST),
  paymentsController.getMyPayments
);

/**
 * Temporary gateway simulation routes.
 *
 * In production these should be authenticated
 * gateway webhook endpoints with signature verification.
 */

router.post(
  "/:id/success",
  authenticate,
  authorize(
    USER_ROLES.ADMIN,
    USER_ROLES.SYSTEM_ADMIN
  ),
  validateRequest(paymentSuccessSchema),
  paymentsController.markPaymentSuccessful
);

router.post(
  "/:id/fail",
  authenticate,
  authorize(
    USER_ROLES.ADMIN,
    USER_ROLES.SYSTEM_ADMIN
  ),
  validateRequest(paymentFailureSchema),
  paymentsController.markPaymentFailed
);

/**
 * Payment details
 */

router.get(
  "/:id",
  authenticate,
  paymentsController.getPaymentById
);

module.exports = router;