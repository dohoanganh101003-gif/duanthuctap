class Booking {
  constructor(pool) {
    this.pool = pool;
  }

  /** ===================== ADMIN ===================== **/
  // Lấy tất cả bookings (admin)
  async getAllBookings() {
    const result = await this.pool.query(`
      SELECT b.id, b.sub_field_id, b.user_id, b.start_time, b.end_time, 
             b.status, b.total_price, b.created_at,
             sf.name AS sub_field_name, f.name AS field_name, u.username
      FROM public.booking b
      JOIN public.sub_fields sf ON b.sub_field_id = sf.id
      JOIN public.fields f ON sf.field_id = f.id
      JOIN public.users u ON b.user_id = u.id
      ORDER BY b.created_at DESC
    `);
    return result.rows;
  }

  /** ===================== USER ===================== **/
  // Lấy tất cả booking của 1 user
  async getBookingsByUserId(user_id) {
    const result = await this.pool.query(
      `
      SELECT b.id, b.sub_field_id, b.user_id, b.start_time, b.end_time, 
             b.status, b.total_price, b.created_at,
             sf.name AS sub_field_name, f.name AS field_name
      FROM public.booking b
      JOIN public.sub_fields sf ON b.sub_field_id = sf.id
      JOIN public.fields f ON sf.field_id = f.id
      WHERE b.user_id = $1
      ORDER BY b.created_at DESC
    `,
      [user_id]
    );
    return result.rows;
  }

  /** ===================== OWNER ===================== **/
  // Lấy booking theo owner_id (chủ sân)
  async getBookingsByOwnerId(owner_id) {
    const result = await this.pool.query(
      `
      SELECT b.*, sf.name AS sub_field_name, f.name AS field_name, f.owner_id
      FROM public.booking b
      JOIN public.sub_fields sf ON b.sub_field_id = sf.id
      JOIN public.fields f ON sf.field_id = f.id
      WHERE f.owner_id = $1
      ORDER BY b.start_time DESC
    `,
      [owner_id]
    );
    return result.rows;
  }
  // Tạo booking mới
  async createBooking({
    sub_field_id,
    user_id,
    start_time,
    end_time,
    total_price,
  }) {
    const result = await this.pool.query(
      `
      INSERT INTO public.booking (sub_field_id, user_id, start_time, end_time, total_price)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
      [sub_field_id, user_id, start_time, end_time, total_price]
    );
    return result.rows[0];
  }

  // Cập nhật trạng thái booking
  async updateBookingStatus(id, status) {
    const result = await this.pool.query(
      `
      UPDATE public.booking 
      SET status = $1
      WHERE id = $2
      RETURNING *
    `,
      [status, id]
    );
    return result.rows[0];
  }
}

module.exports = Booking;
