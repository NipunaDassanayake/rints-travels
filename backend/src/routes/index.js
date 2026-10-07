const express = require("express");

const healthRoutes = require("../modules/health/health.routes");
const packagesRoutes = require("../modules/packages/packages.routes");
const authRoutes = require("../modules/auth/auth.routes");
const tourRequestsRoutes = require("../modules/tour-requests/tourRequests.routes");
const tourGuidesRoutes = require("../modules/tour-guides/tourGuides.routes");
const quotationsRoutes = require("../modules/quotations/quotations.routes");
const paymentsRoutes = require("../modules/payments/payments.routes");
const bookingsRoutes = require("../modules/bookings/bookings.routes");
const reviewsRoutes = require("../modules/reviews/reviews.routes");
const router = express.Router();

router.use("/health", healthRoutes);
router.use("/packages", packagesRoutes);
router.use("/auth", authRoutes);
router.use("/bookings", bookingsRoutes);
router.use("/payments", paymentsRoutes);
router.use("/quotations", quotationsRoutes);
router.use("/tour-requests", tourRequestsRoutes);
router.use("/tour-guides", tourGuidesRoutes);
router.use("/reviews", reviewsRoutes);
module.exports = router;