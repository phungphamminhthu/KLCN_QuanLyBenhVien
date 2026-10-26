/* Chỉ dùng trong layout nhân viên chuyên trách. */
document.addEventListener("DOMContentLoaded", () => {
    const sidebar = document.querySelector(".reception-sidebar .sidebar-menu, .sidebar-menu");
    if (!sidebar) return;

    // Ẩn menu cũ của phân hệ chuyên trách; nên xóa hẳn <a> này khỏi sidebar.html.
    sidebar.querySelectorAll("a").forEach(link => {
        const text = (link.textContent || "").replace(/\s+/g, " ").trim().toLocaleLowerCase("vi-VN");
        if (text === "lịch sử tiếp nhận") link.remove();
    });

    const norm = path => path.replace(/\/+$/, "") || "/";
    const current = norm(location.pathname);
    let target = current;
    // Trang con được đánh dấu theo mục menu gốc.
    if (/^\/ChuyenTrach\/nhap-ket-qua\//.test(current)) {
        target = "/ChuyenTrach/chi-dinh";
    } else if (/^\/ChuyenTrach\/chi-dinh\/\d+$/.test(current)) {
        target = "/ChuyenTrach/chi-dinh";
    } else if (/^\/ChuyenTrach\/ket-qua-da-thuc-hien\/\d+$/.test(current)) {
        target = "/ChuyenTrach/ket-qua-da-thuc-hien";
    }

    let best = null;
    let length = -1;
    sidebar.querySelectorAll("a[href]").forEach(link => {
        link.classList.remove("ct-menu-active", "active");
        link.removeAttribute("aria-current");
        const path = norm(new URL(link.getAttribute("href"), location.origin).pathname);
        // Ưu tiên khớp chính xác. Với trang lồng, dùng tiền tố dài nhất.
        const matches = path === target ||
            (path.startsWith("/ChuyenTrach/") && target.startsWith(path + "/"));
        if (matches && path.length > length) {
            best = link;
            length = path.length;
        }
    });
    if (best) {
        best.classList.add("ct-menu-active", "active");
        best.setAttribute("aria-current", "page");
    }
});
