const express = require("express");

const authController = require("./controllers/auth.controller");

const validateRequest = require("../../middlewares/validateRequest");
const authenticate = require("../../middlewares/authenticate");

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
  validateRequest(loginSchema),
  loginAccountLimiter,
  loginIpLimiter,
  authController.login,
);

router.post("/refresh", refreshLimiter, authController.refresh);

router.post("/logout", authController.logout);

router.get("/me", authenticate, authController.getCurrentUser);

router.post("/logout-all", authenticate, authController.logoutAll);

module.exports = router;
