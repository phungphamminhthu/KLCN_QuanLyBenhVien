document.addEventListener("DOMContentLoaded", function () {

    const LogoutButton =
        document.getElementById("logoutButton");


    // Không có nút logout thì bỏ qua
    if (!LogoutButton) {
        return;
    }


    // =====================================================
    // TẠO POPUP ĐĂNG XUẤT
    // =====================================================

    const LogoutModal =
        document.createElement("div");

    LogoutModal.id = "logoutModal";

    LogoutModal.innerHTML = `
        <div class="logout-overlay">

            <div class="logout-popup">

                <div class="logout-icon">
                    ⇥
                </div>

                <h3>Đăng xuất</h3>

                <p>
                    Bạn có chắc chắn muốn đăng xuất không?
                </p>

                <div class="logout-actions">

                    <button
                        type="button"
                        id="cancelLogout"
                        class="cancel-logout">
                        Hủy
                    </button>

                    <button
                        type="button"
                        id="confirmLogout"
                        class="confirm-logout">
                        Đăng xuất
                    </button>

                </div>

            </div>

        </div>
    `;

    document.body.appendChild(LogoutModal);


    // Lấy các button trong popup
    const CancelLogout =
        document.getElementById("cancelLogout");

    const ConfirmLogout =
        document.getElementById("confirmLogout");


    // =====================================================
    // BẤM NÚT ĐĂNG XUẤT
    // =====================================================

    LogoutButton.addEventListener(
        "click",
        function () {

            LogoutModal
                .querySelector(".logout-overlay")
                .classList.add("show");

        }
    );


    // =====================================================
    // BẤM HỦY
    // =====================================================

    CancelLogout.addEventListener(
        "click",
        function () {

            LogoutModal
                .querySelector(".logout-overlay")
                .classList.remove("show");

        }
    );


    // =====================================================
    // BẤM RA NGOÀI POPUP
    // =====================================================

    LogoutModal
        .querySelector(".logout-overlay")
        .addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    event.currentTarget
                ) {

                    event.currentTarget
                        .classList.remove("show");

                }

            }
        );


    // =====================================================
    // XÁC NHẬN ĐĂNG XUẤT
    // =====================================================

    ConfirmLogout.addEventListener(
        "click",
        function () {

            // ==============================
            // XÓA LOCAL STORAGE
            // ==============================

            localStorage.removeItem("Token");
            localStorage.removeItem("MaNguoiDung");
            localStorage.removeItem("TenDangNhap");
            localStorage.removeItem("HoTen");
            localStorage.removeItem("Email");
            localStorage.removeItem("VaiTro");
            localStorage.removeItem("AnhDaiDien");


            // ==============================
            // XÓA SESSION STORAGE
            // ==============================

            sessionStorage.removeItem("Token");
            sessionStorage.removeItem("MaNguoiDung");
            sessionStorage.removeItem("TenDangNhap");
            sessionStorage.removeItem("HoTen");
            sessionStorage.removeItem("Email");
            sessionStorage.removeItem("VaiTro");
            sessionStorage.removeItem("AnhDaiDien");


            // ==============================
            // VỀ TRANG LOGIN
            // ==============================

            window.location.href =
                "/auth/login";

        }
    );

});