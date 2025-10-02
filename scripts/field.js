document.addEventListener("DOMContentLoaded", () => {
  const mapDiv = document.getElementById("map");
  if (!mapDiv) {
    console.error("Div #map không tồn tại!");
    return;
  }

  // Khởi tạo bản đồ
  let map = L.map("map").setView([21.07231055367966, 105.7739075378808], 13);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);

  let marker = null;
  const latInput = document.getElementById("latitude");
  const lngInput = document.getElementById("longitude");

  // Nếu có tọa độ từ form (trang sửa)
  const lat = parseFloat(latInput?.value);
  const lng = parseFloat(lngInput?.value);
  if (!isNaN(lat) && !isNaN(lng)) {
    marker = L.marker([lat, lng]).addTo(map);
    map.setView([lat, lng], 13);
  }

  // Xử lý click trên bản đồ để chọn tọa độ
  map.on("click", function (e) {
    if (marker) {
      map.removeLayer(marker);
    }
    marker = L.marker(e.latlng).addTo(map);
    if (latInput && lngInput) {
      latInput.value = e.latlng.lat.toFixed(6);
      lngInput.value = e.latlng.lng.toFixed(6);
    } else {
      console.error("Input latitude hoặc longitude không tồn tại!");
    }
  });

  // Xử lý bật/tắt nhập tay tọa độ
  const manualCheckbox = document.getElementById("manualCoords");
  if (manualCheckbox) {
    manualCheckbox.addEventListener("change", () => {
      if (manualCheckbox.checked) {
        latInput.readOnly = false;
        lngInput.readOnly = false;
        mapDiv.style.display = "none";
      } else {
        latInput.readOnly = true;
        lngInput.readOnly = true;
        mapDiv.style.display = "block";
      }
    });
  } else {
    console.warn("Checkbox manualCoords không tồn tại!");
  }

  // Xử lý form thêm sân bóng
  const addForm = document.getElementById("addFieldForm");
  if (addForm) {
    addForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(addForm);
      const data = Object.fromEntries(formData);

      try {
        const response = await fetch("/api/sanbong", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
          body: JSON.stringify(data),
        });
        if (response.ok) {
          alert("Thêm sân bóng thành công!");
          window.location.href = "/";
        } else {
          const error = await response.json();
          alert(`Lỗi khi thêm sân bóng: ${error.error || "Không xác định"}`);
        }
      } catch (err) {
        console.error("Lỗi khi thêm sân bóng:", err);
        alert("Lỗi máy chủ!");
      }
    });
  }

  // Xử lý form sửa sân bóng
  const editForm = document.getElementById("editFieldForm");
  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(editForm);
      const data = Object.fromEntries(formData);
      const id = data.field_id;

      try {
        const response = await fetch(`/api/sanbong/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
          body: JSON.stringify(data),
        });
        if (response.ok) {
          alert("Cập nhật sân bóng thành công!");
          window.location.href = "/";
        } else {
          const error = await response.json();
          alert(
            `Lỗi khi cập nhật sân bóng: ${error.error || "Không xác định"}`
          );
        }
      } catch (err) {
        console.error("Lỗi khi cập nhật sân bóng:", err);
        alert("Lỗi máy chủ!");
      }
    });
  }
});
