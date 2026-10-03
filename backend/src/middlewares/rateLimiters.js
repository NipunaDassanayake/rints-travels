const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const env = require("../config/env");
const logger = require("../config/logger");
const { sendError } = require("../utils/apiResponse");
const HTTP_STATUS = require("../core/constants/httpStatus");

/**
 * =========================================================
 * Auth Rate Limiters (CR-012)
 * =========================================================
 *
 * Client identity:
 *
 * - req.ip is the socket address unless TRUST_PROXY is set,
 *   so a spoofed X-Forwarded-For header is ignored by default.
 * - ipKeyGenerator folds IPv4-mapped IPv6 (::ffff:a.b.c.d) into
 *   plain IPv4, and keys IPv6 by its /56 prefix: one host
 *   cannot rotate through its own allocation to evade a limit,
 *   and separate IPv6 households never share a bucket.
 *
 * Login limiters count FAILED responses only, so successful
 * logins are never limited, and a per-account key includes the
 * email: users behind one shared IP do not fill each other's
 * account buckets. Only the per-IP credential-stuffing guard is
 * shared by everyone behind one address.
 *
 * Memory store: correct for the single backend instance of the
 * demo release; counters reset when the process restarts.
 */

const IPV6_SUBNET = 56;

const TOO_MANY_ATTEMPTS = "Too many attempts. Please try again later.";

const normalizeEmail = (email) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

const createLimiter = (name, options) => {
  if (!env.rateLimit.enabled) {
    return (req, res, next) => next();
  }

  return rateLimit({
    standardHeaders: "draft-7",
    legacyHeaders: false,

    handler: (req, res) => {
      // Never log the email: only which limiter tripped.
      logger.warn(
        {
          limiter: name,
          path: req.originalUrl,
          correlationId: req.correlationId || null,
        },
        "Auth rate limit exceeded",
      );

      return sendError(
        res,
        TOO_MANY_ATTEMPTS,
        null,
        HTTP_STATUS.TOO_MANY_REQUESTS,
      );
    },

    ...options,
  });
};

/**
 * Failed logins per (client, account). Runs after
 * validateRequest, so the email is already trimmed/lowercased.
 */
const createLoginAccountLimiter = (overrides = {}) =>
  createLimiter("login-account", {
    windowMs: env.rateLimit.loginWindowMs,
    limit: env.rateLimit.loginAccountMax,
    skipSuccessfulRequests: true,
    keyGenerator: (req) =>
      `${ipKeyGenerator(req.ip || "unknown", IPV6_SUBNET)}|${normalizeEmail(
        req.body?.email,
      )}`,
    ...overrides,
  });

/**
 * Failed logins per client across all accounts
 * (credential-stuffing guard).
 */
const createLoginIpLimiter = (overrides = {}) =>
  createLimiter("login-ip", {
    windowMs: env.rateLimit.loginWindowMs,
    limit: env.rateLimit.loginIpMax,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => ipKeyGenerator(req.ip || "unknown", IPV6_SUBNET),
    ...overrides,
  });

const createRegisterLimiter = (overrides = {}) =>
  createLimiter("register", {
    windowMs: env.rateLimit.registerWindowMs,
    limit: env.rateLimit.registerMax,
    keyGenerator: (req) => ipKeyGenerator(req.ip || "unknown", IPV6_SUBNET),
    ...overrides,
  });

const createRefreshLimiter = (overrides = {}) =>
  createLimiter("refresh", {
    windowMs: env.rateLimit.refreshWindowMs,
    limit: env.rateLimit.refreshMax,
    keyGenerator: (req) => ipKeyGenerator(req.ip || "unknown", IPV6_SUBNET),
    ...overrides,
  });

module.exports = {
  IPV6_SUBNET,
  TOO_MANY_ATTEMPTS,
  createLoginAccountLimiter,
  createLoginIpLimiter,
  createRegisterLimiter,
  createRefreshLimiter,

  // Application instances (one store each, created at startup).
  loginAccountLimiter: createLoginAccountLimiter(),
  loginIpLimiter: createLoginIpLimiter(),
  registerLimiter: createRegisterLimiter(),
  refreshLimiter: createRefreshLimiter(),
};
