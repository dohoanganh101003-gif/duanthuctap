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
map.addLayer(drawnItems);

// Kiểm tra Leaflet.Draw
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

// Kiểm tra Leaflet Routing Machine
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

function filterSanbongWithinCircle(circle) {
  if (geoJsonLayer) {
    map.removeLayer(geoJsonLayer);
    geoJsonLayer = null;
  }
  document.querySelector(".table")?.classList.add("table-hidden");
  const center = circle.getLatLng();
  const radius = circle.getRadius();

  fetch("http://localhost:3003/api/sanbong")
    .then((response) => {
      console.log("Phản hồi API /api/sanbong:", response.status);
      if (!response.ok)
        throw new Error(`HTTP error! Status: ${response.status}`);
      return response.json();
    })
    .then((data) => {
      console.log("Dữ liệu sân bóng:", data);
      if (data.type === "FeatureCollection" && Array.isArray(data.features)) {
        const sanbongInCircle = data.features.filter((feature) => {
          const coords = feature.geometry.coordinates;
          if (!coords || coords.length < 2) {
            console.error("Tọa độ không hợp lệ:", feature);
            return false;
          }
          const latlng = L.latLng(coords[1], coords[0]);
          const distance = map.distance(center, latlng);
          return distance <= radius;
        });

        if (circleLabel) {
          map.removeLayer(circleLabel);
        }
        circleLabel = L.marker(center, {
          icon: L.divIcon({
            className: "circle-label",
            html: `<div style="background-color: white; border-radius: 50%; padding: 6px 10px; border: 2px solid #ff7800; font-weight: bold; color: red; text-align: center; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);">${sanbongInCircle.length}</div>`,
            iconSize: [40, 40],
          }),
        }).addTo(map);

        geoJsonLayer = L.geoJSON(
          {
            type: "FeatureCollection",
            features: sanbongInCircle,
          },
          {
            pointToLayer: (feature, latlng) =>
              L.circleMarker(latlng, {
                radius: 8,
                fillColor: "#00FF00",
                color: "#000",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8,
              }),
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
                  ? `<img src="${props.images[0]}" alt="Sân bóng" style="max-width: 100%; height: auto;" />`
                  : "";
              layer.bindPopup(`
                <div class="popup-container">
                  <h3 class="popup-title">${props.name || "N/A"}</h3>
                  <p class="popup-address">Địa chỉ: ${
                    props.address || "N/A"
                  }</p>
                  <p class="popup-phone">Điện thoại: ${props.phone || "N/A"}</p>
                  <p class="popup-time">Mở cửa: ${formatTime(
                    props.open_time
                  )} - ${formatTime(props.close_time)}</p>
                  <p class="popup-price">Giá mỗi giờ: ${
                    props.price_per_hour
                      ? props.price_per_hour.toLocaleString("vi-VN") + " VNĐ"
                      : "N/A"
                  }</p>
                  <p class="popup-surface">Loại mặt sân: ${
                    props.surface_type || "N/A"
                  }</p>
                  <p class="popup-description">Mô tả: ${
                    props.description || "N/A"
                  }</p>
                  ${imageHtml}
                  <div class="popup-footer">
                    <a href="/xem_dichvu/${
                      props.id || ""
                    }" class="btn btn-primary btn-sm">Xem dịch vụ</a>
                    <button class="btn btn-primary btn-sm" onclick="window.getDirections(${
                      coords[1]
                    }, ${coords[0]})">Chỉ đường</button>
                    <a href="/dat-san?field_id=${
                      props.id || ""
                    }" class="btn btn-success btn-sm">Đặt sân</a>

                  </div>
                </div>
              `);
            },
          }
        ).addTo(map);
        console.log(
          `Tìm thấy ${sanbongInCircle.length} sân bóng trong vòng tròn.`
        );
      } else {
        console.error("Dữ liệu GeoJSON không hợp lệ:", data);
        alert("Dữ liệu sân bóng không hợp lệ!");
      }
    })
    .catch((err) => {
      console.error("Lỗi khi lọc sân bóng trong vòng tròn:", err);
      alert("Lỗi khi lọc sân bóng trong vòng tròn!");
    });
}

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
      console.log("Dữ liệu sân bóng:", data);
      displaySanbongList(data);
      displaySanbongOnMap(data);
    })
    .catch((err) => {
      console.error("Lỗi khi lấy dữ liệu sân bóng:", err);
      alert("Lỗi khi lấy dữ liệu sân bóng!");
    });
}

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
    fields = data.features.map((feature) => feature.properties); // Dữ liệu GeoJSON từ API
  } else {
    console.error("Dữ liệu không hợp lệ hoặc rỗng:", data);
    fields = [];
  }

  if (fields.length > 0) {
    fields.forEach((field) => {
      const row = `
        <tr>
          <td>${field.name || "N/A"}</td>
          <td>${field.address || "N/A"}</td>
          <td>${field.phone || "N/A"}</td>
          <td>${formatTime(field.open_time)}</td>
          <td>${formatTime(field.close_time)}</td>
          <td>${field.surface_type || "N/A"}</td>
          <td>${
            field.price_per_hour
              ? field.price_per_hour.toLocaleString("vi-VN") + " VNĐ"
              : "N/A"
          }</td>
          <td>
            <a href="/xem_dichvu/${
              field.id || ""
            }" class="btn btn-primary btn-sm">Xem dịch vụ</a>
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
          </td>
        </tr>
      `;
      stadiumList.innerHTML += row;
    });
  } else {
    stadiumList.innerHTML =
      '<tr><td colspan="8" class="text-center">Chưa có dữ liệu</td></tr>';
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
    pointToLayer: (feature, latlng) =>
      L.circleMarker(latlng, {
        radius: 8,
        fillColor: "#00FF00",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8,
      }),
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
          ? `<img src="${props.images[0]}" alt="Sân bóng" style="max-width: 100%; height: auto;" />`
          : "";
      layer.bindPopup(`
        <div class="popup-container">
          <h3 class="popup-title">${props.name || "N/A"}</h3>
          <p class="popup-address">Địa chỉ: ${props.address || "N/A"}</p>
          <p class="popup-phone">Điện thoại: ${props.phone || "N/A"}</p>
          <p class="popup-time">Mở cửa: ${formatTime(
            props.open_time
          )} - ${formatTime(props.close_time)}</p>
          <p class="popup-price">Giá mỗi giờ: ${
            props.price_per_hour
              ? props.price_per_hour.toLocaleString("vi-VN") + " VNĐ"
              : "N/A"
          }</p>
          <p class="popup-surface">Loại mặt sân: ${
            props.surface_type || "N/A"
          }</p>
          <p class="popup-description">Mô tả: ${props.description || "N/A"}</p>
          ${imageHtml}
          <div class="popup-footer">
            <a href="/xem_dichvu/${
              props.id || ""
            }" class="btn btn-primary btn-sm">Xem dịch vụ</a>
            <button class="btn btn-primary btn-sm" onclick="window.getDirections(${
              coords[1]
            }, ${coords[0]})">Chỉ đường</button>
            <a href="/dat-san?field_id=${
              props.id || ""
            }" class="btn btn-success btn-sm">Đặt sân</a>
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
                  .bindPopup("Vị trí của bạn")
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
    console.error("Trình duyệt không hỗ trợ geolocation.");
    return;
  }
  navigator.geolocation.watchPosition(
    (position) => {
      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;
      console.log(`Cập nhật vị trí người dùng: ${userLat}, ${userLng}`);
      if (!userMarker) {
        userMarker = L.circleMarker([userLat, userLng], {
          radius: 8,
          fillColor: "#00BFFF",
          color: "#000",
          weight: 1,
          opacity: 1, 
          fillOpacity: 0.8,
        })
          .addTo(map)
          .bindPopup("Vị trí của bạn");
      } else {
        userMarker.setLatLng([userLat, userLng]);
      }
    },
    (err) => {
      console.error("Lỗi theo dõi vị trí:", err);
      alert("Không thể truy cập vị trí của bạn.");
    }
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

// Tải dữ liệu sân bóng ban đầu
document.addEventListener("DOMContentLoaded", () => {
  fetchSanbong();
});
