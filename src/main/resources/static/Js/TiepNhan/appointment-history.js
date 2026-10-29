
(() => {
    "use strict";

    const API = "/api/tiepnhan/lich-su-kham";
    const $ = id => document.getElementById(id);
    const TIME_ZONE = "Asia/Ho_Chi_Minh";

    let selectedDate = todayVietnam();
    let page = 1;
    let pageSize = 5;
    let keyword = "";
    let selectedDoctor = "";
    let selectedRoom = "";
    let allVisits = [];
    let doctors = [];
    let loaded = false;
    let loading = false;
    let requestVersion = 0;
    let activeController = null;
    let searchTimer = null;

    // =====================================================
    // HÀM CHUNG
    // =====================================================

    function getToken() {
        return sessionStorage.getItem("Token")
            || localStorage.getItem("Token")
            || sessionStorage.getItem("token")
            || localStorage.getItem("token")
            || "";
    }

    function text(value, fallback = "—") {
        const result = String(value ?? "").trim();
        return result || fallback;
    }

    function positiveId(value) {
        const number = Number(value);
        return Number.isSafeInteger(number) && number > 0 ? number : null;
    }

    function normalize(value) {
        return String(value ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[đĐ]/g, "d")
            .toLowerCase()
            .trim()
            .replace(/\s+/g, " ");
    }

    function todayVietnam() {
        const parts = new Intl.DateTimeFormat("en-GB", {
            timeZone: TIME_ZONE,
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).formatToParts(new Date());
        const get = type => parts.find(item => item.type === type).value;
        return `${get("year")}-${get("month")}-${get("day")}`;
    }

    function formatDate(raw) {
        const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(raw || ""));
        return match ? `${match[3]}/${match[2]}/${match[1]}` : "—";
    }

    function validDate(value) {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
        if (!match) return false;
        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);
        const check = new Date(Date.UTC(year, month - 1, day));
        return year >= 1000 && year <= 9999
            && check.getUTCFullYear() === year
            && check.getUTCMonth() === month - 1
            && check.getUTCDate() === day;
    }

    function updateHeaderDate() {
        const element = $("header-date-display");
        if (!element) return;
        element.textContent = new Intl.DateTimeFormat("vi-VN", {
            timeZone: TIME_ZONE,
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }).format(new Date());
    }

    function showMessage(content = "") {
        const element = $("history-message");
        element.textContent = content;
        element.hidden = !content;
    }

    function updateDateControls() {
        $("history-date-label").textContent = formatDate(selectedDate);
        const picker = $("history-filter-date");
        picker.value = selectedDate;
        picker.style.cssText = "";
        picker.tabIndex = -1;
        $("history-prev-date").disabled = loading || selectedDate <= "1000-01-01";
        $("history-next-date").disabled = loading || selectedDate >= "9999-12-31";
        $("history-open-calendar").disabled = loading;
    }

    function updateControls() {
        $("history-card").setAttribute("aria-busy", String(loading));
        $("history-loading").hidden = !loading;
        $("history-doctor-filter").disabled = loading || !loaded;
        $("history-room-filter").disabled = loading || !loaded;
        $("history-page-size").disabled = loading || !loaded;
        $("history-search-button").disabled = loading;
        // Người dùng vẫn có thể nhập để lọc ngay sau khi dữ liệu tải về.
        $("history-search-input").disabled = false;
        $("refresh-history-button") && ($("refresh-history-button").disabled = loading);
        updateDateControls();
    }

    async function fetchPage(date, currentPage, signal) {
        const params = new URLSearchParams({
            trang: String(currentPage),
            kichThuocTrang: "50",
            tuNgay: date,
            denNgay: date
        });
        const headers = { Accept: "application/json" };
        const token = getToken().trim();
        if (token) {
            headers.Authorization = /^Bearer\s/i.test(token) ? token : `Bearer ${token}`;
        }
        const response = await fetch(`${API}?${params}`, {
            method: "GET",
            headers,
            credentials: "same-origin",
            cache: "no-store",
            signal
        });
        if (response.status === 401) throw new Error("Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.");
        if (response.status === 403) throw new Error("Bạn không có quyền xem lịch sử khám.");
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
            throw new Error("API lịch sử khám không trả về JSON hợp lệ.");
        }
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data?.message || `Không tải được lịch sử (HTTP ${response.status}).`);
        }
        if (!data || !Array.isArray(data.danhSach)) {
            throw new Error("Phản hồi lịch sử khám không đúng định dạng.");
        }
        const totalPages = Number(data.tongSoTrang);
        if (!Number.isSafeInteger(totalPages) || totalPages < 0) {
            throw new Error("Thông tin phân trang của API không hợp lệ.");
        }
        return { data, totalPages };
    }

    // Dùng 50 mục/trang khi lấy dữ liệu để giảm số lần gọi API.
    // Chỉ cần tải lại khi thay ngày hoặc bấm Làm mới.
    async function loadDate(date = selectedDate) {
        if (!validDate(date)) {
            showMessage("Ngày khám không hợp lệ.");
            return;
        }

        const version = ++requestVersion;
        activeController?.abort();
        const controller = new AbortController();
        activeController = controller;

        selectedDate = date;
        loading = true;
        loaded = false;
        allVisits = [];
        $("history-table-body").replaceChildren();
        $("history-empty").hidden = true;
        $("history-record-count").textContent = "Đang tải dữ liệu...";
        showMessage();
        updateControls();

        try {
            const first = await fetchPage(date, 1, controller.signal);
            if (version !== requestVersion) return;
            const visits = [...first.data.danhSach];
            const pages = first.totalPages;
            const fetchedDoctors = Array.isArray(first.data.danhSachBacSi)
                ? first.data.danhSachBacSi
                : [];

            for (let index = 2; index <= pages; index++) {
                const next = await fetchPage(date, index, controller.signal);
                if (version !== requestVersion) return;
                visits.push(...next.data.danhSach);
            }

            if (version !== requestVersion) return;
            allVisits = visits;
            doctors = fetchedDoctors;
            loaded = true;
            page = 1;
            populateFilters();
            render();
        } catch (error) {
            if (version !== requestVersion || error.name === "AbortError") return;
            showMessage(error.message || "Không thể tải lịch sử khám.");
            $("history-empty").hidden = false;
            $("history-empty-message").textContent = "Không tải được danh sách lịch sử khám.";
            $("history-record-count").textContent = "Chưa tải được dữ liệu.";
        } finally {
            if (version === requestVersion) {
                loading = false;
                activeController = null;
                updateControls();
            }
        }
    }

    function populateFilters() {
        const doctorSelect = $("history-doctor-filter");
        doctorSelect.replaceChildren(new Option("Tất cả bác sĩ", ""));
        const seenDoctors = new Set();
        doctors.forEach(item => {
            const id = positiveId(item.ma);
            if (!id || seenDoctors.has(id)) return;
            seenDoctors.add(id);
            doctorSelect.add(new Option(text(item.ten, `Bác sĩ ${id}`), String(id)));
        });
        if (![...seenDoctors].some(id => String(id) === selectedDoctor)) {
            selectedDoctor = "";
        }
        doctorSelect.value = selectedDoctor;

        const roomSelect = $("history-room-filter");
        roomSelect.replaceChildren(new Option("Tất cả phòng", ""));
        const rooms = [...new Set(allVisits.map(item => String(item.tenPhong || "").trim())
            .filter(room => room && room !== "Chưa phân công"))]
            .sort((a, b) => a.localeCompare(b, "vi"));
        rooms.forEach(room => roomSelect.add(new Option(room, room)));
        if (!rooms.includes(selectedRoom)) selectedRoom = "";
        roomSelect.value = selectedRoom;
    }

    function matchDoctor(item) {
        if (!selectedDoctor) return true;
        const itemDoctorId = positiveId(item.maBacSi);
        if (itemDoctorId) return String(itemDoctorId) === selectedDoctor;
        const selected = doctors.find(row => String(row.ma) === selectedDoctor);
        return !!selected && normalize(item.tenBacSi) === normalize(selected.ten);
    }

    function matchKeyword(item) {
        const term = normalize(keyword);
        if (!term) return true;
        const appointmentId = positiveId(item.maLichKham);
        const patientId = positiveId(item.maBenhNhan);
        const candidates = [
            item.maLichKham, appointmentId ? `LK-${appointmentId}` : "",
            item.maBenhNhan, patientId ? `BN-${patientId}` : "",
            item.tenBenhNhan, item.soDienThoai,
            item.ngaySinh ? formatDate(item.ngaySinh) : "",
            item.tenBacSi, item.tenPhong
        ];
        return candidates.some(value => normalize(value).includes(term));
    }

    function filteredVisits() {
        return allVisits.filter(item =>
            matchKeyword(item)
            && matchDoctor(item)
            && (!selectedRoom || String(item.tenPhong || "").trim() === selectedRoom)
        );
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
        if (value !== undefined) cell.textContent = text(value);
        row.append(cell);
        return cell;
    }

    function renderRows(items) {
        const fragment = document.createDocumentFragment();
        for (const item of items) {
            const row = document.createElement("tr");
            const sequence = positiveId(item.soThuTu);
            addCell(row, sequence ? `#${String(sequence).padStart(3, "0")}` : "—");

            const appointmentId = positiveId(item.maLichKham);
            const patientId = positiveId(item.maBenhNhan);
            appendText(addCell(row), appointmentId ? `LK-${appointmentId}` : "—", "history-code");

            const patientCell = addCell(row);
            appendText(patientCell, item.tenBenhNhan, "history-primary-text");
            appendText(patientCell, patientId ? `BN-${patientId}` : "—", "history-secondary-text");
            const info = [
                item.ngaySinh ? formatDate(item.ngaySinh) : "",
                text(item.gioiTinh, ""), text(item.soDienThoai, "")
            ].filter(Boolean);
            if (info.length) appendText(patientCell, info.join(" · "), "history-secondary-text");

            const dateCell = addCell(row);
            appendText(dateCell, formatDate(item.ngayKham), "history-primary-text");
            appendText(dateCell, String(item.gioKham || "").slice(0, 5), "history-secondary-text");

            const doctorCell = addCell(row);
            appendText(doctorCell, item.tenKhoa, "history-primary-text");
            appendText(doctorCell, item.tenBacSi, "history-secondary-text");
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
                link.href = `/TiepNhan/ho-so-benh-nhan/${patientId}?${params}`;
                link.setAttribute("aria-label", `Xem lịch khám LK-${appointmentId} của ${text(item.tenBenhNhan, "bệnh nhân")}`);
                detailCell.append(link);
            }
            fragment.append(row);
        }
        $("history-table-body").replaceChildren(fragment);
        const scrollArea = document.querySelector(".history-table-scroll");
        if (scrollArea) scrollArea.scrollTop = 0;
    }

    function render() {
        if (!loaded) return;
        const items = filteredVisits();
        const pages = Math.ceil(items.length / pageSize);
        if (page > pages) page = Math.max(1, pages);
        const start = (page - 1) * pageSize;
        renderRows(items.slice(start, start + pageSize));

        $("history-empty").hidden = items.length > 0;
        $("history-empty-message").textContent =
            keyword || selectedDoctor || selectedRoom
                ? "Không tìm thấy lịch khám phù hợp với điều kiện đã chọn."
                : "Không có lịch khám đã hoàn tất trong ngày này.";
        $("history-record-count").textContent = items.length
            ? `Hiển thị ${start + 1}–${Math.min(start + pageSize, items.length)} / ${items.length} lịch khám`
            : "Hiển thị 0 lịch khám";
        $("history-page-label").textContent = `Trang ${pages ? page : 0} / ${pages}`;
        $("history-prev-page").disabled = page <= 1;
        $("history-next-page").disabled = pages === 0 || page >= pages;
        $("history-page-size").value = String(pageSize);
    }

    function moveDate(offset) {
        const [year, month, day] = selectedDate.split("-").map(Number);
        const date = new Date(Date.UTC(year, month - 1, day));
        date.setUTCDate(date.getUTCDate() + offset);
        const next = [
            String(date.getUTCFullYear()).padStart(4, "0"),
            String(date.getUTCMonth() + 1).padStart(2, "0"),
            String(date.getUTCDate()).padStart(2, "0")
        ].join("-");
        if (validDate(next)) void loadDate(next);
    }

    function openDateCalendar() {
        const input = $("history-filter-date");
        input.value = selectedDate;
        try {
            if (typeof input.showPicker === "function") {
                input.showPicker();
                return;
            }
        } catch {
            // Một số trình duyệt không hỗ trợ showPicker.
        }
        input.style.cssText = "position:static!important;width:145px!important;height:34px!important;opacity:1!important;pointer-events:auto!important;";
        input.tabIndex = 0;
        input.focus();
        input.click();
    }

    function setupNotifications() {
        const wrapper = $("notification-wrapper");
        const button = $("notification-button");
        const panel = $("notification-panel");
        const close = $("notification-close");
        if (!wrapper || !button || !panel) return;
        const setOpen = open => {
            panel.hidden = !open;
            button.setAttribute("aria-expanded", String(open));
        };
        button.addEventListener("click", () => setOpen(panel.hidden));
        close?.addEventListener("click", () => setOpen(false));
        document.addEventListener("click", event => {
            if (!wrapper.contains(event.target)) setOpen(false);
        });
        document.addEventListener("keydown", event => {
            if (event.key === "Escape") setOpen(false);
        });
    }

    function init() {
        const required = [
            "history-card", "history-message", "history-loading", "history-empty",
            "history-empty-message", "history-table-body", "history-search-input",
            "history-filter-form", "history-search-button", "history-doctor-filter",
            "history-room-filter", "history-prev-date", "history-next-date",
            "history-date-label", "history-open-calendar", "history-filter-date",
            "history-page-size", "history-prev-page", "history-next-page",
            "history-record-count", "history-page-label"
        ];
        const missing = required.filter(id => !$(id));
        if (missing.length) {
            console.error("appointment-history.html thiếu ID:", missing);
            return;
        }

        $("history-filter-form").addEventListener("submit", event => {
            event.preventDefault();
            clearTimeout(searchTimer);
            keyword = $("history-search-input").value.trim();
            page = 1;
            render();
        });
        $("history-search-input").addEventListener("input", () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                keyword = $("history-search-input").value.trim();
                page = 1;
                render();
            }, 200);
        });
        $("history-doctor-filter").addEventListener("change", () => {
            selectedDoctor = $("history-doctor-filter").value;
            page = 1;
            render();
        });
        $("history-room-filter").addEventListener("change", () => {
            selectedRoom = $("history-room-filter").value;
            page = 1;
            render();
        });
        $("history-page-size").addEventListener("change", () => {
            pageSize = Number($("history-page-size").value) || 5;
            page = 1;
            render();
        });
        $("history-prev-page").addEventListener("click", () => {
            if (loaded && page > 1) { page--; render(); }
        });
        $("history-next-page").addEventListener("click", () => {
            if (loaded && page < Math.ceil(filteredVisits().length / pageSize)) {
                page++;
                render();
            }
        });
        $("history-prev-date").addEventListener("click", () => moveDate(-1));
        $("history-next-date").addEventListener("click", () => moveDate(1));
        $("history-open-calendar").addEventListener("click", openDateCalendar);
        $("history-filter-date").addEventListener("change", () => {
            const date = $("history-filter-date").value;
            if (validDate(date)) void loadDate(date);
            else showMessage("Ngày khám không hợp lệ.");
        });
        $("refresh-history-button")?.addEventListener("click", () => void loadDate(selectedDate));

        setupNotifications();
        updateHeaderDate();
        updateDateControls();
        void loadDate(selectedDate);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
