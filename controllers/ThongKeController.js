class ThongKeController {
  constructor(pool) {
    this.pool = pool;
  }

  async renderThongKe(req, res) {
    res.render("thongke", { session: req.session });
  }

  async getThongKe(req, res) {
    try {
      const type = req.params.type;
      const role = req.session.role;
      const userId = req.session.user_id;

      let query = "";
      let params = [];

      if (role === "admin") {
        query = `
          SELECT 
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
            SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed,
            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
            SUM(total_price) AS revenue
          FROM booking b
          WHERE DATE_TRUNC($1, b.created_at) = DATE_TRUNC($1, CURRENT_DATE)
        `;
        params = [type];
      } else if (role === "owner") {
        query = `
          SELECT 
            COUNT(*) AS total,
            SUM(CASE WHEN b.status = 'pending' THEN 1 ELSE 0 END) AS pending,
            SUM(CASE WHEN b.status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed,
            SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
            SUM(b.total_price) AS revenue
          FROM booking b
          JOIN sub_fields sf ON b.sub_field_id = sf.id
          JOIN fields f ON sf.field_id = f.id
          WHERE f.owner_id = $2
          AND DATE_TRUNC($1, b.created_at) = DATE_TRUNC($1, CURRENT_DATE)
        `;
        params = [type, userId];
      } else {
        return res.status(403).json({ error: "Không có quyền xem thống kê" });
      }

      const result = await this.pool.query(query, params);
      res.json(result.rows[0] || {});
    } catch (err) {
      console.error("Lỗi khi lấy thống kê:", err);
      res.status(500).json({ error: "Lỗi khi lấy thống kê" });
    }
  }
}

module.exports = ThongKeController;
