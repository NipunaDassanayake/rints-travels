const Joi = require("joi");

const registerSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(100).required(),
  lastName: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().lowercase().email().max(255).required(),
  phone: Joi.string().trim().max(30).allow(null, ""),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/[a-z]/, "lowercase letter")
    .pattern(/[A-Z]/, "uppercase letter")
    .pattern(/[0-9]/, "number")
    .required(),
});

const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().max(255).required(),
  password: Joi.string().min(1).max(128).required(),
});

module.exports = {
  registerSchema,
  loginSchema,
};