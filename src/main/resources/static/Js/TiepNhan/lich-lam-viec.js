(() => {
    "use strict";

    const API = "/api/phan-cong-tiep-nhan/cua-toi";
    const $ = id => document.getElementById(id);

    let assignments = [];
    let currentWeekStart = monday(new Date());
    let toastTimer = null;

    function dateStr(date) {
        return [date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")].join("-");
    }

    function parseDateTime(value) {
        if (!value) return null;
        // LocalDateTime từ Spring thường có dạng yyyy-MM-ddTHH:mm:ss
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    function monday(date) {
        const result = new Date(date);
        result.setHours(0, 0, 0, 0);
        const day = result.getDay() || 7;
        result.setDate(result.getDate() - day + 1);
        return result;
    }

    function addDays(date, amount) {
        const result = new Date(date);
        result.setDate(result.getDate() + amount);
        return result;
    }

    function fmtDate(value) {
        const date = value instanceof Date ? value : parseDateTime(value);
        return date ? date.toLocaleDateString("vi-VN") : "—";
    }

    function fmtDateTime(value) {
        const date = parseDateTime(value);
        if (!date) return "—";
        return `${date.toLocaleDateString("vi-VN")} ${date.toLocaleTimeString("vi-VN", {
            hour: "2-digit", minute: "2-digit", hour12: false
        })}`;
    }

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;",
            '"': "&quot;", "'": "&#39;"
        })[char]);
    }

    function getStatus(item) {
        const status = Number(item.trangThai);
        if (status === 0 || status === 2) return ["status-cancelled", "Đã hủy"];
        const end = parseDateTime(item.thoiGianKetThuc);
        if (end && end < new Date()) return ["status-past", "Đã kết thúc"];
        return ["status-active", "Đang phân công"];
    }

    function unwrapList(data) {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        if (Array.isArray(data?.content)) return data.content;
        if (Array.isArray(data?.items)) return data.items;
        return null;
    }

    function getToken() {
        try {
            for (const store of [localStorage, sessionStorage]) {
                for (let i = 0; i < store.length; i++) {
                    const value = store.getItem(store.key(i));
                    if (!value) continue;
                    const token = value.startsWith("Bearer ") ? value.substring(7) : value;
                    if (token.split(".").length === 3) return token;
                }
            }
        } catch (error) {
            console.warn("Không đọc được token:", error);
        }
        return null;
    }

    async function apiRequest(url) {
        const headers = { Accept: "application/json" };
        const token = getToken();
        if (token) headers.Authorization = `Bearer ${token}`;

        const response = await fetch(url, {
            method: "GET",
            headers,
            credentials: "same-origin"
        });

        const raw = await response.text();
        let data = null;
        try { data = raw ? JSON.parse(raw) : null; }
        catch { data = raw; }

        if (!response.ok) {
            throw new Error(data?.message || data?.error ||
                (typeof data === "string" && data.trim()) ||
                `Lỗi HTTP ${response.status}`);
        }
        return data;
    }

    function showToast(message, isError = false) {
        const toast = $("toastMessage");
        if (!toast) return;
        toast.textContent = message;
        toast.classList.toggle("error", isError);
        toast.hidden = false;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { toast.hidden = true; }, 3500);
    }

    function filteredAssignments() {
        const from = $("filterFrom").value;
        const to = $("filterTo").value;
        return assignments.filter(item => {
            const start = parseDateTime(item.thoiGianBatDau);
            if (!start) return false;
            const date = dateStr(start);
            return (!from || date >= from) && (!to || date <= to);
        }).sort((a, b) =>
            String(a.thoiGianBatDau).localeCompare(String(b.thoiGianBatDau))
        );
    }

    function renderSummary(list) {
        const now = new Date();
        const month = dateStr(now).slice(0, 7);
        $("totalSchedules").textContent = list.filter(item =>
            String(item.thoiGianBatDau).slice(0, 7) === month
        ).length;
        $("upcomingSchedules").textContent = list.filter(item => {
            const end = parseDateTime(item.thoiGianKetThuc);
            return Number(item.trangThai) !== 0 && end && end >= now;
        }).length;
        $("departmentCount").textContent = new Set(
            list.map(item => item.maKhoa).filter(value => value != null).map(String)
        ).size;
    }

    function renderCalendar(list) {
        const days = Array.from({ length: 7 }, (_, index) => addDays(currentWeekStart, index));
        $("calendarDateRange").textContent =
            `${fmtDate(days[0])} – ${fmtDate(days[6])}`;

        const startHour = 6;
        const endHour = 22;
        const hourHeight = 60;

        const header = `
            <div class="calendar-corner"></div>
            ${days.map(day => {
                const today = dateStr(day) === dateStr(new Date());
                return `<div class="calendar-day-header ${today ? "is-today" : ""}">
                    <strong>${escapeHtml(day.toLocaleDateString("vi-VN", { weekday: "short" }))}</strong>
                    <span>${day.getDate()}/${day.getMonth() + 1}</span>
                </div>`;
            }).join("")}
        `;

        const timeColumn = Array.from({ length: endHour - startHour }, (_, i) =>
            `<div class="calendar-time">${String(startHour + i).padStart(2, "0")}:00</div>`
        ).join("");

        const columns = days.map(day => {
            const dayKey = dateStr(day);
            const events = list.filter(item => {
                const start = parseDateTime(item.thoiGianBatDau);
                return start && dateStr(start) === dayKey;
            });

            const eventHtml = events.map(item => {
                const start = parseDateTime(item.thoiGianBatDau);
                const end = parseDateTime(item.thoiGianKetThuc);
                if (!start || !end) return "";
                const startMinutes = start.getHours() * 60 + start.getMinutes();
                const endMinutes = end.getHours() * 60 + end.getMinutes();
                const top = Math.max(0, (startMinutes - startHour * 60) / 60 * hourHeight);
                const height = Math.max(34, (endMinutes - startMinutes) / 60 * hourHeight);
                const [statusClass] = getStatus(item);
                const id = Number(item.maPhanCong);
                return `<button type="button"
                    class="calendar-event ${statusClass}"
                    style="top:${top}px;height:${height}px"
                    data-detail="${id}">
                    <strong>${escapeHtml(item.tenKhoa || "Chưa rõ khoa")}</strong>
                    <span>${escapeHtml(start.toLocaleTimeString("vi-VN", {hour:"2-digit",minute:"2-digit",hour12:false}))}
                    – ${escapeHtml(end.toLocaleTimeString("vi-VN", {hour:"2-digit",minute:"2-digit",hour12:false}))}</span>
                </button>`;
            }).join("");

            return `<div class="calendar-day-column ${dayKey === dateStr(new Date()) ? "is-today" : ""}">
                ${eventHtml}
            </div>`;
        }).join("");

        $("calendarGrid").innerHTML = `${header}
            <div class="calendar-time-column">${timeColumn}</div>
            ${columns}`;
    }

    function renderList(list) {
        $("resultCount").textContent = `${list.length} phân công`;
        $("scheduleListSubtitle").textContent =
            $("filterFrom").value || $("filterTo").value
                ? "Kết quả theo khoảng ngày đã lọc"
                : "Tất cả phân công của bạn";

        if (!list.length) {
            $("scheduleListContent").innerHTML = `
                <div class="schedule-list-empty">
                    <i class="fa-regular fa-calendar-xmark"></i>
                    <strong>Chưa có phân công</strong>
                    <span>Admin chưa phân công công tác cho bạn trong khoảng thời gian này.</span>
                </div>`;
            return;
        }

        $("scheduleListContent").innerHTML = list.map(item => {
            const [statusClass, statusText] = getStatus(item);
            const id = Number(item.maPhanCong);
            return `<article class="schedule-list-item" data-detail="${id}" tabindex="0" role="button">
                <div class="schedule-list-top">
                    <strong>${escapeHtml(item.tenKhoa || "Chưa xác định khoa")}</strong>
                    <span class="status-pill ${statusClass}">${statusText}</span>
                </div>
                <div class="schedule-list-meta">
                    <span><i class="fa-regular fa-calendar"></i>
                        ${fmtDateTime(item.thoiGianBatDau)}</span>
                    <span><i class="fa-regular fa-clock"></i>
                        đến ${fmtDateTime(item.thoiGianKetThuc)}</span>
                    <span><i class="fa-regular fa-user"></i>
                        ${escapeHtml(item.tenNguoiPhanCong || "Không xác định")}</span>
                </div>
                <button type="button" class="detail-link" data-detail="${id}">
                    Xem chi tiết <i class="fa-solid fa-arrow-right"></i>
                </button>
            </article>`;
        }).join("");
    }

    function renderPage() {
        const list = filteredAssignments();
        renderSummary(list);
        renderCalendar(list);
        renderList(list);
    }

    function openDetail(item) {
        const [statusClass, statusText] = getStatus(item);
        $("detailModalContent").innerHTML = `
            <div class="detail-highlight">
                <span>KHOA ĐƯỢC PHÂN CÔNG</span>
                <h3>${escapeHtml(item.tenKhoa || "Chưa xác định")}</h3>
                <span class="status-pill ${statusClass}">${statusText}</span>
            </div>
            <div class="detail-grid">
                <div class="detail-row">
                    <span>Mã phân công</span><strong>#${escapeHtml(item.maPhanCong)}</strong>
                </div>
                <div class="detail-row">
                    <span>Thời gian bắt đầu</span><strong>${fmtDateTime(item.thoiGianBatDau)}</strong>
                </div>
                <div class="detail-row">
                    <span>Thời gian kết thúc</span><strong>${fmtDateTime(item.thoiGianKetThuc)}</strong>
                </div>
                <div class="detail-row">
                    <span>Người phân công</span><strong>${escapeHtml(item.tenNguoiPhanCong || "Không xác định")}</strong>
                </div>
                <div class="detail-row">
                    <span>Ngày tạo</span><strong>${fmtDateTime(item.ngayTao)}</strong>
                </div>
            </div>`;
        $("detailModal").hidden = false;
        document.body.style.overflow = "hidden";
    }

    function closeDetail() {
        $("detailModal").hidden = true;
        $("detailModalContent").innerHTML = "";
        document.body.style.overflow = "";
    }

    async function loadAssignments() {
        $("calendarGrid").innerHTML = `<div class="calendar-loading">Đang tải lịch phân công...</div>`;
        $("scheduleListContent").innerHTML = `<div class="schedule-list-empty">Đang tải dữ liệu...</div>`;
        try {
            const data = await apiRequest(API);
            const list = unwrapList(data);
            if (!list) throw new Error("Dữ liệu phân công trả về không đúng định dạng.");
            assignments = list;
            renderPage();
        } catch (error) {
            console.error("[Lịch phân công tiếp nhận]", error);
            assignments = [];
            $("calendarGrid").innerHTML = `
                <div class="calendar-error">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <strong>Không tải được lịch phân công</strong>
                    <span>${escapeHtml(error.message)}</span>
                </div>`;
            $("scheduleListContent").innerHTML = `
                <div class="schedule-list-empty error-text">${escapeHtml(error.message)}</div>`;
            renderSummary([]);
            $("resultCount").textContent = "0 phân công";
            showToast(error.message || "Không tải được lịch phân công.", true);
        }
    }

    function bindEvents() {
        $("btnRefresh").addEventListener("click", loadAssignments);
        $("btnFilter").addEventListener("click", renderPage);
        $("btnReset").addEventListener("click", () => {
            $("filterFrom").value = "";
            $("filterTo").value = "";
            renderPage();
        });
        $("btnPrevWeek").addEventListener("click", () => {
            currentWeekStart = addDays(currentWeekStart, -7);
            renderCalendar(filteredAssignments());
        });
        $("btnNextWeek").addEventListener("click", () => {
            currentWeekStart = addDays(currentWeekStart, 7);
            renderCalendar(filteredAssignments());
        });
        $("btnToday").addEventListener("click", () => {
            currentWeekStart = monday(new Date());
            renderCalendar(filteredAssignments());
        });
        $("calendarGrid").addEventListener("click", event => {
            const target = event.target.closest("[data-detail]");
            if (!target) return;
            const item = assignments.find(x => String(x.maPhanCong) === target.dataset.detail);
            if (item) openDetail(item);
        });
        $("scheduleListContent").addEventListener("click", event => {
            const target = event.target.closest("[data-detail]");
            if (!target) return;
            const item = assignments.find(x => String(x.maPhanCong) === target.dataset.detail);
            if (item) openDetail(item);
        });
        $("btnCloseDetailModal").addEventListener("click", closeDetail);
        $("btnCloseDetail").addEventListener("click", closeDetail);
        $("detailModal").addEventListener("click", event => {
            if (event.target === $("detailModal")) closeDetail();
        });
        document.addEventListener("keydown", event => {
            if (event.key === "Escape" && !$("detailModal").hidden) closeDetail();
        });
    }

    async function init() {
        bindEvents();
        await loadAssignments();
    }

    document.addEventListener("DOMContentLoaded", init);
})();
