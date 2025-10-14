class SubField {
  constructor(pool) {
    this.pool = pool;
  }
  // Lấy sân con theo ID
  async getSubFieldById(id) {
    const result = await this.pool.query(
      "SELECT * FROM public.sub_fields WHERE id = $1",
      [id]
    );
    return result.rows[0];
  }
  // Lấy tất cả sân con của 1 sân cha
  async getSubFieldsByFieldId(field_id) {
    const result = await this.pool.query(
      "SELECT * FROM public.sub_fields WHERE field_id = $1 ORDER BY id ASC",
      [field_id]
    );
    return result.rows;
  }
  // Tạo sân con
  async createSubField({ field_id, size, name }) {
    const result = await this.pool.query(
      "INSERT INTO public.sub_fields (field_id, size, name) VALUES ($1, $2, $3) RETURNING *",
      [field_id, size, name]
    );
    return result.rows[0];
  }

  // Cập nhật sân con
  async updateSubField(id, data) {
    const { field_id, size, name } = data;
    const current = await this.getSubFieldById(id);
    const finalFieldId = field_id || current.field_id;
    const result = await this.pool.query(
      "UPDATE public.sub_fields SET field_id=$1, size=$2, name=$3 WHERE id=$4 RETURNING *",
      [finalFieldId, size, name, id]
    );

    return result.rows[0];
  }

  // Xóa sân con
  async deleteSubField(id) {
    const result = await this.pool.query(
      "DELETE FROM public.sub_fields WHERE id = $1 RETURNING *",
      [id]
    );
    return result.rows[0];
  }
}

module.exports = SubField;
