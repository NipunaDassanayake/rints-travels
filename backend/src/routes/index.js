const express = require("express");

const healthRoutes = require("../modules/health/health.routes");
const packagesRoutes = require("../modules/packages/packages.routes");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/packages", packagesRoutes);

module.exports = router;