class Service {
  constructor(pool) {
    this.pool = pool;
  }

  async getServicesByFieldId(fieldId) {
    try {
      const { rows } = await this.pool.query(
        `
        SELECT id, name, description, price, field_id
        FROM services
        WHERE field_id = $1
        ORDER BY name
      `,
        [fieldId]
      );
      return rows;
    } catch (err) {
      throw new Error(`Lỗi khi lấy danh sách dịch vụ: ${err.message}`);
    }
  }

  async createService({ name, description, price, field_id }) {
    try {
      const { rows } = await this.pool.query(
        `
        INSERT INTO services (name, description, price, field_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, description, price, field_id
      `,
        [name, description, price, field_id]
      );
      return rows[0];
    } catch (err) {
      throw new Error(`Lỗi khi tạo dịch vụ: ${err.message}`);
    }
  }

  async updateService(id, { name, description, price, field_id }) {
    try {
      const { rows } = await this.pool.query(
        `
        UPDATE services
        SET name = $1, description = $2, price = $3, field_id = $4
        WHERE id = $5
        RETURNING id, name, description, price, field_id
      `,
        [name, description, price, field_id, id]
      );
      if (rows.length === 0) return null;
      return rows[0];
    } catch (err) {
      throw new Error(`Lỗi khi cập nhật dịch vụ: ${err.message}`);
    }
  }

  async deleteService(id) {
    try {
      const { rows } = await this.pool.query(
        `
        DELETE FROM services
        WHERE id = $1
        RETURNING id
      `,
        [id]
      );
      return rows.length > 0;
    } catch (err) {
      throw new Error(`Lỗi khi xóa dịch vụ: ${err.message}`);
    }
  }
}

module.exports = Service;
