const Booking = require("../models/Booking");
const SubField = require("../models/SubField");

class BookingController {
  constructor(pool) {
    this.bookingModel = new Booking(pool);
    this.subFieldModel = new SubField(pool);
  }

  async getAllBookings(req, res) {
    try {
      const bookings = await this.bookingModel.getAllBookings();
      res.json(bookings);
    } catch (err) {
      console.error(err.stack);
      res.status(500).json({ error: err.message });
    }
  }

  async createBooking(req, res) {
    try {
      const { sub_field_id, start_time, end_time, total_price } = req.body;
      if (!sub_field_id || !start_time || !end_time || !total_price) {
        return res.status(400).json({ error: "Thiếu thông tin đặt sân" });
      }
      const subField = await this.subFieldModel.getSubFieldsByFieldId(
        sub_field_id
      );
      if (!subField.length) {
        return res.status(400).json({ error: "Sân con không tồn tại" });
      }
      const booking = await this.bookingModel.createBooking({
        user_id: req.session.user_id,
        sub_field_id,
        start_time,
        end_time,
        total_price,
      });
      res.status(201).json({ message: "Đặt sân thành công", booking });
    } catch (err) {
      console.error(err.stack);
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = BookingController;
