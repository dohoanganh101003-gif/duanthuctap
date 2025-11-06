const { Pool } = require("pg");
const config = require("../config");

class OwnerPaymentController {
  constructor(pool) {
    this.pool = pool;
  }

  /** XÁC NHẬN THANH TOÁN **/
  async confirmPayment(req, res) {
    try {
      const { id } = req.params;

      const check = await this.pool.query(
        `SELECT b.id, f.owner_id
         FROM public.booking b
         JOIN public.sub_fields sf ON b.sub_field_id = sf.id
         JOIN public.fields f ON sf.field_id = f.id
         WHERE b.id = $1`,
        [id]
      );

      if (check.rows.length === 0)
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy đặt sân" });

      if (check.rows[0].owner_id !== req.session.user_id)
        return res
          .status(403)
          .json({ success: false, message: "Không có quyền xác nhận" });

      await this.pool.query(
        `UPDATE public.booking SET payment_status = 'paid' WHERE id = $1`,
        [id]
      );

      res.json({ success: true, message: "Đã xác nhận thanh toán" });
    } catch (err) {
      console.error("Lỗi xác nhận thanh toán:", err);
      res
        .status(500)
        .json({ success: false, message: "Lỗi server khi xác nhận" });
    }
  }

  /** TỪ CHỐI THANH TOÁN **/
  async declinePayment(req, res) {
    try {
      const { id } = req.params;

      const check = await this.pool.query(
        `SELECT b.id, f.owner_id
       FROM public.booking b
       JOIN public.sub_fields sf ON b.sub_field_id = sf.id
       JOIN public.fields f ON sf.field_id = f.id
       WHERE b.id = $1`,
        [id]
      );

      if (check.rows.length === 0)
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy đặt sân" });

      if (check.rows[0].owner_id !== req.session.user_id)
        return res
          .status(403)
          .json({ success: false, message: "Không có quyền từ chối" });
      await this.pool.query(
        `UPDATE public.booking 
       SET payment_status = 'rejected' 
       WHERE id = $1`,
        [id]
      );

      res.json({
        success: true,
        message:
          "Đã từ chối thanh toán (người dùng sẽ thấy trạng thái bị từ chối)",
      });
    } catch (err) {
      console.error("Lỗi từ chối thanh toán:", err);
      res
        .status(500)
        .json({ success: false, message: "Lỗi server khi từ chối" });
    }
  }
  async getPaymentProof(req, res) {
    const bookingId = req.params.id;
    try {
      const result = await this.pool.query(
        "SELECT payment_proof FROM public.booking WHERE id = $1",
        [bookingId]
      );
      const proofFile = result.rows[0]?.payment_proof;

      if (proofFile) {
        return res.json({
          success: true,
          proof_image: proofFile,
        });
      } else {
        return res.json({ success: false, message: "Chưa có minh chứng" });
      }
    } catch (err) {
      console.error("Lỗi lấy minh chứng:", err);
      return res.json({ success: false, message: "Lỗi server" });
    }
  }
}

module.exports = OwnerPaymentController;
