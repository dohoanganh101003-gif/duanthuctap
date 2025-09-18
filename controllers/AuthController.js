const jwt = require("jsonwebtoken");
const User = require("../models/User");
const config = require("../config");

class AuthController {
  constructor(pool) {
    this.userModel = new User(pool);
  }

  async getRegisterPage(req, res) {
    try {
      res.render("dangky", { session: req.session || {} });
    } catch (err) {
      console.error(err.stack);
      res.status(500).send("Lỗi khi tải trang đăng ký");
    }
  }

  async getLoginPage(req, res) {
    try {
      res.render("dangnhap", { session: req.session || {} });
    } catch (err) {
      console.error(err.stack);
      res.status(500).send("Lỗi khi tải trang đăng nhập");
    }
  }

  async register(req, res) {
    const { username, email, password, phone, role } = req.body;
    try {
      if (!["admin", "user"].includes(role)) {
        return res.status(400).json({ error: "Vai trò không hợp lệ" });
      }
      await this.userModel.createUser({
        username,
        email,
        password,
        phone,
        role,
      });
      res.redirect("/dangnhap");
    } catch (err) {
      console.error("Lỗi khi đăng ký:", err.stack);
      res.status(500).send("Lỗi khi đăng ký");
    }
  }

  async login(req, res) {
    const { username, password } = req.body;
    try {
      const user = await this.userModel.getUserByUsername(username);
      if (!user) {
        return res.status(400).send("Người dùng không tồn tại");
      }
      const validPassword = await require("bcryptjs").compare(
        password,
        user.password_hash
      );
      if (!validPassword) {
        return res.status(400).send("Mật khẩu không đúng");
      }
      const token = jwt.sign(
        { user_id: user.id, username: user.username, role: user.role },
        config.jwt.secret,
        { expiresIn: "1h" }
      );
      req.session.token = token;
      req.session.user_id = user.id;
      req.session.role = user.role;
      res.redirect("/");
    } catch (err) {
      console.error("Lỗi khi đăng nhập:", err.stack);
      res.status(500).send("Lỗi khi đăng nhập");
    }
  }

  async logout(req, res) {
    req.session.destroy((err) => {
      if (err) {
        console.error("Lỗi khi đăng xuất:", err.stack);
        res.status(500).send("Lỗi khi đăng xuất");
      }
      res.redirect("/dangnhap");
    });
  }
}

module.exports = AuthController;
