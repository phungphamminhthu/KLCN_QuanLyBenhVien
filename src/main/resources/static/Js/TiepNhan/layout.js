
/* =====================================================
   LAYOUT NHÂN VIÊN TIẾP NHẬN
   TOKEN, API, HEADER, SIDEBAR, THÔNG BÁO
   File dùng chung cho các trang tiếp nhận.
   ===================================================== */
console.log("TiepNhan layout.js đã được tải");

/* ==================== THÔNG TIN LƯU TRỮ ==================== */

function layThongTinLuu(key) {
    return localStorage.getItem(key)
        || sessionStorage.getItem(key)
        || "";
}


/* ==================== TOKEN ==================== */

function layToken() {
    return layThongTinLuu("token")
        || layThongTinLuu("Token");
}


/* ==================== GỌI API CÓ JWT ==================== */

async function apiFetch(url, options = {}) {
    const token = layToken();

    const headers = {
        ...(options.headers || {})
    };

    // Chỉ đặt Content-Type JSON khi không gửi FormData.
    if (!(options.body instanceof FormData)
        && !Object.keys(headers).some(
            key => key.toLowerCase() === "content-type"
        )) {
        headers["Content-Type"] = "application/json";
    }

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

    let data = null;

    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
        data = await response.json();
    } else {
        const message = await response.text();
        data = { message };
    }

    if (!response.ok) {
        throw new Error(
            data?.message || "Không thể xử lý yêu cầu."
        );
    }

    return data;
}


/* ==================== THÔNG TIN NHÂN VIÊN ==================== */

function hienThiThongTinTiepNhan() {
    const hoTen =
        layThongTinLuu("HoTen")
        || layThongTinLuu("hoTen")
        || layThongTinLuu("TenNguoiDung")
        || "Nhân viên tiếp nhận";

    const email =
        layThongTinLuu("Email")
        || layThongTinLuu("email")
        || "";

    // Cập nhật tên nhân viên.
    ganText(
        "current-user-name",
        hoTen,
        "Nhân viên tiếp nhận"
    );

    // Cập nhật email.
    ganText(
        "current-user-email",
        email,
        "Chưa cập nhật email"
    );

    // Cập nhật vai trò.
    const vaiTro = layThongTinLuu("VaiTro")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "")
        .toUpperCase();

    const tenVaiTro = [
        "TIEPNHAN",
        "ROLE_TIEPNHAN",
        "RECEPTIONIST",
        "ROLE_RECEPTIONIST"
    ].includes(vaiTro)
        ? "Nhân viên tiếp nhận"
        : (layThongTinLuu("VaiTro")
            || "Nhân viên tiếp nhận");

    ganText(
        "current-user-role",
        tenVaiTro,
        "Nhân viên tiếp nhận"
    );

    // Cập nhật ảnh đại diện.
    capNhatAvatarTiepNhan();
}


/* ==================== HÀM GÁN TEXT ==================== */

function ganText(id, value, fallback = "") {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value || fallback;
    }
}


/* ==================== AVATAR NHÂN VIÊN ==================== */


function capNhatAvatarTiepNhan() {
    const avatar = document.getElementById("current-user-avatar");
    if (!avatar) return;

    const anhMacDinh = "/Images/default-avatar.jpg";

    const anhDaiDien = String(
        layThongTinLuu("AnhDaiDien")
        || layThongTinLuu("anhDaiDien")
        || layThongTinLuu("Avatar")
        || layThongTinLuu("avatar")
        || ""
    ).trim();

    if (
        !anhDaiDien
        || ["null", "undefined"].includes(anhDaiDien.toLowerCase())
    ) {
        avatar.onerror = null;
        avatar.src = anhMacDinh;
        return;
    }

    // Nếu đã là URL đầy đủ thì sử dụng trực tiếp.
    const imageUrl = /^https?:\/\//i.test(anhDaiDien)
        ? anhDaiDien
        : "/api/images/view?fileKey="
            + encodeURIComponent(anhDaiDien.replace(/^\/+/, ""));

    console.log("Ảnh đại diện:", anhDaiDien);
    console.log("URL tải ảnh:", imageUrl);

    avatar.onerror = function () {
        console.error("Không tải được ảnh:", imageUrl);
        this.onerror = null;
        this.src = anhMacDinh;
    };

    avatar.src = imageUrl;
}



/* ==================== SIDEBAR ==================== */

function khoiTaoMenuTiepNhan() {
    // Hỗ trợ nhóm menu có submenu nếu trang sử dụng.
    const menuGroup = document.querySelector(
        ".menu-group, .menu-parent"
    );

    if (!menuGroup) return;

    const menuButton = Array.from(menuGroup.children).find(
        element => element.classList.contains("menu-item")
    );

    const submenu = Array.from(menuGroup.children).find(
        element => element.classList.contains("submenu")
    );

    if (!menuButton || !submenu) return;

    // Tránh khởi tạo sự kiện nhiều lần.
    if (menuButton.dataset.initialized === "true") return;

    menuButton.dataset.initialized = "true";

    const arrow = menuButton.querySelector(".arrow");
    let isOpen = submenu.classList.contains("open");

    function capNhatMenu() {
        submenu.classList.toggle("open", isOpen);

        menuButton.setAttribute(
            "aria-expanded",
            String(isOpen)
        );

        if (arrow) {
            arrow.style.transform = isOpen
                ? "rotate(0deg)"
                : "rotate(-90deg)";
        }
    }

    function toggleMenu() {
        isOpen = !isOpen;
        capNhatMenu();
    }

    menuButton.style.cursor = "pointer";
    menuButton.setAttribute("role", "button");
    menuButton.setAttribute("tabindex", "0");

    menuButton.addEventListener("click", event => {
        event.preventDefault();
        toggleMenu();
    });

    menuButton.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleMenu();
        }
    });

    capNhatMenu();
}


