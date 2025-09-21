const Booking = require("../models/Booking");
const SubField = require("../models/SubField");
const Service = require("../models/Service");
const BookingService = require("../models/BookingService");
const Field = require("../models/Field");

class BookingController {
  constructor(pool) {
    this.bookingModel = new Booking(pool);
    this.subFieldModel = new SubField(pool);
    this.serviceModel = new Service(pool);
    this.bookingServiceModel = new BookingService(pool);
    this.fieldModel = new Field(pool);
  }

  async getAllBookings(req, res) {
    try {
      const userId = req.session.role === "admin" ? null : req.session.user_id;
      const bookings = userId
        ? await this.bookingModel.getBookingsByUserId(userId)
        : await this.bookingModel.getAllBookings();
      // Lấy danh sách dịch vụ cho mỗi booking
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

  async createBooking(req, res) {
    try {
      const { sub_field_id, start_time, end_time, services } = req.body;
      const user_id = req.session.user_id;

      // Kiểm tra dữ liệu đầu vào
      if (!sub_field_id || !start_time || !end_time) {
        return res.status(400).json({ error: "Thiếu thông tin đặt sân" });
      }

      // Kiểm tra thời gian hợp lệ
      if (new Date(start_time) >= new Date(end_time)) {
        return res
          .status(400)
          .json({ error: "Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc" });
      }

      // Kiểm tra sân con tồn tại
      const subField = await this.subFieldModel.getSubFieldById(sub_field_id);
      if (!subField) {
        return res.status(404).json({ error: "Sân con không tồn tại" });
      }

      // Lấy giá sân từ field
      const field = await this.fieldModel.getFieldById(subField.field_id);
      if (!field) {
        return res.status(404).json({ error: "Sân bóng không tồn tại" });
      }

      // Kiểm tra trùng lịch
      const conflict = await this.pool.query(
        `
        SELECT id
        FROM public.booking
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
          .json({ error: "Lịch đã được đặt trong khoảng thời gian này" });
      }

      // Tính total_price
      const durationHours =
        (new Date(end_time) - new Date(start_time)) / (1000 * 60 * 60);
      let total_price = field.price_per_hour * durationHours;

      // Kiểm tra và tính giá dịch vụ
      let selectedServices = [];
      if (services && services.length > 0) {
        selectedServices = await this.serviceModel.getServicesByFieldId(
          subField.field_id
        );
        const validServiceIds = selectedServices.map((s) => s.id);
        const invalidService = services.find(
          (s) => !validServiceIds.includes(s)
        );
        if (invalidService) {
          return res
            .status(400)
            .json({
              error: `Dịch vụ ID ${invalidService} không hợp lệ cho sân này`,
            });
        }
        const serviceTotal = selectedServices
          .filter((s) => services.includes(s.id))
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

      // Thêm dịch vụ vào booking_services
      if (services && services.length > 0) {
        for (const service_id of services) {
          await this.bookingServiceModel.createBookingService({
            booking_id: booking.id,
            service_id,
          });
        }
      }

      res
        .status(201)
        .json({
          message: "Đặt sân thành công",
          booking,
          services: selectedServices.filter((s) => services.includes(s.id)),
        });
    } catch (err) {
      console.error("Lỗi khi tạo booking:", err.stack);
      res.status(500).json({ error: "Lỗi máy chủ nội bộ: " + err.message });
    }
  }

  async updateBookingStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!["confirmed", "cancelled"].includes(status)) {
        return res.status(400).json({ error: "Trạng thái không hợp lệ" });
      }
      const booking = await this.bookingModel.updateBookingStatus(id, status);
      if (!booking) {
        return res.status(404).json({ error: "Booking không tồn tại" });
      }
      res.json({
        message: `Cập nhật trạng thái booking thành ${status}`,
        booking,
      });
    } catch (err) {
      console.error("Lỗi khi cập nhật trạng thái booking:", err.stack);
      res.status(500).json({ error: "Lỗi máy chủ nội bộ: " + err.message });
    }
  }
}

module.exports = BookingController;
