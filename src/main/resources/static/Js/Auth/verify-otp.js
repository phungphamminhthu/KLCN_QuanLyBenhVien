document.addEventListener("DOMContentLoaded", function () {

    // ==========================================
    // LẤY CÁC ELEMENT TRÊN GIAO DIỆN
    // ==========================================

    const EmailInput = document.getElementById("Email");
    const OTPInput = document.getElementById("OTP");
    const VerifyButton = document.getElementById("verifyButton");
    const Form = document.getElementById("verifyOtpForm");
    const Message = document.getElementById("message");


    // ==========================================
    // LẤY EMAIL ĐÃ LƯU TỪ BƯỚC QUÊN MẬT KHẨU
    // ==========================================

    const EmailValue = sessionStorage.getItem("ResetEmail");


    // ==========================================
    // KIỂM TRA EMAIL
    //
    // Nếu không có email thì người dùng không đi
    // theo đúng quy trình quên mật khẩu.
    // ==========================================

    if (!EmailValue) {

        showMessage(
            "Không tìm thấy email. Vui lòng thực hiện lại từ đầu.",
            "error"
        );

        VerifyButton.disabled = true;

        return;
    }


    // Hiển thị email lên giao diện
    EmailInput.value = EmailValue;


    // ==========================================
    // CHỈ CHO PHÉP NHẬP SỐ VÀ TỐI ĐA 6 KÝ TỰ
    // ==========================================

    OTPInput.addEventListener("input", function () {

        // Xóa tất cả ký tự không phải số
        this.value = this.value
            .replace(/\D/g, "")
            .slice(0, 6);

        // Xóa thông báo cũ khi người dùng nhập lại
        Message.className = "message";
        Message.textContent = "";
    });


    // ==========================================
    // XỬ LÝ FORM XÁC THỰC OTP
    // ==========================================

    Form.addEventListener("submit", async function (event) {

        // Ngăn trình duyệt reload trang
        event.preventDefault();


        // Lấy OTP người dùng nhập
        const OTPValue = OTPInput.value.trim();


        // ==========================================
        // KIỂM TRA OTP PHẢI ĐỦ 6 SỐ
        // ==========================================

        if (OTPValue.length !== 6) {

            showMessage(
                "Vui lòng nhập đầy đủ mã OTP 6 số.",
                "error"
            );

            return;
        }


        // Khóa nút trong lúc đang gọi API
        VerifyButton.disabled = true;
        VerifyButton.textContent = "Đang xác thực...";


        try {

            // ==========================================
            // GỌI API XÁC THỰC OTP
            // ==========================================

            const response = await fetch(
                "/api/auth/verify-otp" +
                "?email=" + encodeURIComponent(EmailValue) +
                "&otp=" + encodeURIComponent(OTPValue),
                {
                    method: "POST"
                }
            );


            // ==========================================
            // ĐỌC RESPONSE DẠNG JSON
            //
            // Backend hiện tại trả:
            //
            // {
            //     "message": "Xác thực OTP thành công",
            //     "resetToken": "..."
            // }
            // ==========================================

            const result = await response.json();


            // ==========================================
            // OTP XÁC THỰC THÀNH CÔNG
            // ==========================================

            if (response.ok) {

                // Kiểm tra backend có trả resetToken không
                if (!result.resetToken) {

                    showMessage(
                        "Không nhận được resetToken từ máy chủ.",
                        "error"
                    );

                    VerifyButton.disabled = false;
                    VerifyButton.textContent = "Xác thực";

                    return;
                }


                // ==========================================
                // LƯU RESET TOKEN
                //
                // Token được tạo bởi BACKEND.
                //
                // Frontend chỉ nhận và lưu tạm thời,
                // không tự tạo token.
                // ==========================================

                sessionStorage.setItem(
                    "ResetToken",
                    result.resetToken
                );


                // Hiển thị thông báo thành công
                showMessage(
                    result.message ||
                    "Xác thực OTP thành công.",
                    "success"
                );


                // ==========================================
                // CHUYỂN SANG TRANG ĐẶT LẠI MẬT KHẨU
                // ==========================================

                setTimeout(function () {

                    window.location.href =
                        "/auth/reset-password";

                }, 700);

            } else {

                // ==========================================
                // OTP KHÔNG HỢP LỆ / HẾT HẠN / ĐÃ DÙNG
                // ==========================================

                showMessage(
                    result.message ||
                    "Mã OTP không hợp lệ.",
                    "error"
                );

                VerifyButton.disabled = false;
                VerifyButton.textContent = "Xác thực";
            }

        } catch (error) {

            // ==========================================
            // LỖI KẾT NỐI SERVER
            // ==========================================

            console.error(
                "Lỗi xác thực OTP:",
                error
            );

            showMessage(
                "Không thể kết nối đến máy chủ. Vui lòng thử lại.",
                "error"
            );

            VerifyButton.disabled = false;
            VerifyButton.textContent = "Xác thực";
        }
    });


    // ==========================================
    // HÀM HIỂN THỊ THÔNG BÁO
    // ==========================================

    function showMessage(text, type) {

        Message.textContent = text;

        Message.className =
            "message " + type;
    }

});