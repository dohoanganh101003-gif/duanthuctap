// Lấy role hiện tại (từ server truyền qua EJS)
function getCurrentRole() {
  return window.currentRole || "guest";
}

// Điều hướng sau khi thêm/sửa/xóa dịch vụ
function redirectAfterSave() {
  const role = getCurrentRole();
  if (role === "owner") {
    window.location.href = "/owner/chusan_dichvu";
  } else {
    window.location.href = "/danhsach-dichvu";
  }
}

// Hiển thị thông báo đơn giản
function notify(msg, type = "info") {
  switch (type) {
    case "success":
      alert("Đúng " + msg);
      break;
    case "error":
      alert("Sai " + msg);
      break;
    default:
      alert(msg);
  }
}

// ========================= XÓA DỊCH VỤ =========================
function deleteService(serviceId) {
  if (!confirm("Bạn có chắc chắn muốn xóa dịch vụ này không?")) return;

  const role = getCurrentRole();
  const url =
    role === "owner"
      ? `/owner/chusan_xoa_dichvu/${serviceId}`
      : `/api/dichvu/${serviceId}`;

  fetch(url, { method: "DELETE" })
    .then(async (response) => {
      if (response.ok) {
        notify("Xóa dịch vụ thành công!", "success");
        redirectAfterSave();
      } else {
        const err = await response.text();
        notify("Lỗi khi xóa dịch vụ: " + err, "error");
      }
    })
    .catch((err) => {
      console.error(err);
      notify("Lỗi kết nối khi xóa dịch vụ!", "error");
    });
}

// ========================= SỬA DỊCH VỤ =========================
const editForm = document.getElementById("editServiceForm");
if (editForm) {
  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(editForm);
    const data = Object.fromEntries(formData);
    const serviceId = data.service_id;

    if (!data.name?.trim()) {
      notify("Vui lòng nhập tên dịch vụ!", "error");
      return;
    }
    if (data.price < 0) {
      notify("Giá không được nhỏ hơn 0!", "error");
      return;
    }

    try {
      const response = await fetch(`/api/dichvu/${serviceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        notify("Cập nhật dịch vụ thành công!", "success");
        redirectAfterSave();
      } else {
        const err = await response.text();
        notify("Lỗi khi cập nhật dịch vụ: " + err, "error");
      }
    } catch (err) {
      console.error(err);
      notify("Lỗi kết nối khi cập nhật!", "error");
    }
  });
}

// ========================= THÊM DỊCH VỤ =========================
const addForm = document.getElementById("addServiceForm");
if (addForm) {
  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(addForm);
    const data = Object.fromEntries(formData);

    // Kiểm tra dữ liệu
    if (!data.name?.trim()) {
      notify("Vui lòng nhập tên dịch vụ!", "error");
      return;
    }
    if (!data.field_id) {
      notify("Vui lòng chọn sân cho dịch vụ!", "error");
      return;
    }
    if (data.price < 0) {
      notify("Giá không được nhỏ hơn 0!", "error");
      return;
    }

    try {
      const response = await fetch("/api/dichvu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        notify("Thêm dịch vụ thành công!", "success");
        redirectAfterSave();
      } else {
        const err = await response.text();
        notify("Lỗi khi thêm dịch vụ: " + err, "error");
      }
    } catch (err) {
      console.error(err);
      notify("Lỗi kết nối khi thêm dịch vụ!", "error");
    }
  });
}
