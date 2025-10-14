const Service = require("../models/Service");

class ServiceController {
  constructor(pool) {
    this.pool = pool;
    this.serviceModel = new Service(pool);
  }

  // ========== ADMIN ==========
  async getAllServices(req, res) {
    try {
      const services = await this.serviceModel.getAllServices();
      res.render("danhsach-dichvu", {
        services,
        session: req.session || {},
      });
    } catch (err) {
      console.error("Lỗi khi lấy danh sách dịch vụ:", err.stack);
      res.status(500).send("Lỗi server");
    }
  }

  async renderAddService(req, res) {
    try {
      const fields = await this.pool.query("SELECT * FROM public.fields");
      res.render("them_dichvu", {
        fields: fields.rows,
        session: req.session || {},
      });
    } catch (err) {
      console.error("Lỗi khi render form thêm dịch vụ:", err.stack);
      res.status(500).send("Lỗi server");
    }
  }

  async createService(req, res) {
    try {
      const { field_id, name, description, price } = req.body;
      if (req.session.role === "owner") {
        const fieldCheck = await this.pool.query(
          "SELECT owner_id FROM public.fields WHERE id = $1",
          [field_id]
        );
        if (
          !fieldCheck.rows[0] ||
          fieldCheck.rows[0].owner_id !== req.session.user_id
        ) {
          return res
            .status(403)
            .send("Bạn không có quyền thêm dịch vụ cho sân này");
        }
      }
      await this.serviceModel.createService({
        field_id,
        name,
        description,
        price,
      });
      res.redirect("/danhsach-dichvu");
    } catch (err) {
      console.error("Lỗi khi thêm dịch vụ:", err.stack);
      res.status(500).send("Lỗi server");
    }
  }

  async renderEditService(req, res) {
    try {
      const id = req.params.id;
      const result = await this.pool.query(
        `SELECT s.*, f.name AS field_name
         FROM public.service s
         JOIN public.fields f ON s.field_id = f.id
         WHERE s.id = $1`,
        [id]
      );
      if (result.rows.length === 0)
        return res.status(404).send("Không tìm thấy dịch vụ");

      const fields = await this.pool.query("SELECT * FROM public.fields");
      res.render("sua_dichvu", {
        service: result.rows[0],
        fields: fields.rows,
        session: req.session || {},
      });
    } catch (err) {
      console.error("Lỗi hiển thị form sửa dịch vụ:", err);
      res.status(500).send("Lỗi server");
    }
  }

  async updateService(req, res) {
    try {
      const id = req.params.id;
      const { field_id, name, description, price } = req.body;
      await this.serviceModel.updateService(id, {
        field_id,
        name,
        description,
        price,
      });
      res.redirect("/danhsach-dichvu");
    } catch (err) {
      console.error("Lỗi cập nhật dịch vụ:", err);
      res.status(500).send("Lỗi server");
    }
  }

  async deleteService(req, res) {
    try {
      const id = req.params.id;
      await this.serviceModel.deleteService(id);
      res.status(200).json({ message: "Xóa thành công" });
    } catch (err) {
      console.error("Lỗi khi xóa dịch vụ:", err);
      res.status(500).json({ message: "Lỗi server" });
    }
  }

  // Lấy dịch vụ theo sân bóng
  async getByFieldId(req, res) {
    try {
      const { sanbong_id } = req.params;
      const services = await this.serviceModel.getServicesByFieldId(sanbong_id);
      res.json(services);
    } catch (err) {
      console.error("Lỗi lấy dịch vụ theo sân:", err);
      res.status(500).json({ error: "Lỗi server" });
    }
  }

  // ========== OWNER ==========
  async getOwnerServices(req, res) {
    try {
      const ownerId = req.session.user_id;
      const services = await this.serviceModel.getServicesByOwnerId(ownerId);
      res.render("owner/chusan_dichvu", {
        session: req.session || {},
        services,
      });
    } catch (err) {
      console.error("Lỗi khi lấy danh sách dịch vụ:", err);
      res.status(500).send("Lỗi server");
    }
  }

