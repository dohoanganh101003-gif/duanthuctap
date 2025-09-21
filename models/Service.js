class Service {
  constructor(pool) {
    this.pool = pool;
  }

  async getServicesByFieldId(field_id) {
    const result = await this.pool.query(
      "SELECT * FROM public.service WHERE field_id = $1",
      [field_id]
    );
    return result.rows;
  }

  async createService({ field_id, name, description, price }) {
    const result = await this.pool.query(
      "INSERT INTO public.service (field_id, name, description, price) VALUES ($1, $2, $3, $4) RETURNING *",
      [field_id, name, description, price]
    );
    return result.rows[0];
  }

  async updateService(id, { field_id, name, description, price }) {
    const result = await this.pool.query(
      "UPDATE public.service SET field_id = $1, name = $2, description = $3, price = $4 WHERE id = $5 RETURNING *",
      [field_id, name, description, price, id]
    );
    return result.rows[0];
  }

  async deleteService(id) {
    const result = await this.pool.query(
      "DELETE FROM public.service WHERE id = $1 RETURNING *",
      [id]
    );
    return result.rows[0];
  }
}

module.exports = Service;
