const bcrypt = require("bcryptjs");

class AdminUserController {
  constructor(pool) {
    this.pool = pool;
  }

  // ======= HIỂN THỊ DANH SÁCH NGƯỜI DÙNG =======
  async getAllUsers(req, res) {
    try {
      const result = await this.pool.query(
        "SELECT id, username, email, phone, role, status FROM public.users ORDER BY id ASC"
      );
      const users = result.rows;

      res.render("admin_users", {
        session: req.session || {},
        users,
      });
    } catch (err) {
      console.error("Lỗi khi lấy danh sách người dùng:", err);
      res.status(500).send("Lỗi khi tải danh sách người dùng");
    }
  }

  // ======= XEM CHI TIẾT MỘT NGƯỜI DÙNG =======
  async getUserById(req, res) {
    const { id } = req.params;
    try {
      const result = await this.pool.query(
        "SELECT id, username, email, phone, role, status FROM public.users WHERE id = $1",
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).send("Không tìm thấy người dùng");
      }

      const user = result.rows[0];
      res.render("admin_user_edit", {
        session: req.session || {},
        user,
      });
    } catch (err) {
      console.error("Lỗi khi lấy chi tiết người dùng:", err);
      res.status(500).send("Lỗi khi tải chi tiết người dùng");
    }
  }

  // ======= CẬP NHẬT THÔNG TIN NGƯỜI DÙNG =======
  async updateUser(req, res) {
    const { id } = req.params;
    const { username, email, phone, role, status } = req.body;

    try {
      await this.pool.query(
        `UPDATE public.users 
         SET username=$1, email=$2, phone=$3, role=$4, status=$5, updated_at=NOW()
         WHERE id=$6`,
        [username, email, phone, role, status, id]
      );

      res.redirect("/admin/users");
    } catch (err) {
      console.error("Lỗi khi cập nhật người dùng:", err);
      res.status(500).send("Lỗi khi cập nhật người dùng");
    }
  }

  async changeRole(req, res) {
    const { id } = req.params;
    const { newRole } = req.body;

    try {
      await this.pool.query(
        "UPDATE public.users SET role=$1, updated_at=NOW() WHERE id=$2",
        [newRole, id]
      );
      res.redirect("/admin/users");
    } catch (err) {
      console.error("Lỗi khi đổi role người dùng:", err);
      res.status(500).send("Lỗi khi đổi role người dùng");
    }
  }

  // ======= KHÓA / MỞ KHÓA NGƯỜI DÙNG =======
  async changeStatus(req, res) {
    const { id } = req.params;
    const { newStatus } = req.body;

    try {
      await this.pool.query(
        "UPDATE public.users SET status=$1, updated_at=NOW() WHERE id=$2",
        [newStatus, id]
      );
      res.redirect("/admin/users");
    } catch (err) {
      console.error("Lỗi khi đổi trạng thái người dùng:", err);
      res.status(500).send("Lỗi khi đổi trạng thái người dùng");
    }
  }

  // =======  XÓA NGƯỜI DÙNG =======
  async deleteUser(req, res) {
    const { id } = req.params;

    try {
      await this.pool.query(
        "UPDATE public.users SET status='deleted', updated_at=NOW() WHERE id=$1",
        [id]
      );
      res.redirect("/admin/users");
    } catch (err) {
      console.error("Lỗi khi xóa người dùng:", err);
      res.status(500).send("Lỗi khi xóa người dùng");
    }
  }
  // ======= HIỂN THỊ FORM TẠO NGƯỜI DÙNG =======
  async showCreateForm(req, res) {
    try {
      res.render("admin_user_create", {
        session: req.session || {},
      });
    } catch (err) {
      console.error("Lỗi khi hiển thị form tạo người dùng:", err);
      res.status(500).send("Lỗi khi tải form tạo người dùng");
    }
  }

  // ======= TẠO NGƯỜI DÙNG =======
  async createUser(req, res) {
    const { username, email, phone, password, role } = req.body;

    // cơ bản validate nhỏ
    if (!username || !email || !password) {
      return res.status(400).send("Vui lòng nhập username, email và password.");
    }

    try {
      // kiểm tra email hoặc username đã tồn tại (nên có)
      const existing = await this.pool.query(
        "SELECT id FROM public.users WHERE email=$1 OR username=$2",
        [email, username]
      );
      if (existing.rows.length > 0) {
        return res.status(400).send("Username hoặc email đã tồn tại.");
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await this.pool.query(
        `INSERT INTO public.users (username, email, phone, password, role, status, created_at) 
       VALUES ($1, $2, $3, $4, $5, 'active', NOW())`,
        [username, email, phone || null, hashedPassword, role || "user"]
      );

      res.redirect("/admin/users");
    } catch (err) {
      console.error("Lỗi khi tạo người dùng:", err);
      res.status(500).send("Lỗi khi tạo người dùng");
    }
  }
}

module.exports = AdminUserController;
