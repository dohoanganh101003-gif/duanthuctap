class Field {
  constructor(pool) {
    this.pool = pool;
  }

  async getAllFields() {
    try {
      const { rows } = await this.pool.query(`
        SELECT id, name, address, ST_AsGeoJSON(location) AS location, created_at
        FROM fields
        ORDER BY created_at DESC
      `);
      return rows.map((row) => ({
        ...row,
        location: JSON.parse(row.location),
      }));
    } catch (err) {
      throw new Error(`Lỗi khi lấy danh sách sân bóng: ${err.message}`);
    }
  }

  async getFieldById(id) {
    try {
      const { rows } = await this.pool.query(
        `
        SELECT id, name, address, ST_AsGeoJSON(location) AS location, created_at
        FROM fields
        WHERE id = $1
      `,
        [id]
      );
      if (rows.length === 0) return null;
      return { ...rows[0], location: JSON.parse(rows[0].location) };
    } catch (err) {
      throw new Error(`Lỗi khi lấy sân bóng theo ID: ${err.message}`);
    }
  }

  async createField({ name, address, latitude, longitude }) {
    try {
      const { rows } = await this.pool.query(
        `
        INSERT INTO fields (name, address, location)
        VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326))
        RETURNING id, name, address, ST_AsGeoJSON(location) AS location, created_at
      `,
        [name, address, longitude, latitude]
      );
      return { ...rows[0], location: JSON.parse(rows[0].location) };
    } catch (err) {
      throw new Error(`Lỗi khi tạo sân bóng: ${err.message}`);
    }
  }

  async updateField(id, { name, address, latitude, longitude }) {
    try {
      const { rows } = await this.pool.query(
        `
        UPDATE fields
        SET name = $1, address = $2, location = ST_SetSRID(ST_MakePoint($3, $4), 4326), updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING id, name, address, ST_AsGeoJSON(location) AS location, updated_at
      `,
        [name, address, longitude, latitude, id]
      );
      if (rows.length === 0) return null;
      return { ...rows[0], location: JSON.parse(rows[0].location) };
    } catch (err) {
      throw new Error(`Lỗi khi cập nhật sân bóng: ${err.message}`);
    }
  }

  async deleteField(id) {
    try {
      const { rows } = await this.pool.query(
        `
        DELETE FROM fields
        WHERE id = $1
        RETURNING id
      `,
        [id]
      );
      return rows.length > 0;
    } catch (err) {
      throw new Error(`Lỗi khi xóa sân bóng: ${err.message}`);
    }
  }
}

module.exports = Field;
