const Joi = require("joi");

const createPackageSchema = Joi.object({
  title: Joi.string().trim().min(3).max(150).required(),

  slug: Joi.string()
    .trim()
    .lowercase()
    .min(3)
    .max(180)
    .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .required(),

  destination: Joi.string().trim().min(2).max(100).required(),

  description: Joi.string().trim().min(10).required(),

  durationDays: Joi.number().integer().min(1).required(),

  price: Joi.number().positive().required(),

  status: Joi.string().valid("ACTIVE", "INACTIVE").default("ACTIVE"),
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
      "status",
    ],
    (schema) => schema.optional(),
  )
  .min(1)
  .required();

const createPackageImageSchema = Joi.object({
  imageUrl: Joi.string().uri().required(),

  altText: Joi.string().trim().max(255).allow(null, ""),

  isPrimary: Joi.boolean().default(false),

  displayOrder: Joi.number().integer().min(0).default(0),
}).required();

const updatePackageImageSchema = Joi.object({
  imageUrl: Joi.string().uri().optional(),

  altText: Joi.string().trim().max(255).allow(null, "").optional(),

  isPrimary: Joi.boolean().optional(),

  displayOrder: Joi.number().integer().min(0).optional(),
})
  .min(1)
  .required();

const createPackageItinerarySchema = Joi.object({
  dayNumber: Joi.number().integer().min(1).required(),

  title: Joi.string().trim().min(3).max(150).required(),

  description: Joi.string().trim().min(5).required(),
}).required();

const updatePackageItinerarySchema = Joi.object({
  dayNumber: Joi.number().integer().min(1).optional(),

  title: Joi.string().trim().min(3).max(150).optional(),

  description: Joi.string().trim().min(5).optional(),
})
  .min(1)
  .required();

const createPackageInclusionSchema = Joi.object({
  title: Joi.string().trim().min(2).max(255).required(),
}).required();

const updatePackageInclusionSchema = Joi.object({
  title: Joi.string().trim().min(2).max(255).required(),
}).required();

const createPackageExclusionSchema = Joi.object({
  title: Joi.string().trim().min(2).max(255).required(),
}).required();

const updatePackageExclusionSchema = Joi.object({
  title: Joi.string().trim().min(2).max(255).required(),
}).required();

const createPackageFaqSchema = Joi.object({
  question: Joi.string().trim().min(5).max(500).required(),

  answer: Joi.string().trim().min(5).required(),

  displayOrder: Joi.number().integer().min(0).default(0),
}).required();

const updatePackageFaqSchema = Joi.object({
  question: Joi.string().trim().min(5).max(500).optional(),

  answer: Joi.string().trim().min(5).optional(),

  displayOrder: Joi.number().integer().min(0).optional(),
})
  .min(1)
  .required();

module.exports = {
  createPackageSchema,
  updatePackageSchema,

  createPackageImageSchema,
  updatePackageImageSchema,

  createPackageItinerarySchema,
  updatePackageItinerarySchema,

  createPackageInclusionSchema,
  updatePackageInclusionSchema,

  createPackageExclusionSchema,
  updatePackageExclusionSchema,

  createPackageFaqSchema,
  updatePackageFaqSchema,
};