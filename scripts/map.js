// Khởi tạo bản đồ
const map = L.map("map").setView([21.07231055367966, 105.7739075378808], 13);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

console.log("Bản đồ khởi tạo thành công.");

let geoJsonLayer = null;
let searchHistory = [];
let userMarker = null;
let routeControl = null;
let drawnItems = new L.FeatureGroup();
let circleLabel = null;
let userLocation = null;
map.addLayer(drawnItems);

if (L.Control.Draw) {
  const drawControl = new L.Control.Draw({
    draw: {
      polygon: false,
      polyline: false,
      rectangle: false,
      circle: true,
      marker: false,
      circlemarker: false,
    },
    edit: {
      featureGroup: drawnItems,
      remove: true,
    },
  });
  map.addControl(drawControl);
  console.log("Leaflet.Draw đã tải.");
} else {
  console.warn(
    "Leaflet.Draw không tải, tính năng vẽ vòng tròn bị vô hiệu hóa."
  );
}

if (!L.Routing) {
  console.error("Lỗi: Leaflet Routing Machine không tải được!");
  alert(
    "Tính năng chỉ đường không khả dụng do không tải được Leaflet Routing Machine."
  );
}

// Hàm định dạng thời gian
function formatTime(time) {
  if (!time || typeof time !== "string") return "N/A";
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours, 10) || 0;
  const min = parseInt(minutes, 10) || 0;
  if (isNaN(hour) || isNaN(min) || min > 59) return "N/A";
  const period = hour >= 12 ? "PM" : "AM";
  const formattedHour = hour % 12 || 12;
  return `${formattedHour}:${min.toString().padStart(2, "0")} ${period}`;
}

function translateSurfaceType(type) {
  const t = (type || "").toString().toLowerCase();
  if (t === "artificial") return "Cỏ nhân tạo";
  if (t === "grass") return "Cỏ tự nhiên";
  if (t === "indoor") return "Sân trong nhà";
  return type || "Không xác định";
}

function formatPrice(value) {
  if (!value || isNaN(value)) return "N/A";
  return parseInt(value).toLocaleString("vi-VN").replace(/,/g, ".");
}

// --- Hàm tính khoảng cách giữa 2 tọa độ ---
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

map.on(L.Draw.Event.CREATED, (e) => {
  if (e.layerType === "circle") {
    const layer = e.layer;
    drawnItems.clearLayers();
    drawnItems.addLayer(layer);
    filterSanbongWithinCircle(layer);
  }
});

map.on(L.Draw.Event.DELETED, () => {
  console.log("Xóa vòng tròn tìm kiếm.");
  drawnItems.clearLayers();
  if (circleLabel) {
    map.removeLayer(circleLabel);
    circleLabel = null;
  }
  resetSanbongListAndMap();
});

map.on("popupopen", function (e) {
  const popup = e.popup;
  const imgs = popup.getElement().querySelectorAll("img");
  imgs.forEach((img) => {
    img.addEventListener("load", () => popup.update());
  });
});

function resetSanbongListAndMap() {
  document.querySelector(".table")?.classList.remove("table-hidden");
  fetchSanbong();
}

function fetchSanbong(search = "", lat = null, lng = null) {
  let url = "http://localhost:3003/api/sanbong";
  if (search || lat || lng) {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (lat) params.append("lat", lat);
    if (lng) params.append("lng", lng);
    url += `?${params.toString()}`;
  }
  console.log("Gửi yêu cầu API:", url);
  fetch(url)
    .then((response) => {
      console.log("Phản hồi API:", response.status);
      if (!response.ok)
        throw new Error(`HTTP error! Status: ${response.status}`);
      return response.json();
    })
    .then((data) => {
      console.log("Dữ liệu sân bóng nhận được:", data);
      if (
        userLocation &&
        data.type === "FeatureCollection" &&
        Array.isArray(data.features)
      ) {
        data.features.forEach((f) => {
          if (f.geometry && f.geometry.coordinates) {
            const [lng, lat] = f.geometry.coordinates;
            f.properties.distance = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              lat,
              lng
            );
          }
        });
        data.features.sort(
          (a, b) => a.properties.distance - b.properties.distance
        );
      }

      displaySanbongList(data);
      displaySanbongOnMap(data);
    })
    .catch((err) => {
      console.error("Lỗi khi lấy dữ liệu sân bóng:", err);
      alert("Lỗi khi lấy dữ liệu sân bóng!");
    });
}

