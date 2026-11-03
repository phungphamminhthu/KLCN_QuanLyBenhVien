(() => {
    "use strict";

    const API = "/api/bac-si/lich-lam-viec";
    const ROOM_API = `${API}/phong-kham`;

    const $ = id => document.getElementById(id);

    let schedules = [];
    let rooms = [];
    let currentWeekStart = monday(new Date());
    let selectedDate = dateStr(new Date());
    let editingId = null;
    let toastTimer = null;

    // =========================
    // DATE HELPERS
    // =========================



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
        if (parts.length !== 3) return String(value);

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

    // =========================
    // DATA HELPERS
    // =========================

    function getScheduleId(item) {
        return item?.maLichLamViec ?? item?.id;
    }

    function getScheduleDate(item) {
        return String(item?.ngayLamViec ?? "").slice(0, 10);
    }

    function getStartTime(item) {
        return fmtTime(item?.gioBatDau);
    }

    function getEndTime(item) {
        return fmtTime(item?.gioKetThuc);
    }

    function getRoomId(item) {
        return item?.maPhong
            ?? item?.phong?.maPhong
            ?? item?.phongChuyenTrach?.maPhong
            ?? null;
    }

    function getRoomName(roomId) {
        if (roomId == null || roomId === "") return "Chưa có phòng";

        const room = rooms.find(item =>
            String(item.maPhong ?? item.id) === String(roomId)
        );

        if (!room) return "Chưa cập nhật tên phòng";

        const name = room.tenPhong || room.tenPhongChuyenTrach ||
            room.tenPhongKham || room.name || "Phòng khám";
        const department = room.tenKhoa || room.khoa?.tenKhoa ||
            room.tenKhoa?.tenKhoa || room.phongChuyenTrach?.khoa?.tenKhoa;
        return department ? `${name} - ${department}` : name;
    }

    function getRoomDisplay(item) {
        if (!item) return "Chưa có phòng";

        // Ưu tiên tên phòng được trả trực tiếp trong dữ liệu lịch
        const roomName =
            item.tenPhong ||
            item.phong?.tenPhong ||
            item.phongChuyenTrach?.tenPhong ||
            item.phongKham?.tenPhong ||
            item.tenPhongChuyenTrach;

        const departmentName =
            item.tenKhoa ||
            item.phong?.tenKhoa ||
            item.phongChuyenTrach?.tenKhoa ||
            item.phongKham?.tenKhoa ||
            item.khoa?.tenKhoa;

        if (roomName) {
            return departmentName
                ? `${roomName} - ${departmentName}`
                : roomName;
        }

        // Nếu API chỉ trả mã phòng thì tra cứu trong danh sách phòng
        const roomId =
            item.maPhong ||
            item.phong?.maPhong ||
            item.phongChuyenTrach?.maPhong ||
            item.phongKham?.maPhong;

        if (roomId != null) {
            const room = rooms.find(r =>
                String(r.maPhong) === String(roomId)
            );

            if (room) {
                const name = room.tenPhong || "Phòng khám";
                const department = room.tenKhoa
                    ? ` - ${room.tenKhoa}`
                    : "";

                return `${name}${department}`;
            }
        }

        return "Chưa có phòng";
    }

    function getBookingCount(item) {
        return Number(item?.soBenhNhanDaDat || 0);
    }

    function getSlotCount(item) {
        return Number(item?.tongSoSlot || 0);
    }

    function isPast(item) {
        return getScheduleDate(item) < dateStr(new Date());
    }

    // Chỉ cho phép gửi yêu cầu trước ngày làm việc
    function isRequestLocked(item) {
        const date = getScheduleDate(item);
        const today = dateStr(new Date());

        // Khóa lịch hôm nay và lịch đã qua
        return !date || date <= today;
    }

    function getStatus(item) {
        if (isPast(item)) {
            return ["is-past", "Lịch đã qua"];
        }

        if (
            item.hetCho === true ||
            (getSlotCount(item) > 0 &&
                getBookingCount(item) >= getSlotCount(item))
        ) {
            return ["is-full", "Đã hết chỗ"];
        }

        if (getBookingCount(item) > 0) {
            return ["is-booked", "Có bệnh nhân đặt"];
        }

        return ["is-available", "Lịch làm việc"];
    }

    function unwrapList(data) {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        if (Array.isArray(data?.content)) return data.content;
        if (Array.isArray(data?.items)) return data.items;

        return null;
    }

    // =========================
    // API HELPERS
    // =========================

    function getToken() {
        try {
            for (const store of [localStorage, sessionStorage]) {
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
        } catch (error) {
            console.warn("Không đọc được token:", error);
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

        const raw = await response.text();
        let data = null;

        try {
            data = raw ? JSON.parse(raw) : null;
        } catch {
            data = raw;
        }

        if (!response.ok) {
            const message =
                data?.message ||
                data?.error ||
                (typeof data === "string" && data.trim()) ||
                `Lỗi HTTP ${response.status}`;

            throw new Error(message);
        }

        return data;
    }

    // =========================
    // TOAST
    // =========================

    function showToast(message, isError = false) {
        const element = $("toastMessage");

        if (!element) {
            console[isError ? "error" : "log"](message);
            return;
        }

        element.textContent = message;
        element.classList.toggle("error", isError);
        element.hidden = false;

        clearTimeout(toastTimer);

        toastTimer = setTimeout(() => {
            element.hidden = true;
        }, 3500);
    }

    // =========================
    // FILTER
    // =========================

    function getFilteredSchedules() {
        const from = $("filterFrom")?.value || "";
        const to = $("filterTo")?.value || "";

        return schedules
            .filter(item => {
                const date = getScheduleDate(item);

                return (!from || date >= from) &&
                    (!to || date <= to);
            })
            .sort((a, b) => {
                const dateA = `${getScheduleDate(a)} ${getStartTime(a)}`;
                const dateB = `${getScheduleDate(b)} ${getStartTime(b)}`;

                return dateA.localeCompare(dateB);
            });
    }

    // =========================
    // RENDER PAGE
    // =========================

    function renderPage() {
        const list = getFilteredSchedules();
        const currentMonth = dateStr(new Date()).slice(0, 7);
        const today = dateStr(new Date());

        $("totalSchedules").textContent = list.filter(item =>
            getScheduleDate(item).slice(0, 7) === currentMonth
        ).length;

        $("upcomingSchedules").textContent = list.filter(item =>
            getScheduleDate(item) >= today
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

    // =========================
    // RENDER WEEK CALENDAR
    // =========================

    function renderCalendar(list) {
        const days = Array.from(
            { length: 7 },
            (_, index) => addDays(currentWeekStart, index)
        );

        $("calendarDateRange").textContent =
            `${fmtDate(dateStr(days[0]))} – ${fmtDate(dateStr(days[6]))}`;

        $("calendarGrid").innerHTML = days.map(day => {
            const date = dateStr(day);

            const daySchedules = list.filter(item =>
                getScheduleDate(item) === date
            );

            const todayClass = date === dateStr(new Date())
                ? "is-today"
                : "";

            const selectedClass = date === selectedDate
                ? "is-selected"
                : "";

            const events = daySchedules.map(item => {
                const id = getScheduleId(item);
                const [statusClass, statusText] = getStatus(item);

                return `
                    <article class="calendar-event-wrap">
                        <div class="calendar-event ${statusClass}"
                             data-detail="${escapeHtml(id)}">

                            <div class="calendar-event-top">
                                <span>
                                    ${escapeHtml(getStartTime(item))}
                                    - ${escapeHtml(getEndTime(item))}
                                </span>

                                <span class="calendar-event-count">
                                    ${getBookingCount(item)}/${getSlotCount(item)}
                                </span>
                            </div>

                            <div class="calendar-event-room">
                                ${escapeHtml(getRoomDisplay(item))}
                            </div>

                            <span class="schedule-status ${statusClass}">
                                ${escapeHtml(statusText)}
                            </span>
                        </div>
                    </article>
                `;
            }).join("");

            return `
                <section class="calendar-day ${todayClass} ${selectedClass}">
                    <button type="button"
                            class="calendar-day-heading"
                            data-select-date="${date}">
                        ${escapeHtml(day.toLocaleDateString("vi-VN", {
                            weekday: "short",
                            day: "2-digit",
                            month: "2-digit"
                        }))}
                    </button>

                    <div class="calendar-day-events">
                        ${events || `
                            <div class="calendar-empty-day">
                                Không có lịch
                            </div>
                        `}
                    </div>
                </section>
            `;
        }).join("");
    }

    // =========================
    // RENDER SCHEDULE LIST
    // =========================

    function renderScheduleList(list) {
        const groups = {};

        list.forEach(item => {
            const date = getScheduleDate(item);

            if (!groups[date]) {
                groups[date] = [];
            }

            groups[date].push(item);
        });

        const hasFilter =
            $("filterFrom").value || $("filterTo").value;

        $("scheduleListSubtitle").textContent = hasFilter
            ? "Lịch theo khoảng ngày đã lọc"
            : "Các ngày có lịch làm việc";

        if (Object.keys(groups).length === 0) {
            $("scheduleListContent").innerHTML = `
                <div class="schedule-list-empty">
                    Không có lịch làm việc trong khoảng thời gian này.
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

                const scheduleItems = items.map(item => {
                    const id = getScheduleId(item);
                    const [statusClass, statusText] = getStatus(item);

                    // Khóa yêu cầu từ ngày làm việc trở đi
                    const requestLocked = isRequestLocked(item);

                    const requestButtons = requestLocked
                        ? `
                            <button type="button" class="request-disabled" disabled
                                title="Chỉ được gửi yêu cầu trước ngày làm việc">
                                Sửa lịch
                            </button>
                            <button type="button" class="request-disabled" disabled
                                title="Chỉ được gửi yêu cầu trước ngày làm việc">
                                Hủy lịch
                            </button>
                            <button type="button" class="request-disabled" disabled
                                title="Chỉ được gửi yêu cầu trước ngày làm việc">
                                Điều phối
                            </button>
                        `
                        : `
                            <button type="button" data-request="SUA"
                                data-schedule-id="${id}">
                                Sửa lịch
                            </button>
                            <button type="button" data-request="HUY"
                                data-schedule-id="${id}">
                                Hủy lịch
                            </button>
                            <button type="button" data-request="DIEU_PHOI"
                                data-schedule-id="${id}">
                                Điều phối
                            </button>
                        `;

                    return `
                        <article class="schedule-list-item">
                            <span class="schedule-list-dot ${statusClass}"></span>

                            <div class="schedule-list-main">
                                <div class="schedule-list-time">
                                    ${escapeHtml(getStartTime(item))}
                                    -
                                    ${escapeHtml(getEndTime(item))}
                                </div>

                                <div class="schedule-list-room">
                                    <i class="fa-solid fa-door-open"></i>
                                    ${escapeHtml(getRoomDisplay(item))}
                                </div>

                                <span class="schedule-status ${statusClass}">
                                    ${escapeHtml(statusText)}
                                </span>

                                <span class="schedule-booking-count">
                                    ${getBookingCount(item)}/${getSlotCount(item)}
                                    bệnh nhân
                                </span>
                            </div>

                            <div class="calendar-event-actions doctor-request-actions">
                                ${requestButtons}
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

    // =========================
    // ROOM DROPDOWN
    // =========================

    function populateRequestRoomSelect(currentRoomId = null) {
        const select = $("doctorRequestNewRoom");
        if (!select) return;

        // Giữ option mặc định
        select.innerHTML = "";
        select.add(new Option("Giữ nguyên phòng hiện tại", ""));

        rooms.forEach(room => {
            const roomId =
                room.maPhong ??
                room.maPhongChuyenTrach ??
                room.id;

            if (roomId == null) return;

            const roomName =
                room.tenPhong ??
                room.tenPhongChuyenTrach ??
                room.tenPhongKham ??
                room.name ??
                `Phòng ${roomId}`;

            const departmentName =
                typeof room.tenKhoa === "string"
                    ? room.tenKhoa
                    : room.khoa?.tenKhoa ??
                      room.phongChuyenTrach?.khoa?.tenKhoa ??
                      "";

            const label = departmentName
                ? `${roomName} - ${departmentName}`
                : roomName;

            select.add(new Option(label, String(roomId)));
        });

        // Mặc định giữ nguyên phòng hiện tại
        select.value = currentRoomId == null
            ? ""
            : String(currentRoomId);

        // Nếu phòng hiện tại không nằm trong danh sách thì chọn giữ nguyên
        if (currentRoomId != null && select.value !== String(currentRoomId)) {
            select.value = "";
        }
    }

    async function loadRooms() {
        try {
            const data = await apiRequest(ROOM_API);
            rooms = unwrapList(data) || [];

            console.log("[Lịch làm việc] Danh sách phòng:", rooms);

            // Đổ danh sách phòng vào dropdown yêu cầu sửa lịch
            populateRequestRoomSelect();

        } catch (error) {
            rooms = [];
            populateRequestRoomSelect();

            console.error("Không tải được danh sách phòng:", error);
        }
    }

    // =========================
    // TIME DROPDOWNS
    // =========================

    function populateTimeOptions() {
        const startSelect = $("startTime");
        const endSelect = $("endTime");

        const times = [];

        for (let minutes = 6 * 60; minutes <= 22 * 60; minutes += 30) {
            const hour = String(Math.floor(minutes / 60)).padStart(2, "0");
            const minute = String(minutes % 60).padStart(2, "0");

            times.push(`${hour}:${minute}`);
        }

        startSelect.innerHTML =
            '<option value="">-- Chọn giờ bắt đầu --</option>';

        endSelect.innerHTML =
            '<option value="">-- Chọn giờ kết thúc --</option>';

        times.forEach(time => {
            startSelect.add(new Option(time, time));
            endSelect.add(new Option(time, time));
        });
    }

    // =========================
    // ADD / EDIT MODAL
    // =========================

    function openScheduleModal(item = null) {
        editingId = item ? getScheduleId(item) : null;

        $("modalTitle").textContent = item
            ? "Sửa lịch làm việc"
            : "Thêm lịch làm việc";

        $("scheduleId").value = editingId ?? "";
        $("workDate").value = item
            ? getScheduleDate(item)
            : selectedDate;

        $("roomId").value = item
            ? String(getRoomId(item) ?? "")
            : "";

        $("startTime").value = item
            ? getStartTime(item)
            : "";

        $("endTime").value = item
            ? getEndTime(item)
            : "";

        $("formError").hidden = true;
        $("formError").textContent = "";

        $("btnSave").disabled = false;
        $("btnSave").innerHTML =
            '<i class="fa-solid fa-floppy-disk"></i> Lưu lịch';

        $("scheduleModal").hidden = false;
        document.body.style.overflow = "hidden";
    }

    function closeScheduleModal() {
        $("scheduleModal").hidden = true;
        $("scheduleForm").reset();
        $("formError").hidden = true;

        document.body.style.overflow = "";
        editingId = null;
    }

    function showFormError(message) {
        $("formError").textContent = message;
        $("formError").hidden = false;
    }

    // =========================
    // DELETE MODAL
    // =========================

    function openDeleteModal(item) {
        const id = getScheduleId(item);

        $("deleteModal").dataset.id = id;
        $("deleteMessage").textContent =
            `Bạn có chắc chắn muốn xóa lịch ngày ${fmtDate(getScheduleDate(item))} ` +
            `(${getStartTime(item)} - ${getEndTime(item)}) không?`;

        $("deleteModal").hidden = false;
        document.body.style.overflow = "hidden";
    }

    function closeDeleteModal() {
        $("deleteModal").hidden = true;
        $("deleteModal").dataset.id = "";

        document.body.style.overflow = "";
    }

    // =========================
    // DETAIL MODAL
    // =========================

    function openDetailModal(item) {
        const [statusClass, statusText] = getStatus(item);

        const slots = Array.isArray(item.chiTietKhungGio)
            ? item.chiTietKhungGio
            : [];

        const slotHtml = slots.length
            ? slots.map(slot => {
                const daDat = Number(slot.daDat || 0);
                const tongSoSlot = Number(slot.tongSoSlot || 0);
                const conTrong = Number(
                    slot.conTrong ?? Math.max(0, tongSoSlot - daDat)
                );
                const hetCho = slot.hetCho === true || daDat >= tongSoSlot;

                return `
                    <div class="detail-slot-item ${hetCho ? "is-full" : ""}">
                        <div class="detail-slot-time">
                            ${escapeHtml(fmtTime(slot.gioBatDau))}
                            -
                            ${escapeHtml(fmtTime(slot.gioKetThuc))}
                        </div>

                        <div class="detail-slot-count">
                            ${daDat}/${tongSoSlot} bệnh nhân
                        </div>

                        <span class="detail-slot-status ${hetCho ? "is-full" : "is-available"}">
                            ${hetCho ? "Hết chỗ" : `Còn ${conTrong} chỗ`}
                        </span>
                    </div>
                `;
            }).join("")
            : `
                <div class="detail-empty-slots">
                    Chưa có dữ liệu chi tiết khung giờ.
                </div>
            `;

        $("detailModalContent").innerHTML = `
            <div class="detail-summary-grid">
                <div class="detail-info-card">
                    <span>Ngày làm việc</span>
                    <strong>${escapeHtml(fmtDate(getScheduleDate(item)))}</strong>
                </div>

                <div class="detail-info-card">
                    <span>Thời gian</span>
                    <strong>
                        ${escapeHtml(getStartTime(item))}
                        -
                        ${escapeHtml(getEndTime(item))}
                    </strong>
                </div>

                <div class="detail-info-card">
                    <span>Phòng khám</span>
                    <strong>${escapeHtml(getRoomDisplay(item))}</strong>
                </div>

                <div class="detail-info-card">
                    <span>Trạng thái</span>
                    <strong>
                        <span class="schedule-status ${statusClass}">
                            ${escapeHtml(statusText)}
                        </span>
                    </strong>
                </div>

                <div class="detail-info-card">
                    <span>Bệnh nhân đã đặt</span>
                    <strong>${getBookingCount(item)}</strong>
                </div>

                <div class="detail-info-card">
                    <span>Tổng số slot</span>
                    <strong>${getSlotCount(item)}</strong>
                </div>

                <div class="detail-info-card">
                    <span>Slot còn trống</span>
                    <strong>${Number(item.soSlotConTrong || 0)}</strong>
                </div>
            </div>

            <div class="detail-slots-section">
                <h3>Chi tiết khung giờ khám</h3>
                <div class="detail-slots-list">
                    ${slotHtml}
                </div>
            </div>
        `;

        $("detailModal").hidden = false;
        document.body.style.overflow = "hidden";
    }

    function closeDetailModal() {
        $("detailModal").hidden = true;
        $("detailModalContent").innerHTML = "";
        document.body.style.overflow = "";
    }

    // =========================
    // VALIDATE FORM
    // =========================

    function validateScheduleForm() {
        const date = $("workDate").value;
        const roomId = $("roomId").value;
        const start = $("startTime").value;
        const end = $("endTime").value;

        if (!date || !roomId || !start || !end) {
            return "Vui lòng nhập đầy đủ thông tin bắt buộc.";
        }

        if (start >= end) {
            return "Giờ kết thúc phải sau giờ bắt đầu.";
        }

        if (date < dateStr(new Date())) {
            return "Không thể tạo lịch làm việc trong ngày đã qua.";
        }

        const duplicate = schedules.some(item => {
            const sameSchedule =
                String(getScheduleId(item)) === String(editingId ?? "");

            if (sameSchedule) return false;

            const sameDate = getScheduleDate(item) === date;
            const sameRoom =
                String(getRoomId(item)) === String(roomId);

            const overlap =
                start < getEndTime(item) &&
                end > getStartTime(item);

            return sameDate && sameRoom && overlap;
        });

        if (duplicate) {
            return "Lịch bị trùng thời gian với lịch hiện có trong cùng phòng.";
        }

        return null;
    }

    // =========================
    // SAVE SCHEDULE
    // =========================

    async function saveSchedule(event) {
        event.preventDefault();

        $("formError").hidden = true;

        const validationError = validateScheduleForm();

        if (validationError) {
            showFormError(validationError);
            return;
        }

        const payload = {
            ngayLamViec: $("workDate").value,
            maPhong: Number($("roomId").value),
            gioBatDau: $("startTime").value,
            gioKetThuc: $("endTime").value
        };

        const button = $("btnSave");
        button.disabled = true;
        button.textContent = "Đang lưu...";

        try {
            if (editingId !== null && editingId !== "") {
                await apiRequest(`${API}/${editingId}`, {
                    method: "PUT",
                    body: JSON.stringify(payload)
                });

                showToast("Cập nhật lịch làm việc thành công.");
            } else {
                await apiRequest(API, {
                    method: "POST",
                    body: JSON.stringify(payload)
                });

                showToast("Thêm lịch làm việc thành công.");
            }

            closeScheduleModal();
            await loadSchedules();
        } catch (error) {
            showFormError(error.message);
        } finally {
            button.disabled = false;
            button.innerHTML =
                '<i class="fa-solid fa-floppy-disk"></i> Lưu lịch';
        }
    }

    // =========================
    // DELETE SCHEDULE
    // =========================

    async function deleteSchedule() {
        const id = $("deleteModal").dataset.id;

        if (!id) return;

        const button = $("btnConfirmDelete");
        button.disabled = true;
        button.textContent = "Đang xóa...";

        try {
            await apiRequest(`${API}/${id}`, {
                method: "DELETE"
            });

            closeDeleteModal();
            showToast("Xóa lịch làm việc thành công.");

            await loadSchedules();
        } catch (error) {
            showToast(error.message, true);
        } finally {
            button.disabled = false;
            button.textContent = "Xác nhận xóa";
        }
    }

    // =========================
    // LOAD SCHEDULES
    // =========================
    async function loadSchedules() {
        const listContent = $("scheduleListContent");
        const calendarGrid = $("calendarGrid");

        if (listContent) {
            listContent.innerHTML = `
                <div class="schedule-list-loading">
                    Đang tải lịch làm việc...
                </div>
            `;
        }

        if (calendarGrid) {
            calendarGrid.innerHTML = `
                <div class="calendar-loading">
                    Đang tải lịch làm việc...
                </div>
            `;
        }

        console.log("[Lịch làm việc] Bắt đầu tải lịch...");

        try {
            // Giữ cách gọi API đơn giản như luồng cũ.
            // Không tạo AbortController/timeout riêng tại đây.
            const data = await apiRequest(API);

            console.log("[Lịch làm việc] Dữ liệu API:", data);

            const list = unwrapList(data);

            if (!Array.isArray(list)) {
                throw new Error(
                    "API không trả về danh sách lịch làm việc hợp lệ."
                );
            }

            schedules = list;
            renderPage();

            console.log(
                "[Lịch làm việc] Tải thành công:",
                schedules.length,
                "lịch"
            );

        } catch (error) {
            const errorName = error?.name || "UnknownError";
            const errorMessage = error?.message || String(error);

            console.error("[Lịch làm việc] Lỗi tải lịch");
            console.error("Tên lỗi:", errorName);
            console.error("Thông báo:", errorMessage);
            console.error("Chi tiết lỗi:", error);

            const message = errorName === "AbortError"
                ? "Request tải lịch đã bị hủy. Vui lòng thử lại."
                : `Không tải được lịch làm việc: ${errorMessage}`;

            if (listContent) {
                listContent.innerHTML = `
                    <div class="schedule-list-empty">
                        <p>${escapeHtml(message)}</p>
                        <button
                            type="button"
                            id="btnRetryLoadSchedules"
                            class="btn-retry"
                        >
                            Thử lại
                        </button>
                    </div>
                `;
            }

            if (calendarGrid) {
                calendarGrid.innerHTML = `
                    <div class="calendar-empty-day">
                        ${escapeHtml(message)}
                    </div>
                `;
            }

            showToast(message, true);
        }
    }


    // =========================
    // DOCTOR REQUEST MODAL (request Admin to process)
    // =========================

    function ensureRequestModal() {
        if ($("doctorScheduleRequestModal")) return;

        const modal = document.createElement("div");
        modal.id = "doctorScheduleRequestModal";
        modal.className = "modal-overlay";
        modal.hidden = true;

        modal.innerHTML = `
            <div class="modal-content doctor-request-modal-content"
                 role="dialog"
                 aria-modal="true"
                 aria-labelledby="doctorRequestTitle">

                <div class="modal-header">
                    <h2 id="doctorRequestTitle">Gửi yêu cầu đến Admin</h2>
                    <button type="button"
                            class="icon-button"
                            id="btnCloseDoctorRequest"
                            aria-label="Đóng">&times;</button>
                </div>

                <form id="doctorRequestForm" accept-charset="UTF-8">
                    <input type="hidden" id="doctorRequestScheduleId">
                    <input type="hidden" id="doctorRequestType">

                    <div id="doctorRequestScheduleInfo"
                         class="doctor-request-schedule-info"></div>

                    <div id="doctorRequestEditFields" hidden>
                        <div class="doctor-request-field">
                            <label for="doctorRequestNewDate">Ngày làm việc mới</label>
                            <input type="date" id="doctorRequestNewDate">
                        </div>

                        <div class="doctor-request-field">
                            <label for="doctorRequestNewStart">Giờ bắt đầu mới</label>
                            <input type="time" id="doctorRequestNewStart">
                        </div>

                        <div class="doctor-request-field">
                            <label for="doctorRequestNewEnd">Giờ kết thúc mới</label>
                            <input type="time" id="doctorRequestNewEnd">
                        </div>

                        <div class="doctor-request-field">
                            <label for="doctorRequestNewRoom">Phòng mới</label>
                            <select id="doctorRequestNewRoom">
                                <option value="">Giữ nguyên phòng hiện tại</option>
                            </select>
                        </div>
                    </div>

                    <div class="doctor-request-field">
                        <label for="doctorRequestReason">
                            Lý do / nội dung yêu cầu <span>*</span>
                        </label>
                        <textarea id="doctorRequestReason"
                                  rows="4"
                                  required
                                  maxlength="500"
                                  placeholder="Nhập lý do và thông tin cần Admin xử lý..."></textarea>
                    </div>

                    <div id="doctorRequestError"
                         class="doctor-request-error"
                         role="alert"
                         hidden></div>

                    <div class="modal-actions">
                        <button type="button"
                                class="btn-outline"
                                id="btnCancelDoctorRequest">Hủy</button>
                        <button type="submit"
                                class="btn-primary"
                                id="btnSubmitDoctorRequest">Gửi yêu cầu</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        const roomSelect = $("doctorRequestNewRoom");
        rooms.forEach(room => {
            const roomId = room.maPhong ?? room.id;
            if (roomId == null) return;

            const option = new Option(
                getRoomName(roomId),
                String(roomId)
            );
            roomSelect.add(option);
        });
    }

    function requestTypeLabel(type) {
        return ({ SUA: "Yêu cầu sửa lịch", HUY: "Yêu cầu hủy lịch", DIEU_PHOI: "Yêu cầu điều phối lịch" })[type] || "Yêu cầu lịch làm việc";
    }

    function openDoctorRequest(item, type) {

        if (isRequestLocked(item)) {
                showToast(
                    "Không thể gửi yêu cầu từ ngày làm việc trở đi.",
                    true
                );
                return;
            }

        ensureRequestModal();

        const modal = $("doctorScheduleRequestModal");

        $("doctorRequestTitle").textContent = requestTypeLabel(type);
        $("doctorRequestScheduleId").value = getScheduleId(item);
        $("doctorRequestType").value = type;
        $("doctorRequestReason").value = "";
        $("doctorRequestError").hidden = true;

        $("doctorRequestScheduleInfo").textContent =
            `${fmtDate(getScheduleDate(item))} | ` +
            `${getStartTime(item)} - ${getEndTime(item)} | ` +
            `${getRoomDisplay(item)}`;

        const editFields = $("doctorRequestEditFields");
        editFields.hidden = type !== "SUA";

        $("doctorRequestNewDate").value = getScheduleDate(item);
        $("doctorRequestNewStart").value = getStartTime(item);
        $("doctorRequestNewEnd").value = getEndTime(item);

        // Đổ danh sách phòng và chọn phòng hiện tại làm mặc định
        populateRequestRoomSelect(getRoomId(item));

        const roomId = getRoomId(item);
        $("doctorRequestNewRoom").value =
            roomId == null ? "" : String(roomId);

        modal.hidden = false;
        document.body.style.overflow = "hidden";
        $("doctorRequestReason").focus();

    }

    function closeDoctorRequest() {
        const modal = $("doctorScheduleRequestModal");
        if (modal) modal.hidden = true;
        document.body.style.overflow = "";
    }

    async function submitDoctorRequest(event) {
        event.preventDefault();

        const id = $("doctorRequestScheduleId").value;
        const type = $("doctorRequestType").value;
        const reason = $("doctorRequestReason").value.trim();
        const errorElement = $("doctorRequestError");

        errorElement.hidden = true;

        if (!reason) {
            errorElement.textContent = "Vui lòng nhập lý do yêu cầu.";
            errorElement.hidden = false;
            return;
        }

        const payload = {
            loaiYeuCau: type,
            lyDo: reason
        };

        if (type === "SUA") {
            const ngayLamViecMoi = $("doctorRequestNewDate").value;
            const gioBatDauMoi = $("doctorRequestNewStart").value;
            const gioKetThucMoi = $("doctorRequestNewEnd").value;
            const maPhongMoi = $("doctorRequestNewRoom").value;

            if (!ngayLamViecMoi || !gioBatDauMoi || !gioKetThucMoi) {
                errorElement.textContent =
                    "Vui lòng nhập ngày, giờ bắt đầu và giờ kết thúc mới.";
                errorElement.hidden = false;
                return;
            }

            if (gioBatDauMoi >= gioKetThucMoi) {
                errorElement.textContent =
                    "Giờ kết thúc phải sau giờ bắt đầu.";
                errorElement.hidden = false;
                return;
            }

            payload.ngayLamViecMoi = ngayLamViecMoi;
            payload.gioBatDauMoi = gioBatDauMoi;
            payload.gioKetThucMoi = gioKetThucMoi;

            if (maPhongMoi) {
                payload.maPhongMoi = Number(maPhongMoi);
            }
        }

        if (type === "DIEU_PHOI") {
            payload.noiDungDieuPhoi = reason;
        }

        const button = $("btnSubmitDoctorRequest");
        button.disabled = true;
        button.textContent = "Đang gửi...";

        try {
            await apiRequest(`${API}/${id}/yeu-cau`, {
                method: "POST",
                body: JSON.stringify(payload)
            });

            closeDoctorRequest();
            showToast("Đã gửi yêu cầu đến Admin.");
        } catch (error) {
            errorElement.textContent =
                error.message || "Không gửi được yêu cầu.";
            errorElement.hidden = false;
        } finally {
            button.disabled = false;
            button.textContent = "Gửi yêu cầu";
        }
    }

    // =========================
    // EVENT HANDLERS
    // =========================

    function findSchedule(id) {
        return schedules.find(item =>
            String(getScheduleId(item)) === String(id)
        );
    }

    function handleScheduleAction(event) {
        const requestTarget = event.target.closest("[data-request][data-schedule-id]");
        if (requestTarget) {
            const item = findSchedule(requestTarget.dataset.scheduleId);
            if (item) openDoctorRequest(item, requestTarget.dataset.request);
            return;
        }
        const target = event.target.closest("[data-detail]");
        if (!target) return;
        const item = findSchedule(target.dataset.detail);
        if (item) openDetailModal(item);
    }

    function bindEvents() {
        ensureRequestModal();
        $("btnCloseDoctorRequest")?.addEventListener("click", closeDoctorRequest);
        $("btnCancelDoctorRequest")?.addEventListener("click", closeDoctorRequest);
        $("doctorRequestForm")?.addEventListener("submit", submitDoctorRequest);
        $("doctorScheduleRequestModal")?.addEventListener("click", event => {
            if (event.target === $("doctorScheduleRequestModal")) closeDoctorRequest();
        });

        // Bác sĩ gửi yêu cầu; Admin mới là người thay đổi lịch chính thức.
        $("btnCloseDetailModal")?.addEventListener("click", closeDetailModal);
        $("btnCloseDetail")?.addEventListener("click", closeDetailModal);

        $("detailModal")?.addEventListener("click", event => {
            if (event.target === $("detailModal")) closeDetailModal();
        });

        $("btnFilter")?.addEventListener("click", () => {
            const from = $("filterFrom")?.value || "";
            const to = $("filterTo")?.value || "";

            if (from && to && from > to) {
                showToast("Ngày bắt đầu không được sau ngày kết thúc.", true);
                return;
            }
            renderPage();
        });

        $("btnReset")?.addEventListener("click", () => {
            if ($("filterFrom")) $("filterFrom").value = "";
            if ($("filterTo")) $("filterTo").value = "";
            renderPage();
        });

        $("btnPrevWeek")?.addEventListener("click", () => {
            currentWeekStart = addDays(currentWeekStart, -7);
            selectedDate = dateStr(currentWeekStart);
            renderPage();
        });

        $("btnNextWeek")?.addEventListener("click", () => {
            currentWeekStart = addDays(currentWeekStart, 7);
            selectedDate = dateStr(currentWeekStart);
            renderPage();
        });

        $("btnToday")?.addEventListener("click", () => {
            currentWeekStart = monday(new Date());
            selectedDate = dateStr(new Date());
            renderPage();
        });

        $("calendarGrid")?.addEventListener("click", event => {
            const dayButton = event.target.closest("[data-select-date]");
            if (dayButton) {
                selectedDate = dayButton.dataset.selectDate;
                currentWeekStart = monday(new Date(`${selectedDate}T00:00:00`));
                renderPage();
                return;
            }
            handleScheduleAction(event);
        });

        $("scheduleListContent")?.addEventListener("click", handleScheduleAction);

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                if ($("detailModal") && !$("detailModal").hidden) closeDetailModal();
                if ($("doctorScheduleRequestModal") && !$("doctorScheduleRequestModal").hidden) closeDoctorRequest();
            }
        });
    }

    // =========================
    // INIT
    // =========================

    async function init() {
        bindEvents();
        await loadRooms();
        await loadSchedules();
    }

    document.addEventListener("DOMContentLoaded", init);
})();