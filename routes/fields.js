const express = require("express");
const router = express.Router();
const FieldController = require("../controllers/FieldController");
const ServiceController = require("../controllers/ServiceController");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  authenticateToken,
  checkAdmin,
} = require("../middlewares/authMiddleware");

const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(
      null,
      `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(
        file.originalname
      )}`
    ),
});
const upload = multer({ storage });

router.use((req, res, next) => {
  req.controller = new FieldController(req.app.locals.pool);
  req.serviceController = new ServiceController(req.app.locals.pool);
  next();
});

// CLIENT
router.get("/", (req, res) => req.controller.getHomePage(req, res));
router.get("/api/sanbong", (req, res) =>
  req.controller.getFieldsGeoJSON(req, res)
);
router.get("/sanbong", (req, res) =>
  req.controller.getFieldsWithSubFields(req, res)
);

router.get("/them_sanbong", authenticateToken, checkAdmin, (req, res) =>
  req.controller.renderAddFieldPage(req, res)
);

router.get("/danhsach_sanbong", authenticateToken, checkAdmin, (req, res) =>
  req.controller.renderAdminFieldsPage(req, res)
);

router.get("/sancon/:field_id", authenticateToken, checkAdmin, (req, res) =>
  req.controller.renderAdminSubFieldsPage(req, res)
);

router.post(
  "/api/sanbong",
  authenticateToken,
  checkAdmin,
  upload.array("images", 5),
  (req, res) => {
    if (req.files?.length)
      req.body.images = JSON.stringify(
        req.files.map((f) => "/uploads/" + f.filename)
      );
    req.controller.createField(req, res);
  }
);

router.put(
  "/api/sanbong/:id",
  authenticateToken,
  checkAdmin,
  upload.array("images", 5),
  (req, res) => {
    if (req.files?.length)
      req.body.images = JSON.stringify(
        req.files.map((f) => "/uploads/" + f.filename)
      );
    req.controller.updateField(req, res);
  }
);

router.get("/sua-sanbong/:id", authenticateToken, checkAdmin, (req, res) =>
  req.controller.getFieldById(req, res)
);

router.delete("/api/sanbong/:id", authenticateToken, checkAdmin, (req, res) =>
  req.controller.deleteField(req, res)
);

router.get("/dichvu/:sanbong_id", (req, res) =>
  req.serviceController.getByFieldId(req, res)
);

module.exports = router;
