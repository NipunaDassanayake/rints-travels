const express = require("express");

const paymentsController = require("./payments.controller");

const authenticate = require("../../middlewares/authenticate");

const authorize = require("../../middlewares/authorize");

const validateRequest = require("../../middlewares/validateRequest");

const { USER_ROLES } = require("../../core/constants/auth.constants");

const {
  initiatePaymentSchema,
  createCheckoutSessionSchema,
  paymentSuccessSchema,
  paymentFailureSchema,
} = require("./payments.validation");

const router = express.Router();

/**
 * =========================================================
 * Tourist - Stripe Checkout
 * =========================================================
 *
 * POST /api/payments/checkout-session
 */

router.post(
  "/checkout-session",

  authenticate,

  authorize(USER_ROLES.TOURIST),

  validateRequest(createCheckoutSessionSchema),

  paymentsController.createCheckoutSession,
);

/**
 * =========================================================
 * Tourist - Legacy Payment Initiation
 * =========================================================
 *
 * Temporary.
 *
 * We will remove this after Stripe is fully
 * connected to the frontend.
 */

router.post(
  "/initiate",

  authenticate,

  authorize(USER_ROLES.TOURIST),

  validateRequest(initiatePaymentSchema),

  paymentsController.initiatePayment,
);

/**
 * =========================================================
 * Tourist - My Payments
 * =========================================================
 */

router.get(
  "/me",

  authenticate,

  authorize(USER_ROLES.TOURIST),

  paymentsController.getMyPayments,
);

/**
 * =========================================================
 * Temporary Gateway Simulation
 * =========================================================
 *
 * These will be removed after the Stripe webhook
 * has been fully tested.
 */

router.post(
  "/:id/success",

  authenticate,

  authorize(USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN),

  validateRequest(paymentSuccessSchema),

  paymentsController.markPaymentSuccessful,
);

router.post(
  "/:id/fail",

  authenticate,

  authorize(USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN),

  validateRequest(paymentFailureSchema),

  paymentsController.markPaymentFailed,
);

/**
 * =========================================================
 * Payment Details
 * =========================================================
 */

router.get(
  "/:id",

  authenticate,

  paymentsController.getPaymentById,
);

module.exports = router;