(() => {
    "use strict";

    const $ = id => document.getElementById(id);
    const API = "/api/tiepnhan/dang-ky-kham";
    const PHONE_API =
        "/api/tiepnhan/benh-nhan/tra-cuu-so-dien-thoai";

    const TrangThai = window.TiepNhanTrangThai;

    if (!TrangThai || !window.bootstrap) {
        $("page-message").hidden = false;
        $("page-message").textContent =
            "Chưa tải được Bootstrap hoặc trangthai.js.";
        return;
    }

    const createElement = $("create-patient-modal");
    const registrationElement = $("registration-modal");

    const createModal =
        bootstrap.Modal.getOrCreateInstance(createElement);

    const registrationModal =
        bootstrap.Modal.getOrCreateInstance(registrationElement);

    let searching = false;
    let savingPatient = false;
    let registering = false;
    let loadingSchedules = false;
    let registrationLocked = false;
    let checkingPatient = false;
    let patientSaveLocked = false;

    let selectedPatientId = null;
    let selectedPatientName = "";

    let appointments = [];
    let schedules = [];
    let loadedDate = null;
    let appointmentsDate = null;
    let appointmentsJob = null;

    let callingAppointmentId = null;
    let loadVersion = 0;
    let openRegistrationAfterCreate = false;

    let phoneTimer = null;
    let phoneController = null;
    let phoneVersion = 0;
    let phoneLoading = false;
    let checkedPhone = "";
    let phoneMatches = [];
    let allowSharedPhone = false;

    // =====================================================
    // HÀM DÙNG CHUNG
    // =====================================================

    function showMessage(id, message = "", type = "danger") {
        const box = $(id);

        if (!box) return;

        box.className = `alert alert-${type}`;
        box.textContent = message;
        box.hidden = !message;
    }

    function setText(id, value) {
        if ($(id)) {
            $(id).textContent = value ?? "Chưa cung cấp";
        }
    }

    function readValue(id) {
        return $(id).value.trim() || null;
    }

    function positiveId(value) {
        const id = Number(value);

        return Number.isSafeInteger(id) && id > 0
            ? id
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

        const get = name =>
            parts.find(part => part.type === name).value;

        return {
            date: `${get("year")}-${get("month")}-${get("day")}`,
            time: `${get("hour")}:${get("minute")}`
        };
    }

    function todayVietnam() {
        return vietnamNow().date;
    }

    function formatDate(value) {
        const match = /^(\d{4})-(\d{2})-(\d{2})/
            .exec(String(value || ""));

        return match
            ? `${match[3]}/${match[2]}/${match[1]}`
            : "Chưa cung cấp";
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

    async function requestApi(url, options = {}) {
        const token =
            sessionStorage.getItem("Token")
            || localStorage.getItem("Token")
            || sessionStorage.getItem("token")
            || localStorage.getItem("token");

        if (!token) {
            throw new Error(
                "Vui lòng đăng nhập lại để tiếp tục."
            );
        }

        const headers = new Headers(options.headers || {});

        headers.set("Authorization", `Bearer ${token}`);
        headers.set("Accept", "application/json");

        if (options.body) {
            headers.set("Content-Type", "application/json");
        }

        const controller = new AbortController();
        const externalSignal = options.signal;
        const abort = () => controller.abort();

        if (externalSignal?.aborted) {
            controller.abort();
        }

        externalSignal?.addEventListener(
            "abort",
            abort,
            { once: true }
        );

        const timer = setTimeout(abort, 20000);
        let status;

        try {
            const response = await fetch(url, {
                ...options,
                cache: "no-store",
                headers,
                signal: controller.signal
            });

            status = response.status;

            const raw = await response.text();
            let data;

            try {
                data = JSON.parse(raw);
            } catch {
                throw new Error(
                    "Máy chủ trả về dữ liệu không hợp lệ. "
                    + "Hãy kiểm tra đăng nhập."
                );
            }

            if (!response.ok) {
                throw new Error(
                    data?.message
                    || data?.detail
                    || (
                        status === 401
                            ? "Phiên đăng nhập đã hết hạn."
                            : status === 403
                                ? "Bạn không có quyền thực hiện thao tác này."
                                : "Không thể thực hiện yêu cầu."
                    )
                );
            }

            if (data === null) {
                throw new Error(
                    "Máy chủ chưa trả về dữ liệu."
                );
            }

            return data;
        } catch (error) {
            if (externalSignal?.aborted) {
                throw error;
            }

            const failure = new Error(
                error.name === "AbortError"
                    ? "Yêu cầu quá thời gian chờ. "
                        + "Vui lòng kiểm tra lại dữ liệu."
                    : error.message
            );

            failure.status = status;
            throw failure;
        } finally {
            clearTimeout(timer);

            externalSignal?.removeEventListener(
                "abort",
                abort
            );
        }
    }

    function uncertain(error) {
        return !error.status
            || error.status >= 500
            || (
                error.status >= 200
                && error.status < 300
            );
    }

    function busy() {
        return searching || savingPatient || registering;
    }

    // =====================================================
    // DANH SÁCH LỊCH KHÁM
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
        const khoa =
            $("appointment-department-filter").value;

        populateFilter(
            "appointment-doctor-filter",
            appointments
                .filter(item => !khoa || item.khoa === khoa)
                .map(item => item.bacSi),
            "Tất cả bác sĩ"
        );
    }

    function cell(value, className = "") {
        const td = document.createElement("td");

        td.className = className;
        td.textContent = value ?? "—";

        return td;
    }

    function detailCell(primary, secondary) {
        const td = document.createElement("td");
        const name = document.createElement("div");

        name.className = "appointment-patient-name";
        name.textContent = primary || "Chưa cập nhật";

        const sub = document.createElement("div");

        sub.className = "appointment-secondary-text";
        sub.textContent = secondary || "";

        td.append(name, sub);

        return td;
    }

    function callReason(item) {
        if (
            callingAppointmentId !== null
            || appointmentsJob
            || busy()
        ) {
            return "Vui lòng chờ thao tác hiện tại hoàn tất.";
        }

        if (appointmentsDate !== todayVietnam()) {
            return "Hãy làm mới danh sách hôm nay.";
        }

        if (!positiveId(item?.maLichKham)) {
            return "Mã lịch khám không hợp lệ.";
        }

        if (
            !["ChoGoi", "DaGoi"].includes(
                TrangThai.layMa(item.trangThai)
            )
        ) {
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

    function renderAppointments() {
        const doctor =
            $("appointment-doctor-filter").value;

        const department =
            $("appointment-department-filter").value;

        const status =
            $("appointment-status-filter").value;

        const filtered = appointments.filter(item =>
            (!doctor || item.bacSi === doctor)
            && (!department || item.khoa === department)
            && (
                !status
                || TrangThai.layMa(item.trangThai) === status
            )
        );

        const body = $("appointments-table-body");
        body.replaceChildren();

        filtered.forEach(item => {
            const row = document.createElement("tr");
            const sttCell = document.createElement("td");
            const badge = document.createElement("span");

            badge.className = "badge-stt-purple";
            badge.style.whiteSpace = "nowrap";
            badge.style.width = "auto";
            badge.textContent = item.stt || "—";

            sttCell.append(badge);

            const statusCell = document.createElement("td");

            statusCell.append(
                TrangThai.taoNhan(item.trangThai)
            );

            const actionCell = document.createElement("td");
            actionCell.className = "appointment-profile-column";

            const actions = document.createElement("div");
            actions.className = "appointment-row-actions";

            if (
                ["ChoGoi", "DaGoi"].includes(
                    TrangThai.layMa(item.trangThai)
                )
            ) {
                const button = document.createElement("button");

                button.type = "button";
                button.className = "appointment-call-button";
                button.dataset.action = "call-patient";
                button.dataset.appointmentId =
                    item.maLichKham ?? "";

                const reason = callReason(item);

                button.disabled = !!reason;
                button.title = reason || "Gọi bệnh nhân";

                button.setAttribute(
                    "aria-label",
                    `Gọi bệnh nhân ${item.tenBenhNhan || ""}`
                );

                const icon = document.createElement("i");

                icon.className =
                    callingAppointmentId
                        === positiveId(item.maLichKham)
                        ? "fa-solid fa-spinner fa-spin"
                        : "fa-solid fa-volume-high";

                icon.setAttribute("aria-hidden", "true");

                button.append(icon);
                actions.append(button);
            }

            const profile = document.createElement("button");

            profile.type = "button";
            profile.className =
                "btn btn-outline-primary btn-sm text-nowrap";

            profile.textContent = "Hồ sơ";
            profile.dataset.action = "open-profile";
            profile.dataset.patientId =
                item.maBenhNhan ?? "";

            profile.dataset.appointmentId =
                item.maLichKham ?? "";

            profile.disabled =
                busy()
                || !!appointmentsJob
                || callingAppointmentId !== null
                || !positiveId(item.maBenhNhan)
                || !positiveId(item.maLichKham);

            actions.append(profile);
            actionCell.append(actions);

            row.append(
                sttCell,

                cell(
                    item.maLichKham,
                    "fw-semibold text-primary"
                ),

                detailCell(
                    item.tenBenhNhan,
                    [item.maBn, item.thongTinPhu]
                        .filter(Boolean)
                        .join(" · ")
                ),

                detailCell(item.khoa, item.bacSi),
                cell(item.phong || "Chưa phân công"),
                cell(item.gioHen || "--:--"),
                statusCell,
                actionCell
            );

            body.append(row);
        });

        $("appointments-empty").hidden =
            filtered.length > 0;

        setText(
            "appointments-empty-message",
            appointments.length
                ? "Không có lịch khám phù hợp với bộ lọc."
                : "Chưa có lịch khám trong ngày."
        );

        setText(
            "appointments-record-count",
            `Hiển thị ${filtered.length}/${appointments.length} lịch khám`
        );
    }

    function loadAppointments() {
        if (appointmentsJob) {
            return appointmentsJob;
        }

        appointmentsJob = (async () => {
            const date = todayVietnam();

            updateTodayDisplay();

            try {
                const data = await requestApi(
                    "/api/tiepnhan/dashboard-data"
                );

                if (
                    !Array.isArray(data.hangDoiKham)
                    || date !== todayVietnam()
                ) {
                    throw new Error(
                        "Danh sách chưa hợp lệ hoặc ngày đã thay đổi. "
                        + "Hãy làm mới."
                    );
                }

                appointmentsDate = date;

                appointments = [...data.hangDoiKham]
                    .sort((a, b) =>
                        String(a.gioHen || "99:99")
                            .localeCompare(
                                String(b.gioHen || "99:99")
                            )
                        || Number(a.maLichKham)
                            - Number(b.maLichKham)
                    );

                populateFilter(
                    "appointment-department-filter",
                    appointments.map(item => item.khoa),
                    "Tất cả khoa"
                );

                TrangThai.taoBoLoc(
                    $("appointment-status-filter")
                );

                populateDoctorFilter();

                return true;
            } catch (error) {
                showMessage(
                    "page-message",
                    error.message
                    + " Danh sách chưa được cập nhật."
                );

                if (!appointments.length) {
                    setText(
                        "appointments-empty-message",
                        "Chưa tải được danh sách lịch khám."
                    );

                    setText(
                        "appointments-record-count",
                        "Dữ liệu chưa được cập nhật."
                    );
                }

                return false;
            }
        })().finally(() => {
            appointmentsJob = null;

            if (appointmentsDate) {
                renderAppointments();
            }

            updateControls();
        });

        updateControls();

        return appointmentsJob;
    }

    // =====================================================
    // GỌI BỆNH NHÂN
    // =====================================================

    async function callPatient(rawId) {
        const id = positiveId(rawId);

        const item = appointments.find(
            row => positiveId(row.maLichKham) === id
        );

        const reason = callReason(item);

        if (reason) {
            showMessage("page-message", reason, "warning");
            return;
        }

        callingAppointmentId = id;
        updateControls();

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
                    || "Chưa xác nhận gọi thành công."
                );
            }

            item.trangThai = "DaGoi";

            showMessage(
                "page-message",
                `Đã gọi bệnh nhân ${item.tenBenhNhan || ""}.`,
                "success"
            );

            if (
                "speechSynthesis" in window
                && "SpeechSynthesisUtterance" in window
            ) {
                const sequence = String(
                    result.soThuTu ?? item.stt ?? ""
                ).replace(/^#0*/, "");

                const speech = new SpeechSynthesisUtterance(
                    `Xin mời bệnh nhân ${
                        result.tenBenhNhan
                        || item.tenBenhNhan
                        || ""
                    }, `
                    + `số thứ tự ${sequence}, `
                    + `đến khu vực chờ trước ${
                        result.phong || item.phong
                    }, khoa ${item.khoa || ""}, `
                    + "để kiểm tra thông tin trước khi khám."
                );

                speech.lang = "vi-VN";
                speech.rate = 0.9;

                const voice =
                    window.speechSynthesis
                        .getVoices()
                        .find(item =>
                            item.lang
                                .toLowerCase()
                                .startsWith("vi")
                        );

                if (voice) {
                    speech.voice = voice;
                }

                speech.onerror = event => {
                    if (
                        !["canceled", "interrupted"]
                            .includes(event.error)
                    ) {
                        showMessage(
                            "page-message",
                            "Đã cập nhật trạng thái gọi nhưng "
                            + "chưa phát được loa. "
                            + "Vui lòng gọi trực tiếp.",
                            "warning"
                        );
                    }
                };

                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(speech);
            } else {
                showMessage(
                    "page-message",
                    "Đã gọi bệnh nhân. "
                    + "Trình duyệt không hỗ trợ phát loa.",
                    "warning"
                );
            }

            await loadAppointments();
        } catch (error) {
            showMessage(
                "page-message",
                error.message
                + (
                    uncertain(error)
                        ? " Hãy làm mới để kiểm tra trước khi gọi lại."
                        : ""
                )
            );
        } finally {
            callingAppointmentId = null;
            renderAppointments();
            updateControls();
        }
    }

    // =====================================================
    // TRA CỨU SỐ ĐIỆN THOẠI
    // =====================================================

    function cleanPhone(value) {
        return String(value || "")
            .trim()
            .replace(/[\s().-]/g, "");
    }

    function phoneKey(value) {
        let phone = cleanPhone(value);

        if (!/^\+?[0-9]{9,14}$/.test(phone)) {
            return "";
        }

        phone = phone.replace(/^\+/, "");

        return /^84[0-9]{9}$/.test(phone)
            ? "0" + phone.slice(2)
            : phone;
    }

    function cancelLookup() {
        clearTimeout(phoneTimer);

        phoneController?.abort();
        phoneController = null;

        phoneVersion++;
        phoneLoading = false;
    }

    function resetLookup() {
        cancelLookup();

        checkedPhone = "";
        phoneMatches = [];
        allowSharedPhone = false;

        $("phone-lookup-list").replaceChildren();
        $("phone-lookup-results").hidden = true;
        $("phone-lookup-empty").hidden = true;
        $("phone-lookup-status").hidden = true;
    }

    function phoneStatus(text = "", error = false) {
        const box = $("phone-lookup-status");

        box.textContent = text;
        box.hidden = !text;

        box.className =
            `small mt-2 ${
                error ? "text-danger" : "text-sub"
            }`;
    }

    function creationAllowed() {
        return !!checkedPhone
            && checkedPhone
                === phoneKey($("new-phone").value)
            && !phoneLoading
            && (
                !phoneMatches.length
                || allowSharedPhone
            )
            && !patientSaveLocked;
    }

    function renderPhoneMatches() {
        const list = $("phone-lookup-list");

        list.replaceChildren();

        phoneMatches.forEach(patient => {
            const li = document.createElement("li");
            li.className = "list-group-item p-0";

            const button = document.createElement("button");

            button.type = "button";
            button.className =
                "btn text-start w-100 p-3";

            button.dataset.phonePatientId =
                patient.maBenhNhan;

            const title = document.createElement("div");

            title.className = "fw-semibold";
            title.textContent =
                patient.hoTen || "Chưa cập nhật họ tên";

            const detail = document.createElement("div");

            detail.className =
                "small text-secondary mt-1";

            detail.textContent =
                `Mã BN: ${patient.maBenhNhan}`
                + ` · Ngày sinh: ${formatDate(patient.ngaySinh)}`
                + ` · ${patient.gioiTinh || "Chưa có giới tính"}`
                + ` · ${patient.soDienThoai || ""}`;

            button.append(title, detail);
            li.append(button);
            list.append(li);
        });

        $("phone-lookup-results").hidden =
            !phoneMatches.length;

        $("phone-lookup-empty").hidden =
            phoneMatches.length > 0;
    }

    async function lookupPhone() {
        if (busy()) return false;

        cancelLookup();

        const phone = cleanPhone($("new-phone").value);
        const key = phoneKey(phone);

        checkedPhone = "";
        phoneMatches = [];
        allowSharedPhone = false;

        $("phone-lookup-results").hidden = true;
        $("phone-lookup-empty").hidden = true;

        if (!key) {
            phoneStatus(
                "Nhập đủ số điện thoại gồm 9–14 chữ số, "
                + "có thể bắt đầu bằng dấu +.",
                true
            );

            updateControls();
            return false;
        }

        const version = phoneVersion;

        phoneController = new AbortController();
        phoneLoading = true;

        phoneStatus("Đang kiểm tra hồ sơ...");
        updateControls();

        try {
            const data = await requestApi(
                `${PHONE_API}?soDienThoai=${
                    encodeURIComponent(phone)
                }`,
                {
                    signal: phoneController.signal
                }
            );

            if (
                version !== phoneVersion
                || key !== phoneKey($("new-phone").value)
            ) {
                return false;
            }

            if (
                !Array.isArray(data)
                || data.some(item =>
                    !item
                    || !positiveId(item.maBenhNhan)
                )
            ) {
                throw new Error(
                    "Danh sách gợi ý không hợp lệ. "
                    + "Vui lòng tra cứu lại."
                );
            }

            checkedPhone = key;
            phoneMatches = data;
            patientSaveLocked = false;

            renderPhoneMatches();

            phoneStatus(
                data.length
                    ? `Tìm thấy ${data.length} hồ sơ. `
                        + "Hãy chọn đúng bệnh nhân."
                    : ""
            );

            return true;
        } catch (error) {
            if (version !== phoneVersion) {
                return false;
            }

            phoneStatus(
                error.message
                + " Chưa thể xác định số điện thoại này "
                + "đã có hồ sơ hay chưa.",
                true
            );

            return false;
        } finally {
            if (version === phoneVersion) {
                phoneLoading = false;
                phoneController = null;
                updateControls();
            }
        }
    }

    function onPhoneInput() {
        resetLookup();

        showMessage("create-patient-message", "");
        updateControls();

        if (phoneKey($("new-phone").value)) {
            phoneTimer = setTimeout(
                () => void lookupPhone(),
                450
            );
        }
    }

    async function choosePhonePatient(rawId) {
        if (busy() || phoneLoading) return;

        const id = positiveId(rawId);

        if (
            !id
            || checkedPhone
                !== phoneKey($("new-phone").value)
            || !phoneMatches.some(
                patient =>
                    positiveId(patient.maBenhNhan) === id
            )
        ) {
            return;
        }

        searching = true;
        updateControls();

        try {
            const patient = await requestApi(
                `/api/tiepnhan/ho-so-benh-nhan/${id}`
            );

            if (
                positiveId(
                    patient.maBenhNhan
                    ?? patient.MaBenhNhan
                ) !== id
            ) {
                throw new Error(
                    "Hồ sơ trả về không đúng bệnh nhân đã chọn."
                );
            }

            selectPatient(patient);

            $("patient-search-input").value = String(id);

            openRegistrationAfterCreate = true;
            searching = false;

            updateControls();
            createModal.hide();
        } catch (error) {
            showMessage(
                "create-patient-message",
                error.message
            );
        } finally {
            searching = false;
            updateControls();
        }
    }

    // =====================================================
    // NGÀY SINH
    // =====================================================

    function readBirthDate(optional = false) {
        const value = readValue("new-birth-date");

        if (!value && optional) {
            return null;
        }

        const match =
            /^(\d{2})\/(\d{2})\/(\d{4})$/
                .exec(value || "");

        if (!match) {
            throw new Error(
                "Nhập đủ ngày sinh theo dạng dd/mm/yyyy."
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
            throw new Error("Ngày sinh không hợp lệ.");
        }

        const iso =
            `${match[3]}-${match[2]}-${match[1]}`;

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

        const digits = value =>
            String(value).replace(/\D/g, "");

        function render(value, position) {
            const output = [
                value.slice(0, 2),
                value.slice(2, 4),
                value.slice(4, 8)
            ].filter(Boolean).join("/");

            input.value = output;

            let cursor = 0;
            let count = 0;

            while (
                cursor < output.length
                && count < position
            ) {
                if (/\d/.test(output[cursor])) {
                    count++;
                }

                cursor++;
            }

            if (output[cursor] === "/") {
                cursor++;
            }

            input.setSelectionRange(cursor, cursor);
        }

        function edit(action, text = "") {
            const value = input.value;

            const start =
                input.selectionStart ?? value.length;

            const end =
                input.selectionEnd ?? start;

            let all = digits(value);
            let from = digits(value.slice(0, start)).length;
            let to = digits(value.slice(0, end)).length;

            if (action === "insert") {
                const added = digits(text).slice(
                    0,
                    Math.max(
                        0,
                        8 - all.length + to - from
                    )
                );

                all =
                    all.slice(0, from)
                    + added
                    + all.slice(to);

                from += added.length;
            } else {
                if (from === to) {
                    if (action === "backward") {
                        if (!from) return;
                        from--;
                    } else {
                        if (to >= all.length) return;
                        to++;
                    }
                }

                all =
                    all.slice(0, from)
                    + all.slice(to);
            }

            render(all.slice(0, 8), from);
        }

        input.addEventListener("beforeinput", event => {
            if (
                !event.cancelable
                || event.isComposing
            ) {
                return;
            }

            if (
                ["insertText", "insertReplacementText"]
                    .includes(event.inputType)
                && event.data !== null
            ) {
                event.preventDefault();
                edit("insert", event.data);

            } else if (
                [
                    "deleteContentBackward",
                    "deleteWordBackward",
                    "deleteSoftLineBackward"
                ].includes(event.inputType)
            ) {
                event.preventDefault();

                if (
                    event.inputType
                        !== "deleteContentBackward"
                ) {
                    input.setSelectionRange(
                        0,
                        input.selectionEnd ?? 0
                    );
                }

                edit("backward");

            } else if (
                [
                    "deleteContentForward",
                    "deleteWordForward",
                    "deleteSoftLineForward"
                ].includes(event.inputType)
            ) {
                event.preventDefault();

                if (
                    event.inputType
                        !== "deleteContentForward"
                ) {
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

        function normalize() {
            const cursor =
                input.selectionStart ?? input.value.length;

            render(
                digits(input.value).slice(0, 8),
                digits(
                    input.value.slice(0, cursor)
                ).length
            );
        }

        input.addEventListener("input", event => {
            if (!event.isComposing) {
                normalize();
            }
        });

        input.addEventListener(
            "compositionend",
            normalize
        );

        function sync() {
            try {
                picker.value =
                    readBirthDate(true) || "";
            } catch {
                picker.value = "";
            }
        }

        input.addEventListener("blur", sync);

        $("open-birth-calendar").addEventListener(
            "click",
            () => {
                if (busy()) return;

                picker.max = todayVietnam();
                sync();

                try {
                    if (
                        typeof picker.showPicker
                            === "function"
                    ) {
                        picker.showPicker();
                        return;
                    }
                } catch {
                    // Tiếp tục cho phép nhập bằng bàn phím.
                }

                showMessage(
                    "create-patient-message",
                    "Bạn có thể nhập ngày sinh theo dd/mm/yyyy.",
                    "info"
                );

                input.focus();
            }
        );

        picker.addEventListener("change", () => {
            if (!picker.value) return;

            const [year, month, day] =
                picker.value.split("-");

            input.value = `${day}/${month}/${year}`;

            input.focus();

            input.setSelectionRange(
                input.value.length,
                input.value.length
            );
        });

        $("create-patient-form").addEventListener(
            "reset",
            () => {
                picker.value = "";
            }
        );

        createElement.addEventListener(
            "show.bs.modal",
            () => {
                picker.max = todayVietnam();
                sync();
            }
        );
    }

    // =====================================================
    // ĐIỀU KHIỂN FORM
    // =====================================================

    function selectedSchedule() {
        return schedules.find(item =>
            Number(item.maLichLamViec)
                === Number($("schedule-select").value)
        );
    }

    function updateControls() {
        const running = busy();

        $("patient-search-input").disabled = running;
        $("patient-search-button").disabled = running;
        $("open-create-patient").disabled = running;

        $("patient-search-button")
            .querySelector("i").className =
            searching
                ? "fa-solid fa-spinner fa-spin"
                : "fa-solid fa-magnifying-glass";

        $("create-patient-fields").disabled = running;
        $("create-patient-close").disabled = running;

        $("create-patient-save").disabled =
            running || !creationAllowed();

        $("create-patient-save").textContent =
            savingPatient ? "Đang lưu…" : "Lưu hồ sơ";

        $("phone-lookup-button").disabled =
            running || phoneLoading;

        $("phone-create-another").disabled =
            running || phoneLoading;

        $("new-patient-information").hidden =
            !creationAllowed();

        $("registration-close").disabled = registering;

        const blocked =
            running
            || loadingSchedules
            || checkingPatient
            || registrationLocked;

        $("registration-fields").disabled = blocked;

        $("department-select").disabled =
            blocked
            || $("department-select").options.length <= 1;

        $("schedule-select").disabled =
            blocked || !schedules.length;

        $("appointment-time").disabled =
            blocked || !selectedSchedule();

        $("register-button").disabled =
            blocked
            || !selectedPatientId
            || !selectedSchedule();

        $("register-button").textContent =
            registering
                ? "Đang đăng ký…"
                : "Đăng ký và cấp số chờ";

        $("reload-schedules").disabled =
            running
            || loadingSchedules
            || checkingPatient
            || registrationLocked
            || !selectedPatientId;

        $("refresh-appointments-button").disabled =
            !!appointmentsJob
            || callingAppointmentId !== null;

        $("phone-lookup-list")
            .querySelectorAll("button")
            .forEach(button => {
                button.disabled = running || phoneLoading;
            });

        $("appointments-table-body")
            .querySelectorAll("button[data-action]")
            .forEach(button => {
                const item = appointments.find(row =>
                    positiveId(row.maLichKham)
                        === positiveId(
                            button.dataset.appointmentId
                        )
                );

                if (
                    button.dataset.action === "call-patient"
                ) {
                    button.disabled = !!callReason(item);
                } else {
                    button.disabled =
                        running
                        || !!appointmentsJob
                        || callingAppointmentId !== null
                        || !positiveId(
                            button.dataset.patientId
                        )
                        || !positiveId(
                            button.dataset.appointmentId
                        );
                }
            });
    }

    function resetSelect(id, label) {
        $(id).replaceChildren(new Option(label, ""));
    }

    function resetRegistration() {
        loadVersion++;

        schedules = [];
        loadedDate = null;
        loadingSchedules = false;
        checkingPatient = false;
        registrationLocked = false;

        $("registration-form").reset();

        resetSelect("department-select", "Chọn khoa");
        resetSelect("schedule-select", "Chọn khoa trước");

        $("schedule-summary").hidden = true;
        $("queue-ticket").hidden = true;

        $("appointment-time").removeAttribute("min");
        $("appointment-time").removeAttribute("max");
        $("appointment-time").setCustomValidity("");

        showMessage("registration-message", "");
    }

    function existingAppointment() {
        if (appointmentsDate !== todayVietnam()) {
            return null;
        }

        return appointments.find(item =>
            positiveId(item.maBenhNhan)
                === selectedPatientId
            && TrangThai.layMa(item.trangThai) !== "DaHuy"
        );
    }

    function showExistingAppointment(item) {
        registrationLocked = true;

        showMessage(
            "registration-message",
            "Bệnh nhân đã có lịch khám hôm nay. "
            + `Số thứ tự: ${item.stt || "chưa có"}; `
            + `giờ khám: ${item.gioHen || "chưa có"}; `
            + `phòng: ${item.phong || "chưa phân công"}. `
            + "Không tạo thêm lịch trùng.",
            "info"
        );

        updateControls();
    }

    function selectPatient(patient) {
        const id = positiveId(
            patient.maBenhNhan ?? patient.MaBenhNhan
        );

        if (!id) {
            throw new Error("Mã bệnh nhân không hợp lệ.");
        }

        resetRegistration();

        selectedPatientId = id;
        selectedPatientName =
            patient.hoTen || "Bệnh nhân";

        setText("selected-id", `Mã bệnh nhân: ${id}`);
        setText("selected-name", selectedPatientName);

        setText(
            "selected-birth-date",
            formatDate(patient.ngaySinh)
        );

        setText("selected-gender", patient.gioiTinh);
        setText("selected-phone", patient.soDienThoai);
        setText("selected-address", patient.diaChi);

        $("selected-patient").hidden = false;
        $("patient-empty").hidden = true;
        $("registration-area").hidden = false;
        $("registration-empty").hidden = true;

        void prepareRegistration();
    }

    async function prepareRegistration() {
        const version = ++loadVersion;

        checkingPatient = true;
        updateControls();

        const ok = await loadAppointments();

        if (version !== loadVersion) {
            return;
        }

        checkingPatient = false;

        if (!ok) {
            showMessage(
                "registration-message",
                "Chưa kiểm tra được lịch hiện có. "
                + "Bấm Tải lại lịch bác sĩ để thử lại."
            );

            updateControls();
            return;
        }

        const existing = existingAppointment();

        if (existing) {
            showExistingAppointment(existing);
            return;
        }

        await loadDepartments();
    }

    // =====================================================
    // TRA CỨU BỆNH NHÂN TRÊN THANH TÌM KIẾM
    // =====================================================

    async function searchPatient(event) {
        event.preventDefault();

        if (
            busy()
            || !$("patient-search-form").reportValidity()
        ) {
            return;
        }

        const keyword =
            readValue("patient-search-input");

        if (!keyword) return;

        // Nhập số điện thoại: mở danh sách gợi ý.
        if (phoneKey(keyword)) {
            resetLookup();

            $("new-phone").value = cleanPhone(keyword);

            openRegistrationAfterCreate = false;

            showMessage("create-patient-message", "");

            createModal.show();
            void lookupPhone();

            return;
        }

        searching = true;
        updateControls();
        showMessage("page-message", "");

        try {
            const found = await requestApi(
                "/api/tiepnhan/patient-search?keyword="
                + encodeURIComponent(keyword)
            );

            const id = positiveId(
                found.maBenhNhan ?? found.MaBenhNhan
            );

            if (!id) {
                throw new Error(
                    "Kết quả không có mã bệnh nhân hợp lệ."
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
    // LƯU HỒ SƠ MỚI
    // =====================================================

    async function savePatient(event) {
        event.preventDefault();

        if (busy()) return;

        if (!creationAllowed()) {
            showMessage(
                "create-patient-message",
                "Hãy tra cứu số điện thoại và chọn hồ sơ "
                + "có sẵn hoặc tạo hồ sơ mới.",
                "warning"
            );
            return;
        }

        if (!$("create-patient-form").reportValidity()) {
            return;
        }

        let ngaySinh;

        try {
            ngaySinh = readBirthDate();
        } catch (error) {
            showMessage(
                "create-patient-message",
                error.message
            );

            $("new-birth-date").focus();
            return;
        }

        const payload = {
            hoTen: readValue("new-name"),
            ngaySinh,
            gioiTinh: readValue("new-gender"),
            soDienThoai: cleanPhone($("new-phone").value),
            email: readValue("new-email"),
            diaChi: readValue("new-address"),
            soDienThoaiKhanCap:
                readValue("new-emergency-phone"),
            tienSuBenh: readValue("new-medical-history")
        };

        if (!payload.hoTen) {
            showMessage(
                "create-patient-message",
                "Vui lòng nhập họ tên."
            );
            return;
        }

        savingPatient = true;
        updateControls();
        showMessage("create-patient-message", "");

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
                    "Phản hồi thiếu mã bệnh nhân. "
                    + "Hãy tra cứu lại trước khi tạo tiếp."
                );
            }

            selectPatient({
                ...payload,
                maBenhNhan: id
            });

            $("patient-search-input").value = String(id);

            savingPatient = false;
            openRegistrationAfterCreate = true;

            updateControls();
            createModal.hide();

            $("create-patient-form").reset();
            resetLookup();

            showMessage(
                "page-message",
                `Đã lưu hồ sơ ${payload.hoTen}. `
                + "Chọn bác sĩ và giờ khám để cấp số thứ tự.",
                "success"
            );
        } catch (error) {
            if (uncertain(error)) {
                patientSaveLocked = true;
                checkedPhone = "";
            }

            showMessage(
                "create-patient-message",
                error.message
                + (
                    patientSaveLocked
                        ? " Hãy bấm tra cứu số điện thoại "
                            + "để kiểm tra hồ sơ đã lưu chưa "
                            + "trước khi tạo lại."
                        : ""
                )
            );
        } finally {
            savingPatient = false;
            updateControls();
        }
    }

    // =====================================================
    // KHOA VÀ LỊCH BÁC SĨ
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

            if (version !== loadVersion) return;

            if (
                !Array.isArray(data)
                || date !== todayVietnam()
            ) {
                throw new Error(
                    "Không tải được khoa phù hợp hôm nay."
                );
            }

            loadedDate = date;

            resetSelect("department-select", "Chọn khoa");

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
                    "Hôm nay không còn ca làm việc "
                    + "phù hợp để đăng ký.",
                    "info"
                );
            }
        } catch (error) {
            if (version !== loadVersion) return;

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

    async function loadDoctorSchedules() {
        if (registering || registrationLocked) return;

        const version = ++loadVersion;

        const maKhoa = positiveId(
            $("department-select").value
        );

        schedules = [];

        $("schedule-summary").hidden = true;
        $("appointment-time").value = "";
        $("appointment-time").setCustomValidity("");

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
                    "Ngày đã thay đổi. Hãy tải lại lịch bác sĩ."
                );
            }

            const data = await requestApi(
                `${API}/lich-bac-si?maKhoa=${maKhoa}`
            );

            if (version !== loadVersion) return;

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
                        + `${item.gioBatDau}–${item.gioKetThuc} — `
                        + `${item.tenPhong}`,
                        String(item.maLichLamViec)
                    )
                );
            });

            if (!data.length) {
                showMessage(
                    "registration-message",
                    "Khoa này không còn ca làm việc "
                    + "phù hợp hôm nay.",
                    "info"
                );
            }
        } catch (error) {
            if (version !== loadVersion) return;

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

    function toMinutes(value) {
        const match = /^(\d{2}):(\d{2})/
            .exec(String(value || ""));

        return match
            && Number(match[1]) < 24
            && Number(match[2]) < 60
            ? Number(match[1]) * 60 + Number(match[2])
            : NaN;
    }

    function minuteText(number) {
        return (
            String(Math.floor(number / 60))
                .padStart(2, "0")
            + ":"
            + String(number % 60).padStart(2, "0")
        );
    }

    function scheduleBounds(schedule) {
        const now = vietnamNow();
        const start = toMinutes(schedule.gioBatDau);
        const end = toMinutes(schedule.gioKetThuc);

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

        return { minimum, maximum };
    }

    function onScheduleChange() {
        $("appointment-time").value = "";
        $("appointment-time").setCustomValidity("");

        showMessage("registration-message", "");

        const schedule = selectedSchedule();

        $("schedule-summary").hidden = !schedule;

        if (schedule) {
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

                setText(
                    "appointment-time-help",
                    `Có thể đăng ký từ ${minuteText(minimum)} `
                    + `đến ${minuteText(maximum)}.`
                );
            } catch (error) {
                showMessage(
                    "registration-message",
                    error.message
                );
            }
        } else {
            setText(
                "appointment-time-help",
                "Chọn bác sĩ để xem giờ có thể đăng ký."
            );
        }

        updateControls();
    }

    // =====================================================
    // ĐĂNG KÝ KHÁM VÀ HIỂN THỊ SỐ THỨ TỰ
    // =====================================================

    async function registerAppointment(event) {
        event.preventDefault();

        if (
            busy()
            || loadingSchedules
            || checkingPatient
            || registrationLocked
        ) {
            return;
        }

        const schedule = selectedSchedule();

        if (
            !selectedPatientId
            || !schedule
            || !$("registration-form").reportValidity()
        ) {
            return;
        }

        const time = readValue("appointment-time");

        try {
            const { minimum, maximum } =
                scheduleBounds(schedule);

            const chosen = toMinutes(time);

            if (
                !/^\d{2}:\d{2}$/.test(time || "")
                || !Number.isFinite(chosen)
                || chosen < minimum
                || chosen > maximum
            ) {
                throw new Error(
                    "Giờ khám nằm ngoài thời gian "
                    + "có thể đăng ký."
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
            maBacSi: Number(schedule.maBacSi),
            maLichLamViec: Number(
                schedule.maLichLamViec
            ),
            gioKham: time,
            lyDoKham: readValue("appointment-reason")
        };

        const departmentName =
            $("department-select")
                .selectedOptions[0].textContent;

        registering = true;
        updateControls();

        let submitted = false;

        try {
            if (!await loadAppointments()) {
                throw new Error(
                    "Chưa kiểm tra được lịch hiện có. "
                    + "Vui lòng thử lại."
                );
            }

            const existing = existingAppointment();

            if (existing) {
                showExistingAppointment(existing);
                return;
            }

            scheduleBounds(schedule);

            submitted = true;

            const result = await requestApi(API, {
                method: "POST",
                body: JSON.stringify(payload)
            });

            registrationLocked = true;

            const stt = positiveId(result.soThuTu);
            const id = positiveId(result.maLichKham);

            if (!stt || !id) {
                throw new Error(
                    "Phản hồi thiếu số thứ tự "
                    + "hoặc mã lịch khám."
                );
            }

            setText("ticket-number", stt);

            setText(
                "ticket-patient",
                selectedPatientName
            );

            setText(
                "ticket-department",
                `Khoa: ${departmentName}`
            );

            setText(
                "ticket-doctor",
                `Bác sĩ: ${schedule.tenBacSi}`
            );

            setText(
                "ticket-room",
                `Phòng: ${schedule.tenPhong}`
            );

            setText(
                "ticket-time",
                `${formatDate(result.ngayKham)} — `
                + String(result.gioKham || time)
                    .slice(0, 5)
            );

            $("queue-ticket").hidden = false;

            showMessage(
                "registration-message",
                "Đăng ký thành công. "
                + `Số thứ tự của bệnh nhân là ${stt}.`,
                "success"
            );

            $("queue-ticket").scrollIntoView({
                behavior: "smooth",
                block: "nearest"
            });

            void loadAppointments();
        } catch (error) {
            if (
                submitted
                && (
                    registrationLocked
                    || uncertain(error)
                )
            ) {
                registrationLocked = true;

                showMessage(
                    "registration-message",
                    error.message
                    + " Hãy kiểm tra danh sách "
                    + "trước khi đăng ký lại."
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
        }
    }

    // =====================================================
    // MỞ HỒ SƠ BỆNH NHÂN
    // =====================================================

    function openProfile(patientId, appointmentId) {
        if (
            busy()
            || appointmentsJob
            || callingAppointmentId !== null
        ) {
            return;
        }

        const id = positiveId(patientId);
        const visit = positiveId(appointmentId);

        if (!id || !visit) {
            showMessage(
                "page-message",
                "Mã bệnh nhân hoặc lịch khám không hợp lệ."
            );
            return;
        }

        const params = new URLSearchParams({
            maLichKham: String(visit),
            from: "checkin"
        });

        window.location.assign(
            `/TiepNhan/ho-so-benh-nhan/${id}?${params}`
        );
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
            !wrapper || !button || !panel || !close
        ) {
            return;
        }

        function setOpen(open) {
            panel.hidden = !open;

            button.setAttribute(
                "aria-expanded",
                String(open)
            );
        }

        button.addEventListener("click", () => {
            setOpen(panel.hidden);
        });

        close.addEventListener("click", () => {
            setOpen(false);
            button.focus();
        });

        document.addEventListener("click", event => {
            if (!wrapper.contains(event.target)) {
                setOpen(false);
            }
        });

        document.addEventListener("keydown", event => {
            if (
                event.key === "Escape"
                && !panel.hidden
            ) {
                setOpen(false);
                button.focus();
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

    $("new-phone").addEventListener(
        "input",
        onPhoneInput
    );

    $("new-phone").addEventListener("blur", () => {
        $("new-phone").value =
            cleanPhone($("new-phone").value);
    });

    $("new-phone").addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            void lookupPhone();
        }
    });

    $("phone-lookup-button").addEventListener(
        "click",
        () => void lookupPhone()
    );

    $("phone-lookup-list").addEventListener(
        "click",
        event => {
            const button = event.target.closest(
                "button[data-phone-patient-id]"
            );

            if (button && !button.disabled) {
                void choosePhonePatient(
                    button.dataset.phonePatientId
                );
            }
        }
    );

    $("phone-create-another").addEventListener(
        "click",
        () => {
            if (
                busy()
                || phoneLoading
                || !checkedPhone
                || checkedPhone
                    !== phoneKey($("new-phone").value)
            ) {
                return;
            }

            allowSharedPhone = true;

            updateControls();
            $("new-name").focus();
        }
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
            if (!busy()) {
                void prepareRegistration();
            }
        }
    );

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
        () => void loadAppointments()
    );

    $("appointments-table-body").addEventListener(
        "click",
        event => {
            const button = event.target.closest(
                "button[data-action]"
            );

            if (!button || button.disabled) return;

            if (
                button.dataset.action === "call-patient"
            ) {
                void callPatient(
                    button.dataset.appointmentId
                );
            } else {
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
            if (busy()) return;

            openRegistrationAfterCreate = false;

            resetLookup();
            showMessage("create-patient-message", "");
            updateControls();

            createModal.show();

            if (phoneKey($("new-phone").value)) {
                void lookupPhone();
            }
        }
    );

    createElement.addEventListener(
        "shown.bs.modal",
        () => $("new-phone").focus()
    );

    createElement.addEventListener(
        "hide.bs.modal",
        event => {
            if (savingPatient || searching) {
                event.preventDefault();
            }
        }
    );

    createElement.addEventListener(
        "hidden.bs.modal",
        () => {
            resetLookup();
            updateControls();

            if (openRegistrationAfterCreate) {
                openRegistrationAfterCreate = false;
                registrationModal.show();
            }
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
            loadVersion++;
            checkingPatient = false;
            loadingSchedules = false;

            $("patient-search-input").focus();
        }
    );

    // =====================================================
    // KHỞI TẠO
    // =====================================================

    TrangThai.taoBoLoc(
        $("appointment-status-filter")
    );

    initBirthDateInput();
    initNotifications();
    updateTodayDisplay();
    updateControls();

    void loadAppointments();
})();