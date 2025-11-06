document.addEventListener("DOMContentLoaded", () => {
  const viewButtons = document.querySelectorAll(".btn-view");
  const modalBody = document.getElementById("modalBody");
  const modalElement = $("#viewModal");

  viewButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const user = btn.dataset.user || "Không rõ";
      const phone = btn.dataset.phone || "Không có";
      const start = new Date(btn.dataset.start).toLocaleString("vi-VN");
      const end = new Date(btn.dataset.end).toLocaleString("vi-VN");
      const status = btn.dataset.status || "unknown";
      const price = Number(btn.dataset.price).toLocaleString("vi-VN");

      modalBody.innerHTML = `
        <p><strong>Người đặt:</strong> ${user}</p>
        <p><strong>Số điện thoại:</strong> ${phone}</p>
        <p><strong>Thời gian:</strong> ${start} - ${end}</p>
        <p><strong>Trạng thái:</strong> <span class="status-${status}">${status}</span></p>
        <p><strong>Tổng tiền:</strong> ${price} VNĐ</p>
      `;

      modalElement.modal("show");
    });
  });

  // ====== Xác nhận hoặc Hủy đặt sân ======
  const acceptButtons = document.querySelectorAll(".btn-accept");
  const cancelButtons = document.querySelectorAll(".btn-cancel");

  function updateStatus(id, status) {
    const actionText = status === "confirmed" ? "xác nhận" : "hủy";
    if (!confirm(`Bạn có chắc muốn ${actionText} đơn đặt này không?`)) return;

    fetch(`/api/bookings/${id}/status?_method=PUT`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `status=${status}`,
    })
      .then((res) => {
        if (res.ok) {
          alert(`Đã ${actionText} đơn đặt thành công!`);
          window.location.reload();
        } else {
          alert("Cập nhật trạng thái thất bại!");
        }
      })
      .catch((err) => {
        console.error("Lỗi cập nhật trạng thái:", err);
        alert("Lỗi máy chủ!");
      });
  }

  acceptButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      updateStatus(id, "confirmed");
    });
  });

  cancelButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      updateStatus(id, "cancelled");
    });
  });
});
