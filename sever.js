const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const session = require("express-session");
const path = require("path");
const config = require("./config");
const fieldRoutes = require("./routes/fields");
const bookingRoutes = require("./routes/bookings");
const authRoutes = require("./routes/auth");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "static")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "templates"));
app.use(session(config.session));

// Kết nối database
const pool = new Pool(config.database);
pool.connect((err) => {
  if (err) {
    console.error("Lỗi kết nối cơ sở dữ liệu:", err.stack);
    process.exit(1);
  }
  console.log("Kết nối cơ sở dữ liệu thành công");
  app.locals.pool = pool;
});

// Định tuyến
app.use("/", fieldRoutes);
app.use("/", bookingRoutes);
app.use("/", authRoutes);

// Health check
app.get("/health", async (req, res) => {
  try {
    await app.locals.pool.query("SELECT 1");
    res.json({ status: "Kết nối cơ sở dữ liệu thành công" });
  } catch (err) {
    console.error(err.stack);
    res
      .status(500)
      .json({ error: "Lỗi kết nối cơ sở dữ liệu: " + err.message });
  }
});

app.listen(config.server.port, () => {
  console.log(`Server chạy tại http://localhost:${config.server.port}`);
});
