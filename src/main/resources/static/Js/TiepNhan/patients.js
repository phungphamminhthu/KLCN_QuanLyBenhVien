(() => {
    "use strict";

    const $ = id => document.getElementById(id);

    const LIST_API = "/api/tiepnhan/benh-nhan";
    const PROFILE_API = "/api/tiepnhan/ho-so-benh-nhan";
    const VITALS_API = "/api/tiepnhan/chi-so-truoc-kham";

    const modalElement = $("patient-record-modal");
    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);

    const personalFields = {
        hoTen: "record-name",
        gioiTinh: "record-gender",
        soDienThoai: "record-phone",
        email: "record-email",
        diaChi: "record-address",
        soDienThoaiKhanCap: "record-emergency-phone",
        tienSuBenh: "record-medical-history"
    };

    const vitalFields = {
        canNang: "record-weight",
        chieuCao: "record-height",
        huyetApTamThu: "record-systolic",
        huyetApTamTruong: "record-diastolic"
    };

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

    let profile = null;
    let visit = null;
    let trigger = null;

    let profileLoading = false;
    let profileSaving = false;
    let profileVersion = 0;

    // =====================================================
    // HÀM DÙNG CHUNG
    // =====================================================

    function message(id, content = "", type = "danger") {
        const element = $(id);
        element.textContent = content;
        element.className = `alert alert-${type} py-2`;
        element.hidden = !content;
    }

    function text(id, content, fallback = "Chưa cung cấp") {
        $(id).textContent = content == null || content === ""
            ? fallback
            : String(content);
    }

    function value(id) {
        return $(id).value.trim() || null;
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

        element.textContent = new Intl.DateTimeFormat("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }).format(new Date());
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

    function readBirthDate() {
        const raw = value("record-birth-date");
        if (!raw) return null;

        const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);

        if (!match) {
            throw new Error("Nhập ngày sinh theo dạng dd/mm/yyyy.");
        }

        const isoDate = `${match[3]}-${match[2]}-${match[1]}`;

        try {
            validateFilterDate(isoDate);
        } catch {
            throw new Error("Ngày sinh không hợp lệ.");
        }

        if (isoDate > todayVietnam()) {
            throw new Error(
                "Ngày sinh không được lớn hơn ngày hiện tại."
            );
        }

        return isoDate;
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
            headers
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
        const busy =
            listLoading || profileSaving || departmentsLoading;

        [
            "patient-search-input",
            "patient-search-button",
            "refresh-patients-button",
            "clear-patient-search",
            "patients-page-size",
            "patients-filter-date",
            "patients-open-calendar"
        ].forEach(id => {
            $(id).disabled = busy;
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
                button.disabled =
                    profileLoading || profileSaving || listLoading;
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

            // Tải bác sĩ theo ngày và khoa.
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

            // Bỏ lựa chọn bác sĩ nếu không còn phù hợp.
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
            select.replaceChildren(new Option("Tất cả khoa", ""));

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
        if (listLoading || departmentsLoading || profileSaving) return;

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
        if (listLoading || departmentsLoading || profileSaving) return;

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
        if (listLoading || departmentsLoading || profileSaving) return;

        const input = $("patients-filter-date");
        input.value = filterDate;

        try {
            if (typeof input.showPicker === "function") {
                input.showPicker();
                return;
            }
        } catch {
            // Hiện ô chọn ngày nếu trình duyệt không mở được lịch.
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
        if (listLoading || departmentsLoading || profileSaving) return;

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
    // XEM HỒ SƠ VÀ LỊCH SỬ KHÁM
    // =====================================================

    function canEditVitals() {
        return !!visit
            && String(visit.ngayKham).slice(0, 10) === todayVietnam()
            && ["Đã gọi", "DaGoi"].includes(visit.trangThai);
    }

    function updateProfileControls() {
        const editable =
            !!profile && !profileLoading && !profileSaving;

        $("patient-record-fields").disabled = !editable;
        $("patient-record-loading").hidden = !profileLoading;
        $("patient-record-save").disabled = !editable;
        $("patient-record-close").disabled = profileSaving;

        $("patient-record-save").textContent =
            profileSaving ? "Đang lưu…" : "Lưu hồ sơ";

        $("record-visit-select").disabled =
            !editable || !profile?.danhSachLanKham.length;

        $("record-vitals-fields").disabled =
            !editable || !canEditVitals();

        $("patient-record-form").setAttribute(
            "aria-busy",
            String(profileLoading || profileSaving)
        );

        updateListControls();
    }

    function clearProfile() {
        profile = null;
        visit = null;

        $("patient-record-form").reset();
        $("record-visit-select").replaceChildren(
            new Option("Chưa tải lịch sử khám", "")
        );

        $("record-visit-content").hidden = true;
        $("record-no-visit").hidden = true;
        $("record-vitals-note").textContent = "";
        $("record-vitals-note").hidden = true;

        modalElement.querySelectorAll("details").forEach(element => {
            element.open = false;
        });

        text("record-patient-code", "—");
        message("patient-record-message", "");
    }

    function renderVisit(item) {
        visit = item;

        $("record-visit-select").value =
            item ? String(item.maLichKham) : "";

        $("record-visit-content").hidden = !item;
        $("record-no-visit").hidden = !!item;

        Object.entries(vitalFields).forEach(([key, field]) => {
            $(field).value = item?.[key] ?? "";
        });

        if (item) {
            text("record-visit-code", `Mã lịch: ${item.maLichKham}`);
            text(
                "record-visit-time",
                `${dateText(item.ngayKham)} · ${String(item.gioKham || "--:--").slice(0, 5)}`
            );

            text(
                "record-visit-sequence",
                idOf(item.soThuTu)
                    ? `#${String(item.soThuTu).padStart(3, "0")}`
                    : "Chưa có số"
            );

            text("record-visit-department", item.khoa);
            text("record-visit-doctor", item.bacSi);
            text("record-visit-room", item.phong, "Chưa phân công");
            text("record-visit-reason", item.lyDoKham);
            text(
                "record-visit-status",
                item.trangThai,
                "Chưa xác định"
            );

            $("record-visit-status").className = "badge " + (
                ["Đang khám", "DangKham"].includes(item.trangThai)
                    ? "bg-primary"
                    : ["Hoàn tất", "HoanTat", "Đã khám", "DaKham"]
                        .includes(item.trangThai)
                        ? "bg-success"
                        : ["Đã hủy", "DaHuy", "Không đến", "KhongDen"]
                            .includes(item.trangThai)
                            ? "bg-danger"
                            : ["Đã gọi", "DaGoi"].includes(item.trangThai)
                                ? "bg-info text-dark"
                                : "bg-secondary"
            );
        }

        $("record-vitals-note").textContent = "";
        $("record-vitals-note").hidden = true;
        updateProfileControls();
    }

    function defaultVisit(items) {
        const matchingDate = items.find(
            item => String(item.ngayKham).slice(0, 10) === filterDate
        );

        if (matchingDate) return matchingDate;

        const today = todayVietnam();

        return items.find(
            item => String(item.ngayKham).slice(0, 10) === today
        ) || items.find(
            item => String(item.ngayKham).slice(0, 10) < today
        ) || items[items.length - 1] || null;
    }

    async function openProfile(
        patientId,
        button = null,
        appointmentId = null
    ) {
        if (profileLoading || profileSaving) return;

        const id = idOf(patientId);

        if (!id) {
            message("patient-message", "Mã bệnh nhân không hợp lệ.");
            return;
        }

        const version = ++profileVersion;
        trigger = button;

        clearProfile();
        profileLoading = true;
        updateProfileControls();
        modal.show();

        try {
            const data = await callApi(`${PROFILE_API}/${id}`);

            if (version !== profileVersion) return;

            if (
                idOf(data.maBenhNhan) !== id
                || !Array.isArray(data.danhSachLanKham)
                || data.danhSachLanKham.some(
                    item => !item || !idOf(item.maLichKham)
                )
            ) {
                throw new Error(
                    "Dữ liệu hồ sơ bệnh nhân không hợp lệ."
                );
            }

            profile = data;
            text("record-patient-code", `Mã BN: ${id}`);

            Object.entries(personalFields).forEach(([key, field]) => {
                $(field).value = data[key] ?? "";
            });

            $("record-birth-date").value =
                data.ngaySinh ? dateText(data.ngaySinh) : "";

            const select = $("record-visit-select");

            select.replaceChildren(new Option(
                data.danhSachLanKham.length
                    ? "Chọn lịch sử khám"
                    : "Chưa có lịch sử khám",
                ""
            ));

            data.danhSachLanKham.forEach(item => {
                const label =
                    `${dateText(item.ngayKham)} · `
                    + `${String(item.gioKham || "--:--").slice(0, 5)} · `
                    + `${item.khoa || "Chưa có khoa"} · `
                    + `Mã ${item.maLichKham}`;

                select.add(new Option(
                    label,
                    String(item.maLichKham)
                ));
            });

            const selected = appointmentId
                ? data.danhSachLanKham.find(
                    item => idOf(item.maLichKham) === appointmentId
                )
                : defaultVisit(data.danhSachLanKham);

            renderVisit(selected || null);

            if (appointmentId && !selected) {
                message(
                    "patient-record-message",
                    "Lịch khám trong đường dẫn không thuộc hồ sơ này. Hãy chọn trong danh sách lịch sử khám.",
                    "warning"
                );
            }
        } catch (error) {
            if (version === profileVersion) {
                message("patient-record-message", error.message);
            }
        } finally {
            if (version === profileVersion) {
                profileLoading = false;
                updateProfileControls();
            }
        }
    }

    // =====================================================
    // KIỂM TRA THÔNG TIN CÁ NHÂN VÀ SỐ ĐO
    // =====================================================

    function personalPayload() {
        const data = { ngaySinh: readBirthDate() };

        Object.entries(personalFields).forEach(([key, field]) => {
            data[key] = value(field);
        });

        if (!data.hoTen) {
            throw new Error("Vui lòng nhập họ tên bệnh nhân.");
        }

        for (const [key, label] of [
            ["hoTen", "Họ tên"],
            ["email", "Email"],
            ["diaChi", "Địa chỉ"]
        ]) {
            if (data[key] && [...data[key]].length > 255) {
                throw new Error(
                    `${label} không được vượt quá 255 ký tự.`
                );
            }
        }

        if (
            data.gioiTinh
            && !["Nam", "Nữ", "Khác"].includes(data.gioiTinh)
        ) {
            throw new Error("Giới tính không hợp lệ.");
        }

        for (const [key, label] of [
            ["soDienThoai", "Số điện thoại"],
            ["soDienThoaiKhanCap", "Điện thoại khẩn cấp"]
        ]) {
            if (data[key] && !/^\+?[0-9]{9,14}$/.test(data[key])) {
                throw new Error(
                    `${label} phải gồm 9 đến 14 chữ số, có thể bắt đầu bằng +.`
                );
            }
        }

        if (
            data.email
            && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
        ) {
            throw new Error("Email không đúng định dạng.");
        }

        if (
            data.tienSuBenh
            && new TextEncoder().encode(data.tienSuBenh).length > 65535
        ) {
            throw new Error("Nội dung tiền sử bệnh quá dài.");
        }

        return data;
    }

    function readVitals() {
        const data = {
            maLichKham: idOf(visit?.maLichKham)
        };

        Object.entries(vitalFields).forEach(([key, field]) => {
            const input = $(field);
            const raw = value(field);

            if (
                input.validity.badInput
                || (raw && !Number.isFinite(Number(raw)))
            ) {
                throw new Error("Số đo phải là số hợp lệ.");
            }

            data[key] = raw === null ? null : Number(raw);
        });

        return data;
    }

    function vitalsChanged(data) {
        return !!visit && Object.keys(vitalFields).some(key => {
            const previous = visit[key] == null
                ? null
                : Number(visit[key]);

            return data[key] !== previous;
        });
    }

    function validateVitals(data) {
        for (const [key, label] of [
            ["canNang", "Cân nặng"],
            ["chieuCao", "Chiều cao"]
        ]) {
            const number = data[key];

            if (
                number !== null
                && (
                    !Number.isFinite(number)
                    || number <= 0 || number > 999.99
                    || Math.abs(
                        number * 100 - Math.round(number * 100)
                    ) > 0.000001
                )
            ) {
                throw new Error(
                    `${label} phải lớn hơn 0, tối đa 999,99 và có tối đa hai chữ số thập phân.`
                );
            }
        }

        for (const key of ["huyetApTamThu", "huyetApTamTruong"]) {
            const number = data[key];

            if (
                number !== null
                && (
                    !Number.isInteger(number)
                    || number < 1 || number > 65535
                )
            ) {
                throw new Error(
                    "Huyết áp phải là số nguyên từ 1 đến 65535."
                );
            }
        }

        if (
            (data.huyetApTamThu === null)
            !== (data.huyetApTamTruong === null)
        ) {
            throw new Error(
                "Nhập đủ huyết áp tâm thu và tâm trương."
            );
        }

        if (
            Object.keys(vitalFields).every(
                key => data[key] === null
            )
        ) {
            throw new Error(
                "Vui lòng nhập ít nhất một loại số đo."
            );
        }
    }

    // =====================================================
    // LƯU HỒ SƠ
    // =====================================================

    async function saveProfile(event) {
        event.preventDefault();

        if (!profile || profileLoading || profileSaving) return;

        message("patient-record-message", "");

        let personal;
        let personalChanged;
        let vitals = null;

        try {
            personal = personalPayload();

            personalChanged = Object.keys(personal).some(key => {
                const oldValue = profile[key];

                const previous = key === "ngaySinh"
                    ? (oldValue ? String(oldValue).slice(0, 10) : null)
                    : (
                        oldValue == null
                            ? null
                            : String(oldValue).trim() || null
                    );

                return personal[key] !== previous;
            });

            if (canEditVitals()) {
                const candidate = readVitals();

                if (vitalsChanged(candidate)) {
                    validateVitals(candidate);
                    vitals = candidate;
                }
            }

            if (!personalChanged && !vitals) {
                message(
                    "patient-record-message",
                    "Chưa có thông tin thay đổi cần lưu.",
                    "info"
                );
                return;
            }
        } catch (error) {
            message("patient-record-message", error.message);
            return;
        }

        profileSaving = true;
        updateProfileControls();

        let personalSaved = false;

        try {
            if (personalChanged) {
                const result = await callApi(
                    `${PROFILE_API}/${profile.maBenhNhan}`,
                    {
                        method: "PUT",
                        body: JSON.stringify(personal)
                    }
                );

                if (result.success !== true) {
                    throw new Error(
                        result.message
                        || "Máy chủ chưa xác nhận lưu thông tin bệnh nhân."
                    );
                }

                Object.assign(profile, personal);
                personalSaved = true;
            }

            if (vitals) {
                const result = await callApi(VITALS_API, {
                    method: "POST",
                    body: JSON.stringify(vitals)
                });

                if (result.success !== true) {
                    throw new Error(
                        result.message
                        || "Máy chủ chưa xác nhận lưu số đo."
                    );
                }

                Object.keys(vitalFields).forEach(key => {
                    visit[key] = vitals[key];
                });
            }

            message(
                "patient-record-message",
                personalSaved && vitals
                    ? "Đã lưu thông tin bệnh nhân và số đo."
                    : personalSaved
                        ? "Đã cập nhật thông tin bệnh nhân."
                        : "Đã lưu số đo trước khám.",
                "success"
            );
        } catch (error) {
            const partialMessage = personalSaved
                ? "Thông tin bệnh nhân đã lưu; số đo chưa được xác nhận lưu. "
                : "";

            const shouldCheckAgain =
                !error.status
                || error.status >= 500
                || (error.status >= 200 && error.status < 300);

            message(
                "patient-record-message",
                partialMessage + error.message
                    + (
                        shouldCheckAgain
                            ? " Đóng và mở lại hồ sơ để kiểm tra trước khi thử lại."
                            : ""
                    )
            );
        } finally {
            profileSaving = false;
            updateProfileControls();
            void loadList();
        }
    }

    // =====================================================
    // NGÀY SINH: NHẬP DD/MM/YYYY VÀ CHỌN LỊCH
    // =====================================================

    function initBirthInput() {
        const input = $("record-birth-date");
        const picker = $("record-birth-picker");

        const digits = raw =>
            String(raw).replace(/[^0-9]/g, "");

        function render(raw, position) {
            const output = [
                raw.slice(0, 2),
                raw.slice(2, 4),
                raw.slice(4, 8)
            ].filter(Boolean).join("/");

            input.value = output;

            let cursor = 0;
            let count = 0;

            while (cursor < output.length && count < position) {
                if (/\d/.test(output[cursor])) count++;
                cursor++;
            }

            if (output[cursor] === "/") cursor++;
            input.setSelectionRange(cursor, cursor);
        }

        function edit(action, added = "") {
            const raw = input.value;

            let from = digits(
                raw.slice(0, input.selectionStart ?? raw.length)
            ).length;

            let to = digits(
                raw.slice(0, input.selectionEnd ?? raw.length)
            ).length;

            let current = digits(raw);

            if (action === "insert") {
                const available = Math.max(
                    0,
                    8 - current.length + to - from
                );

                const extra = digits(added).slice(0, available);

                current = current.slice(0, from)
                    + extra + current.slice(to);

                from += extra.length;
            } else {
                if (from === to) {
                    if (action === "backward") {
                        if (!from) return;
                        from--;
                    } else {
                        if (to >= current.length) return;
                        to++;
                    }
                }

                current = current.slice(0, from) + current.slice(to);
            }

            render(current.slice(0, 8), from);
        }

        input.addEventListener("beforeinput", event => {
            if (!event.cancelable || event.isComposing) return;

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

                if (event.inputType !== "deleteContentBackward") {
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

        const normalize = () => {
            const position = digits(
                input.value.slice(
                    0,
                    input.selectionStart ?? input.value.length
                )
            ).length;

            render(digits(input.value).slice(0, 8), position);
        };

        input.addEventListener("input", event => {
            if (!event.isComposing) normalize();
        });

        input.addEventListener("compositionend", normalize);

        $("record-open-calendar").addEventListener("click", () => {
            if (profileLoading || profileSaving || !profile) return;

            picker.max = todayVietnam();

            try {
                picker.value = readBirthDate() || "";
            } catch {
                picker.value = "";
            }

            try {
                if (typeof picker.showPicker === "function") {
                    picker.showPicker();
                    return;
                }
            } catch {
                // Tiếp tục nhập ngày sinh bằng bàn phím.
            }

            message(
                "patient-record-message",
                "Bạn có thể nhập ngày sinh theo dạng dd/mm/yyyy.",
                "info"
            );

            input.focus();
        });

        picker.addEventListener("change", () => {
            if (!picker.value) return;

            input.value = dateText(picker.value);
            input.focus();
            input.setSelectionRange(
                input.value.length,
                input.value.length
            );
        });
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
            button.setAttribute("aria-expanded", String(isOpen));
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

    $("patient-search-form").addEventListener("submit", event => {
        event.preventDefault();

        if (!listLoading && !departmentsLoading && !profileSaving) {
            void loadList(
                1,
                $("patient-search-input").value.trim()
            );
        }
    });

    $("clear-patient-search").addEventListener("click", () => {
        if (listLoading || departmentsLoading || profileSaving) return;

        $("patient-search-input").value = "";
        void loadList(1, "");
    });

    $("refresh-patients-button").addEventListener("click", () => {
        void refreshList();
    });

    $("patients-page-size").addEventListener("change", () => {
        void loadList(
            1,
            keyword,
            Number($("patients-page-size").value)
        );
    });

    $("patients-previous-page").addEventListener("click", () => {
        if (page > 1) void loadList(page - 1);
    });

    $("patients-next-page").addEventListener("click", () => {
        if (page < totalPages) void loadList(page + 1);
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

        if (button && !button.disabled) {
            void openProfile(button.dataset.patientId, button);
        }
    });

    $("patient-record-form").addEventListener(
        "submit",
        saveProfile
    );

    $("record-visit-select").addEventListener("change", () => {
        if (profileLoading || profileSaving || !profile) return;

        const select = $("record-visit-select");

        try {
            if (canEditVitals() && vitalsChanged(readVitals())) {
                throw new Error(
                    "Bạn đang thay đổi số đo. Hãy lưu trước khi chuyển lịch sử khám."
                );
            }

            const next = profile.danhSachLanKham.find(
                item => idOf(item.maLichKham) === idOf(select.value)
            ) || null;

            renderVisit(next);
            message("patient-record-message", "");
        } catch (error) {
            select.value = visit ? String(visit.maLichKham) : "";
            message("patient-record-message", error.message);
        }
    });

    modalElement.addEventListener("hide.bs.modal", event => {
        if (profileSaving) {
            event.preventDefault();
            return;
        }

        profileVersion++;
        profileLoading = false;
    });

    modalElement.addEventListener("hidden.bs.modal", () => {
        clearProfile();
        updateProfileControls();

        if (trigger?.isConnected) {
            trigger.focus();
        } else {
            $("refresh-patients-button").focus();
        }

        trigger = null;
    });

    // =====================================================
    // KHỞI TẠO
    // =====================================================

    updateHeaderDate();
    initBirthInput();
    initNotifications();
    updateDateLabel();
    updateProfileControls();

    $("patients-total-count")?.remove();
    $("reset-patient-filters")?.remove();

    void refreshList();

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
            void openProfile(patientId, null, visitId);
        }
    }
})();