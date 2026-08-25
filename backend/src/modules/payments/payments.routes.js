const express = require("express");

const paymentsController = require("./payments.controller");

const authenticate = require("../../middlewares/authenticate");

const authorize = require("../../middlewares/authorize");

const validateRequest = require("../../middlewares/validateRequest");

const { USER_ROLES } = require("../../core/constants/auth.constants");

const { createCheckoutSessionSchema } = require("./payments.validation");

const router = express.Router();

/**
 * =========================================================
 * Tourist - Stripe Checkout
 * =========================================================
 *
 * POST /api/payments/checkout-session
 *
 * Creates or reuses a local pending payment
 * and creates a Stripe Checkout Session.
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
 * Tourist - My Payments
 * =========================================================
 *
 * GET /api/payments/me
 */

router.get(
  "/me",
  authenticate,
  authorize(USER_ROLES.TOURIST),
  paymentsController.getMyPayments,
);

/**
 * =========================================================
 * Payment Details
 * =========================================================
 *
 * GET /api/payments/:id
 *
 * Ownership and admin authorization are checked
 * inside the payment service.
 */

router.get("/:id", authenticate, paymentsController.getPaymentById);

module.exports = router;