
(() => {
    "use strict";

    const $ = id => document.getElementById(id);

    const API = "/api/tiepnhan/dang-ky-kham";
    const PHONE_API =
        "/api/tiepnhan/benh-nhan/tra-cuu-so-dien-thoai";
    const PATIENT_LIST_API = "/api/tiepnhan/benh-nhan";

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

    let appointments = [];
    let schedules = [];
    let phoneMatches = [];

    let appointmentsDate = null;
    let loadedDate = null;

    let selectedPatientId = null;
    let selectedPatientName = "";

    let searching = false;
    let savingPatient = false;
    let registering = false;
    let loadingSchedules = false;
    let loadingAppointments = false;
    let registrationLocked = false;
    let callingAppointmentId = null;

    let loadVersion = 0;
    let phoneLookupVersion = 0;
    let searchVersion = 0;

    let phoneLookupTimer = null;
    let phoneLookupController = null;
    let phoneLookupBusy = false;

    let checkedPhone = "";
    let allowNewPatient = false;

    let openRegistrationAfterCreate = false;
    let showSuccessAfterRegistration = false;
    let registrationToastTimer = null;

    let searchTerm = "";
    let phoneMatchedIds = null;
    let searchTimer = null;

    // =====================================================
    // CHỈNH GIAO DIỆN BỘ LỌC VÀ ICON TIÊU ĐỀ
    // =====================================================

    function initCheckinUI() {
        const roomFilter =
            $("appointment-room-filter")
            || $("appointment-department-filter");

        if (!roomFilter) {
            throw new Error(
                "Không tìm thấy bộ lọc phòng."
            );
        }

        // Đổi bộ lọc Khoa thành Phòng
        roomFilter.id = "appointment-room-filter";

        roomFilter.setAttribute(
            "aria-label",
            "Lọc theo phòng khám"
        );

        roomFilter.replaceChildren(
            new Option("Tất cả phòng", "")
        );

        // Tạo kiểu icon giống trang Danh sách bệnh nhân
        if (!$("checkin-header-icon-style")) {
            const style = document.createElement("style");

            style.id = "checkin-header-icon-style";

            style.textContent = `
                .checkin-page
                .appointment-list-header
                .header-with-icon {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .checkin-page
                .appointment-list-header
                .icon-circle-header {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    width: 34px;
                    height: 34px;
                    border-radius: 9px;
                    background: var(--primary-soft, #f0edff);
                    color: var(--primary, #663cff);
                }

                .checkin-page
                .appointment-list-header
                .icon-circle-header i {
                    font-size: 15px;
                    line-height: 1;
                }

                .checkin-page
                .appointment-list-title {
                    margin-bottom: 0;
                }
            `;

            document.head.appendChild(style);
        }
    }

    // =====================================================
    // HÀM DÙNG CHUNG
    // =====================================================

    function getToken() {
        return sessionStorage.getItem("Token")
            || localStorage.getItem("Token")
            || sessionStorage.getItem("token")
            || localStorage.getItem("token");
    }

    function showMessage(
        id,
        message = "",
        type = "danger"
    ) {
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
            value === null
            || value === undefined
            || value === ""
                ? "Chưa cung cấp"
                : String(value);
    }

    function readValue(id) {
        return $(id).value.trim() || null;
    }

    function positiveId(value) {
        const number = Number(value);

        return Number.isSafeInteger(number)
            && number > 0
                ? number
                : null;
    }

    function normalizeText(value) {
        return String(value ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[đĐ]/g, "d")
            .toLowerCase()
            .trim()
            .replace(/\s+/g, " ");
    }

    function normalizePhone(raw) {
        let value = String(raw || "").trim();

        if (!/^[+0-9\s().-]+$/.test(value)) {
            return "";
        }

        value = value.replace(/[\s().-]/g, "");

        if (value.startsWith("+84")) {
            value = "0" + value.slice(3);
        }

        return /^\+?[0-9]{9,14}$/.test(value)
            ? value
            : "";
    }

    function vietnamNow() {
        const parts = new Intl.DateTimeFormat(
            "en-GB",
            {
                timeZone: "Asia/Ho_Chi_Minh",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                hourCycle: "h23"
            }
        ).formatToParts(new Date());

        const get = type =>
            parts.find(part => part.type === type).value;

        return {
            date:
                `${get("year")}-${get("month")}-${get("day")}`,

            time:
                `${get("hour")}:${get("minute")}`
        };
    }

    function todayVietnam() {
        return vietnamNow().date;
    }

    function updateTodayDisplay() {
        const label = new Intl.DateTimeFormat(
            "vi-VN",
            {
                timeZone: "Asia/Ho_Chi_Minh",
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        ).format(new Date());

        setText("today-display", label);
        setText("header-date-display", label);
    }

    function formatDate(value) {
        if (!value) {
            return "Chưa cung cấp";
        }

        const match =
            /^(\d{4})-(\d{2})-(\d{2})/
                .exec(String(value));

        return match
            ? `${match[3]}/${match[2]}/${match[1]}`
            : String(value);
    }

    async function requestApi(url, options = {}) {
        const token = getToken();

        if (!token) {
            throw new Error(
                "Vui lòng đăng nhập lại để tiếp tục."
            );
        }

        const headers = new Headers(
            options.headers || {}
        );

        headers.set("Accept", "application/json");

        headers.set(
            "Authorization",
            `Bearer ${token}`
        );

        if (options.body) {
            headers.set(
                "Content-Type",
                "application/json"
            );
        }

        const response = await fetch(url, {
            ...options,
            headers
        });

        const responseText = await response.text();

        let data;

        try {
            data = responseText
                ? JSON.parse(responseText)
                : null;
        } catch {
            const error = new Error(
                "Máy chủ trả về dữ liệu không hợp lệ."
            );

            error.status = response.status;

            throw error;
        }

        if (!response.ok) {
            const fallback =
                response.status === 401
                    ? "Phiên đăng nhập đã hết hạn."
                    : response.status === 403
                        ? "Bạn không có quyền thực hiện thao tác này."
                        : "Không thể thực hiện yêu cầu.";

            const error = new Error(
                data?.message
                || data?.detail
                || fallback
            );

            error.status = response.status;

            throw error;
        }

        if (data === null) {
            throw new Error(
                "Máy chủ chưa trả về dữ liệu."
            );
        }

        return data;
    }

    // =====================================================
    // TÌM KIẾM TỰ ĐỘNG LỊCH KHÁM
    // =====================================================

    function appointmentMatches(item) {
        const key = normalizeText(searchTerm);

        if (!key) {
            return true;
        }

        const fields = [
            item.maBenhNhan,
            item.maBn,
            item.maLichKham,
            item.tenBenhNhan,
            item.soDienThoai
        ].map(normalizeText);

        const matchesBasic = fields.some(value =>
            value.includes(key)
        );

        const matchesPhone =
            phoneMatchedIds?.has(
                positiveId(item.maBenhNhan)
            ) ?? false;

        return matchesBasic || matchesPhone;
    }

    function isPhoneFragment(raw) {
        const value = String(raw || "").trim();

        return /[0-9]/.test(value)
            && /^[+0-9\s().-]+$/.test(value);
    }

    async function applySearch() {
        const version = ++searchVersion;

        const term =
            $("patient-search-input").value.trim();

        searchTerm = term;
        phoneMatchedIds = null;
        searching = false;

        showMessage("page-message", "");

        renderAppointments();
        updateControls();

        if (!term || !isPhoneFragment(term)) {
            return;
        }

        searching = true;
        updateControls();

        try {
            /*
             * Tìm theo số điện thoại một phần:
             * 0, 09, 0909, 090999...
             *
             * Dùng API danh sách bệnh nhân vì API này
             * hỗ trợ tìm kiếm từ khóa ngắn.
             *
             * Không sử dụng PHONE_API ở đây, vì
             * PHONE_API yêu cầu số điện thoại đầy đủ.
             */

            const ids = new Set();

            let currentPage = 1;
            let pages = 1;

            const date =
                appointmentsDate || todayVietnam();

            do {
                const params = new URLSearchParams({
                    keyword: term,
                    ngayKham: date,
                    page: String(currentPage),
                    size: "100"
                });

                const result = await requestApi(
                    `${PATIENT_LIST_API}?${params}`
                );

                // Nếu người dùng đã gõ từ khóa khác,
                // bỏ qua kết quả của yêu cầu cũ.
                if (version !== searchVersion) {
                    return;
                }

                if (
                    result.success !== true
                    || !Array.isArray(result.items)
                    || !Number.isSafeInteger(
                        result.totalPages
                    )
                ) {
                    throw new Error(
                        "Kết quả tìm kiếm bệnh nhân không hợp lệ."
                    );
                }

                for (const patient of result.items) {
                    const id = positiveId(
                        patient.maBenhNhan
                    );

                    if (id) {
                        ids.add(id);
                    }
                }

                pages = result.totalPages;
                currentPage++;

            } while (currentPage <= pages);

            if (version !== searchVersion) {
                return;
            }

            phoneMatchedIds = ids;

            renderAppointments();

        } catch (error) {
            if (version !== searchVersion) {
                return;
            }

            if (error.status === 404) {
                phoneMatchedIds = new Set();
            } else {
                showMessage(
                    "page-message",
                    "Không tìm được số điện thoại: "
                    + error.message
                );
            }

            renderAppointments();

        } finally {
            if (version === searchVersion) {
                searching = false;
                updateControls();
            }
        }
    }

    function searchPatient(event) {
        event.preventDefault();

        clearTimeout(searchTimer);

        if (savingPatient || registering) {
            return;
        }

        void applySearch();
    }

    function onSearchInput() {
        clearTimeout(searchTimer);

        // Vô hiệu hóa kết quả từ khóa cũ
        ++searchVersion;

        searchTerm =
            $("patient-search-input").value.trim();

        phoneMatchedIds = null;
        searching = false;

        showMessage("page-message", "");

        // Tên, mã BN và mã lịch được lọc ngay lập tức
        renderAppointments();
        updateControls();

        // Với số điện thoại, đợi ngừng gõ 300ms
        if (isPhoneFragment(searchTerm)) {
            searchTimer = setTimeout(
                () => void applySearch(),
                300
            );
        }
    }

    // =====================================================
    // BỘ LỌC PHÒNG, BÁC SĨ VÀ TRẠNG THÁI
    // =====================================================

    function populateFilter(id, values, label) {
        const select = $(id);
        const previous = select.value;

        select.replaceChildren(
            new Option(label, "")
        );

        [...new Set(values.filter(Boolean))]
            .sort((a, b) =>
                String(a).localeCompare(
                    String(b),
                    "vi"
                )
            )
            .forEach(value => {
                select.add(
                    new Option(value, value)
                );
            });

        select.value =
            [...select.options].some(
                option => option.value === previous
            )
                ? previous
                : "";
    }

    function populateDoctorFilter() {
        const room =
            $("appointment-room-filter").value;

        const doctors = appointments
            .filter(item =>
                !room || item.phong === room
            )
            .map(item => item.bacSi);

        populateFilter(
            "appointment-doctor-filter",
            doctors,
            "Tất cả bác sĩ"
        );
    }

    function statusClass(status) {
        if (status === "Đang khám") {
            return "bg-primary-subtle text-primary";
        }

        if (
            ["Hoàn tất", "Đã khám"].includes(status)
        ) {
            return "bg-success-subtle text-success";
        }

        if (status === "Đã hủy") {
            return "bg-danger-subtle text-danger";
        }

        if (status === "Đã gọi") {
            return "bg-info-subtle text-info-emphasis";
        }

        return "bg-warning-subtle text-warning-emphasis";
    }

    function createCell(value, className = "") {
        const td = document.createElement("td");

        td.className = className;
        td.textContent = value ?? "—";

        return td;
    }

    function createDetailCell(primary, secondary) {
        const td = document.createElement("td");

        const name = document.createElement("div");
        name.className = "appointment-patient-name";
        name.textContent = primary || "Chưa cập nhật";

        const detail = document.createElement("div");
        detail.className = "appointment-secondary-text";
        detail.textContent = secondary || "";

        td.append(name, detail);

        return td;
    }

    // =====================================================
    // KIỂM TRA TRẠNG THÁI GỌI BỆNH NHÂN
    // =====================================================

    function callUnavailableReason(item) {
        if (!item) {
            return "Không tìm thấy lịch khám.";
        }

        if (callingAppointmentId !== null) {
            return "Đang gửi yêu cầu gọi bệnh nhân.";
        }

        if (loadingAppointments) {
            return "Đang tải danh sách lịch khám.";
        }

        if (
            registering
            || searching
            || savingPatient
        ) {
            return "Vui lòng chờ thao tác hiện tại.";
        }

        if (appointmentsDate !== todayVietnam()) {
            return "Hãy làm mới lịch khám hôm nay.";
        }

        if (!positiveId(item.maLichKham)) {
            return "Mã lịch khám không hợp lệ.";
        }

        if (!callableStatuses.includes(item.trangThai)) {
            return "Trạng thái không cho phép gọi.";
        }

        if (
            !item.phong
            || item.phong === "Chưa phân công"
        ) {
            return "Chưa phân công phòng khám.";
        }

        return "";
    }

    // =====================================================
    // HIỂN THỊ BẢNG LỊCH KHÁM
    // =====================================================

    function renderAppointments() {
        const doctor =
            $("appointment-doctor-filter").value;

        const room =
            $("appointment-room-filter").value;

        const status =
            $("appointment-status-filter").value;

        const filtered = appointments.filter(item =>
            appointmentMatches(item)
            && (!doctor || item.bacSi === doctor)
            && (!room || item.phong === room)
            && (!status || item.trangThai === status)
        );

        const body = $("appointments-table-body");

        body.replaceChildren();

        filtered.forEach(item => {
            const row = document.createElement("tr");

            // Số thứ tự
            const sequenceCell =
                document.createElement("td");

            const sequence =
                document.createElement("span");

            sequence.className = "badge-stt-purple";
            sequence.textContent = item.stt || "—";
            sequence.style.whiteSpace = "nowrap";

            sequenceCell.appendChild(sequence);

            // Trạng thái
            const statusCell =
                document.createElement("td");

            const badge =
                document.createElement("span");

            badge.className =
                `appointment-status ${statusClass(item.trangThai)}`;

            badge.textContent =
                item.trangThai || "Chưa cập nhật";

            statusCell.appendChild(badge);

            // Cột thao tác
            const actionCell =
                createCell(
                    "",
                    "appointment-profile-column"
                );

            const actions =
                document.createElement("div");

            actions.className = "appointment-row-actions";

            // Nút gọi bệnh nhân
            if (
                callableStatuses.includes(item.trangThai)
            ) {
                const callButton =
                    document.createElement("button");

                callButton.type = "button";

                callButton.className =
                    "appointment-call-button";

                callButton.dataset.action =
                    "call-patient";

                callButton.dataset.appointmentId =
                    item.maLichKham ?? "";

                const label =
                    item.trangThai === "Đã gọi"
                        ? "Gọi lại bệnh nhân"
                        : "Gọi bệnh nhân";

                callButton.title = label;

                callButton.setAttribute(
                    "aria-label",
                    `${label} ${item.tenBenhNhan || ""}`
                );

                callButton.disabled =
                    !!callUnavailableReason(item);

                const icon =
                    document.createElement("i");

                icon.className =
                    callingAppointmentId
                    === positiveId(item.maLichKham)
                        ? "fa-solid fa-spinner fa-spin"
                        : "fa-solid fa-volume-high";

                callButton.appendChild(icon);
                actions.appendChild(callButton);
            }

            // Nút hồ sơ
            const profileButton =
                document.createElement("button");

            profileButton.type = "button";

            profileButton.className =
                "btn btn-outline-primary btn-sm text-nowrap";

            profileButton.textContent = "Hồ sơ";

            profileButton.dataset.action =
                "open-profile";

            profileButton.dataset.patientId =
                item.maBenhNhan ?? "";

            profileButton.dataset.appointmentId =
                item.maLichKham ?? "";

            profileButton.disabled =
                !positiveId(item.maBenhNhan)
                || !positiveId(item.maLichKham)
                || savingPatient
                || registering
                || callingAppointmentId !== null
                || loadingAppointments;

            profileButton.setAttribute(
                "aria-label",
                `Xem hồ sơ ${
                    item.tenBenhNhan || "bệnh nhân"
                }`
            );

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
                    [
                        item.maBn,
                        item.thongTinPhu
                    ].filter(Boolean).join(" · ")
                ),

                createDetailCell(
                    item.khoa,
                    item.bacSi
                ),

                createCell(
                    item.phong || "Chưa phân công"
                ),

                createCell(
                    item.gioHen || "--:--"
                ),

                statusCell,
                actionCell
            );

            body.appendChild(row);
        });

        // Bảng trống khi không tìm thấy
        $("appointments-empty").hidden =
            filtered.length > 0;

        $("appointments-empty-message").textContent =
            appointments.length === 0
                ? "Chưa có lịch khám trong ngày."
                : "Không tìm thấy lịch khám phù hợp.";

        $("appointments-record-count").textContent =
            `Hiển thị ${filtered.length}/${appointments.length} lịch khám`;
    }

    function updateCallButtons() {
        const busy =
            savingPatient
            || registering
            || callingAppointmentId !== null
            || loadingAppointments;

        $("appointments-table-body")
            .querySelectorAll(
                '[data-action="open-profile"]'
            )
            .forEach(button => {
                button.disabled =
                    busy
                    || !positiveId(
                        button.dataset.patientId
                    )
                    || !positiveId(
                        button.dataset.appointmentId
                    );
            });

        $("appointments-table-body")
            .querySelectorAll(
                '[data-action="call-patient"]'
            )
            .forEach(button => {
                const id = positiveId(
                    button.dataset.appointmentId
                );

                const item = appointments.find(
                    row =>
                        positiveId(row.maLichKham) === id
                );

                const reason =
                    callUnavailableReason(item);

                button.disabled = !!reason;

                button.title = reason || (
                    item?.trangThai === "Đã gọi"
                        ? "Gọi lại bệnh nhân"
                        : "Gọi bệnh nhân"
                );

                button.setAttribute(
                    "aria-busy",
                    String(callingAppointmentId === id)
                );

                const icon = button.querySelector("i");

                if (icon) {
                    icon.className =
                        callingAppointmentId === id
                            ? "fa-solid fa-spinner fa-spin"
                            : "fa-solid fa-volume-high";
                }
            });
    }

    // =====================================================
    // TẢI LỊCH KHÁM TRONG NGÀY
    // =====================================================

    async function loadAppointments() {
        if (loadingAppointments) {
            return false;
        }

        loadingAppointments = true;

        $("refresh-appointments-button").disabled = true;

        updateTodayDisplay();
        updateCallButtons();

        try {
            const date = todayVietnam();

            const data = await requestApi(
                "/api/tiepnhan/dashboard-data"
            );

            if (!Array.isArray(data.hangDoiKham)) {
                throw new Error(
                    "Danh sách lịch khám trả về không hợp lệ."
                );
            }

            appointmentsDate = date;

            appointments = [...data.hangDoiKham]
                .sort((a, b) => {
                    const timeA =
                        String(a.gioHen || "99:99");

                    const timeB =
                        String(b.gioHen || "99:99");

                    return timeA.localeCompare(timeB)
                        || Number(a.maLichKham)
                            - Number(b.maLichKham);
                });

            // Danh sách phòng thay cho danh sách khoa
            populateFilter(
                "appointment-room-filter",

                appointments
                    .map(item => item.phong)
                    .filter(room =>
                        room
                        && room !== "Chưa phân công"
                    ),

                "Tất cả phòng"
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
            showMessage(
                "page-message",
                error.message
                + " Danh sách chưa được cập nhật."
            );

            if (!appointments.length) {
                $("appointments-empty").hidden = false;

                $("appointments-empty-message").textContent =
                    "Chưa tải được danh sách lịch khám.";

                $("appointments-record-count").textContent =
                    "Dữ liệu chưa được cập nhật.";
            }

            return false;

        } finally {
            loadingAppointments = false;

            $("refresh-appointments-button").disabled =
                callingAppointmentId !== null;

            updateCallButtons();
        }
    }

    // =====================================================
    // PHÁT LOA GỌI BỆNH NHÂN
    // =====================================================

    function speakPatientAnnouncement(item) {
        if (
            !("speechSynthesis" in window)
            || !("SpeechSynthesisUtterance" in window)
        ) {
            showMessage(
                "page-message",
                "Đã gọi bệnh nhân nhưng trình duyệt không hỗ trợ phát loa.",
                "warning"
            );

            return;
        }

        const sequence = String(item.stt ?? "")
            .replace(/^#/, "")
            .replace(/^0+(?=\d)/, "");

        const queue =
            sequence && sequence !== "—"
                ? `, số thứ tự ${sequence}`
                : "";

        const speech = new SpeechSynthesisUtterance(
            `Xin mời bệnh nhân ${
                item.tenBenhNhan || ""
            }${queue}, đến khu vực chờ trước `
            + `${item.phong}, khoa ${
                item.khoa || ""
            }, để kiểm tra thông tin trước khi khám.`
        );

        speech.lang = "vi-VN";
        speech.rate = 0.9;

        const voice = window.speechSynthesis
            .getVoices()
            .find(item =>
                item.lang.toLowerCase().startsWith("vi")
            );

        if (voice) {
            speech.voice = voice;
        }

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
            showMessage(
                "page-message",
                reason,
                "warning"
            );
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

                    body: JSON.stringify({
                        maLichKham: id
                    })
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
                    result.tenBenhNhan
                    || item.tenBenhNhan
                }.`,
                "success"
            );

            speakPatientAnnouncement({
                ...item,

                stt:
                    result.soThuTu ?? item.stt,

                tenBenhNhan:
                    result.tenBenhNhan
                    ?? item.tenBenhNhan,

                phong:
                    result.phong ?? item.phong,

                khoa:
                    result.khoa ?? item.khoa
            });

            await loadAppointments();

        } catch (error) {
            showMessage(
                "page-message",
                error.message
            );

        } finally {
            callingAppointmentId = null;

            $("refresh-appointments-button").disabled =
                loadingAppointments;

            updateCallButtons();
        }
    }

    // =====================================================
    // MỞ HỒ SƠ
    // =====================================================

    function openProfile(patientId, appointmentId) {
        const id = positiveId(patientId);
        const visitId = positiveId(appointmentId);

        if (!id || !visitId) {
            showMessage(
                "page-message",
                "Mã bệnh nhân hoặc lịch khám không hợp lệ."
            );
            return;
        }

        if (
            registering
            || savingPatient
            || callingAppointmentId !== null
            || loadingAppointments
        ) {
            showMessage(
                "page-message",
                "Vui lòng chờ thao tác hiện tại.",
                "warning"
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
    // HÀM HỖ TRỢ ĐĂNG KÝ LƯỢT KHÁM
    // =====================================================

    function resetSelect(id, label) {
        $(id).replaceChildren(
            new Option(label, "")
        );
    }

    function selectedSchedule() {
        return schedules.find(
            item =>
                Number(item.maLichLamViec)
                === Number($("schedule-select").value)
        );
    }

    function hideRegistrationToast() {
        clearTimeout(registrationToastTimer);

        const toast =
            $("registration-error-toast");

        if (toast) {
            toast.hidden = true;
        }
    }

    function showRegistrationToast(message) {
        let toast = $("registration-error-toast");

        if (!toast) {
            toast = document.createElement("div");

            toast.id = "registration-error-toast";

            toast.className =
                "checkin-error-toast";

            toast.setAttribute("role", "alert");

            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.hidden = false;

        registrationToastTimer = setTimeout(
            hideRegistrationToast,
            7000
        );
    }

    function initRegistrationSuccessModal() {
        if (!$("checkin-notifications-css")) {
            const css = document.createElement("link");

            css.id = "checkin-notifications-css";
            css.rel = "stylesheet";

            css.href =
                "/Css/TiepNhan/checkinthongbao.css";

            document.head.appendChild(css);
        }

        const modal = document.createElement("div");

        modal.id = "registration-success-modal";

        modal.className =
            "modal fade checkin-success-modal";

        modal.tabIndex = -1;

        modal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
                <div class="modal-content">

                    <div class="modal-header">
                        <h2 class="modal-title">
                            Đăng ký thành công
                        </h2>

                        <button
                            class="btn-close"
                            type="button"
                            data-bs-dismiss="modal"
                            aria-label="Đóng">
                        </button>
                    </div>

                    <div class="modal-body text-center">
                        <div class="checkin-success-icon">
                            <i class="fa-solid fa-check"></i>
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
                                <dd id="success-ticket-room"></dd>
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
                        <button
                            class="btn btn-outline-secondary"
                            type="button"
                            data-bs-dismiss="modal">
                            Đóng
                        </button>

                        <a
                            class="btn btn-success"
                            href="/TiepNhan/dashboard">
                            Đến Dashboard
                        </a>
                    </div>

                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    function fillRegistrationSuccess(data) {
        setText(
            "success-ticket-number",
            `#${String(data.number).padStart(3, "0")}`
        );

        setText("success-ticket-patient", data.patient);

        setText(
            "success-ticket-department",
            data.department
        );

        setText(
            "success-ticket-doctor",
            data.doctor
        );

        setText(
            "success-ticket-room",
            data.room
        );

        setText(
            "success-ticket-date",
            formatDate(data.date)
        );

        setText(
            "success-ticket-time",
            String(data.time || "").slice(0, 5)
                || "--:--"
        );
    }

    // =====================================================
    // TRẠNG THÁI CÁC FORM
    // =====================================================

    function updateControls() {
        const busy =
            searching
            || savingPatient
            || registering;

        // Không khóa ô tìm kiếm trong lúc lọc
        $("patient-search-input").disabled =
            savingPatient || registering;

        $("patient-search-button").disabled =
            savingPatient || registering;

        const searchIcon =
            $("patient-search-button").querySelector("i");

        searchIcon.className =
            searching
                ? "fa-solid fa-spinner fa-spin"
                : "fa-solid fa-magnifying-glass";

        $("patient-search-button").setAttribute(
            "aria-busy",
            String(searching)
        );

        $("open-create-patient").disabled = busy;

        $("create-patient-fields").disabled =
            savingPatient;

        $("create-patient-close").disabled =
            savingPatient;

        $("phone-lookup-button").disabled =
            savingPatient || phoneLookupBusy;

        $("phone-create-other").disabled =
            savingPatient || phoneLookupBusy;

        $("new-patient-details").disabled =
            savingPatient || !allowNewPatient;

        $("create-patient-save").disabled =
            savingPatient
            || phoneLookupBusy
            || !allowNewPatient
            || checkedPhone !== normalizePhone(
                $("new-phone").value
            );

        $("create-patient-save").textContent =
            savingPatient
                ? "Đang lưu…"
                : "Lưu hồ sơ và đăng ký khám";

        $("phone-matches")
            .querySelectorAll("button")
            .forEach(button => {
                button.disabled =
                    savingPatient || phoneLookupBusy;
            });

        $("registration-close").disabled =
            registering;

        $("registration-fields").disabled =
            busy
            || loadingSchedules
            || registrationLocked;

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

        $("register-button").textContent =
            registering
                ? "Đang đăng ký…"
                : "Đăng ký và cấp số chờ";

        $("reload-schedules").disabled =
            busy
            || loadingSchedules
            || registrationLocked
            || !selectedPatientId;

        updateCallButtons();
    }

    function resetRegistration() {
        ++loadVersion;

        schedules = [];
        loadedDate = null;

        loadingSchedules = false;
        registrationLocked = false;
        showSuccessAfterRegistration = false;

        hideRegistrationToast();

        $("registration-form").reset();

        resetSelect(
            "department-select",
            "Chọn khoa"
        );

        resetSelect(
            "schedule-select",
            "Chọn khoa trước"
        );

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

    function selectPatient(patient) {
        selectedPatientId = positiveId(
            patient.maBenhNhan ?? patient.MaBenhNhan
        );

        if (!selectedPatientId) {
            throw new Error(
                "Mã bệnh nhân không hợp lệ."
            );
        }

        selectedPatientName =
            patient.hoTen
            ?? patient.HoTen
            ?? "Bệnh nhân";

        resetRegistration();

        setText(
            "selected-id",
            `Mã bệnh nhân: ${selectedPatientId}`
        );

        setText(
            "selected-name",
            selectedPatientName
        );

        setText(
            "selected-birth-date",
            formatDate(patient.ngaySinh)
        );

        setText(
            "selected-gender",
            patient.gioiTinh
        );

        setText(
            "selected-phone",
            patient.soDienThoai
        );

        setText(
            "selected-address",
            patient.diaChi
        );

        $("selected-patient").hidden = false;
        $("patient-empty").hidden = true;

        $("registration-area").hidden = false;
        $("registration-empty").hidden = true;

        void loadDepartments();
    }

    // =====================================================
    // TRA CỨU SỐ ĐIỆN THOẠI KHI CHỌN HỒ SƠ
    // =====================================================

    function invalidatePhoneLookup() {
        ++phoneLookupVersion;

        clearTimeout(phoneLookupTimer);

        phoneLookupController?.abort();

        phoneLookupController = null;
        phoneLookupBusy = false;

        phoneMatches = [];
        checkedPhone = "";
        allowNewPatient = false;

        $("phone-matches").replaceChildren();
        $("phone-matches-panel").hidden = true;

        updateControls();
    }

    function setPhoneLookupStatus(
        message,
        type = "secondary"
    ) {
        $("phone-lookup-status").textContent = message;

        $("phone-lookup-status").className =
            `small mt-2 text-${type}`;
    }

    function renderPhoneMatches(matches) {
        phoneMatches = matches;

        const list = $("phone-matches");

        list.replaceChildren();

        $("phone-matches-panel").hidden =
            matches.length === 0;

        matches.forEach(patient => {
            const button =
                document.createElement("button");

            button.type = "button";

            button.className =
                "list-group-item list-group-item-action text-start";

            const name = document.createElement("div");
            name.className = "fw-semibold";

            name.textContent =
                patient.hoTen || "Bệnh nhân";

            const detail = document.createElement("div");
            detail.className = "small text-secondary";

            detail.textContent = [
                patient.maBenhNhan,
                formatDate(patient.ngaySinh),
                patient.gioiTinh,
                patient.soDienThoai,
                patient.diaChi
            ].filter(Boolean).join(" · ");

            button.append(name, detail);

            button.addEventListener(
                "click",
                async () => {
                    if (
                        savingPatient
                        || phoneLookupBusy
                        || checkedPhone !== normalizePhone(
                            $("new-phone").value
                        )
                    ) {
                        return;
                    }

                    button.disabled = true;

                    try {
                        const id = positiveId(
                            patient.maBenhNhan
                        );

                        if (!id) {
                            throw new Error(
                                "Mã bệnh nhân không hợp lệ."
                            );
                        }

                        // Lấy thông tin đầy đủ, gồm địa chỉ
                        const full = await requestApi(
                            `/api/tiepnhan/ho-so-benh-nhan/${id}`
                        );

                        selectPatient(full);

                        openRegistrationAfterCreate = true;

                        createModal.hide();

                    } catch (error) {
                        showMessage(
                            "create-patient-message",
                            error.message
                        );

                        button.disabled = false;
                    }
                }
            );

            list.appendChild(button);
        });
    }

    async function lookupPhone() {
        if (
            savingPatient
            || registering
            || phoneLookupBusy
        ) {
            return;
        }

        const phone = normalizePhone(
            $("new-phone").value
        );

        invalidatePhoneLookup();

        const version = phoneLookupVersion;

        if (!phone) {
            setPhoneLookupStatus(
                "Nhập số điện thoại hợp lệ.",
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
                {
                    signal: controller.signal
                }
            );

            if (
                version !== phoneLookupVersion
                || !createElement.classList.contains("show")
            ) {
                return;
            }

            if (!Array.isArray(data)) {
                throw new Error(
                    "Danh sách bệnh nhân không hợp lệ."
                );
            }

            checkedPhone = phone;

            renderPhoneMatches(data);

            allowNewPatient = data.length === 0;

            setPhoneLookupStatus(
                data.length
                    ? `Tìm thấy ${data.length} hồ sơ. `
                      + "Chọn đúng bệnh nhân để đăng ký khám."
                    : "Chưa có hồ sơ dùng số này. "
                      + "Bạn có thể tạo hồ sơ mới.",
                data.length ? "primary" : "success"
            );

        } catch (error) {
            if (
                version !== phoneLookupVersion
                || error.name === "AbortError"
            ) {
                return;
            }

            setPhoneLookupStatus(
                "Không tra cứu được: "
                + error.message,
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
    // NGÀY SINH DD/MM/YYYY
    // =====================================================

    function readBirthDate() {
        const value =
            readValue("new-birth-date") || "";

        const match =
            /^(\d{2})\/(\d{2})\/(\d{4})$/
                .exec(value);

        if (!match) {
            throw new Error(
                "Nhập ngày sinh theo dạng dd/mm/yyyy."
            );
        }

        const day = Number(match[1]);
        const month = Number(match[2]);
        const year = Number(match[3]);

        const date = new Date(
            Date.UTC(year, month - 1, day)
        );

        if (
            year < 1000
            || date.getUTCFullYear() !== year
            || date.getUTCMonth() !== month - 1
            || date.getUTCDate() !== day
        ) {
            throw new Error(
                "Ngày sinh không hợp lệ."
            );
        }

        const iso =
            `${match[3]}-${match[2]}-${match[1]}`;

        if (iso > todayVietnam()) {
            throw new Error(
                "Ngày sinh không được lớn hơn hôm nay."
            );
        }

        return iso;
    }

    function initBirthDateInput() {
        const input = $("new-birth-date");
        const picker = $("birth-date-picker");

        const digitsOnly = text =>
            String(text || "")
                .replace(/\D/g, "")
                .slice(0, 8);

        input.addEventListener("input", () => {
            const digits = digitsOnly(input.value);

            input.value = [
                digits.slice(0, 2),
                digits.slice(2, 4),
                digits.slice(4, 8)
            ].filter(Boolean).join("/");
        });

        input.addEventListener("blur", () => {
            try {
                picker.value = readBirthDate();
            } catch {
                picker.value = "";
            }
        });

        $("open-birth-calendar").addEventListener(
            "click",
            () => {
                picker.max = todayVietnam();

                if (
                    typeof picker.showPicker === "function"
                ) {
                    try {
                        picker.showPicker();
                        return;
                    } catch {
                        // Dùng cách nhập thủ công
                    }
                }

                picker.focus();
            }
        );

        picker.addEventListener("change", () => {
            if (!picker.value) return;

            const [year, month, day] =
                picker.value.split("-");

            input.value =
                `${day}/${month}/${year}`;
        });

        $("create-patient-form").addEventListener(
            "reset",
            () => {
                picker.value = "";
            }
        );

        picker.max = todayVietnam();
    }

    // =====================================================
    // TẠO HỒ SƠ BỆNH NHÂN
    // =====================================================

    async function savePatient(event) {
        event.preventDefault();

        if (
            savingPatient
            || registering
            || phoneLookupBusy
        ) {
            return;
        }

        const form = $("create-patient-form");

        showMessage("create-patient-message", "");

        const phone = normalizePhone(
            $("new-phone").value
        );

        if (
            !phone
            || checkedPhone !== phone
            || !allowNewPatient
        ) {
            showMessage(
                "create-patient-message",
                "Hãy kiểm tra số điện thoại trước khi tạo hồ sơ.",
                "warning"
            );
            return;
        }

        if (!form.reportValidity()) {
            return;
        }

        let ngaySinh;
        let emergencyPhone;

        try {
            ngaySinh = readBirthDate();

            emergencyPhone =
                readValue("new-emergency-phone");

            if (emergencyPhone) {
                emergencyPhone =
                    normalizePhone(emergencyPhone);

                if (!emergencyPhone) {
                    throw new Error(
                        "Số điện thoại khẩn cấp không hợp lệ."
                    );
                }
            }

        } catch (error) {
            showMessage(
                "create-patient-message",
                error.message
            );
            return;
        }

        const payload = {
            hoTen: readValue("new-name"),
            ngaySinh,
            gioiTinh: readValue("new-gender"),
            soDienThoai: phone,
            email: readValue("new-email"),
            diaChi: readValue("new-address"),
            soDienThoaiKhanCap: emergencyPhone,
            tienSuBenh: readValue("new-medical-history")
        };

        savingPatient = true;
        updateControls();

        try {
            // Kiểm tra lại hồ sơ trùng trước khi tạo
            const latest = await requestApi(
                `${PHONE_API}?soDienThoai=${encodeURIComponent(phone)}`
            );

            if (!Array.isArray(latest)) {
                throw new Error(
                    "Kết quả tra cứu không hợp lệ."
                );
            }

            const existing = latest.find(patient =>
                normalizeText(patient.hoTen)
                    === normalizeText(payload.hoTen)

                && String(
                    patient.ngaySinh || ""
                ).slice(0, 10) === ngaySinh
            );

            if (existing) {
                renderPhoneMatches(latest);

                allowNewPatient = false;

                showMessage(
                    "create-patient-message",
                    "Đã có hồ sơ trùng họ tên, ngày sinh "
                    + "và số điện thoại. "
                    + "Hãy chọn hồ sơ có sẵn.",
                    "warning"
                );

                return;
            }

            const result = await requestApi(
                "/api/tiepnhan/benh-nhan",
                {
                    method: "POST",
                    body: JSON.stringify(payload)
                }
            );

            const id = positiveId(
                result.maBenhNhan
            );

            if (!id) {
                throw new Error(
                    "Phản hồi thiếu mã bệnh nhân. "
                    + "Hãy kiểm tra lại danh sách."
                );
            }

            selectPatient({
                ...payload,
                maBenhNhan: id
            });

            savingPatient = false;
            updateControls();

            openRegistrationAfterCreate = true;

            createModal.hide();

            form.reset();

            showMessage(
                "page-message",
                `Đã tạo hồ sơ ${payload.hoTen}, mã ${id}.`,
                "success"
            );

        } catch (error) {
            showMessage(
                "create-patient-message",
                error.message
            );

        } finally {
            savingPatient = false;
            updateControls();
        }
    }

    // =====================================================
    // TẢI KHOA CHO FORM ĐĂNG KÝ KHÁM
    // =====================================================

    async function loadDepartments() {
        if (
            !selectedPatientId
            || registering
            || registrationLocked
        ) {
            return;
        }

        const version = ++loadVersion;

        loadingSchedules = true;
        schedules = [];
        loadedDate = null;

        resetSelect(
            "department-select",
            "Đang tải khoa…"
        );

        resetSelect(
            "schedule-select",
            "Chọn khoa trước"
        );

        $("schedule-summary").hidden = true;
        $("appointment-time").value = "";

        $("registration-date").value =
            formatDate(todayVietnam());

        showMessage("registration-message", "");

        updateControls();

        try {
            const date = todayVietnam();

            const data = await requestApi(
                `${API}/khoa`
            );

            if (version !== loadVersion) {
                return;
            }

            if (!Array.isArray(data)) {
                throw new Error(
                    "Danh sách khoa không hợp lệ."
                );
            }

            if (date !== todayVietnam()) {
                throw new Error(
                    "Ngày đã thay đổi. Hãy tải lại lịch bác sĩ."
                );
            }

            loadedDate = date;

            resetSelect(
                "department-select",
                "Chọn khoa"
            );

            data.forEach(item => {
                $("department-select").add(
                    new Option(
                        item.tenKhoa,
                        String(item.maKhoa)
                    )
                );
            });

            if (!data.length) {
                showMessage(
                    "registration-message",
                    "Hôm nay chưa có ca làm việc phù hợp.",
                    "info"
                );
            }

        } catch (error) {
            if (version !== loadVersion) {
                return;
            }

            resetSelect(
                "department-select",
                "Chưa tải được khoa"
            );

            showMessage(
                "registration-message",
                error.message
            );

        } finally {
            if (version === loadVersion) {
                loadingSchedules = false;
                updateControls();
            }
        }
    }

    // =====================================================
    // TẢI LỊCH BÁC SĨ
    // =====================================================

    async function loadDoctorSchedules() {
        if (
            registering
            || registrationLocked
        ) {
            return;
        }

        const version = ++loadVersion;

        const maKhoa = Number(
            $("department-select").value
        );

        schedules = [];

        $("schedule-summary").hidden = true;
        $("appointment-time").value = "";

        showMessage("registration-message", "");

        if (!maKhoa) {
            resetSelect(
                "schedule-select",
                "Chọn khoa trước"
            );

            loadingSchedules = false;
            updateControls();

            return;
        }

        loadingSchedules = true;

        resetSelect(
            "schedule-select",
            "Đang tải lịch bác sĩ…"
        );

        updateControls();

        try {
            if (loadedDate !== todayVietnam()) {
                throw new Error(
                    "Ngày đã thay đổi. Hãy tải lại lịch."
                );
            }

            const data = await requestApi(
                `${API}/lich-bac-si?maKhoa=${maKhoa}`
            );

            if (version !== loadVersion) {
                return;
            }

            if (!Array.isArray(data)) {
                throw new Error(
                    "Danh sách lịch bác sĩ không hợp lệ."
                );
            }

            schedules = data;

            resetSelect(
                "schedule-select",
                "Chọn bác sĩ và ca làm việc"
            );

            data.forEach(item => {
                $("schedule-select").add(
                    new Option(
                        `${item.tenBacSi} — `
                        + `${item.gioBatDau}–${item.gioKetThuc}`
                        + ` — ${item.tenPhong}`,

                        String(item.maLichLamViec)
                    )
                );
            });

            if (!data.length) {
                showMessage(
                    "registration-message",
                    "Khoa không còn ca làm việc phù hợp.",
                    "info"
                );
            }

        } catch (error) {
            if (version !== loadVersion) {
                return;
            }

            schedules = [];

            resetSelect(
                "schedule-select",
                "Chưa có lịch bác sĩ"
            );

            showMessage(
                "registration-message",
                error.message
            );

        } finally {
            if (version === loadVersion) {
                loadingSchedules = false;
                updateControls();
            }
        }
    }

    // =====================================================
    // KIỂM TRA GIỜ ĐĂNG KÝ
    // =====================================================

    function toMinutes(value) {
        const match =
            /^(\d{2}):(\d{2})/
                .exec(String(value || ""));

        if (!match) {
            return NaN;
        }

        const hour = Number(match[1]);
        const minute = Number(match[2]);

        return hour <= 23 && minute <= 59
            ? hour * 60 + minute
            : NaN;
    }

    function minuteText(value) {
        return (
            `${String(Math.floor(value / 60)).padStart(2, "0")}:`
            + `${String(value % 60).padStart(2, "0")}`
        );
    }

    function scheduleBounds(schedule) {
        const now = vietnamNow();

        const start =
            toMinutes(schedule.gioBatDau);

        const end =
            toMinutes(schedule.gioKetThuc);

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

        const minimum = Math.max(
            start,
            toMinutes(now.time)
        );

        const maximum = end - 1;

        if (minimum > maximum) {
            throw new Error(
                "Ca làm việc đã hết giờ đăng ký."
            );
        }

        return {
            minimum,
            maximum
        };
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

        setText(
            "schedule-doctor",
            schedule.tenBacSi
        );

        setText(
            "schedule-room",
            schedule.tenPhong
        );

        setText(
            "schedule-hours",
            `${schedule.gioBatDau}–${schedule.gioKetThuc}`
        );

        try {
            const { minimum, maximum } =
                scheduleBounds(schedule);

            $("appointment-time").min =
                minuteText(minimum);

            $("appointment-time").max =
                minuteText(maximum);

            $("appointment-time-help").textContent =
                `Có thể đăng ký từ ${minuteText(minimum)} `
                + `đến ${minuteText(maximum)}.`;

        } catch (error) {
            showMessage(
                "registration-message",
                error.message
            );
        }

        updateControls();
    }

    // =====================================================
    // ĐĂNG KÝ LƯỢT KHÁM VÀ CẤP SỐ CHỜ
    // =====================================================

    async function registerAppointment(event) {
        event.preventDefault();

        if (
            registering
            || savingPatient
            || searching
            || loadingSchedules
            || registrationLocked
        ) {
            return;
        }

        if (!selectedPatientId) {
            showMessage(
                "registration-message",
                "Vui lòng chọn bệnh nhân."
            );
            return;
        }

        const schedule = selectedSchedule();

        if (
            !schedule
            || !$("registration-form").reportValidity()
        ) {
            return;
        }

        showMessage("registration-message", "");

        const time = readValue("appointment-time");

        try {
            const { minimum, maximum } =
                scheduleBounds(schedule);

            const value = toMinutes(time);

            if (
                !/^\d{2}:\d{2}$/.test(time || "")
                || !Number.isFinite(value)
                || value < minimum
                || value > maximum
            ) {
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

        const payload = {
            maBenhNhan: selectedPatientId,

            maKhoa: Number(
                $("department-select").value
            ),

            maBacSi: Number(
                schedule.maBacSi
            ),

            maLichLamViec: Number(
                schedule.maLichLamViec
            ),

            gioKham: time,

            lyDoKham: readValue(
                "appointment-reason"
            )
        };

        registering = true;
        updateControls();

        try {
            const result = await requestApi(
                API,
                {
                    method: "POST",
                    body: JSON.stringify(payload)
                }
            );

            registrationLocked = true;

            const number = positiveId(
                result.soThuTu
            );

            const appointmentId = positiveId(
                result.maLichKham
            );

            if (!number || !appointmentId) {
                throw new Error(
                    "Phản hồi thiếu mã lịch hoặc số chờ. "
                    + "Hãy kiểm tra danh sách."
                );
            }

            fillRegistrationSuccess({
                number,

                patient:
                    selectedPatientName,

                department:
                    $("department-select")
                        .selectedOptions[0]
                        .textContent,

                doctor:
                    schedule.tenBacSi,

                room:
                    schedule.tenPhong,

                date:
                    result.ngayKham,

                time:
                    result.gioKham
            });

            showSuccessAfterRegistration = true;

            void loadAppointments();

        } catch (error) {
            const errorMessage =
                error.message
                || "Không thể đăng ký lượt khám.";

            if (
                normalizeText(errorMessage).includes(
                    "benh nhan da co luot kham tai khoa nay hom nay"
                )
            ) {
                registrationLocked = false;

                showRegistrationToast(errorMessage);

                void loadAppointments();

            } else {
                showMessage(
                    "registration-message",
                    errorMessage
                );

                if (
                    !error.status
                    || error.status >= 500
                ) {
                    registrationLocked = true;
                }
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
    // THÔNG BÁO HEADER
    // =====================================================

    function initNotifications() {
        const wrapper = $("notification-wrapper");
        const button = $("notification-button");
        const panel = $("notification-panel");
        const close = $("notification-close");

        if (
            !wrapper
            || !button
            || !panel
            || !close
        ) {
            return;
        }

        function setOpen(open) {
            panel.hidden = !open;

            button.setAttribute(
                "aria-expanded",
                String(open)
            );

            button.setAttribute(
                "aria-label",
                open
                    ? "Đóng thông báo"
                    : "Mở thông báo"
            );
        }

        button.addEventListener("click", () => {
            setOpen(panel.hidden);
        });

        close.addEventListener("click", () => {
            setOpen(false);
        });

        document.addEventListener("click", event => {
            if (!wrapper.contains(event.target)) {
                setOpen(false);
            }
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                setOpen(false);
            }
        });
    }

    // =====================================================
    // SỰ KIỆN GIAO DIỆN
    // =====================================================

    $("patient-search-form").addEventListener(
        "submit",
        searchPatient
    );

    $("patient-search-input").addEventListener(
        "input",
        onSearchInput
    );

    // Lọc theo phòng khám
    $("appointment-room-filter")?.addEventListener(
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

            if (!button || button.disabled) {
                return;
            }

            if (button.dataset.action === "call-patient") {
                void callPatient(
                    button.dataset.appointmentId
                );
            }

            if (button.dataset.action === "open-profile") {
                openProfile(
                    button.dataset.patientId,
                    button.dataset.appointmentId
                );
            }
        }
    );

    $("open-create-patient").addEventListener(
        "click",
        () => {
            if (
                savingPatient
                || registering
                || searching
            ) {
                return;
            }

            openRegistrationAfterCreate = false;

            $("create-patient-form").reset();

            invalidatePhoneLookup();

            showMessage("create-patient-message", "");

            setPhoneLookupStatus(
                "Nhập số điện thoại để tìm hồ sơ đã có."
            );

            const phone = normalizePhone(
                $("patient-search-input").value
            );

            if (phone) {
                $("new-phone").value = phone;
            }

            createModal.show();
        }
    );

    createElement.addEventListener(
        "shown.bs.modal",
        () => {
            $("new-phone").focus();

            if (
                normalizePhone($("new-phone").value)
            ) {
                void lookupPhone();
            }
        }
    );

    $("new-phone").addEventListener(
        "input",
        () => {
            invalidatePhoneLookup();

            showMessage("create-patient-message", "");

            if (
                normalizePhone($("new-phone").value)
            ) {
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
        }
    );

    $("new-phone").addEventListener(
        "keydown",
        event => {
            if (event.key === "Enter") {
                event.preventDefault();
                void lookupPhone();
            }
        }
    );

    $("phone-lookup-button").addEventListener(
        "click",
        () => {
            void lookupPhone();
        }
    );

    $("phone-create-other").addEventListener(
        "click",
        () => {
            if (
                savingPatient
                || phoneLookupBusy
                || !phoneMatches.length
                || checkedPhone !== normalizePhone(
                    $("new-phone").value
                )
            ) {
                return;
            }

            allowNewPatient = true;
            updateControls();

            setPhoneLookupStatus(
                "Tạo hồ sơ riêng cho người khác dùng chung số liên hệ.",
                "primary"
            );

            $("new-name").focus();
        }
    );

    $("create-patient-form").addEventListener(
        "submit",
        savePatient
    );

    createElement.addEventListener(
        "hide.bs.modal",
        event => {
            if (savingPatient) {
                event.preventDefault();
            }
        }
    );

    createElement.addEventListener(
        "hidden.bs.modal",
        () => {
            invalidatePhoneLookup();

            if (openRegistrationAfterCreate) {
                openRegistrationAfterCreate = false;

                registrationModal.show();
            }
        }
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

    $("appointment-time").addEventListener(
        "input",
        () => {
            $("appointment-time").setCustomValidity("");
        }
    );

    $("reload-schedules").addEventListener(
        "click",
        () => {
            void loadDepartments();
        }
    );

    registrationElement.addEventListener(
        "hide.bs.modal",
        event => {
            if (registering) {
                event.preventDefault();
            }
        }
    );

    registrationElement.addEventListener(
        "hidden.bs.modal",
        () => {
            if (showSuccessAfterRegistration) {
                showSuccessAfterRegistration = false;

                bootstrap.Modal.getOrCreateInstance(
                    $("registration-success-modal")
                ).show();

            } else {
                $("patient-search-input").focus();
            }
        }
    );

    // =====================================================
    // KHỞI TẠO
    // =====================================================

    // Đổi bộ lọc Khoa thành Phòng trước khi dùng
    initCheckinUI();

    initRegistrationSuccessModal();
    initBirthDateInput();
    initNotifications();

    updateTodayDisplay();
    updateControls();

    void loadAppointments();
})();
