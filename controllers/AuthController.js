const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const config = require("../config");

class AuthController {
  constructor(pool) {
    this.pool = pool;
  }

  // ----- Render form đăng ký -----
  async getRegisterPage(req, res) {
    try {
      res.render("dangky", { session: req.session || {} });
    } catch (err) {
      console.error("Error rendering register page:", err.stack);
      res.status(500).send("Lỗi khi tải trang đăng ký");
    }
  }

  // ----- Xử lý đăng ký -----
  async register(req, res) {
    if (!req.body) {
      return res.status(400).json({ error: "Dữ liệu đầu vào không hợp lệ" });
    }

    const { username, email, password, role, phone } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        error: "Tên đăng nhập, email và mật khẩu không được để trống",
      });
    }

    try {
      // Kiểm tra username/email đã tồn tại chưa
      const checkUser = await this.pool.query(
        "SELECT id FROM public.users WHERE username = $1 OR email = $2",
        [username, email]
      );

      if (checkUser.rows.length > 0) {
        return res
          .status(400)
          .json({ error: "Tên đăng nhập hoặc email đã tồn tại" });
      }

      // Mã hóa mật khẩu
      const hashedPassword = await bcrypt.hash(password, 10);

      // Nếu không truyền role thì mặc định là user
      const finalRole =
        role && ["user", "owner", "admin"].includes(role) ? role : "user";

      // Tạo user mới
      const result = await this.pool.query(
        `INSERT INTO public.users (username, email, password, phone, role) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [username, email, hashedPassword, phone || null, finalRole]
      );

      console.log("Registered user:", result.rows[0]);
      res.redirect("/dangnhap");
    } catch (err) {
      console.error("Error registering user:", err.message);
      res.status(500).json({ error: "Lỗi khi đăng ký: " + err.message });
    }
  }

  // ----- Render form đăng nhập -----
  async getLoginPage(req, res) {
    try {
      res.render("dangnhap", { session: req.session || {} });
    } catch (err) {
      console.error("Error rendering login page:", err.stack);
      res.status(500).send("Lỗi khi tải trang đăng nhập");
    }
  }

  // ----- Xử lý đăng nhập -----
  async login(req, res) {
    if (!req.body) {
      return res.status(400).json({ error: "Dữ liệu đầu vào không hợp lệ" });
    }

    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Tên đăng nhập và mật khẩu không được để trống" });
    }

    try {
      const result = await this.pool.query(
        "SELECT * FROM public.users WHERE username = $1",
        [username]
      );

      const user = result.rows[0];
      if (!user) {
        return res.status(401).json({ error: "Tên đăng nhập không tồn tại" });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ error: "Mật khẩu không đúng" });
      }

      // Tạo token
      const token = jwt.sign(
        { user_id: user.id, role: user.role },
        config.jwt.secret,
        { expiresIn: "1h" }
      );

      req.session.token = token;
      req.session.user_id = user.id;
      req.session.role = user.role;

      console.log(`✅ ${user.role} đăng nhập thành công:`, user.username);

      // Điều hướng theo role
      if (user.role === "admin") {
        res.redirect("/");
      } else if (user.role === "owner") {
        res.redirect("/owner/chusan_datsan");
      } else {
        res.redirect("/");
      }
    } catch (err) {
      console.error("Error logging in:", err.stack);
      res.status(500).json({ error: "Lỗi khi đăng nhập: " + err.message });
    }
  }
}

module.exports = AuthController;
