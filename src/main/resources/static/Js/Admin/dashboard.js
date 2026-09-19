document.addEventListener("DOMContentLoaded", function () {

    /* =====================================================
       LẤY THÔNG TIN ADMIN ĐÃ ĐĂNG NHẬP
    ====================================================== */

    const adminName =
        document.getElementById("adminName");

    const adminEmail =
        document.getElementById("adminEmail");

    const adminAvatar =
        document.getElementById("adminAvatar");


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


    const AnhDaiDien =
        localStorage.getItem("AnhDaiDien")
        || sessionStorage.getItem("AnhDaiDien");


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


    /* =====================================================
       HIỂN THỊ ẢNH ĐẠI DIỆN
    ====================================================== */

    if (AnhDaiDien && adminAvatar) {

        adminAvatar.src =
            "http://localhost:8080/api/images/view?fileKey="
            + encodeURIComponent(AnhDaiDien);

    } else if (adminAvatar) {

        // Chưa có ảnh đại diện
        adminAvatar.src =
            "/Images/default-avatar.jpg";
    }

});