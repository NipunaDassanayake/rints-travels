require("dotenv").config();

//joi is used to validate the environment variables
const Joi = require("joi");

const envSchema = Joi.object({
  PORT: Joi.number().default(5000),
  NODE_ENV: Joi.string()
    .valid("development", "test", "production")
    .default("development"),
  DATABASE_URL: Joi.string().required(),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default("7d"),
  REFRESH_TOKEN_COOKIE_NAME: Joi.string().default("travora_refresh_token"),

  REFRESH_TOKEN_COOKIE_MAX_AGE_MS: Joi.number()
    .integer()
    .positive()
    .default(604800000),

  COOKIE_SECURE: Joi.boolean().truthy("true").falsy("false").default(false),

  COOKIE_SAME_SITE: Joi.string()
    .valid("strict", "lax", "none")
    .default("strict"),
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

  jwt: {
    accessSecret: value.JWT_ACCESS_SECRET,
    refreshSecret: value.JWT_REFRESH_SECRET,
    accessExpiresIn: value.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: value.JWT_REFRESH_EXPIRES_IN,
  },

  cookie: {
    refreshTokenName: value.REFRESH_TOKEN_COOKIE_NAME,
    refreshTokenMaxAgeMs: value.REFRESH_TOKEN_COOKIE_MAX_AGE_MS,
    secure: value.COOKIE_SECURE,
    sameSite: value.COOKIE_SAME_SITE,
  },
};

module.exports = env;
