const express = require("express");
const router = express.Router();
const BookingController = require("../controllers/BookingController");
const jwt = require("jsonwebtoken");
const config = require("../config");

const authenticateToken = (req, res, next) => {
  const token = req.session.token;
  if (!token) return res.redirect("/dangnhap");
  jwt.verify(token, config.jwt.secret, (err, user) => {
    if (err) return res.redirect("/dangnhap");
    req.user = user;
    req.session.user_id = user.user_id;
    req.session.role = user.role;
    next();
  });
};

const checkAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Chỉ admin mới có quyền truy cập" });
  }
  next();
};

router.get("/dat-san", authenticateToken, (req, res) => {
  res.render("dat_san", { session: req.session || {} });
});

router.get("/bookings", authenticateToken, (req, res) => {
  const pool = req.app.locals.pool;
  const bookingController = new BookingController(pool);
  bookingController.getAllBookings(req, res);
});

router.post("/api/dat-san", authenticateToken, (req, res) => {
  const pool = req.app.locals.pool;
  const bookingController = new BookingController(pool);
  bookingController.createBooking(req, res);
});

router.put(
  "/api/bookings/:id/status",
  authenticateToken,
  checkAdmin,
  (req, res) => {
    const pool = req.app.locals.pool;
    const bookingController = new BookingController(pool);
    bookingController.updateBookingStatus(req, res);
  }
);

module.exports = router;
