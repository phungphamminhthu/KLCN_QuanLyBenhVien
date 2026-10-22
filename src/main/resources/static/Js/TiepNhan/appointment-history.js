(() => {
    "use strict";

    const API = "/api/tiepnhan/lich-su-kham";
    const $ = id => document.getElementById(id);

    let page = 1;
    let totalPages = 1;
    let loading = false;
    let loaded = false;

    function getToken() {
        return sessionStorage.getItem("Token")
            || localStorage.getItem("Token")
            || sessionStorage.getItem("token")
            || localStorage.getItem("token")
            || "";
    }

    function text(value, fallback = "—") {
        if (value === null || value === undefined) {
            return fallback;
        }

        const result = String(value).trim();
        return result || fallback;
    }

    function positiveId(value) {
        const number = Number(value);

        return Number.isSafeInteger(number) && number > 0
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

    function updateHeaderDate() {
        const element = $("header-date-display");

        if (!element) {
            return;
        }

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

        const capitalizedWeekday =
            weekday.charAt(0).toUpperCase() + weekday.slice(1);

        element.textContent = `${capitalizedWeekday}, ${date}`;
    }

    function showMessage(message = "") {
        const element = $("history-message");
        element.textContent = message;
        element.hidden = !message;
    }

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
            "history-department-filter",
            "history-from-date",
            "history-to-date",
            "history-page-size",
            "refresh-history-button"
        ].forEach(id => {
            const element = $(id);

            if (element) {
                element.disabled = value;
            }
        });

        updatePagination();
    }

    function fillFilter(id, items, defaultLabel) {
        const select = $(id);
        const previousValue = select.value;
        const fragment = document.createDocumentFragment();

        fragment.append(new Option(defaultLabel, ""));

        const usedIds = new Set();

        for (const item of items) {
            const ma = positiveId(item.ma);

            if (!ma || usedIds.has(ma)) {
                continue;
            }

            usedIds.add(ma);

            fragment.append(
                new Option(
                    text(item.ten, `Mã ${ma}`),
                    String(ma)
                )
            );
        }

        select.replaceChildren(fragment);

        if (previousValue && !usedIds.has(Number(previousValue))) {
            select.append(
                new Option(
                    `Mã ${previousValue} (không còn lịch phù hợp)`,
                    previousValue
                )
            );
        }

        select.value = previousValue;
    }

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
        const fragment = document.createDocumentFragment();

        for (const item of items) {
            const row = document.createElement("tr");

            // Số thứ tự thực tế từ bảng sothutu.
            const sequence = positiveId(item.soThuTu);

            addCell(
                row,
                sequence ? `#${String(sequence).padStart(3, "0")}` : "—"
            );

            const appointmentId = positiveId(item.maLichKham);
            const patientId = positiveId(item.maBenhNhan);

            const codeCell = addCell(row);

            appendText(
                codeCell,
                appointmentId ? `LK-${appointmentId}` : "—",
                "history-code"
            );

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
                item.ngaySinh ? formatDate(item.ngaySinh) : "",
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

            const statusCell = addCell(row);
            const status = document.createElement("span");

            status.className = "history-status";
            status.textContent = "Đã khám xong";
            statusCell.append(status);

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

    function buildParams() {
        const fromInput = $("history-from-date");
        const toInput = $("history-to-date");

        if (!fromInput.checkValidity() || !toInput.checkValidity()) {
            throw new Error("Ngày lọc không hợp lệ.");
        }

        const fromDate = fromInput.value;
        const toDate = toInput.value;

        if (fromDate && toDate && fromDate > toDate) {
            throw new Error(
                "Ngày bắt đầu không được lớn hơn ngày kết thúc."
            );
        }

       const params = new URLSearchParams({
           trang: String(page),
           kichThuocTrang: "5"
       });

        const filters = {
            tuKhoa: $("history-search-input").value.trim(),
            maBacSi: $("history-doctor-filter").value,
            maKhoa: $("history-department-filter").value,
            tuNgay: fromDate,
            denNgay: toDate
        };

        for (const [key, value] of Object.entries(filters)) {
            if (value) {
                params.set(key, value);
            }
        }

        return params;
    }

    async function loadHistory() {
        if (loading) {
            return;
        }

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
        $("history-record-count").textContent = "Đang tải dữ liệu...";

        setLoading(true);

        const controller = new AbortController();
        const timeout = setTimeout(
            () => controller.abort(),
            20000
        );

        try {
            const headers = {
                Accept: "application/json"
            };

            const token = getToken().trim();

            if (token) {
                headers.Authorization = /^Bearer\s/i.test(token)
                    ? token
                    : `Bearer ${token}`;
            }

            const response = await fetch(`${API}?${params}`, {
                method: "GET",
                headers,
                cache: "no-store",
                credentials: "same-origin",
                signal: controller.signal
            });

            if (response.status === 401) {
                throw new Error(
                    "Phiên đăng nhập đã hết hạn. Bạn hãy đăng nhập lại."
                );
            }

            if (response.status === 403) {
                throw new Error(
                    "Không có quyền truy cập API lịch sử khám. " +
                    "Hãy kiểm tra tài khoản và phân quyền."
                );
            }

            const contentType =
                response.headers.get("content-type") || "";

            if (!contentType.includes("application/json")) {
                throw new Error(
                    "API không trả về JSON. Hãy kiểm tra đăng nhập " +
                    "và đường dẫn /api/tiepnhan/lich-su-kham."
                );
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || `Không thể tải dữ liệu (HTTP ${
                        response.status
                    }).`
                );
            }

            if (!data || !Array.isArray(data.danhSach)) {
                throw new Error(
                    "Dữ liệu API không đúng cấu trúc TiepNhanLichSuKhamDTO."
                );
            }

            const responsePage = Number(data.trangHienTai);
            const responsePages = Number(data.tongSoTrang);
            const total = Number(data.tongLichKham);
            const size = Number(data.kichThuocTrang);

            if (
                !Number.isSafeInteger(responsePage)
                || responsePage < 1
                || !Number.isSafeInteger(responsePages)
                || responsePages < responsePage
                || !Number.isSafeInteger(total)
                || total < 0
                || ![5, 10, 20, 50].includes(size)
            ) {
                throw new Error("Thông tin phân trang từ API không hợp lệ.");
            }

            page = responsePage;
            totalPages = responsePages;

            fillFilter(
                "history-doctor-filter",
                Array.isArray(data.danhSachBacSi)
                    ? data.danhSachBacSi
                    : [],
                "Tất cả bác sĩ"
            );

            fillFilter(
                "history-department-filter",
                Array.isArray(data.danhSachKhoa)
                    ? data.danhSachKhoa
                    : [],
                "Tất cả khoa"
            );

            renderRows(data.danhSach);

            $("history-empty").hidden = data.danhSach.length > 0;

            $("history-empty-message").textContent =
                "Không có lịch khám đã hoàn tất phù hợp với bộ lọc.";

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
            console.error("Lỗi tải lịch sử khám:", error);

            showMessage(
                error.name === "AbortError"
                    ? "Tải dữ liệu quá lâu. Bạn hãy bấm Làm mới dữ liệu."
                    : error.message || "Không thể tải lịch sử khám."
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
        if (loading) {
            return;
        }

        page = 1;
        void loadHistory();
    }

    function setupNotifications() {
        const wrapper = $("notification-wrapper");
        const button = $("notification-button");
        const panel = $("notification-panel");
        const closeButton = $("notification-close");

        if (!wrapper || !button || !panel) {
            return;
        }

        function closePanel() {
            panel.hidden = true;
            button.setAttribute("aria-expanded", "false");
        }

        button.addEventListener("click", () => {
            panel.hidden = !panel.hidden;

            button.setAttribute(
                "aria-expanded",
                String(!panel.hidden)
            );
        });

        closeButton?.addEventListener("click", closePanel);

        document.addEventListener("click", event => {
            if (!wrapper.contains(event.target)) {
                closePanel();
            }
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape" && !panel.hidden) {
                closePanel();
                button.focus();
            }
        });
    }

    function init() {
        const requiredIds = [
            "history-message",
            "history-card",
            "history-filter-form",
            "history-search-input",
            "history-search-button",
            "history-doctor-filter",
            "history-department-filter",
            "history-from-date",
            "history-to-date",
            "history-table-body",
            "history-loading",
            "history-empty",
            "history-empty-message",
            "history-record-count",
            "history-prev-page",
            "history-next-page",
            "history-page-label"
        ];

        const missing = requiredIds.filter(id => !$(id));

        if (missing.length) {
            console.error(
                "appointment-history.html thiếu các ID:",
                missing
            );
            return;
        }

        $("history-filter-form").addEventListener(
            "submit",
            event => {
                event.preventDefault();
                reloadFirstPage();
            }
        );

        [
            "history-doctor-filter",
            "history-department-filter",
            "history-from-date",
            "history-to-date"
        ].forEach(id => {
            $(id).addEventListener("change", reloadFirstPage);
        });

        // Khi bấm dấu x trong ô tìm kiếm để xóa từ khóa.
        $("history-search-input").addEventListener("search", () => {
            if (!$("history-search-input").value.trim()) {
                reloadFirstPage();
            }
        });

        $("history-prev-page").addEventListener("click", () => {
            if (!loading && loaded && page > 1) {
                page--;
                void loadHistory();
            }
        });

        $("history-next-page").addEventListener("click", () => {
            if (!loading && loaded && page < totalPages) {
                page++;
                void loadHistory();
            }
        });

        $("refresh-history-button")?.addEventListener(
            "click",
            () => void loadHistory()
        );

        setupNotifications();
        updateHeaderDate();
        void loadHistory();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();