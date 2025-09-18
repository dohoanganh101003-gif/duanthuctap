class Booking {
  constructor(pool) {
    this.pool = pool;
  }

  async getAllBookings() {
    try {
      const { rows } = await this.pool.query(`
        SELECT b.id, b.user_id, b.sub_field_id, b.start_time, b.end_time, b.total_price, b.status, u.username, sf.name AS sub_field_name
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        JOIN sub_fields sf ON b.sub_field_id = sf.id
        ORDER BY b.start_time DESC
      `);
      return rows;
    } catch (err) {
      throw new Error(`Lỗi khi lấy danh sách đặt sân: ${err.message}`);
    }
  }

  async createBooking({
    user_id,
    sub_field_id,
    start_time,
    end_time,
    total_price,
  }) {
    try {
      const { rows } = await this.pool.query(
        `
        INSERT INTO bookings (user_id, sub_field_id, start_time, end_time, total_price, status)
        VALUES ($1, $2, $3, $4, $5, 'pending')
        RETURNING id, user_id, sub_field_id, start_time, end_time, total_price, status
      `,
        [user_id, sub_field_id, start_time, end_time, total_price]
      );
      return rows[0];
    } catch (err) {
      throw new Error(`Lỗi khi tạo đặt sân: ${err.message}`);
    }
  }
}

module.exports = Booking;
