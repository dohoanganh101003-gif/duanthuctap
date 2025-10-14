class Service {
  constructor(pool) {
    this.pool = pool;
  }

  // Lấy toàn bộ dịch vụ (admin)
  async getAllServices() {
    const result = await this.pool.query(`
      SELECT s.*, f.name as field_name, f.id as field_id
      FROM public.service s
      JOIN public.fields f ON s.field_id = f.id
      ORDER BY s.id DESC
    `);
    return result.rows;
  }

  // Lấy dịch vụ theo sân
  async getServicesByFieldId(field_id) {
    const result = await this.pool.query(
      "SELECT * FROM public.service WHERE field_id = $1",
      [field_id]
    );
    return result.rows;
  }

  // Tạo dịch vụ mới
  async createService({ field_id, name, description, price }) {
    const result = await this.pool.query(
      `INSERT INTO public.service (field_id, name, description, price)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [field_id, name, description, price]
    );
    return result.rows[0];
  }

  // Cập nhật dịch vụ
  async updateService(id, { field_id, name, description, price }) {
    const result = await this.pool.query(
      `UPDATE public.service
       SET field_id = $1, name = $2, description = $3, price = $4
       WHERE id = $5
       RETURNING *`,
      [field_id, name, description, price, id]
    );
    return result.rows[0];
  }

  // Xóa dịch vụ
  async deleteService(id) {
    const result = await this.pool.query(
      "DELETE FROM public.service WHERE id = $1 RETURNING *",
      [id]
    );
    return result.rows[0];
  }

  // Lấy dịch vụ theo chủ sân
  async getServicesByOwnerId(owner_id) {
    const result = await this.pool.query(
      `SELECT s.*, f.name as field_name, f.id as field_id
       FROM public.service s
       JOIN public.fields f ON s.field_id = f.id
       WHERE f.owner_id = $1
       ORDER BY s.id DESC`,
      [owner_id]
    );
    return result.rows;
  }
}

module.exports = Service;
