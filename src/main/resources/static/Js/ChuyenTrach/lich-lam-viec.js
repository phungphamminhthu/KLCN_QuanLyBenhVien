
(() => {
    "use strict";

    const API = "/api/phan-cong-chuyen-trach/cua-toi";
    const $ = id => document.getElementById(id);

    let assignments = [];
    let currentWeekStart = monday(new Date());
    let toastTimer = null;

    // =========================
    // XỬ LÝ NGÀY GIỜ
    // =========================

    function dateStr(date) {
        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");
    }

    function parseLocalDate(value) {
        if (!value) return null;

        const parts = String(value).split("-").map(Number);
        if (parts.length !== 3 || parts.some(Number.isNaN)) return null;

        return new Date(parts[0], parts[1] - 1, parts[2]);
    }

    function parseTime(value) {
        if (!value) return null;

        const parts = String(value).split(":").map(Number);
        if (parts.length < 2 || parts.some(Number.isNaN)) return null;

        return {
            hour: parts[0],
            minute: parts[1],
            second: parts[2] || 0
        };
    }

    function combineDateTime(dateValue, timeValue) {
        const date = parseLocalDate(dateValue);
        const time = parseTime(timeValue);

        if (!date || !time) return null;

        date.setHours(time.hour, time.minute, time.second, 0);
        return date;
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

    function formatDate(value) {
        const date = value instanceof Date
            ? value
            : parseLocalDate(value);

        return date
            ? date.toLocaleDateString("vi-VN")
            : "—";
    }

    function formatTime(value) {
        const time = parseTime(value);
        if (!time) return "—";

        return `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`;
    }

    function formatDateTime(dateValue, timeValue) {
        return `${formatDate(dateValue)} ${formatTime(timeValue)}`;
    }

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    // =========================
    // TRẠNG THÁI PHÂN CÔNG
    // =========================

    function getStatus(item) {
        if (Number(item.trangThai) === 0) {
            return ["status-cancelled", "Đã hủy"];
        }

        const start = combineDateTime(
            item.ngayLamViec,
            item.gioBatDau
        );

        const end = combineDateTime(
            item.ngayLamViec,
            item.gioKetThuc
        );

        const now = new Date();

        if (end && end < now) {
            return ["status-completed", "Đã hoàn thành"];
        }

        if (start && start <= now && end && end >= now) {
            return ["status-current", "Đang diễn ra"];
        }

        return ["status-upcoming", "Sắp diễn ra"];
    }

    // =========================
    // TOKEN VÀ GỌI API
    // =========================

    function getToken() {
        const possibleKeys = [
            "Token",
            "accessToken",
            "access_token",
            "token",
            "jwt",
            "jwtToken"
        ];

        try {
            for (const store of [localStorage, sessionStorage]) {
                for (const key of possibleKeys) {
                    const value = store.getItem(key);

                    if (value) {
                        return value.startsWith("Bearer ")
                            ? value.substring(7)
                            : value;
                    }
                }
            }
        } catch (error) {
            console.warn("Không đọc được token:", error);
        }

        return null;
    }

    function unwrapList(data) {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        if (Array.isArray(data?.content)) return data.content;
        if (Array.isArray(data?.items)) return data.items;

        return null;
    }

    async function apiRequest(url) {
        const headers = {
            Accept: "application/json"
        };

        const token = getToken();

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            method: "GET",
            headers,
            credentials: "same-origin"
        });

        const raw = await response.text();

        let data = null;

        try {
            data = raw ? JSON.parse(raw) : null;
        } catch {
            data = raw;
        }

        if (!response.ok) {
            throw new Error(
                data?.message ||
                data?.error ||
                (typeof data === "string" && data.trim()) ||
                `Lỗi HTTP ${response.status}`
            );
        }

        return data;
    }

    // =========================
    // TOAST
    // =========================

    function showToast(message, isError = false) {
        const toast = $("toastMessage");
        if (!toast) return;

        toast.textContent = message;
        toast.classList.toggle("error", isError);
        toast.hidden = false;

        clearTimeout(toastTimer);

        toastTimer = setTimeout(() => {
            toast.hidden = true;
        }, 3500);
    }

    // =========================
    // LỌC LỊCH
    // =========================

    function filteredAssignments() {
        const from = $("filterFrom").value;
        const to = $("filterTo").value;

        return assignments
            .filter(item => {
                const date = String(item.ngayLamViec || "");

                return date &&
                    (!from || date >= from) &&
                    (!to || date <= to);
            })
            .sort((a, b) => {
                const dateCompare = String(a.ngayLamViec)
                    .localeCompare(String(b.ngayLamViec));

                if (dateCompare !== 0) return dateCompare;

                return String(a.gioBatDau)
                    .localeCompare(String(b.gioBatDau));
            });
    }

    // =========================
    // THỐNG KÊ
    // =========================

    function renderSummary(list) {
        const now = new Date();

        const total = list.length;

        const upcoming = list.filter(item => {
            const [, status] = getStatus(item);

            return status === "Sắp diễn ra" ||
                status === "Đang diễn ra";
        }).length;

        const completed = list.filter(item => {
            const [, status] = getStatus(item);
            return status === "Đã hoàn thành";
        }).length;

        $("totalSchedules").textContent = total;
        $("upcomingSchedules").textContent = upcoming;
        $("completedSchedules").textContent = completed;
    }

    // =========================
    // LỊCH TUẦN
    // =========================

    function renderCalendar(list) {
        const days = Array.from(
            { length: 7 },
            (_, index) => addDays(currentWeekStart, index)
        );

        $("calendarDateRange").textContent =
            `${formatDate(days[0])} – ${formatDate(days[6])}`;

        const startHour = 6;
        const endHour = 22;
        const hourHeight = 60;

        const header = `
            <div class="calendar-corner"></div>

            ${days.map(day => {
                const today = dateStr(day) === dateStr(new Date());

                return `
                    <div class="calendar-day-header ${today ? "is-today" : ""}">
                        <strong>
                            ${escapeHtml(day.toLocaleDateString("vi-VN", {
                                weekday: "short"
                            }))}
                        </strong>
                        <span>${day.getDate()}/${day.getMonth() + 1}</span>
                    </div>
                `;
            }).join("")}
        `;

        const timeColumn = Array.from(
            { length: endHour - startHour },
            (_, index) => `
                <div class="calendar-time">
                    ${String(startHour + index).padStart(2, "0")}:00
                </div>
            `
        ).join("");

        const columns = days.map(day => {
            const dayKey = dateStr(day);

            const events = list.filter(item =>
                String(item.ngayLamViec) === dayKey
            );

            const eventHtml = events.map(item => {
                const start = combineDateTime(
                    item.ngayLamViec,
                    item.gioBatDau
                );

                const end = combineDateTime(
                    item.ngayLamViec,
                    item.gioKetThuc
                );

                if (!start || !end) return "";

                const startMinutes =
                    start.getHours() * 60 + start.getMinutes();

                const endMinutes =
                    end.getHours() * 60 + end.getMinutes();

                const top = Math.max(
                    0,
                    (startMinutes - startHour * 60) / 60 * hourHeight
                );

                const height = Math.max(
                    34,
                    (endMinutes - startMinutes) / 60 * hourHeight
                );

                const [statusClass] = getStatus(item);

                return `
                    <button type="button"
                        class="calendar-event ${statusClass}"
                        style="top:${top}px;height:${height}px"
                        data-detail="${Number(item.maPhanCong)}">

                        <strong>
                            ${escapeHtml(item.ghiChu || "Lịch làm việc")}
                        </strong>

                        <span>
                            ${formatTime(item.gioBatDau)}
                            – ${formatTime(item.gioKetThuc)}
                        </span>
                    </button>
                `;
            }).join("");

            const isToday = dayKey === dateStr(new Date());

            return `
                <div class="calendar-day-column ${isToday ? "is-today" : ""}">
                    ${eventHtml}
                </div>
            `;
        }).join("");

        $("calendarGrid").innerHTML = `
            ${header}
            <div class="calendar-time-column">${timeColumn}</div>
            ${columns}
        `;
    }

    // =========================
    // DANH SÁCH LỊCH
    // =========================

    function renderList(list) {
        $("resultCount").textContent = `${list.length} phân công`;

        $("scheduleListSubtitle").textContent =
            $("filterFrom").value || $("filterTo").value
                ? "Kết quả theo khoảng ngày đã lọc"
                : "Tất cả lịch làm việc của bạn";

        if (!list.length) {
            $("scheduleListContent").innerHTML = `
                <div class="schedule-list-empty">
                    <i class="fa-regular fa-calendar-xmark"></i>
                    <strong>Chưa có lịch làm việc</strong>
                    <span>
                        Hiện tại bạn chưa được Admin phân công
                        trong khoảng thời gian này.
                    </span>
                </div>
            `;

            return;
        }

        $("scheduleListContent").innerHTML = list.map(item => {
            const [statusClass, statusText] = getStatus(item);
            const id = Number(item.maPhanCong);

            return `
                <article class="schedule-list-item"
                    data-detail="${id}"
                    tabindex="0"
                    role="button">

                    <div class="schedule-list-top">
                        <strong>
                            ${escapeHtml(item.ghiChu || "Lịch làm việc")}
                        </strong>

                        <span class="status-pill ${statusClass}">
                            ${statusText}
                        </span>
                    </div>

                    <div class="schedule-list-meta">
                        <span>
                            <i class="fa-regular fa-calendar"></i>
                            ${formatDate(item.ngayLamViec)}
                        </span>

                        <span>
                            <i class="fa-regular fa-clock"></i>
                            ${formatTime(item.gioBatDau)}
                            – ${formatTime(item.gioKetThuc)}
                        </span>

                        <span>
                            <i class="fa-regular fa-user"></i>
                            Người phân công:
                            ${escapeHtml(item.tenNguoiPhanCong || "Không xác định")}
                        </span>
                    </div>

                    <button type="button"
                        class="detail-link"
                        data-detail="${id}">
                        Xem chi tiết
                        <i class="fa-solid fa-arrow-right"></i>
                    </button>
                </article>
            `;
        }).join("");
    }

    // =========================
    // HIỂN THỊ TRANG
    // =========================

    function renderPage() {
        const list = filteredAssignments();

        renderSummary(list);
        renderCalendar(list);
        renderList(list);
    }

    // =========================
    // CHI TIẾT PHÂN CÔNG
    // =========================

    function openDetail(item) {
        const [statusClass, statusText] = getStatus(item);

        $("detailModalContent").innerHTML = `
            <div class="detail-highlight">
                <span>LỊCH LÀM VIỆC</span>

                <h3>
                    ${escapeHtml(item.ghiChu || "Lịch làm việc")}
                </h3>

                <span class="status-pill ${statusClass}">
                    ${statusText}
                </span>
            </div>

            <div class="detail-grid">
                <div class="detail-row">
                    <span>Mã phân công</span>
                    <strong>#${escapeHtml(item.maPhanCong)}</strong>
                </div>

                <div class="detail-row">
                    <span>Ngày làm việc</span>
                    <strong>${formatDate(item.ngayLamViec)}</strong>
                </div>

                <div class="detail-row">
                    <span>Giờ bắt đầu</span>
                    <strong>${formatTime(item.gioBatDau)}</strong>
                </div>

                <div class="detail-row">
                    <span>Giờ kết thúc</span>
                    <strong>${formatTime(item.gioKetThuc)}</strong>
                </div>

                <div class="detail-row">
                    <span>Ghi chú</span>
                    <strong>${escapeHtml(item.ghiChu || "Không có")}</strong>
                </div>

                <div class="detail-row">
                    <span>Người phân công</span>
                    <strong>
                        ${escapeHtml(item.tenNguoiPhanCong || "Không xác định")}
                    </strong>
                </div>

                <div class="detail-row">
                    <span>Ngày tạo</span>
                    <strong>${escapeHtml(item.ngayTao || "—")}</strong>
                </div>
            </div>
        `;

        $("detailModal").hidden = false;
        document.body.style.overflow = "hidden";
    }

    function closeDetail() {
        $("detailModal").hidden = true;
        $("detailModalContent").innerHTML = "";
        document.body.style.overflow = "";
    }

    // =========================
    // TẢI LỊCH TỪ BACKEND
    // =========================

    async function loadAssignments() {
        $("calendarGrid").innerHTML = `
            <div class="calendar-loading">
                Đang tải lịch làm việc...
            </div>
        `;

        $("scheduleListContent").innerHTML = `
            <div class="schedule-list-empty">
                Đang tải dữ liệu...
            </div>
        `;

        try {
            const data = await apiRequest(API);
            const list = unwrapList(data);

            if (!list) {
                throw new Error(
                    "Dữ liệu lịch làm việc trả về không đúng định dạng."
                );
            }

            assignments = list;
            renderPage();

        } catch (error) {
            console.error("[Lịch làm việc chuyên trách]", error);

            assignments = [];

            $("calendarGrid").innerHTML = `
                <div class="calendar-error">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <strong>Không tải được lịch làm việc</strong>
                    <span>${escapeHtml(error.message)}</span>
                </div>
            `;

            $("scheduleListContent").innerHTML = `
                <div class="schedule-list-empty error-text">
                    ${escapeHtml(error.message)}
                </div>
            `;

            renderSummary([]);
            $("resultCount").textContent = "0 phân công";

            showToast(
                error.message || "Không tải được lịch làm việc.",
                true
            );
        }
    }

    // =========================
    // SỰ KIỆN
    // =========================

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

            const item = assignments.find(
                x => String(x.maPhanCong) === target.dataset.detail
            );

            if (item) openDetail(item);
        });

        $("scheduleListContent").addEventListener("click", event => {
            const target = event.target.closest("[data-detail]");
            if (!target) return;

            const item = assignments.find(
                x => String(x.maPhanCong) === target.dataset.detail
            );

            if (item) openDetail(item);
        });

        $("btnCloseDetailModal").addEventListener("click", closeDetail);
        $("btnCloseDetail").addEventListener("click", closeDetail);

        $("detailModal").addEventListener("click", event => {
            if (event.target === $("detailModal")) {
                closeDetail();
            }
        });

        document.addEventListener("keydown", event => {
            if (
                event.key === "Escape" &&
                !$("detailModal").hidden
            ) {
                closeDetail();
            }
        });
    }

    async function init() {
        bindEvents();
        await loadAssignments();
    }

    document.addEventListener("DOMContentLoaded", init);
})();
