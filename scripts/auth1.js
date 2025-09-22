document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const errorMessage = document.getElementById("errorMessage");

  try {
    const response = await fetch("/dangnhap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (response.redirected) {
      window.location.href = response.url; // Chuyển hướng nếu thành công
    } else {
      const data = await response.json();
      errorMessage.textContent = data.error || "Lỗi không xác định";
      errorMessage.style.display = "block";
    }
  } catch (err) {
    errorMessage.textContent = "Lỗi kết nối server";
    errorMessage.style.display = "block";
  }
});
