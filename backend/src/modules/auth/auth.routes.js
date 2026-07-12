const express = require("express");
const authController = require("./auth.controller");
const validateRequest = require("../../middlewares/validateRequest");
const { registerSchema } = require("./auth.validation");

const router = express.Router();

router.post(
  "/register",
  validateRequest(registerSchema),
  authController.register
);

module.exports = router;