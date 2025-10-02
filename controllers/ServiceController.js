const Service = require("../models/Service");

class ServiceController {
  constructor(pool) {
    this.serviceModel = new Service(pool);
  }

  async getAllServices(req, res) {
    try {
      const result = await req.app.locals.pool.query(
        `SELECT s.*, f.name as field_name
         FROM public.service s
         JOIN public.fields f ON s.field_id = f.id`
      );
      res.render("danhsach-dichvu", {
        services: result.rows,
        session: req.session || {},
      });
    } catch (err) {
      console.error("Lỗi khi lấy danh sách dịch vụ:", err.stack);
      res.status(500).send("Lỗi server");
    }
  }

  async renderAddService(req, res) {
    try {
      const result = await req.app.locals.pool.query(
        "SELECT * FROM public.fields"
      );
      res.render("them_dichvu", {
        fields: result.rows,
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
      const pool = req.app.locals.pool;

      // Nếu user là owner, kiểm tra field thuộc họ
      if (req.session.role === "owner") {
        const f = await pool.query(
          "SELECT owner_id FROM public.fields WHERE id = $1",
          [field_id]
        );
        if (!f.rows[0] || f.rows[0].owner_id !== req.session.user_id) {
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
}

module.exports = ServiceController;