//  Hàm hiển thị danh sách sân bóng trong bảng
function displaySanbongList(data) {
  const stadiumList = document.getElementById("stadiumList");
  if (!stadiumList) {
    console.error("Không tìm thấy #stadiumList!");
    return;
  }

  stadiumList.innerHTML = "";
  let fields = [];

  if (Array.isArray(data)) {
    fields = data;
  } else if (
    data &&
    data.type === "FeatureCollection" &&
    Array.isArray(data.features)
  ) {
    fields = data.features.map((f) => f.properties);
  } else {
    console.error(" Dữ liệu không hợp lệ hoặc rỗng:", data);
    stadiumList.innerHTML =
      '<tr><td colspan="10" class="text-center">Không có dữ liệu sân bóng.</td></tr>';
    return;
  }

  if (fields.length > 0) {
    fields.forEach((field) => {
      let subFieldsHtml = "<span>Chưa có sân con</span>";
      if (field.subFields && field.subFields.length > 0) {
        subFieldsHtml = field.subFields
          .map((sub) => `<span>${sub.name} (${sub.size})</span>`)
          .join("<br>");
      }
      const row = `
        <tr>
          <td>${field.name || "N/A"}</td>
          <td>${field.address || "N/A"}</td>
          <td>${field.phone || "N/A"}</td>
          <td>${formatTime(field.open_time)}</td>
          <td>${formatTime(field.close_time)}</td>
          <td>${translateSurfaceType(field.surface_type)}</td>
          <td>${formatPrice(field.price_per_hour)}</td>
          <td>${
            field.distance
              ? field.distance.toLocaleString("vi-VN") + " m"
              : "N/A"
          }</td>

          <td>${subFieldsHtml}</td>

          <td>
            <div class="action-buttons">
            <a href="/xem_dichvu/${
              field.id || ""
            }" class="btn btn-primary btn-sm">Xem dịch vụ</a>
            <a href="/dat-san?field_id=${
              field.id || ""
            }" class="btn btn-success btn-sm">Đặt sân</a>
            ${
              sessionStorage.getItem("role") === "admin"
                ? `
                  <a href="/sua_sanbong/${
                    field.id || ""
                  }" class="btn btn-warning btn-sm">Sửa</a>
                  <button class="btn btn-danger btn-sm" onclick="window.deleteSanbong(${
                    field.id || ""
                  })">Xóa</button>
                `
                : ""
            }
            </div>
          </td>
        </tr>
      `;

      stadiumList.innerHTML += row;
    });
  } else {
    stadiumList.innerHTML =
      '<tr><td colspan="10" class="text-center">Chưa có dữ liệu sân bóng.</td></tr>';
  }
}

