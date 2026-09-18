document.addEventListener("DOMContentLoaded", function () {

    const LogoutButton =
        document.getElementById("logoutButton");

    const LogoutModal =
        document.getElementById("logoutModal");

    const CancelLogout =
        document.getElementById("cancelLogout");

    const ConfirmLogout =
        document.getElementById("confirmLogout");


    // Nếu dashboard không có popup
    // thì không thực hiện
    if (
        !LogoutButton ||
        !LogoutModal ||
        !CancelLogout ||
        !ConfirmLogout
    ) {
        return;
    }


    // ==============================
    // BẤM ĐĂNG XUẤT
    // ==============================

    LogoutButton.addEventListener(
        "click",
        function () {

            LogoutModal.classList.add("show");

        }
    );


    // ==============================
    // BẤM HỦY
    // ==============================

    CancelLogout.addEventListener(
        "click",
        function () {

            LogoutModal.classList.remove("show");

        }
    );


    // ==============================
    // BẤM RA NGOÀI POPUP
    // ==============================

    LogoutModal.addEventListener(
        "click",
        function (event) {

            if (
                event.target === LogoutModal ||
                event.target.classList.contains(
                    "logout-overlay"
                )
            ) {

                LogoutModal.classList.remove("show");

            }

        }
    );


    // ==============================
    // XÁC NHẬN ĐĂNG XUẤT
    // ==============================

    ConfirmLogout.addEventListener(
        "click",
        function () {

            // Xóa localStorage
            localStorage.removeItem("Token");
            localStorage.removeItem("MaNguoiDung");
            localStorage.removeItem("TenDangNhap");
            localStorage.removeItem("HoTen");
            localStorage.removeItem("Email");
            localStorage.removeItem("VaiTro");


            // Xóa sessionStorage
            sessionStorage.removeItem("Token");
            sessionStorage.removeItem("MaNguoiDung");
            sessionStorage.removeItem("TenDangNhap");
            sessionStorage.removeItem("HoTen");
            sessionStorage.removeItem("Email");
            sessionStorage.removeItem("VaiTro");


            // Chuyển về trang đăng nhập
            window.location.href =
                "/auth/login";

        }
    );

});