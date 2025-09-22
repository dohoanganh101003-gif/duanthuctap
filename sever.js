const express = require("express");
const session = require("express-session");
const path = require("path");
const config = require("./config");
const { Pool } = require("pg");
const AuthController = require("./controllers/AuthController");

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 }, // 1 hour
  })
);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "templates"));

// Database
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "quanlysanbong",
  password: "123456", // Thay bằng mật khẩu đúng của user postgres
  port: 5432,
});

// Test database connection
pool.connect((err) => {
  if (err) {
    console.error("Database connection error:", err.stack);
  } else {
    console.log("Connected to database quanlysanbong");
  }
});

// Routes
const authController = new AuthController(pool);
app.get("/dangky", authController.getRegisterPage.bind(authController));
app.post("/dangky", authController.register.bind(authController));
app.get("/dangnhap", authController.getLoginPage.bind(authController));
app.post("/dangnhap", authController.login.bind(authController));

// Health check
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ status: "Database connected" });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Database connection failed: " + err.message });
  }
});

app.listen(3003, () => {
  console.log("Server chạy tại http://localhost:3003");
});
