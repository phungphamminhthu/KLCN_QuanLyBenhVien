document.addEventListener("DOMContentLoaded", function () {

    /* =====================================================
       LẤY THÔNG TIN ADMIN ĐÃ ĐĂNG NHẬP
    ====================================================== */

    const adminName =
        document.getElementById("adminName");

    const adminEmail =
        document.getElementById("adminEmail");


    /*
     * Ưu tiên localStorage
     * nếu người dùng chọn "Nhớ đăng nhập".
     *
     * Nếu không có thì lấy từ sessionStorage.
     */

    const Token =
        localStorage.getItem("Token")
        || sessionStorage.getItem("Token");


    const HoTen =
        localStorage.getItem("HoTen")
        || sessionStorage.getItem("HoTen");


    const Email =
        localStorage.getItem("Email")
        || sessionStorage.getItem("Email");


    const VaiTro =
        localStorage.getItem("VaiTro")
        || sessionStorage.getItem("VaiTro");


    /* =====================================================
       KIỂM TRA ĐĂNG NHẬP
    ====================================================== */

    if (!Token) {

        alert("Vui lòng đăng nhập.");

        window.location.href = "/auth/login";

        return;
    }


    /* =====================================================
       KIỂM TRA ROLE
    ====================================================== */

    if (VaiTro !== "ADMIN") {

        alert(
            "Bạn không có quyền truy cập trang quản trị."
        );

        window.location.href = "/auth/login";

        return;
    }


    /* =====================================================
       HIỂN THỊ THÔNG TIN ADMIN
    ====================================================== */

    if (HoTen) {

        adminName.textContent =
            HoTen + " (Admin)";
    }


    if (Email) {

        adminEmail.textContent =
            Email;
    }

});