const Joi = require("joi");

/**
 * =========================================================
 * Create Guide
 * =========================================================
 */

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

  bio: Joi.string().trim().max(5000).allow(null, ""),

  experienceYears: Joi.number().integer().min(0).max(80).default(0),

  languages: Joi.array()
    .items(Joi.string().trim().min(2).max(50))
    .min(1)
    .required(),

  specializations: Joi.array()
    .items(Joi.string().trim().min(2).max(100))
    .default([]),

  location: Joi.string().trim().max(150).allow(null, ""),

  dailyRate: Joi.number().positive().precision(2).allow(null),

  isAvailable: Joi.boolean().default(true),
}).required();

/**
 * =========================================================
 * Update Guide
 * =========================================================
 */

const updateTourGuideSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(100).optional(),

  lastName: Joi.string().trim().min(2).max(100).optional(),

  phone: Joi.string().trim().max(30).allow(null, "").optional(),

  bio: Joi.string().trim().max(5000).allow(null, "").optional(),

  experienceYears: Joi.number().integer().min(0).max(80).optional(),

  languages: Joi.array()
    .items(Joi.string().trim().min(2).max(50))
    .min(1)
    .optional(),

  specializations: Joi.array()
    .items(Joi.string().trim().min(2).max(100))
    .optional(),

  location: Joi.string().trim().max(150).allow(null, "").optional(),

  dailyRate: Joi.number().positive().precision(2).allow(null).optional(),
})
  .min(1)
  .required();

/**
 * =========================================================
 * Availability
 * =========================================================
 */

const updateTourGuideAvailabilitySchema = Joi.object({
  isAvailable: Joi.boolean().required(),
}).required();

module.exports = {
  createTourGuideSchema,

  updateTourGuideSchema,

  updateTourGuideAvailabilitySchema,
};