function displaySanbongOnMap(geoJSON) {
  if (geoJsonLayer) {
    map.removeLayer(geoJsonLayer);
    geoJsonLayer = null;
  }
  if (!geoJSON || !Array.isArray(geoJSON.features)) {
    console.error("Dữ liệu GeoJSON không hợp lệ:", geoJSON);
    return;
  }
  geoJsonLayer = L.geoJSON(geoJSON, {
    pointToLayer: (feature, latlng) => {
      const icon = L.divIcon({
        html: "⚽️",
        className: "custom-football-icon",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      return L.marker(latlng, { icon });
    },

    onEachFeature: (feature, layer) => {
      const props = feature.properties || {};
      const coords = feature.geometry.coordinates;
      if (!coords || coords.length < 2) {
        console.error("Tọa độ không hợp lệ trong feature:", feature);
        layer.bindPopup("Thông tin sân bóng không khả dụng.");
        return;
      }
      const imageHtml =
        props.images && props.images.length > 0
          ? `<div class="popup-image-wrapper">
             <img src="${props.images[0]}" alt="Sân bóng" class="popup-image" onerror="this.style.display='none';" />
             </div>`
          : "";
      layer.bindPopup(`
         <div class="popup-wrapper">
         <h5 class="popup-title">${props.name || "N/A"}</h5>
         <p class="popup-address"><i class="fa fa-location-dot"></i> ${
           props.address || "N/A"
         }</p>
         <p class="popup-phone"><i class="fa fa-phone"></i> ${
           props.phone || "N/A"
         }</p>
          <p class="popup-time"><i class="fa fa-clock"></i> ${formatTime(
            props.open_time
          )} - ${formatTime(props.close_time)}</p>
          <p class="popup-price"><i class="fa fa-money-bill"></i> ${
            props.price_per_hour
              ? formatPrice(props.price_per_hour)
              : "Chưa có giá"
          }</p>
          <p class="popup-surface"><i class='fa fa-ruler'></i> ${
            props.distance
              ? props.distance.toLocaleString("vi-VN") + " m"
              : "N/A"
          }</p>
          <p class="popup-surface"><i class="fa fa-layer-group"></i> ${translateSurfaceType(
            props.surface_type
          )}</p>

           ${
             imageHtml
               ? `<div class="popup-image-wrapper">${imageHtml}</div>`
               : `<div class="no-image">Không có ảnh</div>`
           }

           <div class="popup-footer">
            <a href="/xem_dichvu/${
              props.id || ""
            }" class="btn btn-primary btn-sm">
            <i class="fa fa-list"></i> Dịch vụ
           </a>
           <button class="btn btn-success btn-sm" onclick="window.getDirections(${
             coords[1]
           }, ${coords[0]})">
            <i class="fa fa-route"></i> Chỉ đường
         </button>
          <a href="/dat-san?field_id=${
            props.id || ""
          }" class="btn btn-warning btn-sm">
           <i class="fa fa-calendar-check"></i> Đặt sân
           </a>
          <a href="https://www.google.com/maps/dir/?api=1&destination=${
            coords[1]
          },${coords[0]}" 
             target="_blank" class="btn btn-info btn-sm">
            <i class="fa fa-map"></i> Google Map
          </a>
          </div>
         </div>
    `);
    },
  }).addTo(map);
}

const searchButton = document.getElementById("search-button");
const searchInput = document.getElementById("search-input");
if (searchButton && searchInput) {
  searchButton.addEventListener("click", () => {
    const query = searchInput.value.trim();
    console.log("Tìm kiếm sân bóng với từ khóa:", query);
    if (query) {
      fetchSanbong(query);
      if (!searchHistory.includes(query)) {
        searchHistory.push(query);
        updateSearchHistory();
      }
    }
  });
} else {
  console.error("Không tìm thấy search-button hoặc search-input!");
}

function updateSearchHistory() {
  const historyList = document.getElementById("search-history");
  if (!historyList) {
    console.error("Không tìm thấy #search-history!");
    return;
  }
  historyList.innerHTML = "";
  searchHistory.forEach((item) => {
    const div = document.createElement("div");
    div.textContent = item;
    div.className = "history-item";
    div.addEventListener("click", () => {
      searchInput.value = item;
      fetchSanbong(item);
    });
    historyList.appendChild(div);
  });
}

const nearbyButton = document.getElementById("nearby-button");
if (nearbyButton) {
  nearbyButton.addEventListener("click", () => {
    if (!navigator.geolocation) {
      console.error("Trình duyệt không hỗ trợ geolocation.");
      alert("Trình duyệt không hỗ trợ định vị.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        console.log(`Vị trí người dùng: ${userLat}, ${userLng}`);
        fetch(`http://localhost:3003/api/sanbong?lat=${userLat}&lng=${userLng}`)
          .then((response) => {
            if (!response.ok)
              throw new Error(`HTTP error! Status: ${response.status}`);
            return response.json();
          })
          .then((data) => {
            if (
              data.type === "FeatureCollection" &&
              Array.isArray(data.features) &&
              data.features.length > 0
            ) {
              const nearestField = data.features[0]; // Lấy sân bóng gần nhất
              const coords = nearestField.geometry.coordinates;
              if (coords && coords.length >= 2) {
                getDirections(coords[1], coords[0]); // Chỉ đường đến sân bóng gần nhất
                if (userMarker) map.removeLayer(userMarker);
                userMarker = L.circleMarker([userLat, userLng], {
                  radius: 8,
                  fillColor: "#00BFFF",
                  color: "#000",
                  weight: 1,
                  opacity: 1,
                  fillOpacity: 0.8,
                })
                  .addTo(map)
                  .openPopup();
                map.setView([userLat, userLng], 13);
              } else {
                console.error(
                  "Tọa độ sân bóng gần nhất không hợp lệ:",
                  nearestField
                );
                alert("Không thể xác định tọa độ sân bóng gần nhất!");
              }
            } else {
              console.error(
                "Không tìm thấy sân bóng gần vị trí của bạn:",
                data
              );
              alert("Không tìm thấy sân bóng gần vị trí của bạn!");
            }
          })
          .catch((err) => {
            console.error("Lỗi khi lấy sân bóng gần nhất:", err);
            alert("Lỗi khi tìm sân bóng gần nhất!");
          });
      },
      (err) => {
        console.error("Lỗi lấy vị trí:", err);
        alert("Không thể lấy vị trí. Vui lòng bật GPS.");
      }
    );
  });
} else {
  console.error("Không tìm thấy nearby-button!");
}

function startTracking() {
  if (!navigator.geolocation) {
    alert("Trình duyệt không hỗ trợ định vị.");
    return;
  }

  navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      userLocation = { lat: latitude, lng: longitude };
      console.log(` Cập nhật vị trí người dùng: ${latitude}, ${longitude}`);

      if (!userMarker) {
        userMarker = L.circleMarker([latitude, longitude], {
          radius: 7,
          fillColor: "#00BFFF",
          color: "#000",
          weight: 1,
          opacity: 1,
          fillOpacity: 0.8,
        })
          .addTo(map)
          .bindPopup("Vị trí của bạn");
      } else {
        userMarker.setLatLng([latitude, longitude]);
      }

      const listDiv = document.getElementById("stadium-list");
      if (listDiv && listDiv.style.display === "block") {
        console.log(
          "Đang ở chế độ danh sách → tự động sắp xếp lại theo vị trí mới"
        );
        fetchSanbong();
      }
    },
    (err) => console.error("Lỗi theo dõi vị trí: ", err),
    { enableHighAccuracy: true }
  );
}
startTracking();

