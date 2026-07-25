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

// Package Itinerary Validation Schemas
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

module.exports = {
  createPackageSchema,
  updatePackageSchema,
  createPackageImageSchema,
  updatePackageImageSchema,
  createPackageItinerarySchema,
  updatePackageItinerarySchema,
};