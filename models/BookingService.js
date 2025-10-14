class BookingService {
  constructor(pool) {
    this.pool = pool;
  }

  // Tạo mới liên kết booking - service
  async createBookingService({ booking_id, service_id }) {
    const result = await this.pool.query(
      `
      INSERT INTO public.booking_services (booking_id, service_id)
      VALUES ($1, $2)
      RETURNING *
    `,
      [booking_id, service_id]
    );
    return result.rows[0];
  }

  // Lấy danh sách dịch vụ theo booking_id
  async getServicesByBookingId(booking_id) {
    const result = await this.pool.query(
      `
      SELECT s.id, s.name, s.price
      FROM public.booking_services bs
      JOIN public.service s ON bs.service_id = s.id
      WHERE bs.booking_id = $1
    `,
      [booking_id]
    );
    return result.rows;
  }
}

module.exports = BookingService;
