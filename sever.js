const express = require("express");
const session = require("express-session");
const path = require("path");
const cors = require("cors");
const { Pool } = require("pg");
const methodOverride = require("method-override");
const config = require("./config");

// Controllers
const FieldController = require("./controllers/FieldController");

// Routes
const authRoutes = require("./routes/auth");
const fieldRoutes = require("./routes/fields");
const bookingRoutes = require("./routes/bookings");
const serviceRoutes = require("./routes/service");
const ownerRoutes = require("./routes/owner");
const subFieldRoutes = require("./routes/subFields");
const thongKeRoutesFactory = require("./routes/thongKe");
const adminUsersRoutes = require("./routes/admin_users");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(
  methodOverride(function (req, res) {
    if (req.query && typeof req.query._method === "string") {
      return req.query._method;
    }
    if (req.body && typeof req.body._method === "string") {
      return req.body._method;
    }
    return undefined;
  })
);

// Cấu hình session
app.use(
  session({
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 },
  })
);

app.use(express.static(path.join(__dirname, "static")));
app.use("/scripts", express.static(path.join(__dirname, "scripts")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "templates"));

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "quanlysanbong",
  password: "123456",
  port: 5432,
});

pool.connect((err) => {
  if (err) {
    console.error("Database connection error:", err.stack);
    process.exit(1);
  }
  console.log("Chào mừng cô đến với hệ thống quản lý sân bóng!");
  app.locals.pool = pool;
});

require("./cron/autoCleanup");

// Trang chủ
app.get("/", (req, res) => {
  const fieldController = new FieldController(pool);
  fieldController.getHomePage(req, res);
});

app.use("/", authRoutes);
app.use("/", fieldRoutes);
app.use("/", bookingRoutes);
app.use("/", serviceRoutes);
app.use("/owner", ownerRoutes);
app.use("/", subFieldRoutes);
app.use("/thongke", thongKeRoutesFactory(pool));
app.use("/admin/users", adminUsersRoutes);

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

app.use((req, res) => {
  res.status(404).send("Không tìm thấy route: " + req.originalUrl);
});

const PORT = 3003;
app.listen(PORT, () => {
  console.log(`Server chạy tại http://localhost:${PORT}`);
});
