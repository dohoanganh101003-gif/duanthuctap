const express = require("express");
const router = express.Router();
const SubFieldController = require("../controllers/SubFieldController");
const {
  authenticateToken,
  checkAdmin,
  checkOwner,
} = require("../middlewares/authMiddleware");

router.use((req, res, next) => {
  req.controller = new SubFieldController(req.app.locals.pool);
  next();
});

// ========== ADMIN ==========
router.get("/api/sancon/:field_id", authenticateToken, checkAdmin, (req, res) =>
  req.controller.getByFieldId(req, res)
);

router.post("/api/sancon", authenticateToken, checkAdmin, (req, res) =>
  req.controller.create(req, res)
);

router.put("/api/sancon/:id", authenticateToken, checkAdmin, (req, res) =>
  req.controller.update(req, res)
);

router.delete("/api/sancon/:id", authenticateToken, checkAdmin, (req, res) =>
  req.controller.delete(req, res)
);

// ========== OWNER ==========
router.get(
  "/owner/api/sub_fields/:field_id",
  authenticateToken,
  checkOwner,
  (req, res) => req.controller.getByFieldIdOwner(req, res)
);

router.post(
  "/owner/api/sub_fields",
  authenticateToken,
  checkOwner,
  (req, res) => req.controller.createByOwner(req, res)
);

router.put(
  "/owner/api/sub_fields/:id",
  authenticateToken,
  checkOwner,
  (req, res) => req.controller.updateByOwner(req, res)
);

router.delete(
  "/owner/api/sub_fields/:id",
  authenticateToken,
  checkOwner,
  (req, res) => req.controller.deleteByOwner(req, res)
);

module.exports = router;