/* ==================== THÔNG BÁO ==================== */

function khoiTaoThongBaoTiepNhan() {
    const button = document.getElementById("notification-button");
    const panel = document.getElementById("notification-panel");
    const closeButton = document.getElementById("notification-close");

    if (!button || !panel) return;

    // Tránh đăng ký sự kiện lặp lại.
    if (button.dataset.initialized === "true") return;

    button.dataset.initialized = "true";

    function dongThongBao() {
        panel.hidden = true;

        button.setAttribute(
            "aria-expanded",
            "false"
        );
    }

    function moDongThongBao() {
        const dangMo = !panel.hidden;

        panel.hidden = dangMo;

        button.setAttribute(
            "aria-expanded",
            String(!dangMo)
        );
    }

    // Mặc định đóng bảng thông báo.
    dongThongBao();

    button.addEventListener("click", event => {
        event.stopPropagation();
        moDongThongBao();
    });

    panel.addEventListener("click", event => {
        event.stopPropagation();
    });

    if (closeButton) {
        closeButton.addEventListener(
            "click",
            dongThongBao
        );
    }

    document.addEventListener("click", dongThongBao);

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            dongThongBao();
        }
    });
}


/* ==================== NGÀY TRÊN HEADER ==================== */

function capNhatNgayHeader() {
    const dateElement = document.getElementById(
        "header-date-display"
    );

    if (!dateElement) return;

    const now = new Date();

    dateElement.textContent = now.toLocaleDateString(
        "vi-VN",
        {
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
}


/* ==================== NÚT LÀM MỚI ==================== */

function khoiTaoNutLamMoi() {
    // Hỗ trợ cả hai ID nếu các trang đang dùng khác nhau.
    const button =
        document.getElementById("refreshDataButton")
        || document.getElementById("refresh-dashboard-button");

    if (!button) return;

    if (button.dataset.initialized === "true") return;

    button.dataset.initialized = "true";

    button.addEventListener("click", function () {
        window.location.reload();
    });
}


/* ==================== HEADER, QUYỀN TRUY CẬP ==================== */

function khoiTaoHeaderTiepNhan() {
    const token = layToken();

    const vaiTro = layThongTinLuu("VaiTro")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "")
        .toUpperCase();

    // Chưa đăng nhập hoặc không có token.
    if (!token) {
        window.location.href = "/auth/login";
        return;
    }

    // Kiểm tra vai trò nhân viên tiếp nhận.
    const vaiTroHopLe = [
        "TIEPNHAN",
        "ROLE_TIEPNHAN",
        "RECEPTIONIST",
        "ROLE_RECEPTIONIST"
    ].includes(vaiTro);

    if (!vaiTroHopLe) {
        alert("Bạn không có quyền truy cập trang Tiếp nhận.");
        window.location.href = "/auth/login";
        return;
    }

    hienThiThongTinTiepNhan();
    khoiTaoThongBaoTiepNhan();
    capNhatNgayHeader();
    khoiTaoNutLamMoi();
}


/* ==================== CẬP NHẬT HỒ SƠ ==================== */

// Khi trang hồ sơ phát sự kiện profileUpdated,
// layout sẽ cập nhật tên, email và ảnh đại diện.
window.addEventListener("profileUpdated", function () {
    hienThiThongTinTiepNhan();
});



/* ==================== CHIA SẺ HÀM CHO CÁC TRANG ==================== */

window.layThongTinLuu = layThongTinLuu;
window.layToken = layToken;
window.apiFetch = apiFetch;

window.ganText = ganText;
window.hienThiThongTinTiepNhan = hienThiThongTinTiepNhan;
window.capNhatAvatarTiepNhan = capNhatAvatarTiepNhan;
window.khoiTaoMenuTiepNhan = khoiTaoMenuTiepNhan;
window.khoiTaoThongBaoTiepNhan = khoiTaoThongBaoTiepNhan;
window.khoiTaoHeaderTiepNhan = khoiTaoHeaderTiepNhan;

/* ==================== KHỞI TẠO LAYOUT ==================== */

function khoiTaoLayoutTiepNhan() {
    console.log("[TiepNhan] Đang khởi tạo layout");

    hienThiThongTinTiepNhan();
    khoiTaoMenuTiepNhan();
    khoiTaoThongBaoTiepNhan();
    capNhatNgayHeader();
    khoiTaoNutLamMoi();
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        khoiTaoLayoutTiepNhan,
        { once: true }
    );
} else {
    khoiTaoLayoutTiepNhan();
}

window.khoiTaoLayoutTiepNhan = khoiTaoLayoutTiepNhan;
