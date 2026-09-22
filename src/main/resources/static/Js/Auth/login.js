document.addEventListener("DOMContentLoaded", function () {

    // ==============================
    // LẤY CÁC PHẦN TỬ HTML
    // ==============================

    const Form =
        document.getElementById("loginForm");

    const TenDangNhapInput =
        document.getElementById("TenDangNhap");

    const MatKhauInput =
        document.getElementById("MatKhau");

    const RememberLogin =
        document.getElementById("rememberLogin");

    const LoginButton =
        document.getElementById("loginButton");

    const LoginError =
        document.getElementById("loginError");

    const TogglePassword =
        document.getElementById("togglePassword");

    const PasswordIcon =
        document.getElementById("passwordIcon");


    // ==============================
    // HIỂN THỊ ICON MẬT KHẨU ĐANG ẨN
    // ==============================

    function setClosedEyeIcon() {

        PasswordIcon.innerHTML = `
            <path
                d="M5 12
                   C7 14.5, 9.5 15.5, 12 15.5
                   C14.5 15.5, 17 14.5, 19 12"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
            />

            <path
                d="M7 14 L6 15.5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
            />

            <path
                d="M17 14 L18 15.5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
            />
        `;
    }


    // ==============================
    // HIỂN THỊ ICON MẮT MỞ
    // ==============================

    function setOpenEyeIcon() {

        PasswordIcon.innerHTML = `
            <path
                d="M2.5 12
                   C5 7.5, 8 5.5, 12 5.5
                   C16 5.5, 19 7.5, 21.5 12
                   C19 16.5, 16 18.5, 12 18.5
                   C8 18.5, 5 16.5, 2.5 12Z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
            />

            <circle
                cx="12"
                cy="12"
                r="3"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
            />
        `;
    }


    // ==============================
    // MẶC ĐỊNH: MẬT KHẨU BỊ ẨN
    // ==============================

    MatKhauInput.type = "password";

    setClosedEyeIcon();


    // ==============================
    // CLICK ICON → HIỆN / ẨN MẬT KHẨU
    // ==============================

    TogglePassword.addEventListener(
        "click",
        function () {

            if (MatKhauInput.type === "password") {

                // Hiện mật khẩu
                MatKhauInput.type = "text";

                // Đổi sang icon mắt mở
                setOpenEyeIcon();

            } else {

                // Ẩn mật khẩu
                MatKhauInput.type = "password";

                // Đổi sang icon mắt nhắm
                setClosedEyeIcon();
            }
        }
    );


    // ==============================
    // XỬ LÝ FORM ĐĂNG NHẬP
    // ==============================

    Form.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            // ==============================
            // LẤY DỮ LIỆU
            // ==============================

            const TenDangNhap =
                TenDangNhapInput.value.trim();

            const MatKhau =
                MatKhauInput.value;


            // ==============================
            // KIỂM TRA TÊN ĐĂNG NHẬP
            // ==============================

            if (!TenDangNhap) {

                showMessage(
                    "Vui lòng nhập tên đăng nhập hoặc email.",
                    "error"
                );

                TenDangNhapInput.focus();

                return;
            }


            // ==============================
            // KIỂM TRA MẬT KHẨU
            // ==============================

            if (!MatKhau) {

                showMessage(
                    "Vui lòng nhập mật khẩu.",
                    "error"
                );

                MatKhauInput.focus();

                return;
            }


            // ==============================
            // VÔ HIỆU HÓA NÚT
            // ==============================

            LoginButton.disabled = true;

            LoginButton.textContent =
                "Đang đăng nhập...";


            try {

                // ==============================
                // GỌI API ĐĂNG NHẬP
                // ==============================

                const response = await fetch(
                    "/api/auth/login",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            TenDangNhap:
                                TenDangNhap,

                            MatKhau:
                                MatKhau
                        })
                    }
                );


                // ==============================
                // ĐỌC RESPONSE
                // ==============================

                const data =
                    await response.json();


                // ==============================
                // ĐĂNG NHẬP THẤT BẠI
                // ==============================

                if (!response.ok) {

                    showMessage(
                        data.message ||
                        "Tên đăng nhập hoặc mật khẩu không chính xác.",
                        "error"
                    );

                    LoginButton.disabled = false;

                    LoginButton.textContent =
                        "Đăng nhập";

                    return;
                }


                // ==============================
                // KIỂM TRA TOKEN
                // ==============================

                if (!data.Token) {

                    showMessage(
                        "Đăng nhập thành công nhưng không nhận được Token.",
                        "error"
                    );

                    LoginButton.disabled = false;

                    LoginButton.textContent =
                        "Đăng nhập";

                    return;
                }


                // ==============================
                // NHỚ ĐĂNG NHẬP
                // ==============================

                if (RememberLogin.checked) {

                    // ==================================
                    // CÓ TÍCH "NHỚ ĐĂNG NHẬP"
                    // → LƯU VÀO localStorage
                    // ==================================

                    localStorage.setItem(
                        "Token",
                        data.Token
                    );

                    localStorage.setItem(
                        "MaNguoiDung",
                        data.MaNguoiDung
                    );

                    localStorage.setItem(
                        "TenDangNhap",
                        data.TenDangNhap
                    );

                    localStorage.setItem(
                        "HoTen",
                        data.HoTen
                    );

                    localStorage.setItem(
                        "Email",
                        data.Email || ""
                    );

                    localStorage.setItem(
                        "VaiTro",
                        data.VaiTro
                    );

                    localStorage.setItem(
                        "AnhDaiDien",
                        data.AnhDaiDien || ""
                    );


                    // Xóa phiên cũ trong sessionStorage
                    sessionStorage.removeItem("Token");
                    sessionStorage.removeItem("MaNguoiDung");
                    sessionStorage.removeItem("TenDangNhap");
                    sessionStorage.removeItem("HoTen");
                    sessionStorage.removeItem("Email");
                    sessionStorage.removeItem("VaiTro");
                    sessionStorage.removeItem("AnhDaiDien");

                } else {

                    // ==================================
                    // KHÔNG TÍCH "NHỚ ĐĂNG NHẬP"
                    // → LƯU VÀO sessionStorage
                    // ==================================

                    sessionStorage.setItem(
                        "Token",
                        data.Token
                    );

                    sessionStorage.setItem(
                        "MaNguoiDung",
                        data.MaNguoiDung
                    );

                    sessionStorage.setItem(
                        "TenDangNhap",
                        data.TenDangNhap
                    );

                    sessionStorage.setItem(
                        "HoTen",
                        data.HoTen
                    );

                    sessionStorage.setItem(
                        "Email",
                        data.Email || ""
                    );

                    sessionStorage.setItem(
                        "VaiTro",
                        data.VaiTro
                    );

                    // Lưu fileKey ảnh đại diện
                    sessionStorage.setItem(
                        "AnhDaiDien",
                        data.AnhDaiDien || ""
                    );


                    // Xóa dữ liệu localStorage cũ
                    localStorage.removeItem("Token");
                    localStorage.removeItem("MaNguoiDung");
                    localStorage.removeItem("TenDangNhap");
                    localStorage.removeItem("HoTen");
                    localStorage.removeItem("Email");
                    localStorage.removeItem("VaiTro");
                    localStorage.removeItem("AnhDaiDien");
                }


                // ==============================
                // HIỂN THỊ ĐĂNG NHẬP THÀNH CÔNG
                // ==============================

                showMessage(
                    "Đăng nhập thành công.",
                    "success"
                );


                // ==============================
                // CHUYỂN TRANG THEO VAI TRÒ
                // ==============================

                setTimeout(function () {

                    switch (data.VaiTro) {

                        case "ADMIN":

                            window.location.href =
                                "/Admin/dashboard";

                            break;


                        case "BACSI":

                            window.location.href =
                                "/BacSi/dashboard";

                            break;


                        case "TIEPNHAN":

                            window.location.href =
                                "/TiepNhan/dashboard";

                            break;


                        case "CHUYENTRACH":

                            window.location.href =
                                "/ChuyenTrach/dashboard";

                            break;


                        case "DUOCSI":

                            window.location.href =
                                "/DuocSi/dashboard";

                            break;


                        default:

                            showMessage(
                                "Vai trò tài khoản không hợp lệ.",
                                "error"
                            );

                            LoginButton.disabled = false;

                            LoginButton.textContent =
                                "Đăng nhập";
                    }

                }, 500);


            } catch (error) {

                // ==============================
                // LỖI KẾT NỐI / LỖI JAVASCRIPT
                // ==============================

                console.error(
                    "Lỗi đăng nhập:",
                    error
                );

                showMessage(
                    "Không thể kết nối đến máy chủ. Vui lòng thử lại.",
                    "error"
                );

                LoginButton.disabled = false;

                LoginButton.textContent =
                    "Đăng nhập";
            }
        }
    );


    // ==============================
    // HÀM HIỂN THỊ THÔNG BÁO
    // ==============================

    function showMessage(text, type) {

        LoginError.textContent = text;

        LoginError.className =
            "login-message " + type;
    }

});