const express = require("express");
const router = express.Router();
const ServiceController = require("../controllers/ServiceController");
const {
  authenticateToken,
  checkOwner,
  checkAdminOrOwner,
} = require("../middlewares/authMiddleware");

router.use((req, res, next) => {
  req.controller = new ServiceController(req.app.locals.pool);
  next();
});

// ===================== XEM DỊCH VỤ THEO SÂN BÓNG =====================
router.get("/xem_dichvu/:field_id", (req, res) =>
  req.controller.renderFieldServices(req, res)
);

router.post("/api/dichvu", authenticateToken, checkAdminOrOwner, (req, res) =>
  req.controller.createService(req, res)
);

router.put(
  "/api/dichvu/:id",
  authenticateToken,
  checkAdminOrOwner,
  (req, res) => req.controller.updateService(req, res)
);

router.delete(
  "/api/dichvu/:id",
  authenticateToken,
  checkAdminOrOwner,
  (req, res) => req.controller.deleteService(req, res)
);

// ===================== ADMIN =====================
router.get(
  "/danhsach-dichvu",
  authenticateToken,
  checkAdminOrOwner,
  (req, res) => req.controller.getAllServices(req, res)
);

router.get("/them_dichvu", authenticateToken, checkAdminOrOwner, (req, res) =>
  req.controller.renderAddService(req, res)
);

router.post("/them_dichvu", authenticateToken, checkAdminOrOwner, (req, res) =>
  req.controller.createService(req, res)
);

router.get(
  "/sua_dichvu/:id",
  authenticateToken,
  checkAdminOrOwner,
  (req, res) => req.controller.renderEditService(req, res)
);

router.post(
  "/sua_dichvu/:id",
  authenticateToken,
  checkAdminOrOwner,
  (req, res) => req.controller.updateService(req, res)
);

// ===================== OWNER =====================
router.get("/owner/chusan_dichvu", authenticateToken, checkOwner, (req, res) =>
  req.controller.getOwnerServices(req, res)
);

router.get(
  "/owner/chusan_them_dichvu",
  authenticateToken,
  checkOwner,
  (req, res) => req.controller.showAddForm(req, res)
);

router.post(
  "/owner/chusan_them_dichvu",
  authenticateToken,
  checkOwner,
  (req, res) => req.controller.addServiceByOwner(req, res)
);

router.get(
  "/owner/chusan_sua_dichvu/:id",
  authenticateToken,
  checkOwner,
  (req, res) => req.controller.showEditForm(req, res)
);

router.post(
  "/owner/chusan_sua_dichvu/:id",
  authenticateToken,
  checkOwner,
  (req, res) => req.controller.updateServiceByOwner(req, res)
);

router.delete(
  "/owner/chusan_xoa_dichvu/:id",
  authenticateToken,
  checkOwner,
  (req, res) => req.controller.deleteServiceByOwner(req, res)
);

module.exports = router;
