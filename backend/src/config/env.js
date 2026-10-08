require("dotenv").config();

const net = require("net");

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

  /*
   * Sessions
   */
  SESSION_ABSOLUTE_MAX_AGE_MS: Joi.number()
    .integer()
    .positive()
    .default(30 * 24 * 60 * 60 * 1000),

  REFRESH_REUSE_GRACE_MS: Joi.number().integer().min(0).default(10_000),

  /*
   * Reverse proxy (unset = do not trust X-Forwarded-For).
   * Validated by parseTrustProxy below.
   */
  TRUST_PROXY: Joi.string().trim().allow("").optional(),

  /*
   * Auth rate limiting
   */
  AUTH_RATE_LIMIT_ENABLED: Joi.boolean()
    .truthy("true")
    .falsy("false")
    .default(true),

  AUTH_RATE_LIMIT_LOGIN_WINDOW_MS: Joi.number()
    .integer()
    .positive()
    .default(15 * 60 * 1000),

  AUTH_RATE_LIMIT_LOGIN_ACCOUNT_MAX: Joi.number().integer().positive().default(5),

  AUTH_RATE_LIMIT_LOGIN_IP_MAX: Joi.number().integer().positive().default(30),

  AUTH_RATE_LIMIT_REGISTER_WINDOW_MS: Joi.number()
    .integer()
    .positive()
    .default(15 * 60 * 1000),

  AUTH_RATE_LIMIT_REGISTER_MAX: Joi.number().integer().positive().default(30),

  AUTH_RATE_LIMIT_REFRESH_WINDOW_MS: Joi.number()
    .integer()
    .positive()
    .default(60 * 1000),

  AUTH_RATE_LIMIT_REFRESH_MAX: Joi.number().integer().positive().default(120),

  /*
   * Frontend
   */
  FRONTEND_URL: Joi.string().uri().required(),

  /*
   * Stripe
   */
  STRIPE_SECRET_KEY: Joi.string().trim().required(),

  STRIPE_WEBHOOK_SECRET: Joi.string().trim().optional(),

  /*
   * Booking lifecycle confirmation codes (CR-032): HMAC key for
   * the traveler's start/complete codes. Server-side only, never
   * logged; deliberately separate from the JWT secrets.
   */
  BOOKING_CONFIRMATION_SECRET: Joi.string().min(32).required(),
}).unknown(true);

const { value, error } = envSchema.validate(process.env, {
  abortEarly: false,
});

if (error) {
  throw new Error(`Environment validation failed: ${error.message}`);
}

/*
 * Browsers drop SameSite=None cookies without Secure, and a
 * production refresh cookie must never travel over plain HTTP.
 */
if (value.COOKIE_SAME_SITE === "none" && !value.COOKIE_SECURE) {
  throw new Error(
    "Environment validation failed: COOKIE_SAME_SITE=none requires COOKIE_SECURE=true",
  );
}

if (value.NODE_ENV === "production" && !value.COOKIE_SECURE) {
  throw new Error(
    "Environment validation failed: COOKIE_SECURE must be true in production",
  );
}

/**
 * TRUST_PROXY (default: disabled) accepts only safe forms:
 *
 * - unset, empty or "false": X-Forwarded-For is ignored;
 * - a hop count from 1 to 10: trust that many proxies in front;
 * - a comma-separated list of the presets "loopback",
 *   "linklocal", "uniquelocal" and/or IP addresses or CIDR
 *   subnets (prefix length at least 1).
 *
 * "true", "*" and catch-all subnets such as 0.0.0.0/0 would let
 * any client spoof its address (and so its rate-limit bucket),
 * so startup fails instead.
 */
const TRUST_PROXY_PRESETS = new Set(["loopback", "linklocal", "uniquelocal"]);

const MAX_TRUST_PROXY_HOPS = 10;

const isSafeTrustProxyEntry = (entry) => {
  if (TRUST_PROXY_PRESETS.has(entry)) {
    return true;
  }

  const [address, prefix, ...rest] = entry.split("/");

  const version = net.isIP(address);

  if (!version || rest.length > 0) {
    return false;
  }

  if (prefix === undefined) {
    return true;
  }

  if (!/^\d{1,3}$/.test(prefix)) {
    return false;
  }

  const bits = Number(prefix);

  return bits >= 1 && bits <= (version === 4 ? 32 : 128);
};

const parseTrustProxy = (raw) => {
  if (!raw || raw === "false") {
    return false;
  }

  if (/^\d+$/.test(raw)) {
    const hops = Number(raw);

    if (hops >= 1 && hops <= MAX_TRUST_PROXY_HOPS) {
      return hops;
    }
  } else {
    const entries = raw.split(",").map((entry) => entry.trim());

    if (entries.every((entry) => entry && isSafeTrustProxyEntry(entry))) {
      return entries;
    }
  }

  throw new Error(
    `Environment validation failed: unsupported TRUST_PROXY "${raw}". ` +
      `Use a hop count (1-${MAX_TRUST_PROXY_HOPS}) or a comma-separated list of ` +
      "loopback/linklocal/uniquelocal, IP addresses or CIDR subnets; " +
      '"true" and catch-all values are not allowed.',
  );
};

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

  session: {
    absoluteMaxAgeMs: value.SESSION_ABSOLUTE_MAX_AGE_MS,

    refreshReuseGraceMs: value.REFRESH_REUSE_GRACE_MS,
  },

  trustProxy: parseTrustProxy(value.TRUST_PROXY),

  rateLimit: {
    enabled: value.AUTH_RATE_LIMIT_ENABLED,

    loginWindowMs: value.AUTH_RATE_LIMIT_LOGIN_WINDOW_MS,

    loginAccountMax: value.AUTH_RATE_LIMIT_LOGIN_ACCOUNT_MAX,

    loginIpMax: value.AUTH_RATE_LIMIT_LOGIN_IP_MAX,

    registerWindowMs: value.AUTH_RATE_LIMIT_REGISTER_WINDOW_MS,

    registerMax: value.AUTH_RATE_LIMIT_REGISTER_MAX,

    refreshWindowMs: value.AUTH_RATE_LIMIT_REFRESH_WINDOW_MS,

    refreshMax: value.AUTH_RATE_LIMIT_REFRESH_MAX,
  },

  frontend: {
    url: value.FRONTEND_URL,
  },

  stripe: {
    secretKey: value.STRIPE_SECRET_KEY,

    webhookSecret: value.STRIPE_WEBHOOK_SECRET,
  },

  bookingConfirmation: {
    secret: value.BOOKING_CONFIRMATION_SECRET,
  },
};

module.exports = env;