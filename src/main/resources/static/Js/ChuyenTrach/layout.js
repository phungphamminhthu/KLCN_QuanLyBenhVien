
/* ==========================================
   LAYOUT - NHÂN VIÊN CHUYÊN TRÁCH
   ========================================== */

document.addEventListener("DOMContentLoaded", function () {

    initCurrentDate();
    initActiveSidebar();
    initNotifications();
    initRefreshButton();

});


/* ==========================================
   1. HIỂN THỊ NGÀY HIỆN TẠI
   ========================================== */

function initCurrentDate() {

    const dateElement =
        document.getElementById("header-current-date");

    if (!dateElement) return;

    const now = new Date();

    const formattedDate = new Intl.DateTimeFormat(
        "vi-VN",
        {
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            timeZone: "Asia/Ho_Chi_Minh"
        }
    ).format(now);

    dateElement.textContent =
        formattedDate.charAt(0).toUpperCase() +
        formattedDate.slice(1);
}


/* ==========================================
   2. ĐÁNH DẤU MENU ĐANG CHỌN
   ========================================== */

function initActiveSidebar() {

    const currentPath =
        window.location.pathname.replace(/\/+$/, "") || "/";

    const menuLinks =
        document.querySelectorAll(".sidebar-menu .menu-link");

    menuLinks.forEach(link => {

        const linkPath = new URL(
            link.href,
            window.location.origin
        ).pathname.replace(/\/+$/, "") || "/";

        if (linkPath === currentPath) {

            link.classList.add("active");

            link.setAttribute("aria-current", "page");

        } else {

            link.classList.remove("active");

            link.removeAttribute("aria-current");

        }

    });
}


/* ==========================================
   3. THÔNG BÁO
   ========================================== */

function initNotifications() {

    const button =
        document.getElementById("notificationButton");

    const dropdown =
        document.getElementById("notificationDropdown");

    if (!button || !dropdown) return;

    button.addEventListener("click", function (event) {

        event.stopPropagation();

        const willOpen = dropdown.hidden;

        dropdown.hidden = !willOpen;

        button.setAttribute(
            "aria-expanded",
            String(willOpen)
        );

    });

    document.addEventListener("click", function (event) {

        if (
            !dropdown.hidden &&
            !dropdown.contains(event.target) &&
            !button.contains(event.target)
        ) {

            dropdown.hidden = true;

            button.setAttribute("aria-expanded", "false");

        }

    });

    document.addEventListener("keydown", function (event) {

        if (event.key === "Escape") {

            dropdown.hidden = true;

            button.setAttribute("aria-expanded", "false");

        }

    });
}


/* ==========================================
   4. LÀM MỚI DỮ LIỆU
   ========================================== */

function initRefreshButton() {

    const button =
        document.getElementById("refresh-dashboard-button");

    if (!button) return;

    button.addEventListener("click", function () {

        // Tạm thời tải lại trang hiện tại.
        // Khi có API, sẽ thay bằng tải lại dữ liệu.
        window.location.reload();

    });
}
