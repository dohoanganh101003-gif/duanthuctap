// routes/subFields.js
const express = require("express");
const router = express.Router();
const SubField = require("../models/SubField");
const {
  authenticateToken,
  checkAdmin,
} = require("../middlewares/authMiddleware");

/**
 * Lấy danh sách sub-fields theo field chính
 * GET /api/sancon/:field_id
 */
router.get("/api/sancon/:field_id", async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const subFieldModel = new SubField(pool);
    const subs = await subFieldModel.getSubFieldsByFieldId(req.params.field_id);
    res.json(subs);
  } catch (err) {
    console.error("Lỗi lấy sân con:", err);
    res.status(500).json({ error: "Lỗi máy chủ khi lấy sân con" });
  }
});

/**
 * Thêm sân con
 * POST /api/sancon
 * Body JSON: { field_id, name, size }
 * (yêu cầu authenticateToken + checkAdmin)
 */
router.post("/api/sancon", authenticateToken, checkAdmin, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const subFieldModel = new SubField(pool);
    const { field_id, name, size } = req.body;

    if (!field_id || !name || !size) {
      return res
        .status(400)
        .json({ error: "Thiếu thông tin bắt buộc: field_id, name, size" });
    }

    // Lưu vào DB
    const created = await subFieldModel.createSubField({
      field_id,
      size,
      name,
    });
    res.status(201).json(created);
  } catch (err) {
    console.error("Lỗi thêm sân con:", err);
    res.status(500).json({ error: "Lỗi máy chủ khi thêm sân con" });
  }
});

/**
 * Cập nhật sân con
 * PUT /api/sancon/:id
 * Body JSON: { name, size, field_id? }
 */
router.put(
  "/api/sancon/:id",
  authenticateToken,
  checkAdmin,
  async (req, res) => {
    try {
      const pool = req.app.locals.pool;
      const subFieldModel = new SubField(pool);
      const { name, size, field_id } = req.body;
      const { id } = req.params;

      if (!name || !size) {
        return res
          .status(400)
          .json({ error: "Thiếu thông tin cập nhật: name và size" });
      }

      const updated = await subFieldModel.updateSubField(id, {
        field_id: field_id || null,
        size,
        name,
      });

      if (!updated)
        return res.status(404).json({ error: "Không tìm thấy sân con" });
      res.json(updated);
    } catch (err) {
      console.error("Lỗi cập nhật sân con:", err);
      res.status(500).json({ error: "Lỗi máy chủ khi cập nhật sân con" });
    }
  }
);

/**
 * Xóa sân con
 * DELETE /api/sancon/:id
 */
router.delete(
  "/api/sancon/:id",
  authenticateToken,
  checkAdmin,
  async (req, res) => {
    try {
      const pool = req.app.locals.pool;
      const subFieldModel = new SubField(pool);
      const { id } = req.params;

      const deleted = await subFieldModel.deleteSubField(id);
      if (!deleted)
        return res.status(404).json({ error: "Không tìm thấy sân con" });

      res.json({ message: "Xóa sân con thành công", deleted });
    } catch (err) {
      console.error("Lỗi xóa sân con:", err);
      res.status(500).json({ error: "Lỗi máy chủ khi xóa sân con" });
    }
  }
);

module.exports = router;
