const express = require("express");
const authController = require("./controllers/auth.controller");
const validateRequest = require("../../middlewares/validateRequest");
const authenticate = require("../../middlewares/authenticate");
const { registerSchema, loginSchema } = require("./validators/auth.validation");

const router = express.Router();

router.post(
  "/register",
  validateRequest(registerSchema),
  authController.register,
);

router.post("/login", validateRequest(loginSchema), authController.login);

router.post("/refresh", authController.refresh);

router.post("/logout", authController.logout);

router.get("/protected-test", authenticate, (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Protected route accessed successfully",
    user: req.user,
  });
});
module.exports = router;
