const express = require("express");

const healthRoutes = require("../modules/health/health.routes");
const packagesRoutes = require("../modules/packages/packages.routes");
const authRoutes = require("../modules/auth/auth.routes");
const tourRequestsRoutes = require("../modules/tour-requests/tourRequests.routes");
const tourGuidesRoutes = require("../modules/tour-guides/tourGuides.routes");
const router = express.Router();

router.use("/health", healthRoutes);
router.use("/packages", packagesRoutes);
router.use("/auth", authRoutes);
router.use("/tour-requests", tourRequestsRoutes);
router.use("/tour-guides", tourGuidesRoutes);
module.exports = router;