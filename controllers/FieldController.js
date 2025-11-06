const Field = require("../models/Field");
const SubField = require("../models/SubField");

function formatTime(time) {
  if (!time) return "N/A";
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours, 10);
  const m = parseInt(minutes, 10);
  if (isNaN(h) || isNaN(m)) return "N/A";
  const period = h >= 12 ? "PM" : "AM";
  const formattedHour = h % 12 || 12;
  return `${formattedHour}:${m.toString().padStart(2, "0")} ${period}`;
}

class FieldController {
  constructor(pool) {
    this.pool = pool;
    this.fieldModel = new Field(pool);
    this.subFieldModel = new SubField(pool);
  }

  //Trang chủ: hiển thị danh sách sân
  async getHomePage(req, res) {
    try {
      const { lat, lng } = req.query;
      const fields = await this.fieldModel.getAllFields({
        search: req.query.search || "",
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
      });

      const fieldsWithSubFields = await Promise.all(
        fields.map(async (field) => {
          const subFields = await this.subFieldModel.getSubFieldsByFieldId(
            field.id
          );
          return {
            ...field,
            subFields,
            open_time: formatTime(field.open_time),
            close_time: formatTime(field.close_time),
          };
        })
      );

      res.render("trangchu", {
        session: req.session || {},
        fields: fieldsWithSubFields,
      });
    } catch (err) {
      console.error("Lỗi khi tải trang chủ:", err.stack);
      res.status(500).send("Lỗi khi tải trang chủ: " + err.message);
    }
  }

