(() => {
    "use strict";

    const $ = id => document.getElementById(id);
    const page = $("staff-profile-page");

    if (!page) return;

    const PROFILE_API = "/api/tiepnhan/ho-so-ca-nhan";
    const SHIFT_API = "/api/tiepnhan/phan-cong/hien-tai";

    const form = $("staff-profile-form");

    const fields = {
        hoTen: $("staff-full-name"),
        email: $("staff-email"),
        soDienThoai: $("staff-phone")
    };

    let profile = null;
    let loading = false;
    let saving = false;
    let editing = false;
    let uncertain = false;

    let snapshot = "";
    let toastTimer;

    // =====================================================
    // THÔNG BÁO ĐẨY
    // =====================================================

    function notify(content, type = "info", duration = 6000) {
        clearTimeout(toastTimer);

        const box = $("staff-profile-message");
        box.hidden = true;

        $("staff-profile-message-text").textContent = content;

        const icons = {
            success: "fa-circle-check",
            danger: "fa-circle-xmark",
            warning: "fa-triangle-exclamation",
            info: "fa-circle-info"
        };

        $("staff-profile-message-icon").className =
            `fa-solid ${icons[type] || icons.info}`;

        box.dataset.type = type;

        // Khởi động lại hiệu ứng thông báo.
        void box.offsetWidth;
        box.hidden = false;

        if (duration > 0) {
            toastTimer = setTimeout(() => {
                box.hidden = true;
            }, duration);
        }
    }

    // =====================================================
    // NGÀY TRÊN HEADER VÀ THỜI GIAN CA TRỰC
    // =====================================================

    function updateHeaderDate() {
        const element = $("header-date-display");
        if (!element) return;

        const date = new Intl.DateTimeFormat("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }).format(new Date());

        element.textContent =
            date.charAt(0).toUpperCase() + date.slice(1);
    }

    function formatShiftTime(value) {
        const match =
            /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/
                .exec(String(value || ""));

        return match
            ? `${match[4]}:${match[5]} · ${match[3]}/${match[2]}/${match[1]}`
            : "Chưa có thông tin";
    }

    // =====================================================
    // GỌI API
    // =====================================================

    async function request(url, options = {}) {
        const token = sessionStorage.getItem("Token")
            || localStorage.getItem("Token")
            || sessionStorage.getItem("token")
            || localStorage.getItem("token");

        if (!token) {
            const error = new Error(
                "Vui lòng đăng nhập lại để tiếp tục."
            );

            error.status = 401;
            throw error;
        }

        const controller = new AbortController();

        const timer = setTimeout(() => {
            controller.abort();
        }, 20000);

        try {
            const headers = new Headers({
                Accept: "application/json",
                Authorization: `Bearer ${token}`
            });

            if (options.body) {
                headers.set("Content-Type", "application/json");
            }

            const response = await fetch(url, {
                ...options,
                headers,
                signal: controller.signal,
                cache: "no-store",
                credentials: "same-origin"
            });

            let data = null;

            try {
                data = await response.json();
            } catch {
                // Kiểm tra phản hồi bên dưới.
            }

            if (!response.ok) {
                const fallback = response.status === 401
                    ? "Phiên đăng nhập đã hết hạn."
                    : response.status === 403
                        ? "Bạn không có quyền truy cập thông tin này."
                        : response.status === 404
                            ? "Chưa tìm thấy API hoặc thông tin được yêu cầu."
                            : "Không thể xử lý yêu cầu. Vui lòng thử lại.";

                const error = new Error(
                    data?.message || data?.detail || fallback
                );

                error.status = response.status;
                throw error;
            }

            if (
                !data
                || typeof data !== "object"
                || Array.isArray(data)
                || data.success === false
            ) {
                const error = new Error(
                    data?.message || "Phản hồi máy chủ không hợp lệ."
                );

                error.status = response.status;
                throw error;
            }

            return data;
        } catch (error) {
            if (error.name === "AbortError") {
                throw new Error(
                    "Yêu cầu quá thời gian chờ. Hãy làm mới để kiểm tra."
                );
            }

            throw error;
        } finally {
            clearTimeout(timer);
        }
    }

    // =====================================================
    // TRẠNG THÁI CHỈNH SỬA
    // =====================================================

    function currentValues() {
        return JSON.stringify(
            Object.values(fields).map(input => input.value)
        );
    }

    function dirty() {
        return !!profile && currentValues() !== snapshot;
    }

    function setControls() {
        const busy = loading || saving;

        $("staff-personal-fields").disabled =
            busy || !profile || !editing || uncertain;

        Object.values(fields).forEach(input => {
            input.readOnly = !editing || busy || uncertain;
        });

        $("staff-edit-button").hidden = editing;

        $("staff-edit-button").disabled =
            busy || !profile || uncertain;

        $("staff-edit-actions").hidden = !editing;

        $("staff-cancel-button").disabled =
            busy || uncertain;

        $("staff-save-button").disabled =
            busy || !profile || uncertain || !dirty();

        $("staff-save-button").lastChild.textContent =
            saving ? " Đang lưu…" : " Lưu thay đổi";

        $("refresh-profile-button").disabled = busy;

        page.setAttribute("aria-busy", String(busy));
    }

    // =====================================================
    // KIỂM TRA VÀ HIỂN THỊ HỒ SƠ
    // =====================================================

    function normalizeProfile(data) {
        const id = Number(data.maNguoiDung);

        if (
            !Number.isSafeInteger(id)
            || id <= 0
            || typeof data.hoTen !== "string"
            || !data.hoTen.trim()
            || typeof data.tenDangNhap !== "string"
            || !data.tenDangNhap.trim()
        ) {
            throw new Error(
                "Dữ liệu hồ sơ cá nhân không hợp lệ."
            );
        }

        for (const key of [
            "email",
            "soDienThoai",
            "anhDaiDien"
        ]) {
            if (
                data[key] != null
                && typeof data[key] !== "string"
            ) {
                throw new Error(
                    "Dữ liệu hồ sơ cá nhân không hợp lệ."
                );
            }
        }

        return {
            ...data,
            maNguoiDung: id
        };
    }

    function renderAvatar(source) {
        const image = $("staff-avatar-image");
        const placeholder = $("staff-avatar-placeholder");

        image.hidden = true;
        placeholder.hidden = false;
        image.removeAttribute("src");

        if (!source) return;

        try {
            const url = new URL(
                source,
                window.location.origin
            );

            const sameOriginHttp =
                url.origin === window.location.origin
                && url.protocol === "http:";

            if (
                url.protocol !== "https:"
                && !sameOriginHttp
            ) {
                return;
            }

            image.onload = () => {
                image.hidden = false;
                placeholder.hidden = true;
            };

            image.onerror = () => {
                image.hidden = true;
                placeholder.hidden = false;
            };

            image.src = url.href;
        } catch {
            // Hiển thị biểu tượng đại diện mặc định.
        }
    }

    function renderProfile(data) {
        profile = data;

        Object.entries(fields).forEach(([key, input]) => {
            input.value = data[key] || "";
        });

        $("staff-username").value = data.tenDangNhap;

        $("staff-display-name").textContent = data.hoTen;

        $("staff-summary-id").textContent =
            String(data.maNguoiDung);

        $("staff-work-id").value =
            String(data.maNguoiDung);

        if ($("current-user-name")) {
            $("current-user-name").textContent = data.hoTen;
        }

        renderAvatar(data.anhDaiDien);

        snapshot = currentValues();
    }

    // =====================================================
    // THÔNG TIN PHÂN CÔNG
    // =====================================================

    function renderShift(shift, reason = "") {
        const note = $("staff-assignment-message");

        if (!shift) {
            $("staff-summary-department").textContent =
                "Chưa xác định khoa phụ trách";

            $("staff-department").value = "Chưa xác định";
            $("staff-assignment-id").value = "—";
            $("staff-shift-start").value = "—";
            $("staff-shift-end").value = "—";

            note.textContent =
                reason || "Chưa tải được thông tin ca trực.";

            note.hidden = false;
            return;
        }

        $("staff-summary-department").textContent =
            shift.tenKhoa;

        $("staff-department").value = shift.tenKhoa;

        $("staff-assignment-id").value =
            String(shift.maPhanCong);

        $("staff-shift-start").value =
            formatShiftTime(shift.thoiGianBatDau);

        $("staff-shift-end").value =
            formatShiftTime(shift.thoiGianKetThuc);

        note.hidden = true;
        note.textContent = "";
    }

    // =====================================================
    // TẢI HỒ SƠ VÀ CA TRỰC
    // =====================================================

    async function loadProfile() {
        if (loading || saving) return;

        if (dirty() && !uncertain) {
            notify(
                "Bạn có thay đổi chưa lưu. Hãy lưu hoặc bấm Hủy trước khi làm mới.",
                "warning"
            );

            return;
        }

        loading = true;
        updateHeaderDate();
        setControls();

        try {
            const [personal, shift] = await Promise.allSettled([
                request(PROFILE_API),
                request(SHIFT_API)
            ]);

            let personalData = null;
            let errorMessage = "";

            if (personal.status === "fulfilled") {
                try {
                    personalData =
                        normalizeProfile(personal.value);
                } catch (error) {
                    errorMessage = error.message;
                }
            } else {
                errorMessage = personal.reason.status === 404
                    ? "API hồ sơ cá nhân chưa sẵn sàng. Cần bổ sung API để tải và lưu thông tin."
                    : personal.reason.message;
            }

            if (personalData) {
                if (
                    profile
                    && profile.maNguoiDung
                        !== personalData.maNguoiDung
                ) {
                    throw new Error(
                        "Tài khoản đăng nhập đã thay đổi. Hãy tải lại trang trước khi tiếp tục."
                    );
                }

                renderProfile(personalData);
                editing = false;

                const wasUncertain = uncertain;
                uncertain = false;

                if (wasUncertain) {
                    notify(
                        "Đã tải lại hồ sơ từ hệ thống. Bạn có thể kiểm tra thông tin vừa lưu.",
                        "info"
                    );
                }
            }

            if (shift.status === "fulfilled") {
                const data = shift.value;

                const validAssignment =
                    Number.isSafeInteger(
                        Number(data.maPhanCong)
                    )
                    && Number(data.maPhanCong) > 0;

                const validDepartment =
                    typeof data.tenKhoa === "string"
                    && !!data.tenKhoa.trim();

                const matchingAccount = !personalData
                    || Number(data.maNhanVienTiepNhan)
                        === personalData.maNguoiDung;

                if (
                    !validAssignment
                    || !validDepartment
                    || !matchingAccount
                ) {
                    renderShift(
                        null,
                        "Thông tin phân công không hợp lệ hoặc không thuộc tài khoản hiện tại."
                    );
                } else {
                    renderShift(data);
                }
            } else {
                renderShift(null, shift.reason.message);
            }

            if (errorMessage) {
                notify(errorMessage, "danger", 0);
            }
        } catch (error) {
            notify(error.message, "danger", 0);
        } finally {
            loading = false;
            setControls();
        }
    }

    // =====================================================
    // DỮ LIỆU CẬP NHẬT
    // =====================================================

    function payload() {
        const hoTen = fields.hoTen.value.trim();
        const email = fields.email.value.trim();
        const phone = fields.soDienThoai.value.trim();

        if (!hoTen || hoTen.length > 255) {
            throw new Error(
                "Họ tên phải có từ 1 đến 255 ký tự."
            );
        }

        if (
            email.length > 255
            || (email && !fields.email.checkValidity())
        ) {
            throw new Error("Email không hợp lệ.");
        }

        if (
            phone
            && !/^\+?[0-9]{9,14}$/.test(phone)
        ) {
            throw new Error(
                "Số điện thoại cần có 9–14 chữ số, có thể bắt đầu bằng dấu +."
            );
        }

        // Không gửi mã tài khoản, vai trò hoặc khoa.
        // Backend phải xác định tài khoản từ phiên đăng nhập.
        return {
            hoTen,
            email: email || null,
            soDienThoai: phone || null
        };
    }

    // =====================================================
    // LƯU THÔNG TIN
    // =====================================================

    form.addEventListener("submit", async event => {
        event.preventDefault();

        if (
            !profile
            || !editing
            || loading
            || saving
            || uncertain
        ) {
            return;
        }

        let data;

        try {
            data = payload();

            if (!form.reportValidity()) return;

            const unchanged =
                data.hoTen === profile.hoTen.trim()
                && data.email === (profile.email?.trim() || null)
                && data.soDienThoai
                    === (profile.soDienThoai?.trim() || null);

            if (unchanged) {
                notify("Chưa có thông tin thay đổi cần lưu.");
                return;
            }
        } catch (error) {
            notify(error.message, "warning");
            return;
        }

        saving = true;
        setControls();

        try {
            const response = await request(PROFILE_API, {
                method: "PUT",
                body: JSON.stringify(data)
            });

            const result = normalizeProfile(response);

            if (
                result.maNguoiDung
                !== profile.maNguoiDung
            ) {
                throw new Error(
                    "Phản hồi lưu hồ sơ không đúng tài khoản."
                );
            }

            renderProfile(result);
            editing = false;

            notify(
                "Đã cập nhật hồ sơ cá nhân thành công.",
                "success"
            );
        } catch (error) {
            uncertain =
                !error.status
                || error.status >= 500
                || (
                    error.status >= 200
                    && error.status < 300
                );

            notify(
                uncertain
                    ? "Chưa xác định được kết quả lưu. Hãy bấm Làm mới dữ liệu để kiểm tra trước khi lưu lại."
                    : error.message,
                "danger",
                0
            );
        } finally {
            saving = false;
            setControls();
        }
    });

    // =====================================================
    // CHỈNH SỬA VÀ HỦY
    // =====================================================

    $("staff-edit-button").addEventListener("click", () => {
        if (
            !profile
            || loading
            || saving
            || uncertain
        ) {
            return;
        }

        editing = true;
        setControls();
        fields.hoTen.focus();
    });

    $("staff-cancel-button").addEventListener("click", () => {
        if (
            !profile
            || loading
            || saving
            || uncertain
        ) {
            return;
        }

        renderProfile(profile);
        editing = false;
        setControls();
    });

    Object.values(fields).forEach(input => {
        input.addEventListener("input", setControls);
    });

    $("refresh-profile-button").addEventListener("click", () => {
        void loadProfile();
    });

    $("staff-profile-message-close").addEventListener(
        "click",
        () => {
            clearTimeout(toastTimer);
            $("staff-profile-message").hidden = true;
        }
    );

    // =====================================================
    // NHẮC KHI CÒN THAY ĐỔI CHƯA LƯU
    // =====================================================

    document.addEventListener("click", event => {
        if (
            event.defaultPrevented
            || event.button !== 0
            || event.ctrlKey
            || event.metaKey
            || event.shiftKey
            || event.altKey
        ) {
            return;
        }

        const link = event.target.closest(".sidebar a");

        if (
            !link
            || link.id === "logoutButton"
            || !dirty()
        ) {
            return;
        }

        event.preventDefault();

        notify(
            "Bạn có thay đổi chưa lưu. Hãy lưu hoặc bấm Hủy trước khi chuyển trang.",
            "warning"
        );
    });

    window.addEventListener("beforeunload", event => {
        if (!dirty() && !saving && !uncertain) return;

        event.preventDefault();
        event.returnValue = "";
    });

    window.addEventListener("focus", updateHeaderDate);

    // =====================================================
    // THÔNG BÁO TRÊN HEADER
    // =====================================================

    function initNotifications() {
        const wrapper = $("notification-wrapper");
        const button = $("notification-button");
        const panel = $("notification-panel");
        const close = $("notification-close");

        if (!wrapper || !button || !panel || !close) return;

        function toggle(open) {
            panel.hidden = !open;

            button.setAttribute(
                "aria-expanded",
                String(open)
            );

            button.setAttribute(
                "aria-label",
                open ? "Đóng thông báo" : "Mở thông báo"
            );
        }

        button.addEventListener("click", () => {
            toggle(panel.hidden);
        });

        close.addEventListener("click", () => {
            toggle(false);
            button.focus();
        });

        document.addEventListener("click", event => {
            if (!wrapper.contains(event.target)) {
                toggle(false);
            }
        });

        document.addEventListener("keydown", event => {
            if (
                event.key === "Escape"
                && !panel.hidden
            ) {
                toggle(false);
                button.focus();
            }
        });
    }

    // =====================================================
    // KHỞI TẠO
    // =====================================================

    initNotifications();
    updateHeaderDate();
    setControls();

    void loadProfile();
})();