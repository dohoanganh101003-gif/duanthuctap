const Booking = require("../models/Booking");
const Field = require("../models/Field");

class UserBookingController {
  constructor(pool) {
    this.pool = pool;
    this.bookingModel = new Booking(pool);
    this.fieldModel = new Field(pool);
  }

  /** ===================== TRANG ĐẶT SÂN ===================== **/
  async renderBookingPage(req, res) {
    try {
      const userId = req.session.user_id;
      const fieldId = req.query.field_id;
      const error = req.query.error;

      if (!fieldId)
        return res.status(400).send("Thiếu thông tin sân bóng (field_id)");

      const subFields = await this.pool.query(
        "SELECT * FROM public.sub_fields WHERE field_id = $1 ORDER BY id ASC",
        [fieldId]
      );
      const services = await this.pool.query(
        "SELECT * FROM public.service WHERE field_id = $1 ORDER BY id ASC",
        [fieldId]
      );
      const bookings = await this.bookingModel.getBookingsByUserId(userId);

      res.render("dat-san", {
        subFields: subFields.rows,
        services: services.rows,
        bookings,
        session: req.session,
        error,
      });
    } catch (err) {
      console.error("Lỗi hiển thị trang đặt sân:", err);
      res.status(500).send("Lỗi server khi hiển thị trang đặt sân");
    }
  }

  /** ===================== ĐẶT SÂN ===================== **/
  async createBooking(req, res) {
    try {
      const { sub_field_id, start_time, end_time, services } = req.body;
      const user_id = req.session.user_id;

      const fieldInfo = await this.pool.query(
        `SELECT f.price_per_hour, f.id AS field_id 
         FROM public.sub_fields sf 
         JOIN public.fields f ON sf.field_id = f.id 
         WHERE sf.id = $1`,
        [sub_field_id]
      );
      if (fieldInfo.rows.length === 0)
        return res.status(404).send("Không tìm thấy sân con");
      const overlapCheck = await this.pool.query(
        `SELECT * FROM public.booking 
         WHERE sub_field_id = $1 
         AND status NOT IN ('cancelled') 
         AND (
           ($2 BETWEEN start_time AND end_time)
           OR ($3 BETWEEN start_time AND end_time)
           OR (start_time BETWEEN $2 AND $3)
           OR (end_time BETWEEN $2 AND $3)
         )`,
        [sub_field_id, start_time, end_time]
      );

      const fieldId = fieldInfo.rows[0].field_id;
      if (overlapCheck.rows.length > 0)
        return res.redirect(`/dat-san?field_id=${fieldId}&error=trunglich`);
      const pricePerHour = Number(fieldInfo.rows[0].price_per_hour);
      const hours =
        (new Date(end_time) - new Date(start_time)) / (1000 * 60 * 60);
      const basePrice = pricePerHour * hours;

      let servicePrice = 0;
      let serviceIds = [];
      if (Array.isArray(services) && services.length > 0) {
        serviceIds = services.map(Number);
        const result = await this.pool.query(
          `SELECT SUM(price) AS total FROM public.service WHERE id = ANY($1::int[])`,
          [serviceIds]
        );
        servicePrice = Number(result.rows[0].total || 0);
      }
      const total_price = basePrice + servicePrice;
      const booking = await this.bookingModel.createBooking({
        sub_field_id,
        user_id,
        start_time,
        end_time,
        total_price,
        status: "pending",
        payment_status: "unpaid",
      });
      await this.bookingModel.attachServicesToBooking(booking.id, serviceIds);
      return res.redirect("/lichsu_datsan");
    } catch (err) {
      console.error("Lỗi khi đặt sân:", err);
      return res.status(500).json({ message: "Lỗi server khi đặt sân" });
    }
  }

  /** ===================== THANH TOÁN ===================== **/
  async handlePayment(req, res) {
    try {
      const id = req.params.id;
      const { method } = req.body;

      if (!["cash", "transfer"].includes(method))
        return res
          .status(400)
          .json({ success: false, message: "Phương thức không hợp lệ" });

      // Chuyển khoản → chờ chủ sân xác nhận
      const paymentStatus =
        method === "cash" ? "waiting_cash" : "waiting_transfer";
      const updated = await this.bookingModel.updateBookingPayment(id, method);
      if (!updated)
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy booking" });
      return res.json({
        success: true,
        message:
          method === "cash"
            ? "Bạn sẽ thanh toán khi đến sân."
            : "Đang chờ chủ sân xác nhận thanh toán.",
        payment_status: paymentStatus,
      });
    } catch (err) {
      console.error("Lỗi handlePayment:", err);
      return res
        .status(500)
        .json({ success: false, message: "Lỗi server khi xử lý thanh toán" });
    }
  }

