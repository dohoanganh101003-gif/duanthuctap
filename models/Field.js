class Field {
  constructor(pool) {
    this.pool = pool;
  }

  // Lấy tất cả sân (cho admin hoặc tìm kiếm)
  async getAllFields({ search, lat, lng, radius = 10000 } = {}) {
    try {
      let query = `
        SELECT id, name, address, phone, latitude, longitude, open_time, close_time,
               images, description, price_per_hour, surface_type, owner_id
        FROM public.fields
      `;
      const params = [];
      const conditions = [];

      if (search) {
        conditions.push(`LOWER(name) LIKE LOWER($${params.length + 1})`);
        params.push(`%${search}%`);
      }

      if (conditions.length > 0) query += " WHERE " + conditions.join(" AND ");
      query += " ORDER BY id ASC";

      const { rows } = await this.pool.query(query, params);
      return rows.map((r) => ({
        ...r,
        latitude: parseFloat(r.latitude),
        longitude: parseFloat(r.longitude),
      }));
    } catch (err) {
      throw new Error(`Lỗi khi lấy danh sách sân bóng: ${err.message}`);
    }
  }

  // Lấy sân theo ID
  async getFieldById(id) {
    const result = await this.pool.query(
      "SELECT * FROM public.fields WHERE id = $1",
      [id]
    );
    return result.rows[0];
  }

  //Lấy danh sách sân theo chủ sở hữu
  async getFieldsByOwner(owner_id) {
    try {
      const result = await this.pool.query(
        `SELECT * FROM public.fields 
         WHERE owner_id = $1
         ORDER BY id ASC`,
        [owner_id]
      );
      return result.rows;
    } catch (err) {
      throw new Error(`Lỗi khi lấy danh sách sân theo chủ sân: ${err.message}`);
    }
  }

  // Tạo sân mới
  async createField(data) {
    const {
      name,
      address,
      phone,
      latitude,
      longitude,
      open_time,
      close_time,
      images,
      description,
      price_per_hour,
      surface_type,
      owner_id,
    } = data;

    const result = await this.pool.query(
      `INSERT INTO public.fields 
       (name, address, phone, latitude, longitude, open_time, close_time,
        images, description, price_per_hour, surface_type, owner_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        name,
        address,
        phone,
        latitude,
        longitude,
        open_time,
        close_time,
        images,
        description,
        price_per_hour,
        surface_type,
        owner_id,
      ]
    );
    return result.rows[0];
  }

  // Cập nhật sân
  async updateField(id, data) {
    const {
      name,
      address,
      phone,
      latitude,
      longitude,
      open_time,
      close_time,
      images,
      description,
      price_per_hour,
      surface_type,
    } = data;

    const result = await this.pool.query(
      `UPDATE public.fields
       SET name=$1, address=$2, phone=$3, latitude=$4, longitude=$5,
           open_time=$6, close_time=$7, images=$8, description=$9,
           price_per_hour=$10, surface_type=$11
       WHERE id=$12
       RETURNING *`,
      [
        name,
        address,
        phone,
        latitude,
        longitude,
        open_time,
        close_time,
        images,
        description,
        price_per_hour,
        surface_type,
        id,
      ]
    );
    return result.rows[0];
  }

  // Xóa sân
  async deleteField(id) {
    const result = await this.pool.query(
      "DELETE FROM public.fields WHERE id = $1 RETURNING *",
      [id]
    );
    return result.rows[0];
  }
}

module.exports = Field;
