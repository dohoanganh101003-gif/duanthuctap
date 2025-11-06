const Booking = require("../models/Booking");

class AdminBookingController {
  constructor(pool) {
    this.pool = pool;
    this.bookingModel = new Booking(pool);
  }

  /** ===================== DANH SÁCH TẤT CẢ BOOKING ===================== **/
  async renderAdminBookings(req, res) {
    try {
      const bookings = await this.bookingModel.getAllBookingsWithUserPhone();
      res.render("quanly_datsan", { bookings, session: req.session });
    } catch (err) {
      console.error("Lỗi khi lấy danh sách booking (admin):", err);
      res.status(500).send("Lỗi server");
    }
  }

  /** ===================== CẬP NHẬT TRẠNG THÁI ===================== **/
  async updateBookingStatusByAdmin(req, res) {
    try {
      const id = req.params.id;
      const { status } = req.body;
      const booking = await this.bookingModel.updateBookingStatus(id, status);

      if (!booking) return res.status(404).send("Không tìm thấy booking");

      const userData = await this.pool.query(
        "SELECT username, phone FROM public.users WHERE id = $1",
        [booking.user_id]
      );

      const username = userData.rows[0]?.username || "Người dùng";
      const phone = userData.rows[0]?.phone || "Không có số điện thoại";

      console.log(
        `ADMIN: ${username} (${phone}) - Đặt sân #${id} => ${status}`
      );
      res.redirect("/quanly_datsan");
    } catch (err) {
      console.error("Lỗi cập nhật trạng thái (admin):", err);
      res.status(500).send("Lỗi server khi cập nhật trạng thái");
    }
  }
}

module.exports = AdminBookingController;
