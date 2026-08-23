const Joi = require("joi");

/**
 * =========================================================
 * Legacy / Local Payment Initiation
 * =========================================================
 *
 * We will keep this temporarily while
 * transitioning to Stripe.
 */

const initiatePaymentSchema = Joi.object({
  quotationId: Joi.string().uuid().required(),

  paymentMethod: Joi.string()
    .valid("CARD", "BANK_TRANSFER", "CASH", "OTHER")
    .required(),
}).required();

/**
 * =========================================================
 * Stripe Checkout
 * =========================================================
 */

const createCheckoutSessionSchema = Joi.object({
  quotationId: Joi.string().uuid().required(),
}).required();

/**
 * =========================================================
 * Temporary Payment Success
 * =========================================================
 */

const paymentSuccessSchema = Joi.object({
  gatewayReference: Joi.string().trim().max(255).required(),
}).required();

/**
 * =========================================================
 * Temporary Payment Failure
 * =========================================================
 */

const paymentFailureSchema = Joi.object({
  gatewayReference: Joi.string().trim().max(255).allow(null, "").optional(),

  failureReason: Joi.string().trim().max(1000).required(),
}).required();

module.exports = {
  initiatePaymentSchema,

  createCheckoutSessionSchema,

  paymentSuccessSchema,

  paymentFailureSchema,
};