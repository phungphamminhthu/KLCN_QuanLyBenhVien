(() => {
    "use strict";

    const API = "/api/tiepnhan/lich-su-kham";
    const TIME_ZONE = "Asia/Ho_Chi_Minh";

    const $ = id => document.getElementById(id);

    let page = 1;
    let totalPages = 1;
    let loading = false;
    let loaded = false;
    let selectedDate = "";

    const STATUS_CONFIG = {
        ChoGoi: {
            label: "Chờ gọi",
            color: "#6d28d9",
            background: "#f3e8ff"
        },
        DaGoi: {
            label: "Đã gọi",
            color: "#7c3aed",
            background: "#ede9fe"
        },
        DaTiepNhan: {
            label: "Đã tiếp nhận",
            color: "#0369a1",
            background: "#e0f2fe"
        },
        ChoKham: {
            label: "Chờ khám",
            color: "#1d4ed8",
            background: "#dbeafe"
        },
        DangKham: {
            label: "Đang khám",
            color: "#15803d",
            background: "#dcfce7"
        },
        ChoThanhToan: {
            label: "Chờ thanh toán",
            color: "#92400e",
            background: "#fef3c7"
        },
        ChoCLS: {
            label: "Chờ CLS",
            color: "#0e7490",
            background: "#cffafe"
        },
        DangCLS: {
            label: "Đang CLS",
            color: "#0f766e",
            background: "#ccfbf1"
        },
        ChoLayThuoc: {
            label: "Chờ lấy thuốc",
            color: "#4338ca",
            background: "#e0e7ff"
        },
        DangLayThuoc: {
            label: "Đang lấy thuốc",
            color: "#6d28d9",
            background: "#ede9fe"
        },
        HoanTat: {
            label: "Hoàn tất",
            color: "#15803d",
            background: "#dcfce7"
        },
        DaHuy: {
            label: "Đã hủy",
            color: "#b91c1c",
            background: "#fee2e2"
        },
        KhongDen: {
            label: "Không đến",
            color: "#475569",
            background: "#e2e8f0"
        }
    };

    // =====================================================
    // HÀM HỖ TRỢ
    // =====================================================

    function getToken() {
        return (
            sessionStorage.getItem("Token")
            || localStorage.getItem("Token")
            || sessionStorage.getItem("token")
            || localStorage.getItem("token")
            || ""
        ).trim();
    }

    function text(value, fallback = "—") {
        if (value == null) return fallback;

        const result = String(value).trim();

        return result || fallback;
    }

    function positiveId(value) {
        const raw = String(value ?? "");
        const number = Number(raw);

        return /^\d+$/.test(raw)
            && Number.isSafeInteger(number)
            && number > 0
                ? number
                : null;
    }

    function formatDate(value) {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(
            String(value || "")
        );

        return match
            ? `${match[3]}/${match[2]}/${match[1]}`
            : "—";
    }

    function createStatusBadge(value) {
        const raw = text(value, "");

        const config = Object.prototype.hasOwnProperty.call(
            STATUS_CONFIG,
            raw
        )
            ? STATUS_CONFIG[raw]
            : Object.values(STATUS_CONFIG).find(
                item => item.label === raw
            );

        const badge = document.createElement("span");

        badge.className = "history-status";
        badge.textContent =
            config?.label || raw || "Chưa xác định";

        badge.style.color =
            config?.color || "#475569";

        badge.style.backgroundColor =
            config?.background || "#f1f5f9";

        badge.style.whiteSpace = "nowrap";
        badge.title = badge.textContent;

        return badge;
    }

    function showMessage(message = "") {
        const element = $("history-message");

        element.textContent = message;
        element.hidden = !message;
    }

    // =====================================================
    // NGÀY KHÁM
    // =====================================================

    function todayVietnam() {
        const parts = new Intl.DateTimeFormat("en", {
            timeZone: TIME_ZONE,
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).formatToParts(new Date());

        const get = key =>
            parts.find(part => part.type === key).value;

        return `${get("year")}-${get("month")}-${get("day")}`;
    }

    /*
     * Dùng UTC để cộng/trừ ngày lịch.
     * Không để múi giờ máy tính làm lệch ngày đã chọn.
     */
    function parseDate(value) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return null;
        }

        const date = new Date(`${value}T00:00:00Z`);

        if (!Number.isFinite(date.getTime())) {
            return null;
        }

        const year = date.getUTCFullYear();

        return year >= 1000
            && year <= 9999
            && date.toISOString().slice(0, 10) === value
                ? date
                : null;
    }

    function shiftedDate(value, offset) {
        const date = parseDate(value);

        if (!date) return null;

        date.setUTCDate(
            date.getUTCDate() + offset
        );

        const year = date.getUTCFullYear();

        return year >= 1000 && year <= 9999
            ? date.toISOString().slice(0, 10)
            : null;
    }

    function updateDateControls() {
        $("history-date-label").textContent =
            formatDate(selectedDate);

        $("history-previous-date").disabled =
            loading || !shiftedDate(selectedDate, -1);

        $("history-next-date").disabled =
            loading || !shiftedDate(selectedDate, 1);

        $("history-open-calendar").disabled = loading;
        $("history-filter-date").disabled = loading;
    }

    function changeDate(value) {
        if (loading) return;

        if (!parseDate(value)) {
            $("history-filter-date").value = selectedDate;

            showMessage(
                "Ngày khám cần xem không hợp lệ."
            );

            return;
        }

        selectedDate = value;
        $("history-filter-date").value = value;

        updateDateControls();
        reloadFirstPage();
    }

    function openCalendar() {
        if (loading) return;

        const input = $("history-filter-date");

        try {
            if (typeof input.showPicker === "function") {
                input.showPicker();
                return;
            }
        } catch (error) {
            console.warn(
                "Không mở được lịch bằng showPicker:",
                error
            );
        }

        input.focus({
            preventScroll: true
        });

        input.click();
    }

    // =====================================================
    // NGÀY TRÊN HEADER
    // =====================================================

    function updateHeaderDate() {
        const element = $("header-date-display");

        if (!element) return;

        const now = new Date();

        const weekday = new Intl.DateTimeFormat("vi-VN", {
            weekday: "long",
            timeZone: TIME_ZONE
        }).format(now);

        const date = new Intl.DateTimeFormat("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            timeZone: TIME_ZONE
        }).format(now);

        const capitalizedWeekday =
            weekday.charAt(0).toUpperCase()
            + weekday.slice(1);

        element.textContent =
            `${capitalizedWeekday}, ${date}`;
    }

    // =====================================================
    // PHÂN TRANG VÀ TRẠNG THÁI TẢI
    // =====================================================

    function updatePagination() {
        $("history-page-label").textContent =
            `Trang ${page} / ${totalPages}`;

        $("history-prev-page").disabled =
            loading || !loaded || page <= 1;

        $("history-next-page").disabled =
            loading || !loaded || page >= totalPages;
    }

    function setLoading(value) {
        loading = value;

        $("history-loading").hidden = !value;

        $("history-card").setAttribute(
            "aria-busy",
            String(value)
        );

        [
            "history-search-input",
            "history-search-button",
            "history-doctor-filter",
            "history-status-filter",
            "history-page-size",
            "refresh-history-button"
        ].forEach(id => {
            const element = $(id);

            if (element) {
                element.disabled = value;
            }
        });

        updatePagination();
        updateDateControls();
    }

    // =====================================================
    // DANH SÁCH BÁC SĨ
    // =====================================================

    function fillDoctorFilter(items) {
        const select = $("history-doctor-filter");
        const previousValue = select.value;

        const fragment =
            document.createDocumentFragment();

        fragment.append(
            new Option("Tất cả bác sĩ", "")
        );

        const usedIds = new Set();

        for (const item of items) {
            const doctorId = positiveId(item?.ma);

            if (!doctorId || usedIds.has(doctorId)) {
                continue;
            }

            usedIds.add(doctorId);

            fragment.append(
                new Option(
                    text(item.ten, `Mã ${doctorId}`),
                    String(doctorId)
                )
            );
        }

        select.replaceChildren(fragment);

        if (
            previousValue
            && !usedIds.has(Number(previousValue))
        ) {
            select.append(
                new Option(
                    `Mã ${previousValue} (không còn lịch phù hợp)`,
                    previousValue
                )
            );
        }

        select.value = previousValue;
    }

    // =====================================================
    // TẠO DÒNG BẢNG
    // =====================================================

    function appendText(parent, value, className) {
        const element = document.createElement("div");

        element.className = className;
        element.textContent = text(value);

        parent.append(element);

        return element;
    }

    function addCell(row, value) {
        const cell = document.createElement("td");

        if (value !== undefined) {
            cell.textContent = text(value);
        }

        row.append(cell);

        return cell;
    }

    function renderRows(items) {
        const fragment =
            document.createDocumentFragment();

        for (const item of items) {
            const row = document.createElement("tr");

            const sequence = positiveId(item.soThuTu);
            const appointmentId = positiveId(item.maLichKham);
            const patientId = positiveId(item.maBenhNhan);

            // Số thứ tự thực tế.
            const sequenceCell = addCell(
                row,
                sequence
                    ? String(sequence).padStart(3, "0")
                    : "—"
            );

            sequenceCell.style.whiteSpace = "nowrap";

            // Mã lịch khám.
            const codeCell = addCell(row);

            appendText(
                codeCell,
                appointmentId ? `LK-${appointmentId}` : "—",
                "history-code"
            );

            // Bệnh nhân.
            const patientCell = addCell(row);

            appendText(
                patientCell,
                item.tenBenhNhan,
                "history-primary-text"
            );

            appendText(
                patientCell,
                patientId ? `BN-${patientId}` : "—",
                "history-secondary-text"
            );

            const patientInfo = [
                item.ngaySinh
                    ? formatDate(item.ngaySinh)
                    : "",

                text(item.gioiTinh, ""),
                text(item.soDienThoai, "")
            ].filter(Boolean);

            if (patientInfo.length) {
                appendText(
                    patientCell,
                    patientInfo.join(" • "),
                    "history-secondary-text"
                );
            }

            // Ngày và giờ khám.
            const dateCell = addCell(row);

            appendText(
                dateCell,
                formatDate(item.ngayKham),
                "history-primary-text"
            );

            appendText(
                dateCell,
                item.gioKham,
                "history-secondary-text"
            );

            // Khoa và bác sĩ.
            const doctorCell = addCell(row);

            appendText(
                doctorCell,
                item.tenKhoa,
                "history-primary-text"
            );

            appendText(
                doctorCell,
                item.tenBacSi,
                "history-secondary-text"
            );

            addCell(row, item.tenPhong);

            // Dùng trạng thái lịch khám, không dùng trạng thái bệnh án.
            const statusCell = addCell(row);

            statusCell.append(
                createStatusBadge(
                    item.trangThaiLichKham
                )
            );

            // Cho xem cả lịch chưa có hồ sơ bệnh án.
            const detailCell = addCell(row);

            if (patientId && appointmentId) {
                const link = document.createElement("a");

                const params = new URLSearchParams({
                    maLichKham: String(appointmentId),
                    from: "appointment-history"
                });

                link.className = "history-detail-button";
                link.textContent = "Chi tiết";

                link.href =
                    `/TiepNhan/ho-so-benh-nhan/${patientId}?${params}`;

                link.setAttribute(
                    "aria-label",
                    `Xem chi tiết lịch LK-${appointmentId} của ${
                        text(item.tenBenhNhan, "bệnh nhân")
                    }`
                );

                detailCell.append(link);
            }

            fragment.append(row);
        }

        $("history-table-body").replaceChildren(fragment);

        const scrollArea = document.querySelector(
            ".history-table-scroll"
        );

        if (scrollArea) {
            scrollArea.scrollTop = 0;
        }
    }

    // =====================================================
    // THAM SỐ GỬI LÊN API
    // =====================================================

    function buildParams() {
        const dateInput = $("history-filter-date");

        if (
            !parseDate(selectedDate)
            || dateInput.value !== selectedDate
            || !dateInput.checkValidity()
        ) {
            throw new Error(
                "Ngày lọc không hợp lệ."
            );
        }

        const size = Number(
            $("history-page-size").value
        );

        if (![10, 20, 50].includes(size)) {
            throw new Error(
                "Số dòng mỗi trang phải là 10, 20 hoặc 50."
            );
        }

        const doctor =
            $("history-doctor-filter").value;

        const state =
            $("history-status-filter").value;

        const keyword =
            $("history-search-input").value.trim();

        if (doctor && !positiveId(doctor)) {
            throw new Error(
                "Mã bác sĩ không hợp lệ."
            );
        }

        if (
            state
            && !Object.prototype.hasOwnProperty.call(
                STATUS_CONFIG,
                state
            )
        ) {
            throw new Error(
                "Trạng thái lọc không hợp lệ."
            );
        }

        if (keyword.length > 255) {
            throw new Error(
                "Từ khóa tìm kiếm không được vượt quá 255 ký tự."
            );
        }

        /*
         * Hai mốc ngày bằng nhau để API lấy đúng một ngày.
         * Không gửi mã khoa từ trình duyệt.
         */
        const params = new URLSearchParams({
            trang: String(page),
            kichThuocTrang: String(size),
            tuNgay: selectedDate,
            denNgay: selectedDate
        });

        if (keyword) {
            params.set("tuKhoa", keyword);
        }

        if (doctor) {
            params.set("maBacSi", doctor);
        }

        if (state) {
            params.set("trangThai", state);
        }

        return params;
    }

    // =====================================================
    // TẢI DANH SÁCH
    // =====================================================

    async function loadHistory() {
        if (loading) return;

        showMessage();
        updateHeaderDate();

        let params;

        try {
            params = buildParams();
        } catch (error) {
            showMessage(error.message);
            return;
        }

        loaded = false;

        $("history-empty").hidden = true;
        $("history-table-body").replaceChildren();

        $("history-record-count").textContent =
            "Đang tải dữ liệu...";

        setLoading(true);

        const controller = new AbortController();

        const timeout = setTimeout(
            () => controller.abort(),
            20000
        );

        try {
            const token = getToken();

            if (!token) {
                throw new Error(
                    "Vui lòng đăng nhập lại để xem lịch sử khám."
                );
            }

            const response = await fetch(
                `${API}?${params}`,
                {
                    method: "GET",
                    cache: "no-store",
                    credentials: "same-origin",
                    signal: controller.signal,

                    headers: {
                        Accept: "application/json",

                        Authorization: /^Bearer\s/i.test(token)
                            ? token
                            : `Bearer ${token}`
                    }
                }
            );

            if (response.status === 401) {
                throw new Error(
                    "Phiên đăng nhập đã hết hạn. "
                    + "Bạn hãy đăng nhập lại."
                );
            }

            if (response.status === 403) {
                throw new Error(
                    "Bạn không có quyền xem lịch sử khám "
                    + "hoặc chưa có ca tiếp nhận đang hiệu lực."
                );
            }

            const contentType =
                response.headers.get("content-type") || "";

            if (!contentType.includes("application/json")) {
                throw new Error(
                    "API không trả về JSON. "
                    + "Hãy kiểm tra đăng nhập và đường dẫn API."
                );
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data?.message
                    || `Không thể tải dữ liệu (HTTP ${response.status}).`
                );
            }

            if (
                !data
                || !Array.isArray(data.danhSach)
            ) {
                throw new Error(
                    "Dữ liệu API không đúng cấu trúc "
                    + "TiepNhanLichSuKhamDTO."
                );
            }

            const responsePage =
                Number(data.trangHienTai);

            const responsePages =
                Number(data.tongSoTrang);

            const total =
                Number(data.tongLichKham);

            const size =
                Number(data.kichThuocTrang);

            if (
                !Number.isSafeInteger(responsePage)
                || responsePage < 1
                || !Number.isSafeInteger(responsePages)
                || responsePages < responsePage
                || !Number.isSafeInteger(total)
                || total < 0
                || ![10, 20, 50].includes(size)
            ) {
                throw new Error(
                    "Thông tin phân trang từ API không hợp lệ."
                );
            }

            const requestedDoctor =
                positiveId(params.get("maBacSi"));

            const requestedStatus =
                params.get("trangThai");

            /*
             * Không tự lọc các dòng của một trang ở trình duyệt.
             * API phải lọc trước khi đếm và phân trang.
             */
            const invalidRow = data.danhSach.some(item =>
                !item
                || !positiveId(item.maLichKham)
                || !positiveId(item.maBenhNhan)
                || item.ngayKham !== selectedDate
                || (
                    requestedDoctor
                    && positiveId(item.maBacSi)
                        !== requestedDoctor
                )
                || (
                    requestedStatus
                    && item.trangThaiLichKham
                        !== requestedStatus
                )
            );

            if (invalidRow) {
                throw new Error(
                    "Danh sách trả về không khớp ngày hoặc bộ lọc. "
                    + "Cần kiểm tra API lịch sử khám."
                );
            }

            page = responsePage;
            totalPages = responsePages;

            fillDoctorFilter(
                Array.isArray(data.danhSachBacSi)
                    ? data.danhSachBacSi
                    : []
            );

            renderRows(data.danhSach);

            $("history-empty").hidden =
                data.danhSach.length > 0;

            $("history-empty-message").textContent =
                "Không có lịch khám phù hợp "
                + "với ngày và bộ lọc đã chọn.";

            if (data.danhSach.length) {
                const start = (page - 1) * size + 1;
                const end = start + data.danhSach.length - 1;

                $("history-record-count").textContent =
                    `Hiển thị ${start}–${end} / ${total} lịch khám`;
            } else {
                $("history-record-count").textContent =
                    "Hiển thị 0 / 0 lịch khám";
            }

            loaded = true;
        } catch (error) {
            console.error(
                "Lỗi tải lịch sử khám:",
                error
            );

            showMessage(
                error.name === "AbortError"
                    ? "Tải dữ liệu quá lâu. "
                        + "Bạn hãy bấm Làm mới dữ liệu."
                    : error.message
                        || "Không thể tải lịch sử khám."
            );

            $("history-table-body").replaceChildren();
            $("history-empty").hidden = true;

            $("history-record-count").textContent =
                "Chưa tải được dữ liệu.";

            totalPages = 1;
            page = 1;
        } finally {
            clearTimeout(timeout);
            setLoading(false);
        }
    }

    function reloadFirstPage() {
        if (loading) return;

        page = 1;

        void loadHistory();
    }

    // =====================================================
    // THÔNG BÁO TRÊN HEADER
    // =====================================================

    function setupNotifications() {
        const wrapper = $("notification-wrapper");
        const button = $("notification-button");
        const panel = $("notification-panel");
        const closeButton = $("notification-close");

        if (!wrapper || !button || !panel) return;

        function closePanel() {
            panel.hidden = true;

            button.setAttribute(
                "aria-expanded",
                "false"
            );
        }

        button.addEventListener("click", () => {
            panel.hidden = !panel.hidden;

            button.setAttribute(
                "aria-expanded",
                String(!panel.hidden)
            );
        });

        closeButton?.addEventListener(
            "click",
            closePanel
        );

        document.addEventListener("click", event => {
            if (!wrapper.contains(event.target)) {
                closePanel();
            }
        });

        document.addEventListener("keydown", event => {
            if (
                event.key === "Escape"
                && !panel.hidden
            ) {
                closePanel();
                button.focus();
            }
        });
    }

    // =====================================================
    // KHỞI TẠO
    // =====================================================

    function init() {
        const requiredIds = [
            "history-message",
            "history-card",
            "history-filter-form",
            "history-search-input",
            "history-search-button",
            "history-doctor-filter",
            "history-status-filter",

            "history-filter-date",
            "history-date-label",
            "history-previous-date",
            "history-next-date",
            "history-open-calendar",

            "history-table-body",
            "history-loading",
            "history-empty",
            "history-empty-message",
            "history-record-count",
            "history-page-size",
            "history-prev-page",
            "history-next-page",
            "history-page-label"
        ];

        const missing = requiredIds.filter(
            id => !$(id)
        );

        if (missing.length) {
            console.error(
                "appointment-history.html thiếu các ID:",
                missing
            );

            return;
        }

        selectedDate = todayVietnam();

        $("history-filter-date").value =
            selectedDate;

        updateDateControls();

        $("history-previous-date").addEventListener(
            "click",
            () => {
                const value = shiftedDate(
                    selectedDate,
                    -1
                );

                if (value) changeDate(value);
            }
        );

        $("history-next-date").addEventListener(
            "click",
            () => {
                const value = shiftedDate(
                    selectedDate,
                    1
                );

                if (value) changeDate(value);
            }
        );

        $("history-open-calendar").addEventListener(
            "click",
            openCalendar
        );

        $("history-filter-date").addEventListener(
            "change",
            event => {
                changeDate(event.target.value);
            }
        );

        $("history-filter-form").addEventListener(
            "submit",
            event => {
                event.preventDefault();
                reloadFirstPage();
            }
        );

        [
            "history-doctor-filter",
            "history-status-filter",
            "history-page-size"
        ].forEach(id => {
            $(id).addEventListener(
                "change",
                reloadFirstPage
            );
        });

        $("history-search-input").addEventListener(
            "search",
            () => {
                if (!$("history-search-input").value.trim()) {
                    reloadFirstPage();
                }
            }
        );

        $("history-prev-page").addEventListener(
            "click",
            () => {
                if (!loading && loaded && page > 1) {
                    page--;
                    void loadHistory();
                }
            }
        );

        $("history-next-page").addEventListener(
            "click",
            () => {
                if (
                    !loading
                    && loaded
                    && page < totalPages
                ) {
                    page++;
                    void loadHistory();
                }
            }
        );

        $("refresh-history-button")?.addEventListener(
            "click",
            () => void loadHistory()
        );

        window.addEventListener(
            "focus",
            updateHeaderDate
        );

        setupNotifications();
        updateHeaderDate();

        void loadHistory();
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            init
        );
    } else {
        init();
    }
})();