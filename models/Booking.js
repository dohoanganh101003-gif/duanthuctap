class Booking {
  constructor(pool) {
    this.pool = pool;
  }

  async getAllBookings() {
    const result = await this.pool.query(`
      SELECT b.id, b.sub_field_id, b.user_id, b.start_time, b.end_time, b.status, b.total_price, b.created_at,
             s.name AS sub_field_name, f.name AS field_name, u.username
      FROM public.booking b
      JOIN public.sub_fields s ON b.sub_field_id = s.id
      JOIN public.fields f ON s.field_id = f.id
      JOIN public.users u ON b.user_id = u.id
    `);
    return result.rows;
  }

  async getBookingsByUserId(user_id) {
    const result = await this.pool.query(
      `
      SELECT b.id, b.sub_field_id, b.user_id, b.start_time, b.end_time, b.status, b.total_price, b.created_at,
             s.name AS sub_field_name, f.name AS field_name
      FROM public.booking b
      JOIN public.sub_fields s ON b.sub_field_id = s.id
      JOIN public.fields f ON s.field_id = f.id
      WHERE b.user_id = $1
    `,
      [user_id]
    );
    return result.rows;
  }

  async createBooking({
    sub_field_id,
    user_id,
    start_time,
    end_time,
    total_price,
  }) {
    const result = await this.pool.query(
      "INSERT INTO public.booking (sub_field_id, user_id, start_time, end_time, total_price) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [sub_field_id, user_id, start_time, end_time, total_price]
    );
    return result.rows[0];
  }

  async updateBookingStatus(id, status) {
    const result = await this.pool.query(
      "UPDATE public.booking SET status = $1 WHERE id = $2 RETURNING *",
      [status, id]
    );
    return result.rows[0];
  }
}

module.exports = Booking;
