const Joi = require("joi");

const updateBookingStatusSchema = Joi.object({
  status: Joi.string()
    .valid("CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED")
    .required(),
}).required();

module.exports = {
  updateBookingStatusSchema,
};