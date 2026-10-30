/* =====================================================
   LAYOUT - NHÂN VIÊN CHUYÊN TRÁCH
   Ngày, header, avatar, sidebar, thông báo
   ===================================================== */

(function () {
    "use strict";

    // =====================================================
    // 1. THÔNG TIN LƯU TRỮ
    // =====================================================

    function layThongTinLuu(key) {
        return (
            sessionStorage.getItem(key) ||
            localStorage.getItem(key) ||
            ""
        );
    }

    // =====================================================
    // 2. TOKEN
    // =====================================================

    function layToken() {
        return (
            layThongTinLuu("token") ||
            layThongTinLuu("Token")
        );
    }

    // =====================================================
    // 3. GỌI API CÓ JWT
    // =====================================================

    async function apiFetch(url, options = {}) {
        const token = layToken();

        const headers = {
            Accept: "application/json",
            ...(options.body instanceof FormData
                ? {}
                : options.body
                    ? { "Content-Type": "application/json" }
                    : {}),
            ...(options.headers || {})
        };

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            ...options,
            headers
        });

        const contentType =
            response.headers.get("content-type") || "";

        let data;

        if (contentType.includes("application/json")) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            const message =
                typeof data === "object"
                    ? data?.message || data?.error || data?.detail
                    : data;

            throw new Error(
                message || "Không thể xử lý yêu cầu."
            );
        }

        return data;
    }

    // =====================================================
    // 4. HÀM HIỂN THỊ TEXT
    // =====================================================

    function ganText(id, value, fallback = "") {
        const element = document.getElementById(id);

        if (!element) return;

        element.textContent =
            value !== null &&
            value !== undefined &&
            String(value).trim() !== ""
                ? String(value)
                : fallback;
    }

    // =====================================================
    // 5. THÔNG TIN NHÂN VIÊN CHUYÊN TRÁCH
    // =====================================================

    function initThongTinChuyenTrach() {
        const hoTen =
            layThongTinLuu("HoTen") ||
            layThongTinLuu("hoTen") ||
            layThongTinLuu("TenNguoiDung") ||
            "Nhân viên chuyên trách";

        const email =
            layThongTinLuu("Email") ||
            layThongTinLuu("email") ||
            "";

        const vaiTroGoc =
            layThongTinLuu("VaiTro");

        const vaiTro = vaiTroGoc
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, "")
            .toUpperCase();

        const tenVaiTro = [
            "CHUYENTRACH",
            "ROLE_CHUYENTRACH"
        ].includes(vaiTro)
            ? "Nhân viên chuyên trách"
            : (vaiTroGoc || "Nhân viên chuyên trách");

        ganText(
            "header-user-name",
            hoTen,
            "Nhân viên chuyên trách"
        );

        ganText(
            "header-user-email",
            email,
            "Chưa cập nhật email"
        );

        ganText(
            "header-user-role",
            tenVaiTro,
            "Nhân viên chuyên trách"
        );

        capNhatAvatarChuyenTrach();
    }

    // =====================================================
    // 6. ẢNH ĐẠI DIỆN
    // Hỗ trợ URL, đường dẫn nội bộ và fileKey R2
    // =====================================================

    function capNhatAvatarChuyenTrach() {
        const avatar =
            document.getElementById("header-user-avatar");

        if (!avatar) return;

        const anhMacDinh = "/Images/default-avatar.jpg";

        const anhDaiDien = String(
            layThongTinLuu("AnhDaiDien") || ""
        ).trim();

        if (
            !anhDaiDien ||
            ["null", "undefined"].includes(
                anhDaiDien.toLowerCase()
            )
        ) {
            avatar.onerror = null;
            avatar.src = anhMacDinh;
            return;
        }

        let imageUrl;

        if (/^https?:\/\//i.test(anhDaiDien)) {
            // URL ảnh đầy đủ.
            try {
                const parsedUrl = new URL(anhDaiDien);

                if (
                    parsedUrl.protocol !== "https:" &&
                    !(
                        parsedUrl.protocol === "http:" &&
                        parsedUrl.origin === window.location.origin
                    )
                ) {
                    avatar.src = anhMacDinh;
                    return;
                }

                imageUrl = parsedUrl.href;
            } catch (_) {
                avatar.src = anhMacDinh;
                return;
            }
        } else if (anhDaiDien.startsWith("/")) {
            // Đường dẫn ảnh nội bộ.
            imageUrl = anhDaiDien;
        } else {
            // File key hoặc tên file trên Cloudflare R2.
            imageUrl =
                "/api/images/view?fileKey=" +
                encodeURIComponent(
                    anhDaiDien.replace(/^\/+/, "")
                );
        }

        avatar.onerror = function () {
            console.error(
                "Không tải được ảnh đại diện:",
                imageUrl
            );

            this.onerror = null;
            this.src = anhMacDinh;
        };

        avatar.src = imageUrl;
    }

    // =====================================================
    // 7. NGÀY HIỆN TẠI THEO GIỜ VIỆT NAM
    // =====================================================

    function initCurrentDate() {
        const element =
            document.getElementById("header-current-date");

        if (!element) return;

        const formattedDate = new Intl.DateTimeFormat(
            "vi-VN",
            {
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                timeZone: "Asia/Ho_Chi_Minh"
            }
        ).format(new Date());

        element.textContent =
            formattedDate.charAt(0).toUpperCase() +
            formattedDate.slice(1);
    }

    // =====================================================
    // 8. ĐÁNH DẤU MENU ĐANG CHỌN
    // =====================================================

    function initActiveSidebar() {
        const currentPath =
            window.location.pathname.replace(/\/+$/, "") || "/";

        const menuLinks = document.querySelectorAll(
            ".sidebar-menu .menu-link"
        );

        menuLinks.forEach(link => {
            let linkPath;

            try {
                linkPath = new URL(
                    link.href,
                    window.location.origin
                ).pathname.replace(/\/+$/, "") || "/";
            } catch (_) {
                return;
            }

            if (linkPath === currentPath) {
                link.classList.add("active");
                link.setAttribute("aria-current", "page");
            } else {
                link.classList.remove("active");
                link.removeAttribute("aria-current");
            }
        });
    }

    // =====================================================
    // 9. ĐÓNG / MỞ NHÓM MENU SIDEBAR
    // =====================================================

    function setSidebarGroupState(
        button,
        submenu,
        expanded
    ) {
        button.setAttribute(
            "aria-expanded",
            String(expanded)
        );

        submenu.hidden = !expanded;

        const arrow = button.querySelector(
            ".sidebar-group-arrow"
        );

        if (arrow) {
            arrow.classList.toggle(
                "is-expanded",
                expanded
            );
        }
    }

    function initSidebarGroups() {
        const groups = document.querySelectorAll(
            ".reception-sidebar .sidebar-menu-group"
        );

        groups.forEach((group, index) => {
            const button = group.querySelector(
                ":scope > .sidebar-menu-title"
            );

            const submenu = group.querySelector(
                ":scope > .sidebar-submenu"
            );

            if (!button || !submenu) return;

            if (!submenu.id) {
                submenu.id = `ct-submenu-${index}`;
            }

            button.setAttribute(
                "aria-controls",
                submenu.id
            );

            button.setAttribute("type", "button");

            // Chỉ thiết lập trạng thái ban đầu nếu chưa có.
            if (!button.hasAttribute("aria-expanded")) {
                setSidebarGroupState(
                    button,
                    submenu,
                    false
                );
            } else {
                setSidebarGroupState(
                    button,
                    submenu,
                    button.getAttribute("aria-expanded") === "true"
                );
            }

            // Tránh đăng ký listener trùng khi khởi tạo lại.
            if (button.dataset.sidebarInitialized === "true") {
                return;
            }

            button.dataset.sidebarInitialized = "true";

            button.addEventListener("click", function () {
                const isExpanded =
                    button.getAttribute("aria-expanded") === "true";

                setSidebarGroupState(
                    button,
                    submenu,
                    !isExpanded
                );
            });
        });
    }

    // =====================================================
    // 10. THÔNG BÁO
    // =====================================================

    function closeNotificationDropdown(button, dropdown) {
        dropdown.hidden = true;

        button.setAttribute(
            "aria-expanded",
            "false"
        );
    }

    function initNotifications() {
        const button =
            document.getElementById("notificationButton");

        const dropdown =
            document.getElementById("notificationDropdown");

        if (!button || !dropdown) return;

        // Tránh khởi tạo nhiều listener.
        if (button.dataset.notificationInitialized === "true") {
            return;
        }

        button.dataset.notificationInitialized = "true";

        button.setAttribute("aria-expanded", "false");
        dropdown.hidden = true;

        button.addEventListener("click", function (event) {
            event.stopPropagation();

            const shouldOpen = dropdown.hidden;

            dropdown.hidden = !shouldOpen;

            button.setAttribute(
                "aria-expanded",
                String(shouldOpen)
            );
        });

        dropdown.addEventListener("click", function (event) {
            event.stopPropagation();
        });

        document.addEventListener("click", function (event) {
            if (
                !dropdown.hidden &&
                !dropdown.contains(event.target) &&
                !button.contains(event.target)
            ) {
                closeNotificationDropdown(
                    button,
                    dropdown
                );
            }
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                closeNotificationDropdown(
                    button,
                    dropdown
                );
            }
        });
    }

    // =====================================================
    // 11. LÀM MỚI DỮ LIỆU
    // =====================================================

    function initRefreshButton() {
        const button = document.getElementById(
            "refresh-dashboard-button"
        );

        if (!button) return;

        if (button.dataset.refreshInitialized === "true") {
            return;
        }

        button.dataset.refreshInitialized = "true";

        button.addEventListener("click", function () {
            window.location.reload();
        });
    }

    // =====================================================
    // 12. CẬP NHẬT HEADER KHI HỒ SƠ THAY ĐỔI
    // =====================================================

    window.addEventListener("profileUpdated", function () {
        initThongTinChuyenTrach();
    });

    // =====================================================
    // 13. CHIA SẺ HÀM CHO CÁC TRANG KHÁC
    // =====================================================

    window.layThongTinLuu = layThongTinLuu;
    window.layToken = layToken;
    window.apiFetch = apiFetch;
    window.ganText = ganText;

    window.initThongTinChuyenTrach =
        initThongTinChuyenTrach;

    window.capNhatAvatarChuyenTrach =
        capNhatAvatarChuyenTrach;

    window.initCurrentDate = initCurrentDate;
    window.initActiveSidebar = initActiveSidebar;
    window.initSidebarGroups = initSidebarGroups;
    window.initNotifications = initNotifications;
    window.initRefreshButton = initRefreshButton;

    // =====================================================
    // 14. KHỞI TẠO
    // =====================================================

    document.addEventListener("DOMContentLoaded", function () {
        initCurrentDate();
        initActiveSidebar();
        initSidebarGroups();
        initNotifications();
        initRefreshButton();
        initThongTinChuyenTrach();
    });
})();