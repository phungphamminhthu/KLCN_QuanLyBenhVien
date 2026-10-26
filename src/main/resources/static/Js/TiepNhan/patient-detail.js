(() => {
    "use strict";

    const $ = id => document.getElementById(id);
    const page = $("patient-detail-page");
    const form = $("appointment-profile-form");

    if (!page || !form) return;

    const patientId = positiveId(page.dataset.patientId);
    const requestedVisitId = positiveId(page.dataset.appointmentId);

    const allowedSources = [
        "dashboard",
        "checkin",
        "patients",
        "appointment-history"
    ];

    const source = allowedSources.includes(page.dataset.source)
        ? page.dataset.source
        : "checkin";

    const personalFields = {
        hoTen: "profile-name",
        ngaySinh: "profile-birth-date",
        gioiTinh: "profile-gender",
        soDienThoai: "profile-phone",
        email: "profile-email",
        diaChi: "profile-address",
        soDienThoaiKhanCap: "profile-emergency-phone",
        tienSuBenh: "profile-medical-history"
    };

    const vitalFields = {
        canNang: "profile-weight",
        chieuCao: "profile-height",
        huyetApTamThu: "profile-systolic",
        huyetApTamTruong: "profile-diastolic"
    };

    const statusNames = {
        ChoGoi: "Chờ gọi",
        DaGoi: "Đã gọi",
        DaTiepNhan: "Đã tiếp nhận",
        ChoKham: "Chờ khám",
        DangKham: "Đang khám",
        ChoThanhToan: "Chờ thanh toán",
        ChoCLS: "Chờ CLS",
        DangCLS: "Đang CLS",
        ChoLayThuoc: "Chờ lấy thuốc",
        DangLayThuoc: "Đang lấy thuốc",
        HoanTat: "Hoàn tất",
        DaHuy: "Đã hủy",
        KhongDen: "Không đến"
    };

    let patient = null;
    let visits = [];
    let visit = null;
    let currentShift = null;

    let loading = false;
    let saving = false;
    let receiving = false;
    let needsRefresh = false;

    let personalSnapshot = "";
    let vitalSnapshot = "";

    let toastTimer = null;
    let toastHideTimer = null;
    let toastFrame = null;
    let toastDuration = 4500;

    let overlayFrame = null;
    let leaveFrame = null;

    let pendingAction = null;
    let previousFocus = null;
    let allowNavigation = false;

    // =====================================================
    // HÀM HỖ TRỢ
    // =====================================================

    function positiveId(value) {
        const text = String(value ?? "");
        const number = Number(text);

        return /^\d+$/.test(text)
            && Number.isSafeInteger(number)
            && number > 0
            ? number
            : null;
    }

    function nowVietnam() {
        const parts = new Intl.DateTimeFormat("en", {
            timeZone: "Asia/Ho_Chi_Minh",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hourCycle: "h23"
        }).formatToParts(new Date());

        const get = key =>
            parts.find(part => part.type === key).value;

        return `${get("year")}-${get("month")}-${get("day")}`
            + `T${get("hour")}:${get("minute")}:${get("second")}`;
    }

    function todayVietnam() {
        return nowVietnam().slice(0, 10);
    }

    function formatDate(value) {
        const match = /^(\d{4})-(\d{2})-(\d{2})/
            .exec(String(value ?? ""));

        return match
            ? `${match[3]}/${match[2]}/${match[1]}`
            : "";
    }

    function setText(id, value) {
        const node = $(id);

        if (node) {
            node.textContent =
                value == null || value === "" ? "—" : value;
        }
    }

    function createElement(tag, className, text) {
        const node = document.createElement(tag);

        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;

        return node;
    }

    function rawStatus(value) {
        return Object.keys(statusNames).find(
            key => key === value || statusNames[key] === value
        ) || value;
    }

    function statusLabel(value) {
        return statusNames[value] || value || "Chưa xác định";
    }

    function showMessage(value = "", type = "danger") {
        const box = $("appointment-profile-message");

        box.textContent = value;
        box.className = `alert alert-${type}`;
        box.hidden = !value;
    }

    function snapshot(fields) {
        return JSON.stringify(
            Object.values(fields).map(id => $(id).value)
        );
    }

    function personalDirty() {
        return !!patient
            && snapshot(personalFields) !== personalSnapshot;
    }

    function vitalsDirty() {
        return !!visit
            && snapshot(vitalFields) !== vitalSnapshot;
    }

    function hasUnsavedChanges() {
        return personalDirty() || vitalsDirty();
    }

    function shiftActive() {
        if (!currentShift) return false;

        const now = nowVietnam();

        const start = String(
            currentShift.thoiGianBatDau || ""
        ).slice(0, 19);

        const end = String(
            currentShift.thoiGianKetThuc || ""
        ).slice(0, 19);

        return !!start && !!end && start <= now && now < end;
    }

    function canEditVitals() {
        return !!visit
            && !needsRefresh
            && shiftActive()
            && String(visit.ngayKham).slice(0, 10) === todayVietnam()
            && positiveId(visit.maKhoa)
                === positiveId(currentShift.maKhoa)
            && rawStatus(visit.trangThai) === "DaGoi";
    }

    // =====================================================
    // THÔNG BÁO KẾT QUẢ LƯU
    // =====================================================

    function hideSaveToast(immediate = false) {
        clearTimeout(toastTimer);
        clearTimeout(toastHideTimer);

        if (toastFrame !== null) {
            cancelAnimationFrame(toastFrame);
        }

        toastFrame = null;

        const toast = $("patient-detail-save-toast");
        toast.classList.remove("is-visible");

        if (immediate) {
            toast.hidden = true;
        } else {
            toastHideTimer = setTimeout(() => {
                toast.hidden = true;
            }, 250);
        }
    }

    function scheduleToastHide() {
        clearTimeout(toastTimer);

        const toast = $("patient-detail-save-toast");

        if (
            toast.hidden
            || toast.contains(document.activeElement)
        ) {
            return;
        }

        toastTimer = setTimeout(
            () => hideSaveToast(),
            toastDuration
        );
    }

    function showSaveToast(message, type = "danger") {
        hideSaveToast(true);

        const toast = $("patient-detail-save-toast");

        const icons = {
            success: "fa-circle-check",
            danger: "fa-circle-exclamation",
            warning: "fa-triangle-exclamation",
            info: "fa-circle-info"
        };

        const kind = Object.hasOwn(icons, type)
            ? type
            : "info";

        $("patient-detail-save-toast-text").textContent = message;

        $("patient-detail-save-toast-icon").className =
            `fa-solid ${icons[kind]}`;

        toast.className = `patient-detail-toast is-${kind}`;
        toast.hidden = false;

        toastDuration = kind === "success" ? 4500 : 8000;

        updateOverlayPositions();

        void toast.offsetWidth;

        toastFrame = requestAnimationFrame(() => {
            toastFrame = null;

            if (toast.hidden) return;

            toast.classList.add("is-visible");
            scheduleToastHide();
        });
    }

    // =====================================================
    // THÔNG BÁO THAY ĐỔI CHƯA LƯU
    // =====================================================

    function dismissLeaveNotice(restoreFocus = true) {
        if (leaveFrame !== null) {
            cancelAnimationFrame(leaveFrame);
        }

        leaveFrame = null;

        const toast = $("patient-detail-leave-toast");
        toast.classList.remove("is-visible");
        toast.hidden = true;

        pendingAction = null;

        if (restoreFocus && previousFocus?.isConnected) {
            previousFocus.focus({ preventScroll: true });
        }

        previousFocus = null;
    }

    function requestDiscard(
        action,
        message,
        dirty = hasUnsavedChanges()
    ) {
        if (loading || saving) return;

        if (!dirty) {
            dismissLeaveNotice(false);
            action();
            return;
        }

        hideSaveToast(true);

        const toast = $("patient-detail-leave-toast");

        if (toast.hidden) {
            previousFocus = document.activeElement;
        }

        pendingAction = action;
        $("patient-detail-leave-text").textContent = message;
        toast.hidden = false;

        updateOverlayPositions();

        if (leaveFrame !== null) {
            cancelAnimationFrame(leaveFrame);
        }

        void toast.offsetWidth;

        leaveFrame = requestAnimationFrame(() => {
            leaveFrame = null;

            if (toast.hidden) return;

            toast.classList.add("is-visible");
            $("patient-detail-stay").focus({ preventScroll: true });
        });
    }

    function navigateTo(href) {
        const url = new URL(href, window.location.href);

        if (
            url.origin !== window.location.origin
            || !["http:", "https:"].includes(url.protocol)
        ) {
            return;
        }

        allowNavigation = true;

        try {
            window.location.assign(url.href);
        } catch {
            allowNavigation = false;

            showMessage(
                "Không thể chuyển trang. Vui lòng thử lại."
            );
        }
    }

    // =====================================================
    // VỊ TRÍ THÔNG BÁO VÀ NÚT QUAY LẠI
    // =====================================================

    function updateOverlayPositions() {
        const content = $("patient-detail-content");

        if (!content) return;

        const rect = content.getBoundingClientRect();
        const style = getComputedStyle(content);
        const header = page.querySelector("header");

        const headerBottom = header
            ? Math.max(0, header.getBoundingClientRect().bottom)
            : 0;

        const width = document.documentElement.clientWidth;
        const top = Math.max(0, rect.top, headerBottom) + 10;

        const left = Math.min(
            Math.max(
                8,
                rect.left + (parseFloat(style.paddingLeft) || 0)
            ),
            Math.max(8, width - 48)
        );

        const visibleLeft = Math.max(0, rect.left);
        const visibleRight = Math.min(width, rect.right);

        page.style.setProperty(
            "--detail-back-top",
            `${Math.min(top, Math.max(8, window.innerHeight - 48))}px`
        );

        page.style.setProperty("--detail-back-left", `${left}px`);
        page.style.setProperty("--detail-toast-top", `${top}px`);

        page.style.setProperty(
            "--detail-toast-left",
            `${(visibleLeft + visibleRight) / 2}px`
        );

        page.style.setProperty(
            "--detail-toast-max-width",
            `${Math.max(0, visibleRight - visibleLeft - 32)}px`
        );

        const back = $("patient-detail-back");
        const slot = $("patient-detail-back-slot");

        if (!back || !slot) return;

        const shouldFloat = content.scrollTop > 8
            || slot.getBoundingClientRect().top
                < Math.max(rect.top, headerBottom)
                    + (parseFloat(style.paddingTop) || 0) - 8;

        const floating = back.classList.contains("is-floating");

        if (shouldFloat && !floating) {
            const size = back.getBoundingClientRect();

            slot.style.width = `${size.width}px`;
            slot.style.height = `${size.height}px`;
            back.classList.add("is-floating");
        } else if (!shouldFloat && floating) {
            back.classList.remove("is-floating");
            slot.style.removeProperty("width");
            slot.style.removeProperty("height");
        }
    }

    function scheduleOverlayUpdate() {
        if (overlayFrame !== null) return;

        overlayFrame = requestAnimationFrame(() => {
            overlayFrame = null;
            updateOverlayPositions();
        });
    }

    function initPageOverlays() {
        const content = $("patient-detail-content");
        const toast = $("patient-detail-save-toast");

        $("patient-detail-save-toast-close")
            .addEventListener("click", () => hideSaveToast());

        toast.addEventListener("mouseenter", () => {
            clearTimeout(toastTimer);
        });

        toast.addEventListener("mouseleave", scheduleToastHide);

        toast.addEventListener("focusin", () => {
            clearTimeout(toastTimer);
        });

        toast.addEventListener("focusout", event => {
            if (!toast.contains(event.relatedTarget)) {
                scheduleToastHide();
            }
        });

        content.addEventListener(
            "scroll",
            scheduleOverlayUpdate,
            { passive: true }
        );

        window.addEventListener(
            "scroll",
            scheduleOverlayUpdate,
            { passive: true }
        );

        window.addEventListener("resize", scheduleOverlayUpdate);

        window.visualViewport?.addEventListener(
            "resize",
            scheduleOverlayUpdate
        );

        if (typeof ResizeObserver !== "undefined") {
            new ResizeObserver(scheduleOverlayUpdate)
                .observe(content);
        }

        hideSaveToast(true);
        updateOverlayPositions();
    }

    // =====================================================
    // TRẠNG THÁI CÁC Ô NHẬP VÀ NÚT
    // =====================================================

    function updateControls() {
        const busy = loading || saving;
        const editable = !!patient
            && !needsRefresh
            && shiftActive();

        $("appointment-profile-loading").hidden = !loading;
        $("appointment-profile-fields").disabled = busy || !editable;
        $("profile-vitals-fields").disabled = busy || !canEditVitals();

        const save = $("appointment-profile-save");
        save.disabled = busy || !editable;

        save.querySelector("span").textContent =
            saving && !receiving ? "Đang lưu..." : "Lưu hồ sơ";

        const checkin = $("appointment-profile-checkin");
        checkin.disabled = busy || !canEditVitals();

        checkin.querySelector("span").textContent =
            receiving ? "Đang tiếp nhận..." : "Đã tiếp nhận";

        const refresh = $("refresh-patient-detail-button");

        if (refresh) refresh.disabled = busy;

        form.setAttribute("aria-busy", String(busy));

        $("patient-detail-save-status").textContent = busy
            ? receiving
                ? "Đang xác nhận tiếp nhận..."
                : loading
                    ? ""
                    : "Đang lưu thông tin..."
            : needsRefresh
                ? "Cần làm mới hồ sơ để kiểm tra dữ liệu."
                : "";

        for (
            const link of $("profile-visit-list").querySelectorAll("a")
        ) {
            link.setAttribute("aria-disabled", String(busy));
        }
    }

    // =====================================================
    // GỌI API
    // =====================================================

    async function requestApi(url, options = {}) {
        const token = (
            sessionStorage.getItem("Token")
            || localStorage.getItem("Token")
            || sessionStorage.getItem("token")
            || localStorage.getItem("token")
            || ""
        ).trim();

        if (!token) {
            throw new Error(
                "Vui lòng đăng nhập lại để xem hồ sơ."
            );
        }

        const headers = new Headers(options.headers || {});
        headers.set("Accept", "application/json");

        headers.set(
            "Authorization",
            /^Bearer\s/i.test(token) ? token : `Bearer ${token}`
        );

        if (options.body) {
            headers.set("Content-Type", "application/json");
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 20000);

        try {
            const response = await fetch(url, {
                ...options,
                headers,
                signal: controller.signal,
                cache: "no-store"
            });

            const raw = await response.text();
            let result;

            try {
                result = raw ? JSON.parse(raw) : null;
            } catch {
                const error = new Error(
                    "Máy chủ trả về dữ liệu không hợp lệ. "
                    + "Kiểm tra phiên đăng nhập."
                );

                error.status = response.status;
                throw error;
            }

            if (!response.ok) {
                const fallback = response.status === 401
                    ? "Phiên đăng nhập đã hết hạn."
                    : response.status === 403
                        ? "Bạn không có quyền thực hiện thao tác này."
                        : "Không thể thực hiện yêu cầu.";

                const error = new Error(
                    result?.message || result?.detail || fallback
                );

                error.status = response.status;
                throw error;
            }

            if (!result) {
                throw new Error(
                    "Máy chủ chưa trả về dữ liệu."
                );
            }

            return result;
        } catch (error) {
            if (error.name === "AbortError") {
                throw new Error(
                    "Yêu cầu quá thời gian chờ. "
                    + "Hãy làm mới hồ sơ để kiểm tra dữ liệu."
                );
            }

            throw error;
        } finally {
            clearTimeout(timer);
        }
    }

    // =====================================================
    // THÔNG TIN CÁ NHÂN
    // =====================================================

    function fillPersonal() {
        $("profile-patient-id").value = patientId;

        setText("profile-patient-code", `Mã BN: ${patientId}`);
        setText("profile-patient-heading", patient.hoTen);

        for (const [key, id] of Object.entries(personalFields)) {
            $(id).value = key === "ngaySinh"
                ? formatDate(patient[key])
                : patient[key] ?? "";
        }

        $("profile-birth-date-picker").value = patient.ngaySinh
            ? String(patient.ngaySinh).slice(0, 10)
            : "";

        personalSnapshot = snapshot(personalFields);
    }

    // =====================================================
    // LỊCH SỬ KHÁM
    // =====================================================

    function badgeClass(status) {
        const label = statusLabel(status);
        let color = "text-secondary bg-secondary-subtle";

        if (["Đang khám", "Hoàn tất"].includes(label)) {
            color = "text-success bg-success-subtle";
        } else if (["Đã gọi", "Đã tiếp nhận"].includes(label)) {
            color = "text-primary bg-primary-subtle";
        } else if (["Đã hủy", "Không đến"].includes(label)) {
            color = "text-danger bg-danger-subtle";
        } else if (
            ["Chờ thanh toán", "Chờ CLS", "Chờ khám"]
                .includes(label)
        ) {
            color = "text-warning-emphasis bg-warning-subtle";
        }

        return `patient-detail-status ${color}`;
    }

    function renderVisitList() {
        const list = $("profile-visit-list");
        list.replaceChildren();

        $("profile-no-visit").hidden = visits.length > 0;

        for (const item of visits) {
            const id = positiveId(item.maLichKham);

            if (!id) continue;

            const row = createElement(
                "li",
                "patient-detail-visit-item"
            );

            const link = createElement(
                "a",
                "patient-detail-visit-link"
            );

            const url = new URL(
                `/TiepNhan/chi-tiet-lich-kham/${patientId}/${id}`,
                window.location.origin
            );

            url.searchParams.set("from", source);

            link.href = url.pathname + url.search;
            link.dataset.appointmentId = String(id);

            link.setAttribute(
                "aria-label",
                `Xem chi tiết lịch ${id}, ngày ${formatDate(item.ngayKham)}`
            );

            const icon = createElement(
                "span",
                "patient-detail-visit-icon"
            );

            icon.setAttribute("aria-hidden", "true");
            icon.append(
                createElement("i", "fa-regular fa-calendar-check")
            );

            const main = createElement(
                "span",
                "patient-detail-visit-main"
            );

            const time = String(item.gioKham || "").slice(0, 5);
            const date = formatDate(item.ngayKham) || "Chưa có ngày";

            main.append(
                createElement(
                    "span",
                    "patient-detail-visit-date",
                    `${date}${time ? ` · ${time}` : ""}`
                ),
                createElement(
                    "span",
                    "patient-detail-visit-meta",
                    `${item.khoa || "Chưa có khoa"}`
                    + ` · ${item.bacSi || "Chưa có bác sĩ"}`
                ),
                createElement(
                    "span",
                    "patient-detail-visit-meta",
                    `Lịch #${id} · ${item.phong || "Chưa phân phòng"}`
                )
            );

            const trailing = createElement(
                "span",
                "patient-detail-visit-trailing"
            );

            const arrow = createElement(
                "i",
                "fa-solid fa-chevron-right patient-detail-visit-arrow"
            );

            arrow.setAttribute("aria-hidden", "true");

            trailing.append(
                createElement(
                    "span",
                    badgeClass(item.trangThai),
                    statusLabel(item.trangThai)
                ),
                arrow
            );

            link.append(icon, main, trailing);
            row.append(link);
            list.append(row);
        }
    }

    // =====================================================
    // LỊCH KHÁM HÔM NAY TRONG KHOA ĐANG TRỰC
    // =====================================================

    function mapTodayAppointment(row) {
        return {
            maLichKham: positiveId(row.MaLichKham),
            maBenhNhan: positiveId(row.MaBenhNhan),
            maKhoa: positiveId(row.MaKhoa),
            ngayKham: row.NgayKham,
            gioKham: row.GioKham,
            soThuTu: row.SoThuTu,
            khoa: row.ChuyenKhoa,
            bacSi: row.TenBacSi,
            phong: row.TenPhong,
            trangThai: row.TrangThai,
            lyDoKham: row.LyDoKham
        };
    }

    function findTodayAppointment(rows, shift) {
        if (!Array.isArray(rows)) {
            throw new Error(
                "Danh sách lịch khám trả về không hợp lệ."
            );
        }

        const matches = rows
            .map(mapTodayAppointment)
            .filter(item =>
                item.maBenhNhan === patientId
                && String(item.ngayKham).slice(0, 10)
                    === todayVietnam()
                && item.maKhoa === positiveId(shift.maKhoa)
                && !["DaHuy", "KhongDen"]
                    .includes(rawStatus(item.trangThai))
            );

        if (matches.length > 1) {
            throw new Error(
                "Dữ liệu có nhiều lịch khám trong ngày "
                + "cho bệnh nhân này. Hãy kiểm tra database "
                + "trước khi tiếp nhận."
            );
        }

        if (matches[0] && !matches[0].maLichKham) {
            throw new Error("Mã lịch khám không hợp lệ.");
        }

        return matches[0] || null;
    }

    function validateShift(result) {
        if (
            !positiveId(result?.maPhanCong)
            || !positiveId(result?.maNhanVienTiepNhan)
            || !positiveId(result?.maKhoa)
            || !result.thoiGianBatDau
            || !result.thoiGianKetThuc
        ) {
            throw new Error(
                "Dữ liệu ca tiếp nhận không hợp lệ."
            );
        }

        return result;
    }

    function renderVisit() {
        $("profile-appointment-id").value =
            visit?.maLichKham ?? "";

        for (const [key, id] of Object.entries(vitalFields)) {
            $(id).value = visit?.[key] ?? "";
        }

        vitalSnapshot = snapshot(vitalFields);

        const summary = $("profile-current-visit");
        summary.hidden = !visit;

        setText(
            "profile-current-doctor",
            visit?.bacSi || "Chưa có bác sĩ"
        );

        setText(
            "profile-current-room",
            visit?.phong || "Chưa xác định được phòng khám"
        );

        if (visit) {
            const stt = positiveId(visit.soThuTu);

            setText(
                "profile-current-visit-summary",
                [
                    formatDate(visit.ngayKham),
                    String(visit.gioKham || "").slice(0, 5),
                    visit.khoa || currentShift.tenKhoa,
                    `Lịch #${visit.maLichKham}`,
                    stt
                        ? `Số ${String(stt).padStart(3, "0")}`
                        : "Chưa cấp số"
                ].filter(Boolean).join(" · ")
            );

            const badge = $("profile-current-visit-status");
            badge.textContent = statusLabel(visit.trangThai);
            badge.className = badgeClass(visit.trangThai);
        }

        const shift = $("profile-current-shift");

        if (shift) {
            shift.hidden = true;
            shift.textContent = "";
        }

        for (
            const link of $("profile-visit-list").querySelectorAll("a")
        ) {
            if (
                positiveId(link.dataset.appointmentId)
                    === positiveId(visit?.maLichKham)
            ) {
                link.setAttribute("aria-current", "true");
            } else {
                link.removeAttribute("aria-current");
            }
        }

        const state = rawStatus(visit?.trangThai);

        $("profile-vitals-note").textContent = !visit
            ? "Không có lịch khám hôm nay trong khoa đang phụ trách. "
                + "Xem số đo cũ trong chi tiết lịch sử khám."
            : canEditVitals()
                ? "Có thể nhập số đo cho lịch khám đã gọi hôm nay. "
                    + "Nhập đủ bốn số đo trước khi xác nhận tiếp nhận."
                : state === "ChoGoi"
                    ? "Bệnh nhân đang chờ gọi. "
                        + "Hãy gọi bệnh nhân trước khi nhập số đo."
                    : "Số đo của lịch khám này chỉ được xem. "
                        + "Xem số đo các ngày trước trong lịch sử khám.";

        updateControls();
        scheduleOverlayUpdate();
    }

    // =====================================================
    // TẢI HỒ SƠ
    // =====================================================

    async function loadProfile() {
        if (loading || saving) return;

        if (!patientId) {
            showMessage(
                "Mã bệnh nhân không hợp lệ. "
                + "Vui lòng quay lại danh sách."
            );
            updateControls();
            return;
        }

        loading = true;
        showMessage();
        updateControls();

        try {
            const [result, shiftData, rows] = await Promise.all([
                requestApi(
                    `/api/tiepnhan/ho-so-benh-nhan/${patientId}`
                ),
                requestApi("/api/tiepnhan/phan-cong/hien-tai"),
                requestApi("/api/tiepnhan/lich-hen-hom-nay")
            ]);

            if (
                positiveId(result.maBenhNhan) !== patientId
                || !Array.isArray(result.danhSachLanKham)
                || result.danhSachLanKham.some(
                    item => !item || !positiveId(item.maLichKham)
                )
            ) {
                throw new Error(
                    "Dữ liệu hồ sơ trả về không đúng định dạng."
                );
            }

            if (
                requestedVisitId
                && !result.danhSachLanKham.some(
                    item =>
                        positiveId(item.maLichKham) === requestedVisitId
                )
            ) {
                throw new Error(
                    "Lịch khám trên đường dẫn "
                    + "không thuộc hồ sơ bệnh nhân này."
                );
            }

            const nextShift = validateShift(shiftData);
            const nextVisit = findTodayAppointment(rows, nextShift);

            if (nextVisit) {
                const vitals = await requestApi(
                    "/api/tiepnhan/chi-so-truoc-kham/"
                    + nextVisit.maLichKham
                );

                if (
                    positiveId(vitals.maLichKham)
                        !== nextVisit.maLichKham
                ) {
                    throw new Error(
                        "Số đo trả về không đúng lịch khám."
                    );
                }

                for (const key of Object.keys(vitalFields)) {
                    nextVisit[key] = vitals[key] ?? null;
                }
            }

            patient = result;
            currentShift = nextShift;
            visit = nextVisit;
            needsRefresh = false;

            visits = result.danhSachLanKham.map(item =>
                visit
                && positiveId(item.maLichKham) === visit.maLichKham
                    ? { ...item, ...visit }
                    : { ...item }
            ).sort((a, b) =>
                String(b.ngayKham || "").localeCompare(
                    String(a.ngayKham || "")
                )
                || String(b.gioKham || "").localeCompare(
                    String(a.gioKham || "")
                )
                || Number(b.maLichKham) - Number(a.maLichKham)
            );

            if (
                visit
                && !visits.some(
                    item =>
                        positiveId(item.maLichKham) === visit.maLichKham
                )
            ) {
                visits.unshift(visit);
            }

            fillPersonal();
            renderVisitList();
            renderVisit();

            if (!shiftActive()) {
                needsRefresh = true;

                showMessage(
                    "Ca tiếp nhận đã kết thúc. "
                    + "Hãy làm mới để kiểm tra phân công.",
                    "warning"
                );
            }
        } catch (error) {
            needsRefresh = true;
            showMessage(error.message);
        } finally {
            loading = false;
            updateControls();
        }
    }

    // =====================================================
    // KIỂM TRA THÔNG TIN CÁ NHÂN
    // =====================================================

    function readBirthDate() {
        const value = $("profile-birth-date").value.trim();

        if (!value) return null;

        const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);

        if (!match) {
            throw new Error(
                "Ngày sinh phải có dạng dd/mm/yyyy."
            );
        }

        const day = Number(match[1]);
        const month = Number(match[2]);
        const year = Number(match[3]);

        const date = new Date(Date.UTC(year, month - 1, day));

        if (
            year < 1000
            || date.getUTCFullYear() !== year
            || date.getUTCMonth() !== month - 1
            || date.getUTCDate() !== day
        ) {
            throw new Error("Ngày sinh không tồn tại.");
        }

        const iso = `${match[3]}-${match[2]}-${match[1]}`;

        if (iso > todayVietnam()) {
            throw new Error(
                "Ngày sinh không được lớn hơn ngày hiện tại."
            );
        }

        return iso;
    }

    function readPersonal() {
        const payload = {};

        for (const [key, id] of Object.entries(personalFields)) {
            payload[key] = key === "ngaySinh"
                ? readBirthDate()
                : $(id).value.trim() || null;
        }

        if (!payload.hoTen) {
            throw new Error("Vui lòng nhập họ tên bệnh nhân.");
        }

        return payload;
    }

    // =====================================================
    // KIỂM TRA SỐ ĐO
    // =====================================================

    function readVitals() {
        const payload = {
            maLichKham: positiveId(visit?.maLichKham)
        };

        for (const [key, id] of Object.entries(vitalFields)) {
            const input = $(id);
            const value = input.value.trim();

            if (input.validity.badInput) {
                throw new Error("Số đo phải là số hợp lệ.");
            }

            payload[key] = value ? Number(value) : null;

            if (value && !Number.isFinite(payload[key])) {
                throw new Error("Số đo không hợp lệ.");
            }
        }

        for (const key of ["canNang", "chieuCao"]) {
            const value = payload[key];

            if (
                value !== null
                && (
                    value <= 0
                    || value > 999.99
                    || Math.abs(
                        value * 100 - Math.round(value * 100)
                    ) > 0.000001
                )
            ) {
                throw new Error(
                    "Cân nặng và chiều cao phải lớn hơn 0, "
                    + "tối đa 999,99 và có tối đa "
                    + "hai chữ số thập phân."
                );
            }
        }

        for (
            const key of ["huyetApTamThu", "huyetApTamTruong"]
        ) {
            const value = payload[key];

            if (
                value !== null
                && (
                    !Number.isInteger(value)
                    || value < 1
                    || value > 65535
                )
            ) {
                throw new Error(
                    "Huyết áp phải là số nguyên từ 1 đến 65535."
                );
            }
        }

        if (
            (payload.huyetApTamThu === null)
            !== (payload.huyetApTamTruong === null)
        ) {
            throw new Error(
                "Vui lòng nhập đủ huyết áp tâm thu và tâm trương."
            );
        }

        if (
            Object.keys(vitalFields).every(
                key => payload[key] === null
            )
        ) {
            throw new Error(
                "Vui lòng nhập ít nhất một loại số đo."
            );
        }

        if (
            payload.huyetApTamThu !== null
            && payload.huyetApTamThu <= payload.huyetApTamTruong
        ) {
            throw new Error(
                "Huyết áp tâm thu phải lớn hơn huyết áp tâm trương."
            );
        }

        return payload;
    }

    // =====================================================
    // LƯU THÔNG TIN VÀ SỐ ĐO
    // =====================================================

    async function persistPersonal(payload) {
        const result = await requestApi(
            `/api/tiepnhan/ho-so-benh-nhan/${patientId}`,
            {
                method: "PUT",
                body: JSON.stringify(payload)
            }
        );

        if (result.success !== true) {
            throw new Error(
                result.message
                || "Máy chủ chưa xác nhận lưu thông tin bệnh nhân."
            );
        }

        Object.assign(patient, payload);
        personalSnapshot = snapshot(personalFields);
        setText("profile-patient-heading", patient.hoTen);
    }

    async function persistVitals(payload) {
        const result = await requestApi(
            "/api/tiepnhan/chi-so-truoc-kham",
            {
                method: "POST",
                body: JSON.stringify(payload)
            }
        );

        if (result.success !== true) {
            throw new Error(
                result.message
                || "Máy chủ chưa xác nhận lưu số đo."
            );
        }

        Object.assign(visit, payload);
        vitalSnapshot = snapshot(vitalFields);
    }

    // Đọc lại ca và lịch khám trước khi tiếp nhận.
    async function verifyReceptionContext() {
        const [shiftData, rows] = await Promise.all([
            requestApi("/api/tiepnhan/phan-cong/hien-tai"),
            requestApi("/api/tiepnhan/lich-hen-hom-nay")
        ]);

        const nextShift = validateShift(shiftData);
        const latest = findTodayAppointment(rows, nextShift);

        if (
            positiveId(nextShift.maPhanCong)
                !== positiveId(currentShift?.maPhanCong)
            || positiveId(nextShift.maNhanVienTiepNhan)
                !== positiveId(currentShift?.maNhanVienTiepNhan)
            || !latest
            || latest.maLichKham !== positiveId(visit?.maLichKham)
            || rawStatus(latest.trangThai) !== "DaGoi"
        ) {
            needsRefresh = true;

            throw new Error(
                "Ca trực hoặc trạng thái lịch khám đã thay đổi. "
                + "Hãy làm mới hồ sơ trước khi tiếp nhận."
            );
        }

        currentShift = nextShift;

        // Lấy lại phòng và bác sĩ từ dữ liệu API mới nhất.
        visit.phong = latest.phong;
        visit.bacSi = latest.bacSi;
        visit.soThuTu = latest.soThuTu;

        if (!canEditVitals()) {
            needsRefresh = true;

            throw new Error(
                "Lịch khám hiện không cho phép tiếp nhận. "
                + "Hãy làm mới hồ sơ."
            );
        }
    }

    // =====================================================
    // TIẾP NHẬN THÀNH CÔNG VÀ NHẮC PHÒNG KHÁM
    // Không tự đóng hoặc tự chuyển trang.
    // =====================================================

    function showReceptionSuccessNotice() {
        hideSaveToast(true);
        $("patient-detail-reception-success")?.remove();

        const notice = createElement(
            "section",
            "patient-detail-toast is-success"
        );

        notice.id = "patient-detail-reception-success";
        notice.setAttribute("role", "status");
        notice.setAttribute("aria-live", "polite");
        notice.setAttribute("aria-atomic", "true");

        const icon = createElement(
            "span",
            "patient-detail-toast-icon"
        );

        icon.setAttribute("aria-hidden", "true");
        icon.append(
            createElement("i", "fa-solid fa-circle-check")
        );

        const body = createElement(
            "div",
            "patient-detail-toast-body"
        );

        const title = createElement(
            "strong",
            "d-block mb-2",
            "Tiếp nhận thành công"
        );

        const patientLine = createElement(
            "p",
            "patient-detail-toast-text mb-2",
            "Bệnh nhân: "
                + (
                    patient?.hoTen
                    || $("profile-name").value.trim()
                    || "Chưa có tên"
                )
        );

        const queue = positiveId(visit?.soThuTu);

        const queueLine = createElement(
            "p",
            "patient-detail-toast-text mb-2",
            queue
                ? `Số thứ tự: ${String(queue).padStart(3, "0")}`
                : "Số thứ tự: chưa xác định"
        );

        const room = String(visit?.phong || "").trim();

        const roomLine = createElement(
            "p",
            "patient-detail-toast-text mb-3"
        );

        if (room) {
            roomLine.append(
                document.createTextNode(
                    "Vui lòng hướng dẫn bệnh nhân đến "
                ),
                createElement(
                    "strong",
                    "fw-bold text-primary",
                    room
                ),
                document.createTextNode(" để chờ khám.")
            );
        } else {
            roomLine.append(
                createElement(
                    "strong",
                    "fw-bold",
                    "Chưa xác định được phòng khám."
                ),
                document.createTextNode(
                    " Vui lòng kiểm tra phân phòng "
                    + "trước khi hướng dẫn bệnh nhân."
                )
            );
        }

        const actions = createElement(
            "div",
            "patient-detail-toast-actions"
        );

        const backButton = createElement(
            "button",
            "btn btn-success btn-sm",
            "Đã hiểu – Về Dashboard"
        );

        backButton.type = "button";

        backButton.addEventListener("click", () => {
            notice.remove();
            navigateTo("/TiepNhan/dashboard");
        });

        actions.append(backButton);

        body.append(
            title,
            patientLine,
            queueLine,
            roomLine,
            actions
        );

        notice.append(icon, body);
        page.append(notice);

        updateOverlayPositions();

        requestAnimationFrame(() => {
            if (notice.isConnected) {
                notice.classList.add("is-visible");
            }
        });
    }

    // =====================================================
    // LƯU HỒ SƠ / XÁC NHẬN TIẾP NHẬN
    // =====================================================

    async function saveProfile(event, confirmReception = false) {
        event?.preventDefault();

        if (saving || loading || !patient) return;

        dismissLeaveNotice(false);
        showMessage();
        hideSaveToast(true);

        if (needsRefresh || !shiftActive()) {
            showSaveToast(
                "Hãy làm mới hồ sơ để kiểm tra "
                + "ca tiếp nhận trước khi lưu.",
                "warning"
            );
            return;
        }

        if (!form.reportValidity()) return;

        let personalPayload = null;
        let vitalsPayload = null;

        try {
            if (personalDirty()) {
                personalPayload = readPersonal();
            }

            if (confirmReception || vitalsDirty()) {
                if (!canEditVitals()) {
                    throw new Error(
                        "Chỉ nhập số đo và tiếp nhận lịch "
                        + "đã gọi hôm nay trong khoa đang trực."
                    );
                }

                vitalsPayload = readVitals();
            }

            if (
                confirmReception
                && Object.keys(vitalFields).some(
                    key => vitalsPayload[key] === null
                )
            ) {
                throw new Error(
                    "Hãy nhập đủ cân nặng, chiều cao, "
                    + "huyết áp tâm thu và tâm trương "
                    + "trước khi tiếp nhận."
                );
            }

            if (
                !confirmReception
                && !personalPayload
                && !vitalsPayload
            ) {
                showSaveToast("Chưa có thay đổi cần lưu.", "info");
                return;
            }
        } catch (error) {
            showSaveToast(error.message);
            return;
        }

        saving = true;
        receiving = confirmReception;
        updateControls();

        const savedParts = [];
        let confirmationSent = false;

        try {
            if (confirmReception) {
                await verifyReceptionContext();
            }

            if (personalPayload) {
                await persistPersonal(personalPayload);
                savedParts.push("thông tin cá nhân");
            }

            if (vitalsPayload) {
                await persistVitals(vitalsPayload);
                savedParts.push("số đo");
            }

            if (confirmReception) {
                confirmationSent = true;

                // Backend tự lấy nhân viên từ tài khoản đăng nhập.
                const result = await requestApi(
                    "/api/tiepnhan/confirm-reception",
                    {
                        method: "POST",
                        body: JSON.stringify({
                            maLichKham: visit.maLichKham
                        })
                    }
                );

                if (
                    result.success !== true
                    || result.trangThai !== "DaTiepNhan"
                ) {
                    throw new Error(
                        result.message
                        || "Máy chủ chưa xác nhận tiếp nhận thành công."
                    );
                }

                visit.trangThai = "DaTiepNhan";

                renderVisit();
                showReceptionSuccessNotice();
            } else {
                showSaveToast(
                    `Đã lưu ${savedParts.join(" và ")}.`,
                    "success"
                );
            }
        } catch (error) {
            const uncertain = !error.status || error.status >= 500;

            if (
                confirmationSent
                || uncertain
                || [401, 403, 409].includes(error.status)
            ) {
                needsRefresh = true;
            }

            const prefix = savedParts.length
                ? `Đã lưu ${savedParts.join(" và ")}. `
                : "";

            const pending = confirmReception
                ? "Chưa xác nhận được việc tiếp nhận. "
                : "";

            showSaveToast(
                prefix
                + pending
                + error.message
                + (
                    needsRefresh
                        ? " Hãy làm mới để kiểm tra dữ liệu "
                            + "trước khi thử lại."
                        : ""
                )
            );
        } finally {
            saving = false;
            receiving = false;
            updateControls();
        }
    }

    // =====================================================
    // NGÀY SINH DD/MM/YYYY
    // =====================================================

    function initBirthDate() {
        const input = $("profile-birth-date");
        const picker = $("profile-birth-date-picker");

        const digitsOnly = value =>
            String(value).replace(/[^0-9]/g, "");

        function render(digits, position) {
            const value = [
                digits.slice(0, 2),
                digits.slice(2, 4),
                digits.slice(4, 8)
            ].filter(Boolean).join("/");

            input.value = value;

            let cursor = 0;
            let count = 0;

            while (cursor < value.length && count < position) {
                if (/[0-9]/.test(value[cursor])) count++;
                cursor++;
            }

            if (value[cursor] === "/") cursor++;

            input.setSelectionRange(cursor, cursor);
            updateControls();
        }

        function edit(action, inserted = "") {
            const value = input.value;
            const start = input.selectionStart ?? value.length;
            const end = input.selectionEnd ?? start;

            let digits = digitsOnly(value);
            let from = digitsOnly(value.slice(0, start)).length;
            let to = digitsOnly(value.slice(0, end)).length;

            if (action === "insert") {
                const available = Math.max(
                    0,
                    8 - digits.length + to - from
                );

                const added = digitsOnly(inserted)
                    .slice(0, available);

                digits = digits.slice(0, from)
                    + added
                    + digits.slice(to);

                from += added.length;
            } else {
                if (from === to) {
                    if (action === "backward") {
                        if (from === 0) return;
                        from--;
                    } else {
                        if (to >= digits.length) return;
                        to++;
                    }
                }

                digits = digits.slice(0, from) + digits.slice(to);
            }

            render(digits.slice(0, 8), from);
        }

        input.addEventListener("beforeinput", event => {
            if (!event.cancelable || event.isComposing) return;

            if (
                ["insertText", "insertReplacementText"]
                    .includes(event.inputType)
                && event.data !== null
            ) {
                event.preventDefault();
                edit("insert", event.data);
            } else if (event.inputType === "deleteContentBackward") {
                event.preventDefault();
                edit("backward");
            } else if (event.inputType === "deleteContentForward") {
                event.preventDefault();
                edit("forward");
            }
        });

        input.addEventListener("paste", event => {
            if (!event.clipboardData) return;

            event.preventDefault();
            edit("insert", event.clipboardData.getData("text"));
        });

        input.addEventListener("input", event => {
            if (event.isComposing) return;

            const position = digitsOnly(
                input.value.slice(
                    0,
                    input.selectionStart ?? input.value.length
                )
            ).length;

            render(
                digitsOnly(input.value).slice(0, 8),
                position
            );
        });

        picker.max = todayVietnam();

        $("profile-open-birth-calendar")
            .addEventListener("click", () => {
                if (loading || saving || !patient) return;

                try {
                    picker.value = readBirthDate() || "";
                } catch {
                    picker.value = "";
                }

                picker.max = todayVietnam();

                try {
                    if (typeof picker.showPicker === "function") {
                        picker.showPicker();
                    } else {
                        picker.focus();
                        picker.click();
                    }
                } catch {
                    showMessage(
                        "Trình duyệt chưa mở được lịch. "
                        + "Bạn có thể nhập ngày/tháng/năm trực tiếp.",
                        "info"
                    );
                }
            });

        picker.addEventListener("change", () => {
            if (loading || saving) return;

            input.value = formatDate(picker.value);
            updateControls();
        });
    }

    // =====================================================
    // HEADER DÙNG CHUNG
    // =====================================================

    function updateHeaderDate() {
        const now = new Date();
        const timeZone = "Asia/Ho_Chi_Minh";

        const weekday = new Intl.DateTimeFormat("vi-VN", {
            weekday: "long",
            timeZone
        }).format(now);

        const date = new Intl.DateTimeFormat("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            timeZone
        }).format(now);

        const node = $("header-date-display");

        if (node) {
            node.textContent =
                weekday.charAt(0).toUpperCase()
                + weekday.slice(1)
                + `, ${date}`;
        }
    }

    function initHeader() {
        updateHeaderDate();

        window.setInterval(updateHeaderDate, 60000);
        window.addEventListener("focus", updateHeaderDate);

        const wrapper = $("notification-wrapper");
        const button = $("notification-button");
        const panel = $("notification-panel");
        const close = $("notification-close");

        if (!wrapper || !button || !panel || !close) return;

        function toggle(open) {
            panel.hidden = !open;
            button.setAttribute("aria-expanded", String(open));
        }

        button.addEventListener("click", () => {
            toggle(panel.hidden);
        });

        close.addEventListener("click", () => {
            toggle(false);
            button.focus();
        });

        document.addEventListener("click", event => {
            if (!wrapper.contains(event.target)) toggle(false);
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape" && !panel.hidden) {
                toggle(false);
                button.focus();
            }
        });
    }

    // =====================================================
    // SỰ KIỆN
    // =====================================================

    form.addEventListener("submit", event => {
        void saveProfile(event);
    });

    form.addEventListener("input", updateControls);
    form.addEventListener("change", updateControls);

    $("appointment-profile-checkin")
        .addEventListener("click", event => {
            void saveProfile(event, true);
        });

    $("refresh-patient-detail-button")
        ?.addEventListener("click", () => {
            requestDiscard(
                () => void loadProfile(),
                "Hồ sơ có thay đổi chưa lưu. "
                + "Bạn muốn bỏ thay đổi và tải lại dữ liệu?"
            );
        });

    $("patient-detail-stay").addEventListener("click", () => {
        dismissLeaveNotice();
    });

    $("patient-detail-leave-close").addEventListener("click", () => {
        dismissLeaveNotice();
    });

    $("patient-detail-discard").addEventListener("click", () => {
        const action = pendingAction;
        dismissLeaveNotice(false);

        if (!loading && !saving) action?.();
    });

    document.addEventListener("keydown", event => {
        if (
            event.key === "Escape"
            && !$("patient-detail-leave-toast").hidden
        ) {
            event.preventDefault();
            dismissLeaveNotice();
        }
    });

    // Bảo vệ dữ liệu khi chuyển trang.
    // Đăng xuất vẫn do logout.js xử lý.
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

        const link = event.target instanceof Element
            ? event.target.closest("a[href]")
            : null;

        if (
            !link
            || (link.target && link.target.toLowerCase() !== "_self")
            || link.hasAttribute("download")
        ) {
            return;
        }

        if (
            link.id !== "patient-detail-back"
            && !link.closest("#profile-visit-list")
            && !link.closest(".sidebar-menu")
        ) {
            return;
        }

        const href = link.getAttribute("href");

        if (!href || href.startsWith("#")) return;

        const url = new URL(href, window.location.href);

        if (
            url.origin !== window.location.origin
            || !["http:", "https:"].includes(url.protocol)
        ) {
            return;
        }

        event.preventDefault();

        requestDiscard(
            () => navigateTo(url.href),
            "Hồ sơ có thay đổi chưa lưu. "
            + "Bạn muốn bỏ thay đổi để chuyển trang?"
        );
    });

    // Cảnh báo khi đóng tab hoặc tải lại bằng trình duyệt.
    window.addEventListener("beforeunload", event => {
        if (
            !allowNavigation
            && (saving || hasUnsavedChanges())
        ) {
            event.preventDefault();
            event.returnValue = "";
        }
    });

    window.addEventListener("pageshow", () => {
        allowNavigation = false;
        updateHeaderDate();
        scheduleOverlayUpdate();
    });

    // =====================================================
    // KHỞI TẠO
    // =====================================================

    initBirthDate();
    initHeader();
    initPageOverlays();

    window.setInterval(() => {
        if (!loading && !saving) updateControls();
    }, 30000);

    window.addEventListener("focus", updateControls);

    void loadProfile();
})();