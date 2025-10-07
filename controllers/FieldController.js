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
    this.fieldModel = new Field(pool);
    this.subFieldModel = new SubField(pool);
  }

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

  async getFieldsGeoJSON(req, res) {
    try {
      const { search, lat, lng } = req.query;
      const fields = await this.fieldModel.getAllFields({
        search: search || "",
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
      });
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
      res.status(500).json({ error: "Lỗi máy chủ nội bộ: " + err.message });
    }
  }

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

  async createField(req, res) {
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
      owner_id, // gán vào đây
    });

    res.status(201).json({ id: field.id });
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
}

module.exports = FieldController;
