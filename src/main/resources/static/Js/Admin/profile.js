document.addEventListener("DOMContentLoaded", function () {

    /* ==================================================
       DOM - PROFILE
    ================================================== */

    const ProfileAvatar =
        document.getElementById("profileAvatar");

    const AvatarInput =
        document.getElementById("avatarInput");

    const EditProfileButton =
        document.getElementById("editProfileButton");

    const CancelProfileButton =
        document.getElementById("cancelProfileButton");

    const SaveProfileButton =
        document.getElementById("saveProfileButton");

    const EditActions =
        document.getElementById("profileEditActions");


    /* ==================================================
       DISPLAY INFORMATION
    ================================================== */

    const DisplayHoTen =
        document.getElementById("displayHoTen");

    const DisplayEmail =
        document.getElementById("displayEmail");

    const DisplaySoDienThoai =
        document.getElementById("displaySoDienThoai");

    const DisplayTenDangNhap =
        document.getElementById("displayTenDangNhap");

    const DisplayVaiTro =
        document.getElementById("displayVaiTro");


    /* ==================================================
       PROFILE HEADER
    ================================================== */

    const ProfileRole =
        document.getElementById("profileRole");

    const ProfileDepartment =
        document.getElementById("profileDepartment");

    const ProfileStatus =
        document.getElementById("profileStatus");


    /* ==================================================
       INPUT PROFILE
    ================================================== */

    const InputHoTen =
        document.getElementById("inputHoTen");

    const InputEmail =
        document.getElementById("inputEmail");

    const InputSoDienThoai =
        document.getElementById("inputSoDienThoai");


    /* ==================================================
       TOAST
    ================================================== */

    const ProfileToast =
        document.getElementById("profileToast");

    const ProfileToastTitle =
        document.getElementById("profileToastTitle");

    const ProfileToastMessage =
        document.getElementById("profileToastMessage");

    const ProfileToastIcon =
        document.getElementById("profileToastIcon");

    const CloseProfileToast =
        document.getElementById("closeProfileToast");

    let ToastTimer = null;


    function showToast(
        Message,
        Type = "success",
        Title = null
    ) {

        if (!ProfileToast) {
            return;
        }


        ProfileToast.classList.remove(
            "success",
            "error",
            "warning"
        );

        ProfileToast.classList.add(Type);


        if (!Title) {

            if (Type === "success") {
                Title = "Thành công";
            }

            if (Type === "error") {
                Title = "Có lỗi xảy ra";
            }

            if (Type === "warning") {
                Title = "Cảnh báo";
            }
        }


        if (ProfileToastTitle) {

            ProfileToastTitle.textContent =
                Title;
        }


        if (ProfileToastMessage) {

            ProfileToastMessage.textContent =
                Message;
        }


        if (ProfileToastIcon) {

            if (Type === "success") {

                ProfileToastIcon.textContent =
                    "✓";

            } else {

                ProfileToastIcon.textContent =
                    "!";
            }
        }


        ProfileToast.classList.add("show");


        if (ToastTimer) {

            clearTimeout(
                ToastTimer
            );
        }


        ToastTimer = setTimeout(
            function () {

                ProfileToast.classList.remove(
                    "show"
                );

            },
            3500
        );
    }


    /* ==================================================
       CLOSE TOAST
    ================================================== */

    if (CloseProfileToast) {

        CloseProfileToast.addEventListener(
            "click",
            function () {

                if (ProfileToast) {

                    ProfileToast.classList.remove(
                        "show"
                    );
                }
            }
        );
    }


    /* ==================================================
       TOKEN
    ================================================== */

    function getToken() {

        return (
            localStorage.getItem("Token")
            ||
            sessionStorage.getItem("Token")
        );
    }


    const Token =
        getToken();


    if (!Token) {

        window.location.href =
            "/auth/login";

        return;
    }


    /* ==================================================
       DEFAULT AVATAR
    ================================================== */

    const DEFAULT_AVATAR =
        "images/2b1261cf-87ab-4b5c-9097-50cd95b2fc24.jpg";


    function getAvatarUrl(fileKey) {

        const Key =
            fileKey && fileKey.trim()
                ? fileKey
                : DEFAULT_AVATAR;


        return (
            "/api/images/view?fileKey="
            +
            encodeURIComponent(Key)
            +
            "&t="
            +
            Date.now()
        );
    }


    /* ==================================================
       DATA
    ================================================== */

    let CurrentUser = null;

    let OriginalData = null;


    /*
     * FileKey của avatar đang được chọn.
     *
     * Chỉ lưu vào database khi người dùng
     * bấm "Lưu thay đổi".
     */
    let CurrentAvatarFileKey = null;


    /*
     * true = đang chỉnh sửa
     */
    let IsEditMode = false;


    /* ==================================================
       ROLE
    ================================================== */

    function getRoleName(user) {

        if (!user) {
            return "—";
        }


        /* ----------------------------------------------
           vaiTro là object
        ---------------------------------------------- */

        if (user.vaiTro) {

            if (
                typeof user.vaiTro ===
                "string"
            ) {

                return user.vaiTro;
            }


            return (
                user.vaiTro.tenVaiTro
                ||
                user.vaiTro.ten
                ||
                "—"
            );
        }


        /* ----------------------------------------------
           UserResponse có tenVaiTro
        ---------------------------------------------- */

        if (user.tenVaiTro) {

            return user.tenVaiTro;
        }


        /* ----------------------------------------------
           fallback theo maVaiTro
        ---------------------------------------------- */

        if (user.maVaiTro) {

            const Roles = {

                1: "Quản trị viên",

                2: "Bác sĩ",

                3: "Nhân viên tiếp nhận",

                4: "Dược sĩ",

                5: "Phòng chuyên trách",

                6: "Bệnh nhân"
            };


            return (
                Roles[user.maVaiTro]
                ||
                "—"
            );
        }


        return "—";
    }


    /* ==================================================
       TÌM TÀI KHOẢN ĐANG ĐĂNG NHẬP
    ================================================== */

    function findCurrentUser(Accounts) {

        const Username =
            localStorage.getItem("TenDangNhap")
            ||
            sessionStorage.getItem("TenDangNhap");


        const Email =
            localStorage.getItem("Email")
            ||
            sessionStorage.getItem("Email");


        const UserId =
            localStorage.getItem("MaNguoiDung")
            ||
            sessionStorage.getItem("MaNguoiDung");


        return Accounts.find(
            function (User) {

                /* --------------------------------------
                   Ưu tiên MaNguoiDung
                -------------------------------------- */

                if (
                    UserId
                    &&
                    String(
                        User.maNguoiDung
                    )
                    ===
                    String(UserId)
                ) {

                    return true;
                }


                /* --------------------------------------
                   Username
                -------------------------------------- */

                if (
                    Username
                    &&
                    User.tenDangNhap
                    ===
                    Username
                ) {

                    return true;
                }


                /* --------------------------------------
                   Email
                -------------------------------------- */

                if (
                    Email
                    &&
                    User.email
                    ===
                    Email
                ) {

                    return true;
                }


                return false;
            }
        );
    }


    /* ==================================================
       LOAD PROFILE
    ================================================== */

    async function loadProfile() {

        try {

            const Response =
                await fetch(
                    "/api/users",
                    {
                        method: "GET",

                        headers: {

                            "Authorization":
                                `Bearer ${Token}`
                        }
                    }
                );


            /* ------------------------------------------
               401
            ------------------------------------------ */

            if (
                Response.status ===
                401
            ) {

                window.location.href =
                    "/auth/login";

                return;
            }


            /* ------------------------------------------
               403
            ------------------------------------------ */

            if (
                Response.status ===
                403
            ) {

                showToast(
                    "Bạn không có quyền xem thông tin tài khoản.",
                    "error",
                    "Không có quyền"
                );

                return;
            }


            /* ------------------------------------------
               OTHER ERROR
            ------------------------------------------ */

            if (!Response.ok) {

                throw new Error(
                    "Không thể tải thông tin hồ sơ."
                );
            }


            const Data =
                await Response.json();


            let Accounts =
                Data;


            if (
                Array.isArray(Data)
            ) {

                Accounts =
                    Data;

            } else if (
                Array.isArray(Data.data)
            ) {

                Accounts =
                    Data.data;

            } else if (
                Array.isArray(Data.content)
            ) {

                Accounts =
                    Data.content;

            } else {

                Accounts = [];
            }


            /* ------------------------------------------
               TÌM USER HIỆN TẠI
            ------------------------------------------ */

            const User =
                findCurrentUser(
                    Accounts
                );


            if (!User) {

                throw new Error(
                    "Không tìm thấy tài khoản đang đăng nhập."
                );
            }


            /* ------------------------------------------
               LƯU DATA
            ------------------------------------------ */

            CurrentUser =
                User;


            OriginalData = {

                hoTen:
                    User.hoTen
                    ||
                    "",

                email:
                    User.email
                    ||
                    "",

                soDienThoai:
                    User.soDienThoai
                    ||
                    "",

                anhDaiDien:
                    User.anhDaiDien
                    ||
                    DEFAULT_AVATAR
            };


            CurrentAvatarFileKey =
                User.anhDaiDien
                ||
                DEFAULT_AVATAR;


            IsEditMode =
                false;


            renderProfile(User);

        }

        catch (Error) {

            console.error(
                "Lỗi load profile:",
                Error
            );


            showToast(
                Error.message
                ||
                "Không thể tải hồ sơ.",
                "error",
                "Lỗi"
            );
        }
    }


    /* ==================================================
       RENDER PROFILE
    ================================================== */

    function renderProfile(User) {

        /* ==============================================
           THÔNG TIN CÁ NHÂN
        ============================================== */

        if (DisplayHoTen) {

            DisplayHoTen.textContent =
                User.hoTen
                ||
                "—";
        }


        if (DisplayEmail) {

            DisplayEmail.textContent =
                User.email
                ||
                "—";
        }


        if (DisplaySoDienThoai) {

            DisplaySoDienThoai.textContent =
                User.soDienThoai
                ||
                "—";
        }


        /* ==============================================
           THÔNG TIN TÀI KHOẢN
        ============================================== */

        if (DisplayTenDangNhap) {

            DisplayTenDangNhap.textContent =
                User.tenDangNhap
                ||
                "—";
        }


        const RoleName =
            getRoleName(User);


        if (DisplayVaiTro) {

            DisplayVaiTro.textContent =
                RoleName;
        }


        /* ==============================================
           PROFILE HEADER
        ============================================== */

        if (ProfileRole) {

            ProfileRole.textContent =
                User.hoTen
                ||
                "—";
        }


        if (ProfileDepartment) {

            ProfileDepartment.textContent =
                RoleName;
        }


        /* ==============================================
           TRẠNG THÁI
        ============================================== */

        const Status =
            User.trangThai !== false;


        if (ProfileStatus) {

            if (Status) {

                ProfileStatus.className =
                    "status-badge active";

                ProfileStatus.innerHTML =
                    "<span></span> Hoạt động";

            } else {

                ProfileStatus.className =
                    "status-badge locked";

                ProfileStatus.innerHTML =
                    "<span></span> Tạm khóa";
            }
        }


        /* ==============================================
           AVATAR
        ============================================== */

        if (ProfileAvatar) {

            ProfileAvatar.src =
                getAvatarUrl(
                    User.anhDaiDien
                );


            ProfileAvatar.onerror =
                function () {

                    this.onerror =
                        null;

                    this.src =
                        getAvatarUrl(
                            DEFAULT_AVATAR
                        );
                };
        }
    }


    /* ==================================================
       ENTER EDIT MODE

       Chỉnh sửa:
       - Họ tên
       - Email
       - SĐT
       - Avatar
    ================================================== */

    function enterEditMode() {

        if (!CurrentUser) {
            return;
        }


        IsEditMode =
            true;


        /* ----------------------------------------------
           ĐỔ DỮ LIỆU VÀO INPUT
        ---------------------------------------------- */

        if (InputHoTen) {

            InputHoTen.value =
                CurrentUser.hoTen
                ||
                "";
        }


        if (InputEmail) {

            InputEmail.value =
                CurrentUser.email
                ||
                "";
        }


        if (InputSoDienThoai) {

            InputSoDienThoai.value =
                CurrentUser.soDienThoai
                ||
                "";
        }


        /* ----------------------------------------------
           ẨN DISPLAY
        ---------------------------------------------- */

        if (DisplayHoTen) {

            DisplayHoTen.hidden =
                true;
        }


        if (DisplayEmail) {

            DisplayEmail.hidden =
                true;
        }


        if (DisplaySoDienThoai) {

            DisplaySoDienThoai.hidden =
                true;
        }


        /* ----------------------------------------------
           HIỆN INPUT
        ---------------------------------------------- */

        if (InputHoTen) {

            InputHoTen.hidden =
                false;
        }


        if (InputEmail) {

            InputEmail.hidden =
                false;
        }


        if (InputSoDienThoai) {

            InputSoDienThoai.hidden =
                false;
        }


        /* ----------------------------------------------
           HIỆN NÚT HỦY / LƯU
        ---------------------------------------------- */

        if (EditActions) {

            EditActions.hidden =
                false;
        }


        if (EditProfileButton) {

            EditProfileButton.hidden =
                true;
        }


        /* ----------------------------------------------
           AVATAR CÓ THỂ CLICK
        ---------------------------------------------- */

        if (ProfileAvatar) {

            ProfileAvatar.classList.add(
                "avatar-editable"
            );

            ProfileAvatar.title =
                "Bấm để đổi ảnh đại diện";
        }
    }


    /* ==================================================
       CANCEL EDIT

       Hủy cả:
       - Thông tin
       - Avatar chưa lưu
    ================================================== */

    function cancelEdit() {

        IsEditMode =
            false;


        /* ----------------------------------------------
           KHÔI PHỤC DISPLAY
        ---------------------------------------------- */

        if (DisplayHoTen) {

            DisplayHoTen.hidden =
                false;
        }


        if (DisplayEmail) {

            DisplayEmail.hidden =
                false;
        }


        if (DisplaySoDienThoai) {

            DisplaySoDienThoai.hidden =
                false;
        }


        /* ----------------------------------------------
           ẨN INPUT
        ---------------------------------------------- */

        if (InputHoTen) {

            InputHoTen.hidden =
                true;
        }


        if (InputEmail) {

            InputEmail.hidden =
                true;
        }


        if (InputSoDienThoai) {

            InputSoDienThoai.hidden =
                true;
        }


        /* ----------------------------------------------
           ẨN ACTION
        ---------------------------------------------- */

        if (EditActions) {

            EditActions.hidden =
                true;
        }


        if (EditProfileButton) {

            EditProfileButton.hidden =
                false;
        }


        /* ----------------------------------------------
           HOÀN TÁC AVATAR
        ---------------------------------------------- */

        CurrentAvatarFileKey =
            OriginalData.anhDaiDien;


        if (ProfileAvatar) {

            ProfileAvatar.src =
                getAvatarUrl(
                    OriginalData.anhDaiDien
                );


            ProfileAvatar.classList.remove(
                "avatar-editable"
            );


            ProfileAvatar.title =
                "";
        }


        if (AvatarInput) {

            AvatarInput.value =
                "";
        }
    }


    /* ==================================================
       EDIT PROFILE BUTTON
    ================================================== */

    if (EditProfileButton) {

        EditProfileButton.addEventListener(
            "click",
            enterEditMode
        );
    }


    /* ==================================================
       CANCEL PROFILE BUTTON
    ================================================== */

    if (CancelProfileButton) {

        CancelProfileButton.addEventListener(
            "click",
            cancelEdit
        );
    }


    /* ==================================================
       CLICK AVATAR ĐỂ ĐỔI ẢNH

       CHỈ HOẠT ĐỘNG KHI:
       IsEditMode = true
    ================================================== */

    if (ProfileAvatar) {

        ProfileAvatar.addEventListener(
            "click",
            function () {

                if (!IsEditMode) {
                    return;
                }


                if (AvatarInput) {

                    AvatarInput.click();
                }
            }
        );
    }


    /* ==================================================
       CHỌN + UPLOAD AVATAR

       - Upload lên Cloudflare R2
       - Chưa update DB
       - Chỉ lấy fileKey
       - Bấm Lưu mới update DB
    ================================================== */

    if (AvatarInput) {

        AvatarInput.addEventListener(
            "change",
            async function () {

                const File =
                    this.files[0];


                if (!File) {
                    return;
                }


                /* ======================================
                   KIỂM TRA FILE TYPE
                ====================================== */

                const AllowedTypes = [

                    "image/jpeg",

                    "image/png",

                    "image/webp"
                ];


                if (
                    !AllowedTypes.includes(
                        File.type
                    )
                ) {

                    showToast(
                        "Chỉ chấp nhận JPG, PNG hoặc WEBP.",
                        "warning",
                        "Ảnh không hợp lệ"
                    );


                    this.value =
                        "";

                    return;
                }


                /* ======================================
                   KIỂM TRA DUNG LƯỢNG
                ====================================== */

                if (
                    File.size >
                    5 * 1024 * 1024
                ) {

                    showToast(
                        "Ảnh không được vượt quá 5MB.",
                        "warning",
                        "Ảnh quá lớn"
                    );


                    this.value =
                        "";

                    return;
                }


                /* ======================================
                   PREVIEW LOCAL
                ====================================== */

                const PreviewUrl =
                    URL.createObjectURL(
                        File
                    );


                if (ProfileAvatar) {

                    ProfileAvatar.src =
                        PreviewUrl;
                }


                try {

                    /* ==================================
                       UPLOAD CLOUDFARE R2
                    ================================== */

                    const FormDataObject =
                        new FormData();


                    FormDataObject.append(
                        "file",
                        File
                    );


                    const Response =
                        await fetch(
                            "/api/images/upload",
                            {
                                method:
                                    "POST",

                                headers: {

                                    "Authorization":
                                        `Bearer ${Token}`
                                },

                                body:
                                    FormDataObject
                            }
                        );


                    /* ----------------------------------
                       401
                    ---------------------------------- */

                    if (
                        Response.status ===
                        401
                    ) {

                        window.location.href =
                            "/auth/login";

                        return;
                    }


                    /* ----------------------------------
                       ERROR
                    ---------------------------------- */

                    if (!Response.ok) {

                        const ErrorText =
                            await Response.text();


                        let Message =
                            ErrorText
                            ||
                            "Upload ảnh thất bại.";


                        try {

                            const ErrorJson =
                                JSON.parse(
                                    ErrorText
                                );


                            if (
                                ErrorJson.message
                            ) {

                                Message =
                                    ErrorJson.message;
                            }

                        }
                        catch (e) {

                            // Response không phải JSON
                        }


                        throw new Error(
                            Message
                        );
                    }


                    const Data =
                        await Response.json();


                    /* ==================================
                       LẤY FILE KEY
                    ================================== */

                    const FileKey =
                        Data.fileKey
                        ||
                        Data.objectKey
                        ||
                        Data.key;


                    if (!FileKey) {

                        throw new Error(
                            "API upload không trả về fileKey."
                        );
                    }


                    /* ==================================
                       LƯU FILE KEY TẠM THỜI
                    ================================== */

                    CurrentAvatarFileKey =
                        FileKey;


                    /* ==================================
                       HIỂN THỊ ẢNH ĐÃ UPLOAD
                    ================================== */

                    if (ProfileAvatar) {

                        ProfileAvatar.src =
                            getAvatarUrl(
                                FileKey
                            );
                    }


                    showToast(
                        "Ảnh đã được chọn. Hãy bấm Lưu thay đổi để cập nhật.",
                        "success",
                        "Chọn ảnh thành công"
                    );

                }

                catch (Error) {

                    console.error(
                        "Lỗi upload avatar:",
                        Error
                    );


                    CurrentAvatarFileKey =
                        OriginalData.anhDaiDien;


                    if (ProfileAvatar) {

                        ProfileAvatar.src =
                            getAvatarUrl(
                                OriginalData.anhDaiDien
                            );
                    }


                    showToast(
                        Error.message
                        ||
                        "Không thể tải ảnh lên.",
                        "error",
                        "Upload ảnh thất bại"
                    );
                }

                finally {

                    this.value =
                        "";

                    URL.revokeObjectURL(
                        PreviewUrl
                    );
                }
            }
        );
    }


    /* ==================================================
       SAVE PROFILE

       LƯU CÙNG LÚC:
       - Họ tên
       - Email
       - SĐT
       - Avatar
    ================================================== */

    if (SaveProfileButton) {

        SaveProfileButton.addEventListener(
            "click",
            async function () {

                /* ======================================
                   LẤY DỮ LIỆU
                ====================================== */

                const HoTen =
                    InputHoTen.value.trim();


                const Email =
                    InputEmail.value.trim();


                const SoDienThoai =
                    InputSoDienThoai.value.trim();


                /* ======================================
                   VALIDATE HỌ TÊN
                ====================================== */

                if (!HoTen) {

                    showToast(
                        "Vui lòng nhập họ tên.",
                        "warning",
                        "Thông tin chưa hợp lệ"
                    );

                    return;
                }


                /* ======================================
                   VALIDATE EMAIL
                ====================================== */

                const EmailRegex =
                    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


                if (
                    !EmailRegex.test(
                        Email
                    )
                ) {

                    showToast(
                        "Email không đúng định dạng.",
                        "warning",
                        "Thông tin chưa hợp lệ"
                    );

                    return;
                }


                /* ======================================
                   VALIDATE PHONE
                ====================================== */

                const PhoneRegex =
                    /^(0)(3|5|7|8|9)[0-9]{8}$/;


                if (
                    !PhoneRegex.test(
                        SoDienThoai
                    )
                ) {

                    showToast(
                        "Số điện thoại không đúng định dạng.",
                        "warning",
                        "Thông tin chưa hợp lệ"
                    );

                    return;
                }


                /* ======================================
                   CHECK USER
                ====================================== */

                if (
                    !CurrentUser
                    ||
                    !CurrentUser.maNguoiDung
                ) {

                    showToast(
                        "Không xác định được tài khoản.",
                        "error",
                        "Cập nhật thất bại"
                    );

                    return;
                }


                SaveProfileButton.disabled =
                    true;


                SaveProfileButton.innerHTML =
                    "Đang lưu...";


                try {

                    /* ==================================
                       PAYLOAD
                    ================================== */

                    const Payload = {

                        hoTen:
                            HoTen,

                        email:
                            Email,

                        soDienThoai:
                            SoDienThoai,

                        anhDaiDien:
                            CurrentAvatarFileKey
                            ||
                            OriginalData.anhDaiDien
                    };


                    console.log(
                        "UPDATE PROFILE:",
                        Payload
                    );


                    /* ==================================
                       UPDATE DATABASE
                    ================================== */

                    const Response =
                        await fetch(
                            `/api/users/${CurrentUser.maNguoiDung}`,
                            {
                                method:
                                    "PUT",

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


                    const ResponseText =
                        await Response.text();


                    console.log(
                        "UPDATE PROFILE RESPONSE:",
                        Response.status,
                        ResponseText
                    );


                    /* ----------------------------------
                       401
                    ---------------------------------- */

                    if (
                        Response.status ===
                        401
                    ) {

                        window.location.href =
                            "/auth/login";

                        return;
                    }


                    /* ----------------------------------
                       403
                    ---------------------------------- */

                    if (
                        Response.status ===
                        403
                    ) {

                        showToast(
                            "Bạn không có quyền cập nhật hồ sơ.",
                            "error",
                            "Không có quyền"
                        );

                        return;
                    }


                    /* ----------------------------------
                       OTHER ERROR
                    ---------------------------------- */

                    if (!Response.ok) {

                        let Message =
                            ResponseText
                            ||
                            "Không thể cập nhật hồ sơ.";


                        try {

                            const ErrorJson =
                                JSON.parse(
                                    ResponseText
                                );


                            if (
                                ErrorJson.message
                            ) {

                                Message =
                                    ErrorJson.message;
                            }

                        }
                        catch (e) {

                            // Response không phải JSON
                        }


                        throw new Error(
                            Message
                        );
                    }


                    /* ==================================
                       UPDATE LOCAL DATA
                    ================================== */

                    CurrentUser.hoTen =
                        HoTen;


                    CurrentUser.email =
                        Email;


                    CurrentUser.soDienThoai =
                        SoDienThoai;


                    CurrentUser.anhDaiDien =
                        CurrentAvatarFileKey
                        ||
                        OriginalData.anhDaiDien;


                    /* ==================================
                       UPDATE ORIGINAL DATA
                    ================================== */

                    OriginalData = {

                        hoTen:
                            HoTen,

                        email:
                            Email,

                        soDienThoai:
                            SoDienThoai,

                        anhDaiDien:
                            CurrentUser.anhDaiDien
                    };


                    CurrentAvatarFileKey =
                        CurrentUser.anhDaiDien;


                    /* ==================================
                       LOCAL STORAGE
                    ================================== */

                    localStorage.setItem(
                        "HoTen",
                        HoTen
                    );


                    localStorage.setItem(
                        "Email",
                        Email
                    );


                    localStorage.setItem(
                        "AnhDaiDien",
                        CurrentUser.anhDaiDien
                    );


                    /* ==================================
                       SESSION STORAGE
                    ================================== */

                    if (
                        sessionStorage.getItem(
                            "HoTen"
                        )
                    ) {

                        sessionStorage.setItem(
                            "HoTen",
                            HoTen
                        );
                    }


                    if (
                        sessionStorage.getItem(
                            "Email"
                        )
                    ) {

                        sessionStorage.setItem(
                            "Email",
                            Email
                        );
                    }


                    if (
                        sessionStorage.getItem(
                            "AnhDaiDien"
                        )
                    ) {

                        sessionStorage.setItem(
                            "AnhDaiDien",
                            CurrentUser.anhDaiDien
                        );
                    }


                    /* ==================================
                       ĐỒNG BỘ HEADER

                       Header sẽ cập nhật:
                       - Họ tên
                       - Email
                       - Avatar
                    ================================== */

                    window.dispatchEvent(
                        new Event("profileUpdated")
                    );


                    /* ==================================
                       RENDER
                    ================================== */

                    renderProfile(
                        CurrentUser
                    );


                    /* ==================================
                       ĐÓNG EDIT MODE
                    ================================== */

                    cancelEdit();


                    showToast(
                        "Thông tin cá nhân và ảnh đại diện đã được cập nhật.",
                        "success",
                        "Cập nhật thành công"
                    );

                }

                catch (Error) {

                    console.error(
                        "Lỗi cập nhật profile:",
                        Error
                    );


                    showToast(
                        Error.message
                        ||
                        "Không thể cập nhật hồ sơ.",
                        "error",
                        "Cập nhật thất bại"
                    );
                }

                finally {

                    SaveProfileButton.disabled =
                        false;


                    SaveProfileButton.innerHTML =
                        "<span>✓</span> Lưu thay đổi";
                }
            }
        );
    }


    /* ==================================================
       CHANGE PASSWORD DOM
    ================================================== */

    const ChangePasswordButton =
        document.getElementById(
            "changePasswordButton"
        );

    const ChangePasswordSection =
        document.getElementById(
            "changePasswordSection"
        );

    const CancelChangePassword =
        document.getElementById(
            "cancelChangePassword"
        );

    const SaveChangePassword =
        document.getElementById(
            "saveChangePassword"
        );


    /* ==================================================
       PASSWORD INPUT
    ================================================== */

    const CurrentPassword =
        document.getElementById(
            "currentPassword"
        );

    const NewPassword =
        document.getElementById(
            "newPassword"
        );

    const ConfirmPassword =
        document.getElementById(
            "confirmPassword"
        );


    /* ==================================================
       PASSWORD TOGGLE BUTTON
    ================================================== */

    const ToggleCurrentPassword =
        document.getElementById(
            "toggleCurrentPassword"
        );

    const ToggleNewPassword =
        document.getElementById(
            "toggleNewPassword"
        );

    const ToggleConfirmPassword =
        document.getElementById(
            "toggleConfirmPassword"
        );


    /* ==================================================
       PASSWORD ICON
    ================================================== */

    const CurrentPasswordIcon =
        document.getElementById(
            "currentPasswordIcon"
        );

    const NewPasswordIcon =
        document.getElementById(
            "newPasswordIcon"
        );

    const ConfirmPasswordIcon =
        document.getElementById(
            "confirmPasswordIcon"
        );


    /* ==================================================
       ICON MÍ MẮT
       DÙNG KHI MẬT KHẨU ĐANG ẨN
    ================================================== */

    function setClosedEyeIcon(Icon) {

        if (!Icon) {
            return;
        }

        Icon.innerHTML = `
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


    /* ==================================================
       ICON MẮT MỞ
       DÙNG KHI MẬT KHẨU ĐANG HIỂN THỊ
    ================================================== */

    function setOpenEyeIcon(Icon) {

        if (!Icon) {
            return;
        }

        Icon.innerHTML = `
            <!-- VIỀN MẮT -->

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

            <!-- CON NGƯƠI -->

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


    /* ==================================================
       SETUP PASSWORD TOGGLE
    ================================================== */

    function setupPasswordToggle(
        ToggleButton,
        PasswordInput,
        PasswordIcon
    ) {

        if (
            !ToggleButton ||
            !PasswordInput ||
            !PasswordIcon
        ) {
            return;
        }


        ToggleButton.addEventListener(
            "click",
            function () {

                /* ==========================================
                   MẬT KHẨU ĐANG ẨN
                   → HIỆN MẬT KHẨU
                ========================================== */

                if (
                    PasswordInput.type ===
                    "password"
                ) {

                    PasswordInput.type =
                        "text";


                    setOpenEyeIcon(
                        PasswordIcon
                    );


                    ToggleButton.setAttribute(
                        "aria-label",
                        "Ẩn mật khẩu"
                    );

                }


                /* ==========================================
                   MẬT KHẨU ĐANG HIỆN
                   → ẨN MẬT KHẨU
                ========================================== */

                else {

                    PasswordInput.type =
                        "password";


                    setClosedEyeIcon(
                        PasswordIcon
                    );


                    ToggleButton.setAttribute(
                        "aria-label",
                        "Hiện mật khẩu"
                    );
                }
            }
        );


        /* ==========================================
           TRẠNG THÁI BAN ĐẦU

           Mật khẩu:
           → Ẩn

           Icon:
           → Mí mắt
        ========================================== */

        PasswordInput.type =
            "password";


        setClosedEyeIcon(
            PasswordIcon
        );


        ToggleButton.setAttribute(
            "aria-label",
            "Hiện mật khẩu"
        );
    }


    /* ==================================================
       KHỞI TẠO 3 NÚT MẮT
    ================================================== */

    setupPasswordToggle(
        ToggleCurrentPassword,
        CurrentPassword,
        CurrentPasswordIcon
    );

    setupPasswordToggle(
        ToggleNewPassword,
        NewPassword,
        NewPasswordIcon
    );

    setupPasswordToggle(
        ToggleConfirmPassword,
        ConfirmPassword,
        ConfirmPasswordIcon
    );


    /* ==================================================
       MỞ FORM ĐỔI MẬT KHẨU
    ================================================== */

    if (
        ChangePasswordButton &&
        ChangePasswordSection
    ) {

        ChangePasswordButton.addEventListener(
            "click",
            function () {

                /* Hiện form */

                ChangePasswordSection.hidden =
                    false;


                /* Ẩn nút Đổi mật khẩu bên ngoài */

                ChangePasswordButton.hidden =
                    true;


                /* Reset trạng thái password */

                resetPasswordInputState();


                /* Focus vào mật khẩu hiện tại */

                if (CurrentPassword) {

                    CurrentPassword.focus();
                }
            }
        );
    }


    /* ==================================================
       RESET TRẠNG THÁI PASSWORD
    ================================================== */

    function resetPasswordInputState() {

        /* ==========================================
           ĐƯA INPUT VỀ PASSWORD
        ========================================== */

        if (CurrentPassword) {

            CurrentPassword.type =
                "password";
        }


        if (NewPassword) {

            NewPassword.type =
                "password";
        }


        if (ConfirmPassword) {

            ConfirmPassword.type =
                "password";
        }


        /* ==========================================
           ĐƯA ICON VỀ MÍ MẮT
        ========================================== */

        setClosedEyeIcon(
            CurrentPasswordIcon
        );

        setClosedEyeIcon(
            NewPasswordIcon
        );

        setClosedEyeIcon(
            ConfirmPasswordIcon
        );


        /* ==========================================
           RESET ARIA LABEL
        ========================================== */

        if (ToggleCurrentPassword) {

            ToggleCurrentPassword.setAttribute(
                "aria-label",
                "Hiện mật khẩu"
            );
        }


        if (ToggleNewPassword) {

            ToggleNewPassword.setAttribute(
                "aria-label",
                "Hiện mật khẩu"
            );
        }


        if (ToggleConfirmPassword) {

            ToggleConfirmPassword.setAttribute(
                "aria-label",
                "Hiện mật khẩu"
            );
        }
    }


    /* ==================================================
       HỦY ĐỔI MẬT KHẨU
    ================================================== */

    if (CancelChangePassword) {

        CancelChangePassword.addEventListener(
            "click",
            function () {

                /* ======================================
                   ẨN FORM
                ====================================== */

                if (ChangePasswordSection) {

                    ChangePasswordSection.hidden =
                        true;
                }


                /* ======================================
                   HIỆN LẠI NÚT ĐỔI MẬT KHẨU
                ====================================== */

                if (ChangePasswordButton) {

                    ChangePasswordButton.hidden =
                        false;
                }


                /* ======================================
                   XÓA DỮ LIỆU
                ====================================== */

                if (CurrentPassword) {

                    CurrentPassword.value =
                        "";
                }


                if (NewPassword) {

                    NewPassword.value =
                        "";
                }


                if (ConfirmPassword) {

                    ConfirmPassword.value =
                        "";
                }


                /* ======================================
                   RESET PASSWORD

                   → Ẩn mật khẩu
                   → Mí mắt
                ====================================== */

                resetPasswordInputState();


                /* ======================================
                   XÓA LỖI
                ====================================== */

                clearPasswordErrors();


                /* ======================================
                   RESET RULE
                ====================================== */

                resetPasswordRules();
            }
        );
    }


    /* ==================================================
       VALIDATE PASSWORD REALTIME
    ================================================== */

    if (NewPassword) {

        NewPassword.addEventListener(
            "input",
            updatePasswordRules
        );
    }


    /* ==================================================
       UPDATE PASSWORD RULES
    ================================================== */

    function updatePasswordRules() {

        if (!NewPassword) {
            return;
        }


        const Password =
            NewPassword.value;


        /* ==========================================
           ÍT NHẤT 8 KÝ TỰ
        ========================================== */

        updateRule(
            "ruleLength",
            Password.length >= 8
        );


        /* ==========================================
           CHỮ HOA
        ========================================== */

        updateRule(
            "ruleUppercase",
            /[A-Z]/.test(
                Password
            )
        );


        /* ==========================================
           CHỮ THƯỜNG
        ========================================== */

        updateRule(
            "ruleLowercase",
            /[a-z]/.test(
                Password
            )
        );


        /* ==========================================
           CHỮ SỐ
        ========================================== */

        updateRule(
            "ruleNumber",
            /[0-9]/.test(
                Password
            )
        );
    }


    /* ==================================================
       UPDATE RULE
    ================================================== */

    function updateRule(
        RuleId,
        Valid
    ) {

        const Rule =
            document.getElementById(
                RuleId
            );


        if (!Rule) {
            return;
        }


        Rule.classList.toggle(
            "valid",
            Valid
        );


        const Icon =
            Rule.querySelector(
                "span"
            );


        if (Icon) {

            Icon.textContent =
                Valid
                    ? "✓"
                    : "○";
        }
    }


    /* ==================================================
       RESET PASSWORD RULES
    ================================================== */

    function resetPasswordRules() {

        [
            "ruleLength",
            "ruleUppercase",
            "ruleLowercase",
            "ruleNumber"

        ].forEach(
            function (Id) {

                const Rule =
                    document.getElementById(
                        Id
                    );


                if (!Rule) {
                    return;
                }


                Rule.classList.remove(
                    "valid"
                );


                const Icon =
                    Rule.querySelector(
                        "span"
                    );


                if (Icon) {

                    Icon.textContent =
                        "○";
                }
            }
        );
    }


    /* ==================================================
       CLEAR PASSWORD ERROR
    ================================================== */

    function clearPasswordErrors() {

        const CurrentPasswordError =
            document.getElementById(
                "currentPasswordError"
            );

        const NewPasswordError =
            document.getElementById(
                "newPasswordError"
            );

        const ConfirmPasswordError =
            document.getElementById(
                "confirmPasswordError"
            );


        /* ==========================================
           XÓA MESSAGE
        ========================================== */

        if (CurrentPasswordError) {

            CurrentPasswordError.textContent =
                "";
        }


        if (NewPasswordError) {

            NewPasswordError.textContent =
                "";
        }


        if (ConfirmPasswordError) {

            ConfirmPasswordError.textContent =
                "";
        }


        /* ==========================================
           XÓA BORDER ERROR
        ========================================== */

        if (CurrentPassword) {

            CurrentPassword.classList.remove(
                "input-error"
            );
        }


        if (NewPassword) {

            NewPassword.classList.remove(
                "input-error"
            );
        }


        if (ConfirmPassword) {

            ConfirmPassword.classList.remove(
                "input-error"
            );
        }
    }


    /* ==================================================
       HIỂN THỊ LỖI PASSWORD
    ================================================== */

    function showPasswordError(
        Input,
        ErrorId,
        Message
    ) {

        if (Input) {

            Input.classList.add(
                "input-error"
            );


            Input.focus();
        }


        const ErrorElement =
            document.getElementById(
                ErrorId
            );


        if (ErrorElement) {

            ErrorElement.textContent =
                Message;
        }
    }


    /* ==================================================
       LƯU ĐỔI MẬT KHẨU
    ================================================== */

    if (SaveChangePassword) {

        SaveChangePassword.addEventListener(
            "click",
            async function () {

                /* ======================================
                   XÓA LỖI CŨ
                ====================================== */

                clearPasswordErrors();


                /* ======================================
                   LẤY DỮ LIỆU
                ====================================== */

                const MatKhauCu =
                    CurrentPassword.value.trim();


                const MatKhauMoi =
                    NewPassword.value;


                const XacNhanMatKhau =
                    ConfirmPassword.value;


                /* ======================================
                   KIỂM TRA MẬT KHẨU CŨ
                ====================================== */

                if (!MatKhauCu) {

                    showPasswordError(
                        CurrentPassword,
                        "currentPasswordError",
                        "Vui lòng nhập mật khẩu hiện tại."
                    );

                    return;
                }


                /* ======================================
                   KIỂM TRA MẬT KHẨU MỚI
                ====================================== */

                const IsValidPassword =
                    MatKhauMoi.length >= 8
                    &&
                    /[A-Z]/.test(
                        MatKhauMoi
                    )
                    &&
                    /[a-z]/.test(
                        MatKhauMoi
                    )
                    &&
                    /[0-9]/.test(
                        MatKhauMoi
                    );


                if (!IsValidPassword) {

                    showPasswordError(
                        NewPassword,
                        "newPasswordError",
                        "Mật khẩu mới chưa đáp ứng đủ các điều kiện."
                    );

                    return;
                }


                /* ======================================
                   KIỂM TRA XÁC NHẬN
                ====================================== */

                if (
                    MatKhauMoi !==
                    XacNhanMatKhau
                ) {

                    showPasswordError(
                        ConfirmPassword,
                        "confirmPasswordError",
                        "Mật khẩu xác nhận không khớp."
                    );

                    return;
                }


                /* ======================================
                   KIỂM TRA USER
                ====================================== */

                if (
                    !CurrentUser
                    ||
                    !CurrentUser.maNguoiDung
                ) {

                    showToast(
                        "Không xác định được tài khoản.",
                        "error",
                        "Đổi mật khẩu thất bại"
                    );

                    return;
                }


                /* ======================================
                   LẤY TOKEN
                ====================================== */

                const CurrentToken =
                    getToken();


                if (!CurrentToken) {

                    window.location.href =
                        "/auth/login";

                    return;
                }


                try {

                    /* ==================================
                       DISABLE BUTTON
                    ================================== */

                    SaveChangePassword.disabled =
                        true;


                    SaveChangePassword.innerHTML =
                        "Đang cập nhật...";


                    /* ==================================
                       GỌI API BACKEND
                    ================================== */

                    const Response =
                        await fetch(
                            `/api/users/${CurrentUser.maNguoiDung}/change-password`,
                            {
                                method:
                                    "PUT",

                                headers: {

                                    "Authorization":
                                        `Bearer ${CurrentToken}`,

                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify({

                                        matKhauCu:
                                            MatKhauCu,

                                        matKhauMoi:
                                            MatKhauMoi
                                    })
                            }
                        );


                    const ResponseText =
                        await Response.text();


                    console.log(
                        "CHANGE PASSWORD:",
                        Response.status,
                        ResponseText
                    );


                    /* ==================================
                       401
                    ================================== */

                    if (
                        Response.status ===
                        401
                    ) {

                        window.location.href =
                            "/auth/login";

                        return;
                    }


                    /* ==================================
                       403
                    ================================== */

                    if (
                        Response.status ===
                        403
                    ) {

                        showToast(
                            "Bạn không có quyền đổi mật khẩu.",
                            "error",
                            "Không có quyền"
                        );

                        return;
                    }


                    /* ==================================
                       OTHER ERROR
                    ================================== */

                    if (!Response.ok) {

                        let Message =
                            ResponseText
                            ||
                            "Đổi mật khẩu thất bại.";


                        try {

                            const ErrorJson =
                                JSON.parse(
                                    ResponseText
                                );


                            if (
                                ErrorJson.message
                            ) {

                                Message =
                                    ErrorJson.message;
                            }

                        }
                        catch (e) {

                            // Response không phải JSON
                        }


                        showPasswordError(
                            CurrentPassword,
                            "currentPasswordError",
                            Message
                        );


                        return;
                    }


                    /* ==================================
                       THÀNH CÔNG
                    ================================== */

                    showToast(
                        "Đổi mật khẩu thành công.",
                        "success",
                        "Thành công"
                    );


                    /* ==================================
                       XÓA PASSWORD
                    ================================== */

                    CurrentPassword.value =
                        "";

                    NewPassword.value =
                        "";

                    ConfirmPassword.value =
                        "";


                    /* ==================================
                       RESET MẮT

                       → Password bị ẩn
                       → Mí mắt
                    ================================== */

                    resetPasswordInputState();


                    /* ==================================
                       RESET RULE
                    ================================== */

                    resetPasswordRules();


                    /* ==================================
                       ĐÓNG FORM
                    ================================== */

                    ChangePasswordSection.hidden =
                        true;


                    /* ==================================
                       HIỆN LẠI BUTTON
                    ================================== */

                    ChangePasswordButton.hidden =
                        false;

                }

                catch (Error) {

                    console.error(
                        "Lỗi đổi mật khẩu:",
                        Error
                    );


                    showToast(
                        "Không thể kết nối đến máy chủ.",
                        "error",
                        "Đổi mật khẩu thất bại"
                    );
                }

                finally {

                    SaveChangePassword.disabled =
                        false;


                    SaveChangePassword.innerHTML =
                        "<span>✓</span> Đổi mật khẩu";
                }
            }
        );
    }


    /* ==================================================
       LOAD PROFILE
    ================================================== */

    loadProfile();

});