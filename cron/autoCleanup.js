const cron = require("node-cron");
const pool = require("../config");

// Chạy tự động mỗi đêm lúc 00:00 (giờ Việt Nam)
cron.schedule("0 0 * * *", async () => {
  console.log("Bắt đầu dọn dẹp dữ liệu booking...");

  try {
    //Hủy booking đã hết hạn (end_time < NOW)
    await pool.query(`
      UPDATE public.booking
      SET status = 'cancelled'
      WHERE end_time < NOW()
      AND status NOT IN ('cancelled');
    `);

    //Xóa booking của user cũ hơn 3 ngày
    await pool.query(`
      DELETE FROM public.booking
      WHERE created_at < NOW() - INTERVAL '3 days'
      AND user_id IS NOT NULL;
    `);

    //Xóa booking của chủ sân cũ hơn 14 ngày
    await pool.query(`
      DELETE FROM public.booking
      WHERE created_at < NOW() - INTERVAL '14 days'
      AND sub_field_id IN (
        SELECT sf.id FROM sub_fields sf
        JOIN fields f ON sf.field_id = f.id
        WHERE f.owner_id IS NOT NULL
      );
    `);

    console.log("Dọn dẹp booking thành công!");
  } catch (err) {
    console.error("Lỗi khi chạy cron job:", err);
  }
});
