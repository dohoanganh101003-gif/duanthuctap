const express = require("express");
const router = express.Router();
const BookingController = require("../controllers/BookingController");
const {
  authenticateToken,
  checkAdmin,
  checkOwner,
  checkAdminOrOwner,
} = require("../middlewares/authMiddleware");

router.use((req, res, next) => {
  req.controller = new BookingController(req.app.locals.pool);
  next();
});

// USER
router.get("/dat-san", authenticateToken, (req, res) =>
  req.controller.renderBookingPage(req, res)
);
router.post("/api/dat-san", authenticateToken, (req, res) =>
  req.controller.createBooking(req, res)
);
router.get("/lichsu_datsan", authenticateToken, (req, res) =>
  req.controller.renderUserBookings(req, res)
);

// ADMIN
router.get("/quanly_datsan", authenticateToken, checkAdmin, (req, res) =>
  req.controller.renderAdminBookings(req, res)
);
router.post(
  "/quanly_datsan/:id/status",
  authenticateToken,
  checkAdmin,
  (req, res) => req.controller.updateBookingStatusByAdmin(req, res)
);
router.put(
  "/api/bookings/:id/status",
  authenticateToken,
  checkAdminOrOwner,
  (req, res) => req.controller.updateBookingStatusByAdmin(req, res)
);

// OWNER
router.get("/owner/chusan_datsan", authenticateToken, checkOwner, (req, res) =>
  req.controller.renderOwnerBookings(req, res)
);

router.post(
  "/owner/chusan_datsan/:id/status",
  authenticateToken,
  checkOwner,
  (req, res) => req.controller.updateBookingStatusByOwner(req, res)
);

router.put(
  "/owner/chusan_datsan/:id/status",
  authenticateToken,
  checkOwner,
  (req, res) => req.controller.updateBookingStatusByOwner(req, res)
);

module.exports = router;
