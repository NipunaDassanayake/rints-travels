const Joi = require("joi");

const createPackageSchema = Joi.object({
  title: Joi.string().min(3).max(150).required(),
  slug: Joi.string().min(3).max(180).required(),
  destination: Joi.string().min(2).max(100).required(),
  description: Joi.string().min(10).required(),
  durationDays: Joi.number().integer().min(1).required(),
  price: Joi.number().positive().required(),
  status: Joi.string().valid("ACTIVE", "INACTIVE").optional(),
});

const updatePackageSchema = createPackageSchema.fork(
  ["title", "slug", "destination", "description", "durationDays", "price"],
  (schema) => schema.optional()
);

module.exports = {
  createPackageSchema,
  updatePackageSchema,
};