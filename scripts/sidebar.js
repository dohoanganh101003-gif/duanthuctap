document.addEventListener("DOMContentLoaded", function () {
  const sidebar = document.getElementById("sidebar");
  const toggleBtn = document.getElementById("sidebarToggle");
  const closeBtn = document.getElementById("closeSidebar");

  toggleBtn.addEventListener("click", () => sidebar.classList.add("active"));
  closeBtn.addEventListener("click", () => sidebar.classList.remove("active"));

  document.addEventListener("click", (e) => {
    if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
      sidebar.classList.remove("active");
    }
  });
});
