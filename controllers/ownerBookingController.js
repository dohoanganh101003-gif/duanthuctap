const Booking = require("../models/Booking");

class OwnerBookingController {
  constructor(pool) {
    this.bookingModel = new Booking(pool);
  }

  async getOwnerBookings(req, res) {
    try {
      const ownerId = req.session.user_id;
      const bookings =
        await this.bookingModel.getBookingsByOwnerIdWithUserPhone(ownerId);
      const now = new Date();
      bookings.forEach((b) => {
        b.isExpired = new Date(b.end_time) < now;
      });
      res.render("owner/chusan_datsan", {
        title: "Quản lý đặt sân",
        bookings,
        session: req.session,
      });
    } catch (err) {
      console.error("Lỗi khi tải danh sách đặt sân:", err);
      res.status(500).send("Lỗi server khi tải trang quản lý đặt sân");
    }
  }

  async confirmBooking(req, res) {
    try {
      await this.bookingModel.updateBookingStatus(req.params.id, "confirmed");
      return res.redirect("/owner/chusan_datsan");
    } catch (err) {
      console.error("Lỗi xác nhận đặt sân:", err);
      res.status(500).send("Lỗi server khi xác nhận đặt sân");
    }
  }

  async cancelBooking(req, res) {
    try {
      await this.bookingModel.updateBookingStatus(req.params.id, "cancelled");
      await this.bookingModel.pool.query(
        `UPDATE public.booking SET payment_status = 'cancelled' WHERE id = $1`,
        [req.params.id]
      );
      return res.redirect("/owner/chusan_datsan");
    } catch (err) {
      console.error("Lỗi hủy đặt sân:", err);
      res.status(500).send("Lỗi server khi hủy đặt sân");
    }
  }
}

module.exports = OwnerBookingController;
