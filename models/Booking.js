class Booking {
  constructor(pool) {
    this.pool = pool;
  }

  /** ===================== ADMIN ===================== **/
  async getAllBookingsWithUserPhone() {
    const result = await this.pool.query(`
      SELECT 
        b.id, b.start_time, b.end_time, b.status, b.total_price, b.user_id,
        sf.name AS sub_field_name, 
        f.name AS field_name,
        u.username, 
        u.phone AS user_phone,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT('id', s.id, 'name', s.name, 'price', s.price)
          ) FILTER (WHERE s.id IS NOT NULL), 
          '[]'
        ) AS services
      FROM public.booking b
      JOIN public.sub_fields sf ON b.sub_field_id = sf.id
      JOIN public.fields f ON sf.field_id = f.id
      JOIN public.users u ON b.user_id = u.id
      LEFT JOIN public.booking_services bs ON b.id = bs.booking_id
      LEFT JOIN public.service s ON bs.service_id = s.id
      GROUP BY b.id, sf.name, f.name, u.username, u.phone
      ORDER BY 
        CASE 
          WHEN b.status = 'pending' THEN 1
          WHEN b.status = 'confirmed' THEN 2
          WHEN b.status = 'cancelled' THEN 3
          ELSE 4
        END,
        b.start_time ASC
    `);
    return result.rows;
  }

  /** ===================== USER ===================== **/
  async getBookingsByUserId(user_id) {
    const result = await this.pool.query(
      `
    SELECT 
      b.id, b.sub_field_id, b.user_id, b.start_time, b.end_time, 
      b.status, b.total_price, b.created_at,
      b.payment_method, b.payment_status,
      sf.name AS sub_field_name, f.name AS field_name,
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT('id', s.id, 'name', s.name, 'price', s.price)
        ) FILTER (WHERE s.id IS NOT NULL), '[]'
      ) AS services
    FROM public.booking b
    JOIN public.sub_fields sf ON b.sub_field_id = sf.id
    JOIN public.fields f ON sf.field_id = f.id
    LEFT JOIN public.booking_services bs ON b.id = bs.booking_id
    LEFT JOIN public.service s ON bs.service_id = s.id
    WHERE b.user_id = $1
    GROUP BY b.id, sf.name, f.name
    ORDER BY 
      CASE WHEN b.end_time < NOW() THEN 1 ELSE 0 END,       -- hết hạn xuống cuối
      CASE
        WHEN b.status = 'pending' THEN 1
        WHEN b.status = 'confirmed' AND b.payment_status = 'waiting_transfer' THEN 2
        WHEN b.status = 'confirmed' AND b.payment_status = 'waiting_cash' THEN 3
        WHEN b.status = 'confirmed' AND b.payment_status = 'paid' THEN 4
        WHEN b.status = 'confirmed' AND b.payment_status = 'rejected' THEN 5
        WHEN b.status = 'cancelled' THEN 6
        ELSE 7
      END,
      b.start_time ASC;
    `,
      [user_id]
    );
    return result.rows;
  }

  /** ===================== OWNER ===================== **/
  async getBookingsByOwnerIdWithUserPhone(owner_id) {
    const result = await this.pool.query(
      `
    SELECT 
      b.id, 
      b.start_time, 
      b.end_time, 
      b.status, 
      b.total_price,
      b.payment_method,
      b.payment_status,
      sf.name AS sub_field_name, 
      f.name AS field_name,
      u.username AS user_name, 
      u.phone AS user_phone,
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT('id', s.id, 'name', s.name, 'price', s.price)
        ) FILTER (WHERE s.id IS NOT NULL),
        '[]'
      ) AS services
    FROM public.booking b
    JOIN public.sub_fields sf ON b.sub_field_id = sf.id
    JOIN public.fields f ON sf.field_id = f.id
    JOIN public.users u ON b.user_id = u.id
    LEFT JOIN public.booking_services bs ON b.id = bs.booking_id
    LEFT JOIN public.service s ON bs.service_id = s.id
    WHERE f.owner_id = $1
    GROUP BY b.id, sf.name, f.name, u.username, u.phone
    ORDER BY 
      CASE WHEN b.end_time < NOW() THEN 1 ELSE 0 END,      -- hết hạn xuống cuối
      CASE
        WHEN b.status = 'pending' THEN 1
        WHEN b.status = 'confirmed' AND b.payment_status = 'waiting_transfer' THEN 2
        WHEN b.status = 'confirmed' AND b.payment_status = 'waiting_cash' THEN 3
        WHEN b.status = 'confirmed' AND (b.payment_status = 'unpaid' OR b.payment_status IS NULL) THEN 4
        WHEN b.status = 'confirmed' AND b.payment_status = 'paid' THEN 5
        WHEN b.status = 'confirmed' AND b.payment_status = 'rejected' THEN 6
        WHEN b.status = 'cancelled' THEN 7
        ELSE 8
      END,
      b.start_time ASC, b.id ASC;
    `,
      [owner_id]
    );
    return result.rows;
  }

  /** ===================== TẠO BOOKING ===================== **/
  async createBooking({
    sub_field_id,
    user_id,
    start_time,
    end_time,
    total_price,
    status = "pending",
    payment_status = "unpaid",
  }) {
    const result = await this.pool.query(
      `
    INSERT INTO public.booking 
    (sub_field_id, user_id, start_time, end_time, total_price, status, payment_status)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
    `,
      [
        sub_field_id,
        user_id,
        start_time,
        end_time,
        total_price,
        status,
        payment_status,
      ]
    );
    return result.rows[0];
  }

  async attachServicesToBooking(booking_id, serviceIds = []) {
    if (!Array.isArray(serviceIds) || serviceIds.length === 0) return;
    for (const sId of serviceIds) {
      await this.pool.query(
        `INSERT INTO public.booking_services (booking_id, service_id) VALUES ($1, $2)`,
        [booking_id, sId]
      );
    }
  }

  /** ===================== CẬP NHẬT TRẠNG THÁI ===================== **/
  async updateBookingStatus(id, status) {
    const result = await this.pool.query(
      `UPDATE public.booking SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );
    return result.rows[0];
  }

  /** ===================== CẬP NHẬT THANH TOÁN ===================== **/
  async updateBookingPayment(id, method) {
    const validMethods = ["cash", "transfer"];
    if (!validMethods.includes(method))
      throw new Error("Phương thức không hợp lệ");

    const paymentStatus =
      method === "cash" ? "waiting_cash" : "waiting_transfer";

    const result = await this.pool.query(
      `UPDATE public.booking
       SET payment_method = $1, payment_status = $2
       WHERE id = $3
       RETURNING *`,
      [method, paymentStatus, id]
    );

    return result.rows[0];
  }

  /** ===================== LẤY QR ===================== **/
  async getFieldQrByBookingId(bookingId) {
    const result = await this.pool.query(
      `SELECT f.qr_image
       FROM public.booking b
       JOIN public.sub_fields sf ON b.sub_field_id = sf.id
       JOIN public.fields f ON sf.field_id = f.id
       WHERE b.id = $1
       LIMIT 1`,
      [bookingId]
    );
    return result.rows[0] ? result.rows[0].qr_image : null;
  }
}

module.exports = Booking;
