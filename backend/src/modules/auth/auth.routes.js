const express = require("express");

const authController = require("./controllers/auth.controller");

const validateRequest = require("../../middlewares/validateRequest");
const authenticate = require("../../middlewares/authenticate");
const authorize = require("../../middlewares/authorize");

const {
  USER_ROLES,
} = require("../../core/constants/auth.constants");

const {
  registerSchema,
  loginSchema,
} = require("./validators/auth.validation");

const router = express.Router();

router.post(
  "/register",
  validateRequest(registerSchema),
  authController.register,
);

router.post(
  "/login",
  validateRequest(loginSchema),
  authController.login,
);

router.post("/refresh", authController.refresh);

router.post("/logout", authController.logout);

// Temporary route to test authentication.
router.get("/protected-test", authenticate, (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Protected route accessed successfully",
    user: req.user,
  });
});

// Temporary route to test role-based authorization.
router.get(
  "/admin-test",
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN),
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: "Admin route accessed successfully",
      user: req.user,
    });
  },
);

module.exports = router;