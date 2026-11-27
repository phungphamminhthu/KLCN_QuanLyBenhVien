(function () {
    "use strict";

    // =====================================================
    // DỌN PHIÊN ĐĂNG NHẬP & XỬ LÝ TẬP TRUNG HTTP 401
    // =====================================================

    const PUBLIC_AUTH_APIS = [
        "/api/auth/login",
        "/api/auth/register",
        "/api/auth/check-email",
        "/api/auth/forgot-password",
        "/api/auth/reset-password",
        "/api/auth/verify-otp"
    ];

    function clearAuthStorage() {
        const keys = [
            "Token",
            "token",
            "MaNguoiDung",
            "TenDangNhap",
            "HoTen",
            "Email",
            "VaiTro",
            "AnhDaiDien"
        ];

        keys.forEach(function (key) {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });

        sessionStorage.removeItem("thongBaoChoKhamSauDangNhap");
    }

    function isProtectedApiRequest(input) {
        try {
            const rawUrl = typeof input === "string"
                ? input
                : (input && typeof input.url === "string" ? input.url : "");

            if (!rawUrl) {
                return false;
            }

            const parsed = new URL(rawUrl, window.location.origin);

            if (parsed.origin !== window.location.origin) {
                return false;
            }

            const path = parsed.pathname;

            if (!path.startsWith("/api/")) {
                return false;
            }

            return !PUBLIC_AUTH_APIS.some(function (prefix) {
                return path === prefix || path.startsWith(prefix + "/");
            });
        } catch (_) {
            return false;
        }
    }

    window.qlbvClearAuthStorage = clearAuthStorage;

    if (typeof window.fetch === "function" && !window.__qlbvAuthFetchPatched) {
        window.__qlbvAuthFetchPatched = true;
        const nativeFetch = window.fetch.bind(window);
        let isRedirectingOn401 = false;

        window.fetch = async function (input, init) {
            const response = await nativeFetch(input, init);

            // Chỉ tự động đăng xuất và chuyển về /auth/login khi nhận 401 (hết phiên / token không hợp lệ).
            // Không tự động đăng xuất khi nhận 403 (đã đăng nhập nhưng không đủ quyền).
            if (
                response.status === 401 &&
                isProtectedApiRequest(input) &&
                !isRedirectingOn401 &&
                window.location.pathname !== "/auth/login"
            ) {
                isRedirectingOn401 = true;
                clearAuthStorage();
                window.location.replace("/auth/login");
            }

            return response;
        };
    }
})();

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

                <div>
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

            if (typeof window.qlbvClearAuthStorage === "function") {
                window.qlbvClearAuthStorage();
            }

            // ==============================
            // VỀ TRANG LOGIN
            // ==============================

            window.location.href =
                "/auth/login";

        }
    );

});