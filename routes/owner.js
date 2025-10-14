const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ownerController = require("../controllers/ownerController");
const {
  authenticateToken,
  checkOwner,
} = require("../middlewares/authMiddleware");

const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage, limits: { files: 5 } });

router.get(
  "/chusan_sanbong",
  authenticateToken,
  checkOwner,
  ownerController.getOwnerFields
);
router.get(
  "/them-sanbong",
  authenticateToken,
  checkOwner,
  ownerController.renderAddField
);
router.get(
  "/sua-sanbong/:id",
  authenticateToken,
  checkOwner,
  ownerController.renderEditField
);
router.get(
  "/chusan_datsan",
  authenticateToken,
  checkOwner,
  ownerController.getOwnerBookings
);
router.get(
  "/sancon/:field_id",
  authenticateToken,
  checkOwner,
  ownerController.getSubFieldsByField
);

// API
router.get(
  "/api/sanbong/:id",
  authenticateToken,
  checkOwner,
  ownerController.getFieldById
);
router.post(
  "/api/sanbong",
  authenticateToken,
  checkOwner,
  upload.array("images", 5),
  ownerController.createField
);
router.put(
  "/api/sanbong/:id",
  authenticateToken,
  checkOwner,
  upload.array("images", 5),
  ownerController.updateField
);
router.delete(
  "/api/sanbong/:id",
  authenticateToken,
  checkOwner,
  ownerController.deleteField
);

// Booking API
router.post(
  "/api/xacnhan-datsan/:id",
  authenticateToken,
  checkOwner,
  ownerController.confirmBooking
);
router.post(
  "/api/huy-datsan/:id",
  authenticateToken,
  checkOwner,
  ownerController.cancelBooking
);

module.exports = router;
