const Joi = require("joi");

/**
 * =========================================================
 * Create Guide Review
 * =========================================================
 */

const createGuideReviewSchema = Joi.object({
  bookingId: Joi.string().uuid().required(),

  rating: Joi.number().integer().min(1).max(5).required(),

  comment: Joi.string().trim().max(2000).allow(null, "").optional(),
}).required();

module.exports = {
  createGuideReviewSchema,
};