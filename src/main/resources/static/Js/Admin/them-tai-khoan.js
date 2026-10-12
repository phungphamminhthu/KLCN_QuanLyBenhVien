document.addEventListener("DOMContentLoaded", function () {

    //const API_BASE_URL = "http://localhost:8080";

    /* ==================================================
       DOM
    ================================================== */

    const Modal =
        document.getElementById("addAccountModal");

    const OpenButton =
        document.getElementById("addAccountButton");

    const CloseButton =
        document.getElementById("closeAddAccountModal");

    const CancelButton =
        document.getElementById("cancelAddAccount");

    const Form =
        document.getElementById("addAccountForm");

    const SubmitButton =
        document.getElementById("submitAddAccount");


    /* ==================================================
       TOAST
    ================================================== */

    const AccountToast =
        document.getElementById("accountToast");

    const ToastTitle =
        document.getElementById("toastTitle");

    const ToastMessage =
        document.getElementById("toastMessage");

    const CloseAccountToast =
        document.getElementById("closeAccountToast");

    let ToastTimer = null;


    /* ==================================================
       HIỆN TOAST
    ================================================== */

    function showToast(
        Message,
        Type = "success",
        Title = null
    ) {

        if (!AccountToast) {
            console.error("Không tìm thấy #accountToast");
            return;
        }


        /* Xóa loại cũ */

        AccountToast.classList.remove(
            "success",
            "error",
            "warning"
        );


        /* Thêm loại mới */

        AccountToast.classList.add(
            Type
        );


        /* Tiêu đề mặc định */

        if (!Title) {

            if (Type === "success") {
                Title = "Thành công";
            }

            else if (Type === "error") {
                Title = "Có lỗi xảy ra";
            }

            else if (Type === "warning") {
                Title = "Cảnh báo";
            }

        }


        ToastTitle.textContent =
            Title;

        ToastMessage.textContent =
            Message;


        /* Hiện */

        AccountToast.classList.add(
            "show"
        );


        /* Xóa timer cũ */

        if (ToastTimer) {

            clearTimeout(
                ToastTimer
            );

        }


        /* Tự ẩn sau 3.5 giây */

        ToastTimer =
            setTimeout(
                function () {

                    hideToast();

                },
                3500
            );

    }


    /* ==================================================
       ẨN TOAST
    ================================================== */

    function hideToast() {

        if (!AccountToast) {
            return;
        }

        AccountToast.classList.remove(
            "show"
        );

    }


    if (CloseAccountToast) {

        CloseAccountToast.addEventListener(
            "click",
            hideToast
        );

    }


    /* ==================================================
       LẤY TOKEN
    ================================================== */

    function getToken() {

        return (
            localStorage.getItem("Token")
            ||
            sessionStorage.getItem("Token")
        );

    }


    /* ==================================================
       MỞ MODAL
    ================================================== */

    if (OpenButton) {

        OpenButton.addEventListener(
            "click",
            function () {

                if (!Modal) {

                    console.error(
                        "Không tìm thấy #addAccountModal"
                    );

                    return;

                }

                Modal.classList.add("show");

            }
        );

    }


    /* ==================================================
       ĐÓNG MODAL
    ================================================== */

    function closeModal() {

        if (!Modal) {
            return;
        }

        Modal.classList.remove("show");

    }


    if (CloseButton) {

        CloseButton.addEventListener(
            "click",
            closeModal
        );

    }


    if (CancelButton) {

        CancelButton.addEventListener(
            "click",
            closeModal
        );

    }


    /* ==================================================
       CLICK RA NGOÀI MODAL
    ================================================== */

    if (Modal) {

        Modal.addEventListener(
            "click",
            function (event) {

                if (event.target === Modal) {

                    closeModal();

                }

            }
        );

    }


    /* ==================================================
       ESC ĐỂ ĐÓNG
    ================================================== */

    document.addEventListener(
        "keydown",
        function (event) {

            if (event.key === "Escape") {

                closeModal();

            }

        }
    );


    /* ==================================================
       HIỆN / ẨN MẬT KHẨU
    ================================================== */

    const ToggleButtons =
        document.querySelectorAll(
            ".toggle-password"
        );


    ToggleButtons.forEach(
        function (Button) {

            Button.addEventListener(
                "click",
                function () {

                    const TargetId =
                        Button.dataset.target;

                    const Input =
                        document.getElementById(
                            TargetId
                        );

                    if (!Input) {
                        return;
                    }


                    if (
                        Input.type === "password"
                    ) {

                        Input.type =
                            "text";

                        Button.setAttribute(
                            "aria-label",
                            "Ẩn mật khẩu"
                        );

                    }

                    else {

                        Input.type =
                            "password";

                        Button.setAttribute(
                            "aria-label",
                            "Hiển thị mật khẩu"
                        );

                    }

                }
            );

        }
    );


    /* ==================================================
       INPUT
    ================================================== */

    const HoTenInput =
        document.getElementById(
            "addHoTen"
        );

    const TenDangNhapInput =
        document.getElementById(
            "addTenDangNhap"
        );

    const EmailInput =
        document.getElementById(
            "addEmail"
        );

    const SoDienThoaiInput =
        document.getElementById(
            "addSoDienThoai"
        );

    const MaVaiTroInput =
        document.getElementById(
            "addMaVaiTro"
        );

    const MatKhauInput =
        document.getElementById(
            "addMatKhau"
        );

    const XacNhanMatKhauInput =
        document.getElementById(
            "addXacNhanMatKhau"
        );


    /* ==================================================
       ERROR ELEMENT
    ================================================== */

    const HoTenError =
        document.getElementById(
            "addHoTenError"
        );

    const TenDangNhapError =
        document.getElementById(
            "addTenDangNhapError"
        );

    const EmailError =
        document.getElementById(
            "addEmailError"
        );

    const SoDienThoaiError =
        document.getElementById(
            "addSoDienThoaiError"
        );

    const MaVaiTroError =
        document.getElementById(
            "addMaVaiTroError"
        );

    const MatKhauError =
        document.getElementById(
            "addMatKhauError"
        );

    const XacNhanMatKhauError =
        document.getElementById(
            "addXacNhanMatKhauError"
        );


    /* ==================================================
       HIỂN THỊ LỖI FIELD
    ================================================== */

    function showError(
        Input,
        ErrorElement,
        Message
    ) {

        if (Input) {

            Input.classList.add(
                "input-error"
            );

        }

        if (ErrorElement) {

            ErrorElement.textContent =
                Message;

        }

    }


    /* ==================================================
       XÓA LỖI FIELD
    ================================================== */

    function clearError(
        Input,
        ErrorElement
    ) {

        if (Input) {

            Input.classList.remove(
                "input-error"
            );

        }

        if (ErrorElement) {

            ErrorElement.textContent =
                "";

        }

    }


    /* ==================================================
       VALIDATE HỌ TÊN
    ================================================== */

    function validateHoTen() {

        const Value =
            HoTenInput.value.trim();


        if (!Value) {

            showError(
                HoTenInput,
                HoTenError,
                "Vui lòng nhập họ tên."
            );

            return false;

        }


        clearError(
            HoTenInput,
            HoTenError
        );

        return true;

    }


    /* ==================================================
       VALIDATE TÊN ĐĂNG NHẬP
    ================================================== */

    function validateTenDangNhap() {

        const Value =
            TenDangNhapInput.value.trim();


        if (!Value) {

            showError(
                TenDangNhapInput,
                TenDangNhapError,
                "Vui lòng nhập tên đăng nhập."
            );

            return false;

        }


        if (Value.length < 3) {

            showError(
                TenDangNhapInput,
                TenDangNhapError,
                "Tên đăng nhập phải có ít nhất 3 ký tự."
            );

            return false;

        }


        clearError(
            TenDangNhapInput,
            TenDangNhapError
        );

        return true;

    }


    /* ==================================================
       VALIDATE EMAIL
    ================================================== */

    function validateEmail() {

        const Value =
            EmailInput.value.trim();


        if (!Value) {

            showError(
                EmailInput,
                EmailError,
                "Vui lòng nhập email."
            );

            return false;

        }


        const EmailRegex =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


        if (!EmailRegex.test(Value)) {

            showError(
                EmailInput,
                EmailError,
                "Email không đúng định dạng."
            );

            return false;

        }


        clearError(
            EmailInput,
            EmailError
        );

        return true;

    }


    /* ==================================================
       VALIDATE SỐ ĐIỆN THOẠI
    ================================================== */

    function validateSoDienThoai() {

        const Value =
            SoDienThoaiInput.value.trim();


        if (!Value) {

            showError(
                SoDienThoaiInput,
                SoDienThoaiError,
                "Vui lòng nhập số điện thoại."
            );

            return false;

        }


        const PhoneRegex =
            /^(0)(3|5|7|8|9)[0-9]{8}$/;


        if (!PhoneRegex.test(Value)) {

            showError(
                SoDienThoaiInput,
                SoDienThoaiError,
                "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 03, 05, 07, 08 hoặc 09."
            );

            return false;

        }


        clearError(
            SoDienThoaiInput,
            SoDienThoaiError
        );

        return true;

    }


    /* ==================================================
       VALIDATE VAI TRÒ
    ================================================== */

    function validateMaVaiTro() {

        const Value =
            MaVaiTroInput.value;


        if (!Value) {

            showError(
                MaVaiTroInput,
                MaVaiTroError,
                "Vui lòng chọn vai trò."
            );

            return false;

        }


        clearError(
            MaVaiTroInput,
            MaVaiTroError
        );

        return true;

    }


    /* ==================================================
       VALIDATE PASSWORD
    ================================================== */

    function validatePassword(
        Password
    ) {

        if (!Password) {

            return "Vui lòng nhập mật khẩu.";

        }


        if (Password.length < 8) {

            return "Mật khẩu phải có ít nhất 8 ký tự.";

        }


        if (!/[A-Z]/.test(Password)) {

            return "Mật khẩu phải có ít nhất 1 chữ hoa.";

        }


        if (!/[a-z]/.test(Password)) {

            return "Mật khẩu phải có ít nhất 1 chữ thường.";

        }


        if (!/[0-9]/.test(Password)) {

            return "Mật khẩu phải có ít nhất 1 chữ số.";

        }


        return null;

    }


    /* ==================================================
       PASSWORD RULES
    ================================================== */

    function updatePasswordRules() {

        const Password =
            MatKhauInput.value;


        updateRule(
            document.getElementById(
                "ruleLength"
            ),
            Password.length >= 8
        );


        updateRule(
            document.getElementById(
                "ruleUppercase"
            ),
            /[A-Z]/.test(Password)
        );


        updateRule(
            document.getElementById(
                "ruleLowercase"
            ),
            /[a-z]/.test(Password)
        );


        updateRule(
            document.getElementById(
                "ruleNumber"
            ),
            /[0-9]/.test(Password)
        );

    }


    function updateRule(
        Rule,
        IsValid
    ) {

        if (!Rule) {
            return;
        }


        const Icon =
            Rule.querySelector(
                ".rule-icon"
            );


        if (IsValid) {

            Rule.classList.add(
                "valid"
            );

            Rule.classList.remove(
                "invalid"
            );


            if (Icon) {
                Icon.textContent =
                    "✓";
            }

        }

        else {

            Rule.classList.remove(
                "valid"
            );

            Rule.classList.add(
                "invalid"
            );


            if (Icon) {
                Icon.textContent =
                    "•";
            }

        }

    }


    /* ==================================================
       VALIDATE MẬT KHẨU
    ================================================== */

    function validateMatKhau() {

        const Password =
            MatKhauInput.value;


        const ErrorMessage =
            validatePassword(
                Password
            );


        if (ErrorMessage) {

            showError(
                MatKhauInput,
                MatKhauError,
                ErrorMessage
            );

            return false;

        }


        clearError(
            MatKhauInput,
            MatKhauError
        );

        return true;

    }


    /* ==================================================
       VALIDATE XÁC NHẬN MẬT KHẨU
    ================================================== */

    function validateXacNhanMatKhau() {

        const Password =
            MatKhauInput.value;

        const ConfirmPassword =
            XacNhanMatKhauInput.value;


        if (!ConfirmPassword) {

            showError(
                XacNhanMatKhauInput,
                XacNhanMatKhauError,
                "Vui lòng xác nhận mật khẩu."
            );

            return false;

        }


        if (
            Password !==
            ConfirmPassword
        ) {

            showError(
                XacNhanMatKhauInput,
                XacNhanMatKhauError,
                "Mật khẩu xác nhận không khớp."
            );

            return false;

        }


        clearError(
            XacNhanMatKhauInput,
            XacNhanMatKhauError
        );

        return true;

    }


    /* ==================================================
       VALIDATE TOÀN FORM
    ================================================== */

    function validateForm() {

        const ValidHoTen =
            validateHoTen();

        const ValidTenDangNhap =
            validateTenDangNhap();

        const ValidEmail =
            validateEmail();

        const ValidSoDienThoai =
            validateSoDienThoai();

        const ValidVaiTro =
            validateMaVaiTro();

        const ValidMatKhau =
            validateMatKhau();

        const ValidXacNhanMatKhau =
            validateXacNhanMatKhau();


        return (
            ValidHoTen &&
            ValidTenDangNhap &&
            ValidEmail &&
            ValidSoDienThoai &&
            ValidVaiTro &&
            ValidMatKhau &&
            ValidXacNhanMatKhau
        );

    }


    /* ==================================================
       REALTIME VALIDATION
    ================================================== */

    if (HoTenInput) {

        HoTenInput.addEventListener(
            "input",
            validateHoTen
        );

    }


    if (TenDangNhapInput) {

        TenDangNhapInput.addEventListener(
            "input",
            validateTenDangNhap
        );

    }


    if (EmailInput) {

        EmailInput.addEventListener(
            "input",
            validateEmail
        );

    }


    if (SoDienThoaiInput) {

        SoDienThoaiInput.addEventListener(
            "input",
            function () {

                this.value =
                    this.value.replace(
                        /[^0-9]/g,
                        ""
                    );

                validateSoDienThoai();

            }
        );

    }


    if (MaVaiTroInput) {

        MaVaiTroInput.addEventListener(
            "change",
            validateMaVaiTro
        );

    }


    if (MatKhauInput) {

        MatKhauInput.addEventListener(
            "input",
            function () {

                updatePasswordRules();

                validateMatKhau();


                if (
                    XacNhanMatKhauInput.value
                ) {

                    validateXacNhanMatKhau();

                }

            }
        );

    }


    if (XacNhanMatKhauInput) {

        XacNhanMatKhauInput.addEventListener(
            "input",
            validateXacNhanMatKhau
        );

    }


    /* ==================================================
       SUBMIT
    ================================================== */

    if (Form) {

        Form.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();


                /* ======================================
                   VALIDATE
                ====================================== */

                if (!validateForm()) {

                    showToast(
                        "Vui lòng kiểm tra lại các thông tin bắt buộc.",
                        "warning",
                        "Thông tin chưa hợp lệ"
                    );

                    return;

                }


                /* ======================================
                   TOKEN
                ====================================== */

                const Token =
                    getToken();


                if (!Token) {

                    showToast(
                        "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.",
                        "warning",
                        "Phiên đăng nhập hết hạn"
                    );


                    setTimeout(
                        function () {

                            window.location.href =
                                "/auth/login";

                        },
                        1800
                    );

                    return;

                }


                /* ======================================
                   LẤY DATA
                ====================================== */

                const HoTen =
                    HoTenInput.value.trim();

                const TenDangNhap =
                    TenDangNhapInput.value.trim();

                const Email =
                    EmailInput.value.trim();

                const SoDienThoai =
                    SoDienThoaiInput.value.trim();

                const MaVaiTro =
                    MaVaiTroInput.value;

                const TrangThai =
                    document
                        .getElementById(
                            "addTrangThai"
                        )
                        .value === "true";

                const MatKhau =
                    MatKhauInput.value;


                /* ======================================
                   PAYLOAD
                ====================================== */

                const Payload = {

                    hoTen:
                        HoTen,

                    tenDangNhap:
                        TenDangNhap,

                    email:
                        Email,

                    soDienThoai:
                        SoDienThoai,

                    maVaiTro:
                        Number(MaVaiTro),

                    trangThai:
                        TrangThai,

                    matKhau:
                        MatKhau

                };


                console.log(
                    "POST /api/users:",
                    Payload
                );


                /* ======================================
                   DISABLE BUTTON
                ====================================== */

                SubmitButton.disabled =
                    true;

                SubmitButton.innerHTML =
                    "Đang thêm...";


                try {

                    /* ==================================
                       POST API
                    ================================== */

                    const Response =
                        await fetch(
                            `/api/users`,
                            {

                                method: "POST",

                                headers: {

                                    "Authorization":
                                        `Bearer ${Token}`,

                                    "Content-Type":
                                        "application/json"

                                },

                                body:
                                    JSON.stringify(
                                        Payload
                                    )

                            }
                        );


                    /* ==================================
                       RESPONSE
                    ================================== */

                    const ResponseText =
                        await Response.text();


                    console.log(
                        "HTTP STATUS:",
                        Response.status
                    );

                    console.log(
                        "RESPONSE:",
                        ResponseText
                    );


                    /* ==================================
                       401
                    ================================== */

                    if (
                        Response.status === 401
                    ) {

                        showToast(
                            "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
                            "warning",
                            "Phiên đăng nhập hết hạn"
                        );


                        setTimeout(
                            function () {

                                window.location.href =
                                    "/auth/login";

                            },
                            1800
                        );

                        return;

                    }


                    /* ==================================
                       403
                    ================================== */

                    if (
                        Response.status === 403
                    ) {

                        showToast(
                            "Tài khoản hiện tại không có quyền thêm tài khoản.",
                            "error",
                            "Không có quyền"
                        );


                        console.error(
                            "POST /api/users trả về 403:",
                            ResponseText
                        );

                        return;

                    }


                    /* ==================================
                       LỖI KHÁC
                    ================================== */

                    if (!Response.ok) {

                        let ErrorMessage =
                            ResponseText
                            ||
                            "Không thể thêm tài khoản.";


                        /* Backend trả JSON */

                        try {

                            const ErrorJson =
                                JSON.parse(
                                    ResponseText
                                );


                            if (
                                ErrorJson.message
                            ) {

                                ErrorMessage =
                                    ErrorJson.message;

                            }

                        }

                        catch (e) {

                            // Response không phải JSON

                        }


                        throw new Error(
                            ErrorMessage
                        );

                    }


                    /* ==================================
                       THÀNH CÔNG
                    ================================== */

                    showToast(
                        `Tài khoản "${TenDangNhap}" đã được tạo thành công.`,
                        "success",
                        "Thêm tài khoản thành công"
                    );


                    /* ==================================
                       ĐÓNG MODAL
                    ================================== */

                    closeModal();


                    /* ==================================
                       RESET FORM
                    ================================== */

                    Form.reset();

                    updatePasswordRules();


                    clearError(
                        HoTenInput,
                        HoTenError
                    );

                    clearError(
                        TenDangNhapInput,
                        TenDangNhapError
                    );

                    clearError(
                        EmailInput,
                        EmailError
                    );

                    clearError(
                        SoDienThoaiInput,
                        SoDienThoaiError
                    );

                    clearError(
                        MaVaiTroInput,
                        MaVaiTroError
                    );

                    clearError(
                        MatKhauInput,
                        MatKhauError
                    );

                    clearError(
                        XacNhanMatKhauInput,
                        XacNhanMatKhauError
                    );


                    /* ==================================
                       LOAD LẠI BẢNG
                    ================================== */

                    if (
                        typeof window.loadAccounts
                        ===
                        "function"
                    ) {

                        await window.loadAccounts();

                    }

                }

                catch (Error) {

                    console.error(
                        "Lỗi thêm tài khoản:",
                        Error
                    );


                    showToast(
                        Error.message
                        ||
                        "Không thể thêm tài khoản.",
                        "error",
                        "Thêm tài khoản thất bại"
                    );

                }

                finally {

                    SubmitButton.disabled =
                        false;

                    SubmitButton.innerHTML =
                        "<span>+</span> Thêm tài khoản";

                }

            }
        );

    }


    /* ==================================================
       KHỞI TẠO
    ================================================== */

    updatePasswordRules();

});