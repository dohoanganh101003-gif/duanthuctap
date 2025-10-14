document.addEventListener("DOMContentLoaded", () => {
  const fieldId = document.getElementById("fieldId")?.value;
  const btnAdd = document.getElementById("btnAddSubField");
  const form = document.getElementById("subFieldForm");
  const modal = $("#subFieldModal");

  // ======= MỞ FORM THÊM =======
  btnAdd?.addEventListener("click", () => {
    document.getElementById("subFieldId").value = "";
    form.reset();
    modal.modal("show");
  });

  // ======= NÚT SỬA =======
  document.querySelectorAll(".btn-edit").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById("subFieldId").value = btn.dataset.id;
      document.getElementById("subName").value = btn.dataset.name;
      document.getElementById("subSize").value = btn.dataset.size;
      modal.modal("show");
    });
  });

  // ======= SUBMIT FORM (THÊM / SỬA) =======
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const subFieldId = document.getElementById("subFieldId").value;
    const name = document.getElementById("subName").value.trim();
    const size = document.getElementById("subSize").value;
    const data = { field_id: fieldId, name, size };

    try {
      const method = subFieldId ? "PUT" : "POST";
      const url = subFieldId ? `/api/sancon/${subFieldId}` : `/api/sancon`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Lỗi máy chủ");
        return;
      }

      alert(subFieldId ? "Cập nhật thành công!" : "Thêm sân con thành công!");
      location.reload();
    } catch (err) {
      console.error(err);
      alert("Đã xảy ra lỗi!");
    }
  });

  // ======= NÚT XÓA =======
  document.querySelectorAll(".btn-delete-sub").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Bạn có chắc muốn xóa sân con này không?")) return;
      const id = btn.dataset.id;

      try {
        const res = await fetch(`/api/sancon/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "Lỗi khi xóa sân con");
          return;
        }
        alert("Xóa sân con thành công!");
        location.reload();
      } catch (err) {
        console.error(err);
        alert("Đã xảy ra lỗi khi xóa sân con!");
      }
    });
  });
});
