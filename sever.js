const express = require("express");
const session = require("express-session");
const path = require("path");
const cors = require("cors");
const { Pool } = require("pg");
const config = require("./config");
const methodOverride = require("method-override");
const FieldController = require("./controllers/FieldController");
const BookingController = require("./controllers/BookingController");
// Import routes
const authRoutes = require("./routes/auth");
const fieldRoutes = require("./routes/fields");
const bookingsRoutes = require("./routes/bookings");
const serviceRoutes = require("./routes/service");
const ownerRoutes = require("./routes/owner");
const subFieldRoutes = require("./routes/subFields");
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "static")));
app.use("/scripts", express.static(path.join(__dirname, "scripts")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(
  session({
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 },
  })
);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "templates"));

// Database
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "quanlysanbong",
  password: "123456",
  port: 5432,
});
// Trang chủ
app.get("/", (req, res) => {
  const fieldController = new FieldController(pool);
  fieldController.getHomePage(req, res);
});

// Kiểm tra kết nối DB
pool.connect((err) => {
  if (err) {
    console.error("Database connection error:", err.stack);
    process.exit(1);
  }
  console.log("Em chào đại ca Hoàng Anh");
  app.locals.pool = pool;
});
const bookingController = new BookingController(pool);

// Routes
app.use("/", serviceRoutes);
app.use("/", authRoutes);
app.use("/", fieldRoutes);
app.use("/", bookingsRoutes);
app.use("/owner", ownerRoutes);
app.use("/", subFieldRoutes);

// Route thêm sân bóng
app.get("/them_sanbong", (req, res) => {
  if (!req.session.user_id || req.session.role !== "admin") {
    return res.redirect("/dangnhap");
  }
  res.render("them_sanbong", { session: req.session });
});

// Route sửa sân bóng
app.get("/sua_sanbong/:id", async (req, res) => {
  if (!req.session.user_id || req.session.role !== "admin") {
    return res.redirect("/dangnhap");
  }
  try {
    const fieldController = new FieldController(pool);
    const fields = await fieldController.fieldModel.getAllFields({
      id: req.params.id,
    });
    if (fields.length === 0) {
      return res.status(404).send("Sân bóng không tồn tại!");
    }
    res.render("sua-sanbong", { session: req.session, field: fields[0] });
  } catch (err) {
    console.error("Lỗi khi lấy thông tin sân bóng:", err);
    res.status(500).send("Lỗi máy chủ!");
  }
});
app.get("/quanly_datsan", (req, res) => {
  bookingController.renderAdminBookings(req, res);
});
// Route xem dịch vụ theo từng sân
app.get("/xem_dichvu/:field_id", async (req, res) => {
  try {
    const { field_id } = req.params;

    const result = await pool.query(
      `SELECT s.*, f.name as field_name
       FROM service s
       JOIN fields f ON s.field_id = f.id
       WHERE f.id = $1`,
      [field_id]
    );

    res.render("danhsach-dichvu", {
      services: result.rows,
      session: req.session,
    });
  } catch (err) {
    console.error("❌ Lỗi khi load dịch vụ theo sân:", err);
    res.status(500).send("Lỗi server khi load dịch vụ");
  }
});

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

// 404 handler
app.use((req, res) => {
  res.status(404).send("❌ Không tìm thấy route: " + req.originalUrl);
});

// Start server
app.listen(3003, () => {
  console.log("Server chạy tại http://localhost:3003");
});
