const Joi = require("joi");

/**
 * =========================================================
 * Booking Status
 * =========================================================
 */

const updateBookingStatusSchema = Joi.object({
  status: Joi.string()
    .valid("CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED")
    .required(),
}).required();

/**
 * =========================================================
 * Guide Assignment
 * =========================================================
 */

const assignBookingGuideSchema = Joi.object({
  guideId: Joi.string().uuid().required(),
}).required();

module.exports = {
  updateBookingStatusSchema,
  assignBookingGuideSchema,
};