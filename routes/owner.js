const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  authenticateToken,
  checkOwner,
} = require("../middlewares/authMiddleware");
const { Pool } = require("pg");
const config = require("../config");

const OwnerController = require("../controllers/ownerController");
const OwnerBookingController = require("../controllers/ownerBookingController");
const OwnerPaymentController = require("../controllers/ownerPaymentController");

const pool = new Pool(config.database);
const ownerController = new OwnerController(pool);
const bookingController = new OwnerBookingController(pool);
const paymentController = new OwnerPaymentController(pool);

// ========== CẤU HÌNH UPLOAD ==========
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage, limits: { files: 6 } });

// ========== TRANG GIAO DIỆN ==========

// Trang danh sách sân bóng
router.get("/chusan_sanbong", authenticateToken, checkOwner, (req, res) =>
  ownerController.getOwnerFields(req, res)
);

// Trang thêm sân bóng
router.get("/them-sanbong", authenticateToken, checkOwner, (req, res) =>
  ownerController.renderAddField(req, res)
);

// Trang sửa sân bóng
router.get("/sua-sanbong/:id", authenticateToken, checkOwner, (req, res) =>
  ownerController.renderEditField(req, res)
);

// Trang danh sách đặt sân
router.get("/chusan_datsan", authenticateToken, checkOwner, (req, res) =>
  ownerController.getOwnerBookings(req, res)
);

// Trang sân con
router.get("/sancon/:field_id", authenticateToken, checkOwner, (req, res) =>
  ownerController.getSubFieldsByField(req, res)
);

// ========== API SÂN BÓNG ==========

// Lấy thông tin sân theo ID
router.get("/api/sanbong/:id", authenticateToken, checkOwner, (req, res) =>
  ownerController.getFieldById(req, res)
);

// Thêm sân bóng (upload ảnh + QR)
router.post(
  "/api/sanbong",
  authenticateToken,
  checkOwner,
  upload.fields([
    { name: "images", maxCount: 5 },
    { name: "qr_image", maxCount: 1 },
  ]),
  (req, res) => ownerController.createField(req, res)
);

// Cập nhật sân bóng
router.put(
  "/api/sanbong/:id",
  authenticateToken,
  checkOwner,
  upload.fields([
    { name: "images", maxCount: 5 },
    { name: "qr_image", maxCount: 1 },
  ]),
  (req, res) => ownerController.updateField(req, res)
);

// Xóa sân bóng
router.delete("/api/sanbong/:id", authenticateToken, checkOwner, (req, res) =>
  ownerController.deleteField(req, res)
);

// ========== API ĐẶT SÂN ==========

// Xác nhận đặt sân
router.post(
  "/api/xacnhan-datsan/:id",
  authenticateToken,
  checkOwner,
  (req, res) => bookingController.confirmBooking(req, res)
);

// Hủy đặt sân
router.post("/api/huy-datsan/:id", authenticateToken, checkOwner, (req, res) =>
  bookingController.cancelBooking(req, res)
);

// ========== API THANH TOÁN ==========

// Xác nhận đã nhận tiền
router.post(
  "/api/xacnhan-thanhtoan/:id",
  authenticateToken,
  checkOwner,
  (req, res) => paymentController.confirmPayment(req, res)
);

// Từ chối thanh toán
router.post(
  "/api/tuchoi-thanhtoan/:id",
  authenticateToken,
  checkOwner,
  (req, res) => paymentController.declinePayment(req, res)
);

module.exports = router;
