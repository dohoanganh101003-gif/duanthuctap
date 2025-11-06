const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  authenticateToken,
  checkAdmin,
  checkOwner,
  checkAdminOrOwner,
} = require("../middlewares/authMiddleware");

const UserBookingController = require("../controllers/userBookingController");
const AdminBookingController = require("../controllers/adminBookingController");
const OwnerBookingController = require("../controllers/ownerBookingController");
const OwnerPaymentController = require("../controllers/ownerPaymentController");

router.use((req, res, next) => {
  const pool = req.app.locals.pool;
  req.controllers = {
    user: new UserBookingController(pool),
    admin: new AdminBookingController(pool),
    ownerBooking: new OwnerBookingController(pool),
    ownerPayment: new OwnerPaymentController(pool),
  };
  next();
});

// ========== UPLOAD MINH CHỨNG CHUYỂN KHOẢN (NGƯỜI DÙNG) ==========

const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

router.post(
  "/api/bookings/:id/upload-proof",
  authenticateToken,
  upload.single("payment_proof"),
  (req, res) => req.controllers.user.uploadPaymentProof(req, res)
);
router.get(
  "/api/bookings/:id/proof",
  authenticateToken,
  checkOwner,
  (req, res) => req.controllers.ownerPayment.getPaymentProof(req, res)
);

// =============== NGƯỜI DÙNG ===============

// Trang đặt sân
router.get("/dat-san", authenticateToken, (req, res) =>
  req.controllers.user.renderBookingPage(req, res)
);

// Tạo booking mới
router.post("/api/dat-san", authenticateToken, (req, res) =>
  req.controllers.user.createBooking(req, res)
);

// Lịch sử đặt sân
router.get("/lichsu_datsan", authenticateToken, (req, res) =>
  req.controllers.user.renderUserBookings(req, res)
);

// Thanh toán
router.post("/api/bookings/:id/pay", authenticateToken, (req, res) =>
  req.controllers.user.handlePayment(req, res)
);

// Lấy mã QR của sân
router.get("/booking/:id/qr", authenticateToken, (req, res) =>
  req.controllers.user.getBookingQr(req, res)
);

// ================= ADMIN =========================

// Trang quản lý đặt sân
router.get("/quanly_datsan", authenticateToken, checkAdmin, (req, res) =>
  req.controllers.admin.renderAdminBookings(req, res)
);

// Cập nhật trạng thái booking
router.post(
  "/quanly_datsan/:id/status",
  authenticateToken,
  checkAdmin,
  (req, res) => req.controllers.admin.updateBookingStatusByAdmin(req, res)
);

router.put(
  "/api/bookings/:id/status",
  authenticateToken,
  checkAdminOrOwner,
  (req, res) => req.controllers.admin.updateBookingStatusByAdmin(req, res)
);

// ================= CHỦ SÂN ===============

// Trang quản lý đặt sân (chủ sân)
router.get("/owner/chusan_datsan", authenticateToken, checkOwner, (req, res) =>
  req.controllers.ownerBooking.getOwnerBookings(req, res)
);

// Xác nhận đặt sân
router.post(
  "/owner/api/xacnhan-datsan/:id",
  authenticateToken,
  checkOwner,
  (req, res) => req.controllers.ownerBooking.confirmBooking(req, res)
);

// Hủy đặt sân
router.post(
  "/owner/api/huy-datsan/:id",
  authenticateToken,
  checkOwner,
  (req, res) => req.controllers.ownerBooking.cancelBooking(req, res)
);

// Xác nhận thanh toán
router.post(
  "/owner/api/xacnhan-thanhtoan/:id",
  authenticateToken,
  checkOwner,
  (req, res) => req.controllers.ownerPayment.confirmPayment(req, res)
);

// Từ chối thanh toán
router.post(
  "/owner/api/tuchoi-thanhtoan/:id",
  authenticateToken,
  checkOwner,
  (req, res) => req.controllers.ownerPayment.declinePayment(req, res)
);

module.exports = router;
