document.addEventListener("DOMContentLoaded", function () {
  let currentPaymentContainer = null;
  $(document).on(
    "click",
    ".payment-btn, [data-toggle='modal'][data-target='#proofModal']",
    function (e) {
      const btn = this;
      const bookingId = btn.dataset.id;
      currentPaymentContainer = btn.closest(".payment-actions");

      console.debug("Open proof modal for bookingId=", bookingId);
      document.getElementById(
        "confirmForm"
      ).action = `/owner/api/xacnhan-thanhtoan/${bookingId}`;
      document.getElementById(
        "declineForm"
      ).action = `/owner/api/tuchoi-thanhtoan/${bookingId}`;
      const modalBody = document.getElementById("proofModalBody");
      modalBody.innerHTML = `<p class="text-muted">Đang tải...</p>`;
      fetch(`/api/bookings/${bookingId}/proof`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => {
          console.debug("Proof API response:", data);
          if (data.success && data.proof_image) {
            modalBody.innerHTML = `
            <div class="proof-container">
              <img src="${data.proof_image}" alt="Minh chứng" class="proof-image">
            </div>
            <p class="mt-3 small text-muted">Ảnh minh chứng người dùng đã gửi.</p>
          `;
          } else {
            modalBody.innerHTML = `<p class="text-danger">Không có ảnh minh chứng nào!</p>`;
          }
        })
        .catch((err) => {
          console.error("Lỗi tải minh chứng:", err);
          modalBody.innerHTML = `<p class="text-danger">Không thể tải minh chứng.</p>`;
        });
    }
  );

  ["confirmForm", "declineForm"].forEach((formId) => {
    const form = document.getElementById(formId);
    if (!form) return;
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      const btn = form.querySelector("button");
      const url = form.getAttribute("action");

      const confirmMsg =
        formId === "confirmForm"
          ? "Bạn có chắc chắn đã nhận được tiền?"
          : "Xác nhận khách hàng chưa chuyển tiền?";
      if (!confirm(confirmMsg)) return;

      btn.disabled = true;
      btn.textContent = "Đang xử lý...";

      try {
        const res = await fetch(url, { method: "POST" });
        const data = await res.json();

        if (data.success && currentPaymentContainer) {
          $("#proofModal").modal("hide");
          if (formId === "confirmForm") {
            currentPaymentContainer.innerHTML = `<span class="badge badge-success">Đã thanh toán</span>`;
          } else {
            currentPaymentContainer.innerHTML = `<span class="badge badge-secondary">Chưa thanh toán</span>`;
          }
        } else {
          alert(data.message || "Thao tác thất bại");
          btn.disabled = false;
          btn.textContent =
            formId === "confirmForm" ? "Đã nhận tiền" : "Chưa nhận tiền";
        }
      } catch (err) {
        console.error("Lỗi khi xử lý:", err);
        alert("Không thể kết nối máy chủ.");
        btn.disabled = false;
        btn.textContent =
          formId === "confirmForm" ? "Đã nhận tiền" : "Chưa nhận tiền";
      }
    });
  });
});
