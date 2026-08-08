const express = require("express");

const bookingsController =
  require("./bookings.controller");

const authenticate =
  require("../../middlewares/authenticate");

const authorize =
  require("../../middlewares/authorize");

const {
  USER_ROLES,
} = require("../../core/constants/auth.constants");

const router = express.Router();

router.get(
  "/me",
  authenticate,
  authorize(USER_ROLES.TOURIST),
  bookingsController.getMyBookings
);

router.get(
  "/:id",
  authenticate,
  bookingsController.getBookingById
);

module.exports = router;