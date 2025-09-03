const express = require("express");
const { Pool } = require("pg");
const app = express();
const port = 3003;

// Cấu hình PostgreSQL
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "quanlysanbong",
  password: "123456",
  port: 5432,
});
app.use(express.json()); 

// API kiểm tra kết nối CSDL
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "Database connected" });
  } catch (err) {
    console.error(err.stack);
    res
      .status(500)
      .json({ error: "Database connection failed: " + err.message });
  }
});

// API lấy danh sách sân và sân con
app.get("/fields", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT f.id, f.name, f.address, f.latitude, f.longitude, f.price_per_hour, f.surface_type, 
             s.id AS sub_field_id, s.name AS sub_field_name, s.size
      FROM fields f
      LEFT JOIN sub_fields s ON f.id = s.field_id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ error: "Database error: " + err.message });
  }
});

// API lấy danh sách dịch vụ theo sân
app.get("/services/:field_id", async (req, res) => {
  const { field_id } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM service WHERE field_id = $1",
      [field_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ error: "Database error: " + err.message });
  }
});

// API lấy danh sách booking
app.get("/bookings", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.id, b.sub_field_id, b.user_id, b.start_time, b.end_time, b.status, b.total_price, b.created_at,
             s.name AS sub_field_name, u.username
      FROM booking b
      JOIN sub_fields s ON b.sub_field_id = s.id
      JOIN users u ON b.user_id = u.id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ error: "Database error: " + err.message });
  }
});

// API đặt sân
app.post("/bookings", async (req, res) => {
  // Kiểm tra req.body có tồn tại không
  if (!req.body) {
    return res
      .status(400)
      .json({ error: "Body yêu cầu không được gửi hoặc không phải JSON" });
  }

  const { sub_field_id, user_id, start_time, end_time, services } = req.body;

  // Kiểm tra dữ liệu đầu vào
  if (!sub_field_id || !user_id || !start_time || !end_time) {
    return res
      .status(400)
      .json({ error: "Thiếu sub_field_id, user_id, start_time hoặc end_time" });
  }

  try {
    // Kiểm tra sub_field_id tồn tại
    const subFieldCheck = await pool.query(
      "SELECT id, field_id FROM sub_fields WHERE id = $1",
      [sub_field_id]
    );
    if (subFieldCheck.rows.length === 0) {
      return res
        .status(400)
        .json({ error: `sub_field_id ${sub_field_id} không tồn tại` });
    }

    // Kiểm tra user_id tồn tại
    const userCheck = await pool.query("SELECT id FROM users WHERE id = $1", [
      user_id,
    ]);
    if (userCheck.rows.length === 0) {
      return res
        .status(400)
        .json({ error: `user_id ${user_id} không tồn tại` });
    }

    // Kiểm tra thời gian hợp lệ
    const start = new Date(start_time);
    const end = new Date(end_time);
    if (isNaN(start) || isNaN(end)) {
      return res
        .status(400)
        .json({
          error:
            "start_time hoặc end_time không hợp lệ (phải là định dạng ISO)",
        });
    }
    if (end <= start) {
      return res
        .status(400)
        .json({ error: "end_time phải lớn hơn start_time" });
    }

    // Tính tổng giá
    const field = await pool.query(
      "SELECT price_per_hour FROM fields WHERE id = $1",
      [subFieldCheck.rows[0].field_id]
    );
    if (field.rows.length === 0) {
      return res
        .status(400)
        .json({ error: "Không tìm thấy sân tương ứng với sub_field_id" });
    }

    const duration = (end - start) / (1000 * 60 * 60); // Tính số giờ
    let total_price = field.rows[0].price_per_hour * duration;

    // Thêm giá dịch vụ
    if (services && services.length > 0) {
      const serviceCheck = await pool.query(
        "SELECT id, price FROM service WHERE id = ANY($1)",
        [services]
      );
      if (serviceCheck.rows.length !== services.length) {
        return res
          .status(400)
          .json({ error: "Một hoặc nhiều service_id không tồn tại" });
      }
      const serviceTotal = serviceCheck.rows.reduce(
        (sum, s) => sum + (s.price || 0),
        0
      );
      total_price += serviceTotal;
    }

    // Thêm booking
    const booking = await pool.query(
      "INSERT INTO booking (sub_field_id, user_id, start_time, end_time, total_price) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [sub_field_id, user_id, start_time, end_time, total_price]
    );

    // Thêm dịch vụ vào booking_services
    if (services && services.length > 0) {
      for (const service_id of services) {
        await pool.query(
          "INSERT INTO booking_services (booking_id, service_id) VALUES ($1, $2)",
          [booking.rows[0].id, service_id]
        );
      }
    }

    res.json(booking.rows[0]);
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ error: "Database error: " + err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
