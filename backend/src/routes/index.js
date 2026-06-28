const express = require("express");

const healthRoutes = require("../modules/health/health.routes");
// const packageRoutes = require("../modules/packages/packages.routes");
// const bookingRoutes = require("../modules/bookings/booking.routes");

const router = express.Router();

router.use("/health", healthRoutes);
// router.use("/packages", packageRoutes);
// router.use("/bookings", bookingRoutes);

module.exports = router;