const express = require("express");

const healthRoutes = require("../modules/health/health.routes");
const packagesRoutes = require("../modules/packages/packages.routes");
const authRoutes = require("../modules/auth/auth.routes");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/packages", packagesRoutes);
router.use("/auth", authRoutes);

module.exports = router;