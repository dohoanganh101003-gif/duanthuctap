// ===== DELETE SERVICE =====
function deleteService(serviceId) {
  if (confirm("Bạn có chắc chắn muốn xóa dịch vụ này không?")) {
    fetch(`/api/dichvu/${serviceId}`, {
      method: "DELETE",
    })
      .then((response) => {
        if (response.ok) {
          alert("Xóa dịch vụ thành công!");
          window.location.reload();
        } else {
          alert("Lỗi khi xóa dịch vụ!");
        }
      })
      .catch((err) => {
        console.error(err);
        alert("Lỗi khi xóa dịch vụ!");
      });
  }
}

// ===== EDIT SERVICE =====
const editForm = document.getElementById("editServiceForm");
if (editForm) {
  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(editForm);
    const data = Object.fromEntries(formData);
    const serviceId = data.service_id;

    if (data.price < 0) {
      alert("Giá không được nhỏ hơn 0!");
      return;
    }

    try {
      const response = await fetch(`/api/dichvu/${serviceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        alert("Cập nhật dịch vụ thành công!");
        window.location.href = "/danhsach-dichvu";
      } else {
        alert("Lỗi khi cập nhật dịch vụ!");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi khi cập nhật dịch vụ!");
    }
  });
}

// ===== ADD SERVICE =====
const addForm = document.getElementById("addServiceForm");
if (addForm) {
  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(addForm);
    const data = Object.fromEntries(formData);

    if (data.price < 0) {
      alert("Giá không được nhỏ hơn 0!");
      return;
    }

    try {
      const response = await fetch("/api/dichvu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        alert("Thêm dịch vụ thành công!");
        window.location.href = "/danhsach-dichvu";
      } else {
        alert("Lỗi khi thêm dịch vụ!");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi khi thêm dịch vụ!");
    }
  });
}
