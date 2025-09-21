class BookingService {
  constructor(pool) {
    this.pool = pool;
  }

  async createBookingService({ booking_id, service_id }) {
    const result = await this.pool.query(
      "INSERT INTO public.booking_services (booking_id, service_id) VALUES ($1, $2) RETURNING *",
      [booking_id, service_id]
    );
    return result.rows[0];
  }
}

module.exports = BookingService;
