const express = require("express");
const authController = require("./controllers/auth.controller");
const validateRequest = require("../../middlewares/validateRequest");
const {
  registerSchema,
  loginSchema,
} = require("./validators/auth.validation");

const router = express.Router();

router.post(
  "/register",
  validateRequest(registerSchema),
  authController.register
);

router.post(
  "/login",
  validateRequest(loginSchema),
  authController.login
);

module.exports = router;