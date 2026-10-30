(() => {
    "use strict";

    const $ = id => document.getElementById(id);
    const API = "/api/tiepnhan/dang-ky-kham";
    const PHONE_API =
        "/api/tiepnhan/benh-nhan/tra-cuu-so-dien-thoai";

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

    let phoneLookupVersion = 0;
    let phoneLookupTimer = null;
    let phoneLookupController = null;
    let phoneLookupBusy = false;
    let checkedPhone = "";
    let phoneMatches = [];
    let allowNewPatient = false;

    let showSuccessAfterRegistration = false;
    let registrationToastTimer = null;
    let registrationToastFrame = null;

    const createElement = $("create-patient-modal");
    const registrationElement = $("registration-modal");

    const createModal =
        bootstrap.Modal.getOrCreateInstance(createElement);

    const registrationModal =
        bootstrap.Modal.getOrCreateInstance(registrationElement);

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
    // THÔNG BÁO ĐẨY VÀ PHIẾU SỐ CHỜ
    // =====================================================

    function initRegistrationNotifications() {
        if (!$("checkin-notifications-css")) {
            const link = document.createElement("link");
            link.id = "checkin-notifications-css";
            link.rel = "stylesheet";
            link.href = "/Css/TiepNhan/checkinthongbao.css";
            document.head.appendChild(link);
        }

        const toast = document.createElement("div");
        toast.id = "registration-error-toast";
        toast.className = "checkin-error-toast";
        toast.hidden = true;
        toast.setAttribute("role", "alert");
        toast.setAttribute("aria-live", "assertive");

        toast.innerHTML = `
            <i class="fa-solid fa-circle-exclamation"
               aria-hidden="true"></i>

            <div id="registration-error-toast-text"></div>

            <button type="button"
                    id="registration-error-toast-close"
                    class="checkin-toast-close"
                    aria-label="Đóng thông báo">×</button>
        `;

        document.body.appendChild(toast);

        $("registration-error-toast-close").addEventListener(
            "click",
            hideRegistrationToast
        );

        const success = document.createElement("div");
        success.id = "registration-success-modal";
        success.className = "modal fade checkin-success-modal";
        success.tabIndex = -1;

        success.setAttribute(
            "aria-labelledby",
            "registration-success-title"
        );

        success.setAttribute("aria-hidden", "true");

        success.innerHTML = `
            <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title"
                            id="registration-success-title">
                            Đăng ký thành công
                        </h2>

                        <button class="btn-close"
                                type="button"
                                data-bs-dismiss="modal"
                                aria-label="Đóng thông báo đăng ký thành công">
                        </button>
                    </div>

                    <div class="modal-body">
                        <div class="checkin-success-icon">
                            <i class="fa-solid fa-check"
                               aria-hidden="true"></i>
                        </div>

                        <div class="checkin-success-label">
                            Số chờ của bệnh nhân
                        </div>

                        <div id="success-ticket-number"
                             class="checkin-success-number"></div>

                        <div id="success-ticket-patient"
                             class="checkin-success-patient"></div>

                        <dl class="checkin-success-details">
                            <div>
                                <dt>Khoa</dt>
                                <dd id="success-ticket-department"></dd>
                            </div>

                            <div>
                                <dt>Bác sĩ</dt>
                                <dd id="success-ticket-doctor"></dd>
                            </div>

                            <div>
                                <dt>Phòng khám</dt>
                                <dd>
                                    <strong id="success-ticket-room"></strong>
                                </dd>
                            </div>

                            <div>
                                <dt>Ngày khám</dt>
                                <dd id="success-ticket-date"></dd>
                            </div>

                            <div>
                                <dt>Giờ khám</dt>
                                <dd id="success-ticket-time"></dd>
                            </div>
                        </dl>
                    </div>

                    <div class="modal-footer">
                        <button class="btn btn-outline-secondary"
                                type="button"
                                data-bs-dismiss="modal">
                            Đóng
                        </button>

                        <a class="btn btn-success"
                           href="/TiepNhan/dashboard">
                            Đến Dashboard
                        </a>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(success);

        success.addEventListener("hidden.bs.modal", () => {
            $("patient-search-input").focus();
        });
    }

    function isDuplicateRegistration(message) {
        const normalized = String(message || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d")
            .toLowerCase()
            .replace(/\s+/g, " ");

        return normalized.includes(
            "benh nhan da co luot kham tai khoa nay hom nay"
        );
    }

    function hideRegistrationToast() {
        clearTimeout(registrationToastTimer);
        cancelAnimationFrame(registrationToastFrame);

        const toast = $("registration-error-toast");
        if (!toast) return;

        toast.classList.remove("is-visible");
        toast.hidden = true;
    }

    function showRegistrationToast(message) {
        hideRegistrationToast();

        $("registration-error-toast-text").textContent = message;

        const toast = $("registration-error-toast");
        toast.hidden = false;

        void toast.offsetWidth;

        registrationToastFrame = requestAnimationFrame(() => {
            toast.classList.add("is-visible");

            registrationToastTimer = setTimeout(
                hideRegistrationToast,
                7000
            );
        });
    }

    function fillRegistrationSuccess(data) {
        hideRegistrationToast();

        setText(
            "success-ticket-number",
            `#${String(data.number).padStart(3, "0")}`
        );

        setText("success-ticket-patient", data.patient);
        setText("success-ticket-department", data.department);
        setText("success-ticket-doctor", data.doctor);
        setText("success-ticket-room", data.room);
        setText("success-ticket-date", formatDate(data.date));

        setText(
            "success-ticket-time",
            String(data.time || "").slice(0, 5) || "--:--"
        );
    }

    // =====================================================
    // DANH SÁCH LỊCH KHÁM
    // =====================================================

    function populateFilter(id, values, label) {
        const select = $(id);
        const previous = select.value;

        select.replaceChildren(new Option(label, ""));

        [...new Set(values.filter(Boolean))]
            .sort((a, b) => String(a).localeCompare(String(b), "vi"))
            .forEach(value => {
                select.add(new Option(value, value));
            });

        select.value = [...select.options].some(
            option => option.value === previous
        ) ? previous : "";
    }

    function populateDoctorFilter() {
        const department = $("appointment-department-filter").value;

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
        const department = $("appointment-department-filter").value;
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
                || searching
                || savingPatient
                || registering
                || callingAppointmentId !== null
                || loadingAppointments;

            actions.appendChild(profileButton);
            actionCell.appendChild(actions);

            row.append(
                sequenceCell,
                createCell(
                    item.maLichKham,
                    "fw-semibold text-primary"
                ),
                createDetailCell(
                    item.tenBenhNhan,
                    [item.maBn, item.thongTinPhu]
                        .filter(Boolean)
                        .join(" · ")
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

        if (registering || searching || savingPatient) {
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
        const busy = searching
            || savingPatient
            || registering
            || callingAppointmentId !== null
            || loadingAppointments;

        $("appointments-table-body")
            .querySelectorAll('[data-action="open-profile"]')
            .forEach(button => {
                button.disabled = busy
                    || !positiveId(button.dataset.patientId)
                    || !positiveId(button.dataset.appointmentId);
            });

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
        if (!("speechSynthesis" in window)
            || !("SpeechSynthesisUtterance" in window)) {
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
            item => item.lang.toLowerCase().startsWith("vi")
        );

        if (voice) speech.voice = voice;

        speech.onerror = event => {
            if (["canceled", "interrupted"].includes(event.error)) {
                return;
            }

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
                `Đã gọi bệnh nhân ${
                    result.tenBenhNhan || item.tenBenhNhan || ""
                }.`,
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
            const uncertain = !error.status
                || error.status >= 500
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
                    ? a.gioHen
                    : "99:99";

                const timeB = /^\d{2}:\d{2}$/.test(b.gioHen || "")
                    ? b.gioHen
                    : "99:99";

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
    // NGÀY SINH DD/MM/YYYY
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
            throw new Error(
                "Nhập đủ ngày sinh theo dạng dd/mm/yyyy."
            );
        }

        const day = Number(match[1]);
        const month = Number(match[2]);
        const year = Number(match[3]);
        const date = new Date(Date.UTC(year, month - 1, day));

        if (year < 1000
            || date.getUTCFullYear() !== year
            || date.getUTCMonth() !== month - 1
            || date.getUTCDate() !== day) {
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

    function initBirthDateInput() {
        const input = $("new-birth-date");
        const picker = $("birth-date-picker");

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

                digits = digits.slice(0, from)
                    + digits.slice(to);
            }

            render(digits.slice(0, 8), from);
        }

        function normalize() {
            const cursor = input.selectionStart
                ?? input.value.length;

            render(
                digitsOnly(input.value).slice(0, 8),
                digitsOnly(input.value.slice(0, cursor)).length
            );
        }

        function syncPicker() {
            try {
                picker.value =
                    readBirthDate("new-birth-date", true) || "";
            } catch {
                picker.value = "";
            }
        }

        input.addEventListener("beforeinput", event => {
            if (!event.cancelable || event.isComposing) return;

            if ([
                "insertText",
                "insertReplacementText"
            ].includes(event.inputType)) {
                if (event.data === null) return;

                event.preventDefault();
                edit("insert", event.data);
                return;
            }

            if ([
                "deleteContentBackward",
                "deleteWordBackward",
                "deleteSoftLineBackward"
            ].includes(event.inputType)) {
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

            if ([
                "deleteContentForward",
                "deleteWordForward",
                "deleteSoftLineForward"
            ].includes(event.inputType)) {
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
            edit(
                "insert",
                event.clipboardData.getData("text")
            );
        });

        input.addEventListener("input", event => {
            if (!event.isComposing) normalize();
        });

        input.addEventListener("compositionend", normalize);
        input.addEventListener("blur", syncPicker);

        $("open-birth-calendar").addEventListener("click", () => {
            if (savingPatient) return;

            picker.max = todayVietnam();
            syncPicker();

            try {
                if (typeof picker.showPicker === "function") {
                    picker.showPicker();
                    return;
                }
            } catch {
                // Tiếp tục nhập bằng bàn phím nếu không mở được lịch.
            }

            showMessage(
                "create-patient-message",
                "Trình duyệt chưa mở được lịch. "
                + "Bạn có thể nhập dd/mm/yyyy.",
                "info"
            );

            input.focus();
        });

        picker.addEventListener("change", () => {
            if (!picker.value) return;

            const [year, month, day] = picker.value.split("-");
            input.value = `${day}/${month}/${year}`;

            showMessage("create-patient-message", "");
            input.focus();

            input.setSelectionRange(
                input.value.length,
                input.value.length
            );
        });

        $("create-patient-form").addEventListener("reset", () => {
            picker.value = "";
        });

        createElement.addEventListener("show.bs.modal", () => {
            picker.max = todayVietnam();
            syncPicker();
        });

        picker.max = todayVietnam();
    }
    // =====================================================
    // TRẠNG THÁI FORM
    // =====================================================

    function selectedSchedule() {
        return schedules.find(item =>
            Number(item.maLichLamViec)
                === Number($("schedule-select").value)
        );
    }

    function updateControls() {
        updateCallButtons();

        const busy = searching || savingPatient || registering;

        $("patient-search-input").disabled = busy;
        $("patient-search-button").disabled = busy;
        $("open-create-patient").disabled = busy;

        $("patient-search-button").querySelector("i").className =
            searching
                ? "fa-solid fa-spinner fa-spin"
                : "fa-solid fa-magnifying-glass";

        $("patient-search-button").setAttribute(
            "aria-label",
            searching
                ? "Đang tra cứu bệnh nhân"
                : "Tra cứu bệnh nhân"
        );

        $("patient-search-button").setAttribute(
            "aria-busy",
            String(searching)
        );

        $("create-patient-fields").disabled = savingPatient;

        $("create-patient-save").disabled =
            savingPatient
            || phoneLookupBusy
            || !allowNewPatient
            || checkedPhone !== normalizePhone($("new-phone").value);

        $("create-patient-close").disabled = savingPatient;

        $("phone-lookup-button").disabled =
            savingPatient || phoneLookupBusy;

        $("phone-create-other").disabled =
            savingPatient || phoneLookupBusy;

        $("new-patient-details").disabled =
            savingPatient || !allowNewPatient;

        $("phone-matches")
            .querySelectorAll("button")
            .forEach(button => {
                button.disabled =
                    savingPatient || searching || phoneLookupBusy;
            });

        $("create-patient-save").textContent = savingPatient
            ? "Đang lưu…"
            : "Lưu hồ sơ và đăng ký khám";

        $("registration-close").disabled = registering;

        $("registration-fields").disabled =
            busy || loadingSchedules || registrationLocked;

        $("department-select").disabled =
            busy
            || loadingSchedules
            || registrationLocked
            || $("department-select").options.length <= 1;

        $("schedule-select").disabled =
            busy
            || loadingSchedules
            || registrationLocked
            || schedules.length === 0;

        $("appointment-time").disabled =
            busy
            || loadingSchedules
            || registrationLocked
            || !selectedSchedule();

        $("register-button").disabled =
            busy
            || loadingSchedules
            || registrationLocked
            || !selectedPatientId
            || !selectedSchedule();

        $("register-button").textContent = registering
            ? "Đang đăng ký…"
            : "Đăng ký và cấp số chờ";

        $("reload-schedules").disabled =
            busy
            || loadingSchedules
            || registrationLocked
            || !selectedPatientId;
    }

    function resetSelect(id, placeholder) {
        $(id).replaceChildren(
            new Option(placeholder, "")
        );
    }

    function resetRegistration() {
        loadVersion++;
        schedules = [];
        loadedDate = null;
        loadingSchedules = false;
        registrationLocked = false;
        showSuccessAfterRegistration = false;

        hideRegistrationToast();

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

        setText(
            "selected-id",
            `Mã bệnh nhân: ${selectedPatientId}`
        );

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
    // TRA CỨU BỆNH NHÂN
    // =====================================================

    async function searchPatient(event) {
        event.preventDefault();

        if (searching || savingPatient || registering) return;

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

    // =====================================================
    // TRA CỨU SỐ ĐIỆN THOẠI
    // =====================================================

    function normalizePhone(raw) {
        let value = String(raw || "").trim();

        if (!/^[+0-9\s().-]+$/.test(value)) return "";

        value = value.replace(/[\s().-]/g, "");

        if (value.startsWith("+84")) {
            value = "0" + value.slice(3);
        }

        return /^\+?[0-9]{9,14}$/.test(value)
            ? value
            : "";
    }

    function setPhoneLookupStatus(message, type = "secondary") {
        $("phone-lookup-status").textContent = message;

        $("phone-lookup-status").className =
            `small mt-2 text-${type}`;
    }

    function invalidatePhoneLookup() {
        phoneLookupVersion++;

        clearTimeout(phoneLookupTimer);
        phoneLookupController?.abort();

        phoneLookupController = null;
        phoneLookupBusy = false;
        checkedPhone = "";
        phoneMatches = [];
        allowNewPatient = false;

        $("phone-matches").replaceChildren();
        $("phone-matches-panel").hidden = true;

        updateControls();
    }

    function renderPhoneMatches(matches) {
        phoneMatches = matches;

        const list = $("phone-matches");
        list.replaceChildren();

        $("phone-matches-panel").hidden = matches.length === 0;

        matches.forEach(patient => {
            const button = document.createElement("button");

            button.type = "button";
            button.className =
                "list-group-item list-group-item-action text-start";

            const name = document.createElement("div");
            name.className = "fw-semibold";
            name.textContent = patient.hoTen || "Bệnh nhân";

            const details = document.createElement("div");
            details.className = "small text-secondary";

            details.textContent = [
                `Mã BN: ${patient.maBenhNhan}`,
                formatDate(patient.ngaySinh),
                patient.gioiTinh,
                patient.soDienThoai,
                patient.diaChi
            ].filter(Boolean).join(" · ");

            button.append(name, details);

            button.addEventListener("click", () => {
                if (savingPatient
                    || searching
                    || registering
                    || phoneLookupBusy
                    || checkedPhone !== normalizePhone($("new-phone").value)) {
                    return;
                }

                try {
                    selectPatient(patient);

                    $("patient-search-input").value =
                        checkedPhone;

                    openRegistrationAfterCreate = true;
                    createModal.hide();
                } catch (error) {
                    showMessage(
                        "create-patient-message",
                        error.message
                    );
                }
            });

            list.appendChild(button);
        });
    }

    async function lookupPhone() {
        if (savingPatient || searching || registering) return;

        const phone = normalizePhone($("new-phone").value);

        invalidatePhoneLookup();

        const version = phoneLookupVersion;

        if (!phone) {
            setPhoneLookupStatus(
                "Nhập số điện thoại hợp lệ gồm 9–14 chữ số, "
                + "có thể bắt đầu bằng dấu +.",
                "warning"
            );
            return;
        }

        phoneLookupBusy = true;

        const controller = new AbortController();
        phoneLookupController = controller;

        setPhoneLookupStatus(
            "Đang tra cứu hồ sơ…",
            "primary"
        );

        updateControls();

        try {
            const data = await requestApi(
                `${PHONE_API}?soDienThoai=${encodeURIComponent(phone)}`,
                { signal: controller.signal }
            );

            if (version !== phoneLookupVersion
                || !createElement.classList.contains("show")) {
                return;
            }

            if (!Array.isArray(data)
                || data.some(item => !positiveId(item.maBenhNhan))) {
                throw new Error(
                    "Danh sách hồ sơ trả về không hợp lệ."
                );
            }

            checkedPhone = phone;

            renderPhoneMatches(data);

            allowNewPatient = data.length === 0;

            if (data.length) {
                setPhoneLookupStatus(
                    `Tìm thấy ${data.length} hồ sơ. `
                    + "Chọn đúng bệnh nhân để đăng ký khám.",
                    "primary"
                );
            } else {
                setPhoneLookupStatus(
                    "Chưa có hồ sơ dùng số điện thoại này. "
                    + "Bạn có thể nhập thông tin và tạo hồ sơ mới ngay.",
                    "success"
                );
            }
        } catch (error) {
            if (version !== phoneLookupVersion
                || error.name === "AbortError") {
                return;
            }

            setPhoneLookupStatus(
                "Không tra cứu được: "
                + error.message
                + " Bấm Kiểm tra để thử lại.",
                "danger"
            );
        } finally {
            if (version === phoneLookupVersion) {
                phoneLookupBusy = false;
                phoneLookupController = null;

                updateControls();
            }
        }
    }
        // =====================================================
        // ĐĂNG KÝ KHÁM
        // =====================================================

        async function registerAppointment(event) {
            event.preventDefault();

            if (registering
                || searching
                || savingPatient
                || loadingSchedules
                || registrationLocked) {
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

            if (!schedule
                || !$("registration-form").reportValidity()) {
                return;
            }

            const time = readValue("appointment-time");

            try {
                const { minimum, maximum } =
                    scheduleBounds(schedule);

                const chosen = toMinutes(time);

                if (!/^[0-9]{2}:[0-9]{2}$/.test(time || "")
                    || !Number.isFinite(chosen)
                    || chosen < minimum
                    || chosen > maximum) {
                    throw new Error(
                        `Chọn giờ từ ${minuteText(minimum)} `
                        + `đến ${minuteText(maximum)}.`
                    );
                }
            } catch (error) {
                showMessage(
                    "registration-message",
                    error.message
                );
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

                fillRegistrationSuccess({
                    number,
                    patient: selectedPatientName,
                    department: departmentName,
                    doctor: schedule.tenBacSi,
                    room: schedule.tenPhong,
                    date: result.ngayKham,
                    time: result.gioKham
                });

                $("queue-ticket").hidden = true;

                showMessage("registration-message", "");

                showSuccessAfterRegistration = true;

                void loadAppointments();
            } catch (error) {
                if (isDuplicateRegistration(error.message)) {
                    registrationLocked = false;

                    showMessage("registration-message", "");
                    showRegistrationToast(error.message);

                    void loadAppointments();

                    return;
                }

                if (registrationLocked
                    || !error.status
                    || error.status >= 500
                    || error.status === 200
                    || error.status === 201) {
                    registrationLocked = true;

                    showMessage(
                        "registration-message",
                        error.message
                        + " Hãy kiểm tra danh sách trước khi đăng ký lại."
                    );

                    void loadAppointments();
                } else {
                    showMessage(
                        "registration-message",
                        error.message
                    );
                }
            } finally {
                registering = false;
                updateControls();

                if (showSuccessAfterRegistration) {
                    registrationModal.hide();
                }
            }
        }

        // =====================================================
        // MỞ TRANG HỒ SƠ
        // =====================================================

        function openProfile(patientId, appointmentId) {
            if (searching
                || savingPatient
                || registering
                || callingAppointmentId !== null
                || loadingAppointments) {
                showMessage(
                    "page-message",
                    "Vui lòng chờ thao tác hiện tại hoàn tất.",
                    "warning"
                );
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

            const params = new URLSearchParams({
                maLichKham: String(visitId),
                from: "checkin"
            });

            window.location.assign(
                `/TiepNhan/ho-so-benh-nhan/${id}?${params.toString()}`
            );
        }

        // =====================================================
        // THÔNG BÁO HEADER
        // =====================================================

        function initNotifications() {
            const wrapper = $("notification-wrapper");
            const button = $("notification-button");
            const panel = $("notification-panel");
            const closeButton = $("notification-close");

            if (!wrapper || !button || !panel || !closeButton) return;

            function setOpen(open, returnFocus = false) {
                panel.hidden = !open;

                button.setAttribute(
                    "aria-expanded",
                    String(open)
                );

                button.setAttribute(
                    "aria-label",
                    open ? "Đóng thông báo" : "Mở thông báo"
                );

                if (returnFocus) button.focus();
            }

            button.addEventListener("click", () => {
                setOpen(panel.hidden);
            });

            closeButton.addEventListener("click", () => {
                setOpen(false, true);
            });

            document.addEventListener("click", event => {
                if (!wrapper.contains(event.target)) {
                    setOpen(false);
                }
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
            "submit",
            searchPatient
        );

        $("create-patient-form").addEventListener(
            "submit",
            savePatient
        );

        $("registration-form").addEventListener(
            "submit",
            registerAppointment
        );

        $("department-select").addEventListener(
            "change",
            loadDoctorSchedules
        );

        $("schedule-select").addEventListener(
            "change",
            onScheduleChange
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
            "change",
            renderAppointments
        );

        $("appointment-status-filter").addEventListener(
            "change",
            renderAppointments
        );

        $("refresh-appointments-button").addEventListener(
            "click",
            () => {
                showMessage("page-message", "");
                void loadAppointments();
            }
        );

        $("appointments-table-body").addEventListener(
            "click",
            event => {
                const button = event.target.closest(
                    "button[data-action]"
                );

                if (!button || button.disabled) return;

                if (button.dataset.action === "call-patient") {
                    void callPatient(button.dataset.appointmentId);
                } else if (button.dataset.action === "open-profile") {
                    openProfile(
                        button.dataset.patientId,
                        button.dataset.appointmentId
                    );
                }
            }
        );

        $("open-create-patient").addEventListener("click", () => {
            if (savingPatient || searching || registering) return;

            openRegistrationAfterCreate = false;

            $("create-patient-form").reset();
            invalidatePhoneLookup();

            showMessage("create-patient-message", "");

            setPhoneLookupStatus(
                "Nhập số điện thoại để tìm hồ sơ đã có."
            );

            const keywordPhone = normalizePhone(
                $("patient-search-input").value
            );

            if (keywordPhone) {
                $("new-phone").value = keywordPhone;
            }

            createModal.show();
        });

        createElement.addEventListener("shown.bs.modal", () => {
            $("new-phone").focus();

            if (normalizePhone($("new-phone").value)) {
                void lookupPhone();
            }
        });

        $("new-phone").addEventListener("input", () => {
            invalidatePhoneLookup();
            showMessage("create-patient-message", "");

            if (normalizePhone($("new-phone").value)) {
                setPhoneLookupStatus(
                    "Đang chờ tra cứu…",
                    "primary"
                );

                phoneLookupTimer = setTimeout(
                    () => void lookupPhone(),
                    400
                );
            } else {
                setPhoneLookupStatus(
                    "Nhập đủ số điện thoại để kiểm tra hồ sơ."
                );
            }
        });

        $("new-phone").addEventListener("keydown", event => {
            if (event.key === "Enter") {
                event.preventDefault();
                void lookupPhone();
            }
        });

        $("phone-lookup-button").addEventListener("click", () => {
            void lookupPhone();
        });

        $("phone-create-other").addEventListener("click", () => {
            if (savingPatient
                || phoneLookupBusy
                || !phoneMatches.length
                || !checkedPhone
                || checkedPhone !== normalizePhone($("new-phone").value)) {
                return;
            }

            allowNewPatient = true;
            updateControls();

            setPhoneLookupStatus(
                "Tạo hồ sơ riêng cho người khác dùng chung số liên hệ. "
                + "Kiểm tra họ tên và ngày sinh trước khi lưu.",
                "primary"
            );

            $("new-name").focus();
        });

        createElement.addEventListener("hide.bs.modal", event => {
            if (savingPatient) {
                event.preventDefault();
            }
        });

        createElement.addEventListener("hidden.bs.modal", () => {
            invalidatePhoneLookup();

            if (openRegistrationAfterCreate) {
                openRegistrationAfterCreate = false;
                registrationModal.show();
            }
        });

        registrationElement.addEventListener("hide.bs.modal", event => {
            if (registering) {
                event.preventDefault();
            }
        });

        registrationElement.addEventListener("hidden.bs.modal", () => {
            if (showSuccessAfterRegistration) {
                showSuccessAfterRegistration = false;

                bootstrap.Modal.getOrCreateInstance(
                    $("registration-success-modal")
                ).show();
            } else {
                $("patient-search-input").focus();
            }
        });

        // =====================================================
        // KHỞI TẠO
        // =====================================================

        initRegistrationNotifications();
        initBirthDateInput();
        initNotifications();
        updateTodayDisplay();
        updateControls();

        void loadAppointments();
    })();