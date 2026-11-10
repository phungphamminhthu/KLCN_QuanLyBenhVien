document.addEventListener("DOMContentLoaded", function () {
    "use strict";

    // =========================================
    // 1. ĐỌC / XÓA DỮ LIỆU ĐĂNG NHẬP
    // =========================================

    function getStoredValue(key) {
        return sessionStorage.getItem(key)
            || localStorage.getItem(key)
            || "";
    }

    function clearLoginData() {
        const keys = [
            "Token",
            "MaNguoiDung",
            "TenDangNhap",
            "HoTen",
            "Email",
            "VaiTro",
            "AnhDaiDien",
            "MaBenhNhanDangChon",
            "HoSoBenhNhanDangChon"
        ];

        keys.forEach(key => {
            sessionStorage.removeItem(key);
            localStorage.removeItem(key);
        });
    }

    // =========================================
    // 2. KIỂM TRA ĐĂNG NHẬP
    // =========================================

    const token = getStoredValue("Token");
    const vaiTro = getStoredValue("VaiTro")
        .trim()
        .toUpperCase();

    if (!token || vaiTro !== "BENHNHAN") {
        window.location.replace("/auth/login");
        return;
    }

    // =========================================
    // 3. THÔNG TIN TÀI KHOẢN
    // =========================================

    const patientName = document.getElementById("patientName");
    const hoTenTaiKhoan = getStoredValue("HoTen");

    if (patientName) {
        patientName.textContent = hoTenTaiKhoan || "bệnh nhân";
    }

    // =========================================
    // 4. CÁC THÀNH PHẦN CHỌN HỒ SƠ
    // =========================================

    const profileTrigger =
        document.getElementById("profilePickerTrigger");

    const profilePopover =
        document.getElementById("profilePickerPopover");

    const profileList =
        document.getElementById("profilePickerList");

    const profileAvatar =
        document.getElementById("selectedProfileAvatar");

    const selectedPatientName =
        document.getElementById("selectedPatientName");

    const selectedPatientRelation =
        document.getElementById("selectedPatientRelation");

    const addProfileButton =
        document.getElementById("addPatientProfileButton");

    let danhSachHoSo = [];
    let maHoSoDangChon = null;

    // =========================================
    // 5. HÀM LẤY THÔNG TIN HỒ SƠ
    // =========================================

    function getProfileId(profile) {
        return profile?.MaBenhNhan
            ?? profile?.maBenhNhan
            ?? null;
    }

    function getProfileName(profile) {
        return profile?.HoTen
            ?? profile?.hoTen
            ?? "Chưa có tên";
    }

    function getProfileRelation(profile) {
        return profile?.MoiQuanHe
            ?? profile?.moiQuanHe
            ?? "Chưa xác định";
    }

    function getProfileInitials(profile) {
        const name = getProfileName(profile).trim();

        if (!name || name === "Chưa có tên") {
            return "HS";
        }

        const words = name.split(/\s+/).filter(Boolean);

        if (words.length === 1) {
            return words[0].slice(0, 2).toUpperCase();
        }

        return (
            words[words.length - 2][0]
            + words[words.length - 1][0]
        ).toUpperCase();
    }

    // =========================================
    // 6. LƯU HỒ SƠ ĐANG ĐƯỢC CHỌN
    // =========================================

    function persistSelectedProfile(profile) {
        if (!profile) return;

        const id = getProfileId(profile);

        if (id == null) return;

        const idText = String(id);
        const profileJson = JSON.stringify(profile);

        // Lưu sessionStorage
        sessionStorage.setItem(
            "MaBenhNhanDangChon",
            idText
        );

        sessionStorage.setItem(
            "HoSoBenhNhanDangChon",
            profileJson
        );

        // Lưu localStorage để các trang khác có thể đọc.
        localStorage.setItem(
            "MaBenhNhanDangChon",
            idText
        );

        localStorage.setItem(
            "HoSoBenhNhanDangChon",
            profileJson
        );

        maHoSoDangChon = idText;

        // Cập nhật tên hồ sơ
        if (selectedPatientName) {
            selectedPatientName.textContent =
                getProfileName(profile);
        }

        // Cập nhật quan hệ
        if (selectedPatientRelation) {
            selectedPatientRelation.textContent =
                "Quan hệ: " + getProfileRelation(profile);
        }

        // Cập nhật avatar
        if (profileAvatar) {
            profileAvatar.textContent =
                getProfileInitials(profile);

            profileAvatar.setAttribute(
                "aria-label",
                "Hồ sơ " + getProfileName(profile)
            );
        }

        // Cập nhật lời chào
        if (patientName) {
            patientName.textContent =
                getProfileName(profile)
                || hoTenTaiKhoan
                || "bệnh nhân";
        }

        // Cập nhật accessibility
        if (profileTrigger) {
            profileTrigger.setAttribute(
                "aria-label",
                `Hồ sơ đang sử dụng: ${getProfileName(profile)}. Bấm để chuyển hồ sơ.`
            );
        }
    }

    // =========================================
    // 7. ĐÓNG / MỞ DANH SÁCH HỒ SƠ
    // =========================================

    function openProfilePicker() {
        if (!profilePopover || !profileTrigger) {
            return;
        }

        profilePopover.hidden = false;

        profileTrigger.setAttribute(
            "aria-expanded",
            "true"
        );
    }

    function closeProfilePicker() {
        if (!profilePopover || !profileTrigger) {
            return;
        }

        profilePopover.hidden = true;

        profileTrigger.setAttribute(
            "aria-expanded",
            "false"
        );
    }

    function toggleProfilePicker() {
        if (!profilePopover) return;

        if (profilePopover.hidden) {
            openProfilePicker();
        } else {
            closeProfilePicker();
        }
    }

    // =========================================
    // 8. HIỂN THỊ DANH SÁCH HỒ SƠ
    // =========================================

    function renderProfileList() {
        if (!profileList) return;

        profileList.replaceChildren();

        if (danhSachHoSo.length === 0) {
            const empty = document.createElement("div");

            empty.className = "profile-picker-empty";

            empty.textContent =
                "Tài khoản chưa có hồ sơ bệnh nhân.";

            profileList.appendChild(empty);

            return;
        }

        danhSachHoSo.forEach(profile => {
            const id = String(getProfileId(profile));

            const isSelected =
                id === String(maHoSoDangChon);

            const item = document.createElement("button");

            item.type = "button";

            item.className =
                "profile-option"
                + (isSelected ? " active" : "");

            item.setAttribute("role", "option");

            item.setAttribute(
                "aria-selected",
                String(isSelected)
            );

            // Avatar hồ sơ
            const avatar = document.createElement("span");

            avatar.className = "profile-option-avatar";

            avatar.textContent =
                getProfileInitials(profile);

            // Thông tin hồ sơ
            const info = document.createElement("span");

            info.className = "profile-option-info";

            const name = document.createElement("strong");

            name.textContent =
                getProfileName(profile);

            const relation = document.createElement("small");

            relation.textContent =
                getProfileRelation(profile);

            info.append(name, relation);

            // Dấu tích hồ sơ đang chọn
            const check = document.createElement("span");

            check.className = "profile-option-check";

            check.textContent = isSelected ? "✓" : "";

            item.append(avatar, info, check);

            // Sự kiện chọn hồ sơ
            item.addEventListener("click", function () {
                persistSelectedProfile(profile);

                renderProfileList();

                closeProfilePicker();
            });

            profileList.appendChild(item);
        });
    }

    // =========================================
    // 9. CHỌN HỒ SƠ MẶC ĐỊNH BAN ĐẦU
    // =========================================

    function chooseInitialProfile() {
        if (!danhSachHoSo.length) {
            maHoSoDangChon = null;

            if (selectedPatientName) {
                selectedPatientName.textContent =
                    "Chưa có hồ sơ";
            }

            if (selectedPatientRelation) {
                selectedPatientRelation.textContent =
                    "Vui lòng thêm hồ sơ bệnh nhân";
            }

            if (profileAvatar) {
                profileAvatar.textContent = "＋";
            }

            if (patientName) {
                patientName.textContent =
                    hoTenTaiKhoan || "bệnh nhân";
            }

            sessionStorage.removeItem("MaBenhNhanDangChon");
            localStorage.removeItem("MaBenhNhanDangChon");

            sessionStorage.removeItem("HoSoBenhNhanDangChon");
            localStorage.removeItem("HoSoBenhNhanDangChon");

            renderProfileList();

            return;
        }

        // Ưu tiên hồ sơ đã chọn trước đó
        const previousId =
            getStoredValue("MaBenhNhanDangChon");

        let selected = danhSachHoSo.find(profile => {
            return String(getProfileId(profile))
                === String(previousId);
        });

        // Nếu chưa có thì chọn hồ sơ mặc định
        if (!selected) {
            selected = danhSachHoSo.find(profile => {
                return profile.LaHoSoMacDinh === true
                    || profile.laHoSoMacDinh === true;
            });
        }

        // Nếu không có hồ sơ mặc định thì chọn hồ sơ đầu tiên
        if (!selected) {
            selected = danhSachHoSo[0];
        }

        persistSelectedProfile(selected);

        renderProfileList();
    }

    // =========================================
    // 10. API LẤY DANH SÁCH HỒ SƠ
    // =========================================

    async function taiDanhSachHoSo() {
        if (!profileList) return;

        profileList.innerHTML = `
            <div class="profile-picker-loading">
                Đang tải danh sách hồ sơ...
            </div>
        `;

        if (profileTrigger) {
            profileTrigger.disabled = true;
        }

        try {
            const response = await fetch(
                "/api/benh-nhan/ho-so",
                {
                    method: "GET",
                    credentials: "same-origin",
                    cache: "no-store",
                    headers: {
                        "Authorization": "Bearer " + token,
                        "Accept": "application/json"
                    }
                }
            );

            const result = await response.json()
                .catch(() => null);

            if (
                !response.ok
                || !result
                || result.success !== true
            ) {
                throw new Error(
                    result?.message
                    || `Không thể tải hồ sơ (HTTP ${response.status}).`
                );
            }

            danhSachHoSo = Array.isArray(result.data)
                ? result.data
                : [];

            chooseInitialProfile();

        } catch (error) {
            console.error(
                "Lỗi tải hồ sơ bệnh nhân:",
                error
            );

            profileList.replaceChildren();

            const errorBox = document.createElement("div");

            errorBox.className = "profile-picker-error";

            errorBox.textContent =
                error.message
                || "Không thể tải danh sách hồ sơ.";

            profileList.appendChild(errorBox);

            if (selectedPatientName) {
                selectedPatientName.textContent =
                    "Lỗi tải hồ sơ";
            }

            if (selectedPatientRelation) {
                selectedPatientRelation.textContent =
                    "Vui lòng tải lại trang.";
            }

        } finally {
            if (profileTrigger) {
                profileTrigger.disabled = false;
            }
        }
    }

    // =========================================
    // 11. SỰ KIỆN CHỌN HỒ SƠ
    // =========================================

    if (profileTrigger) {
        profileTrigger.addEventListener(
            "click",
            toggleProfilePicker
        );
    }

    // Click bên ngoài để đóng popup
    document.addEventListener("click", function (event) {
        if (
            profilePopover
            && !profilePopover.hidden
            && !event.target.closest(".profile-picker")
        ) {
            closeProfilePicker();
        }
    });

    // Nhấn ESC để đóng popup
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            closeProfilePicker();
        }
    });

    // =========================================
    // 12. THÊM HỒ SƠ MỚI
    // =========================================

    if (addProfileButton) {
        addProfileButton.addEventListener("click", function () {
            window.location.href =
                "/benh-nhan/ho-so/tao-moi";
        });
    }

    // Tải hồ sơ khi mở trang chủ
    taiDanhSachHoSo();

    // =========================================
    // 13. ĐĂNG XUẤT
    // =========================================

    const logoutButton =
        document.getElementById("logoutButton");

    const logoutModal =
        document.getElementById("logoutModal");

    const cancelLogout =
        document.getElementById("cancelLogout");

    const confirmLogout =
        document.getElementById("confirmLogout");

    if (
        !logoutButton
        || !logoutModal
        || !cancelLogout
        || !confirmLogout
    ) {
        console.error(
            "Thiếu thành phần HTML của hộp thoại đăng xuất."
        );

        return;
    }

    function openLogoutModal() {
        logoutModal.classList.add("show");

        logoutModal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.style.overflow = "hidden";

        cancelLogout.focus();
    }

    function closeLogoutModal() {
        logoutModal.classList.remove("show");

        logoutModal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.style.overflow = "";

        logoutButton.focus();
    }

    logoutButton.addEventListener(
        "click",
        openLogoutModal
    );

    cancelLogout.addEventListener(
        "click",
        closeLogoutModal
    );

    // Click bên ngoài modal
    logoutModal.addEventListener("click", function (event) {
        if (event.target === logoutModal) {
            closeLogoutModal();
        }
    });

    // ESC để đóng modal
    document.addEventListener("keydown", function (event) {
        if (
            event.key === "Escape"
            && logoutModal.classList.contains("show")
        ) {
            closeLogoutModal();
        }
    });

    // Xác nhận đăng xuất
    confirmLogout.addEventListener("click", function () {
        confirmLogout.disabled = true;

        confirmLogout.textContent =
            "Đang đăng xuất...";

        clearLoginData();

        window.location.replace("/auth/login");
    });
});