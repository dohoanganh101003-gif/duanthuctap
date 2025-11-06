const SubField = require("../models/SubField");

class SubFieldController {
  constructor(pool) {
    this.pool = pool;
    this.subFieldModel = new SubField(pool);
  }

  // ========== ADMIN ==========
  async getByFieldId(req, res) {
    try {
      const subs = await this.subFieldModel.getSubFieldsByFieldId(
        req.params.field_id
      );
      res.json(subs);
    } catch (err) {
      console.error("Lỗi lấy sân con (admin):", err);
      res.status(500).json({ error: "Lỗi máy chủ khi lấy sân con" });
    }
  }

  async create(req, res) {
    try {
      const { field_id, name, size } = req.body;
      if (!field_id || !name || !size) {
        return res
          .status(400)
          .json({ error: "Thiếu field_id, name hoặc size" });
      }

      const created = await this.subFieldModel.createSubField({
        field_id,
        name,
        size,
      });
      res.status(201).json(created);
    } catch (err) {
      console.error("Lỗi thêm sân con (admin):", err);
      res.status(500).json({ error: "Lỗi máy chủ khi thêm sân con" });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { field_id, name, size } = req.body;

      if (!name || !size)
        return res.status(400).json({ error: "Thiếu thông tin cập nhật" });

      const updated = await this.subFieldModel.updateSubField(id, {
        field_id,
        name,
        size,
      });
      if (!updated)
        return res.status(404).json({ error: "Không tìm thấy sân con" });

      res.json(updated);
    } catch (err) {
      console.error("Lỗi cập nhật sân con (admin):", err);
      res.status(500).json({ error: "Lỗi máy chủ khi cập nhật sân con" });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      const deleted = await this.subFieldModel.deleteSubField(id);
      if (!deleted)
        return res.status(404).json({ error: "Không tìm thấy sân con" });

      res.json({ message: "Xóa sân con thành công" });
    } catch (err) {
      console.error("Lỗi xóa sân con (admin):", err);
      res.status(500).json({ error: "Lỗi máy chủ khi xóa sân con" });
    }
  }

  // ========== OWNER ==========
  async getByFieldIdOwner(req, res) {
    try {
      const { field_id } = req.params;
      const check = await this.pool.query(
        "SELECT id FROM fields WHERE id=$1 AND owner_id=$2",
        [field_id, req.user.user_id]
      );

      if (check.rows.length === 0)
        return res.status(403).json({ error: "Không có quyền xem sân này" });

      const subs = await this.subFieldModel.getSubFieldsByFieldId(field_id);
      res.json(subs);
    } catch (err) {
      console.error("Lỗi lấy sân con (owner):", err);
      res.status(500).json({ error: "Lỗi máy chủ khi lấy sân con" });
    }
  }

  async createByOwner(req, res) {
    try {
      const { field_id, name, size } = req.body;
      if (!field_id || !name || !size)
        return res
          .status(400)
          .json({ error: "Thiếu field_id, name hoặc size" });

      const check = await this.pool.query(
        "SELECT id FROM fields WHERE id=$1 AND owner_id=$2",
        [field_id, req.user.user_id]
      );
      if (check.rows.length === 0)
        return res
          .status(403)
          .json({ error: "Không có quyền thêm sân con cho sân này" });

      const created = await this.subFieldModel.createSubField({
        field_id,
        name,
        size,
      });
      res.status(201).json(created);
    } catch (err) {
      console.error("Lỗi thêm sân con (owner):", err);
      res.status(500).json({ error: "Lỗi máy chủ khi thêm sân con" });
    }
  }

  async updateByOwner(req, res) {
    try {
      const { id } = req.params;
      const { field_id, name, size } = req.body;

      const check = await this.pool.query(
        `SELECT sf.id FROM sub_fields sf
         JOIN fields f ON sf.field_id=f.id
         WHERE sf.id=$1 AND f.owner_id=$2`,
        [id, req.user.user_id]
      );
      if (check.rows.length === 0)
        return res
          .status(403)
          .json({ error: "Không có quyền sửa sân con này" });

      const updated = await this.subFieldModel.updateSubField(id, {
        field_id,
        name,
        size,
      });
      res.json(updated);
    } catch (err) {
      console.error("Lỗi cập nhật sân con (owner):", err);
      res.status(500).json({ error: "Lỗi máy chủ khi cập nhật sân con" });
    }
  }

  async deleteByOwner(req, res) {
    try {
      const { id } = req.params;
      const ownerId = req.user.user_id;

      // Kiểm tra sân con có thuộc sân của chủ này không
      const fieldCheck = await this.pool.query(
        `SELECT f.id 
         FROM sub_fields sf
         JOIN fields f ON f.id = sf.field_id
         WHERE sf.id = $1 AND f.owner_id = $2`,
        [id, ownerId]
      );

      if (fieldCheck.rows.length === 0) {
        return res
          .status(403)
          .json({ error: "Không có quyền xóa sân con này" });
      }

      const bookingCheck = await this.pool.query(
        "SELECT id FROM booking WHERE sub_field_id = $1",
        [id]
      );

      if (bookingCheck.rows.length > 0) {
        return res.status(400).json({
          error: "Không thể xóa vì sân con này đang có đặt sân.",
        });
      }

      await this.pool.query("DELETE FROM sub_fields WHERE id = $1", [id]);

      res.json({ message: "Xóa sân con thành công" });
    } catch (err) {
      console.error("Lỗi khi xóa sân con:", err);
      res.status(500).json({ error: "Lỗi khi xóa sân con" });
    }
  }
}

module.exports = SubFieldController;
