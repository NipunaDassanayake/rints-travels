const Joi = require("joi");

/**
 * =========================================================
 * Quotation Itinerary
 * =========================================================
 */

const itineraryItemSchema = Joi.object({
  dayNumber: Joi.number().integer().min(1).required(),

  title: Joi.string().trim().min(3).max(200).required(),

  description: Joi.string().trim().min(5).required(),
});

/**
 * =========================================================
 * Create Quotation
 * =========================================================
 */

const createQuotationSchema = Joi.object({
  guideId: Joi.string().uuid().allow(null),

  title: Joi.string().trim().min(3).max(200).required(),

  description: Joi.string().trim().allow(null, ""),

  startDate: Joi.date().iso().required(),

  endDate: Joi.date().iso().min(Joi.ref("startDate")).required(),

  adultCount: Joi.number().integer().min(1).required(),

  childCount: Joi.number().integer().min(0).default(0),

  subtotal: Joi.number().positive().required(),

  discountAmount: Joi.number().min(0).default(0),

  taxAmount: Joi.number().min(0).default(0),

  totalAmount: Joi.number().positive().required(),

  currency: Joi.string().trim().uppercase().max(10).default("USD"),

  notes: Joi.string().trim().allow(null, ""),

  termsConditions: Joi.string().trim().allow(null, ""),

  validUntil: Joi.date().iso().allow(null),

  itineraries: Joi.array().items(itineraryItemSchema).default([]),

  inclusions: Joi.array()
    .items(Joi.string().trim().min(2).max(255))
    .default([]),

  exclusions: Joi.array()
    .items(Joi.string().trim().min(2).max(255))
    .default([]),
}).required();

/**
 * =========================================================
 * Update Quotation
 * =========================================================
 *
 * Only DRAFT quotations can be updated.
 */

const updateQuotationSchema = createQuotationSchema
  .fork(
    ["title", "startDate", "endDate", "adultCount", "subtotal", "totalAmount"],
    (schema) => schema.optional(),
  )
  .min(1)
  .required();

/**
 * =========================================================
 * Reject Quotation
 * =========================================================
 */

const rejectQuotationSchema = Joi.object({
  reason: Joi.string().trim().max(1000).allow(null, ""),
}).required();

module.exports = {
  createQuotationSchema,
  updateQuotationSchema,
  rejectQuotationSchema,
};