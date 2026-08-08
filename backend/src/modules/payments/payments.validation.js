const Joi = require("joi");

const initiatePaymentSchema = Joi.object({
  quotationId: Joi.string().uuid().required(),

  paymentMethod: Joi.string()
    .valid(
      "CARD",
      "BANK_TRANSFER",
      "CASH",
      "OTHER"
    )
    .required(),
}).required();

const paymentSuccessSchema = Joi.object({
  gatewayReference: Joi.string()
    .trim()
    .max(255)
    .required(),
}).required();

const paymentFailureSchema = Joi.object({
  gatewayReference: Joi.string()
    .trim()
    .max(255)
    .allow(null, "")
    .optional(),

  failureReason: Joi.string()
    .trim()
    .max(1000)
    .required(),
}).required();

module.exports = {
  initiatePaymentSchema,
  paymentSuccessSchema,
  paymentFailureSchema,
};