class SubField {
  constructor(pool) {
    this.pool = pool;
  }

  async getSubFieldById(id) {
    const result = await this.pool.query(
      "SELECT id, field_id FROM public.sub_fields WHERE id = $1",
      [id]
    );
    return result.rows[0];
  }

  async getSubFieldsByFieldId(field_id) {
    const result = await this.pool.query(
      "SELECT * FROM public.sub_fields WHERE field_id = $1",
      [field_id]
    );
    return result.rows;
  }

  async createSubField({ field_id, size, name }) {
    const result = await this.pool.query(
      "INSERT INTO public.sub_fields (field_id, size, name) VALUES ($1, $2, $3) RETURNING *",
      [field_id, size, name]
    );
    return result.rows[0];
  }

  async updateSubField(id, { field_id, size, name }) {
    const result = await this.pool.query(
      "UPDATE public.sub_fields SET field_id = $1, size = $2, name = $3 WHERE id = $4 RETURNING *",
      [field_id, size, name, id]
    );
    return result.rows[0];
  }

  async deleteSubField(id) {
    const result = await this.pool.query(
      "DELETE FROM public.sub_fields WHERE id = $1 RETURNING *",
      [id]
    );
    return result.rows[0];
  }
}

module.exports = SubField;
