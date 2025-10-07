const jwt = require("jsonwebtoken");
const config = require("../config");

// Xác thực người dùng bằng JWT
const authenticateToken = (req, res, next) => {
  const token = req.session.token;

  if (!token) {
    console.log("Không có token -> chuyển hướng login");
    return res.redirect("/dangnhap");
  }

  jwt.verify(token, config.jwt.secret, (err, user) => {
    if (err) {
      console.error("JWT verify error:", err.message);
      return res.redirect("/dangnhap");
    }

    req.user = user;
    req.session.user_id = user.user_id;
    req.session.role = user.role;
    next();
  });
};

// Chỉ admin mới được quyền
const checkAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Chỉ admin mới có quyền truy cập" });
  }
  next();
};

// Chỉ chủ sân mới được quyền, và phải đúng sân họ sở hữu
// Chỉ chủ sân mới được quyền, và phải đúng sân họ sở hữu
const checkOwner = async (req, res, next) => {
  try {
    if (req.user?.role !== "owner") {
      return res.status(403).json({ error: "Chỉ chủ sân mới có quyền" });
    }

    const pool = req.app.locals.pool;
    let fieldId = req.body.field_id || req.params.field_id;
    const bookingId = req.params.id;

    // Nếu có field_id truyền trực tiếp thì kiểm tra theo field_id
    if (fieldId) {
      const result = await pool.query(
        "SELECT id FROM fields WHERE id = $1 AND owner_id = $2",
        [fieldId, req.user.user_id]
      );
      if (result.rows.length === 0) {
        return res.status(403).json({ error: "Bạn không phải chủ sân này" });
      }
      return next();
    }

    // Nếu không có field_id mà chỉ có bookingId → kiểm tra thông qua bảng booking
    if (bookingId) {
      const check = await pool.query(
        `SELECT f.owner_id
         FROM booking b
         JOIN sub_fields sf ON b.sub_field_id = sf.id
         JOIN fields f ON sf.field_id = f.id
         WHERE b.id = $1`,
        [bookingId]
      );

      if (check.rows.length === 0) {
        return res.status(404).json({ error: "Booking không tồn tại" });
      }

      if (check.rows[0].owner_id !== req.user.user_id) {
        return res.status(403).json({ error: "Bạn không phải chủ sân này" });
      }
      return next();
    }

    return res
      .status(400)
      .json({ error: "Thiếu thông tin để xác minh chủ sân" });
  } catch (err) {
    console.error("Lỗi checkOwner:", err);
    res.status(500).json({ error: "Lỗi server khi kiểm tra chủ sân" });
  }
};

// Cho phép cả admin và chủ sân
const checkAdminOrOwner = (req, res, next) => {
  if (req.user?.role === "admin" || req.user?.role === "owner") {
    return next();
  }
  return res.status(403).json({ error: "Chỉ admin hoặc chủ sân mới có quyền" });
};

module.exports = {
  authenticateToken,
  checkAdmin,
  checkOwner,
  checkAdminOrOwner,
};
