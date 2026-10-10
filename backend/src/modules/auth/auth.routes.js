const express = require("express");

const authController = require("./controllers/auth.controller");

const validateRequest = require("../../middlewares/validateRequest");
const authenticate = require("../../middlewares/authenticate");
const authOrigin = require("../../middlewares/authOrigin");

const {
  loginAccountLimiter,
  loginIpLimiter,
  registerLimiter,
  refreshLimiter,
} = require("../../middlewares/rateLimiters");

const {
  registerSchema,
  loginSchema,
} = require("./validators/auth.validation");

const router = express.Router();

router.post(
  "/register",
  registerLimiter,
  validateRequest(registerSchema),
  authController.register,
);

/*
 * The login limiters run after validation so the per-account
 * key uses the normalized (trimmed, lowercased) email.
 */
router.post(
  "/login",
  authOrigin,
  validateRequest(loginSchema),
  loginAccountLimiter,
  loginIpLimiter,
  authController.login,
);

router.post("/refresh", authOrigin, refreshLimiter, authController.refresh);

router.post("/logout", authOrigin, authController.logout);

router.get("/me", authenticate, authController.getCurrentUser);

router.post("/logout-all", authOrigin, authenticate, authController.logoutAll);

module.exports = router;
