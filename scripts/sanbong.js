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

const addForm = document.getElementById("addSanbongForm");
if (addForm) {
  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!addForm.checkValidity()) {
      addForm.classList.add("was-validated");
      return;
    }
    const formData = new FormData(addForm);
    const data = Object.fromEntries(formData);
    data.images = data.images
      ? JSON.stringify(data.images.split(",").map((img) => img.trim()))
      : JSON.stringify([]);
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
        alert(error.error || "Lỗi khi thêm sân bóng!");
      }
    } catch (err) {
      console.error("Lỗi khi thêm sân bóng:", err);
      alert("Lỗi máy chủ!");
    }
  });
}

const editForm = document.getElementById("editSanbongForm");
if (editForm) {
  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!editForm.checkValidity()) {
      editForm.classList.add("was-validated");
      return;
    }
    const formData = new FormData(editForm);
    const data = Object.fromEntries(formData);
    data.images = data.images
      ? JSON.stringify(data.images.split(",").map((img) => img.trim()))
      : JSON.stringify([]);
    const id = data.sanbong_id;
    try {
      const response = await fetch(`/api/sanbong/${id}`, {
        method: "POST",
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
        alert(error.error || "Lỗi khi cập nhật sân bóng!");
      }
    } catch (err) {
      console.error("Lỗi khi cập nhật sân bóng:", err);
      alert("Lỗi máy chủ!");
    }
  });
}
