(() => {
    "use strict";

    const $ = id => document.getElementById(id);
    const API = "/api/tiepnhan/dang-ky-kham";

    let searching = false;
    let savingPatient = false;
    let registering = false;
    let loadingSchedules = false;
    let loadingAppointments = false;
    let registrationLocked = false;

    let callingAppointmentId = null;
    let appointmentsDate = null;

    let selectedPatientId = null;
    let selectedPatientName = "";
    let schedules = [];
    let appointments = [];
    let loadedDate = null;
    let loadVersion = 0;
    let openRegistrationAfterCreate = false;

    let profileVersion = 0;
    let profileLoading = false;
    let profileSaving = false;
    let currentProfile = null;
    let currentVisit = null;
    let profileTrigger = null;

    const createElement = $("create-patient-modal");
    const registrationElement = $("registration-modal");
    const profileElement = $("appointment-profile-modal");

    const createModal =
        bootstrap.Modal.getOrCreateInstance(createElement);
    const registrationModal =
        bootstrap.Modal.getOrCreateInstance(registrationElement);
    const profileModal =
        bootstrap.Modal.getOrCreateInstance(profileElement);

    const personalInputIds = [
        "profile-name",
        "profile-birth-date",
        "profile-phone",
        "profile-email",
        "profile-address",
        "profile-emergency-phone",
        "profile-medical-history"
    ];

    const vitalFields = {
        canNang: "profile-weight",
        chieuCao: "profile-height",
        huyetApTamThu: "profile-systolic",
        huyetApTamTruong: "profile-diastolic"
    };

    const callableStatuses = [
        "Chờ gọi",
        "Lịch đã xác nhận",
        "Đã gọi"
    ];

    // =====================================================
    // HÀM DÙNG CHUNG
    // =====================================================

    function getToken() {
        return sessionStorage.getItem("Token")
            || localStorage.getItem("Token")
            || sessionStorage.getItem("token")
            || localStorage.getItem("token");
    }

    function showMessage(id, message = "", type = "danger") {
        const element = $(id);
        if (!element) return;

        element.className = `alert alert-${type}`;
        element.textContent = message;
        element.hidden = !message;
    }

    function setText(id, value) {
        const element = $(id);
        if (!element) return;

        element.textContent =
            value === null || value === undefined || value === ""
                ? "Chưa cung cấp"
                : String(value);
    }

    function setValue(id, value) {
        $(id).value = value ?? "";
    }

    function readValue(id) {
        return $(id).value.trim() || null;
    }

    function positiveId(value) {
        const number = Number(value);

        return Number.isSafeInteger(number) && number > 0
            ? number
            : null;
    }

    function vietnamNow() {
        const parts = new Intl.DateTimeFormat("en-GB", {
            timeZone: "Asia/Ho_Chi_Minh",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23"
        }).formatToParts(new Date());

        const get = type =>
            parts.find(part => part.type === type).value;

        return {
            date: `${get("year")}-${get("month")}-${get("day")}`,
            time: `${get("hour")}:${get("minute")}`
        };
    }

    function todayVietnam() {
        return vietnamNow().date;
    }

    function updateTodayDisplay() {
        const label = new Intl.DateTimeFormat("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }).format(new Date());

        setText("today-display", label);
        setText("header-date-display", label);
    }

    function formatDate(value) {
        if (!value) return "Chưa cung cấp";

        const match = /^(\d{4})-(\d{2})-(\d{2})/
            .exec(String(value));

        return match
            ? `${match[3]}/${match[2]}/${match[1]}`
            : String(value);
    }

    async function requestApi(url, options = {}) {
        const token = getToken();

        if (!token) {
            throw new Error("Vui lòng đăng nhập lại để tiếp tục.");
        }

        const headers = new Headers(options.headers || {});
        headers.set("Accept", "application/json");
        headers.set("Authorization", `Bearer ${token}`);

        if (options.body) {
            headers.set("Content-Type", "application/json");
        }

        const response = await fetch(url, {
            ...options,
            headers
        });

        const responseText = await response.text();
        let data = null;

        try {
            data = responseText ? JSON.parse(responseText) : null;
        } catch {
            const error = new Error(
                "Máy chủ trả về dữ liệu không hợp lệ. "
                + "Vui lòng kiểm tra đăng nhập."
            );
            error.status = response.status;
            throw error;
        }

        if (!response.ok) {
            const fallback = response.status === 401
                ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
                : response.status === 403
                    ? "Bạn không có quyền thực hiện thao tác này."
                    : "Không thể thực hiện yêu cầu.";

            const error = new Error(
                data?.message || data?.detail || fallback
            );
            error.status = response.status;
            throw error;
        }

        if (data === null) {
            const error = new Error("Máy chủ chưa trả về dữ liệu.");
            error.status = response.status;
            throw error;
        }

        return data;
    }

    // =====================================================
    // DANH SÁCH LỊCH KHÁM VÀ BỘ LỌC
    // =====================================================

    function populateFilter(id, values, label) {
        const select = $(id);
        const previous = select.value;

        select.replaceChildren(new Option(label, ""));

        [...new Set(values.filter(Boolean))]
            .sort((a, b) =>
                String(a).localeCompare(String(b), "vi")
            )
            .forEach(value => {
                select.add(new Option(value, value));
            });

        select.value = [...select.options].some(
            option => option.value === previous
        ) ? previous : "";
    }

    function populateDoctorFilter() {
        const department =
            $("appointment-department-filter").value;

        const doctors = appointments
            .filter(item => !department || item.khoa === department)
            .map(item => item.bacSi);

        populateFilter(
            "appointment-doctor-filter",
            doctors,
            "Tất cả bác sĩ"
        );
    }

    function statusClass(status) {
        switch (status) {
            case "Đang khám":
                return "bg-primary-subtle text-primary";
            case "Hoàn tất":
            case "Đã khám":
                return "bg-success-subtle text-success";
            case "Đã hủy":
            case "Không đến":
                return "bg-danger-subtle text-danger";
            case "Đã gọi":
                return "bg-info-subtle text-info-emphasis";
            default:
                return "bg-warning-subtle text-warning-emphasis";
        }
    }

    function createCell(value, className = "") {
        const cell = document.createElement("td");
        cell.className = className;
        cell.textContent = value ?? "—";
        return cell;
    }

    function createDetailCell(primary, secondary) {
        const cell = document.createElement("td");

        const title = document.createElement("div");
        title.className = "appointment-patient-name";
        title.textContent = primary || "Chưa cập nhật";

        const detail = document.createElement("div");
        detail.className = "appointment-secondary-text";
        detail.textContent = secondary || "";

        cell.append(title, detail);
        return cell;
    }

    function renderAppointments() {
        const doctor = $("appointment-doctor-filter").value;
        const department =
            $("appointment-department-filter").value;
        const status = $("appointment-status-filter").value;

        const filtered = appointments.filter(item =>
            (!doctor || item.bacSi === doctor)
            && (!department || item.khoa === department)
            && (!status || item.trangThai === status)
        );

        const body = $("appointments-table-body");
        body.replaceChildren();

        filtered.forEach(item => {
            const row = document.createElement("tr");

            const sequenceCell = document.createElement("td");
            const sequence = document.createElement("span");
            sequence.className = "badge-stt-purple";
            sequence.textContent = item.stt || "—";
            sequence.style.whiteSpace = "nowrap";
            sequence.style.width = "auto";
            sequenceCell.appendChild(sequence);

            const statusCell = document.createElement("td");
            const badge = document.createElement("span");
            badge.className =
                `appointment-status ${statusClass(item.trangThai)}`;
            badge.textContent = item.trangThai || "Chưa cập nhật";
            statusCell.appendChild(badge);

            const actionCell = document.createElement("td");
            actionCell.className = "appointment-profile-column";

            const actions = document.createElement("div");
            actions.className = "appointment-row-actions";

            // Nút loa: gọi hoặc gọi lại.
            if (callableStatuses.includes(item.trangThai)) {
                const callButton = document.createElement("button");
                callButton.type = "button";
                callButton.className = "appointment-call-button";
                callButton.dataset.action = "call-patient";
                callButton.dataset.appointmentId =
                    item.maLichKham ?? "";

                const label = item.trangThai === "Đã gọi"
                    ? "Gọi lại bệnh nhân"
                    : "Gọi bệnh nhân";

                callButton.setAttribute(
                    "aria-label",
                    `${label} ${item.tenBenhNhan || ""}`
                );

                const reason = callUnavailableReason(item);
                callButton.title = reason || label;
                callButton.disabled = !!reason;

                const icon = document.createElement("i");
                icon.className =
                    callingAppointmentId === positiveId(item.maLichKham)
                        ? "fa-solid fa-spinner fa-spin"
                        : "fa-solid fa-volume-high";
                icon.setAttribute("aria-hidden", "true");

                callButton.appendChild(icon);
                actions.appendChild(callButton);
            }

            // Nút xem và chỉnh sửa hồ sơ.
            const profileButton = document.createElement("button");
            profileButton.type = "button";
            profileButton.className =
                "btn btn-outline-primary btn-sm text-nowrap";
            profileButton.textContent = "Hồ sơ";
            profileButton.dataset.patientId = item.maBenhNhan ?? "";
            profileButton.dataset.appointmentId = item.maLichKham ?? "";
            profileButton.dataset.action = "open-profile";

            profileButton.setAttribute(
                "aria-label",
                `Xem hồ sơ ${item.tenBenhNhan || "bệnh nhân"}`
            );

            profileButton.disabled =
                !positiveId(item.maBenhNhan)
                || !positiveId(item.maLichKham)
                || profileLoading
                || profileSaving;

            actions.appendChild(profileButton);
            actionCell.appendChild(actions);

            row.append(
                sequenceCell,
                createCell(item.maLichKham, "fw-semibold text-primary"),
                createDetailCell(
                    item.tenBenhNhan,
                    [item.maBn, item.thongTinPhu]
                        .filter(Boolean).join(" · ")
                ),
                createDetailCell(item.khoa, item.bacSi),
                createCell(item.phong || "Chưa phân công"),
                createCell(item.gioHen || "--:--"),
                statusCell,
                actionCell
            );

            body.appendChild(row);
        });

        $("appointments-empty").hidden = filtered.length > 0;

        $("appointments-empty-message").textContent =
            appointments.length === 0
                ? "Chưa có lịch khám trong ngày."
                : "Không có lịch khám phù hợp với bộ lọc.";

        $("appointments-record-count").textContent =
            `Hiển thị ${filtered.length}/${appointments.length} lịch khám`;
    }

    // =====================================================
    // GỌI BỆNH NHÂN
    // =====================================================

    function callUnavailableReason(item) {
        if (callingAppointmentId !== null) {
            return "Đang gửi yêu cầu gọi bệnh nhân.";
        }

        if (loadingAppointments) {
            return "Đang tải danh sách lịch khám.";
        }

        if (
            profileLoading || profileSaving
            || registering || searching || savingPatient
        ) {
            return "Vui lòng chờ thao tác hiện tại hoàn tất.";
        }

        if (appointmentsDate !== todayVietnam()) {
            return "Hãy làm mới danh sách của ngày hôm nay.";
        }

        if (!positiveId(item?.maLichKham)) {
            return "Mã lịch khám không hợp lệ.";
        }

        if (!callableStatuses.includes(item.trangThai)) {
            return "Trạng thái lịch khám không cho phép gọi.";
        }

        const room = String(item.phong || "").trim();

        if (!room || room === "Chưa phân công") {
            return "Bác sĩ chưa được phân công phòng khám.";
        }

        return "";
    }

    function updateCallButtons() {
        $("appointments-table-body")
            .querySelectorAll('[data-action="call-patient"]')
            .forEach(button => {
                const id = positiveId(button.dataset.appointmentId);
                const item = appointments.find(
                    row => positiveId(row.maLichKham) === id
                );

                const reason = callUnavailableReason(item);
                button.disabled = !!reason;
                button.title = reason || (
                    item.trangThai === "Đã gọi"
                        ? "Gọi lại bệnh nhân"
                        : "Gọi bệnh nhân"
                );

                button.setAttribute(
                    "aria-busy",
                    String(callingAppointmentId === id)
                );

                button.querySelector("i").className =
                    callingAppointmentId === id
                        ? "fa-solid fa-spinner fa-spin"
                        : "fa-solid fa-volume-high";
            });
    }

    function speakPatientAnnouncement(item) {
        if (
            !("speechSynthesis" in window)
            || !("SpeechSynthesisUtterance" in window)
        ) {
            showMessage(
                "page-message",
                "Đã gọi bệnh nhân. Trình duyệt không hỗ trợ phát loa; "
                + "vui lòng gọi trực tiếp.",
                "warning"
            );
            return;
        }

        const sequence = String(item.stt ?? "")
            .replace(/^#/, "")
            .replace(/^0+(?=\d)/, "");

        const queueText = sequence && sequence !== "—"
            ? `, số thứ tự ${sequence}`
            : "";

        const speech = new SpeechSynthesisUtterance(
            `Xin mời bệnh nhân ${item.tenBenhNhan || ""}${queueText}, `
            + `đến khu vực chờ trước ${item.phong}, `
            + `khoa ${item.khoa || ""}, `
            + "để kiểm tra thông tin trước khi khám."
        );

        speech.lang = "vi-VN";
        speech.rate = 0.9;

        const voice = window.speechSynthesis.getVoices().find(
            voice => voice.lang.toLowerCase().startsWith("vi")
        );

        if (voice) speech.voice = voice;

        speech.onerror = event => {
            if (["canceled", "interrupted"].includes(event.error)) return;

            showMessage(
                "page-message",
                "Đã cập nhật trạng thái gọi nhưng không phát được loa. "
                + "Vui lòng kiểm tra âm thanh hoặc gọi trực tiếp.",
                "warning"
            );
        };

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(speech);
    }

    async function callPatient(rawId) {
        const id = positiveId(rawId);
        const item = appointments.find(
            row => positiveId(row.maLichKham) === id
        );

        const reason = callUnavailableReason(item);

        if (reason) {
            showMessage("page-message", reason, "warning");
            return;
        }

        callingAppointmentId = id;
        updateCallButtons();
        $("refresh-appointments-button").disabled = true;
        showMessage("page-message", "");

        try {
            const result = await requestApi(
                "/api/tiepnhan/call-patient",
                {
                    method: "POST",
                    body: JSON.stringify({ maLichKham: id })
                }
            );

            if (result.success !== true) {
                throw new Error(
                    result.message
                    || "Máy chủ chưa xác nhận gọi bệnh nhân."
                );
            }

            item.trangThai = "Đã gọi";
            renderAppointments();

            showMessage(
                "page-message",
                `Đã gọi bệnh nhân ${result.tenBenhNhan || item.tenBenhNhan || ""}.`,
                "success"
            );

            speakPatientAnnouncement({
                ...item,
                stt: result.soThuTu ?? item.stt,
                tenBenhNhan: result.tenBenhNhan ?? item.tenBenhNhan,
                phong: result.phong ?? item.phong,
                khoa: result.khoa ?? item.khoa
            });

            await loadAppointments();
        } catch (error) {
            const uncertain =
                !error.status || error.status >= 500
                || (error.status >= 200 && error.status < 300);

            showMessage(
                "page-message",
                error.message + (
                    uncertain
                        ? " Hãy làm mới để kiểm tra trạng thái trước khi gọi lại."
                        : ""
                )
            );
        } finally {
            callingAppointmentId = null;
            $("refresh-appointments-button").disabled =
                loadingAppointments;
            updateCallButtons();
        }
    }

    async function loadAppointments() {
        if (loadingAppointments) return false;

        loadingAppointments = true;
        $("refresh-appointments-button").disabled = true;
        updateTodayDisplay();
        updateCallButtons();

        const requestedDate = todayVietnam();

        try {
            const data = await requestApi(
                "/api/tiepnhan/dashboard-data"
            );

            if (!Array.isArray(data.hangDoiKham)) {
                throw new Error(
                    "Danh sách lịch khám trả về không hợp lệ."
                );
            }

            appointmentsDate = requestedDate;

            appointments = [...data.hangDoiKham].sort((a, b) => {
                const timeA = /^\d{2}:\d{2}$/.test(a.gioHen || "")
                    ? a.gioHen : "99:99";
                const timeB = /^\d{2}:\d{2}$/.test(b.gioHen || "")
                    ? b.gioHen : "99:99";

                return timeA.localeCompare(timeB)
                    || Number(a.maLichKham) - Number(b.maLichKham);
            });

            populateFilter(
                "appointment-department-filter",
                appointments.map(item => item.khoa),
                "Tất cả khoa"
            );

            populateFilter(
                "appointment-status-filter",
                appointments.map(item => item.trangThai),
                "Tất cả trạng thái"
            );

            populateDoctorFilter();
            renderAppointments();
            return true;
        } catch (error) {
            if (appointments.length === 0) {
                $("appointments-empty").hidden = false;
                $("appointments-empty-message").textContent =
                    "Chưa tải được danh sách lịch khám.";
                $("appointments-record-count").textContent =
                    "Dữ liệu chưa được cập nhật.";
            }

            showMessage(
                "page-message",
                error.message + " Danh sách chưa được cập nhật."
            );
            return false;
        } finally {
            loadingAppointments = false;
            $("refresh-appointments-button").disabled =
                callingAppointmentId !== null;
            updateCallButtons();
        }
    }

    // =====================================================
    // NGÀY SINH: DD/MM/YYYY
    // =====================================================

    function readBirthDate(
        inputId = "new-birth-date",
        optional = false
    ) {
        const value = readValue(inputId);
        if (optional && !value) return null;

        const match = /^([0-9]{2})\/([0-9]{2})\/([0-9]{4})$/
            .exec(value || "");

        if (!match) {
            throw new Error("Nhập đủ ngày sinh theo dạng dd/mm/yyyy.");
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
            throw new Error("Ngày sinh không hợp lệ.");
        }

        const iso = `${match[3]}-${match[2]}-${match[1]}`;

        if (iso > todayVietnam()) {
            throw new Error(
                "Ngày sinh không được lớn hơn ngày hiện tại."
            );
        }

        return iso;
    }

    function initBirthDateInput(options = {}) {
        const inputId = options.inputId || "new-birth-date";
        const pickerId = options.pickerId || "birth-date-picker";
        const buttonId = options.buttonId || "open-birth-calendar";
        const formId = options.formId || "create-patient-form";
        const messageId = options.messageId || "create-patient-message";
        const modalElement = options.modalElement || createElement;
        const isBusy = options.isBusy || (() => savingPatient);

        const input = $(inputId);
        const picker = $(pickerId);

        const digitsOnly = value =>
            String(value).replace(/[^0-9]/g, "");

        function render(digits, position) {
            const output = [
                digits.slice(0, 2),
                digits.slice(2, 4),
                digits.slice(4, 8)
            ].filter(Boolean).join("/");

            input.value = output;

            let cursor = 0;
            let count = 0;

            while (cursor < output.length && count < position) {
                if (/[0-9]/.test(output[cursor])) count++;
                cursor++;
            }

            if (output[cursor] === "/") cursor++;
            input.setSelectionRange(cursor, cursor);
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
                    8 - (digits.length - (to - from))
                );
                const added = digitsOnly(inserted).slice(0, available);

                digits = digits.slice(0, from)
                    + added + digits.slice(to);
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

        function normalize() {
            const cursor = input.selectionStart ?? input.value.length;

            render(
                digitsOnly(input.value).slice(0, 8),
                digitsOnly(input.value.slice(0, cursor)).length
            );
        }

        function syncPicker() {
            try {
                picker.value = readBirthDate(inputId, true) || "";
            } catch {
                picker.value = "";
            }
        }

        input.addEventListener("beforeinput", event => {
            if (!event.cancelable || event.isComposing) return;

            if (
                ["insertText", "insertReplacementText"]
                    .includes(event.inputType)
            ) {
                if (event.data === null) return;
                event.preventDefault();
                edit("insert", event.data);
                return;
            }

            if (
                [
                    "deleteContentBackward",
                    "deleteWordBackward",
                    "deleteSoftLineBackward"
                ].includes(event.inputType)
            ) {
                event.preventDefault();

                if (event.inputType !== "deleteContentBackward") {
                    input.setSelectionRange(
                        0,
                        input.selectionEnd ?? 0
                    );
                }

                edit("backward");
                return;
            }

            if (
                [
                    "deleteContentForward",
                    "deleteWordForward",
                    "deleteSoftLineForward"
                ].includes(event.inputType)
            ) {
                event.preventDefault();

                if (event.inputType !== "deleteContentForward") {
                    input.setSelectionRange(
                        input.selectionStart ?? 0,
                        input.value.length
                    );
                }

                edit("forward");
            }
        });

        input.addEventListener("paste", event => {
            if (!event.clipboardData) return;
            event.preventDefault();
            edit("insert", event.clipboardData.getData("text"));
        });

        input.addEventListener("input", event => {
            if (!event.isComposing) normalize();
        });

        input.addEventListener("compositionend", normalize);
        input.addEventListener("blur", syncPicker);

        $(buttonId).addEventListener("click", () => {
            if (isBusy()) return;

            picker.max = todayVietnam();
            syncPicker();

            try {
                if (typeof picker.showPicker === "function") {
                    picker.showPicker();
                    return;
                }
            } catch {
                // Có thể tiếp tục nhập ngày sinh bằng bàn phím.
            }

            showMessage(
                messageId,
                "Trình duyệt chưa mở được lịch. Bạn có thể nhập dd/mm/yyyy.",
                "info"
            );
            input.focus();
        });

        picker.addEventListener("change", () => {
            if (!picker.value) return;

            const [year, month, day] = picker.value.split("-");
            input.value = `${day}/${month}/${year}`;

            showMessage(messageId, "");
            input.focus();
            input.setSelectionRange(
                input.value.length,
                input.value.length
            );
        });

        $(formId).addEventListener("reset", () => {
            picker.value = "";
        });

        modalElement.addEventListener("show.bs.modal", () => {
            picker.max = todayVietnam();
            syncPicker();
        });

        picker.max = todayVietnam();
    }

    // =====================================================
    // TRẠNG THÁI FORM ĐĂNG KÝ
    // =====================================================

    function selectedSchedule() {
        return schedules.find(item =>
            Number(item.maLichLamViec)
                === Number($("schedule-select").value)
        );
    }

    function updateControls() {
        updateCallButtons();

        const busy =
            searching || savingPatient || registering || profileSaving;

        $("patient-search-input").disabled = busy;
        $("patient-search-button").disabled = busy;
        $("open-create-patient").disabled = busy;

        $("patient-search-button").querySelector("i").className =
            searching
                ? "fa-solid fa-spinner fa-spin"
                : "fa-solid fa-magnifying-glass";

        $("patient-search-button").setAttribute(
            "aria-label",
            searching ? "Đang tra cứu bệnh nhân" : "Tra cứu bệnh nhân"
        );
        $("patient-search-button").setAttribute(
            "aria-busy",
            String(searching)
        );

        $("create-patient-fields").disabled = savingPatient;
        $("create-patient-save").disabled = savingPatient;
        $("create-patient-close").disabled = savingPatient;

        $("create-patient-save").textContent =
            savingPatient ? "Đang lưu…" : "Lưu hồ sơ";

        $("registration-close").disabled = registering;

        $("registration-fields").disabled =
            busy || loadingSchedules || registrationLocked;

        $("department-select").disabled =
            busy || loadingSchedules || registrationLocked
            || $("department-select").options.length <= 1;

        $("schedule-select").disabled =
            busy || loadingSchedules || registrationLocked
            || schedules.length === 0;

        $("appointment-time").disabled =
            busy || loadingSchedules || registrationLocked
            || !selectedSchedule();

        $("register-button").disabled =
            busy || loadingSchedules || registrationLocked
            || !selectedPatientId || !selectedSchedule();

        $("register-button").textContent = registering
            ? "Đang đăng ký…"
            : "Đăng ký và cấp số chờ";

        $("reload-schedules").disabled =
            busy || loadingSchedules || registrationLocked
            || !selectedPatientId;
    }

    function resetSelect(id, placeholder) {
        $(id).replaceChildren(new Option(placeholder, ""));
    }

    function resetRegistration() {
        loadVersion++;
        schedules = [];
        loadedDate = null;
        loadingSchedules = false;
        registrationLocked = false;

        $("registration-form").reset();
        resetSelect("department-select", "Chọn khoa");
        resetSelect("schedule-select", "Chọn khoa trước");

        $("schedule-summary").hidden = true;
        $("queue-ticket").hidden = true;

        $("appointment-time").removeAttribute("min");
        $("appointment-time").removeAttribute("max");
        $("appointment-time").setCustomValidity("");

        $("appointment-time-help").textContent =
            "Chọn bác sĩ để xem giờ có thể đăng ký.";

        showMessage("registration-message", "");
        updateControls();
    }

    function clearSelectedPatient() {
        selectedPatientId = null;
        selectedPatientName = "";
        resetRegistration();

        $("selected-patient").hidden = true;
        $("patient-empty").hidden = false;
        $("registration-area").hidden = true;
        $("registration-empty").hidden = false;
    }

    function selectPatient(patient) {
        selectedPatientId = positiveId(
            patient.maBenhNhan ?? patient.MaBenhNhan
        );

        if (!selectedPatientId) {
            throw new Error("Mã bệnh nhân không hợp lệ.");
        }

        selectedPatientName = patient.hoTen || "Bệnh nhân";
        resetRegistration();

        setText("selected-id", `Mã bệnh nhân: ${selectedPatientId}`);
        setText("selected-name", selectedPatientName);
        setText("selected-birth-date", formatDate(patient.ngaySinh));
        setText("selected-gender", patient.gioiTinh);
        setText("selected-phone", patient.soDienThoai);
        setText("selected-address", patient.diaChi);

        $("selected-patient").hidden = false;
        $("patient-empty").hidden = true;
        $("registration-area").hidden = false;
        $("registration-empty").hidden = true;

        void loadDepartments();
    }

    // =====================================================
    // TRA CỨU VÀ TẠO BỆNH NHÂN
    // =====================================================

    async function searchPatient(event) {
        event.preventDefault();

        if (
            searching || savingPatient || registering || profileSaving
        ) {
            return;
        }

        if (!$("patient-search-form").reportValidity()) return;

        const keyword = readValue("patient-search-input");
        if (!keyword) return;

        searching = true;
        showMessage("page-message", "");
        clearSelectedPatient();
        updateControls();

        try {
            const result = await requestApi(
                "/api/tiepnhan/patient-search?keyword="
                + encodeURIComponent(keyword)
            );

            const id = positiveId(
                result.maBenhNhan ?? result.MaBenhNhan
            );

            if (!id) {
                throw new Error(
                    "Kết quả tra cứu không có mã bệnh nhân hợp lệ."
                );
            }

            const patient = await requestApi(
                `/api/tiepnhan/ho-so-benh-nhan/${id}`
            );

            selectPatient(patient);
            registrationModal.show();
        } catch (error) {
            showMessage("page-message", error.message);
        } finally {
            searching = false;
            updateControls();
        }
    }

    async function savePatient(event) {
        event.preventDefault();
        if (savingPatient || searching || registering) return;

        const form = $("create-patient-form");
        showMessage("create-patient-message", "");

        if (!form.reportValidity()) return;

        let ngaySinh;

        try {
            ngaySinh = readBirthDate();
        } catch (error) {
            showMessage("create-patient-message", error.message);
            $("new-birth-date").focus();
            return;
        }

        const payload = {
            hoTen: readValue("new-name"),
            ngaySinh,
            gioiTinh: readValue("new-gender"),
            soDienThoai: readValue("new-phone"),
            email: readValue("new-email"),
            diaChi: readValue("new-address"),
            soDienThoaiKhanCap: readValue("new-emergency-phone"),
            tienSuBenh: readValue("new-medical-history")
        };

        if (!payload.hoTen) {
            showMessage("create-patient-message", "Vui lòng nhập họ tên.");
            $("new-name").focus();
            return;
        }

        savingPatient = true;
        updateControls();

        try {
            const result = await requestApi(
                "/api/tiepnhan/benh-nhan",
                {
                    method: "POST",
                    body: JSON.stringify(payload)
                }
            );

            const id = positiveId(result.maBenhNhan);

            if (!id) {
                throw new Error(
                    "Phản hồi không có mã bệnh nhân. "
                    + "Hãy tra cứu trước khi tạo lại."
                );
            }

            selectPatient({ ...payload, maBenhNhan: id });
            $("patient-search-input").value = id;

            savingPatient = false;
            updateControls();
            openRegistrationAfterCreate = true;

            createModal.hide();
            form.reset();

            showMessage(
                "page-message",
                `Đã lưu hồ sơ ${payload.hoTen}, mã ${id}.`,
                "success"
            );
        } catch (error) {
            showMessage(
                "create-patient-message",
                error.message
                + " Nếu kết nối gián đoạn, hãy tra cứu lại "
                + "để kiểm tra hồ sơ đã lưu chưa."
            );
        } finally {
            savingPatient = false;
            updateControls();
        }
    }

    // =====================================================
    // KHOA VÀ CA LÀM VIỆC BÁC SĨ
    // =====================================================

    async function loadDepartments() {
        if (
            !selectedPatientId || registering || registrationLocked
        ) {
            return;
        }

        const version = ++loadVersion;
        loadingSchedules = true;
        schedules = [];
        loadedDate = null;

        resetSelect("department-select", "Đang tải khoa…");
        resetSelect("schedule-select", "Chọn khoa trước");

        $("schedule-summary").hidden = true;
        $("appointment-time").value = "";
        $("appointment-time").setCustomValidity("");
        $("registration-date").value = formatDate(todayVietnam());

        showMessage("registration-message", "");
        updateControls();

        try {
            const requestedDate = todayVietnam();
            const departments = await requestApi(`${API}/khoa`);

            if (version !== loadVersion) return;

            if (!Array.isArray(departments)) {
                throw new Error("Danh sách khoa không hợp lệ.");
            }

            if (requestedDate !== todayVietnam()) {
                throw new Error(
                    "Ngày đã thay đổi. Hãy tải lại lịch bác sĩ."
                );
            }

            loadedDate = requestedDate;
            resetSelect("department-select", "Chọn khoa");

            departments.forEach(item => {
                $("department-select").add(
                    new Option(item.tenKhoa, String(item.maKhoa))
                );
            });

            if (!departments.length) {
                showMessage(
                    "registration-message",
                    "Hôm nay không còn ca làm việc phù hợp để đăng ký.",
                    "info"
                );
            }
        } catch (error) {
            if (version !== loadVersion) return;
            resetSelect("department-select", "Chưa tải được khoa");
            showMessage("registration-message", error.message);
        } finally {
            if (version === loadVersion) {
                loadingSchedules = false;
                updateControls();
            }
        }
    }

    async function loadDoctorSchedules() {
        if (registering || registrationLocked) return;

        const version = ++loadVersion;
        const maKhoa = Number($("department-select").value);
        schedules = [];

        $("schedule-summary").hidden = true;
        $("appointment-time").value = "";
        $("appointment-time").setCustomValidity("");
        $("appointment-time-help").textContent =
            "Chọn bác sĩ để xem giờ có thể đăng ký.";

        showMessage("registration-message", "");

        if (!maKhoa) {
            resetSelect("schedule-select", "Chọn khoa trước");
            loadingSchedules = false;
            updateControls();
            return;
        }

        loadingSchedules = true;
        resetSelect("schedule-select", "Đang tải lịch bác sĩ…");
        updateControls();

        try {
            if (loadedDate !== todayVietnam()) {
                throw new Error(
                    "Ngày đã thay đổi. Hãy tải lại lịch bác sĩ."
                );
            }

            const data = await requestApi(
                `${API}/lich-bac-si?maKhoa=${maKhoa}`
            );

            if (version !== loadVersion) return;

            if (!Array.isArray(data)) {
                throw new Error("Danh sách lịch bác sĩ không hợp lệ.");
            }

            schedules = data;
            resetSelect("schedule-select", "Chọn bác sĩ và ca làm việc");

            schedules.forEach(item => {
                $("schedule-select").add(new Option(
                    `${item.tenBacSi} — `
                    + `${item.gioBatDau}–${item.gioKetThuc} — `
                    + `${item.tenPhong}`,
                    String(item.maLichLamViec)
                ));
            });

            if (!schedules.length) {
                showMessage(
                    "registration-message",
                    "Khoa này không còn ca làm việc phù hợp hôm nay.",
                    "info"
                );
            }
        } catch (error) {
            if (version !== loadVersion) return;

            schedules = [];
            resetSelect("schedule-select", "Chưa có lịch bác sĩ");
            showMessage("registration-message", error.message);
        } finally {
            if (version === loadVersion) {
                loadingSchedules = false;
                updateControls();
            }
        }
    }

    function toMinutes(value) {
        const match = /^([0-9]{2}):([0-9]{2})/
            .exec(String(value || ""));

        if (!match) return NaN;

        const hour = Number(match[1]);
        const minute = Number(match[2]);

        return hour <= 23 && minute <= 59
            ? hour * 60 + minute
            : NaN;
    }

    function minuteText(value) {
        return `${String(Math.floor(value / 60)).padStart(2, "0")}:`
            + String(value % 60).padStart(2, "0");
    }

    function scheduleBounds(schedule) {
        const now = vietnamNow();
        const start = toMinutes(schedule.gioBatDau);
        const end = toMinutes(schedule.gioKetThuc);
        const current = toMinutes(now.time);

        if (
            loadedDate !== now.date
            || schedule.ngayLamViec !== now.date
            || !Number.isFinite(start)
            || !Number.isFinite(end)
            || end <= start
        ) {
            throw new Error(
                "Ca làm việc không phù hợp. Hãy tải lại lịch."
            );
        }

        const minimum = Math.max(start, current);
        const maximum = end - 1;

        if (minimum > maximum) {
            throw new Error("Ca làm việc đã hết giờ đăng ký.");
        }

        return { minimum, maximum };
    }

    function onScheduleChange() {
        $("appointment-time").value = "";
        $("appointment-time").setCustomValidity("");
        showMessage("registration-message", "");

        const schedule = selectedSchedule();
        $("schedule-summary").hidden = !schedule;

        if (!schedule) {
            $("appointment-time-help").textContent =
                "Chọn bác sĩ để xem giờ có thể đăng ký.";
            updateControls();
            return;
        }

        setText("schedule-doctor", schedule.tenBacSi);
        setText("schedule-room", schedule.tenPhong);
        setText(
            "schedule-hours",
            `${schedule.gioBatDau}–${schedule.gioKetThuc}`
        );

        try {
            const { minimum, maximum } = scheduleBounds(schedule);
            $("appointment-time").min = minuteText(minimum);
            $("appointment-time").max = minuteText(maximum);
            $("appointment-time-help").textContent =
                `Có thể đăng ký từ ${minuteText(minimum)} `
                + `đến ${minuteText(maximum)}.`;
        } catch (error) {
            showMessage("registration-message", error.message);
        }

        updateControls();
    }

    // =====================================================
    // ĐĂNG KÝ KHÁM VÀ CẤP SỐ CHỜ
    // =====================================================

    async function registerAppointment(event) {
        event.preventDefault();

        if (
            registering || searching || savingPatient
            || loadingSchedules || registrationLocked || profileSaving
        ) {
            return;
        }

        showMessage("registration-message", "");
        $("appointment-time").setCustomValidity("");

        if (!selectedPatientId) {
            showMessage(
                "registration-message",
                "Vui lòng chọn bệnh nhân."
            );
            return;
        }

        const schedule = selectedSchedule();

        if (!schedule || !$("registration-form").reportValidity()) {
            return;
        }

        const time = readValue("appointment-time");

        try {
            const { minimum, maximum } = scheduleBounds(schedule);
            const chosen = toMinutes(time);

            if (
                !/^[0-9]{2}:[0-9]{2}$/.test(time || "")
                || !Number.isFinite(chosen)
                || chosen < minimum || chosen > maximum
            ) {
                throw new Error(
                    `Chọn giờ từ ${minuteText(minimum)} `
                    + `đến ${minuteText(maximum)}.`
                );
            }
        } catch (error) {
            showMessage("registration-message", error.message);
            return;
        }

        const departmentName =
            $("department-select").selectedOptions[0].textContent;

        const payload = {
            maBenhNhan: selectedPatientId,
            maKhoa: Number($("department-select").value),
            maBacSi: Number(schedule.maBacSi),
            maLichLamViec: Number(schedule.maLichLamViec),
            gioKham: time,
            lyDoKham: readValue("appointment-reason")
        };

        registering = true;
        updateControls();

        try {
            const result = await requestApi(API, {
                method: "POST",
                body: JSON.stringify(payload)
            });

            registrationLocked = true;

            const number = positiveId(result.soThuTu);
            const appointmentId = positiveId(result.maLichKham);

            if (!number || !appointmentId) {
                throw new Error(
                    "Phản hồi thành công nhưng thiếu thông tin số chờ. "
                    + "Hãy kiểm tra danh sách trước khi đăng ký lại."
                );
            }

            setText(
                "ticket-number",
                `#${String(number).padStart(3, "0")}`
            );
            setText("ticket-patient", selectedPatientName);
            setText("ticket-department", `Khoa: ${departmentName}`);
            setText("ticket-doctor", `Bác sĩ: ${schedule.tenBacSi}`);
            setText("ticket-room", `Phòng: ${schedule.tenPhong}`);
            setText(
                "ticket-time",
                `${formatDate(result.ngayKham)} — `
                + String(result.gioKham).slice(0, 5)
            );

            $("queue-ticket").hidden = false;

            showMessage(
                "registration-message",
                `Đã tạo lịch khám mã ${appointmentId}.`,
                "success"
            );

            void loadAppointments();
        } catch (error) {
            if (
                registrationLocked
                || !error.status || error.status >= 500
                || error.status === 200 || error.status === 201
            ) {
                registrationLocked = true;
                showMessage(
                    "registration-message",
                    error.message
                    + " Hãy kiểm tra danh sách trước khi đăng ký lại."
                );
                void loadAppointments();
            } else {
                showMessage("registration-message", error.message);
            }
        } finally {
            registering = false;
            updateControls();
        }
    }

    // =====================================================
    // XEM VÀ CHỈNH SỬA HỒ SƠ
    // =====================================================

    function canEditVitals() {
        if (!currentVisit) return false;

        const date =
            String(currentVisit.ngayKham || "").slice(0, 10);
        const status = currentVisit.trangThai;

        return date === todayVietnam()
            && (status === "Đã gọi" || status === "DaGoi");
    }

    function updateProfileControls() {
        updateCallButtons();

        const busy = profileLoading || profileSaving;
        const canEdit = !!currentProfile && !busy;

        $("appointment-profile-loading").hidden = !profileLoading;
        $("appointment-profile-fields").disabled = !canEdit;

        personalInputIds.forEach(id => {
            $(id).readOnly = !canEdit;
        });

        $("profile-gender").disabled = !canEdit;
        $("profile-open-birth-calendar").disabled = !canEdit;
        $("profile-birth-date-picker").disabled = !canEdit;
        $("profile-vitals-fields").disabled =
            !canEdit || !canEditVitals();

        $("appointment-profile-close").disabled = profileSaving;
        $("appointment-profile-save").disabled = !canEdit;
        $("appointment-profile-save").textContent =
            profileSaving ? "Đang lưu…" : "Lưu hồ sơ";

        $("appointment-profile-form").setAttribute(
            "aria-busy",
            String(busy)
        );

        document.querySelectorAll(
            '[data-action="open-profile"]'
        ).forEach(button => {
            button.disabled =
                busy
                || !positiveId(button.dataset.patientId)
                || !positiveId(button.dataset.appointmentId);
        });
    }

    function clearProfile() {
        currentProfile = null;
        currentVisit = null;
        $("appointment-profile-form").reset();

        setText("profile-patient-code", "—");
        setText("profile-patient-heading", "Đang tải...");

        [
            "code", "sequence", "date", "time", "department",
            "doctor", "room", "status", "reason"
        ].forEach(field => {
            setText(`profile-visit-${field}`, "—");
        });

        $("profile-vitals-note").textContent = "";

        profileElement.querySelectorAll("details").forEach(details => {
            details.open = false;
        });

        showMessage("appointment-profile-message", "");
    }

    function fillProfile(patient, visit) {
        currentProfile = patient;
        currentVisit = visit;

        setValue("profile-patient-id", patient.maBenhNhan);
        setValue("profile-appointment-id", visit.maLichKham);
        setText(
            "profile-patient-code",
            `Mã BN: ${patient.maBenhNhan}`
        );
        setText("profile-patient-heading", patient.hoTen);

        setValue("profile-name", patient.hoTen);
        setValue(
            "profile-birth-date",
            patient.ngaySinh ? formatDate(patient.ngaySinh) : ""
        );
        setValue("profile-gender", patient.gioiTinh);
        setValue("profile-phone", patient.soDienThoai);
        setValue("profile-email", patient.email);
        setValue("profile-address", patient.diaChi);
        setValue("profile-emergency-phone", patient.soDienThoaiKhanCap);
        setValue("profile-medical-history", patient.tienSuBenh);

        setText("profile-visit-code", visit.maLichKham);
        setText(
            "profile-visit-sequence",
            positiveId(visit.soThuTu)
                ? `#${String(visit.soThuTu).padStart(3, "0")}`
                : "—"
        );
        setText("profile-visit-date", formatDate(visit.ngayKham));
        setText(
            "profile-visit-time",
            visit.gioKham ? String(visit.gioKham).slice(0, 5) : "—"
        );
        setText("profile-visit-department", visit.khoa);
        setText("profile-visit-doctor", visit.bacSi);
        setText("profile-visit-room", visit.phong || "Chưa phân công");
        setText("profile-visit-status", visit.trangThai);
        setText("profile-visit-reason", visit.lyDoKham);

        Object.entries(vitalFields).forEach(([key, id]) => {
            setValue(id, visit[key]);
        });

        $("profile-vitals-note").textContent = canEditVitals()
            ? "Có thể nhập và lưu số đo cho lượt khám đã gọi hôm nay."
            : "Số đo chỉ xem. Bạn vẫn có thể cập nhật thông tin cá nhân.";
    }

    async function openProfile(patientId, appointmentId, trigger) {
        if (
            profileSaving || profileLoading
            || searching || savingPatient || registering
        ) {
            return;
        }

        const id = positiveId(patientId);
        const visitId = positiveId(appointmentId);

        if (!id || !visitId) {
            showMessage(
                "page-message",
                "Mã bệnh nhân hoặc lịch khám không hợp lệ."
            );
            return;
        }

        const version = ++profileVersion;
        profileTrigger = trigger;
        clearProfile();

        profileLoading = true;
        updateProfileControls();
        profileModal.show();

        try {
            const patient = await requestApi(
                `/api/tiepnhan/ho-so-benh-nhan/${id}`
            );

            if (version !== profileVersion) return;

            if (
                positiveId(patient.maBenhNhan) !== id
                || !Array.isArray(patient.danhSachLanKham)
            ) {
                throw new Error(
                    "Dữ liệu hồ sơ bệnh nhân không hợp lệ."
                );
            }

            const visit = patient.danhSachLanKham.find(
                item => positiveId(item.maLichKham) === visitId
            );

            if (!visit) {
                throw new Error(
                    "Không tìm thấy lượt khám trong hồ sơ bệnh nhân."
                );
            }

            fillProfile(patient, visit);

            showMessage(
                "appointment-profile-message",
                "Bạn có thể chỉnh sửa thông tin bệnh nhân "
                + "và bấm Lưu hồ sơ.",
                "info"
            );
        } catch (error) {
            if (version !== profileVersion) return;
            showMessage("appointment-profile-message", error.message);
        } finally {
            if (version === profileVersion) {
                profileLoading = false;
                updateProfileControls();
            }
        }
    }

    // =====================================================
    // KIỂM TRA THÔNG TIN CÁ NHÂN
    // =====================================================

    function readPersonalProfile() {
        const payload = {
            hoTen: readValue("profile-name"),
            ngaySinh: readBirthDate("profile-birth-date", true),
            gioiTinh: readValue("profile-gender"),
            soDienThoai: readValue("profile-phone"),
            email: readValue("profile-email"),
            diaChi: readValue("profile-address"),
            soDienThoaiKhanCap: readValue("profile-emergency-phone"),
            tienSuBenh: readValue("profile-medical-history")
        };

        if (!payload.hoTen) {
            throw new Error("Vui lòng nhập họ tên bệnh nhân.");
        }

        for (const [key, label, limit] of [
            ["hoTen", "Họ tên", 255],
            ["diaChi", "Địa chỉ", 255],
            ["email", "Email", 255]
        ]) {
            if (payload[key] && [...payload[key]].length > limit) {
                throw new Error(
                    `${label} không được vượt quá ${limit} ký tự.`
                );
            }
        }

        if (
            payload.gioiTinh
            && !["Nam", "Nữ", "Khác"].includes(payload.gioiTinh)
        ) {
            throw new Error("Giới tính phải là Nam, Nữ hoặc Khác.");
        }

        for (const [key, label] of [
            ["soDienThoai", "Số điện thoại"],
            ["soDienThoaiKhanCap", "Số điện thoại khẩn cấp"]
        ]) {
            if (
                payload[key]
                && !/^\+?[0-9]{9,14}$/.test(payload[key])
            ) {
                throw new Error(
                    `${label} phải gồm 9 đến 14 chữ số, `
                    + "có thể bắt đầu bằng +."
                );
            }
        }

        if (
            payload.email
            && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)
        ) {
            throw new Error("Email không đúng định dạng.");
        }

        if (
            payload.tienSuBenh
            && new TextEncoder().encode(payload.tienSuBenh).length > 65535
        ) {
            throw new Error("Nội dung tiền sử bệnh quá dài.");
        }

        return payload;
    }

    function personalProfileChanged(payload) {
        return Object.keys(payload).some(key => {
            const old = currentProfile[key];

            const normalized = key === "ngaySinh"
                ? (old ? String(old).slice(0, 10) : null)
                : (old == null ? null : String(old).trim() || null);

            return payload[key] !== normalized;
        });
    }

    function applyPersonalProfile(payload) {
        Object.assign(currentProfile, payload);
        setText("profile-patient-heading", payload.hoTen);

        if (
            selectedPatientId === positiveId(currentProfile.maBenhNhan)
        ) {
            selectedPatientName = payload.hoTen;

            setText("selected-name", payload.hoTen);
            setText("selected-birth-date", formatDate(payload.ngaySinh));
            setText("selected-gender", payload.gioiTinh);
            setText("selected-phone", payload.soDienThoai);
            setText("selected-address", payload.diaChi);
        }
    }

    // =====================================================
    // KIỂM TRA SỐ ĐO
    // =====================================================

    function readOptionalNumber(id) {
        const input = $(id);

        if (input.validity.badInput) {
            throw new Error("Số đo phải là số hợp lệ.");
        }

        const value = input.value.trim();
        if (!value) return null;

        const number = Number(value);

        if (!Number.isFinite(number)) {
            throw new Error("Số đo phải là số hợp lệ.");
        }

        return number;
    }

    function validateVitals(payload) {
        for (const [key, label] of [
            ["canNang", "Cân nặng"],
            ["chieuCao", "Chiều cao"]
        ]) {
            const value = payload[key];
            if (value === null) continue;

            if (
                value <= 0 || value > 999.99
                || Math.abs(
                    value * 100 - Math.round(value * 100)
                ) > 0.000001
            ) {
                throw new Error(
                    `${label} phải lớn hơn 0, tối đa 999,99 `
                    + "và có tối đa hai chữ số thập phân."
                );
            }
        }

        for (const [key, label] of [
            ["huyetApTamThu", "Huyết áp tâm thu"],
            ["huyetApTamTruong", "Huyết áp tâm trương"]
        ]) {
            const value = payload[key];

            if (
                value !== null
                && (
                    !Number.isInteger(value)
                    || value < 1 || value > 65535
                )
            ) {
                throw new Error(
                    `${label} phải là số nguyên từ 1 đến 65535.`
                );
            }
        }

        if (
            (payload.huyetApTamThu === null)
            !== (payload.huyetApTamTruong === null)
        ) {
            throw new Error(
                "Nhập đủ cả huyết áp tâm thu và tâm trương."
            );
        }

        if (
            Object.keys(vitalFields).every(
                key => payload[key] === null
            )
        ) {
            throw new Error("Vui lòng nhập ít nhất một loại số đo.");
        }
    }

    // =====================================================
    // LƯU HỒ SƠ VÀ SỐ ĐO
    // =====================================================

    async function saveProfile(event) {
        event.preventDefault();

        if (
            profileSaving || profileLoading
            || !currentProfile || !currentVisit
        ) {
            return;
        }

        showMessage("appointment-profile-message", "");

        let personalPayload;
        let personalChanged;
        let vitalsPayload = null;

        try {
            personalPayload = readPersonalProfile();
            personalChanged = personalProfileChanged(personalPayload);

            if (canEditVitals()) {
                const candidate = {
                    maLichKham: positiveId(currentVisit.maLichKham)
                };

                Object.entries(vitalFields).forEach(([key, id]) => {
                    candidate[key] = readOptionalNumber(id);
                });

                const changed = Object.keys(vitalFields).some(key =>
                    candidate[key] !== (
                        currentVisit[key] == null
                            ? null : Number(currentVisit[key])
                    )
                );

                if (changed) {
                    validateVitals(candidate);
                    vitalsPayload = candidate;
                }
            }

            if (!personalChanged && !vitalsPayload) {
                showMessage(
                    "appointment-profile-message",
                    "Chưa có thông tin thay đổi cần lưu.",
                    "info"
                );
                return;
            }
        } catch (error) {
            showMessage("appointment-profile-message", error.message);
            return;
        }

        profileSaving = true;
        updateProfileControls();
        updateControls();

        let personalSaved = false;
        let stage = "thông tin bệnh nhân";

        try {
            if (personalChanged) {
                const result = await requestApi(
                    "/api/tiepnhan/ho-so-benh-nhan/"
                    + positiveId(currentProfile.maBenhNhan),
                    {
                        method: "PUT",
                        body: JSON.stringify(personalPayload)
                    }
                );

                if (result.success !== true) {
                    throw new Error(
                        result.message
                        || "Máy chủ chưa xác nhận cập nhật thông tin bệnh nhân."
                    );
                }

                personalSaved = true;
                applyPersonalProfile(personalPayload);
            }

            if (vitalsPayload) {
                stage = "số đo trước khám";

                const result = await requestApi(
                    "/api/tiepnhan/chi-so-truoc-kham",
                    {
                        method: "POST",
                        body: JSON.stringify(vitalsPayload)
                    }
                );

                if (result.success !== true) {
                    throw new Error(
                        result.message
                        || "Máy chủ chưa xác nhận lưu số đo."
                    );
                }

                Object.keys(vitalFields).forEach(key => {
                    currentVisit[key] = vitalsPayload[key];
                });
            }

            showMessage(
                "appointment-profile-message",
                personalSaved && vitalsPayload
                    ? "Đã cập nhật thông tin bệnh nhân và lưu số đo trước khám."
                    : personalSaved
                        ? "Đã cập nhật thông tin bệnh nhân."
                        : "Đã lưu số đo trước khám.",
                "success"
            );
        } catch (error) {
            const uncertain =
                !error.status || error.status >= 500
                || (error.status >= 200 && error.status < 300);

            showMessage(
                "appointment-profile-message",
                (
                    personalSaved
                        ? "Thông tin bệnh nhân đã lưu; "
                            + "số đo chưa được xác nhận lưu. "
                        : ""
                )
                + error.message
                + (
                    uncertain
                        ? ` Đóng và mở lại hồ sơ để kiểm tra ${stage} `
                            + "trước khi thử lại."
                        : ""
                )
            );
        } finally {
            profileSaving = false;
            updateProfileControls();
            updateControls();
            void loadAppointments();
        }
    }

    // =====================================================
    // THÔNG BÁO TRÊN HEADER
    // =====================================================

    function initNotifications() {
        const wrapper = $("notification-wrapper");
        const button = $("notification-button");
        const panel = $("notification-panel");

        function setOpen(open, returnFocus = false) {
            panel.hidden = !open;
            button.setAttribute("aria-expanded", String(open));
            button.setAttribute(
                "aria-label",
                open ? "Đóng thông báo" : "Mở thông báo"
            );

            if (returnFocus) button.focus();
        }

        button.addEventListener("click", () => {
            setOpen(panel.hidden);
        });

        $("notification-close").addEventListener("click", () => {
            setOpen(false, true);
        });

        document.addEventListener("click", event => {
            if (!wrapper.contains(event.target)) setOpen(false);
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape" && !panel.hidden) {
                setOpen(false, true);
            }
        });

        wrapper.addEventListener("focusout", event => {
            if (!wrapper.contains(event.relatedTarget)) {
                setOpen(false);
            }
        });
    }

    // =====================================================
    // SỰ KIỆN
    // =====================================================

    $("patient-search-form").addEventListener(
        "submit", searchPatient
    );

    $("create-patient-form").addEventListener(
        "submit", savePatient
    );

    $("registration-form").addEventListener(
        "submit", registerAppointment
    );

    $("appointment-profile-form").addEventListener(
        "submit", saveProfile
    );

    $("department-select").addEventListener(
        "change", loadDoctorSchedules
    );

    $("schedule-select").addEventListener(
        "change", onScheduleChange
    );

    $("appointment-time").addEventListener("input", () => {
        $("appointment-time").setCustomValidity("");
    });

    $("reload-schedules").addEventListener("click", () => {
        if (!searching && !savingPatient && !registering) {
            void loadDepartments();
        }
    });

    $("appointment-department-filter").addEventListener(
        "change",
        () => {
            populateDoctorFilter();
            renderAppointments();
        }
    );

    $("appointment-doctor-filter").addEventListener(
        "change", renderAppointments
    );

    $("appointment-status-filter").addEventListener(
        "change", renderAppointments
    );

    $("refresh-appointments-button").addEventListener("click", () => {
        showMessage("page-message", "");
        void loadAppointments();
    });

    $("appointments-table-body").addEventListener("click", event => {
        const button = event.target.closest("button[data-action]");

        if (!button || button.disabled) return;

        if (button.dataset.action === "call-patient") {
            void callPatient(button.dataset.appointmentId);
        } else if (button.dataset.action === "open-profile") {
            void openProfile(
                button.dataset.patientId,
                button.dataset.appointmentId,
                button
            );
        }
    });

    $("open-create-patient").addEventListener("click", () => {
        if (
            savingPatient || searching || registering || profileSaving
        ) {
            return;
        }

        openRegistrationAfterCreate = false;
        showMessage("create-patient-message", "");
        createModal.show();
    });

    createElement.addEventListener("shown.bs.modal", () => {
        $("new-name").focus();
    });

    createElement.addEventListener("hide.bs.modal", event => {
        if (savingPatient) event.preventDefault();
    });

    createElement.addEventListener("hidden.bs.modal", () => {
        if (openRegistrationAfterCreate) {
            openRegistrationAfterCreate = false;
            registrationModal.show();
        }
    });

    registrationElement.addEventListener("hide.bs.modal", event => {
        if (registering) event.preventDefault();
    });

    registrationElement.addEventListener("hidden.bs.modal", () => {
        $("patient-search-input").focus();
    });

    profileElement.addEventListener("hide.bs.modal", event => {
        if (profileSaving) {
            event.preventDefault();
            return;
        }

        profileVersion++;
        profileLoading = false;
    });

    profileElement.addEventListener("hidden.bs.modal", () => {
        clearProfile();
        updateProfileControls();

        if (profileTrigger?.isConnected) {
            profileTrigger.focus();
        } else {
            $("refresh-appointments-button").focus();
        }

        profileTrigger = null;
    });

    // =====================================================
    // KHỞI TẠO
    // =====================================================

    initBirthDateInput();

    initBirthDateInput({
        inputId: "profile-birth-date",
        pickerId: "profile-birth-date-picker",
        buttonId: "profile-open-birth-calendar",
        formId: "appointment-profile-form",
        messageId: "appointment-profile-message",
        modalElement: profileElement,
        isBusy: () => profileLoading || profileSaving
    });

    $("profile-birth-date").required = false;
    $("profile-phone").required = false;

    initNotifications();
    updateTodayDisplay();
    updateControls();
    updateProfileControls();

    void loadAppointments();
})();