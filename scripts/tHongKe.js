async function loadData(type, chartId, label, revenueId) {
  const res = await fetch(`/thongke/${type}`);
  const data = await res.json();

  const counts = {
    pending: Number(data.pending) || 0,
    confirmed: Number(data.confirmed) || 0,
    cancelled: Number(data.cancelled) || 0,
  };

  const total = counts.pending + counts.confirmed + counts.cancelled;

  const chartData = {
    labels: ["Đang chờ duyệt", "Được xác nhận", "Bị hủy"],
    datasets: [
      {
        data: [counts.pending, counts.confirmed, counts.cancelled],
        backgroundColor: ["#ffc107", "#28a745", "#dc3545"],
        hoverOffset: 12,
      },
    ],
  };

  // Vẽ biểu đồ
  new Chart(document.getElementById(chartId), {
    type: "pie",
    data: chartData,
    options: {
      plugins: {
        title: {
          display: true,
          text: label,
          font: { size: 18, weight: "bold" },
          color: "#2b79c2",
        },
        legend: {
          position: "bottom",
          align: "center",
          labels: {
            boxWidth: 14,
            boxHeight: 14,
            usePointStyle: true,
            pointStyle: "circle",
            padding: 18,
            color: "#444",
            font: { size: 13, family: "Segoe UI", weight: "500" },
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const value = context.parsed;
              const percentage =
                total > 0 ? ((value / total) * 100).toFixed(1) + "%" : "0%";
              return `${context.label}: ${value} (${percentage})`;
            },
          },
        },
      },
    },
  });

  function animateValue(id, start, end, duration, suffix = "") {
    const range = end - start;
    let current = start;
    const increment = end > start ? range / (duration / 16) : 0;
    const element = document.getElementById(id);
    if (!element) return;

    function update() {
      current += increment;
      if (current >= end) current = end;
      element.textContent =
        parseInt(current).toLocaleString("vi-VN").replace(/,/g, ".") + suffix;
      if (current < end) requestAnimationFrame(update);
    }
    update();
  }

  const formattedRevenue = data.revenue ? parseInt(data.revenue) : 0;
  const totalBookings = total || 0;

  document.getElementById(revenueId).innerHTML = `
    <div class="info-box-horizontal">
      <div class="info-item">
        <span class="label">Doanh thu:</span>
        <span id="${revenueId}-revenue" class="value">0 ₫</span>
      </div>
      <div class="info-item">
        <span class="label">Tổng lượt đặt sân:</span>
        <span id="${revenueId}-total" class="value">0</span>
      </div>
    </div>
  `;

  animateValue(`${revenueId}-revenue`, 0, formattedRevenue, 1000, " ₫");
  animateValue(`${revenueId}-total`, 0, totalBookings, 800);
}

loadData("week", "chartWeek", "Thống kê theo tuần", "revenueWeek");
loadData("month", "chartMonth", "Thống kê theo tháng", "revenueMonth");
loadData("year", "chartYear", "Thống kê theo năm", "revenueYear");
