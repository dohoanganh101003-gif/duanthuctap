const express = require("express");
const router = express.Router();
const BookingController = require("../controllers/BookingController");
const {
  authenticateToken,
  checkAdmin,
  checkAdminOrOwner,
} = require("../middlewares/authMiddleware");

// Trang đặt sân
router.get("/dat-san", authenticateToken, async (req, res) => {
  const pool = req.app.locals.pool;
  const bookingController = new BookingController(pool);

  const fieldId = req.query.field_id;
  if (!fieldId) return res.status(400).send("Thiếu field_id");

  try {
    const subFields =
      await bookingController.subFieldModel.getSubFieldsByFieldId(fieldId);
    const services = await bookingController.serviceModel.getServicesByFieldId(
      fieldId
    );
    const bookings = await bookingController.bookingModel.getBookingsByUserId(
      req.session.user_id
    );

    res.render("dat-san", {
      subFields,
      services,
      bookings,
      session: req.session,
    });
  } catch (err) {
    console.error("Lỗi khi load trang đặt sân:", err);
    res.status(500).send("Lỗi máy chủ");
  }
});

// Admin/Owner xem tất cả bookings
router.get("/bookings", authenticateToken, checkAdminOrOwner, (req, res) => {
  const pool = req.app.locals.pool;
  const bookingController = new BookingController(pool);
  bookingController.getAllBookings(req, res);
});

// API tạo booking (user)
router.post("/api/dat-san", authenticateToken, (req, res) => {
  const pool = req.app.locals.pool;
  const bookingController = new BookingController(pool);
  bookingController.createBooking(req, res);
});

// API admin/owner cập nhật trạng thái booking
// API admin/owner cập nhật trạng thái booking
router.put(
  "/api/bookings/:id/status",
  authenticateToken,
  checkAdminOrOwner,
  async (req, res) => {
    try {
      const pool = req.app.locals.pool;
      const { id } = req.params;
      const { status } = req.body;

      if (!["pending", "confirmed", "cancelled"].includes(status)) {
        return res.status(400).json({ error: "Trạng thái không hợp lệ" });
      }

      // Nếu là chủ sân thì kiểm tra booking có thuộc sân của họ không
      if (req.user.role === "owner") {
        const check = await pool.query(
          `SELECT b.id
           FROM booking b
           JOIN sub_fields sf ON b.sub_field_id = sf.id
           JOIN fields f ON sf.field_id = f.id
           WHERE b.id = $1 AND f.owner_id = $2`,
          [id, req.user.user_id]
        );

        if (check.rows.length === 0) {
          return res
            .status(403)
            .json({ error: "Bạn không có quyền chỉnh sửa booking này" });
        }
      }

      // Cập nhật trạng thái booking
      await pool.query(`UPDATE booking SET status = $1 WHERE id = $2`, [
        status,
        id,
      ]);

      console.log(`✅ Booking ${id} cập nhật thành công sang: ${status}`);

      // ✅ Redirect chính xác theo role
      if (req.user.role === "admin") {
        return res.redirect("/quanly_datsan");
      } else if (req.user.role === "owner") {
        return res.redirect("/owner/chusan_datsan");
      } else {
        return res.redirect("/lichsu_datsan");
      }
    } catch (err) {
      console.error("❌ Lỗi cập nhật booking:", err);
      res.status(500).json({ error: "Lỗi server khi cập nhật booking" });
    }
  }
);

// Lịch sử đặt sân của user
router.get("/lichsu_datsan", authenticateToken, async (req, res) => {
  const pool = req.app.locals.pool;
  const bookingController = new BookingController(pool);

  try {
    const bookings = await bookingController.bookingModel.getBookingsByUserId(
      req.session.user_id
    );

    // Lấy dịch vụ cho mỗi booking
    const bookingsWithServices = await Promise.all(
      bookings.map(async (b) => {
        const services = await pool.query(
          `
          SELECT s.id, s.name, s.price
          FROM booking_services bs
          JOIN service s ON bs.service_id = s.id
          WHERE bs.booking_id = $1
        `,
          [b.id]
        );
        return { ...b, services: services.rows };
      })
    );

    res.render("lichsu_datsan", {
      bookings: bookingsWithServices,
      session: req.session,
    });
  } catch (err) {
    console.error("Lỗi khi load lịch sử đặt sân:", err);
    res.status(500).send("Lỗi máy chủ");
  }
});

module.exports = router;
