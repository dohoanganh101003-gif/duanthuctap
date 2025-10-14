const path = require("path");
const Field = require("../models/Field");
const SubField = require("../models/SubField");
const Booking = require("../models/Booking");

// ========== DANH SÁCH SÂN BÓNG CỦA CHỦ SÂN ==========
exports.getOwnerFields = async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const fieldModel = new Field(pool);
    const subFieldModel = new SubField(pool);

    const fields = await fieldModel.getFieldsByOwner(req.session.user_id);
    const fieldsWithSubs = await Promise.all(
      fields.map(async (field) => {
        const subFields = await subFieldModel.getSubFieldsByFieldId(field.id);
        return { ...field, subFields };
      })
    );

    res.render("owner/chusan_sanbong", {
      session: req.session,
      fields: fieldsWithSubs,
    });
  } catch (err) {
    console.error("Lỗi khi tải danh sách sân bóng:", err);
    res.status(500).send("Lỗi server khi tải danh sách sân bóng");
  }
};

// ========== TRANG THÊM / SỬA ==========
exports.renderAddField = (req, res) => {
  res.render("owner/chusan_them_sanbong", { session: req.session });
};

exports.renderEditField = async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const fieldModel = new Field(pool);
    const field = await fieldModel.getFieldById(req.params.id);

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
};

// ========== TRANG QUẢN LÝ ĐẶT SÂN ==========
exports.getOwnerBookings = async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const bookingModel = new Booking(pool);
    const bookings = await bookingModel.getBookingsByOwnerId(req.user.user_id);

    res.render("owner/chusan_datsan", {
      title: "Quản lý đặt sân",
      bookings,
      session: req.session,
    });
  } catch (err) {
    console.error("Lỗi khi tải danh sách đặt sân:", err);
    res.status(500).send("Lỗi server khi tải trang quản lý đặt sân");
  }
};

// ========== API: LẤY / THÊM / CẬP NHẬT / XÓA SÂN ==========
exports.getFieldById = async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const fieldModel = new Field(pool);
    const field = await fieldModel.getFieldById(req.params.id);

    if (!field || field.owner_id !== req.user.user_id)
      return res.status(404).json({ error: "Không tìm thấy sân" });

    res.json(field);
  } catch (err) {
    console.error("Lỗi GET /api/sanbong/:id:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
};

exports.createField = async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const fieldModel = new Field(pool);

    const data = {
      ...req.body,
      latitude: parseFloat(req.body.latitude) || 0,
      longitude: parseFloat(req.body.longitude) || 0,
      price_per_hour: parseFloat(req.body.price_per_hour) || 0,
      owner_id: req.user.user_id,
      images:
        req.files && req.files.length > 0
          ? req.files.map((f) => "/uploads/" + path.basename(f.path))
          : null,
    };

    await fieldModel.createField(data);
    res.status(201).send("OK");
  } catch (err) {
    console.error("Lỗi POST /api/sanbong:", err);
    res.status(500).send("Lỗi server khi thêm sân");
  }
};

exports.updateField = async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const fieldModel = new Field(pool);
    const field = await fieldModel.getFieldById(req.params.id);

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
        req.files && req.files.length > 0
          ? req.files.map((f) => "/uploads/" + path.basename(f.path))
          : field.images,
    };

    await fieldModel.updateField(req.params.id, updated);
    res.send("OK");
  } catch (err) {
    console.error("Lỗi PUT /api/sanbong/:id:", err);
    res.status(500).send("Lỗi server khi cập nhật sân");
  }
};

exports.deleteField = async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const fieldModel = new Field(pool);
    const field = await fieldModel.getFieldById(req.params.id);

    if (!field || field.owner_id !== req.user.user_id)
      return res.status(403).json({ error: "Bạn không có quyền xóa sân này" });

    await fieldModel.deleteField(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error("Lỗi DELETE /api/sanbong/:id:", err);
    res.status(500).json({ error: "Lỗi server khi xóa sân" });
  }
};

// ========== API: XÁC NHẬN / HỦY ĐẶT SÂN ==========
exports.confirmBooking = async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const bookingModel = new Booking(pool);
    await bookingModel.updateBookingStatus(req.params.id, "confirmed");
    res.json({ success: true, message: "Đã xác nhận đặt sân" });
  } catch (err) {
    console.error("Lỗi xác nhận đặt sân:", err);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server khi xác nhận" });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const bookingModel = new Booking(pool);
    await bookingModel.updateBookingStatus(req.params.id, "cancelled");
    res.json({ success: true, message: "Đã hủy đặt sân" });
  } catch (err) {
    console.error("Lỗi hủy đặt sân:", err);
    res.status(500).json({ success: false, message: "Lỗi server khi hủy" });
  }
};

// ========== TRANG QUẢN LÝ SÂN CON ==========
exports.getSubFieldsByField = async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const fieldModel = new Field(pool);
    const subFieldModel = new SubField(pool);

    const field = await fieldModel.getFieldById(req.params.field_id);
    if (!field || field.owner_id !== req.user.user_id)
      return res
        .status(404)
        .send("Không tìm thấy sân hoặc bạn không có quyền truy cập");

    const subFields = await subFieldModel.getSubFieldsByFieldId(
      req.params.field_id
    );

    res.render("owner/chusan_sancon", {
      session: req.session,
      field,
      subFields,
    });
  } catch (err) {
    console.error("Lỗi khi load trang sân con:", err);
    res.status(500).send("Lỗi server");
  }
};
