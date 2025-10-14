const Booking = require("../models/Booking");
const SubField = require("../models/SubField");
const Service = require("../models/Service");
const BookingService = require("../models/BookingService");
const Field = require("../models/Field");

class BookingController {
  constructor(pool) {
    this.pool = pool;
    this.bookingModel = new Booking(pool);
    this.subFieldModel = new SubField(pool);
    this.serviceModel = new Service(pool);
    this.bookingServiceModel = new BookingService(pool);
    this.fieldModel = new Field(pool);
  }

  /** ===================== USER ===================== **/
  async renderBookingPage(req, res) {
    try {
      const fieldId = req.query.field_id;
      if (!fieldId) return res.status(400).send("Thiếu field_id");

      const subFields = await this.subFieldModel.getSubFieldsByFieldId(fieldId);
      const services = await this.serviceModel.getServicesByFieldId(fieldId);
      const bookings = await this.bookingModel.getBookingsByUserId(
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
  }

  // Tạo booking (user)
  async createBooking(req, res) {
    try {
      const { sub_field_id, start_time, end_time, services } = req.body;
      const user_id = req.session.user_id;

      if (!sub_field_id || !start_time || !end_time)
        return res.status(400).send("Thiếu thông tin đặt sân");

      if (new Date(start_time) >= new Date(end_time))
        return res
          .status(400)
          .send("Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc");

      const subField = await this.subFieldModel.getSubFieldById(sub_field_id);
      if (!subField) return res.status(404).send("Sân con không tồn tại");

      const field = await this.fieldModel.getFieldById(subField.field_id);
      if (!field) return res.status(404).send("Sân bóng không tồn tại");

      // Check trùng lịch
      const conflict = await this.pool.query(
        `
        SELECT id FROM public.booking
        WHERE sub_field_id = $1
        AND (
          ($2 >= start_time AND $2 < end_time)
          OR ($3 > start_time AND $3 <= end_time)
          OR (start_time >= $2 AND end_time <= $3)
        )
      `,
        [sub_field_id, start_time, end_time]
      );
      if (conflict.rows.length > 0)
        return res
          .status(400)
          .send("Lịch đã được đặt trong khoảng thời gian này");

      // Tính tiền sân
      const durationHours =
        (new Date(end_time) - new Date(start_time)) / (1000 * 60 * 60);
      let total_price = parseFloat(field.price_per_hour) * durationHours;

      // Dịch vụ
      let serviceIds = [];
      if (services) {
        serviceIds = Array.isArray(services) ? services : [services];
        const validServices = await this.serviceModel.getServicesByFieldId(
          subField.field_id
        );
        const validIds = validServices.map((s) => String(s.id));

        const invalid = serviceIds.find((s) => !validIds.includes(String(s)));
        if (invalid)
          return res
            .status(400)
            .send(`Dịch vụ ID ${invalid} không hợp lệ cho sân này`);

        const serviceTotal = validServices
          .filter((s) => serviceIds.includes(String(s.id)))
          .reduce((sum, s) => sum + parseFloat(s.price), 0);
        total_price += serviceTotal;
      }

      // Tạo booking
      const booking = await this.bookingModel.createBooking({
        sub_field_id,
        user_id,
        start_time,
        end_time,
        total_price,
      });

      // Thêm dịch vụ kèm booking
      for (const sid of serviceIds) {
        await this.bookingServiceModel.createBookingService({
          booking_id: booking.id,
          service_id: sid,
        });
      }

      res.redirect("/lichsu_datsan");
    } catch (err) {
      console.error("Lỗi khi tạo booking:", err);
      res.status(500).send("Lỗi máy chủ nội bộ: " + err.message);
    }
  }

  // Lịch sử đặt sân (user)
  async renderUserBookings(req, res) {
    try {
      const bookings = await this.bookingModel.getBookingsByUserId(
        req.session.user_id
      );

      const bookingsWithServices = await Promise.all(
        bookings.map(async (b) => {
          const services = await this.pool.query(
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
  }

  /** ===================== ADMIN ===================== **/
  async renderAdminBookings(req, res) {
    try {
      const result = await this.pool.query(`
      SELECT b.id, u.username, sf.name AS sub_field_name, f.name AS field_name,
             b.start_time, b.end_time, b.total_price, b.status
      FROM booking b
      JOIN users u ON b.user_id = u.id
      JOIN sub_fields sf ON b.sub_field_id = sf.id
      JOIN fields f ON sf.field_id = f.id
      ORDER BY 
        CASE 
          WHEN b.status = 'pending' THEN 1
          WHEN b.status = 'confirmed' THEN 2
          WHEN b.status = 'cancelled' THEN 3
          ELSE 4
        END,
        b.start_time DESC
    `);

      res.render("quanly_datsan", {
        bookings: result.rows,
        session: req.session,
      });
    } catch (err) {
      console.error("Lỗi khi render trang quản lý đặt sân:", err);
      res.status(500).send("Lỗi server khi load quản lý đặt sân");
    }
  }

  async updateBookingStatusByAdmin(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!["pending", "confirmed", "cancelled"].includes(status))
        return res.status(400).send("Trạng thái không hợp lệ");

      await this.bookingModel.updateBookingStatus(id, status);
      res.redirect("/quanly_datsan");
    } catch (err) {
      console.error("Lỗi khi admin cập nhật booking:", err);
      res.status(500).send("Lỗi máy chủ nội bộ");
    }
  }

  /** ===================== OWNER ===================== **/
  async renderOwnerBookings(req, res) {
    try {
      const ownerId = req.session.user_id;
      const result = await this.pool.query(
        `
      SELECT b.*, sf.name AS sub_field_name, f.name AS field_name, u.username
      FROM booking b
      JOIN sub_fields sf ON b.sub_field_id = sf.id
      JOIN fields f ON sf.field_id = f.id
      JOIN users u ON b.user_id = u.id
      WHERE f.owner_id = $1
      ORDER BY 
        CASE 
          WHEN b.status = 'pending' THEN 1
          WHEN b.status = 'confirmed' THEN 2
          WHEN b.status = 'cancelled' THEN 3
          ELSE 4
        END,
        b.start_time DESC
      `,
        [ownerId]
      );

      res.render("owner/chusan_datsan", {
        bookings: result.rows,
        session: req.session,
      });
    } catch (err) {
      console.error("Lỗi khi load booking chủ sân:", err);
      res.status(500).send("Lỗi server");
    }
  }

  async updateBookingStatusByOwner(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const ownerId = req.session.user_id;

      if (!["pending", "confirmed", "cancelled"].includes(status)) {
        return res.status(400).json({ error: "Trạng thái không hợp lệ" });
      }

      const check = await this.pool.query(
        `SELECT f.owner_id
       FROM booking b
       JOIN sub_fields sf ON b.sub_field_id = sf.id
       JOIN fields f ON sf.field_id = f.id
       WHERE b.id = $1`,
        [id]
      );

      if (!check.rows[0]) {
        return res.status(404).json({ error: "Booking không tồn tại" });
      }

      if (check.rows[0].owner_id !== ownerId) {
        return res
          .status(403)
          .json({ error: "Bạn không có quyền chỉnh sửa booking này" });
      }

      const updated = await this.bookingModel.updateBookingStatus(id, status);

      if (req.headers["content-type"]?.includes("application/json")) {
        return res.json({
          message: "Cập nhật trạng thái thành công",
          booking: updated,
        });
      }

      // Nếu là form submit bình thường
      res.redirect("/owner/chusan_datsan");
    } catch (err) {
      console.error("Lỗi khi chủ sân cập nhật booking:", err);
      res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
    }
  }
}

module.exports = BookingController;
