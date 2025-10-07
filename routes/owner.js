const express = require("express");
const router = express.Router();
const {
  authenticateToken,
  checkOwner,
} = require("../middlewares/authMiddleware");

// Middleware kiểm tra role owner
function checkRoleOwner(req, res, next) {
  if (req.user?.role !== "owner") {
    return res.status(403).send("Chỉ chủ sân mới có quyền truy cập");
  }
  next();
}

// Trang quản lý dịch vụ cho chủ sân
router.get(
  "/chusan_dichvu",
  authenticateToken,
  checkRoleOwner,
  async (req, res) => {
    try {
      const pool = req.app.locals.pool;

      const result = await pool.query(
        `SELECT s.*, f.name as field_name
       FROM service s
       JOIN fields f ON s.field_id = f.id
       WHERE f.owner_id = $1`,
        [req.user.user_id]
      );

      res.render("chusan_dichvu", {
        services: result.rows,
        session: req.session,
      });
    } catch (err) {
      console.error("Lỗi lấy danh sách dịch vụ cho chủ sân:", err);
      res.status(500).send("Lỗi server");
    }
  }
);

// Trang quản lý đặt sân
router.get(
  "/chusan_datsan",
  authenticateToken,
  checkRoleOwner,
  async (req, res) => {
    try {
      const pool = req.app.locals.pool;
      const ownerId = req.user.user_id;

      const result = await pool.query(
        `SELECT b.id, b.start_time, b.end_time, b.total_price, b.status,
              u.username AS username,
              sf.name AS sub_field_name,
              f.name AS field_name
       FROM booking b
       JOIN users u ON b.user_id = u.id
       JOIN sub_fields sf ON b.sub_field_id = sf.id
       JOIN fields f ON sf.field_id = f.id
       WHERE f.owner_id = $1
       ORDER BY b.created_at DESC`,
        [ownerId]
      );

      res.render("chusan_datsan", {
        bookings: result.rows,
        session: req.session,
      });
    } catch (err) {
      console.error("Lỗi lấy danh sách booking cho chủ sân:", err);
      res.status(500).send("Lỗi server khi lấy danh sách đặt sân");
    }
  }
);

// Trang lịch sử đặt sân (đã duyệt / huỷ)
router.get(
  "/chusan_lichsu",
  authenticateToken,
  checkRoleOwner,
  async (req, res) => {
    try {
      const pool = req.app.locals.pool;
      const ownerId = req.user.user_id;

      const result = await pool.query(
        `SELECT b.id, b.start_time, b.end_time, b.total_price, b.status,
              u.username,
              sf.name AS sub_field_name,
              f.name AS field_name
       FROM booking b
       JOIN users u ON b.user_id = u.id
       JOIN sub_fields sf ON b.sub_field_id = sf.id
       JOIN fields f ON sf.field_id = f.id
       WHERE f.owner_id = $1 AND b.status IN ('confirmed','cancelled')
       ORDER BY b.created_at DESC`,
        [ownerId]
      );

      res.render("chusan_lichsu", {
        history: result.rows,
        session: req.session,
      });
    } catch (err) {
      console.error("Lỗi lấy lịch sử đặt sân cho chủ sân:", err);
      res.status(500).send("Lỗi server");
    }
  }
);

// API: Chủ sân cập nhật trạng thái booking (chấp nhận / từ chối)
router.put(
  "/chusan_booking/:id/status",
  authenticateToken,
  checkOwner,
  async (req, res) => {
    try {
      const pool = req.app.locals.pool;
      const { status } = req.body;
      const bookingId = req.params.id;

      await pool.query("UPDATE booking SET status = $1 WHERE id = $2", [
        status,
        bookingId,
      ]);

      res.redirect("/owner/chusan_datsan");
    } catch (err) {
      console.error("Lỗi cập nhật trạng thái booking:", err);
      res.status(500).send("Lỗi server khi cập nhật trạng thái");
    }
  }
);

module.exports = router;
