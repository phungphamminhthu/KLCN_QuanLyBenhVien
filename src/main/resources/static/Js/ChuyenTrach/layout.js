
    /* =====================================================
       LAYOUT - NHÂN VIÊN CHUYÊN TRÁCH
       NGÀY, HEADER, AVATAR, SIDEBAR, THÔNG BÁO
       ===================================================== */

    document.addEventListener("DOMContentLoaded", function () {
        initCurrentDate();
        initActiveSidebar();
        initSidebarGroups();
        initNotifications();
        initRefreshButton();
        initThongTinChuyenTrach();
    });

    /* =====================================================
       1. THÔNG TIN LƯU TRỮ
       Ưu tiên sessionStorage, sau đó localStorage
       ===================================================== */

    function layThongTinLuu(key) {
        return sessionStorage.getItem(key)
            || localStorage.getItem(key)
            || "";
    }

    /* =====================================================
       2. TOKEN
       ===================================================== */

    function layToken() {
        return layThongTinLuu("token")
            || layThongTinLuu("Token");
    }

    /* =====================================================
       3. GỌI API CÓ JWT
       Dùng khi cần gọi API được bảo vệ bằng JWT
       ===================================================== */

    async function apiFetch(url, options = {}) {
        const token = layToken();

        const headers = {
            ...(options.body instanceof FormData
                ? {}
                : { "Content-Type": "application/json" }),
            ...(options.headers || {})
        };

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            ...options,
            headers
        });

        const contentType = response.headers.get("content-type") || "";

        let data;

        if (contentType.includes("application/json")) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            const message =
                typeof data === "object"
                    ? data?.message || data?.error
                    : data;

            throw new Error(message || "Không thể xử lý yêu cầu.");
        }

        return data;
    }

    /* =====================================================
       4. HÀM HIỂN THỊ TEXT
       ===================================================== */

    function ganText(id, value, fallback = "") {
        const element = document.getElementById(id);

        if (element) {
            element.textContent =
                value !== null &&
                value !== undefined &&
                String(value).trim() !== ""
                    ? String(value)
                    : fallback;
        }
    }

    /* =====================================================
       5. HIỂN THỊ TÊN, EMAIL, VAI TRÒ
       Đọc dữ liệu tài khoản đã được lưu sau đăng nhập
       ===================================================== */
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

        // Lấy mã vai trò đã lưu khi đăng nhập
        const vaiTroGoc = layThongTinLuu("VaiTro");

        // Chuẩn hóa để kiểm tra vai trò
        const vaiTro = vaiTroGoc
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, "")
            .toUpperCase();

        // Chuyển mã vai trò thành nội dung hiển thị trên giao diện
        const tenVaiTro = [
            "CHUYENTRACH",
            "ROLE_CHUYENTRACH"
        ].includes(vaiTro)
            ? "Nhân viên chuyên trách"
            : (vaiTroGoc || "Nhân viên chuyên trách");

        // Hiển thị họ tên
        ganText(
            "header-user-name",
            hoTen,
            "Nhân viên chuyên trách"
        );

        // Hiển thị email
        ganText(
            "header-user-email",
            email,
            "Chưa cập nhật email"
        );

        // Hiển thị vai trò
        ganText(
            "header-user-role",
            tenVaiTro,
            "Nhân viên chuyên trách"
        );

        // Hiển thị ảnh đại diện
        capNhatAvatarChuyenTrach();
    }


    /* =====================================================
       6. ẢNH ĐẠI DIỆN
       AnhDaiDien được lưu trong storage sau đăng nhập
       ===================================================== */

    function capNhatAvatarChuyenTrach() {
        const avatar = document.getElementById("header-user-avatar");

        if (!avatar) return;

        const anhMacDinh = "/Images/default-avatar.jpg";

        const anhDaiDien = String(
            layThongTinLuu("AnhDaiDien") || ""
        ).trim();

        // Không có ảnh hoặc dữ liệu ảnh là null.
        if (
            !anhDaiDien ||
            anhDaiDien.toLowerCase() === "null" ||
            anhDaiDien.toLowerCase() === "undefined"
        ) {
            avatar.onerror = null;
            avatar.src = anhMacDinh;
            return;
        }

        let imageUrl;

        // Nếu CSDL lưu URL đầy đủ thì dùng URL đó.
        if (/^https?:\/\//i.test(anhDaiDien)) {
            imageUrl = anhDaiDien;
        } else if (anhDaiDien.startsWith("/")) {
            // Nếu là đường dẫn bắt đầu bằng / thì dùng trực tiếp.
            imageUrl = anhDaiDien;
        } else {
            // Nếu là fileKey hoặc tên file dùng API ảnh của dự án.
            imageUrl = "/api/images/view?fileKey="
                + encodeURIComponent(anhDaiDien);
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

    /* =====================================================
       7. CẬP NHẬT HEADER KHI HỒ SƠ THAY ĐỔI
       ===================================================== */

    window.addEventListener("profileUpdated", function () {
        initThongTinChuyenTrach();
    });

    /* =====================================================
       8. NGÀY HIỆN TẠI
       ===================================================== */

    function initCurrentDate() {
        const element = document.getElementById("header-current-date");

        if (!element) return;

        const now = new Date();

        const formattedDate = new Intl.DateTimeFormat("vi-VN", {
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            timeZone: "Asia/Ho_Chi_Minh"
        }).format(now);

        element.textContent =
            formattedDate.charAt(0).toUpperCase()
            + formattedDate.slice(1);
    }

    /* =====================================================
       9. SIDEBAR - XÓA ACTIVE CŨ
       ===================================================== */

    function initActiveSidebar() {
        const links = document.querySelectorAll(
            ".reception-sidebar .sidebar-menu a.menu-link"
        );

        links.forEach(function (link) {
            link.classList.remove("active");
            link.removeAttribute("aria-current");
        });
    }

    /* =====================================================
       10. SIDEBAR - ĐÓNG / MỞ NHÓM MENU
       Mặc định đóng khi tải trang
       ===================================================== */

    function initSidebarGroups() {
        const groups = document.querySelectorAll(
            ".reception-sidebar .sidebar-menu-group"
        );

        groups.forEach(function (group, index) {
            const button = group.querySelector(
                ":scope > .sidebar-menu-title"
            );

            const submenu = group.querySelector(
                ":scope > .sidebar-submenu"
            );

            if (!button || !submenu) return;

            if (!submenu.id) {
                submenu.id = "ct-submenu-" + index;
            }

            button.setAttribute("aria-controls", submenu.id);
            button.setAttribute("type", "button");

            // Đóng menu con mặc định.
            setSidebarGroupState(button, submenu, false);

            // Chỉ mở/đóng khi nhấn nút nhóm.
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

    function setSidebarGroupState(button, submenu, expanded) {
        button.setAttribute("aria-expanded", String(expanded));
        submenu.hidden = !expanded;

        const arrow = button.querySelector(".sidebar-group-arrow");

        if (arrow) {
            arrow.classList.toggle("is-expanded", expanded);
        }
    }

    /* =====================================================
       11. THÔNG BÁO
       ===================================================== */

    function initNotifications() {
        const button = document.getElementById("notificationButton");
        const dropdown = document.getElementById("notificationDropdown");

        if (!button || !dropdown) return;

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

        document.addEventListener("click", function () {
            closeNotificationDropdown(button, dropdown);
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                closeNotificationDropdown(button, dropdown);
            }
        });
    }

    function closeNotificationDropdown(button, dropdown) {
        dropdown.hidden = true;
        button.setAttribute("aria-expanded", "false");
    }

    /* =====================================================
       12. LÀM MỚI DỮ LIỆU
       ===================================================== */

    function initRefreshButton() {
        const button = document.getElementById(
            "refresh-dashboard-button"
        );

        if (!button) return;

        button.addEventListener("click", function () {
            window.location.reload();
        });
    }

    /* =====================================================
       13. CHIA SẺ HÀM CHO CÁC TRANG KHÁC
       ===================================================== */

    window.layThongTinLuu = layThongTinLuu;
    window.layToken = layToken;
    window.apiFetch = apiFetch;

    window.ganText = ganText;
    window.initThongTinChuyenTrach = initThongTinChuyenTrach;
    window.capNhatAvatarChuyenTrach = capNhatAvatarChuyenTrach;

    window.initCurrentDate = initCurrentDate;
    window.initSidebarGroups = initSidebarGroups;
    window.initNotifications = initNotifications;
    window.initRefreshButton = initRefreshButton;
