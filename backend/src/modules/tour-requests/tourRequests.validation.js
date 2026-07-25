const Joi = require("joi");

const packageBasedTourRequestSchema = Joi.object({
  packageId: Joi.number().integer().positive().required(),

  preferredStartDate: Joi.date().iso().required(),
  preferredEndDate: Joi.date()
    .iso()
    .min(Joi.ref("preferredStartDate"))
    .allow(null),

  adultCount: Joi.number().integer().min(1).required(),
  childCount: Joi.number().integer().min(0).default(0),

  budget: Joi.number().positive().allow(null),
  currency: Joi.string().trim().uppercase().max(10).default("USD"),

  preferredGuideId: Joi.string().uuid().allow(null),

  hotelPreference: Joi.string().trim().max(100).allow(null, ""),
  transportPreference: Joi.string().trim().max(100).allow(null, ""),

  specialRequirements: Joi.string().trim().allow(null, ""),

  contactMethod: Joi.string()
    .valid("WHATSAPP", "PHONE", "EMAIL")
    .allow(null),
}).required();

const customTourRequestSchema = Joi.object({
  title: Joi.string().trim().min(3).max(200).required(),

  preferredStartDate: Joi.date().iso().required(),
  preferredEndDate: Joi.date()
    .iso()
    .min(Joi.ref("preferredStartDate"))
    .allow(null),

  adultCount: Joi.number().integer().min(1).required(),
  childCount: Joi.number().integer().min(0).default(0),

  destinationPreferences: Joi.string().trim().min(2).required(),

  budget: Joi.number().positive().allow(null),
  currency: Joi.string().trim().uppercase().max(10).default("USD"),

  preferredGuideId: Joi.string().uuid().allow(null),

  hotelPreference: Joi.string().trim().max(100).allow(null, ""),
  transportPreference: Joi.string().trim().max(100).allow(null, ""),

  specialRequirements: Joi.string().trim().allow(null, ""),

  contactMethod: Joi.string()
    .valid("WHATSAPP", "PHONE", "EMAIL")
    .allow(null),
}).required();


// 
const assignAdminSchema = Joi.object({
  adminId: Joi.string().uuid().required(),
}).required();

const updateTourRequestStatusSchema = Joi.object({
  status: Joi.string()
    .valid(
      "PENDING_REVIEW",
      "UNDER_DISCUSSION",
      "READY_FOR_QUOTATION",
      "QUOTATION_SENT",
      "ACCEPTED",
      "REJECTED",
      "CANCELLED",
      "BOOKED"
    )
    .required(),
}).required();

module.exports = {
  packageBasedTourRequestSchema,
  customTourRequestSchema,
  assignAdminSchema,
  updateTourRequestStatusSchema,
};