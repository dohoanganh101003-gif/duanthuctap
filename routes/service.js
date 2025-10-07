const express = require("express");
const router = express.Router();
const {
  authenticateToken,
  checkAdmin,
  checkOwner,
  checkAdminOrOwner,
} = require("../middlewares/authMiddleware");

//Danh sách dịch vụ (Admin xem tất cả, Owner chỉ xem dịch vụ của mình)
router.get(
  "/danhsach-dichvu",
  authenticateToken,
  checkAdminOrOwner,
  async (req, res) => {
    try {
      const pool = req.app.locals.pool;
      let result;

      if (req.user.role === "admin") {
        // Admin thấy tất cả
        result = await pool.query(`
        SELECT s.*, f.name as field_name
        FROM service s
        JOIN fields f ON s.field_id = f.id
        ORDER BY s.created_at DESC
      `);
      } else if (req.user.role === "owner") {
        // Owner chỉ thấy dịch vụ sân mình
        result = await pool.query(
          `
        SELECT s.*, f.name as field_name
        FROM service s
        JOIN fields f ON s.field_id = f.id
        WHERE f.owner_id = $1
        ORDER BY s.created_at DESC
      `,
          [req.user.user_id]
        );
      }

      res.render("danhsach-dichvu", {
        services: result.rows,
        session: req.session,
      });
    } catch (err) {
      console.error("❌ Lỗi lấy danh sách dịch vụ:", err);
      res.status(500).send("Lỗi server khi lấy danh sách dịch vụ");
    }
  }
);

//Trang thêm dịch vụ
router.get(
  "/them_dichvu",
  authenticateToken,
  checkAdminOrOwner,
  async (req, res) => {
    try {
      const pool = req.app.locals.pool;
      let fields;

      if (req.user.role === "admin") {
        fields = await pool.query("SELECT id, name FROM fields");
      } else {
        fields = await pool.query(
          "SELECT id, name FROM fields WHERE owner_id = $1",
          [req.user.user_id]
        );
      }

      res.render("them_dichvu", {
        fields: fields.rows,
        session: req.session,
      });
    } catch (err) {
      console.error("❌ Lỗi load trang thêm dịch vụ:", err);
      res.status(500).send("Lỗi server");
    }
  }
);

//Xử lý thêm dịch vụ
router.post(
  "/them_dichvu",
  authenticateToken,
  checkAdminOrOwner,
  async (req, res) => {
    try {
      const pool = req.app.locals.pool;
      const { field_id, name, description, price } = req.body;

      // Nếu owner thì phải kiểm tra sân có thuộc về mình không
      if (req.user.role === "owner") {
        const checkField = await pool.query(
          "SELECT id FROM fields WHERE id=$1 AND owner_id=$2",
          [field_id, req.user.user_id]
        );
        if (checkField.rows.length === 0) {
          return res
            .status(403)
            .send("Bạn không thể thêm dịch vụ cho sân không thuộc về bạn");
        }
      }

      await pool.query(
        "INSERT INTO service (field_id, name, description, price) VALUES ($1,$2,$3,$4)",
        [field_id, name, description, price]
      );

      res.redirect("/danhsach-dichvu");
    } catch (err) {
      console.error("❌ Lỗi thêm dịch vụ:", err);
      res.status(500).send("Lỗi server khi thêm dịch vụ");
    }
  }
);

router.post(
  "/api/dichvu",
  authenticateToken,
  checkAdminOrOwner,
  async (req, res) => {
    try {
      const pool = req.app.locals.pool;
      const { field_id, name, description, price } = req.body;
      await pool.query(
        "INSERT INTO service (field_id, name, description, price) VALUES ($1,$2,$3,$4)",
        [field_id, name, description, price]
      );
      res.status(201).json({ message: "Thêm dịch vụ thành công" });
    } catch (err) {
      console.error("❌ Lỗi thêm dịch vụ:", err);
      res.status(500).json({ error: "Lỗi server" });
    }
  }
);

//Trang sửa dịch vụ
router.get(
  "/sua_dichvu/:id",
  authenticateToken,
  checkAdminOrOwner,
  async (req, res) => {
    try {
      const pool = req.app.locals.pool;
      const { id } = req.params;

      const result = await pool.query("SELECT * FROM service WHERE id=$1", [
        id,
      ]);
      if (result.rows.length === 0) {
        return res.status(404).send("Dịch vụ không tồn tại");
      }

      let fields;
      if (req.user.role === "admin") {
        fields = await pool.query("SELECT id, name FROM fields");
      } else {
        fields = await pool.query(
          "SELECT id, name FROM fields WHERE owner_id = $1",
          [req.user.user_id]
        );
      }

      res.render("sua_dichvu", {
        service: result.rows[0],
        fields: fields.rows,
        session: req.session,
      });
    } catch (err) {
      console.error("❌ Lỗi load trang sửa dịch vụ:", err);
      res.status(500).send("Lỗi server");
    }
  }
);

