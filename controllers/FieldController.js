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
      const fields = await this.fieldModel.getAllFields();
      const geojson = {
        type: "FeatureCollection",
        features: fields.map((field) => ({
          type: "Feature",
          geometry: field.location,
          properties: {
            id: field.id,
            name: field.name,
            address: field.address,
          },
        })),
      };
      res.json(geojson);
    } catch (err) {
      console.error(err.stack);
      res.status(500).json({ error: err.message });
    }
  }

  async getFieldsWithSubFields(req, res) {
    try {
      const fields = await this.fieldModel.getAllFields();
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
      res.status(500).json({ error: err.message });
    }
  }

  async createField(req, res) {
    try {
      const { name, address, latitude, longitude } = req.body;
      if (!name || !address || !latitude || !longitude) {
        return res.status(400).json({ error: "Thiếu thông tin sân bóng" });
      }
      const field = await this.fieldModel.createField({
        name,
        address,
        latitude,
        longitude,
      });
      res.status(201).json({ message: "Tạo sân bóng thành công", field });
    } catch (err) {
      console.error(err.stack);
      res.status(500).json({ error: err.message });
    }
  }

  async updateField(req, res) {
    try {
      const { id } = req.params;
      const { name, address, latitude, longitude } = req.body;
      if (!name || !address || !latitude || !longitude) {
        return res.status(400).json({ error: "Thiếu thông tin sân bóng" });
      }
      const field = await this.fieldModel.updateField(id, {
        name,
        address,
        latitude,
        longitude,
      });
      if (!field) {
        return res.status(404).json({ error: "Sân bóng không tồn tại" });
      }
      res.json({ message: "Cập nhật sân bóng thành công", field });
    } catch (err) {
      console.error(err.stack);
      res.status(500).json({ error: err.message });
    }
  }

  async deleteField(req, res) {
    try {
      const { id } = req.params;
      const success = await this.fieldModel.deleteField(id);
      if (!success) {
        return res.status(404).json({ error: "Sân bóng không tồn tại" });
      }
      res.json({ message: "Xóa sân bóng thành công" });
    } catch (err) {
      console.error(err.stack);
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = FieldController;