  /** ===================== HIỂN THỊ LỊCH SỬ ===================== **/
  async renderUserBookings(req, res) {
    try {
      const userId = req.session.user_id;
      const bookings = await this.bookingModel.getBookingsByUserId(userId);
      const now = new Date();
      bookings.forEach((b) => {
        const endTime = new Date(b.end_time);
        b.isExpired = endTime < now;
      });
      const translatedBookings = bookings.map((b) => {
        const endTime = new Date(b.end_time);
        const expired = endTime < now;

        let statusText = "Không xác định";
        if (expired) {
          statusText = "Đã hết hạn";
        } else if (b.status === "pending") {
          statusText = "Đang chờ xác nhận";
        } else if (b.status === "confirmed") {
          statusText = "Đã xác nhận";
        } else if (b.status === "cancelled") {
          statusText = "Đã hủy";
        }

        // Phương thức thanh toán
        let paymentMethodText = "";
        if (b.payment_method === "cash") paymentMethodText = "Tiền mặt";
        else if (b.payment_method === "transfer")
          paymentMethodText = "Chuyển khoản";

        // Trạng thái thanh toán
        let paymentStatusText = "Chưa thanh toán";
        if (b.payment_status === "waiting_cash")
          paymentStatusText = "Chờ thanh toán tại sân";
        else if (b.payment_status === "waiting_transfer")
          paymentStatusText = "Chờ xác nhận chuyển khoản";
        else if (b.payment_status === "paid")
          paymentStatusText = "Đã thanh toán";

        return {
          ...b,
          statusText,
          paymentMethodText,
          paymentStatusText,
          isExpired: expired,
        };
      });

      res.render("lichsu_datsan", {
        bookings: translatedBookings,
        session: req.session,
      });
    } catch (err) {
      console.error("Lỗi khi hiển thị lịch sử đặt sân:", err);
      res.status(500).send("Lỗi server khi hiển thị lịch sử đặt sân");
    }
  }

  /** ===================== QR CODE ===================== **/
  async getBookingQr(req, res) {
    try {
      const id = req.params.id;
      const bookingData = await this.pool.query(
        "SELECT user_id FROM booking WHERE id=$1",
        [id]
      );
      if (!bookingData.rows.length)
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy booking" });

      if (bookingData.rows[0].user_id !== req.session.user_id)
        return res
          .status(403)
          .json({ success: false, message: "Bạn không có quyền xem QR này" });

      const qr = await this.bookingModel.getFieldQrByBookingId(id);
      if (!qr)
        return res
          .status(404)
          .json({ success: false, message: "Không có QR cho sân này" });

      return res.json({ success: true, qr_image: qr });
    } catch (err) {
      console.error("Lỗi getBookingQr:", err);
      return res
        .status(500)
        .json({ success: false, message: "Lỗi server khi lấy QR" });
    }
  }
  // ========== UPLOAD ẢNH MINH CHỨNG THANH TOÁN ==========
  async uploadPaymentProof(req, res) {
    try {
      const bookingId = req.params.id;
      const userId = req.session.user_id;
      const file = req.file;

      if (!file) {
        return res
          .status(400)
          .json({ success: false, message: "Chưa có ảnh tải lên" });
      }
      const result = await this.pool.query(
        "SELECT user_id FROM public.booking WHERE id = $1",
        [bookingId]
      );

      if (!result.rows.length) {
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy đặt sân" });
      }

      if (result.rows[0].user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền tải minh chứng cho đặt sân này",
        });
      }
      const imagePath = "/uploads/" + file.filename;
      await this.pool.query(
        "UPDATE public.booking SET payment_proof = $1, payment_status = 'waiting_transfer' WHERE id = $2",
        [imagePath, bookingId]
      );

      res.json({
        success: true,
        message: "Đã tải ảnh minh chứng thành công",
        proof_image: imagePath,
      });
    } catch (err) {
      console.error("Lỗi uploadPaymentProof:", err);
      res
        .status(500)
        .json({ success: false, message: "Lỗi server khi tải minh chứng" });
    }
  }
}

module.exports = UserBookingController;
