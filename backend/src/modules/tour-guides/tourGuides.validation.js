const Joi = require("joi");

const createTourGuideSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(100).required(),
  lastName: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().lowercase().email().max(255).required(),
  phone: Joi.string().trim().max(30).allow(null, ""),

  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/[a-z]/)
    .pattern(/[A-Z]/)
    .pattern(/[0-9]/)
    .required(),

  bio: Joi.string().trim().allow(null, ""),
  experienceYears: Joi.number().integer().min(0).default(0),

  languages: Joi.array()
    .items(Joi.string().trim().min(2).max(50))
    .min(1)
    .required(),

  specializations: Joi.array()
    .items(Joi.string().trim().min(2).max(100))
    .default([]),

  location: Joi.string().trim().max(150).allow(null, ""),

  dailyRate: Joi.number().positive().allow(null),

  isAvailable: Joi.boolean().default(true),
}).required();

const updateTourGuideSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(100).optional(),
  lastName: Joi.string().trim().min(2).max(100).optional(),
  phone: Joi.string().trim().max(30).allow(null, "").optional(),

  bio: Joi.string().trim().allow(null, "").optional(),

  experienceYears: Joi.number().integer().min(0).optional(),

  languages: Joi.array()
    .items(Joi.string().trim().min(2).max(50))
    .min(1)
    .optional(),

  specializations: Joi.array()
    .items(Joi.string().trim().min(2).max(100))
    .optional(),

  location: Joi.string().trim().max(150).allow(null, "").optional(),

  dailyRate: Joi.number().positive().allow(null).optional(),
})
  .min(1)
  .required();

const updateTourGuideAvailabilitySchema = Joi.object({
  isAvailable: Joi.boolean().required(),
}).required();

module.exports = {
  createTourGuideSchema,
  updateTourGuideSchema,
  updateTourGuideAvailabilitySchema,
};
