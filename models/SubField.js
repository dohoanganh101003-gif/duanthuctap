class SubField {
  constructor(pool) {
    this.pool = pool;
  }

  async getSubFieldsByFieldId(fieldId) {
    try {
      const { rows } = await this.pool.query(
        `
        SELECT id, field_id, name, type, price_per_hour
        FROM sub_fields
        WHERE field_id = $1
        ORDER BY name
      `,
        [fieldId]
      );
      return rows;
    } catch (err) {
      throw new Error(`Lỗi khi lấy danh sách sân con: ${err.message}`);
    }
  }
}

module.exports = SubField;
