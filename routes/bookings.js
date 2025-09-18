const express = require("express");
const router = express.Router();
const BookingController = require("../controllers/BookingController");
const jwt = require("jsonwebtoken");
const config = require("../config"); // Import config

const authenticateToken = (req, res, next) => {
  const token = req.session.token;
  if (!token) return res.redirect("/dangnhap");
  jwt.verify(token, config.jwt.secret, (err, user) => {
    if (err) return res.redirect("/dangnhap");
    req.user = user;
    next();
  });
};

const bookingController = new BookingController(express().locals.pool);

router.get(
  "/bookings",
  bookingController.getAllBookings.bind(bookingController)
);
router.post(
  "/bookings",
  authenticateToken,
  bookingController.createBooking.bind(bookingController)
);

module.exports = router;
