
/* =========================================================
   HỒ SƠ CÁ NHÂN - NHÂN VIÊN TIẾP NHẬN
   File: Js/TiepNhan/ho-so-ca-nhan.js
   ========================================================= */

(() => {
    "use strict";

    // TODO: Đối chiếu các endpoint này với Controller thực tế.
    const API = {
        profile: "/api/tiep-nhan/ho-so-ca-nhan",
        changePassword: "/api/tiep-nhan/doi-mat-khau",
        avatar: null
    };

    const $ = (id) => document.getElementById(id);

    const form = $("profileForm");
    const editBtn = $("editBtn");
    const cancelBtn = $("cancelBtn");
    const editActions = $("editActions");
    const saveBtn = $("saveBtn");
    const avatar = $("avatar");
    const avatarInput = $("avatarInput");
    const changeAvatarBtn = $("changeAvatarBtn");
    const passwordModalElement = $("passwordModal");
    const passwordForm = $("passwordForm");

    let originalProfile = null;
    let isEditing = false;
    let selectedAvatarFile = null;
    let originalAvatarSrc = avatar?.src || "";
    let passwordModal = null;

    const editableFieldIds = [
        "hoTen",
        "email",
        "soDienThoai"
    ];

    const readOnlyFieldIds = [
        "tenDangNhap",
        "tenKhoa",
        "viTriCongViec"
    ];

    document.addEventListener("DOMContentLoaded", init);

    function init() {
        if (window.bootstrap && passwordModalElement) {
            passwordModal = new bootstrap.Modal(passwordModalElement);
        }

        bindEvents();
        loadProfile();
    }

    // =========================
    // GẮN SỰ KIỆN
    // =========================

    function bindEvents() {
        editBtn?.addEventListener("click", enterEditMode);
        cancelBtn?.addEventListener("click", cancelEdit);
        form?.addEventListener("submit", saveProfile);

        changeAvatarBtn?.addEventListener("click", () => {
            avatarInput?.click();
        });

        avatarInput?.addEventListener("change", previewAvatar);

        $("openPasswordBtn")?.addEventListener(
            "click",
            openPasswordModal
        );

        $("closePasswordBtn")?.addEventListener(
            "click",
            closePasswordModal
        );

        $("cancelPasswordBtn")?.addEventListener(
            "click",
            closePasswordModal
        );

        passwordForm?.addEventListener(
            "submit",
            changePassword
        );

        passwordModalElement?.addEventListener(
            "hidden.bs.modal",
            () => passwordForm?.reset()
        );
    }

    // =========================
    // GỌI API
    // =========================

    async function request(url, options = {}) {
        const headers = {
            ...(options.headers || {})
        };

        if (!(options.body instanceof FormData)) {
            headers["Content-Type"] = "application/json";
        }

        const response = await fetch(url, {
            credentials: "same-origin",
            ...options,
            headers
        });

        const contentType =
            response.headers.get("content-type") || "";

        let result = null;

        if (contentType.includes("application/json")) {
            result = await response.json();
        } else {
            result = await response.text();
        }

        if (!response.ok) {
            const message =
                result && typeof result === "object"
                    ? (
                        result.message ||
                        result.error ||
                        result.detail
                    )
                    : result;

            throw new Error(
                message || `Yêu cầu thất bại (${response.status}).`
            );
        }

        return result;
    }

    // =========================
    // TẢI HỒ SƠ
    // =========================

    async function loadProfile() {
        if (!form) return;

        try {
            const response = await request(API.profile, {
                method: "GET"
            });

            const profile = normalizeProfile(response);

            originalProfile = { ...profile };

            fillProfile(profile);
            setEditing(false);
            clearMessage();

        } catch (error) {
            console.error(
                "Không tải được hồ sơ nhân viên tiếp nhận:",
                error
            );

            showMessage(
                `Không tải được hồ sơ. Hãy kiểm tra API ${API.profile}. ${error.message}`,
                "error"
            );
        }
    }

    /*
     * Chỉnh tên thuộc tính tại đây nếu DTO backend sử dụng
     * tên khác.
     */
    function normalizeProfile(response) {
        const data = response?.data ?? response ?? {};

        const anhDaiDien =
            data.anhDaiDien ??
            data.avatarUrl ??
            data.avatar ??
            null;

        return {
            hoTen: data.hoTen ?? data.hoTenNhanVien ?? data.fullName ?? "",
            tenDangNhap: data.tenDangNhap ?? data.username ?? "",
            email: data.email ?? "",
            soDienThoai: data.soDienThoai ?? data.sdt ?? data.phone ?? "",
            tenKhoa: data.tenKhoa ?? data.tenBoPhan ?? data.departmentName ?? "",
            viTriCongViec: data.viTriCongViec ?? "Nhân viên tiếp nhận",
            avatarUrl: taoUrlAnh(anhDaiDien)
        };
    }

    function taoUrlAnh(duongDanAnh) {
        if (
            duongDanAnh == null ||
            String(duongDanAnh).trim() === ""
        ) {
            return "/Images/default-avatar.jpg";
        }

        const anh = String(duongDanAnh).trim();

        // Nếu backend trả về URL đầy đủ hoặc đường dẫn API ảnh.
        if (/^https?:\/\//i.test(anh) || anh.startsWith("/")) {
            return anh;
        }

        // Nếu CSDL lưu fileKey, ví dụ: images/ten-file.jpg.
        return "/api/images/view?fileKey=" + encodeURIComponent(anh);
    }
    function fillProfile(profile) {
        setValue("hoTen", profile.hoTen);
        setValue("tenDangNhap", profile.tenDangNhap);
        setValue("email", profile.email);
        setValue("soDienThoai", profile.soDienThoai);
        setValue("tenKhoa", profile.tenKhoa);
        setValue("viTriCongViec", profile.viTriCongViec);

        if ($("displayName")) {
            $("displayName").textContent =
                profile.hoTen || "Nhân viên tiếp nhận";
        }

        if ($("displayUsername")) {
            $("displayUsername").textContent =
                profile.tenDangNhap
                    ? `@${profile.tenDangNhap}`
                    : "Tên đăng nhập";
        }

        if ($("displayDepartment")) {
            $("displayDepartment").textContent =
                profile.tenKhoa || "Nhân viên tiếp nhận";
        }

       if (avatar) {
           avatar.onerror = function () {
               this.onerror = null;
               this.src = "/Images/default-avatar.jpg";
           };

           avatar.src = profile.avatarUrl || "/Images/default-avatar.jpg";
           originalAvatarSrc = avatar.src;
       }
    }

    function setValue(id, value) {
        const element = $(id);

        if (element) {
            element.value = value ?? "";
        }
    }

    // =========================
    // CHỈNH SỬA HỒ SƠ
    // =========================

    function enterEditMode() {
        if (!originalProfile) {
            showMessage(
                "Chưa tải được hồ sơ để chỉnh sửa.",
                "error"
            );
            return;
        }

        setEditing(true);
        clearMessage();
    }

    function setEditing(enabled) {
        isEditing = enabled;

        editableFieldIds.forEach((id) => {
            const element = $(id);

            if (element) {
                element.disabled = !enabled;
            }
        });

        // Các trường này chỉ xem, không cho chỉnh sửa.
        readOnlyFieldIds.forEach((id) => {
            const element = $(id);

            if (element) {
                element.disabled = true;
            }
        });

        if (editBtn) {
            editBtn.style.display = enabled ? "none" : "";
        }

        if (editActions) {
            editActions.style.display =
                enabled ? "flex" : "none";
        }

        if (saveBtn) {
            saveBtn.disabled = !enabled;
        }
    }

    function cancelEdit() {
        if (originalProfile) {
            fillProfile(originalProfile);
        }

        selectedAvatarFile = null;

        if (avatarInput) {
            avatarInput.value = "";
        }

        if (avatar && originalAvatarSrc) {
            avatar.src = originalAvatarSrc;
        }

        setEditing(false);
        clearMessage();
    }

    async function saveProfile(event) {
        event.preventDefault();

        if (!isEditing) return;

        const payload = {
            hoTen: $("hoTen")?.value.trim() || "",
            email: $("email")?.value.trim() || "",
            soDienThoai:
                $("soDienThoai")?.value.trim() || ""
        };

        if (!payload.hoTen) {
            showMessage(
                "Vui lòng nhập họ và tên.",
                "error"
            );
            $("hoTen")?.focus();
            return;
        }

        if (
            payload.email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)
        ) {
            showMessage(
                "Địa chỉ email không hợp lệ.",
                "error"
            );
            $("email")?.focus();
            return;
        }

        if (
            payload.soDienThoai &&
            !/^[0-9+\s().-]{8,20}$/.test(
                payload.soDienThoai
            )
        ) {
            showMessage(
                "Số điện thoại không hợp lệ.",
                "error"
            );
            $("soDienThoai")?.focus();
            return;
        }

        setButtonLoading(saveBtn, true, "Đang lưu...");

        try {
            const response = await request(API.profile, {
                method: "PUT",
                body: JSON.stringify(payload)
            });

            const returnedProfile =
                normalizeProfile(response);

            originalProfile = {
                ...originalProfile,
                ...returnedProfile,
                ...payload
            };

            fillProfile(originalProfile);
            setEditing(false);

            showMessage(
                "Cập nhật hồ sơ thành công.",
                "success"
            );

            if (selectedAvatarFile) {
                await uploadAvatar(selectedAvatarFile);
            }

        } catch (error) {
            console.error(
                "Không lưu được hồ sơ:",
                error
            );

            showMessage(
                `Không thể lưu hồ sơ. Hãy kiểm tra API backend. ${error.message}`,
                "error"
            );

        } finally {
            setButtonLoading(
                saveBtn,
                false,
                "Lưu thay đổi"
            );
        }
    }

    // =========================
    // ẢNH ĐẠI DIỆN
    // =========================

    function previewAvatar(event) {
        const file = event.target.files?.[0];

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            showMessage(
                "Vui lòng chọn tệp hình ảnh.",
                "error"
            );

            event.target.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showMessage(
                "Ảnh đại diện không được vượt quá 5 MB.",
                "error"
            );

            event.target.value = "";
            return;
        }

        selectedAvatarFile = file;

        const reader = new FileReader();

        reader.onload = () => {
            if (avatar) {
                avatar.src = reader.result;
            }
        };

        reader.onerror = () => {
            showMessage(
                "Không thể đọc ảnh đã chọn.",
                "error"
            );
        };

        reader.readAsDataURL(file);

        if (API.avatar) {
            showMessage(
                "Đã chọn ảnh. Nhấn Lưu thay đổi để tải ảnh lên.",
                "success"
            );
        } else {
            showMessage(
                "Ảnh mới chỉ đang được xem trước. Cần cấu hình API upload để lưu ảnh lên máy chủ.",
                "error"
            );
        }
    }

    async function uploadAvatar(file) {
        if (!API.avatar) return;

        const formData = new FormData();
        formData.append("file", file);

        try {
            const result = await request(API.avatar, {
                method: "POST",
                body: formData
            });

            const imageUrl =
                result?.avatarUrl ??
                result?.data?.avatarUrl ??
                result?.url ??
                result?.data?.url;

            if (imageUrl && avatar) {
                avatar.src = imageUrl;
                originalAvatarSrc = imageUrl;
            }

            selectedAvatarFile = null;

            if (avatarInput) {
                avatarInput.value = "";
            }

            showMessage(
                "Cập nhật ảnh đại diện thành công.",
                "success"
            );

        } catch (error) {
            console.error(
                "Không tải được ảnh đại diện:",
                error
            );

            showMessage(
                `Không thể lưu ảnh đại diện: ${error.message}`,
                "error"
            );
        }
    }

    // =========================
    // ĐỔI MẬT KHẨU
    // =========================

    function openPasswordModal() {
        if (!passwordModal) {
            showMessage(
                "Không mở được cửa sổ đổi mật khẩu. Hãy kiểm tra Bootstrap JS trong layout.",
                "error"
            );
            return;
        }

        passwordForm?.reset();
        passwordModal.show();
    }

    function closePasswordModal() {
        if (passwordModal) {
            passwordModal.hide();
        }
    }

    async function changePassword(event) {
        event.preventDefault();

        const matKhauCu =
            $("matKhauCu")?.value || "";

        const matKhauMoi =
            $("matKhauMoi")?.value || "";

        const xacNhanMatKhau =
            $("xacNhanMatKhau")?.value || "";

        if (
            !matKhauCu ||
            !matKhauMoi ||
            !xacNhanMatKhau
        ) {
            showMessage(
                "Vui lòng nhập đầy đủ thông tin đổi mật khẩu.",
                "error"
            );
            return;
        }

        if (matKhauMoi.length < 8) {
            showMessage(
                "Mật khẩu mới phải có ít nhất 8 ký tự.",
                "error"
            );
            return;
        }

        if (matKhauCu === matKhauMoi) {
            showMessage(
                "Mật khẩu mới phải khác mật khẩu hiện tại.",
                "error"
            );
            return;
        }

        if (matKhauMoi !== xacNhanMatKhau) {
            showMessage(
                "Mật khẩu xác nhận không khớp.",
                "error"
            );
            $("xacNhanMatKhau")?.focus();
            return;
        }

        const submitBtn = $("submitPasswordBtn");

        setButtonLoading(
            submitBtn,
            true,
            "Đang cập nhật..."
        );

        try {
            await request(API.changePassword, {
                method: "PUT",
                body: JSON.stringify({
                    matKhauCu,
                    matKhauMoi,
                    xacNhanMatKhau
                })
            });

            closePasswordModal();
            passwordForm?.reset();

            showMessage(
                "Đổi mật khẩu thành công.",
                "success"
            );

        } catch (error) {
            console.error(
                "Không đổi được mật khẩu:",
                error
            );

            showMessage(
                `Không thể đổi mật khẩu. Hãy kiểm tra API backend. ${error.message}`,
                "error"
            );

        } finally {
            setButtonLoading(
                submitBtn,
                false,
                "Cập nhật mật khẩu"
            );
        }
    }

    // =========================
    // THÔNG BÁO VÀ TRẠNG THÁI NÚT
    // =========================

    function setButtonLoading(button, loading, text) {
        if (!button) return;

        if (loading) {
            button.dataset.originalHtml = button.innerHTML;
            button.disabled = true;
            button.textContent = text;
        } else {
            button.disabled = false;
            button.innerHTML =
                button.dataset.originalHtml || text;

            delete button.dataset.originalHtml;
        }
    }

    function showMessage(message, type = "success") {
        let element = $("profileMessage");

        if (!element) {
            element = document.createElement("div");
            element.id = "profileMessage";
            element.className = "profile-message";

            const container =
                document.querySelector(".profile-container");

            if (container) {
                container.prepend(element);
            } else {
                document.body.prepend(element);
            }
        }

        element.textContent = message;
        element.className = `profile-message ${type}`;
        element.setAttribute("role", "status");
    }

    function clearMessage() {
        $("profileMessage")?.remove();
    }
})();
