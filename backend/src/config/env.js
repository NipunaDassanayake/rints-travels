require("dotenv").config();

const Joi = require("joi");

const envSchema = Joi.object({
  PORT: Joi.number().default(5000),
  NODE_ENV: Joi.string()
    .valid("development", "test", "production")
    .default("development"),
  DATABASE_URL: Joi.string().required(),
}).unknown(true);

const { value, error } = envSchema.validate(process.env, {
  abortEarly: false,
});

if (error) {
  throw new Error(`Environment validation failed: ${error.message}`);
}

const env = {
  port: value.PORT,
  nodeEnv: value.NODE_ENV,
  databaseUrl: value.DATABASE_URL,
};

module.exports = env;