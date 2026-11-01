(() => {
    "use strict";

    const API = "/api/bac-si/lich-lam-viec";
    const REQUEST_API = `${API}/yeu-cau-bao-ban`;

    const $ = id => document.getElementById(id);

    let schedules = [];
    let rooms = [];
    let currentWeekStart = monday(new Date());
    let selectedDate = dateStr(new Date());
    let toastTimer = null;

    /* ================================
       DATE HELPERS
    ================================= */

    function dateStr(date) {
        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");
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
        if (!value) return "—";

        const parts = String(value).slice(0, 10).split("-");
        if (parts.length !== 3) return value;

        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    function fmtTime(value) {
        return value ? String(value).slice(0, 5) : "—";
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

    /* ================================
       API HELPERS
    ================================= */

    function getToken() {
        const stores = [localStorage, sessionStorage];

        for (const store of stores) {
            for (let i = 0; i < store.length; i++) {
                const value = store.getItem(store.key(i));
                if (!value) continue;

                const token = value.startsWith("Bearer ")
                    ? value.substring(7)
                    : value;

                if (token.split(".").length === 3) {
                    return token;
                }
            }
        }

        return null;
    }

    async function apiRequest(url, options = {}) {
        const headers = {
            Accept: "application/json",
            ...(options.headers || {})
        };

        const token = getToken();

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        if (options.body) {
            headers["Content-Type"] = "application/json";
        }

        const response = await fetch(url, {
            ...options,
            headers,
            credentials: "same-origin"
        });

        const text = await response.text();
        let data = null;

        try {
            data = text ? JSON.parse(text) : null;
        } catch {
            data = text;
        }

        if (!response.ok) {
            const message =
                data?.message ||
                data?.error ||
                (typeof data === "string" ? data : null) ||
                `Lỗi HTTP ${response.status}`;

            throw new Error(message);
        }

        return data;
    }

    /* ================================
       ROOM HELPERS
    ================================= */

    function getRoomId(schedule) {
        return schedule?.maPhong
            ?? schedule?.phong?.maPhong
            ?? schedule?.phongChuyenTrach?.maPhong
            ?? null;
    }

    function getRoomName(roomId) {
        const room = rooms.find(
            item => String(item.maPhong) === String(roomId)
        );

        if (!room) {
            return roomId ? `Phòng #${roomId}` : "Chưa có phòng";
        }

        const name = room.tenPhong || "Phòng khám";
        const department = room.tenKhoa
            ? ` - ${room.tenKhoa}`
            : "";

        return `${name}${department}`;
    }

    /* ================================
       STATUS HELPERS
    ================================= */

    function isPast(schedule) {
        return String(schedule.ngayLamViec).slice(0, 10)
            < dateStr(new Date());
    }

    function getStatus(schedule) {
        if (isPast(schedule)) {
            return ["is-past", "Lịch đã qua"];
        }

        if (schedule.hetCho === true) {
            return ["is-full", "Đã hết chỗ"];
        }

        if (Number(schedule.soBenhNhanDaDat || 0) > 0) {
            return ["is-booked", "Có bệnh nhân đặt"];
        }

        return ["is-available", "Lịch được phân công"];
    }

    /* ================================
       TOAST
    ================================= */

    function showToast(message, isError = false) {
        const element = $("toastMessage");

        element.textContent = message;
        element.classList.toggle("error", isError);
        element.hidden = false;

        clearTimeout(toastTimer);

        toastTimer = setTimeout(() => {
            element.hidden = true;
        }, 3500);
    }

    /* ================================
       FILTER
    ================================= */

    function getFilteredSchedules() {
        const from = $("filterFrom").value;
        const to = $("filterTo").value;

        return schedules
            .filter(schedule => {
                const date = String(schedule.ngayLamViec).slice(0, 10);

                return (!from || date >= from)
                    && (!to || date <= to);
            })
            .sort((a, b) => {
                const dateA = `${a.ngayLamViec} ${a.gioBatDau}`;
                const dateB = `${b.ngayLamViec} ${b.gioBatDau}`;

                return dateA.localeCompare(dateB);
            });
    }

    /* ================================
       RENDER PAGE
    ================================= */

    function renderPage() {
        const list = getFilteredSchedules();
        const currentMonth = dateStr(new Date()).slice(0, 7);
        const today = dateStr(new Date());

        $("totalSchedules").textContent = list.filter(schedule =>
            String(schedule.ngayLamViec).slice(0, 7) === currentMonth
        ).length;

        $("upcomingSchedules").textContent = list.filter(schedule =>
            String(schedule.ngayLamViec).slice(0, 10) >= today
        ).length;

        $("roomCount").textContent = new Set(
            list.map(getRoomId)
                .filter(id => id != null)
                .map(String)
        ).size;

        $("resultCount").textContent = `${list.length} lịch`;

        renderCalendar(list);
        renderScheduleList(list);
    }

    /* ================================
       RENDER WEEK CALENDAR
    ================================= */

    function renderCalendar(list) {
        const days = Array.from(
            { length: 7 },
            (_, index) => addDays(currentWeekStart, index)
        );

        $("calendarDateRange").textContent =
            `${fmtDate(dateStr(days[0]))} – ${fmtDate(dateStr(days[6]))}`;

        $("calendarGrid").innerHTML = days.map(day => {
            const date = dateStr(day);

            const daySchedules = list.filter(schedule =>
                String(schedule.ngayLamViec).slice(0, 10) === date
            );

            const todayClass = date === dateStr(new Date())
                ? "is-today"
                : "";

            const selectedClass = date === selectedDate
                ? "is-selected"
                : "";

            const events = daySchedules.map(schedule => {
                const [statusClass] = getStatus(schedule);

                return `
                    <button type="button"
                            class="calendar-event ${statusClass}"
                            data-detail="${schedule.maLichLamViec}">

                        <span class="calendar-event-top">
                            <span>
                                ${escapeHtml(fmtTime(schedule.gioBatDau))}
                                -
                                ${escapeHtml(fmtTime(schedule.gioKetThuc))}
                            </span>

                            <span class="calendar-event-count">
                                ${Number(schedule.soBenhNhanDaDat || 0)}/${Number(schedule.tongSoSlot || 0)}
                            </span>
                        </span>

                        <span class="calendar-event-room">
                            ${escapeHtml(getRoomName(getRoomId(schedule)))}
                        </span>
                    </button>
                `;
            }).join("");

            return `
                <section class="calendar-day ${todayClass} ${selectedClass}">

                    <button type="button"
                            class="calendar-day-heading"
                            data-select-date="${date}">
                        ${escapeHtml(
                            day.toLocaleDateString("vi-VN", {
                                weekday: "short",
                                day: "2-digit",
                                month: "2-digit"
                            })
                        )}
                    </button>

                    <div class="calendar-day-events">
                        ${events}
                    </div>

                </section>
            `;
        }).join("");
    }

    /* ================================
       RENDER SCHEDULE LIST
    ================================= */

    function renderScheduleList(list) {
        const groups = {};

        list.forEach(schedule => {
            const date = String(schedule.ngayLamViec).slice(0, 10);

            if (!groups[date]) {
                groups[date] = [];
            }

            groups[date].push(schedule);
        });

        const hasFilter =
            $("filterFrom").value || $("filterTo").value;

        $("scheduleListSubtitle").textContent = hasFilter
            ? "Lịch theo khoảng ngày đã lọc"
            : "Các ngày có lịch làm việc";

        if (Object.keys(groups).length === 0) {
            $("scheduleListContent").innerHTML = `
                <div class="schedule-list-empty">
                    Không có lịch trong khoảng thời gian này.
                </div>
            `;
            return;
        }

        $("scheduleListContent").innerHTML =
            Object.entries(groups).map(([date, items]) => {
                const dateLabel = new Date(`${date}T00:00:00`)
                    .toLocaleDateString("vi-VN", {
                        weekday: "long",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric"
                    });

                const scheduleItems = items.map(schedule => {
                    const [statusClass, statusText] =
                        getStatus(schedule);

                    return `
                        <article class="schedule-list-item">

                            <span class="schedule-list-dot ${statusClass}"></span>

                            <div class="schedule-list-main">

                                <div class="schedule-list-time">
                                    ${escapeHtml(fmtTime(schedule.gioBatDau))}
                                    -
                                    ${escapeHtml(fmtTime(schedule.gioKetThuc))}
                                </div>

                                <div class="schedule-list-room">
                                    <i class="fa-solid fa-door-open"></i>
                                    ${escapeHtml(getRoomName(getRoomId(schedule)))}
                                </div>

                                <span class="schedule-status ${statusClass}">
                                    ${escapeHtml(statusText)}
                                </span>

                                <span class="schedule-booking-count">
                                    ${Number(schedule.soBenhNhanDaDat || 0)}/${Number(schedule.tongSoSlot || 0)}
                                    bệnh nhân
                                </span>

                            </div>

                            <div class="schedule-list-actions">
                                <button type="button"
                                        class="icon-button"
                                        data-detail="${schedule.maLichLamViec}"
                                        title="Xem chi tiết">
                                    <i class="fa-regular fa-eye"></i>
                                </button>
                            </div>

                        </article>
                    `;
                }).join("");

                return `
                    <section class="schedule-date-group">

                        <div class="schedule-date-heading">
                            <strong>${escapeHtml(dateLabel)}</strong>
                            <span>${items.length} ca</span>
                        </div>

                        <div class="schedule-date-items">
                            ${scheduleItems}
                        </div>

                    </section>
                `;
            }).join("");
    }

    /* ================================
       BUSY REQUEST MODAL
    ================================= */

    function openBusyModal(scheduleId = null) {
        const today = dateStr(new Date());

        const eligibleSchedules = schedules.filter(schedule =>
            String(schedule.ngayLamViec).slice(0, 10) >= today
        );

        $("busySchedule").innerHTML = `
            <option value="">-- Chọn lịch làm việc --</option>
            ${eligibleSchedules.map(schedule => `
                <option value="${schedule.maLichLamViec}">
                    ${escapeHtml(fmtDate(schedule.ngayLamViec))}
                    |
                    ${escapeHtml(fmtTime(schedule.gioBatDau))}
                    -
                    ${escapeHtml(fmtTime(schedule.gioKetThuc))}
                    |
                    ${escapeHtml(getRoomName(getRoomId(schedule)))}
                </option>
            `).join("")}
        `;

        if (scheduleId) {
            $("busySchedule").value = String(scheduleId);
        }

        $("busyReason").value = "";
        $("busyError").hidden = true;
        $("busyModal").hidden = false;

        document.body.style.overflow = "hidden";
    }

    function closeModal(modalId) {
        $(modalId).hidden = true;

        const busyOpen = !$("busyModal").hidden;
        const detailOpen = !$("detailModal").hidden;

        if (!busyOpen && !detailOpen) {
            document.body.style.overflow = "";
        }
    }

    async function submitBusyRequest(event) {
        event.preventDefault();

        const scheduleId = $("busySchedule").value;
        const reason = $("busyReason").value.trim();

        if (!scheduleId || !reason) {
            $("busyError").textContent =
                "Vui lòng chọn lịch làm việc và nhập lý do báo bận.";
            $("busyError").hidden = false;
            return;
        }

        const button = $("btnSubmitBusy");
        button.disabled = true;

        try {
            await apiRequest(REQUEST_API, {
                method: "POST",
                body: JSON.stringify({
                    maLichLamViec: Number(scheduleId),
                    lyDo: reason
                })
            });

            closeModal("busyModal");

            showToast("Đã gửi yêu cầu báo bận đến Admin.");
        } catch (error) {
            $("busyError").textContent = error.message;
            $("busyError").hidden = false;
        } finally {
            button.disabled = false;
        }
    }

    /* ================================
       SCHEDULE DETAIL
    ================================= */

    function openScheduleDetail(scheduleId) {
        const schedule = schedules.find(item =>
            String(item.maLichLamViec) === String(scheduleId)
        );

        if (!schedule) return;

        const [statusClass, statusText] = getStatus(schedule);

        $("scheduleDetail").innerHTML = `
            <p>
                <b>Ngày:</b>
                ${escapeHtml(fmtDate(schedule.ngayLamViec))}
            </p>

            <p>
                <b>Thời gian:</b>
                ${escapeHtml(fmtTime(schedule.gioBatDau))}
                -
                ${escapeHtml(fmtTime(schedule.gioKetThuc))}
            </p>

            <p>
                <b>Phòng:</b>
                ${escapeHtml(getRoomName(getRoomId(schedule)))}
            </p>

            <p>
                <b>Bệnh nhân đã đặt:</b>
                ${Number(schedule.soBenhNhanDaDat || 0)}
            </p>

            <p>
                <b>Trạng thái:</b>
                <span class="schedule-status ${statusClass}">
                    ${escapeHtml(statusText)}
                </span>
            </p>
        `;

        $("btnDetailBusy").dataset.id = scheduleId;
        $("detailModal").hidden = false;
        document.body.style.overflow = "hidden";
    }

    /* ================================
       LOAD DATA
    ================================= */

    async function loadSchedules() {
        try {
            const data = await apiRequest(API);

            if (!Array.isArray(data)) {
                throw new Error(
                    "API lịch làm việc không trả về danh sách."
                );
            }

            schedules = data;
            renderPage();

        } catch (error) {
            $("scheduleListContent").textContent =
                `Không tải được lịch: ${error.message}`;

            showToast(error.message, true);
        }
    }

    async function loadRooms() {
        try {
            const data = await apiRequest(`${API}/phong-kham`);
            rooms = Array.isArray(data) ? data : [];
        } catch (error) {
            console.warn("Không tải được danh sách phòng khám:", error);
            rooms = [];
        }
    }

    /* ================================
       EVENT LISTENERS
    ================================= */

    $("btnReportBusy").addEventListener("click", () => {
        openBusyModal();
    });

    $("btnCloseBusy").addEventListener("click", () => {
        closeModal("busyModal");
    });

    $("btnCancelBusy").addEventListener("click", () => {
        closeModal("busyModal");
    });

    $("busyForm").addEventListener(
        "submit",
        submitBusyRequest
    );

    $("btnCloseDetail").addEventListener("click", () => {
        closeModal("detailModal");
    });

    $("btnCloseDetail2").addEventListener("click", () => {
        closeModal("detailModal");
    });

    $("btnDetailBusy").addEventListener("click", event => {
        const scheduleId = event.currentTarget.dataset.id;

        closeModal("detailModal");
        openBusyModal(scheduleId);
    });

    $("btnFilter").addEventListener("click", () => {
        const from = $("filterFrom").value;
        const to = $("filterTo").value;

        if (from && to && from > to) {
            showToast(
                "Ngày bắt đầu không được sau ngày kết thúc.",
                true
            );
            return;
        }

        renderPage();
    });

    $("btnReset").addEventListener("click", () => {
        $("filterFrom").value = "";
        $("filterTo").value = "";
        renderPage();
    });

    $("btnPrevWeek").addEventListener("click", () => {
        currentWeekStart = addDays(currentWeekStart, -7);
        selectedDate = dateStr(currentWeekStart);
        renderPage();
    });

    $("btnNextWeek").addEventListener("click", () => {
        currentWeekStart = addDays(currentWeekStart, 7);
        selectedDate = dateStr(currentWeekStart);
        renderPage();
    });

    $("btnToday").addEventListener("click", () => {
        currentWeekStart = monday(new Date());
        selectedDate = dateStr(new Date());
        renderPage();
    });

    $("calendarGrid").addEventListener("click", event => {
        const dayButton = event.target.closest("[data-select-date]");

        if (dayButton) {
            selectedDate = dayButton.dataset.selectDate;

            currentWeekStart = monday(
                new Date(`${selectedDate}T00:00:00`)
            );

            renderPage();
            return;
        }

        const detailButton = event.target.closest("[data-detail]");

        if (detailButton) {
            openScheduleDetail(detailButton.dataset.detail);
        }
    });

    $("scheduleListContent").addEventListener("click", event => {
        const detailButton = event.target.closest("[data-detail]");

        if (detailButton) {
            openScheduleDetail(detailButton.dataset.detail);
        }
    });

    /* ================================
       INIT
    ================================= */

    async function init() {
        await loadRooms();
        await loadSchedules();
    }

    init();
})();