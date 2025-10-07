const express = require("express");
const router = express.Router();
const FieldController = require("../controllers/FieldController");
const Service = require("../models/Service");
const multer = require("multer");
const path = require("path");

const fs = require("fs");
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

const {
  authenticateToken,
  checkAdmin,
  checkOwner,
} = require("../middlewares/authMiddleware");

router.get("/", (req, res) => {
  const pool = req.app.locals.pool;
  const fieldController = new FieldController(pool);
  fieldController.getHomePage(req, res);
});

router.get("/api/sanbong", (req, res) => {
  const pool = req.app.locals.pool;
  const fieldController = new FieldController(pool);
  fieldController.getFieldsGeoJSON(req, res);
});

router.get("/sanbong", (req, res) => {
  const pool = req.app.locals.pool;
  const fieldController = new FieldController(pool);
  fieldController.getFieldsWithSubFields(req, res);
});

router.get("/them_sanbong", authenticateToken, checkAdmin, async (req, res) => {
  const pool = req.app.locals.pool;
  const result = await pool.query(
    "SELECT id, username FROM users WHERE role='owner'"
  );
  res.render("them_sanbong", { owners: result.rows, session: req.session });
});

router.post(
  "/api/sanbong",
  authenticateToken,
  checkAdmin,
  upload.array("images", 5),
  (req, res) => {
    const pool = req.app.locals.pool;
    const fieldController = new FieldController(pool);

    if (req.files && req.files.length > 0) {
      req.body.images = JSON.stringify(
        req.files.map((f) => "/uploads/" + f.filename)
      );
    }

    fieldController.createField(req, res);
  }
);

router.put(
  "/api/sanbong/:id",
  authenticateToken,
  checkAdmin,
  upload.array("images", 5),
  (req, res) => {
    const pool = req.app.locals.pool;
    const fieldController = new FieldController(pool);

    if (req.files && req.files.length > 0) {
      req.body.images = JSON.stringify(
        req.files.map((f) => "/uploads/" + f.filename)
      );
    }

    fieldController.updateField(req, res);
  }
);
router.get("/sua_sanbong/:id", (req, res) => {
  const pool = req.app.locals.pool;
  const fieldController = new FieldController(pool);
  fieldController.getFieldById(req, res);
});

router.delete("/api/sanbong/:id", authenticateToken, checkAdmin, (req, res) => {
  const pool = req.app.locals.pool;
  const fieldController = new FieldController(pool);
  fieldController.deleteField(req, res);
});

// Lấy dịch vụ theo sân bóng
router.get("/dichvu/:sanbong_id", async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const serviceModel = new Service(pool);
    const services = await serviceModel.getServicesByFieldId(
      req.params.sanbong_id
    );
    res.json(services);
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ error: "Lỗi cơ sở dữ liệu: " + err.message });
  }
});

module.exports = router;
