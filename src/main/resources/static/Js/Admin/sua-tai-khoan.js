document.addEventListener("DOMContentLoaded", function () {

    const Modal =
        document.getElementById("editAccountModal");

    const Form =
        document.getElementById("editAccountForm");

    const CloseButton =
        document.getElementById("closeEditAccountModal");

    const CancelButton =
        document.getElementById("cancelEditAccount");


    const HoTen =
        document.getElementById("editHoTen");

    const TenDangNhap =
        document.getElementById("editTenDangNhap");

    const Email =
        document.getElementById("editEmail");

    const SoDienThoai =
        document.getElementById("editSoDienThoai");

    const MaVaiTro =
        document.getElementById("editMaVaiTro");

    const TrangThai =
        document.getElementById("editTrangThai");

    const SubmitButton =
        document.getElementById("submitEditAccount");


    let CurrentAccount = null;


    function closeModal() {

        if (!Modal) return;

        Modal.classList.remove("show");

        document.body.style.overflow = "";

        CurrentAccount = null;

        clearErrors();
    }


    function clearErrors() {

        document.querySelectorAll(
            "#editAccountModal .edit-field-error"
        ).forEach(function (Element) {

            Element.textContent = "";

        });


        document.querySelectorAll(
            "#editAccountModal .input-error"
        ).forEach(function (Element) {

            Element.classList.remove("input-error");

        });
    }


    function setError(Input, ErrorElement, Message) {

        if (Input) {
            Input.classList.add("input-error");
        }

        if (ErrorElement) {
            ErrorElement.textContent = Message;
        }
    }


    function validateForm() {

        clearErrors();

        let IsValid = true;


        const HoTenError =
            document.getElementById("editHoTenError");

        const TenDangNhapError =
            document.getElementById("editTenDangNhapError");

        const EmailError =
            document.getElementById("editEmailError");

        const SoDienThoaiError =
            document.getElementById("editSoDienThoaiError");

        const MaVaiTroError =
            document.getElementById("editMaVaiTroError");


        /* Họ tên */

        if (!HoTen.value.trim()) {

            setError(
                HoTen,
                HoTenError,
                "Vui lòng nhập họ và tên."
            );

            IsValid = false;

        }


        /* Username */

        const UsernameValue =
            TenDangNhap.value.trim();

        if (!UsernameValue) {

            setError(
                TenDangNhap,
                TenDangNhapError,
                "Vui lòng nhập tên đăng nhập."
            );

            IsValid = false;

        } else if (UsernameValue.length < 3) {

            setError(
                TenDangNhap,
                TenDangNhapError,
                "Tên đăng nhập phải có ít nhất 3 ký tự."
            );

            IsValid = false;
        }


        /* Email */

        const EmailValue =
            Email.value.trim();

        const EmailRegex =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!EmailValue) {

            setError(
                Email,
                EmailError,
                "Vui lòng nhập email."
            );

            IsValid = false;

        } else if (!EmailRegex.test(EmailValue)) {

            setError(
                Email,
                EmailError,
                "Email không đúng định dạng."
            );

            IsValid = false;
        }


        /* SĐT */

        const PhoneValue =
            SoDienThoai.value.trim();

        const PhoneRegex =
            /^(0)(3|5|7|8|9)[0-9]{8}$/;

        if (!PhoneValue) {

            setError(
                SoDienThoai,
                SoDienThoaiError,
                "Vui lòng nhập số điện thoại."
            );

            IsValid = false;

        } else if (!PhoneRegex.test(PhoneValue)) {

            setError(
                SoDienThoai,
                SoDienThoaiError,
                "Số điện thoại không hợp lệ."
            );

            IsValid = false;
        }


        /* Vai trò */

        if (!MaVaiTro.value) {

            setError(
                MaVaiTro,
                MaVaiTroError,
                "Vui lòng chọn vai trò."
            );

            IsValid = false;
        }


        return IsValid;
    }


    /*
     * Hàm được tai-khoan.js gọi
     */
    window.openEditAccountModal = function (Account) {

        if (!Modal || !Account) return;

        CurrentAccount = Account;

        clearErrors();


        HoTen.value =
            Account.hoTen || "";

        TenDangNhap.value =
            Account.tenDangNhap || "";

        Email.value =
            Account.email || "";

        SoDienThoai.value =
            Account.soDienThoai || "";

        MaVaiTro.value =
            Account.maVaiTro != null
                ? String(Account.maVaiTro)
                : "";

        TrangThai.value =
            Account.trangThai
                ? "true"
                : "false";


        Modal.classList.add("show");

        document.body.style.overflow = "hidden";

        setTimeout(function () {

            HoTen.focus();

        }, 100);
    };


    /*
     * Đóng
     */

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


    /*
     * Click ngoài modal
     */

    if (Modal) {

        Modal.addEventListener(
            "click",
            function (Event) {

                if (Event.target === Modal) {
                    closeModal();
                }

            }
        );
    }


    /*
     * ESC
     */

    document.addEventListener(
        "keydown",
        function (Event) {

            if (
                Event.key === "Escape"
                && Modal
                && Modal.classList.contains("show")
            ) {
                closeModal();
            }

        }
    );


    /*
     * Submit
     */

    if (Form) {

        Form.addEventListener(
            "submit",
            async function (Event) {

                Event.preventDefault();


                if (!CurrentAccount) {
                    return;
                }


                if (!validateForm()) {

                    if (
                        typeof window.showToast ===
                        "function"
                    ) {

                        window.showToast(
                            "Vui lòng kiểm tra lại các thông tin.",
                            "warning",
                            "Thông tin chưa hợp lệ"
                        );

                    }

                    return;
                }


                const Id =
                    CurrentAccount.id;


                const Payload = {

                    tenDangNhap:
                        TenDangNhap.value.trim(),

                    hoTen:
                        HoTen.value.trim(),

                    email:
                        Email.value.trim(),

                    soDienThoai:
                        SoDienThoai.value.trim(),

                    maVaiTro:
                        Number(MaVaiTro.value),

                    anhDaiDien:
                        CurrentAccount.anhDaiDien || null,

                    trangThai:
                        TrangThai.value === "true"
                };


                try {

                    SubmitButton.disabled = true;

                    SubmitButton.textContent =
                        "Đang lưu...";


                    const Token =
                        localStorage.getItem("Token")
                        || localStorage.getItem("token")
                        || "";


                    const Response =
                        await fetch(
                            "/api/users/" + encodeURIComponent(Id),
                            {
                                method: "PUT",

                                headers: {
                                    "Content-Type":
                                        "application/json",

                                    ...(Token
                                        ? {
                                            "Authorization":
                                                "Bearer " + Token
                                        }
                                        : {})
                                },

                                body:
                                    JSON.stringify(Payload)
                            }
                        );


                    if (Response.status === 401) {

                        window.location.href =
                            "/auth/login";

                        return;
                    }


                    if (Response.status === 403) {

                        throw new Error(
                            "Bạn không có quyền cập nhật tài khoản."
                        );
                    }


                    if (!Response.ok) {

                        let Message =
                            "Không thể cập nhật tài khoản.";

                        try {

                            const Data =
                                await Response.json();

                            if (typeof Data === "string") {
                                Message = Data;
                            } else if (Data.message) {
                                Message = Data.message;
                            }

                        } catch (Error) {
                            // Không có JSON
                        }

                        throw new Error(Message);
                    }


                    closeModal();


                    if (
                        typeof window.showToast ===
                        "function"
                    ) {

                        window.showToast(
                            "Thông tin tài khoản đã được cập nhật.",
                            "success",
                            "Cập nhật thành công"
                        );

                    }


                    /*
                     * Load lại danh sách
                     */

                    if (
                        typeof window.loadAccounts ===
                        "function"
                    ) {

                        await window.loadAccounts();

                    }


                } catch (Error) {

                    console.error(
                        "Lỗi cập nhật tài khoản:",
                        Error
                    );


                    if (
                        typeof window.showToast ===
                        "function"
                    ) {

                        window.showToast(
                            Error.message
                            || "Không thể cập nhật tài khoản.",
                            "error",
                            "Cập nhật thất bại"
                        );

                    } else {

                        alert(
                            Error.message
                            || "Không thể cập nhật tài khoản."
                        );
                    }

                } finally {

                    SubmitButton.disabled = false;

                    SubmitButton.textContent =
                        "Lưu thay đổi";
                }

            }
        );
    }

});