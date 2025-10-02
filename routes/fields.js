const express = require("express");
const router = express.Router();
const FieldController = require("../controllers/FieldController");
const Service = require("../models/Service");
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

router.post("/api/sanbong", authenticateToken, checkAdmin, (req, res) => {
  const pool = req.app.locals.pool;
  const fieldController = new FieldController(pool);
  fieldController.createField(req, res);
});

router.put("/api/sanbong/:id", authenticateToken, checkAdmin, (req, res) => {
  const pool = req.app.locals.pool;
  const fieldController = new FieldController(pool);
  fieldController.updateField(req, res);
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
