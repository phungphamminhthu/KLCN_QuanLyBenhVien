document.addEventListener("DOMContentLoaded", function () {

    const Form = document.getElementById("forgotPasswordForm");
    const EmailInput = document.getElementById("Email");
    const SubmitButton = document.getElementById("submitButton");
    const Message = document.getElementById("message");


    Form.addEventListener("submit", async function (event) {

        event.preventDefault();

        const EmailValue = EmailInput.value.trim();


        // ==========================================
        // KIỂM TRA EMAIL
        // ==========================================

        if (!EmailValue) {

            showMessage(
                "Vui lòng nhập email.",
                "error"
            );

            return;
        }


        // ==========================================
        // VÔ HIỆU HÓA BUTTON
        // ==========================================

        SubmitButton.disabled = true;
        SubmitButton.textContent = "Đang gửi...";


        try {

            const response = await fetch(
                "/api/auth/forgot-password?email=" +
                encodeURIComponent(EmailValue),
                {
                    method: "POST"
                }
            );


            const result = await response.text();


            // ==========================================
            // GỬI OTP THÀNH CÔNG
            // ==========================================

            if (response.ok) {

                // Lưu email để trang xác thực OTP sử dụng
                sessionStorage.setItem(
                    "ResetEmail",
                    EmailValue
                );

                // Xóa trạng thái xác thực cũ
                sessionStorage.removeItem(
                    "OtpVerified"
                );


                showMessage(
                    "Mã OTP đã được gửi đến email của bạn.",
                    "success"
                );


                // Chuyển sang trang nhập OTP
                setTimeout(function () {

                    window.location.href =
                        "/auth/verify-otp";

                }, 700);

            }


            // ==========================================
            // EMAIL KHÔNG TỒN TẠI
            // ==========================================

            else {

                showMessage(
                    result || "Không thể gửi mã OTP.",
                    "error"
                );

                SubmitButton.disabled = false;
                SubmitButton.textContent = "Gửi mã OTP";
            }


        } catch (error) {

            console.error(
                "Lỗi gửi OTP:",
                error
            );

            showMessage(
                "Không thể kết nối đến máy chủ. Vui lòng thử lại.",
                "error"
            );

            SubmitButton.disabled = false;
            SubmitButton.textContent = "Gửi mã OTP";
        }

    });


    // ==========================================
    // HIỂN THỊ THÔNG BÁO
    // ==========================================

    function showMessage(text, type) {

        Message.textContent = text;

        Message.className =
            "message " + type;
    }

});