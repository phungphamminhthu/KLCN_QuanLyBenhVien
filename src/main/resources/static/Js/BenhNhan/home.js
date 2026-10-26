
document.addEventListener("DOMContentLoaded", function () {
    "use strict";

    function getStoredValue(key) {
        return sessionStorage.getItem(key) || localStorage.getItem(key);
    }

    function clearLoginData() {
        const keys = [
            "Token",
            "MaNguoiDung",
            "TenDangNhap",
            "HoTen",
            "Email",
            "VaiTro",
            "AnhDaiDien"
        ];

        keys.forEach(function (key) {
            sessionStorage.removeItem(key);
            localStorage.removeItem(key);
        });
    }

    // Kiểm tra đăng nhập
    const token = getStoredValue("Token");
    const vaiTro = (getStoredValue("VaiTro") || "").trim().toUpperCase();

    if (!token || vaiTro !== "BENHNHAN") {
        window.location.replace("/auth/login");
        return;
    }

    // Hiển thị tên bệnh nhân
    const patientName = document.getElementById("patientName");
    const hoTen = getStoredValue("HoTen");

    if (patientName && hoTen) {
        patientName.textContent = hoTen;
    }

    // Các thành phần hộp thoại đăng xuất
    const logoutButton = document.getElementById("logoutButton");
    const logoutModal = document.getElementById("logoutModal");
    const cancelLogout = document.getElementById("cancelLogout");
    const confirmLogout = document.getElementById("confirmLogout");

    if (!logoutButton || !logoutModal || !cancelLogout || !confirmLogout) {
        console.error("Thiếu thành phần HTML của hộp thoại đăng xuất.");
        return;
    }

    function openLogoutModal() {
        logoutModal.classList.add("show");
        logoutModal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        cancelLogout.focus();
    }

    function closeLogoutModal() {
        logoutModal.classList.remove("show");
        logoutModal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        logoutButton.focus();
    }

    // Nhấn nút đăng xuất: chỉ mở hộp thoại, chưa đăng xuất
    logoutButton.addEventListener("click", openLogoutModal);

    // Nhấn Ở lại
    cancelLogout.addEventListener("click", closeLogoutModal);

    // Nhấn bên ngoài hộp thoại để đóng
    logoutModal.addEventListener("click", function (event) {
        if (event.target === logoutModal) {
            closeLogoutModal();
        }
    });

    // Nhấn Escape để đóng
    document.addEventListener("keydown", function (event) {
        if (
            event.key === "Escape" &&
            logoutModal.classList.contains("show")
        ) {
            closeLogoutModal();
        }
    });

    // Chỉ đăng xuất khi nhấn xác nhận
    confirmLogout.addEventListener("click", function () {
        confirmLogout.disabled = true;
        confirmLogout.textContent = "Đang đăng xuất...";

        clearLoginData();

        window.location.replace("/auth/login");
    });
});
