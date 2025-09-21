const express = require("express");
const router = express.Router();
const FieldController = require("../controllers/FieldController");
const Service = require("../models/Service");
const Field = require("../models/Field");
const jwt = require("jsonwebtoken");
const config = require("../config");

const authenticateToken = (req, res, next) => {
  const token = req.session.token;
  if (!token) return res.redirect("/dangnhap");
  jwt.verify(token, config.jwt.secret, (err, user) => {
    if (err) return res.redirect("/dangnhap");
    req.user = user;
    req.session.user_id = user.user_id; // Lưu user_id vào session
    req.session.role = user.role; // Lưu role vào session
    next();
  });
};

const checkAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Chỉ admin mới có quyền truy cập" });
  }
  next();
};

// Sử dụng pool từ req.app.locals.pool trong mỗi route
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

router.post("/api/dichvu", authenticateToken, checkAdmin, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const serviceModel = new Service(pool);
    const { name, description, price, field_id } = req.body;
    if (price < 0) {
      return res.status(400).json({ error: "Giá không được nhỏ hơn 0" });
    }
    const field = await new Field(pool).getFieldById(field_id);
    if (!field) {
      return res
        .status(400)
        .json({ error: `field_id ${field_id} không tồn tại` });
    }
    const service = await serviceModel.createService({
      name,
      description,
      price,
      field_id,
    });
    res.status(201).json({ message: "Thêm dịch vụ thành công", service });
  } catch (err) {
    console.error("Lỗi khi thêm dịch vụ:", err.stack);
    res.status(500).json({ error: "Lỗi máy chủ nội bộ: " + err.message });
  }
});

router.put(
  "/api/dichvu/:id",
  authenticateToken,
  checkAdmin,
  async (req, res) => {
    try {
      const pool = req.app.locals.pool;
      const serviceModel = new Service(pool);
      const { id } = req.params;
      const { name, description, price, field_id } = req.body;
      if (price < 0) {
        return res.status(400).json({ error: "Giá không được nhỏ hơn 0" });
      }
      const field = await new Field(pool).getFieldById(field_id);
      if (!field) {
        return res
          .status(400)
          .json({ error: `field_id ${field_id} không tồn tại` });
      }
      const service = await serviceModel.updateService(id, {
        name,
        description,
        price,
        field_id,
      });
      if (!service) {
        return res.status(404).json({ error: "Dịch vụ không tồn tại" });
      }
      res.json({ message: "Cập nhật dịch vụ thành công", service });
    } catch (err) {
      console.error("Lỗi khi cập nhật dịch vụ:", err.stack);
      res.status(500).json({ error: "Lỗi máy chủ nội bộ: " + err.message });
    }
  }
);

router.delete(
  "/api/dichvu/:id",
  authenticateToken,
  checkAdmin,
  async (req, res) => {
    try {
      const pool = req.app.locals.pool;
      const serviceModel = new Service(pool);
      const { id } = req.params;
      const service = await serviceModel.deleteService(id);
      if (!service) {
        return res.status(404).json({ error: "Dịch vụ không tồn tại" });
      }
      res.json({ message: "Xóa dịch vụ thành công" });
    } catch (err) {
      console.error("Lỗi khi xóa dịch vụ:", err.stack);
      res.status(500).json({ error: "Lỗi máy chủ nội bộ: " + err.message });
    }
  }
);

module.exports = router;
