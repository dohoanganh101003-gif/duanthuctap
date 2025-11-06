document.addEventListener("DOMContentLoaded", () => {
  const modal = $("#paymentModal");
  let currentBookingId = null;

  const cashBtn = document.getElementById("cashBtn");
  const transferBtn = document.getElementById("transferBtn");
  const qrSection = document.getElementById("qrSection");
  const qrContainer = document.getElementById("qrContainer");
  const uploadSection = document.getElementById("uploadProofSection");

  // SỰ KIỆN BẤM NÚT "THANH TOÁN"
  document.querySelectorAll(".pay-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      currentBookingId = e.target.dataset.id;

      document.getElementById("bookingIdText").textContent =
        "#" + currentBookingId;

      qrSection.classList.add("d-none");
      uploadSection.classList.add("d-none");
      qrContainer.innerHTML = "";
      cashBtn.classList.remove("d-none");
      transferBtn.classList.remove("d-none");

      modal.modal("show");
    });
  });

  // THANH TOÁN TIỀN MẶT
  cashBtn.addEventListener("click", async () => {
    cashBtn.disabled = true;
    transferBtn.classList.add("d-none");
    try {
      const res = await fetch(`/api/bookings/${currentBookingId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "cash" }),
      });
      const data = await res.json();
      if (data.success) {
        alert(
          "Bạn đã chọn thanh toán tiền mặt — vui lòng thanh toán khi đến sân!"
        );
        modal.modal("hide");
        const btn = document.querySelector(
          `.pay-btn[data-id="${currentBookingId}"]`
        );
        if (btn) {
          btn.closest("td").innerHTML = `
            <span class="badge badge-warning">Chờ thanh toán tại sân</span>
          `;
        }
      } else {
        alert("Lỗi: " + data.message);
      }
    } catch (err) {
      console.error("Lỗi khi thanh toán tiền mặt:", err);
      alert("Không thể xử lý thanh toán. Vui lòng thử lại!");
    } finally {
      cashBtn.disabled = false;
    }
  });

  // THANH TOÁN CHUYỂN KHOẢN
  transferBtn.addEventListener("click", async () => {
    cashBtn.classList.add("d-none");
    qrSection.classList.remove("d-none");
    uploadSection.classList.add("d-none");
    qrContainer.innerHTML = `<p class="text-muted">Đang tải mã QR...</p>`;
    try {
      const res = await fetch(`/booking/${currentBookingId}/qr`);
      const data = await res.json();
      if (data.success && data.qr_image) {
        qrContainer.innerHTML = `
          <img src="${data.qr_image}" class="img-fluid rounded shadow" style="max-width:250px;">
          <p class="mt-2 small">Quét mã, sau đó nhấn "Đã chuyển tiền".</p>
          <button id="confirmTransferBtn" class="btn btn-success btn-sm mt-2">Đã chuyển tiền</button>
        `;
        document
          .getElementById("confirmTransferBtn")
          .addEventListener("click", () => {
            qrSection.classList.add("d-none");
            transferBtn.classList.add("d-none");
            uploadSection.classList.remove("d-none");
            const proofInput = document.getElementById("paymentProof");
            const previewImage = document.getElementById("previewImage");
            const previewContainer =
              document.getElementById("previewContainer");
            const uploadBtn = document.getElementById("uploadProofBtn");

            proofInput.onchange = () => {
              const file = proofInput.files[0];
              if (!file) return;
              previewImage.src = URL.createObjectURL(file);
              previewContainer.classList.remove("d-none");
            };

            uploadBtn.onclick = async () => {
              const file = proofInput.files[0];
              if (!file) {
                alert("Vui lòng chọn ảnh minh chứng!");
                return;
              }

              const formData = new FormData();
              formData.append("payment_proof", file);

              try {
                const uploadRes = await fetch(
                  `/api/bookings/${currentBookingId}/upload-proof`,
                  {
                    method: "POST",
                    body: formData,
                  }
                );

                const uploadData = await uploadRes.json();

                if (uploadData.success) {
                  alert(
                    "Tải minh chứng thành công! Đang chờ chủ sân xác nhận."
                  );
                  modal.modal("hide");

                  const btn = document.querySelector(
                    `.pay-btn[data-id="${currentBookingId}"]`
                  );
                  if (btn) {
                    btn.closest("td").innerHTML = `
                      <span class="badge badge-info">Đang chờ xác nhận</span>
                    `;
                  }
                } else {
                  alert("Lỗi khi tải minh chứng: " + uploadData.message);
                }
              } catch (err) {
                console.error("Lỗi upload minh chứng:", err);
                alert("Không thể tải ảnh lên, vui lòng thử lại.");
              }
            };
          });
      } else {
        qrContainer.innerHTML = `<p class="text-danger">Không tìm thấy mã QR.</p>`;
      }
    } catch (err) {
      console.error("Lỗi khi tải QR:", err);
      qrContainer.innerHTML = `<p class="text-danger">Không thể tải mã QR.</p>`;
    }
  });
});
