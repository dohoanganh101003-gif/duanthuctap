const path = require("path");
const Field = require("../models/Field");
const SubField = require("../models/SubField");
const Booking = require("../models/Booking");

class OwnerController {
  constructor(pool) {
    this.pool = pool;
    this.fieldModel = new Field(pool);
    this.subFieldModel = new SubField(pool);
    this.bookingModel = new Booking(pool);
  }

  /** ===================== TRANG DANH SÁCH SÂN ===================== **/
  async getOwnerFields(req, res) {
    try {
      const fields = await this.fieldModel.getFieldsByOwner(
        req.session.user_id
      );
      const fieldsWithSubs = await Promise.all(
        fields.map(async (field) => {
          const subFields = await this.subFieldModel.getSubFieldsByFieldId(
            field.id
          );
          return { ...field, subFields };
        })
      );

      res.render("owner/chusan_sanbong", {
        session: req.session,
        fields: fieldsWithSubs,
      });
    } catch (err) {
      console.error("Lỗi khi tải danh sách sân:", err);
      res.status(500).send("Lỗi server khi tải danh sách sân");
    }
  }

  /** ===================== TRANG THÊM / SỬA ===================== **/
  renderAddField(req, res) {
    res.render("owner/chusan_them_sanbong", { session: req.session });
  }

  async renderEditField(req, res) {
    try {
      const field = await this.fieldModel.getFieldById(req.params.id);
      if (!field || field.owner_id !== req.user.user_id)
        return res.status(403).send("Bạn không có quyền sửa sân này");

      res.render("owner/chusan_sua_sanbong", {
        session: req.session,
        field,
      });
    } catch (err) {
      console.error("Lỗi khi tải sân để sửa:", err);
      res.status(500).send("Lỗi server");
    }
  }

  /** ===================== TRANG QUẢN LÝ ĐẶT SÂN ===================== **/
  async getOwnerBookings(req, res) {
    try {
      const bookings =
        await this.bookingModel.getBookingsByOwnerIdWithUserPhone(
          req.user.user_id
        );
      res.render("owner/chusan_datsan", {
        title: "Quản lý đặt sân",
        bookings,
        session: req.session,
      });
    } catch (err) {
      console.error("Lỗi khi tải danh sách đặt sân:", err);
      res.status(500).send("Lỗi server khi tải trang quản lý đặt sân");
    }
  }

  /** ===================== TRANG QUẢN LÝ SÂN CON ===================== **/
  async getSubFieldsByField(req, res) {
    try {
      const field = await this.fieldModel.getFieldById(req.params.field_id);
      if (!field || field.owner_id !== req.user.user_id)
        return res
          .status(404)
          .send("Không tìm thấy sân hoặc không có quyền truy cập");

      const subFields = await this.subFieldModel.getSubFieldsByFieldId(
        req.params.field_id
      );

      res.render("owner/chusan_sancon", {
        session: req.session,
        field,
        subFields,
      });
    } catch (err) {
      console.error("Lỗi khi tải trang sân con:", err);
      res.status(500).send("Lỗi server");
    }
  }

  /** ===================== API: LẤY / THÊM / CẬP NHẬT / XÓA SÂN ===================== **/
  async getFieldById(req, res) {
    try {
      const field = await this.fieldModel.getFieldById(req.params.id);
      if (!field || field.owner_id !== req.user.user_id)
        return res.status(404).json({ error: "Không tìm thấy sân" });
      res.json(field);
    } catch (err) {
      console.error("Lỗi GET /api/sanbong/:id:", err);
      res.status(500).json({ error: "Lỗi server" });
    }
  }

  async createField(req, res) {
    try {
      const data = {
        ...req.body,
        latitude: parseFloat(req.body.latitude) || 0,
        longitude: parseFloat(req.body.longitude) || 0,
        price_per_hour: parseFloat(req.body.price_per_hour) || 0,
        owner_id: req.user.user_id,
        images:
          req.files?.images?.map((f) => "/uploads/" + path.basename(f.path)) ||
          null,
        qr_image:
          req.files?.qr_image?.length > 0
            ? "/uploads/" + path.basename(req.files.qr_image[0].path)
            : null,
      };

      await this.fieldModel.createField(data);
      res.status(201).send("OK");
    } catch (err) {
      console.error("Lỗi POST /api/sanbong:", err);
      res.status(500).send("Lỗi server khi thêm sân");
    }
  }

  async updateField(req, res) {
    try {
      const field = await this.fieldModel.getFieldById(req.params.id);
      if (!field || field.owner_id !== req.user.user_id)
        return res.status(403).send("Bạn không có quyền sửa sân này");

      const updated = {
        ...field,
        ...req.body,
        latitude: parseFloat(req.body.latitude) || field.latitude,
        longitude: parseFloat(req.body.longitude) || field.longitude,
        price_per_hour:
          parseFloat(req.body.price_per_hour) || field.price_per_hour,
        images:
          req.files?.images?.map((f) => "/uploads/" + path.basename(f.path)) ||
          field.images,
        qr_image:
          req.files?.qr_image?.length > 0
            ? "/uploads/" + path.basename(req.files.qr_image[0].path)
            : field.qr_image,
      };

      await this.fieldModel.updateField(req.params.id, updated);
      res.send("OK");
    } catch (err) {
      console.error("Lỗi PUT /api/sanbong/:id:", err);
      res.status(500).send("Lỗi server khi cập nhật sân");
    }
  }

  async deleteField(req, res) {
    try {
      const field = await this.fieldModel.getFieldById(req.params.id);
      if (!field || field.owner_id !== req.user.user_id)
        return res
          .status(403)
          .json({ error: "Bạn không có quyền xóa sân này" });

      await this.fieldModel.deleteField(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      console.error("Lỗi DELETE /api/sanbong/:id:", err);
      res.status(500).json({ error: "Lỗi server khi xóa sân" });
    }
  }
}

module.exports = OwnerController;