  // Lấy dữ liệu sân bóng dạng GeoJSON
  async getFieldsGeoJSON(req, res) {
    try {
      const { search, lat, lng } = req.query;

      const fields = await this.fieldModel.getAllFields({
        search: search || "",
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
      });

      for (const field of fields) {
        const subFields = await this.subFieldModel.getSubFieldsByFieldId(
          field.id
        );
        field.subFields = subFields || [];
      }

      let userLat = lat ? parseFloat(lat) : null;
      let userLng = lng ? parseFloat(lng) : null;
      if (userLat && userLng) {
        for (const f of fields) {
          if (f.latitude && f.longitude) {
            const R = 6371000;
            const dLat = ((f.latitude - userLat) * Math.PI) / 180;
            const dLng = ((f.longitude - userLng) * Math.PI) / 180;
            const a =
              Math.sin(dLat / 2) ** 2 +
              Math.cos((userLat * Math.PI) / 180) *
                Math.cos((f.latitude * Math.PI) / 180) *
                Math.sin(dLng / 2) ** 2;
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            f.distance = Math.round(R * c);
          } else {
            f.distance = null;
          }
        }
        fields.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      }

      const geoJSON = {
        type: "FeatureCollection",
        features: fields.map((f) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [f.longitude, f.latitude],
          },
          properties: {
            id: f.id,
            name: f.name,
            address: f.address,
            phone: f.phone,
            open_time: f.open_time,
            close_time: f.close_time,
            surface_type: f.surface_type,
            price_per_hour: f.price_per_hour,
            images: f.images,
            distance: f.distance,
            subFields: f.subFields || [],
          },
        })),
      };

      res.json(geoJSON);
    } catch (err) {
      console.error("Lỗi khi lấy danh sách sân bóng:", err);
      res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
    }
  }

  // Lấy danh sách sân + sân con
  async getFieldsWithSubFields(req, res) {
    try {
      const { search, lat, lng } = req.query;
      const fields = await this.fieldModel.getAllFields({
        search: search || "",
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
      });
      const fieldsWithSubFields = await Promise.all(
        fields.map(async (field) => {
          const subFields = await this.subFieldModel.getSubFieldsByFieldId(
            field.id
          );
          return { ...field, subFields };
        })
      );
      res.json(fieldsWithSubFields);
    } catch (err) {
      console.error("Lỗi khi lấy danh sách sân bóng với subfields:", err.stack);
      res.status(500).json({ error: "Lỗi máy chủ nội bộ: " + err.message });
    }
  }

  // Hiển thị form thêm sân (Admin)
  async renderAddFieldPage(req, res) {
    try {
      const result = await this.pool.query(
        "SELECT id, username FROM public.users WHERE role='owner'"
      );
      res.render("them_sanbong", {
        owners: result.rows,
        session: req.session,
      });
    } catch (err) {
      console.error("Lỗi render trang thêm sân:", err);
      res.status(500).send("Lỗi server");
    }
  }

  // Thêm sân mới (Admin)
  async createField(req, res) {
    try {
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
      } = req.body;

      const field = await this.fieldModel.createField({
        name,
        address,
        phone,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        open_time,
        close_time,
        images: images ? JSON.parse(images) : [],
        description,
        price_per_hour: parseFloat(price_per_hour),
        surface_type,
        owner_id,
      });
      res.status(201).json({ id: field.id });
    } catch (err) {
      console.error("Lỗi khi thêm sân bóng:", err);
      res.status(500).json({ error: "Lỗi máy chủ: " + err.message });
    }
  }

  // Cập nhật sân (Admin)
  async updateField(req, res) {
    const { id } = req.params;
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
    } = req.body;
    try {
      if (
        !name ||
        !address ||
        !phone ||
        !open_time ||
        !close_time ||
        !latitude ||
        !longitude ||
        !price_per_hour
      ) {
        return res
          .status(400)
          .json({ error: "Thiếu thông tin sân bóng bắt buộc!" });
      }

      if (
        new Date(`1970-01-01T${close_time}Z`) <=
        new Date(`1970-01-01T${open_time}Z`)
      ) {
        return res
          .status(400)
          .json({ error: "Thời gian đóng cửa phải sau thời gian mở cửa" });
      }

      if (parseFloat(price_per_hour) < 0) {
        return res
          .status(400)
          .json({ error: "Giá mỗi giờ không được nhỏ hơn 0" });
      }

      const field = await this.fieldModel.updateField(id, {
        name,
        address,
        phone,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        open_time,
        close_time,
        price_per_hour: parseFloat(price_per_hour),
        surface_type,
        images: images ? JSON.parse(images) : [],
        description,
        owner_id: req.session.user_id || null,
      });

      if (!field) {
        return res.status(404).json({ error: "Sân bóng không tồn tại" });
      }

      res.json({ id: field.id });
    } catch (err) {
      console.error("Lỗi khi cập nhật sân bóng:", err.stack);
      res.status(500).json({ error: "Lỗi máy chủ nội bộ: " + err.message });
    }
  }

  // Xóa sân (Admin)
  async deleteField(req, res) {
    const { id } = req.params;
    try {
      const field = await this.fieldModel.deleteField(id);
      if (!field) {
        return res.status(404).json({ error: "Sân bóng không tồn tại" });
      }
      res.json({ message: "Xóa sân bóng thành công" });
    } catch (err) {
      console.error("Lỗi khi xóa sân bóng:", err.stack);
      res.status(500).json({ error: "Lỗi máy chủ nội bộ: " + err.message });
    }
  }

  // Hiển thị form sửa sân
  async getFieldById(req, res) {
    try {
      const { id } = req.params;
      const field = await this.fieldModel.getFieldById(id);
      if (!field) {
        return res.status(404).send("Không tìm thấy sân bóng");
      }
      res.render("sua-sanbong", {
        session: req.session || {},
        field,
      });
    } catch (err) {
      console.error("Lỗi khi lấy sân bóng:", err.stack);
      res.status(500).send("Lỗi máy chủ: " + err.message);
    }
  }
  // Hiển thị danh sách sân bóng cho ADMIN
  async renderAdminFieldsPage(req, res) {
    try {
      const query = `
        SELECT f.*, u.username AS owner_username
        FROM public.fields f
        LEFT JOIN public.users u ON f.owner_id = u.id
        ORDER BY f.id ASC;
      `;
      const result = await this.pool.query(query);
      const fields = result.rows;

      // Lấy sân con cho từng sân
      const fieldsWithSubFields = await Promise.all(
        fields.map(async (field) => {
          const subFields = await this.subFieldModel.getSubFieldsByFieldId(
            field.id
          );
          return { ...field, subFields };
        })
      );

      res.render("danhsach_sanbong", {
        session: req.session || {},
        fields: fieldsWithSubFields,
      });
    } catch (err) {
      console.error("Lỗi khi tải trang danh sách sân bóng (admin):", err.stack);
      res.status(500).send("Lỗi khi tải danh sách sân bóng: " + err.message);
    }
  }
  // Hiển thị trang quản lý sân con cho ADMIN
  async renderAdminSubFieldsPage(req, res) {
    try {
      const { field_id } = req.params;
      const fieldResult = await this.pool.query(
        "SELECT * FROM fields WHERE id = $1",
        [field_id]
      );

      if (fieldResult.rows.length === 0) {
        return res.status(404).send("Không tìm thấy sân bóng");
      }

      const field = fieldResult.rows[0];
      const subFields = await this.subFieldModel.getSubFieldsByFieldId(
        field_id
      );

      res.render("danhsach_sancon", {
        session: req.session,
        field,
        subFields,
      });
    } catch (err) {
      console.error("Lỗi khi hiển thị trang sân con (admin):", err);
      res.status(500).send("Lỗi máy chủ khi hiển thị sân con");
    }
  }
}

module.exports = FieldController;
