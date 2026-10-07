const Joi = require("joi");

/**
 * =========================================================
 * Stripe Checkout
 * =========================================================
 *
 * Validates creation of a Stripe Checkout Session.
 */

const createCheckoutSessionSchema = Joi.object({
  quotationId: Joi.string().uuid().required(),
}).required();

module.exports = {
  createCheckoutSessionSchema,
};