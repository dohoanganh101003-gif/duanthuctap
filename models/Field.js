class Field {
  constructor(pool) {
    this.pool = pool; // Đảm bảo pool được gán
  }

  async getAllFields({ search, lat, lng, radius = 10000 }) {
    try {
      let query = `
          SELECT id, name, address, phone, latitude, longitude, open_time, close_time, images, description, price_per_hour, surface_type, owner_id
          FROM public.fields
        `;
      let params = [];
      let conditions = [];
      if (search) {
        conditions.push("LOWER(name) LIKE LOWER($" + (params.length + 1) + ")");
        params.push(`%${search}%`);
      }
      if (lat && lng) {
        conditions.push(
          "ST_DWithin(ST_SetSRID(ST_MakePoint(longitude, latitude), 4326), ST_SetSRID(ST_MakePoint($" +
            (params.length + 1) +
            ", $" +
            (params.length + 2) +
            "), 4326), $" +
            (params.length + 3) +
            ")"
        );
        params.push(lng, lat, radius / 111320); // Chuyển m sang độ
      }
      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }
      query += " ORDER BY name";
      const { rows } = await this.pool.query(query, params);
      return rows.map((row) => ({
        ...row,
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
      }));
    } catch (err) {
      throw new Error(`Lỗi khi lấy danh sách sân bóng: ${err.message}`);
    }
  }

  async getGeoJSONFields() {
    const result = await this.pool.query("SELECT * FROM public.fields");
    return {
      type: "FeatureCollection",
      features: result.rows.map((row) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [parseFloat(row.longitude), parseFloat(row.latitude)],
        },
        properties: {
          id: row.id,
          name: row.name,
          address: row.address,
          phone: row.phone,
          open_time: row.open_time,
          close_time: row.close_time,
          images: row.images,
          description: row.description,
          price_per_hour: row.price_per_hour,
          surface_type: row.surface_type,
          owner_id: row.owner_id,
        },
      })),
    };
  }

  async getFieldById(id) {
    const result = await this.pool.query(
      "SELECT * FROM public.fields WHERE id = $1",
      [id]
    );
    return result.rows[0];
  }

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
      "INSERT INTO public.fields (name, address, phone, latitude, longitude, open_time, close_time, images, description, price_per_hour, surface_type, owner_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *",
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
      "UPDATE public.fields SET name = $1, address = $2, phone = $3, latitude = $4, longitude = $5, open_time = $6, close_time = $7, images = $8, description = $9, price_per_hour = $10, surface_type = $11 WHERE id = $12 RETURNING *",
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

  async deleteField(id) {
    const result = await this.pool.query(
      "DELETE FROM public.fields WHERE id = $1 RETURNING *",
      [id]
    );
    return result.rows[0];
  }
}

module.exports = Field;
