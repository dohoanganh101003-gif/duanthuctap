let map = L.map("ban_do").setView([21.029, 105.805], 13);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
}).addTo(map);

let marker = null;

const latInput = document.getElementById("latitude");
const lngInput = document.getElementById("longitude");
const lat = parseFloat(latInput?.value);
const lng = parseFloat(lngInput?.value);

if (!isNaN(lat) && !isNaN(lng)) {
  marker = L.marker([lat, lng]).addTo(map);
  map.setView([lat, lng], 13);
}

function toggleCoordsInput() {
  const manualCheckbox = document.getElementById("manualCoords");
  const mapDiv = document.getElementById("ban_do");

  if (!manualCheckbox || !latInput || !lngInput || !mapDiv) return;

  if (manualCheckbox.checked) {
    latInput.readOnly = false;
    lngInput.readOnly = false;
    mapDiv.style.display = "none";
  } else {
    latInput.readOnly = true;
    lngInput.readOnly = true;
    mapDiv.style.display = "block";
  }
}

window.onload = () => {
  toggleCoordsInput();

  map.on("click", function (e) {
    if (marker) map.removeLayer(marker);
    marker = L.marker(e.latlng).addTo(map);
    latInput.value = e.latlng.lat.toFixed(6);
    lngInput.value = e.latlng.lng.toFixed(6);
  });

  const forms = document.querySelectorAll(".needs-validation");
  Array.from(forms).forEach((form) => {
    form.addEventListener(
      "submit",
      (event) => {
        if (!form.checkValidity()) {
          event.preventDefault();
          event.stopPropagation();
        }
        const openTime = form.querySelector("#open_time").value;
        const closeTime = form.querySelector("#close_time").value;
        const pricePerHour = form.querySelector("#price_per_hour").value;

        if (
          openTime &&
          closeTime &&
          new Date(`1970-01-01T${closeTime}Z`) <=
            new Date(`1970-01-01T${openTime}Z`)
        ) {
          event.preventDefault();
          event.stopPropagation();
          form
            .querySelector("#close_time")
            .setCustomValidity("Thời gian đóng cửa phải sau thời gian mở cửa");
        } else {
          form.querySelector("#close_time").setCustomValidity("");
        }

        if (pricePerHour && parseFloat(pricePerHour) < 0) {
          event.preventDefault();
          event.stopPropagation();
          form
            .querySelector("#price_per_hour")
            .setCustomValidity("Giá không được nhỏ hơn 0");
        } else {
          form.querySelector("#price_per_hour").setCustomValidity("");
        }

        form.classList.add("was-validated");
      },
      false
    );
  });
};

// Thêm sân bóng
const addForm = document.getElementById("addSanbongForm");
if (addForm) {
  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!addForm.checkValidity()) {
      addForm.classList.add("was-validated");
      return;
    }

    const formData = new FormData(addForm);

    try {
      const response = await fetch("/api/sanbong", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
        body: formData,
      });

      if (response.ok) {
        alert("Thêm sân bóng thành công!");
        window.location.href = "/";
      } else {
        const error = await response.json();
        alert(error.error || "Lỗi khi thêm sân bóng!");
      }
    } catch (err) {
      console.error("Lỗi khi thêm sân bóng:", err);
      alert("Lỗi máy chủ!");
    }
  });
}

// Sửa sân bóng
const editForm = document.getElementById("editSanbongForm");
if (editForm) {
  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!editForm.checkValidity()) {
      editForm.classList.add("was-validated");
      return;
    }

    // Lấy id sân bóng
    const idInput = editForm.querySelector('input[name="sanbong_id"]');
    if (!idInput || !idInput.value) {
      alert("Không tìm thấy ID sân bóng!");
      return;
    }
    const id = idInput.value;
    const formData = new FormData(editForm);
    try {
      console.log("Gửi request PUT tới:", `/api/sanbong/${id}`);
      const response = await fetch(`/api/sanbong/${id}`, {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
        body: formData,
      });

      if (response.ok) {
        alert("Cập nhật sân bóng thành công!");
        window.location.href = "/";
      } else {
        const error = await response.json();
        alert(
          "Lỗi khi cập nhật sân bóng: " +
            (error.error || "Không rõ nguyên nhân")
        );
      }
    } catch (err) {
      console.error("Lỗi khi cập nhật sân bóng:", err);
      alert("Lỗi máy chủ khi cập nhật sân bóng!");
    }
  });
}

// ================= QUẢN LÝ SÂN CON =================
const fieldIdInput =
  document.querySelector('input[name="sanbong_id"]') ||
  document.querySelector('input[name="field_id"]');
const fieldId = fieldIdInput ? fieldIdInput.value : null;

if (fieldId) {
  const subTable = document.getElementById("subFieldsTable");
  const subForm = document.getElementById("addSubFieldForm");

  // Hàm tải danh sách sân con
  async function loadSubFields() {
    try {
      const res = await fetch(`/api/sancon/${fieldId}`);
      const data = await res.json();

      if (!subTable) return;
      if (data.length === 0) {
        subTable.innerHTML = `<tr><td colspan="4" class="text-center">Chưa có sân con nào</td></tr>`;
        return;
      }

      subTable.innerHTML = data
        .map(
          (s) => `
        <tr id="row-${s.id}">
          <td><span class="sf-name">${s.name}</span></td>
          <td><span class="sf-size">${s.size}</span></td>
          <td>
            <button class="btn btn-warning btn-sm" onclick="editSubField(${s.id}, '${s.name}', '${s.size}')">Sửa</button>
            <button class="btn btn-danger btn-sm" onclick="deleteSubField(${s.id})">Xóa</button>
          </td>
        </tr>
      `
        )
        .join("");
    } catch (err) {
      console.error("Lỗi tải sân con:", err);
    }
  }

  // Thêm sân con
  if (subForm) {
    subForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(subForm);
      const data = Object.fromEntries(formData);

      try {
        const res = await fetch("/api/sancon", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
          body: JSON.stringify(data),
        });

        if (res.ok) {
          alert("Thêm sân con thành công!");
          subForm.reset();
          loadSubFields();
        } else {
          const err = await res.json();
          alert(err.error || "Lỗi khi thêm sân con!");
        }
      } catch (err) {
        console.error("Lỗi khi thêm sân con:", err);
      }
    });
  }

  // Xóa sân con
  window.deleteSubField = async function (id) {
    if (!confirm("Bạn có chắc muốn xóa sân con này không?")) return;
    try {
      const res = await fetch(`/api/sancon/${id}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      if (res.ok) {
        alert("Xóa sân con thành công!");
        loadSubFields();
      } else {
        const err = await res.json();
        alert(err.error || "Lỗi khi xóa sân con!");
      }
    } catch (err) {
      console.error("Lỗi khi xóa sân con:", err);
    }
  };

  // Sửa sân con
  window.editSubField = async function (id, currentName, currentSize) {
    const newName = prompt("Nhập tên sân con mới:", currentName);
    if (newName === null) return;
    const newSize = prompt(
      "Nhập kích thước mới (5x5, 7x7, 11x11):",
      currentSize
    );
    if (newSize === null) return;

    try {
      const res = await fetch(`/api/sancon/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
        body: JSON.stringify({ name: newName, size: newSize }),
      });

      if (res.ok) {
        alert("Cập nhật sân con thành công!");
        loadSubFields();
      } else {
        const err = await res.json();
        alert(err.error || "Lỗi khi cập nhật sân con!");
      }
    } catch (err) {
      console.error("Lỗi khi sửa sân con:", err);
    }
  };

  window.addEventListener("load", loadSubFields);
}
