
/* =====================================================
   LAYOUT BÁC SĨ
   TOKEN, API, HEADER, SIDEBAR, THÔNG BÁO
   File dùng chung cho các trang bác sĩ.
   ===================================================== */

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
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

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
        data = {
            message: await response.text()
        };
    }

    if (!response.ok) {
        throw new Error(
            data?.message || "Không thể xử lý yêu cầu."
        );
    }

    return data;
}

/* ==================== THÔNG TIN BÁC SĨ ==================== */

//function hienThiThongTinBacSi() {
//    const hoTen =
//        sessionStorage.getItem("HoTen")
//        || localStorage.getItem("HoTen")
//        || "Bác sĩ";
//
//    const email =
//        sessionStorage.getItem("Email")
//        || localStorage.getItem("Email")
//        || "";
//
//    ganText("doctorName", hoTen, "Bác sĩ");
//
//    const doctorEmail = getElement("doctorEmail");
//    if (doctorEmail) {
//        doctorEmail.textContent = email || "Bác sĩ điều trị";
//    }
//
//    const welcomeDoctorName = getElement("welcomeDoctorName");
//    if (welcomeDoctorName) {
//        welcomeDoctorName.textContent = hoTen;
//    }
//
//    if (typeof capNhatAvatarBacSi === "function") {
//        capNhatAvatarBacSi();
//    }
//}

function hienThiThongTinBacSi() {
    const hoTen =
        sessionStorage.getItem("HoTen") ||
        localStorage.getItem("HoTen") ||
        "Bác sĩ";

    const email =
        sessionStorage.getItem("Email") ||
        localStorage.getItem("Email") ||
        "";

    // Cập nhật tên bác sĩ
    const doctorName = document.getElementById("doctorName");
    if (doctorName) {
        doctorName.textContent = hoTen;
    }

    // Cập nhật email
    const doctorEmail = document.getElementById("doctorEmail");
    if (doctorEmail) {
        doctorEmail.textContent = email || "Bác sĩ điều trị";
    }

    // Cập nhật tên tại khu vực chào mừng nếu trang có phần tử này
    const welcomeDoctorName =
        document.getElementById("welcomeDoctorName");

    if (welcomeDoctorName) {
        welcomeDoctorName.textContent = hoTen;
    }

    // Cập nhật ảnh đại diện
    if (typeof capNhatAvatarBacSi === "function") {
        capNhatAvatarBacSi();
    }
}

function ganText(id, value, fallback = "") {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value || fallback;
    }
}
/* ==================== AVATAR BÁC SĨ ==================== */

function capNhatAvatarBacSi() {
    const avatar = document.getElementById("doctorAvatar");
    if (!avatar) return;

    const anhMacDinh = "/Images/default-avatar.jpg";

    const anhDaiDien = String(
        layThongTinLuu("AnhDaiDien") || ""
    ).trim();

    // Không có ảnh trong CSDL hoặc dữ liệu lưu trữ.
    if (!anhDaiDien || anhDaiDien.toLowerCase() === "null") {
        avatar.onerror = null;
        avatar.src = anhMacDinh;
        return;
    }

    // CSDL lưu đường dẫn tương đối: images/ten-file.jpg
    const imageUrl = "/api/images/view?fileKey="
        + encodeURIComponent(anhDaiDien);

    avatar.onerror = function () {
        console.error("Không tải được ảnh đại diện:", imageUrl);
        this.onerror = null;
        this.src = anhMacDinh;
    };

    avatar.src = imageUrl;
}
/* ==================== SIDEBAR ==================== */


function khoiTaoMenuKhamBenh() {
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


/* ==================== HEADER, QUYỀN TRUY CẬP ==================== */

function khoiTaoHeaderBacSi() {
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

    // Kiểm tra vai trò bác sĩ.
    const vaiTroHopLe = [
        "BACSI",
        "DOCTOR",
        "ROLE_BACSI",
        "ROLE_DOCTOR"
    ].includes(vaiTro);

    if (!vaiTroHopLe) {
        alert("Bạn không có quyền truy cập trang Bác sĩ.");
        window.location.href = "/auth/login";
        return;
    }

    /* ==================== THÔNG BÁO ==================== */

    const button = document.getElementById("notificationButton");
    const panel = document.getElementById("notificationPanel");

    if (button && panel) {
        button.setAttribute("aria-expanded", "false");

        button.addEventListener("click", function (event) {
            event.stopPropagation();

            const isOpen = !panel.hidden;
            panel.hidden = isOpen;

            button.setAttribute("aria-expanded", String(!isOpen));
        });

        panel.addEventListener("click", function (event) {
            event.stopPropagation();
        });

        document.addEventListener("click", function () {
            panel.hidden = true;
            button.setAttribute("aria-expanded", "false");
        });
    }

    hienThiThongTinBacSi();
}

/* ==================== CẬP NHẬT HỒ SƠ ==================== */

// Khi trang hồ sơ phát sự kiện profileUpdated,
// layout sẽ cập nhật lại tên, email và avatar.
window.addEventListener("profileUpdated", function () {
    hienThiThongTinBacSi();
});

/* ==================== CHIA SẺ HÀM CHO CÁC TRANG ==================== */

window.layThongTinLuu = layThongTinLuu;
window.layToken = layToken;
window.apiFetch = apiFetch;

window.hienThiThongTinBacSi = hienThiThongTinBacSi;
window.capNhatAvatarBacSi = capNhatAvatarBacSi;
window.khoiTaoMenuKhamBenh = khoiTaoMenuKhamBenh;
window.khoiTaoHeaderBacSi = khoiTaoHeaderBacSi;

/* ==================== KHỞI TẠO LAYOUT ==================== */

document.addEventListener("DOMContentLoaded", function () {
    hienThiThongTinBacSi();
    khoiTaoMenuKhamBenh();
    khoiTaoHeaderBacSi();
});