  async showAddForm(req, res) {
    try {
      const ownerId = req.session.user_id;
      const fields = await this.pool.query(
        "SELECT id, name FROM public.fields WHERE owner_id = $1",
        [ownerId]
      );
      res.render("owner/chusan_them_dichvu", {
        session: req.session,
        fields: fields.rows,
      });
    } catch (err) {
      console.error("Lỗi khi render form thêm dịch vụ:", err);
      res.status(500).send("Lỗi server");
    }
  }

  async addServiceByOwner(req, res) {
    try {
      const { name, description, price, field_id } = req.body;
      const ownerId = req.session.user_id;

      const fieldCheck = await this.pool.query(
        "SELECT owner_id FROM public.fields WHERE id = $1",
        [field_id]
      );
      if (!fieldCheck.rows[0] || fieldCheck.rows[0].owner_id !== ownerId) {
        return res.status(403).send("Bạn không có quyền thêm dịch vụ này");
      }

      await this.serviceModel.createService({
        field_id,
        name,
        description,
        price,
      });
      res.redirect("/owner/chusan_dichvu");
    } catch (err) {
      console.error("Lỗi khi thêm dịch vụ:", err);
      res.status(500).send("Lỗi server");
    }
  }

  async showEditForm(req, res) {
    try {
      const ownerId = req.session.user_id;
      const serviceId = req.params.id;

      const service = await this.pool.query(
        `SELECT s.*, f.owner_id
         FROM public.service s
         JOIN public.fields f ON s.field_id = f.id
         WHERE s.id = $1 AND f.owner_id = $2`,
        [serviceId, ownerId]
      );

      if (service.rows.length === 0)
        return res.status(404).send("Không tìm thấy dịch vụ");

      const fields = await this.pool.query(
        "SELECT id, name FROM public.fields WHERE owner_id = $1",
        [ownerId]
      );

      res.render("owner/chusan_sua_dichvu", {
        session: req.session,
        service: service.rows[0],
        fields: fields.rows,
      });
    } catch (err) {
      console.error("Lỗi khi hiển thị form sửa dịch vụ:", err);
      res.status(500).send("Lỗi server");
    }
  }

  async updateServiceByOwner(req, res) {
    try {
      const { name, description, price, field_id } = req.body;
      const id = req.params.id;
      const ownerId = req.session.user_id;

      const check = await this.pool.query(
        `SELECT s.id FROM public.service s
         JOIN public.fields f ON s.field_id = f.id
         WHERE s.id = $1 AND f.owner_id = $2`,
        [id, ownerId]
      );

      if (check.rows.length === 0)
        return res.status(403).send("Bạn không có quyền chỉnh sửa dịch vụ này");

      await this.serviceModel.updateService(id, {
        field_id,
        name,
        description,
        price,
      });
      res.redirect("/owner/chusan_dichvu");
    } catch (err) {
      console.error("Lỗi cập nhật dịch vụ:", err);
      res.status(500).send("Lỗi server");
    }
  }

  async deleteServiceByOwner(req, res) {
    try {
      const id = req.params.id;
      const ownerId = req.session.user_id;

      const check = await this.pool.query(
        `SELECT s.id FROM public.service s
         JOIN public.fields f ON s.field_id = f.id
         WHERE s.id = $1 AND f.owner_id = $2`,
        [id, ownerId]
      );

      if (check.rows.length === 0)
        return res.status(403).json({ message: "Không có quyền xóa" });

      await this.serviceModel.deleteService(id);
      res.status(200).json({ message: "Xóa thành công" });
    } catch (err) {
      console.error("Lỗi khi xóa dịch vụ:", err);
      res.status(500).json({ message: "Lỗi server" });
    }
  }
}

module.exports = ServiceController;
