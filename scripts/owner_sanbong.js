document.addEventListener("DOMContentLoaded", () => {
  // ================== PREVIEW ẢNH ==================
  function previewFiles(inputEl, containerEl) {
    if (!inputEl || !containerEl) return;
    containerEl.innerHTML = "";
    const files = inputEl.files;
    const count = Math.min(files.length, 5);
    for (let i = 0; i < count; i++) {
      const f = files[i];
      const url = URL.createObjectURL(f);
      const img = document.createElement("img");
      img.src = url;
      img.className = "thumb";
      containerEl.appendChild(img);
    }
  }

  const addInput = document.getElementById("addImagesField");
  const addPreview = document.getElementById("previewAdd");
  if (addInput)
    addInput.addEventListener("change", () =>
      previewFiles(addInput, addPreview)
    );

  const editInput = document.getElementById("editImagesField");
  const editPreview = document.getElementById("previewEdit");
  if (editInput)
    editInput.addEventListener("change", () =>
      previewFiles(editInput, editPreview)
    );

  // ================== FORM THÊM SÂN ==================
  const addForm = document.getElementById("ownerAddForm");
  if (addForm) {
    addForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const open = addForm.querySelector('[name="open_time"]').value;
      const close = addForm.querySelector('[name="close_time"]').value;
      if (
        open &&
        close &&
        new Date(`1970-01-01T${close}Z`) <= new Date(`1970-01-01T${open}Z`)
      )
        return alert("Giờ đóng phải lớn hơn giờ mở");

      const price = addForm.querySelector('[name="price_per_hour"]').value;
      if (price && parseFloat(price) < 0)
        return alert("Giá không được nhỏ hơn 0");

      const fd = new FormData(addForm);
      const files = addInput?.files;
      if (files && files.length > 5) return alert("Tối đa 5 ảnh");

      try {
        const res = await fetch("/owner/api/sanbong", {
          method: "POST",
          body: fd,
        });
        if (res.ok) {
          alert("Thêm sân thành công");
          window.location.href = "/owner/chusan_sanbong";
        } else {
          alert("Thêm thất bại");
        }
      } catch (err) {
        console.error(err);
        alert("Lỗi mạng khi thêm sân");
      }
    });
  }

  // ================== FORM SỬA SÂN ==================
  const editForm = document.getElementById("ownerEditForm");
  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = editForm.querySelector('input[name="id"]').value;
      const fd = new FormData(editForm);
      const res = await fetch(`/owner/api/sanbong/${id}`, {
        method: "PUT",
        body: fd,
      });
      if (res.ok) {
        alert("Cập nhật thành công");
        location.href = "/owner/chusan_sanbong";
      } else alert("Cập nhật thất bại");
    });
  }

  // ================== XÓA SÂN ==================
  document.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if (!confirm("Bạn có chắc muốn xóa sân này?")) return;
      const res = await fetch(`/owner/api/sanbong/${id}`, { method: "DELETE" });
      if (res.ok) {
        alert("Đã xóa sân bóng");
        location.reload();
      } else alert("Xóa thất bại");
    });
  });

  // ================== BẢN ĐỒ ==================
  const mapDiv = document.getElementById("ban_do");
  if (mapDiv) {
    const latInput = document.getElementById("latitude");
    const lngInput = document.getElementById("longitude");
    const lat0 = parseFloat(latInput?.value) || 21.029;
    const lng0 = parseFloat(lngInput?.value) || 105.805;

    const map = L.map("ban_do").setView([lat0, lng0], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    let marker = L.marker([lat0, lng0]).addTo(map);
    map.on("click", (e) => {
      if (marker) map.removeLayer(marker);
      marker = L.marker(e.latlng).addTo(map);
      latInput.value = e.latlng.lat.toFixed(6);
      lngInput.value = e.latlng.lng.toFixed(6);
    });

    const checkbox = document.getElementById("manualCoords");
    if (checkbox) {
      checkbox.addEventListener("change", () => {
        mapDiv.style.display = checkbox.checked ? "none" : "block";
      });
    }
  }

  // ================== QUẢN LÝ SÂN CON ==================
  const btnAdd = document.getElementById("btnAddSubField");
  const form = document.getElementById("subFieldForm");
  const modal = $("#subFieldModal");
  const fieldId = document.getElementById("fieldId")?.value;

  if (btnAdd) {
    btnAdd.addEventListener("click", () => {
      form.reset();
      $("#subFieldId").val("");
      modal.modal("show");
    });
  }

  $(".btn-edit").click(function () {
    $("#subFieldId").val($(this).data("id"));
    $("#subName").val($(this).data("name"));
    $("#subSize").val($(this).data("size"));
    modal.modal("show");
  });

  $(".btn-delete-sub").click(async function () {
    const id = $(this).data("id");
    if (!confirm("Bạn có chắc muốn xóa sân con này?")) return;
    try {
      const res = await fetch(`/owner/api/sub_fields/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        alert("Đã xóa sân con");
        location.reload();
      } else {
        const t = await res.text();
        alert("Xóa thất bại: " + t);
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi khi xóa sân con");
    }
  });

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const subId = $("#subFieldId").val();
      const data = {
        name: $("#subName").val(),
        size: $("#subSize").val(),
        field_id: fieldId,
      };

      const method = subId ? "PUT" : "POST";
      const url = subId
        ? `/owner/api/sub_fields/${subId}`
        : `/owner/api/sub_fields`;

      try {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          alert("Lưu sân con thành công");
          modal.modal("hide");
          location.reload();
        } else {
          const t = await res.text();
          alert("Thất bại: " + t);
        }
      } catch (err) {
        console.error(err);
        alert("Lỗi mạng khi lưu sân con");
      }
    });
  }

  // ================== QUẢN LÝ ĐẶT SÂN ==================
  const bookingTable = document.querySelector(".table.table-striped");
  if (bookingTable) {
    document.querySelectorAll(".btn-accept").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (!confirm("Xác nhận đặt sân này?")) return;
        const res = await fetch(`/owner/api/xacnhan-datsan/${id}`, {
          method: "POST",
        });
        const data = await res.json();
        alert(data.message);
        location.reload();
      });
    });

    document.querySelectorAll(".btn-cancel").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (!confirm("Hủy đặt sân này?")) return;
        const res = await fetch(`/owner/api/huy-datsan/${id}`, {
          method: "POST",
        });
        const data = await res.json();
        alert(data.message);
        location.reload();
      });
    });
  }
});
// ================== XEM CHI TIẾT ĐẶT SÂN ==================
$(document).on("click", ".btn-view", function () {
  const user = $(this).data("user");
  const phone = $(this).data("phone");
  const start = new Date($(this).data("start")).toLocaleString("vi-VN");
  const end = new Date($(this).data("end")).toLocaleString("vi-VN");
  const status = $(this).data("status");
  const price = Number($(this).data("price")).toLocaleString("vi-VN");

  const html = `
    <p><strong>Người đặt:</strong> ${user}</p>
    <p><strong>Số điện thoại:</strong> ${phone}</p>
    <p><strong>Thời gian:</strong> ${start} - ${end}</p>
    <p><strong>Trạng thái:</strong> ${status}</p>
    <p><strong>Tổng tiền:</strong> ${price} VNĐ</p>
  `;

  $("#modalBody").html(html);
  $("#viewModal").modal("show");
});
