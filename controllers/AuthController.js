const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const config = require("../config");

class AuthController {
  constructor(pool) {
    console.log("AuthController pool:", pool); // Debug
    this.pool = pool;
  }

  async getRegisterPage(req, res) {
    try {
      res.render("dangky", { session: req.session || {} });
    } catch (err) {
      console.error("Error rendering register page:", err.stack);
      res.status(500).send("Lỗi khi tải trang đăng ký");
    }
  }

  async register(req, res) {
    console.log("req.body in register:", req.body); // Debug
    if (!req.body) {
      console.error("Error: req.body is undefined in register");
      return res.status(400).json({ error: "Dữ liệu đầu vào không hợp lệ" });
    }
    const { username, email, password, role } = req.body;
    if (!username || !email || !password) {
      console.error("Error: missing required fields in register", {
        username,
        email,
        password,
      });
      return res.status(400).json({
        error: "Tên đăng nhập, email và mật khẩu không được để trống",
      });
    }
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await this.pool.query(
        "INSERT INTO public.users (username, email, password, role, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING *",
        [username, email, hashedPassword, role || "user"]
      );
      console.log("Registered user:", result.rows[0]);
      res.redirect("/dangnhap");
    } catch (err) {
      console.error("Error registering user:", err.stack);
      res.status(500).json({ error: "Lỗi khi đăng ký: " + err.message });
    }
  }

  async getLoginPage(req, res) {
    try {
      res.render("dangnhap", { session: req.session || {} });
    } catch (err) {
      console.error("Error rendering login page:", err.stack);
      res.status(500).send("Lỗi khi tải trang đăng nhập");
    }
  }

  async login(req, res) {
    console.log("req.body in login:", req.body); // Debug
    if (!req.body) {
      console.error("Error: req.body is undefined in login");
      return res.status(400).json({ error: "Dữ liệu đầu vào không hợp lệ" });
    }
    const { username, password } = req.body;
    if (!username || !password) {
      console.error("Error: username or password is missing", {
        username,
        password,
      });
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
        console.error("Error: user not found for username:", username);
        return res.status(401).json({ error: "Tên đăng nhập không tồn tại" });
      }
      if (
        !user.password ||
        typeof user.password !== "string" ||
        !user.password.startsWith("$2b$")
      ) {
        console.error(
          "Error: invalid password format for user:",
          username,
          user.password
        );
        return res
          .status(500)
          .json({ error: "Mật khẩu trong cơ sở dữ liệu không hợp lệ" });
      }
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        console.error("Error: password does not match for username:", username);
        return res.status(401).json({ error: "Mật khẩu không đúng" });
      }
      const token = jwt.sign(
        { user_id: user.id, role: user.role },
        config.jwt.secret,
        { expiresIn: "1h" }
      );
      req.session.token = token;
      req.session.user_id = user.id;
      req.session.role = user.role;
      console.log("Login successful, token:", token);
      res.redirect("/");
    } catch (err) {
      console.error("Error logging in:", err.stack);
      res.status(500).json({ error: "Lỗi khi đăng nhập: " + err.message });
    }
  }
}

module.exports = AuthController;
