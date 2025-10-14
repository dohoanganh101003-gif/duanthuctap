document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".btn-accept").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const bookingId = btn.getAttribute("data-id");
      if (!confirm("Bạn có chắc muốn XÁC NHẬN đặt sân này không?")) return;

      try {
        const res = await fetch(`/owner/chusan_datsan/${bookingId}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "confirmed" }),
        });

        if (res.ok) {
          alert("Đã xác nhận đặt sân!");
          location.reload();
        } else {
          const err = await res.json();
          alert("Lỗi: " + (err.error || err.message));
        }
      } catch (error) {
        console.error("Lỗi khi xác nhận:", error);
        alert("Không thể xác nhận đặt sân.");
      }
    });
  });

  // Khi bấm nút "Hủy"
  document.querySelectorAll(".btn-cancel").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const bookingId = btn.getAttribute("data-id");
      if (!confirm("Bạn có chắc muốn HỦY đặt sân này không?")) return;

      try {
        const res = await fetch(`/owner/chusan_datsan/${bookingId}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "cancelled" }),
        });

        if (res.ok) {
          alert("Đã hủy đặt sân!");
          location.reload();
        } else {
          const err = await res.json();
          alert("Lỗi: " + (err.error || err.message));
        }
      } catch (error) {
        console.error("Lỗi khi hủy:", error);
        alert("Không thể hủy đặt sân.");
      }
    });
  });

  // Hiển thị chi tiết khi bấm "Xem"
  document.querySelectorAll(".btn-view").forEach((btn) => {
    btn.addEventListener("click", () => {
      const modalBody = document.getElementById("modalBody");
      modalBody.innerHTML = `
        <p><strong>Người đặt:</strong> ${btn.dataset.user}</p>
        <p><strong>Số điện thoại:</strong> ${btn.dataset.phone}</p>
        <p><strong>Thời gian:</strong> ${new Date(
          btn.dataset.start
        ).toLocaleString("vi-VN")} - ${new Date(btn.dataset.end).toLocaleString(
        "vi-VN"
      )}</p>
        <p><strong>Trạng thái:</strong> ${btn.dataset.status}</p>
        <p><strong>Tổng tiền:</strong> ${Number(
          btn.dataset.price
        ).toLocaleString("vi-VN")} VNĐ</p>
      `;
      $("#viewModal").modal("show");
    });
  });
});
