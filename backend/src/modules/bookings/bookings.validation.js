const Joi = require("joi");

/**
 * =========================================================
 * Booking Status
 * =========================================================
 */

/*
 * Admins can only cancel here (CR-032): IN_PROGRESS and COMPLETED
 * need the traveler's confirmation code via the guide endpoints.
 */
const updateBookingStatusSchema = Joi.object({
  status: Joi.string().valid("CANCELLED").required(),
}).required();

/**
 * =========================================================
 * Lifecycle Confirmation Codes (CR-032)
 * =========================================================
 */

const createLifecycleChallengeSchema = Joi.object({
  action: Joi.string().valid("START", "COMPLETE").required(),
}).required();

/*
 * Custom messages: Joi's default pattern message would echo the
 * submitted value, and validation errors are returned and logged.
 */
const CODE_MESSAGE = "Enter the 6-digit confirmation code";

const verifyLifecycleCodeSchema = Joi.object({
  code: Joi.string()
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      "any.required": CODE_MESSAGE,
      "string.base": CODE_MESSAGE,
      "string.empty": CODE_MESSAGE,
      "string.pattern.base": CODE_MESSAGE,
    }),
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
  createLifecycleChallengeSchema,
  verifyLifecycleCodeSchema,
};