const Joi = require("joi");

const createPackageSchema = Joi.object({
  title: Joi.string().min(3).max(150).required(),
  slug: Joi.string().min(3).max(180).required(),
  destination: Joi.string().min(2).max(100).required(),
  description: Joi.string().min(10).required(),
  durationDays: Joi.number().integer().min(1).required(),
  price: Joi.number().positive().required(),
  status: Joi.string().valid("ACTIVE", "INACTIVE").optional(),
}).required();

const updatePackageSchema = createPackageSchema
  .fork(
    [
      "title",
      "slug",
      "destination",
      "description",
      "durationDays",
      "price",
    ],
    (schema) => schema.optional(),
  )
  .required();

  const createPackageImageSchema = Joi.object({
  imageUrl: Joi.string().uri().required(),
  altText: Joi.string().max(255).allow(null, ""),
  isPrimary: Joi.boolean().optional(),
  displayOrder: Joi.number().integer().min(0).optional(),
}).required();

const updatePackageImageSchema = Joi.object({
  imageUrl: Joi.string().uri().optional(),
  altText: Joi.string().max(255).allow(null, ""),
  isPrimary: Joi.boolean().optional(),
  displayOrder: Joi.number().integer().min(0).optional(),
})
  .min(1)
  .required();

module.exports = {
  createPackageSchema,
  updatePackageSchema,
  createPackageImageSchema,
  updatePackageImageSchema,
};