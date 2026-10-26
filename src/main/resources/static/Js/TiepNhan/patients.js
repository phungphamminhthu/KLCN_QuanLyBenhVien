(() => {
    "use strict";

    const $ = id => document.getElementById(id);
    const LIST_API = "/api/tiepnhan/benh-nhan";

    let listLoading = false;
    let listVersion = 0;

    let page = 1;
    let size = 20;
    let total = 0;
    let totalPages = 0;
    let keyword = "";

    let filterDate = todayVietnam();
    let filterDepartment = "";
    let filterDoctor = "";

    let departmentsReady = false;
    let departmentsLoading = false;
    let doctorsReady = false;

    // =====================================================
    // HÀM DÙNG CHUNG
    // =====================================================

    function message(id, content = "", type = "danger") {
        const element = $(id);
        if (!element) return;

        element.textContent = content;
        element.className = `alert alert-${type} py-2`;
        element.hidden = !content;
    }

    function text(id, content, fallback = "Chưa cung cấp") {
        const element = $(id);
        if (!element) return;

        element.textContent = content == null || content === ""
            ? fallback
            : String(content);
    }

    function idOf(raw) {
        const number = Number(raw);

        return Number.isSafeInteger(number)
            && number > 0
            && number <= 2147483647
            ? number
            : null;
    }

    function todayVietnam() {
        const parts = new Intl.DateTimeFormat("en-GB", {
            timeZone: "Asia/Ho_Chi_Minh",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).formatToParts(new Date());

        const part = type =>
            parts.find(item => item.type === type).value;

        return `${part("year")}-${part("month")}-${part("day")}`;
    }

    function updateHeaderDate() {
        const element = $("header-date-display");
        if (!element) return;

        const date = new Intl.DateTimeFormat("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }).format(new Date());

        element.textContent =
            date.charAt(0).toUpperCase() + date.slice(1);
    }

    function dateText(raw) {
        const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(
            String(raw || "")
        );

        return match
            ? `${match[3]}/${match[2]}/${match[1]}`
            : "Chưa cung cấp";
    }

    function validateFilterDate(raw) {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(
            String(raw || "")
        );

        if (!match) {
            throw new Error("Vui lòng chọn ngày khám hợp lệ.");
        }

        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);

        const check = new Date(Date.UTC(year, month - 1, day));

        if (
            year < 1000 || year > 9999
            || check.getUTCFullYear() !== year
            || check.getUTCMonth() !== month - 1
            || check.getUTCDate() !== day
        ) {
            throw new Error("Ngày khám không hợp lệ.");
        }
    }

    async function callApi(url, options = {}) {
        const token = sessionStorage.getItem("Token")
            || localStorage.getItem("Token")
            || sessionStorage.getItem("token")
            || localStorage.getItem("token");

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
            headers,
            cache: "no-store"
        });

        let data;

        try {
            data = await response.json();
        } catch {
            const error = new Error(
                response.status === 401
                    ? "Phiên đăng nhập đã hết hạn."
                    : response.status === 403
                        ? "Bạn không có quyền thực hiện chức năng này."
                        : "Phản hồi máy chủ không hợp lệ. Hãy tải lại dữ liệu để kiểm tra."
            );

            error.status = response.status;
            throw error;
        }

        if (!response.ok || !data || typeof data !== "object") {
            const error = new Error(
                data?.message || data?.detail
                || (
                    response.status === 401
                        ? "Phiên đăng nhập đã hết hạn."
                        : response.status === 403
                            ? "Bạn không có quyền thực hiện chức năng này."
                            : "Không thể xử lý yêu cầu."
                )
            );

            error.status = response.status;
            throw error;
        }

        return data;
    }

    // =====================================================
    // DANH SÁCH VÀ PHÂN TRANG
    // =====================================================

    function updateListControls() {
        const busy = listLoading || departmentsLoading;

        [
            "patient-search-input",
            "patient-search-button",
            "refresh-patients-button",
            "clear-patient-search",
            "patients-page-size",
            "patients-filter-date",
            "patients-open-calendar"
        ].forEach(id => {
            const element = $(id);
            if (element) element.disabled = busy;
        });

        $("patients-previous-date").disabled =
            busy || filterDate <= "1000-01-01";

        $("patients-next-date").disabled =
            busy || filterDate >= "9999-12-31";

        $("patients-filter-department").disabled =
            busy || !departmentsReady;

        $("patients-filter-doctor").disabled =
            busy || !doctorsReady;

        $("patients-previous-page").disabled =
            busy || page <= 1;

        $("patients-next-page").disabled =
            busy || page >= totalPages;

        $("patients-table-area").setAttribute(
            "aria-busy",
            String(listLoading)
        );

        $("patients-table-body")
            .querySelectorAll("button[data-patient-id]")
            .forEach(button => {
                button.disabled = busy;
            });
    }

    function appendCell(row, content, className = "") {
        const cell = document.createElement("td");

        cell.textContent = content == null || content === ""
            ? "Chưa cung cấp"
            : String(content);

        cell.className = className;
        row.appendChild(cell);

        return cell;
    }

    function renderList(items) {
        const body = $("patients-table-body");
        body.replaceChildren();

        items.forEach((item, index) => {
            const row = document.createElement("tr");

            appendCell(row, (page - 1) * size + index + 1);

            appendCell(
                row,
                item.maBenhNhan,
                "fw-semibold text-primary"
            );

            appendCell(row, item.hoTen);
            appendCell(row, dateText(item.ngaySinh));
            appendCell(row, item.gioiTinh);
            appendCell(row, item.soDienThoai);
            appendCell(row, item.diaChi);

            const actionCell = document.createElement("td");
            const button = document.createElement("button");

            button.type = "button";
            button.className = "btn btn-outline-primary btn-sm";
            button.textContent = "Chi tiết";

            button.dataset.patientId = String(item.maBenhNhan);

            if (idOf(item.maLichKham)) {
                button.dataset.visitId = String(item.maLichKham);
            }

            button.setAttribute(
                "aria-label",
                `Xem hồ sơ ${item.hoTen || "bệnh nhân"}`
            );

            actionCell.appendChild(button);
            row.appendChild(actionCell);
            body.appendChild(row);
        });

        $("patients-empty").hidden = items.length > 0;

        text(
            "patients-empty-message",
            keyword || filterDepartment || filterDoctor
                ? "Không tìm thấy bệnh nhân phù hợp với điều kiện đã chọn."
                : "Không có bệnh nhân có lịch khám trong ngày đã chọn."
        );

        text(
            "patients-record-count",
            total
                ? `Hiển thị ${(page - 1) * size + 1}–${(page - 1) * size + items.length} / ${total} bệnh nhân`
                : "Hiển thị 0 bệnh nhân"
        );

        text(
            "patients-page-label",
            totalPages
                ? `Trang ${page} / ${totalPages}`
                : "Trang 0 / 0"
        );

        $("clear-patient-search").hidden = !keyword;
    }

    function updateDateLabel() {
        text("patients-date-label", dateText(filterDate));

        const input = $("patients-filter-date");
        input.value = filterDate;
        input.style.cssText = "";
        input.tabIndex = -1;
    }

    function restoreListFilters() {
        updateDateLabel();

        $("patients-filter-department").value = filterDepartment;
        $("patients-filter-doctor").value = filterDoctor;
        $("patients-page-size").value = String(size);
    }

    async function loadList(
        targetPage = page,
        targetKeyword = keyword,
        targetSize = size,
        targetDate = filterDate,
        targetDepartment = filterDepartment,
        targetDoctor = filterDoctor
    ) {
        const version = ++listVersion;
        listLoading = true;

        updateListControls();
        message("patient-message", "");

        if (!$("patients-table-body").children.length) {
            $("patients-empty").hidden = false;

            text(
                "patients-empty-message",
                "Đang tải danh sách bệnh nhân..."
            );
        }

        try {
            validateFilterDate(targetDate);

            if (!Number.isSafeInteger(targetPage) || targetPage < 1) {
                throw new Error("Số trang không hợp lệ.");
            }

            if (
                !Number.isSafeInteger(targetSize)
                || targetSize < 1 || targetSize > 100
            ) {
                throw new Error("Số bệnh nhân mỗi trang không hợp lệ.");
            }

            if ([...targetKeyword].length > 100) {
                throw new Error(
                    "Từ khóa không được vượt quá 100 ký tự."
                );
            }

            if (targetDepartment && !idOf(targetDepartment)) {
                throw new Error("Vui lòng chọn khoa hợp lệ.");
            }

            if (targetDoctor && !idOf(targetDoctor)) {
                throw new Error("Vui lòng chọn bác sĩ hợp lệ.");
            }

            const doctorParams = new URLSearchParams({
                ngayKham: targetDate
            });

            if (targetDepartment) {
                doctorParams.set("maKhoa", targetDepartment);
            }

            const doctorData = await callApi(
                `${LIST_API}/bac-si?${doctorParams}`
            );

            if (version !== listVersion) return;

            if (
                doctorData.success !== true
                || !Array.isArray(doctorData.items)
                || doctorData.items.some(
                    item => !item || !idOf(item.maBacSi)
                )
            ) {
                throw new Error(
                    "Dữ liệu bộ lọc bác sĩ không hợp lệ."
                );
            }

            const doctors = doctorData.items;

            if (
                targetDoctor
                && !doctors.some(
                    item => String(item.maBacSi) === String(targetDoctor)
                )
            ) {
                targetDoctor = "";
            }

            const params = new URLSearchParams({
                keyword: targetKeyword,
                page: String(targetPage),
                size: String(targetSize),
                ngayKham: targetDate
            });

            if (targetDepartment) {
                params.set("maKhoa", targetDepartment);
            }

            if (targetDoctor) {
                params.set("maBacSi", targetDoctor);
            }

            const data = await callApi(`${LIST_API}?${params}`);

            if (version !== listVersion) return;

            if (
                data.success !== true
                || !Array.isArray(data.items)
                || !Number.isSafeInteger(data.total)
                || data.total < 0
                || !Number.isSafeInteger(data.totalPages)
                || data.totalPages < 0
                || data.page !== targetPage
                || data.size !== targetSize
                || data.items.some(
                    item => !item || !idOf(item.maBenhNhan)
                )
            ) {
                throw new Error(
                    "Dữ liệu danh sách bệnh nhân không hợp lệ."
                );
            }

            if (data.totalPages > 0 && targetPage > data.totalPages) {
                await loadList(
                    data.totalPages,
                    targetKeyword,
                    targetSize,
                    targetDate,
                    targetDepartment,
                    targetDoctor
                );

                return;
            }

            page = data.total === 0 ? 1 : data.page;
            size = data.size;
            keyword = targetKeyword;

            filterDate = targetDate;
            filterDepartment = targetDepartment;
            filterDoctor = targetDoctor;

            total = data.total;
            totalPages = data.totalPages;

            const doctorSelect = $("patients-filter-doctor");

            doctorSelect.replaceChildren(
                new Option("Tất cả bác sĩ", "")
            );

            doctors.forEach(item => {
                doctorSelect.add(new Option(
                    item.tenBacSi || `Bác sĩ ${item.maBacSi}`,
                    String(item.maBacSi)
                ));
            });

            doctorsReady = true;
            $("patient-search-input").value = keyword;

            restoreListFilters();
            renderList(data.items);
        } catch (error) {
            if (version !== listVersion) return;

            restoreListFilters();
            message("patient-message", error.message);

            if (!$("patients-table-body").children.length) {
                $("patients-empty").hidden = false;

                text(
                    "patients-empty-message",
                    "Chưa tải được danh sách bệnh nhân."
                );

                text(
                    "patients-record-count",
                    "Dữ liệu chưa được cập nhật."
                );
            }
        } finally {
            if (version === listVersion) {
                listLoading = false;
                updateListControls();
            }
        }
    }

    async function loadDepartments() {
        if (departmentsLoading) return;

        departmentsLoading = true;
        updateListControls();

        try {
            const data = await callApi(`${LIST_API}/khoa`);

            if (
                data.success !== true
                || !Array.isArray(data.items)
                || data.items.some(
                    item => !item || !idOf(item.maKhoa)
                )
            ) {
                throw new Error(
                    "Dữ liệu danh sách khoa không hợp lệ."
                );
            }

            const select = $("patients-filter-department");

            select.replaceChildren(
                new Option("Tất cả khoa", "")
            );

            data.items.forEach(item => {
                select.add(new Option(
                    item.tenKhoa || `Khoa ${item.maKhoa}`,
                    String(item.maKhoa)
                ));
            });

            select.value = filterDepartment;
            departmentsReady = true;
        } finally {
            departmentsLoading = false;
            updateListControls();
        }
    }

    async function refreshList() {
        if (listLoading || departmentsLoading) return;

        updateHeaderDate();

        let departmentError = "";

        if (!departmentsReady) {
            try {
                await loadDepartments();
            } catch (error) {
                departmentError = error.message;
            }
        }

        await loadList();

        if (departmentError) {
            message(
                "patient-message",
                [
                    $("patient-message").textContent,
                    "Chưa tải được bộ lọc khoa: " + departmentError
                        + " Nhấn Làm mới để thử lại."
                ].filter(Boolean).join(" "),
                "warning"
            );
        }
    }

    // =====================================================
    // CHỌN NGÀY VÀ ÁP DỤNG BỘ LỌC
    // =====================================================

    function moveDate(offset) {
        if (listLoading || departmentsLoading) return;

        try {
            const [year, month, day] =
                filterDate.split("-").map(Number);

            const date = new Date(Date.UTC(year, month - 1, day));
            date.setUTCDate(date.getUTCDate() + offset);

            const nextDate = [
                String(date.getUTCFullYear()).padStart(4, "0"),
                String(date.getUTCMonth() + 1).padStart(2, "0"),
                String(date.getUTCDate()).padStart(2, "0")
            ].join("-");

            validateFilterDate(nextDate);

            void loadList(
                1,
                keyword,
                size,
                nextDate,
                filterDepartment,
                filterDoctor
            );
        } catch (error) {
            message("patient-message", error.message);
        }
    }

    function openDateCalendar() {
        if (listLoading || departmentsLoading) return;

        const input = $("patients-filter-date");
        input.value = filterDate;

        try {
            if (typeof input.showPicker === "function") {
                input.showPicker();
                return;
            }
        } catch {
            // Dùng ô ngày trực tiếp nếu không mở được lịch.
        }

        input.style.cssText =
            "position: static !important;"
            + "width: 145px !important;"
            + "height: 34px !important;"
            + "opacity: 1 !important;"
            + "pointer-events: auto !important;";

        input.tabIndex = 0;
        input.focus();
        input.click();
    }

    function applyFilters() {
        if (listLoading || departmentsLoading) return;

        try {
            const input = $("patients-filter-date");

            if (!input.validity.valid) {
                throw new Error("Ngày khám không hợp lệ.");
            }

            validateFilterDate(input.value);

            void loadList(
                1,
                keyword,
                size,
                input.value,
                $("patients-filter-department").value,
                $("patients-filter-doctor").value
            );
        } catch (error) {
            restoreListFilters();
            message("patient-message", error.message);
        }
    }

    // =====================================================
    // MỞ TRANG HỒ SƠ BỆNH NHÂN
    // =====================================================

    function openProfile(patientId, visitId = null) {
        const patient = idOf(patientId);

        const appointment = visitId == null
            ? null
            : idOf(visitId);

        if (!patient || (visitId != null && !appointment)) {
            message(
                "patient-message",
                "Mã bệnh nhân hoặc mã lịch khám không hợp lệ."
            );

            return;
        }

        const params = new URLSearchParams({
            from: "patients"
        });

        if (appointment) {
            params.set("maLichKham", String(appointment));
        }

        window.location.assign(
            `/TiepNhan/ho-so-benh-nhan/${patient}?${params}`
        );
    }

    // =====================================================
    // THÔNG BÁO TRÊN HEADER
    // =====================================================

    function initNotifications() {
        const wrapper = $("notification-wrapper");
        const button = $("notification-button");
        const panel = $("notification-panel");
        const close = $("notification-close");

        if (!wrapper || !button || !panel || !close) return;

        function setOpen(isOpen, focus = false) {
            panel.hidden = !isOpen;

            button.setAttribute(
                "aria-expanded",
                String(isOpen)
            );

            button.setAttribute(
                "aria-label",
                isOpen ? "Đóng thông báo" : "Mở thông báo"
            );

            if (focus) button.focus();
        }

        button.addEventListener("click", () => {
            setOpen(panel.hidden);
        });

        close.addEventListener("click", () => {
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

    $("patient-search-form").addEventListener("submit", event => {
        event.preventDefault();

        if (!listLoading && !departmentsLoading) {
            void loadList(
                1,
                $("patient-search-input").value.trim()
            );
        }
    });

    $("clear-patient-search").addEventListener("click", () => {
        if (listLoading || departmentsLoading) return;

        $("patient-search-input").value = "";
        void loadList(1, "");
    });

    $("refresh-patients-button").addEventListener("click", () => {
        void refreshList();
    });

    $("patients-page-size").addEventListener("change", () => {
        if (listLoading || departmentsLoading) return;

        void loadList(
            1,
            keyword,
            Number($("patients-page-size").value)
        );
    });

    $("patients-previous-page").addEventListener("click", () => {
        if (!listLoading && !departmentsLoading && page > 1) {
            void loadList(page - 1);
        }
    });

    $("patients-next-page").addEventListener("click", () => {
        if (
            !listLoading
            && !departmentsLoading
            && page < totalPages
        ) {
            void loadList(page + 1);
        }
    });

    $("patients-filter-date").addEventListener(
        "change",
        applyFilters
    );

    $("patients-filter-department").addEventListener(
        "change",
        applyFilters
    );

    $("patients-filter-doctor").addEventListener(
        "change",
        applyFilters
    );

    $("patients-previous-date").addEventListener("click", () => {
        moveDate(-1);
    });

    $("patients-next-date").addEventListener("click", () => {
        moveDate(1);
    });

    $("patients-open-calendar").addEventListener(
        "click",
        openDateCalendar
    );

    $("patients-table-body").addEventListener("click", event => {
        const button = event.target.closest(
            "button[data-patient-id]"
        );

        if (
            !button
            || button.disabled
            || listLoading
            || departmentsLoading
        ) {
            return;
        }

        openProfile(
            button.dataset.patientId,
            button.dataset.visitId ?? null
        );
    });

    window.addEventListener("focus", updateHeaderDate);

    // =====================================================
    // KHỞI TẠO
    // =====================================================

    // Bỏ popup hồ sơ cũ khỏi trang Bệnh nhân.
    $("patient-record-modal")?.remove();

    $("patients-total-count")?.remove();
    $("reset-patient-filters")?.remove();

    updateHeaderDate();
    initNotifications();
    updateDateLabel();

    const params = new URLSearchParams(window.location.search);

    if (params.has("maBenhNhan") || params.has("maLichKham")) {
        const patientId = idOf(params.get("maBenhNhan"));

        const visitId = params.has("maLichKham")
            ? idOf(params.get("maLichKham"))
            : null;

        if (
            !patientId
            || (params.has("maLichKham") && !visitId)
        ) {
            message(
                "patient-message",
                "Mã bệnh nhân hoặc mã lịch khám trong đường dẫn không hợp lệ."
            );
        } else {
            openProfile(patientId, visitId);
            return;
        }
    }

    void refreshList();
})();