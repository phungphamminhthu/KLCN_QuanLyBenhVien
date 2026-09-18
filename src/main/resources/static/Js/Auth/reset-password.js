document.addEventListener("DOMContentLoaded", function () {

    // ==========================================
    // LẤY CÁC ELEMENT TRÊN GIAO DIỆN
    // ==========================================

    const EmailInput =
        document.getElementById("Email");

    const NewPasswordInput =
        document.getElementById("MatKhauMoi");

    const ConfirmPasswordInput =
        document.getElementById("MatKhauXacNhan");

    const ResetButton =
        document.getElementById("resetButton");

    const Form =
        document.getElementById("resetPasswordForm");

    const Message =
        document.getElementById("resetMessage");


    // ==========================================
    // LẤY THÔNG TIN TỪ SESSION STORAGE
    // ==========================================

    const EmailValue =
        sessionStorage.getItem("ResetEmail");

    const ResetToken =
        sessionStorage.getItem("ResetToken");


    // ==========================================
    // KIỂM TRA PHIÊN ĐẶT LẠI MẬT KHẨU
    // ==========================================

    if (!EmailValue || !ResetToken) {

        showMessage(
            "Phiên xác thực không hợp lệ. Vui lòng thực hiện lại.",
            "error"
        );

        NewPasswordInput.disabled = true;
        ConfirmPasswordInput.disabled = true;
        ResetButton.disabled = true;

        return;
    }


    // Hiển thị email
    EmailInput.value = EmailValue;


    // ==========================================
    // LẤY CÁC NÚT HIỆN / ẨN MẬT KHẨU
    // ==========================================

    const ToggleNewPassword =
        document.getElementById("toggleNewPassword");

    const NewPasswordIcon =
        document.getElementById("newPasswordIcon");

    const ToggleConfirmPassword =
        document.getElementById("toggleConfirmPassword");

    const ConfirmPasswordIcon =
        document.getElementById("confirmPasswordIcon");


    // ==========================================
    // ICON MÍ MẮT
    //
    // DÙNG KHI MẬT KHẨU ĐANG BỊ ẨN
    //
    // KHÔNG CÓ ĐƯỜNG GẠCH CHÉO
    // ==========================================

    function setClosedEyeIcon(Icon) {

        Icon.innerHTML = `

            <!-- Mí mắt khép -->
            <path
                d="M5 12
                   C7 14.5,
                     9.5 15.5,
                     12 15.5
                   C14.5 15.5,
                     17 14.5,
                     19 12"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
            />

        `;
    }


    // ==========================================
    // ICON MẮT MỞ
    //
    // DÙNG KHI MẬT KHẨU ĐANG HIỂN THỊ
    // ==========================================

    function setOpenEyeIcon(Icon) {

        Icon.innerHTML = `

            <!-- Viền mắt -->
            <path
                d="M2.5 12
                   C5 7.5,
                     8 5.5,
                     12 5.5
                   C16 5.5,
                     19 7.5,
                     21.5 12
                   C19 16.5,
                     16 18.5,
                     12 18.5
                   C8 18.5,
                     5 16.5,
                     2.5 12Z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
            />

            <!-- Con ngươi -->
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


    // ==========================================
    // HIỆN / ẨN MẬT KHẨU MỚI
    // ==========================================

    ToggleNewPassword.addEventListener(
        "click",
        function () {

            // ==========================================
            // ĐANG ẨN → HIỆN
            // ==========================================

            if (
                NewPasswordInput.type ===
                "password"
            ) {

                NewPasswordInput.type =
                    "text";


                // Hiện icon mắt mở
                setOpenEyeIcon(
                    NewPasswordIcon
                );


                // Accessibility
                ToggleNewPassword.setAttribute(
                    "aria-label",
                    "Ẩn mật khẩu"
                );

            }

            // ==========================================
            // ĐANG HIỆN → ẨN
            // ==========================================

            else {

                NewPasswordInput.type =
                    "password";


                // Hiện icon mí mắt
                setClosedEyeIcon(
                    NewPasswordIcon
                );


                // Accessibility
                ToggleNewPassword.setAttribute(
                    "aria-label",
                    "Hiện mật khẩu"
                );
            }

        }
    );


    // ==========================================
    // HIỆN / ẨN MẬT KHẨU XÁC NHẬN
    // ==========================================

    ToggleConfirmPassword.addEventListener(
        "click",
        function () {

            // ==========================================
            // ĐANG ẨN → HIỆN
            // ==========================================

            if (
                ConfirmPasswordInput.type ===
                "password"
            ) {

                ConfirmPasswordInput.type =
                    "text";


                // Hiện icon mắt mở
                setOpenEyeIcon(
                    ConfirmPasswordIcon
                );


                ToggleConfirmPassword.setAttribute(
                    "aria-label",
                    "Ẩn mật khẩu"
                );

            }

            // ==========================================
            // ĐANG HIỆN → ẨN
            // ==========================================

            else {

                ConfirmPasswordInput.type =
                    "password";


                // Hiện icon mí mắt
                setClosedEyeIcon(
                    ConfirmPasswordIcon
                );


                ToggleConfirmPassword.setAttribute(
                    "aria-label",
                    "Hiện mật khẩu"
                );
            }

        }
    );


    // ==========================================
    // TRẠNG THÁI BAN ĐẦU
    //
    // Mật khẩu mới:
    // → Ẩn
    // → Mí mắt
    //
    // Xác nhận:
    // → Ẩn
    // → Mí mắt
    // ==========================================

    NewPasswordInput.type =
        "password";

    ConfirmPasswordInput.type =
        "password";


    setClosedEyeIcon(
        NewPasswordIcon
    );

    setClosedEyeIcon(
        ConfirmPasswordIcon
    );


    ToggleNewPassword.setAttribute(
        "aria-label",
        "Hiện mật khẩu"
    );

    ToggleConfirmPassword.setAttribute(
        "aria-label",
        "Hiện mật khẩu"
    );


    // ==========================================
    // KIỂM TRA CÁC ĐIỀU KIỆN MẬT KHẨU
    // ==========================================

    function checkPasswordRules() {

        const Password =
            NewPasswordInput.value;


        // Ít nhất 8 ký tự
        const LengthValid =
            Password.length >= 8;


        // Ít nhất 1 chữ in hoa
        const UppercaseValid =
            /[A-Z]/.test(Password);


        // Ít nhất 1 chữ in thường
        const LowercaseValid =
            /[a-z]/.test(Password);


        // Ít nhất 1 chữ số
        const NumberValid =
            /[0-9]/.test(Password);


        // Cập nhật giao diện
        updateRule(
            "ruleLength",
            LengthValid
        );

        updateRule(
            "ruleUppercase",
            UppercaseValid
        );

        updateRule(
            "ruleLowercase",
            LowercaseValid
        );

        updateRule(
            "ruleNumber",
            NumberValid
        );


        // Kiểm tra mật khẩu xác nhận
        checkPasswordMatch();


        return (
            LengthValid &&
            UppercaseValid &&
            LowercaseValid &&
            NumberValid
        );
    }


    // ==========================================
    // KIỂM TRA MẬT KHẨU XÁC NHẬN
    // ==========================================

    function checkPasswordMatch() {

        const Password =
            NewPasswordInput.value;

        const ConfirmPassword =
            ConfirmPasswordInput.value;


        const MatchValid =
            Password.length > 0 &&
            Password === ConfirmPassword;


        updateRule(
            "ruleMatch",
            MatchValid
        );


        updateResetButton();
    }


    // ==========================================
    // CẬP NHẬT TRẠNG THÁI RULE
    // ==========================================

    function updateRule(
        RuleId,
        IsValid
    ) {

        const Rule =
            document.getElementById(RuleId);

        const Icon =
            Rule.querySelector(
                ".rule-icon"
            );


        if (IsValid) {

            Rule.classList.add("valid");

            Rule.classList.remove(
                "invalid"
            );

            Icon.textContent = "✓";

        } else {

            Rule.classList.remove(
                "valid"
            );

            Rule.classList.add(
                "invalid"
            );

            Icon.textContent = "✕";
        }
    }


    // ==========================================
    // KIỂM TRA CÓ ĐƯỢC BẬT NÚT RESET KHÔNG
    // ==========================================

    function updateResetButton() {

        const Password =
            NewPasswordInput.value;

        const ConfirmPassword =
            ConfirmPasswordInput.value;


        const PasswordValid =
            Password.length >= 8 &&
            /[A-Z]/.test(Password) &&
            /[a-z]/.test(Password) &&
            /[0-9]/.test(Password);


        const MatchValid =
            Password.length > 0 &&
            Password === ConfirmPassword;


        ResetButton.disabled =
            !(PasswordValid && MatchValid);
    }


    // ==========================================
    // NHẬP MẬT KHẨU MỚI
    // ==========================================

    NewPasswordInput.addEventListener(
        "input",
        function () {

            checkPasswordRules();

            clearMessage();
        }
    );


    // ==========================================
    // NHẬP MẬT KHẨU XÁC NHẬN
    // ==========================================

    ConfirmPasswordInput.addEventListener(
        "input",
        function () {

            checkPasswordMatch();

            clearMessage();
        }
    );


    // ==========================================
    // XỬ LÝ FORM RESET PASSWORD
    // ==========================================

    Form.addEventListener(
        "submit",
        async function (event) {

            // Không reload trang
            event.preventDefault();


            const Password =
                NewPasswordInput.value;

            const ConfirmPassword =
                ConfirmPasswordInput.value;


            // ==========================================
            // KIỂM TRA MẬT KHẨU
            // ==========================================

            if (
                Password.length < 8 ||
                !/[A-Z]/.test(Password) ||
                !/[a-z]/.test(Password) ||
                !/[0-9]/.test(Password)
            ) {

                showMessage(
                    "Mật khẩu chưa đáp ứng đủ yêu cầu.",
                    "error"
                );

                return;
            }


            // ==========================================
            // KIỂM TRA XÁC NHẬN
            // ==========================================

            if (
                Password !==
                ConfirmPassword
            ) {

                showMessage(
                    "Mật khẩu xác nhận không khớp.",
                    "error"
                );

                return;
            }


            // ==========================================
            // KHÓA BUTTON
            // ==========================================

            ResetButton.disabled = true;

            ResetButton.textContent =
                "Đang cập nhật...";


            try {

                // ==========================================
                // GỌI API
                // ==========================================

                const response = await fetch(

                    "/api/auth/reset-password" +

                    "?email=" +
                    encodeURIComponent(
                        EmailValue
                    ) +

                    "&resetToken=" +
                    encodeURIComponent(
                        ResetToken
                    ) +

                    "&matKhauMoi=" +
                    encodeURIComponent(
                        Password
                    ) +

                    "&matKhauXacNhan=" +
                    encodeURIComponent(
                        ConfirmPassword
                    ),

                    {
                        method: "POST"
                    }
                );


                // Backend trả String
                const result =
                    await response.text();


                // ==========================================
                // THÀNH CÔNG
                // ==========================================

                if (response.ok) {

                    showMessage(
                        "Đặt lại mật khẩu thành công. " +
                        "Đang chuyển về trang đăng nhập...",
                        "success"
                    );


                    // Xóa phiên reset
                    sessionStorage.removeItem(
                        "ResetEmail"
                    );

                    sessionStorage.removeItem(
                        "ResetToken"
                    );


                    // Chuyển về login
                    setTimeout(
                        function () {

                            window.location.href =
                                "/auth/login";

                        },
                        1500
                    );

                }

                // ==========================================
                // BACKEND TỪ CHỐI
                // ==========================================

                else {

                    showMessage(
                        result ||
                        "Không thể đặt lại mật khẩu.",
                        "error"
                    );


                    ResetButton.disabled = false;

                    ResetButton.textContent =
                        "Đặt lại mật khẩu";
                }

            } catch (error) {

                console.error(
                    "Lỗi reset password:",
                    error
                );


                showMessage(
                    "Không thể kết nối đến máy chủ. " +
                    "Vui lòng thử lại.",
                    "error"
                );


                ResetButton.disabled = false;

                ResetButton.textContent =
                    "Đặt lại mật khẩu";
            }

        }
    );


    // ==========================================
    // HIỂN THỊ MESSAGE
    // ==========================================

    function showMessage(
        Text,
        Type
    ) {

        Message.textContent =
            Text;

        Message.className =
            "message " + Type;
    }


    // ==========================================
    // XÓA MESSAGE
    // ==========================================

    function clearMessage() {

        Message.textContent = "";

        Message.className =
            "message";
    }

});