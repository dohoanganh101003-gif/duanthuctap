const Field = require("../models/Field");
const SubField = require("../models/SubField");

class FieldController {
  constructor(pool) {
    this.fieldModel = new Field(pool);
    this.subFieldModel = new SubField(pool);
  }

  async getHomePage(req, res) {
    try {
      res.render("trangchu", { session: req.session || {} });
    } catch (err) {
      console.error(err.stack);
      res.status(500).send("Lỗi khi tải trang chủ");
    }
  }

  async getFieldsGeoJSON(req, res) {
    try {
      const { search, lat, lng } = req.query;
      const fields = await this.fieldModel.getAllFields({ search, lat, lng });
      const geoJSON = {
        type: "FeatureCollection",
        features: fields.map((field) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [field.longitude, field.latitude],
          },
          properties: {
            id: field.id,
            name: field.name,
            address: field.address,
            phone: field.phone,
            open_time: field.open_time,
            close_time: field.close_time,
            images: field.images,
            description: field.description,
            price_per_hour: field.price_per_hour,
            surface_type: field.surface_type,
          },
        })),
      };
      res.json(geoJSON);
    } catch (err) {
      console.error("Lỗi khi lấy dữ liệu sân bóng:", err.stack);
      res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
    }
  }

  async getFieldsWithSubFields(req, res) {
    try {
      const fields = await this.fieldModel.getAllFields({});
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
      console.error(err.stack);
      res.status(500).json({ error: "Lỗi cơ sở dữ liệu: " + err.message });
    }
  }

  async createField(req, res) {
    const {
      name,
      address,
      phone,
      latitude,
      longitude,
      open_time,
      close_time,
      price_per_hour,
      surface_type,
      images,
      description,
    } = req.body;
    try {
      if (
        new Date(`1970-01-01T${close_time}Z`) <=
        new Date(`1970-01-01T${open_time}Z`)
      ) {
        return res
          .status(400)
          .json({ error: "Thời gian đóng cửa phải sau thời gian mở cửa" });
      }
      if (price_per_hour < 0) {
        return res
          .status(400)
          .json({ error: "Giá mỗi giờ không được nhỏ hơn 0" });
      }
      const field = await this.fieldModel.createField({
        name,
        address,
        phone,
        latitude,
        longitude,
        open_time,
        close_time,
        price_per_hour,
        surface_type,
        images,
        description,
        owner_id: req.session.user_id,
      });
      res.status(201).json(field);
    } catch (err) {
      console.error("Lỗi khi thêm sân bóng:", err.stack);
      res.status(500).json({ error: "Lỗi máy chủ nội bộ: " + err.message });
    }
  }

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
      price_per_hour,
      surface_type,
      images,
      description,
    } = req.body;
    try {
      if (
        new Date(`1970-01-01T${close_time}Z`) <=
        new Date(`1970-01-01T${open_time}Z`)
      ) {
        return res
          .status(400)
          .json({ error: "Thời gian đóng cửa phải sau thời gian mở cửa" });
      }
      if (price_per_hour < 0) {
        return res
          .status(400)
          .json({ error: "Giá mỗi giờ không được nhỏ hơn 0" });
      }
      const field = await this.fieldModel.updateField(id, {
        name,
        address,
        phone,
        latitude,
        longitude,
        open_time,
        close_time,
        price_per_hour,
        surface_type,
        images,
        description,
      });
      if (!field) {
        return res.status(404).json({ error: "Sân bóng không tồn tại" });
      }
      res.json(field);
    } catch (err) {
      console.error("Lỗi khi cập nhật sân bóng:", err.stack);
      res.status(500).json({ error: "Lỗi máy chủ nội bộ: " + err.message });
    }
  }

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
}

module.exports = FieldController;
