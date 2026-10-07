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
 * Money
 * =========================================================
 *
 * Monetary columns are NUMERIC(12,2). Values with more than two
 * decimal places are REJECTED (not rounded): PostgreSQL would
 * round them on write, so the server-side pricing check and the
 * stored row could disagree. The maximum is the largest value
 * NUMERIC(12,2) can hold.
 */

const MONEY_MAX = 9999999999.99;

// The sign is left to .positive()/.min(0) so they report it.
const TWO_DECIMAL_PATTERN = /^-?\d+(\.\d{1,2})?$/;

const money = () =>
  Joi.number()
    .max(MONEY_MAX)
    .custom((value, helpers) => {
      return TWO_DECIMAL_PATTERN.test(String(value))
        ? value
        : helpers.error("number.precision", {
            limit: 2,
          });
    }, "two decimal places");

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

  subtotal: money().positive().required(),

  discountAmount: money().min(0).default(0),

  taxAmount: money().min(0).default(0),

  totalAmount: money().positive().required(),

  currency: Joi.string().trim().uppercase().max(10).default("USD"),

  notes: Joi.string().trim().allow(null, ""),

  termsConditions: Joi.string().trim().allow(null, ""),

  validUntil: Joi.date().iso().allow(null),

  itineraries: Joi.array()
    .items(itineraryItemSchema)
    .unique("dayNumber")
    .default([]),

  inclusions: Joi.array()
    .items(Joi.string().trim().min(2).max(255))
    .default([]),

  exclusions: Joi.array()
    .items(Joi.string().trim().min(2).max(255))
    .default([]),
}).required();

/**
 * =========================================================
 * Quotation Changes (update / revision)
 * =========================================================
 *
 * Deliberately NOT derived from createQuotationSchema: its
 * `.default()`s would be injected into partial bodies by
 * validateRequest and silently overwrite stored values (and
 * wipe child collections). Omitted keys stay omitted; the
 * service merges them with the stored quotation and validates
 * dates/pricing against the merged result.
 */

const quotationChangeKeys = {
  guideId: Joi.string().uuid().allow(null),

  title: Joi.string().trim().min(3).max(200),

  description: Joi.string().trim().allow(null, ""),

  startDate: Joi.date().iso(),

  endDate: Joi.date().iso(),

  adultCount: Joi.number().integer().min(1),

  childCount: Joi.number().integer().min(0),

  subtotal: money().positive(),

  discountAmount: money().min(0),

  taxAmount: money().min(0),

  totalAmount: money().positive(),

  currency: Joi.string().trim().uppercase().max(10),

  notes: Joi.string().trim().allow(null, ""),

  termsConditions: Joi.string().trim().allow(null, ""),

  validUntil: Joi.date().iso().allow(null),

  itineraries: Joi.array().items(itineraryItemSchema).unique("dayNumber"),

  inclusions: Joi.array().items(Joi.string().trim().min(2).max(255)),

  exclusions: Joi.array().items(Joi.string().trim().min(2).max(255)),
};

/**
 * Update Draft Quotation -- at least one change is required.
 */
const updateQuotationSchema = Joi.object(quotationChangeKeys)
  .min(1)
  .required();

/**
 * Create Revision -- an empty body is valid and means "revise
 * with the source quotation's content unchanged".
 */
const reviseQuotationSchema = Joi.object(quotationChangeKeys).required();

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

  reviseQuotationSchema,

  rejectQuotationSchema,
};