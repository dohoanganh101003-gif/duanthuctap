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

  // Admin: xem tất cả bookings, user: chỉ xem của mình
  async getAllBookings(req, res) {
    try {
      const userId = req.session.role === "admin" ? null : req.session.user_id;
      const bookings = userId
        ? await this.bookingModel.getBookingsByUserId(userId)
        : await this.bookingModel.getAllBookings();
      // Lấy dịch vụ kèm theo cho mỗi booking
      const bookingsWithServices = await Promise.all(
        bookings.map(async (booking) => {
          const services = await this.pool.query(
            `
            SELECT s.id, s.name, s.price
            FROM public.booking_services bs
            JOIN public.service s ON bs.service_id = s.id
            WHERE bs.booking_id = $1
          `,
            [booking.id]
          );
          return { ...booking, services: services.rows };
        })
      );

      res.json(bookingsWithServices);
    } catch (err) {
      console.error("Lỗi khi lấy danh sách booking:", err.stack);
      res.status(500).json({ error: "Lỗi máy chủ nội bộ: " + err.message });
    }
  }

  // Tạo booking mới
  async createBooking(req, res) {
    try {
      const { sub_field_id, start_time, end_time, services } = req.body;
      const user_id = req.session.user_id;

      // Validate input
      if (!sub_field_id || !start_time || !end_time) {
        return res.status(400).send("Thiếu thông tin đặt sân");
      }
      if (new Date(start_time) >= new Date(end_time)) {
        return res
          .status(400)
          .send("Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc");
      }
      // Kiểm tra sân con
      const subField = await this.subFieldModel.getSubFieldById(sub_field_id);
      if (!subField) {
        return res.status(404).send("Sân con không tồn tại");
      }
      // Kiểm tra sân chính
      const field = await this.fieldModel.getFieldById(subField.field_id);
      if (!field) {
        return res.status(404).send("Sân bóng không tồn tại");
      }
      // Check lịch trùng
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
      if (conflict.rows.length > 0) {
        return res
          .status(400)
          .send("Lịch đã được đặt trong khoảng thời gian này");
      }

      // Tính tiền sân
      const durationHours =
        (new Date(end_time) - new Date(start_time)) / (1000 * 60 * 60);
      let total_price = field.price_per_hour * durationHours;

      let serviceIds = [];
      if (services) {
        serviceIds = Array.isArray(services) ? services : [services];

        // Lấy dịch vụ hợp lệ
        const validServices = await this.serviceModel.getServicesByFieldId(
          subField.field_id
        );
        const validServiceIds = validServices.map((s) => String(s.id));

        // Check dịch vụ không hợp lệ
        const invalidService = serviceIds.find(
          (s) => !validServiceIds.includes(String(s))
        );
        if (invalidService) {
          return res
            .status(400)
            .send(`Dịch vụ ID ${invalidService} không hợp lệ cho sân này`);
        }

        // Tính tiền dịch vụ
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

      // Thêm dịch vụ vào bảng booking_services
      if (serviceIds.length > 0) {
        for (const service_id of serviceIds) {
          await this.bookingServiceModel.createBookingService({
            booking_id: booking.id,
            service_id,
          });
        }
      }

      //Sau khi tạo thành công → chuyển đến trang lịch sử đặt sân
      res.redirect("/lichsu_datsan");
    } catch (err) {
      console.error("Lỗi khi tạo booking:", err.stack);
      res.status(500).send("Lỗi máy chủ nội bộ: " + err.message);
    }
  }

  // Admin: cập nhật trạng thái booking
  async updateBookingStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!["confirmed", "cancelled"].includes(status)) {
        return res.status(400).send("Trạng thái không hợp lệ");
      }

      // Nếu caller là owner (không phải admin), kiểm tra booking thuộc sân của owner
      if (req.session.role === "owner") {
        const ownerCheck = await this.pool.query(
          `SELECT f.owner_id
         FROM public.booking b
         JOIN public.sub_fields sf ON b.sub_field_id = sf.id
         JOIN public.fields f ON sf.field_id = f.id
         WHERE b.id = $1`,
          [id]
        );
        if (!ownerCheck.rows[0]) {
          return res.status(404).send("Booking không tồn tại");
        }
        if (ownerCheck.rows[0].owner_id !== req.session.user_id) {
          return res
            .status(403)
            .send("Bạn không có quyền thay đổi booking này");
        }
      }

      const booking = await this.bookingModel.updateBookingStatus(id, status);
      if (!booking) {
        return res.status(404).send("Booking không tồn tại");
      }

      // Redirect phù hợp: nếu admin -> /quanly_datsan, nếu owner -> /owner/quanly_datsan
      if (req.session.role === "admin") return res.redirect("/quanly_datsan");
      return res.redirect("/owner/quanly_datsan");
    } catch (err) {
      console.error("Lỗi khi cập nhật trạng thái booking:", err.stack);
      res.status(500).send("Lỗi máy chủ nội bộ: " + err.message);
    }
  }

  async renderAdminBookings(req, res) {
    try {
      // Admin mới được xem trang này
      if (!req.session.user_id || req.session.role !== "admin") {
        return res.redirect("/dangnhap");
      }

      const result = await this.pool.query(`
      SELECT b.id, u.username, sf.name AS sub_field_name, f.name AS field_name,
             b.start_time, b.end_time, b.total_price, b.status
      FROM booking b
      JOIN users u ON b.user_id = u.id
      JOIN sub_fields sf ON b.sub_field_id = sf.id
      JOIN fields f ON sf.field_id = f.id
      ORDER BY b.start_time DESC
    `);

      res.render("quanly_datsan", {
        bookings: result.rows,
        session: req.session,
      });
    } catch (err) {
      console.error("❌ Lỗi khi render trang quản lý đặt sân:", err.stack);
      res.status(500).send("Lỗi server khi load quản lý đặt sân");
    }
  }
}

module.exports = BookingController;