// Xử lý sửa dịch vụ
router.post(
  "/sua_dichvu/:id",
  authenticateToken,
  checkAdminOrOwner,
  async (req, res) => {
    try {
      const pool = req.app.locals.pool;
      const { id } = req.params;
      const { field_id, name, description, price } = req.body;

      if (req.user.role === "owner") {
        const checkService = await pool.query(
          `
        SELECT s.id 
        FROM service s 
        JOIN fields f ON s.field_id = f.id
        WHERE s.id=$1 AND f.owner_id=$2
      `,
          [id, req.user.user_id]
        );
        if (checkService.rows.length === 0) {
          return res.status(403).send("Bạn không có quyền sửa dịch vụ này");
        }
      }

      await pool.query(
        "UPDATE service SET field_id=$1, name=$2, description=$3, price=$4 WHERE id=$5",
        [field_id, name, description, price, id]
      );

      res.redirect("/danhsach-dichvu");
    } catch (err) {
      console.error("❌ Lỗi sửa dịch vụ:", err);
      res.status(500).send("Lỗi server khi sửa dịch vụ");
    }
  }
);

// Xóa dịch vụ
router.post(
  "/xoa_dichvu/:id",
  authenticateToken,
  checkAdminOrOwner,
  async (req, res) => {
    try {
      const pool = req.app.locals.pool;
      const { id } = req.params;

      if (req.user.role === "owner") {
        const checkService = await pool.query(
          `
        SELECT s.id 
        FROM service s 
        JOIN fields f ON s.field_id = f.id
        WHERE s.id=$1 AND f.owner_id=$2
      `,
          [id, req.user.user_id]
        );
        if (checkService.rows.length === 0) {
          return res.status(403).send("Bạn không có quyền xóa dịch vụ này");
        }
      }

      await pool.query("DELETE FROM service WHERE id=$1", [id]);
      res.redirect("/danhsach-dichvu");
    } catch (err) {
      console.error("❌ Lỗi xóa dịch vụ:", err);
      res.status(500).send("Lỗi server khi xóa dịch vụ");
    }
  }
);
// ===== API SỬA DỊCH VỤ (dành cho fetch PUT) =====
router.put(
  "/api/dichvu/:id",
  authenticateToken,
  checkAdminOrOwner,
  async (req, res) => {
    try {
      const pool = req.app.locals.pool;
      const { id } = req.params;
      const { field_id, name, description, price } = req.body;

      if (req.user.role === "owner") {
        const checkService = await pool.query(
          `SELECT s.id FROM service s 
           JOIN fields f ON s.field_id = f.id
           WHERE s.id=$1 AND f.owner_id=$2`,
          [id, req.user.user_id]
        );
        if (checkService.rows.length === 0)
          return res
            .status(403)
            .json({ error: "Bạn không có quyền sửa dịch vụ này" });
      }

      await pool.query(
        `UPDATE service 
         SET field_id=$1, name=$2, description=$3, price=$4 
         WHERE id=$5`,
        [field_id, name, description, price, id]
      );

      res.redirect("/danhsach-dichvu");
    } catch (err) {
      console.error("❌ Lỗi sửa dịch vụ:", err);
      res.status(500).json({ error: "Lỗi server khi sửa dịch vụ" });
    }
  }
);
// ===== API XOÁ DỊCH VỤ (dành cho fetch DELETE) =====
router.delete(
  "/api/dichvu/:id",
  authenticateToken,
  checkAdminOrOwner,
  async (req, res) => {
    try {
      const pool = req.app.locals.pool;
      const { id } = req.params;

      // Nếu là chủ sân thì kiểm tra quyền
      if (req.user.role === "owner") {
        const checkService = await pool.query(
          `SELECT s.id 
           FROM service s 
           JOIN fields f ON s.field_id = f.id
           WHERE s.id=$1 AND f.owner_id=$2`,
          [id, req.user.user_id]
        );

        if (checkService.rows.length === 0) {
          return res.status(403).json({
            error: "Bạn không có quyền xóa dịch vụ này",
          });
        }
      }

      // Tiến hành xóa dịch vụ
      const result = await pool.query("DELETE FROM service WHERE id=$1", [id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Không tìm thấy dịch vụ để xóa" });
      }

      res.status(200).json({ message: "Xóa dịch vụ thành công" });
    } catch (err) {
      console.error("❌ Lỗi khi xóa dịch vụ:", err);
      res.status(500).json({ error: "Lỗi server khi xóa dịch vụ" });
    }
  }
);

module.exports = router;
