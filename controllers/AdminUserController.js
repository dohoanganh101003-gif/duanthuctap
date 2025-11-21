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
}

module.exports = AdminUserController;