window.getDirections = function (destinationLat, destinationLng) {
  if (!L.Routing) {
    console.error("Lỗi: Leaflet Routing Machine không khả dụng.");
    alert("Tính năng chỉ đường không khả dụng.");
    return;
  }
  if (isNaN(destinationLat) || isNaN(destinationLng)) {
    console.error("Tọa độ đích không hợp lệ:", destinationLat, destinationLng);
    alert("Tọa độ sân bóng không hợp lệ!");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;
      console.log(
        `Vị trí người dùng: ${userLat}, ${userLng}, Đích: ${destinationLat}, ${destinationLng}`
      );

      if (routeControl) {
        map.removeControl(routeControl);
        routeControl = null;
      }

      try {
        routeControl = L.Routing.control({
          waypoints: [
            L.latLng(userLat, userLng),
            L.latLng(destinationLat, destinationLng),
          ],
          routeWhileDragging: true,
          geocoder: L.Control.Geocoder.nominatim(),
          lineOptions: {
            styles: [{ color: "red", weight: 4 }],
          },
          createMarker: () => null,
        }).addTo(map);

        routeControl.on("routesfound", () => {
          console.log("Tuyến đường đã được tìm thấy.");
        });
        routeControl.on("routingerror", (err) => {
          console.error("Lỗi định tuyến:", err);
          alert("Không thể tìm tuyến đường. Vui lòng thử lại.");
        });

        const bounds = L.latLngBounds([
          [userLat, userLng],
          [destinationLat, destinationLng],
        ]);
        map.fitBounds(bounds);
      } catch (err) {
        console.error("Lỗi khi tạo tuyến đường:", err);
        alert("Lỗi khi tạo tuyến đường. Vui lòng thử lại.");
      }
    },
    (err) => {
      console.error("Lỗi lấy vị trí:", err);
      alert(
        "Không thể truy cập vị trí của bạn. Vui lòng bật GPS và cấp quyền định vị."
      );
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }
  );
};

// Xóa sân bóng
window.deleteSanbong = function (sanbongId) {
  if (!sanbongId) {
    console.error("ID sân bóng không hợp lệ:", sanbongId);
    alert("ID sân bóng không hợp lệ!");
    return;
  }
  if (confirm("Bạn có chắc chắn muốn xóa sân bóng này không?")) {
    console.log("Gửi yêu cầu xóa sân bóng ID:", sanbongId);
    fetch(`/api/sanbong/${sanbongId}`, {
      method: "DELETE",
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    })
      .then((response) => {
        console.log("Phản hồi xóa sân bóng:", response.status);
        if (response.ok) {
          alert("Xóa sân bóng thành công!");
          fetchSanbong();
        } else {
          alert("Lỗi khi xóa sân bóng. Vui lòng kiểm tra quyền admin.");
        }
      })
      .catch((err) => {
        console.error("Lỗi khi xóa sân bóng:", err);
        alert("Lỗi kết nối server!");
      });
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("toggle-view");
  const mapDiv = document.getElementById("map");
  const listDiv = document.getElementById("stadium-list");

  let showingMap = true;

  toggleBtn.addEventListener("click", () => {
    if (showingMap) {
      mapDiv.style.display = "none";
      listDiv.style.display = "block";
      toggleBtn.textContent = "Xem bản đồ";
      console.log("Chuyển sang danh sách → tự động sắp xếp theo khoảng cách");
      fetchSanbong();
    } else {
      mapDiv.style.display = "block";
      listDiv.style.display = "none";
      toggleBtn.textContent = "Xem danh sách";
      setTimeout(() => {
        if (window.map) {
          window.map.invalidateSize();
        }
      }, 200);
    }
    showingMap = !showingMap;
  });
});

document.addEventListener("DOMContentLoaded", () => {
  fetchSanbong();
});
