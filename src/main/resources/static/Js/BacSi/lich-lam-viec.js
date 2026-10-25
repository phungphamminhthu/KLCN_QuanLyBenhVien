(() => {
    "use strict";

    const API = "/api/bac-si/lich-lam-viec";
    const ROOM_API = `${API}/phong-kham`;
    const $ = (id) => document.getElementById(id);

    const form = $("scheduleForm");
    const modal = $("scheduleModal");
    const deleteModal = $("deleteModal");
    const calendarGrid = $("calendarGrid");
    const scheduleListContent = $("scheduleListContent");

    let schedules = [];
    let rooms = [];
    let deletingId = null;
    let toastTimer = null;
    let currentWeekStart = getMonday(new Date());
    let selectedDate = toDateString(new Date());

    // =====================================================
    // TIỆN ÍCH CHUNG
    // =====================================================
    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    function today() {
        return toDateString(new Date());
    }

    function toDateString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function getMonday(date) {
        const result = new Date(date);
        result.setHours(0, 0, 0, 0);

        const day = result.getDay();
        result.setDate(
            result.getDate() - (day === 0 ? 6 : day - 1)
        );

        return result;
    }

    function addDays(date, amount) {
        const result = new Date(date);
        result.setDate(result.getDate() + amount);
        return result;
    }

    function formatDate(dateValue) {
        if (!dateValue) return "—";

        const [year, month, day] =
            String(dateValue).slice(0, 10).split("-");

        return `${day}/${month}/${year}`;
    }

    function formatDay(date) {
        return date.toLocaleDateString("vi-VN", {
            weekday: "short",
            day: "2-digit",
            month: "2-digit"
        });
    }

    function formatTime(value) {
        return value ? String(value).slice(0, 5) : "—";
    }

    function getRoomId(item) {
        return item?.maPhong
            ?? item?.phong?.maPhong
            ?? item?.phongChuyenTrach?.maPhong
            ?? item?.maPhongChuyenTrach
            ?? null;
    }

    function roomName(maPhong) {
        if (maPhong == null || maPhong === "") {
            return "Chưa xác định phòng";
        }

        const room = rooms.find(r =>
            String(r.maPhong ?? r.id) === String(maPhong)
        );

        if (!room) {
            console.warn("Không tìm thấy phòng:", maPhong, rooms);
            return `Phòng #${maPhong}`;
        }

        const tenPhong =
            room.tenPhong
            ?? room.tenPhongChuyenTrach
            ?? room.name
            ?? "Phòng chưa đặt tên";

        const tenKhoa =
            room.tenKhoa
            ?? room.khoa?.tenKhoa
            ?? "";

        return tenKhoa
            ? `${tenPhong} - ${tenKhoa}`
            : tenPhong;
    }


    function hasBookings(item) {
        return Number(item?.soBenhNhanDaDat || 0) > 0;
    }

    function getBookingStatus(item, isPast = false) {
        if (isPast) {
            return {
                className: "is-past",
                text: "Lịch đã qua"
            };
        }

        if (item?.hetCho === true || item?.hetCho === "true") {
            return {
                className: "is-full",
                text: "Đã hết chỗ"
            };
        }

        if (hasBookings(item)) {
            return {
                className: "is-booked",
                text: "Có bệnh nhân đặt"
            };
        }

        return {
            className: "is-available",
            text: "Còn chỗ"
        };
    }

    // =====================================================
    // THÔNG BÁO
    // =====================================================
    function showToast(message, error = false) {
        const toast = $("toastMessage");
        if (!toast) return;

        toast.textContent = message;
        toast.classList.toggle("error", error);
        toast.hidden = false;

        clearTimeout(toastTimer);

        toastTimer = setTimeout(() => {
            toast.hidden = true;
        }, 3500);
    }

    function showFormError(message) {
        const error = $("formError");
        if (!error) return;

        error.textContent = message || "";
        error.hidden = !message;
    }

    // =====================================================
    // JWT VÀ GỌI API
    // =====================================================
    function findJwtToken() {
        const storages = [localStorage, sessionStorage];

        for (const storage of storages) {
            for (let i = 0; i < storage.length; i++) {
                const key = storage.key(i);
                const value = storage.getItem(key);

                if (!value) continue;

                const token = value.startsWith("Bearer ")
                    ? value.substring(7)
                    : value;

                if (
                    typeof token === "string" &&
                    token.split(".").length === 3
                ) {
                    return token;
                }
            }
        }

        return null;
    }


    async function request(url, options = {}) {
        const token = findJwtToken();

        const headers = {
            Accept: "application/json",
            ...(options.headers || {})
        };

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        if (options.body !== undefined) {
            headers["Content-Type"] = "application/json";
        }

        console.log("[LichLamViec] Bắt đầu request:", url);
        console.log("[LichLamViec] Có JWT:", Boolean(token));

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.error("[LichLamViec] Request timeout:", url);
            controller.abort();
        }, 15000);

        try {
            console.log("[LichLamViec] Đang chờ fetch:", url);

            const response = await fetch(url, {
                ...options,
                credentials: "same-origin",
                headers,
                signal: controller.signal
            });

            console.log(
                "[LichLamViec] Nhận response:",
                url,
                response.status
            );

            const text = await response.text();

            console.log(
                "[LichLamViec] Đã đọc response body:",
                url,
                text.length,
                "ký tự"
            );

            let data = null;

            try {
                data = text ? JSON.parse(text) : null;
            } catch {
                data = text;
            }

            if (!response.ok) {
                console.error(
                    "[LichLamViec] API lỗi:",
                    response.status,
                    url,
                    data
                );

                throw new Error(
                    data?.message ||
                    data?.error ||
                    (typeof data === "string" && data) ||
                    `Yêu cầu thất bại (${response.status})`
                );
            }

            return data;
        } catch (error) {
            if (error.name === "AbortError") {
                throw new Error(
                    `API không phản hồi sau 15 giây: ${url}`
                );
            }

            console.error(
                "[LichLamViec] Lỗi request:",
                url,
                error
            );

            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }


    // =====================================================
    // MODAL
    // =====================================================
    function openModal() {
        if (!modal) return;

        modal.hidden = false;
        document.body.style.overflow = "hidden";
    }

    function closeModal() {
        if (modal) {
            modal.hidden = true;
        }

        document.body.style.overflow = "";
        showFormError("");

        form?.reset();

        if ($("scheduleId")) {
            $("scheduleId").value = "";
        }
    }

    function closeDeleteModal() {
        if (deleteModal) {
            deleteModal.hidden = true;
        }

        document.body.style.overflow = "";
        deletingId = null;
    }

    // =====================================================
    // HIỂN THỊ LỊCH
    // =====================================================

    function renderCalendar(filtered) {
        if (!calendarGrid) return;

        const weekDates = Array.from(
            { length: 7 },
            (_, index) => addDays(currentWeekStart, index)
        );

        const first = weekDates[0];
        const last = weekDates[6];

        if ($("calendarDateRange")) {
            $("calendarDateRange").textContent =
                `${formatDate(toDateString(first))} – ${formatDate(toDateString(last))}`;
        }

        calendarGrid.innerHTML = weekDates.map(date => {
            const dateKey = toDateString(date);

            const todayKey = today();
            const isPast = dateKey < todayKey;

            const dayItems = filtered
                .filter(item =>
                    String(item.ngayLamViec || "").slice(0, 10) === dateKey
                )
                .sort((a, b) =>
                    formatTime(a.gioBatDau).localeCompare(
                        formatTime(b.gioBatDau)
                    )
                );

            const selectedClass =
                dateKey === selectedDate ? " is-selected" : "";

            const todayClass =
                dateKey === today() ? " is-today" : "";

            const events = dayItems.map(item => {
                const isPast = dateKey < today();
                const bookingStatus = getBookingStatus(item, isPast);
                const totalBooked = Number(item.soBenhNhanDaDat || 0);

                const maxBookings = 10;

                const countBadge = `
                    <span class="calendar-event-count"
                          title="${totalBooked}/${maxBookings} lượt đặt">
                        ${totalBooked}/${maxBookings}
                    </span>
                `;

                const eventClass =
                    `calendar-event ${bookingStatus.className}`;

                return `
                    <button
                        type="button"
                        class="${eventClass}"
                        data-select-date="${dateKey}"
                        title="${escapeHtml(
                            `${formatTime(item.gioBatDau)} - ` +
                            `${formatTime(item.gioKetThuc)} · ` +
                            `${roomName(getRoomId(item))} · ` +
                            `${bookingStatus.text} · ` +
                            `${totalBooked} lượt đặt`
                        )}"
                    >
                        <span class="calendar-event-top">
                            <span class="calendar-event-time">
                                ${escapeHtml(formatTime(item.gioBatDau))}
                                – ${escapeHtml(formatTime(item.gioKetThuc))}
                            </span>

                            ${countBadge}
                        </span>

                        <span class="calendar-event-room">
                            <i class="fa-solid fa-door-open"></i>
                            ${escapeHtml(roomName(getRoomId(item)))}
                        </span>

                        ${
                            bookingStatus.className === "is-full"
                                ? `<span class="calendar-event-status">Hết chỗ</span>`
                                : ""
                        }
                    </button>
                `;
            }).join("");

            return `
                <section
                    class="calendar-day${selectedClass}${todayClass}"
                    data-date="${dateKey}"
                >
                    <button
                        type="button"
                        class="calendar-day-heading"
                        data-select-date="${dateKey}"
                    >
                        <span>${escapeHtml(formatDay(date))}</span>
                    </button>

                    <div class="calendar-day-events">
                        ${events}
                    </div>
                </section>
            `;
        }).join("");
    }


    function renderSchedules() {
        const from = $("filterFrom")?.value || "";
        const to = $("filterTo")?.value || "";

        const filtered = schedules
            .filter(item => {
                const date = String(item.ngayLamViec || "").slice(0, 10);

                if (from && date < from) return false;
                if (to && date > to) return false;

                return true;
            })
            .sort((a, b) =>
                `${a.ngayLamViec} ${a.gioBatDau}`.localeCompare(
                    `${b.ngayLamViec} ${b.gioBatDau}`
                )
            );

        if ($("totalSchedules")) {
            $("totalSchedules").textContent = filtered.length;
        }

        if ($("upcomingSchedules")) {
            $("upcomingSchedules").textContent = filtered.filter(item =>
                String(item.ngayLamViec || "").slice(0, 10) >= today()
            ).length;
        }

        if ($("roomCount")) {
            const roomIds = filtered
                .map(getRoomId)
                .filter(id => id !== null && id !== undefined && id !== "");

            $("roomCount").textContent = new Set(
                roomIds.map(String)
            ).size;
        }

        if ($("resultCount")) {
            $("resultCount").textContent = `${filtered.length} lịch`;
        }

        renderCalendar(filtered);
        renderScheduleList(filtered);
    }
    // =====================================================
    // DANH SÁCH LỊCH CỦA NGÀY ĐƯỢC CHỌN
    // =====================================================

    function renderScheduleList(filtered) {
        if (!scheduleListContent) return;

        const grouped = new Map();

        [...filtered]
            .sort((a, b) =>
                `${a.ngayLamViec} ${a.gioBatDau}`.localeCompare(
                    `${b.ngayLamViec} ${b.gioBatDau}`
                )
            )
            .forEach(item => {
                const date = String(item.ngayLamViec || "").slice(0, 10);

                if (!date) return;

                if (!grouped.has(date)) {
                    grouped.set(date, []);
                }

                grouped.get(date).push(item);
            });

        if ($("scheduleListSubtitle")) {
            $("scheduleListSubtitle").textContent =
                $("filterFrom")?.value || $("filterTo")?.value
                    ? "Lịch theo khoảng ngày đã lọc"
                    : "Các ngày có lịch làm việc";
        }

        if ($("resultCount")) {
            $("resultCount").textContent = `${filtered.length} lịch`;
        }

        if (grouped.size === 0) {
            scheduleListContent.innerHTML = `
                <div class="schedule-list-empty">
                    <i class="fa-regular fa-calendar-xmark"></i>
                    <p>Chưa có lịch làm việc trong khoảng thời gian này.</p>
                    <button
                        type="button"
                        class="btn-primary"
                        data-action="add"
                    >
                        <i class="fa-solid fa-plus"></i>
                        Thêm lịch
                    </button>
                </div>
            `;
            return;
        }

        scheduleListContent.innerHTML = [...grouped.entries()]
            .map(([date, items]) => {
                const dayItems = items.map(item => {
                    const id = Number(item.maLichLamViec);
                    const booked = hasBookings(item);
                    const totalBooked = Number(item.soBenhNhanDaDat || 0);

                    const maxBookings = 10;

                    const bookingInfo = `
                        <span class="schedule-booking-count">
                            ${totalBooked}/${maxBookings}
                        </span>
                    `;

                    const isPast = date < today();
                    const bookingStatus = getBookingStatus(item, isPast);

                    let statusClass = "status-active";
                    let statusText = "Đang làm việc";

                    if (bookingStatus.className === "is-past") {
                        statusClass = "status-past";
                        statusText = "Lịch đã qua";
                    } else if (bookingStatus.className === "is-full") {
                        statusClass = "status-full";
                        statusText = "Đã hết chỗ";
                    } else if (bookingStatus.className === "is-booked") {
                        statusClass = "status-booked";
                        statusText = "Có bệnh nhân đặt";
                    }

                    if (isPast) {
                        statusClass = "status-past";
                        statusText = "Lịch đã qua";
                    }else if (booked) {
                        statusClass = "status-booked";
                        statusText = "Có bệnh nhân đặt";
                    }



                    return `
                        <article
                            class="schedule-list-item"
                            data-id="${id}"
                        >
                            <span class="schedule-list-dot ${statusClass}"></span>

                            <div class="schedule-list-main">
                                <div class="schedule-list-time">
                                    ${escapeHtml(formatTime(item.gioBatDau))}
                                    – ${escapeHtml(formatTime(item.gioKetThuc))}
                                </div>

                                <div class="schedule-list-room">
                                    <i class="fa-solid fa-door-open"></i>
                                    ${escapeHtml(roomName(getRoomId(item)))}
                                </div>

                                <span class="schedule-status ${statusClass}">
                                    ${escapeHtml(statusText)}
                                </span>

                                ${bookingInfo}
                            </div>

                            <div class="schedule-list-actions">
                                <button
                                    type="button"
                                    class="icon-button"
                                    data-action="edit"
                                    data-id="${id}"
                                    title="Sửa lịch"
                                    aria-label="Sửa lịch"
                                >
                                    <i class="fa-solid fa-pen"></i>
                                </button>

                                <button
                                    type="button"
                                    class="icon-button danger"
                                    data-action="delete"
                                    data-id="${id}"
                                    title="${booked ? "Lịch đã có bệnh nhân đặt" : "Xóa lịch"}"
                                    aria-label="Xóa lịch"
                                    ${booked ? "disabled" : ""}
                                >
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </article>
                    `;
                }).join("");

                return `
                    <section class="schedule-date-group">
                        <div class="schedule-date-heading">
                            <strong>${escapeHtml(
                                new Date(`${date}T00:00:00`).toLocaleDateString(
                                    "vi-VN",
                                    {
                                        weekday: "long",
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric"
                                    }
                                )
                            )}</strong>

                            <span>${items.length} ca làm việc</span>
                        </div>

                        <div class="schedule-date-items">
                            ${dayItems}
                        </div>
                    </section>
                `;
            }).join("");
    }


    // =====================================================
    // ĐIỀU HƯỚNG TUẦN VÀ CHỌN NGÀY
    // =====================================================
    function changeWeek(offset) {
        currentWeekStart = addDays(
            currentWeekStart,
            offset * 7
        );

        selectedDate = toDateString(currentWeekStart);
        renderSchedules();
    }

    function selectDate(date) {
        selectedDate = date;

        const selected = new Date(`${date}T00:00:00`);
        currentWeekStart = getMonday(selected);

        renderSchedules();
    }

    // =====================================================
    // TẢI DANH SÁCH PHÒNG KHÁM
    // =====================================================
    async function loadRooms() {
        const data = await request(ROOM_API);
        rooms = Array.isArray(data) ? data : [];

        const roomSelect = $("roomId");
        if (!roomSelect) return;

        roomSelect.innerHTML =
            '<option value="">-- Chọn phòng khám --</option>';

        rooms.forEach(room => {
            const option = document.createElement("option");

            option.value = room.maPhong;

            option.textContent =
                `${room.tenPhong || "Phòng khám"}` +
                `${room.tenKhoa ? ` - ${room.tenKhoa}` : ""}`;

            roomSelect.appendChild(option);
        });
    }

    // =====================================================
    // TẢI DANH SÁCH LỊCH LÀM VIỆC
    // =====================================================
    async function loadSchedules() {
        if (scheduleListContent) {
            scheduleListContent.innerHTML =
                '<p class="loading-cell">Đang tải lịch làm việc...</p>';
        }

        console.log("[LichLamViec] Bắt đầu tải lịch");
        console.log("[LichLamViec] API:", API);

        try {
            const data = await request(API);

            console.log("[LichLamViec] Dữ liệu API:", data);
            console.log("[LichLamViec] Có phải mảng:", Array.isArray(data));

            if (!Array.isArray(data)) {
                throw new Error(
                    "API không trả về danh sách lịch dạng mảng."
                );
            }

            schedules = data;
            console.log("[LichLamViec] Số lịch nhận được:", schedules.length);

            renderSchedules();
        } catch (error) {
            console.error("[LichLamViec] Không tải được lịch:", error);

            schedules = [];
            renderSchedules();

            if (scheduleListContent) {
                scheduleListContent.innerHTML = `
                    <p class="loading-cell">
                        Không tải được lịch làm việc:
                        ${escapeHtml(error.message)}
                    </p>
                `;
            }

            showToast(error.message, true);
        }
    }

    // =====================================================
    // THÊM LỊCH LÀM VIỆC
    // =====================================================
    function openCreateForm() {
        if (!form) return;

        form.reset();

        if ($("scheduleId")) {
            $("scheduleId").value = "";
        }

        if ($("modalTitle")) {
            $("modalTitle").textContent = "Thêm lịch làm việc";
        }

        if ($("btnSave")) {
            $("btnSave").innerHTML =
                '<i class="fa-solid fa-floppy-disk"></i> Lưu lịch';
        }

        if ($("workDate")) {
            $("workDate").min = today();
            $("workDate").value = selectedDate;
        }

        showFormError("");
        openModal();
    }

    // =====================================================
    // CHỈNH SỬA LỊCH LÀM VIỆC
    // =====================================================
    function openEditForm(id) {
        const item = schedules.find(
            schedule =>
                Number(schedule.maLichLamViec) === Number(id)
        );

        if (!item) {
            showToast("Không tìm thấy lịch làm việc.", true);
            return;
        }

        if (!form) return;

        form.reset();

        $("scheduleId").value = item.maLichLamViec;
        $("workDate").value =
            String(item.ngayLamViec).slice(0, 10);
        $("startTime").value = formatTime(item.gioBatDau);
        $("endTime").value = formatTime(item.gioKetThuc);
        $("roomId").value = getRoomId(item) ?? "";

        if ($("modalTitle")) {
            $("modalTitle").textContent = "Chỉnh sửa lịch làm việc";
        }

        if ($("btnSave")) {
            $("btnSave").innerHTML =
                '<i class="fa-solid fa-floppy-disk"></i> Cập nhật';
        }

        if ($("workDate")) {
            $("workDate").min = today();
        }

        showFormError("");
        openModal();
    }

    // =====================================================
    // KIỂM TRA DỮ LIỆU FORM
    // =====================================================
    function validateForm() {
        const date = $("workDate")?.value;
        const start = $("startTime")?.value;
        const end = $("endTime")?.value;
        const room = $("roomId")?.value;

        if (!date || !start || !end || !room) {
            return "Vui lòng nhập đầy đủ các trường bắt buộc.";
        }

        if (date < today()) {
            return "Không thể tạo hoặc cập nhật lịch trong quá khứ.";
        }

        if (end <= start) {
            return "Giờ kết thúc phải sau giờ bắt đầu.";
        }

        const selectedRoom = rooms.find(
            item => String(item.maPhong) === String(room)
        );

        if (!selectedRoom) {
            return "Phòng khám không hợp lệ. Vui lòng tải lại trang.";
        }

        // Nếu API trả trạng thái phòng, không cho chọn phòng ngừng hoạt động.
        if (
            selectedRoom.trangThai !== undefined &&
            selectedRoom.trangThai !== null &&
            ![true, 1, "1", "true"].includes(selectedRoom.trangThai)
        ) {
            return "Phòng khám đã ngừng hoạt động.";
        }

        const currentId = $("scheduleId")?.value;

        // Kiểm tra lịch trùng giờ của chính bác sĩ.
        const doctorConflict = schedules.some(item => {
            if (
                currentId &&
                String(item.maLichLamViec) === String(currentId)
            ) {
                return false;
            }

            const sameDate =
                String(item.ngayLamViec || "").slice(0, 10) === date;

            if (!sameDate) return false;

            const existingStart = formatTime(item.gioBatDau);
            const existingEnd = formatTime(item.gioKetThuc);

            return start < existingEnd && end > existingStart;
        });

        if (doctorConflict) {
            return "Bác sĩ đã có lịch làm việc trùng giờ trong ngày này.";
        }

        return "";
    }
    // =====================================================
    // LƯU LỊCH: THÊM HOẶC CẬP NHẬT
    // =====================================================
    async function saveSchedule(event) {
        event.preventDefault();

        const validation = validateForm();

        if (validation) {
            showFormError(validation);
            return;
        }

        const id = $("scheduleId")?.value;

        const payload = {
            ngayLamViec: $("workDate").value,
            gioBatDau: $("startTime").value,
            gioKetThuc: $("endTime").value,
            maPhong: Number($("roomId").value)
        };

        const saveButton = $("btnSave");

        if (saveButton) {
            saveButton.disabled = true;
        }

        try {
            await request(
                id ? `${API}/${id}` : API,
                {
                    method: id ? "PUT" : "POST",
                    body: JSON.stringify(payload)
                }
            );

            closeModal();

            showToast(
                id
                    ? "Cập nhật lịch làm việc thành công."
                    : "Thêm lịch làm việc thành công."
            );

            await loadSchedules();
        } catch (error) {
            showFormError(error.message);
        } finally {
            if (saveButton) {
                saveButton.disabled = false;
            }
        }
    }

    // =====================================================
    // MỞ HỘP THOẠI XÁC NHẬN XÓA
    // =====================================================
    function askDelete(id) {
        const item = schedules.find(
            schedule =>
                Number(schedule.maLichLamViec) === Number(id)
        );

        if (!item) return;

        if (hasBookings(item)) {
            showToast(
                "Lịch đã có bệnh nhân đặt. Không thể xóa trực tiếp.",
                true
            );

            return;
        }

        deletingId = id;

        if ($("deleteMessage")) {
            $("deleteMessage").textContent =
                `Bạn có chắc muốn xóa lịch ngày ` +
                `${formatDate(item.ngayLamViec)}, ` +
                `${formatTime(item.gioBatDau)}–` +
                `${formatTime(item.gioKetThuc)} tại ` +
                `${roomName(getRoomId(item))}?`;
        }

        if (deleteModal) {
            deleteModal.hidden = false;
        }

        document.body.style.overflow = "hidden";
    }

    // =====================================================
    // XÓA LỊCH LÀM VIỆC
    // =====================================================
    async function deleteSchedule() {
        if (!deletingId) return;

        const button = $("btnConfirmDelete");

        if (button) {
            button.disabled = true;
        }

        try {
            await request(`${API}/${deletingId}`, {
                method: "DELETE"
            });

            closeDeleteModal();

            showToast("Xóa lịch làm việc thành công.");

            await loadSchedules();
        } catch (error) {
            closeDeleteModal();
            showToast(error.message, true);
        } finally {
            if (button) {
                button.disabled = false;
            }
        }
    }

    // =====================================================
    // GẮN SỰ KIỆN
    // =====================================================

    // Nút thêm lịch
    $("btnAddSchedule")?.addEventListener(
        "click",
        openCreateForm
    );

    // Nút này có thể không tồn tại trong giao diện mới
    $("btnAddFirst")?.addEventListener(
        "click",
        openCreateForm
    );

    // Modal thêm / sửa
    $("btnCloseModal")?.addEventListener(
        "click",
        closeModal
    );

    $("btnCancel")?.addEventListener(
        "click",
        closeModal
    );

    // Modal xác nhận xóa
    $("btnCancelDelete")?.addEventListener(
        "click",
        closeDeleteModal
    );

    $("btnConfirmDelete")?.addEventListener(
        "click",
        deleteSchedule
    );

    form?.addEventListener(
        "submit",
        saveSchedule
    );

    // Lọc lịch theo ngày
    $("btnFilter")?.addEventListener("click", () => {
        const from = $("filterFrom")?.value || "";
        const to = $("filterTo")?.value || "";

        if (from && to && from > to) {
            showToast(
                "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.",
                true
            );

            return;
        }

        renderSchedules();
    });

    // Đặt lại bộ lọc
    $("btnReset")?.addEventListener("click", () => {
        if ($("filterFrom")) {
            $("filterFrom").value = "";
        }

        if ($("filterTo")) {
            $("filterTo").value = "";
        }

        renderSchedules();
    });

    // Chuyển tuần
    $("btnPrevWeek")?.addEventListener(
        "click",
        () => changeWeek(-1)
    );

    $("btnNextWeek")?.addEventListener(
        "click",
        () => changeWeek(1)
    );

    // Quay về hôm nay
    $("btnToday")?.addEventListener(
        "click",
        () => selectDate(today())
    );

    // Chọn ngày trên lịch tuần
    calendarGrid?.addEventListener("click", event => {
        const target = event.target.closest("[data-select-date]");

        if (target) {
            selectDate(target.dataset.selectDate);
        }
    });

    // Các nút thao tác trong danh sách lịch bên phải
    scheduleListContent?.addEventListener("click", event => {
        const button = event.target.closest("button[data-action]");

        if (!button || button.disabled) return;

        const action = button.dataset.action;
        const id = button.dataset.id;

        if (action === "add") {
            openCreateForm();
        }

        if (action === "edit") {
            openEditForm(id);
        }

        if (action === "delete") {
            askDelete(id);
        }
    });

    // Đóng modal khi bấm ra ngoài
    modal?.addEventListener("click", event => {
        if (event.target === modal) {
            closeModal();
        }
    });

    deleteModal?.addEventListener("click", event => {
        if (event.target === deleteModal) {
            closeDeleteModal();
        }
    });

    // Đóng modal bằng phím Escape
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            if (modal && !modal.hidden) {
                closeModal();
            }

            if (deleteModal && !deleteModal.hidden) {
                closeDeleteModal();
            }
        }
    });

     // =====================================================
     // THOI GIAN
     // =====================================================
    function populateTimeOptions() {
        ["startTime", "endTime"].forEach(id => {
            const select = $(id);

            if (!select || select.tagName !== "SELECT") {
                console.warn(`#${id} chưa phải SELECT.`);
                return;
            }

            const oldValue = select.value;

            select.replaceChildren();

            const placeholder = document.createElement("option");
            placeholder.value = "";
            placeholder.textContent = id === "startTime"
                ? "-- Chọn giờ bắt đầu --"
                : "-- Chọn giờ kết thúc --";

            select.appendChild(placeholder);

            for (let minute = 0; minute < 24 * 60; minute++) {
                const hour = Math.floor(minute / 60);
                const min = minute % 60;

                const time =
                    `${String(hour).padStart(2, "0")}:` +
                    `${String(min).padStart(2, "0")}`;

                const option = document.createElement("option");
                option.value = time;
                option.textContent = time;

                select.appendChild(option);
            }

            if (
                oldValue &&
                [...select.options].some(option => option.value === oldValue)
            ) {
                select.value = oldValue;
            }
        });
    }

    // =====================================================
    // KHỞI TẠO TRANG
    // =====================================================
    // =====================================================
    // KHỞI TẠO TRANG
    // =====================================================
    async function init() {
        console.log("[LichLamViec] Bắt đầu init()");

        populateTimeOptions();

        try {
            console.log("[LichLamViec] Bắt đầu loadRooms()");
            await loadRooms();
            console.log("[LichLamViec] loadRooms() hoàn tất");
        } catch (error) {
            console.error("[LichLamViec] Lỗi loadRooms():", error);

            showToast(
                "Không tải được danh sách phòng khám: " +
                error.message,
                true
            );
        }

        console.log("[LichLamViec] Bắt đầu loadSchedules()");

        try {
            await loadSchedules();
            console.log("[LichLamViec] loadSchedules() hoàn tất");
        } catch (error) {
            console.error("[LichLamViec] Lỗi loadSchedules():", error);
        }

        console.log("[LichLamViec] Kết thúc init()");
    }

    init();
})();