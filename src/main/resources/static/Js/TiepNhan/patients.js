
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

    let page = 1;
    let size = 20;
    let total = 0;
    let totalPages = 0;
    let keyword = "";

    let filterDate = todayVietnam();
    let filterRoom = "";
    let filterDoctor = "";

    let listLoading = false;
    let listVersion = 0;
    let doctorsReady = false;

    let roomsReady = false;
    let roomsLoading = false;
    let roomsDate = null;
    let roomsVersion = 0;
    let patientRoomIndex = new Map();

    let searchTimer = null;

    let profile = null;
    let visit = null;
    let trigger = null;

    let profileLoading = false;
    let profileSaving = false;
    let profileVersion = 0;

    // =====================================================
    // CẬP NHẬT GIAO DIỆN
    // =====================================================

    function initRoomFilterUI() {
        const select = $("patients-filter-room")
            || $("patients-filter-department");

        if (!select) {
            throw new Error("Không tìm thấy bộ lọc phòng.");
        }

        select.id = "patients-filter-room";
        select.setAttribute("aria-label", "Lọc theo phòng khám");
        select.replaceChildren(
            new Option("Đang tải phòng…", "")
        );

        const wrapper = select.closest(".patients-filter-field");

        if (wrapper) {
            wrapper.classList.remove("patients-department-field");
            wrapper.classList.add("patients-room-field");

            const label = wrapper.querySelector("label");

            if (label) {
                label.htmlFor = "patients-filter-room";
                label.textContent = "Phòng khám";
            }
        }

        if (!$("patients-custom-style")) {
            const style = document.createElement("style");
            style.id = "patients-custom-style";

            style.textContent = `
                .patients-page .patients-list-toolbar
                .patients-room-field {
                    flex: 0 1 170px;
                    width: 170px;
                    min-width: 140px;
                }

                .patients-page #patients-filter-room {
                    box-sizing: border-box;
                    width: 100%;
                    height: 34px;
                    min-height: 34px;
                    padding: 0 28px 0 10px;
                    border: 1px solid var(--border-color);
                    border-radius: 7px;
                    background: #fff;
                    color: var(--text-title);
                    font-family: inherit;
                    font-size: 12px;
                }

                .patients-page #patients-filter-room:focus {
                    border-color: var(--primary);
                    outline: none;
                    box-shadow: 0 0 0 3px rgba(100, 60, 255, .12);
                }

                .patients-page .patients-table th:nth-child(8),
                .patients-page .patients-table td:nth-child(8) {
                    width: 125px;
                }

                .patients-page .patients-profile-button {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 7px;
                    min-width: 92px;
                    height: 34px;
                    padding: 0 12px;
                    border: 1px solid var(--primary);
                    border-radius: 7px;
                    background: #fff;
                    color: var(--primary);
                    font-size: 12px;
                    font-weight: 600;
                    white-space: nowrap;
                    transition: background .2s, color .2s;
                }

                .patients-page .patients-profile-button:hover:not(:disabled) {
                    background: var(--primary);
                    color: #fff;
                }

                .patients-page .patients-profile-button i {
                    font-size: 13px;
                }

                @media (max-width: 991px) {
                    .patients-page .patients-list-toolbar
                    .patients-room-field {
                        flex: 1 1 140px;
                        width: auto;
                    }
                }

                @media (max-width: 575px) {
                    .patients-page .patients-list-toolbar
                    .patients-room-field {
                        flex: 1 1 100%;
                        width: 100%;
                    }
                }
            `;

            document.head.appendChild(style);
        }
    }

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

        element.textContent =
            content == null || content === ""
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

    function normalizeText(raw) {
        return String(raw ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[đĐ]/g, "d")
            .toLowerCase()
            .trim()
            .replace(/\s+/g, " ");
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
            throw new Error(
                "Nhập ngày sinh theo dạng dd/mm/yyyy."
            );
        }

        const isoDate =
            `${match[3]}-${match[2]}-${match[1]}`;

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
            throw new Error(
                "Vui lòng đăng nhập lại để tiếp tục."
            );
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
                        : "Phản hồi máy chủ không hợp lệ."
            );

            error.status = response.status;
            throw error;
        }

        if (!response.ok || !data || typeof data !== "object") {
            const error = new Error(
                data?.message
                || data?.detail
                || "Không thể xử lý yêu cầu."
            );

            error.status = response.status;
            throw error;
        }

        return data;
    }

    // =====================================================
    // ĐIỀU KHIỂN DANH SÁCH
    // =====================================================

    function updateListControls() {
        const busy = listLoading || profileSaving;

        [
            "patient-search-button",
            "refresh-patients-button",
            "clear-patient-search",
            "patients-page-size",
            "patients-filter-date",
            "patients-open-calendar"
        ].forEach(id => {
            $(id).disabled = busy;
        });

        // Vẫn cho gõ từ khóa khi yêu cầu cũ đang tải
        $("patient-search-input").disabled = profileSaving;

        $("patients-previous-date").disabled =
            busy || filterDate <= "1000-01-01";

        $("patients-next-date").disabled =
            busy || filterDate >= "9999-12-31";

        $("patients-filter-room").disabled =
            busy || !roomsReady;

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
                    profileLoading
                    || profileSaving
                    || listLoading;
            });
    }

    function appendCell(row, content, className = "") {
        const cell = document.createElement("td");

        cell.textContent =
            content == null || content === ""
                ? "Chưa cung cấp"
                : String(content);

        cell.className = className;
        row.appendChild(cell);

        return cell;
    }

    // =====================================================
    // HIỂN THỊ BẢNG BỆNH NHÂN
    // =====================================================

    function renderList(items) {
        const body = $("patients-table-body");
        body.replaceChildren();

        items.forEach((item, index) => {
            const row = document.createElement("tr");

            appendCell(
                row,
                (page - 1) * size + index + 1
            );

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

            // Nút mắt + Hồ sơ
            const actionCell = document.createElement("td");
            const button = document.createElement("button");

            button.type = "button";
            button.className =
                "btn btn-outline-primary btn-sm patients-profile-button";

            const eyeIcon = document.createElement("i");
            eyeIcon.className = "fa-regular fa-eye";
            eyeIcon.setAttribute("aria-hidden", "true");

            const label = document.createElement("span");
            label.textContent = "Hồ sơ";

            button.append(eyeIcon, label);

            button.dataset.patientId =
                String(item.maBenhNhan);

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
            keyword || filterRoom || filterDoctor
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
        text(
            "patients-date-label",
            dateText(filterDate)
        );

        const input = $("patients-filter-date");

        input.value = filterDate;
        input.style.cssText = "";
        input.tabIndex = -1;
    }

    function restoreListFilters() {
        updateDateLabel();

        $("patients-filter-room").value = filterRoom;
        $("patients-filter-doctor").value = filterDoctor;
        $("patients-page-size").value = String(size);
    }

    // =====================================================
    // LẤY DANH SÁCH PHÒNG KHÁM
    // =====================================================

    async function loadRooms(date, force = false) {
        if (!force && roomsDate === date && roomsReady) {
            return;
        }

        if (!force && roomsDate === date && roomsLoading) {
            return;
        }

        const version = ++roomsVersion;

        roomsDate = date;
        roomsLoading = true;
        roomsReady = false;

        patientRoomIndex = new Map();

        const select = $("patients-filter-room");

        select.replaceChildren(
            new Option("Đang tải phòng…", "")
        );

        select.disabled = true;
        updateListControls();

        try {
            const allPatients = [];

            let currentPage = 1;
            let pageCount = 1;

            // Lấy đầy đủ các trang bệnh nhân trong ngày
            do {
                const params = new URLSearchParams({
                    keyword: "",
                    page: String(currentPage),
                    size: "100",
                    ngayKham: date
                });

                const result = await callApi(
                    `${LIST_API}?${params}`
                );

                if (version !== roomsVersion) return;

                if (
                    result.success !== true
                    || !Array.isArray(result.items)
                    || !Number.isSafeInteger(result.totalPages)
                ) {
                    throw new Error(
                        "Không thể tải dữ liệu phòng khám."
                    );
                }

                allPatients.push(...result.items);

                pageCount = result.totalPages;
                currentPage++;

            } while (currentPage <= pageCount);

            const ids = [...new Set(
                allPatients
                    .map(item => idOf(item.maBenhNhan))
                    .filter(Boolean)
            )];

            const index = new Map();
            const roomNames = new Set();

            let nextIndex = 0;
            let failed = false;

            // Tối đa 5 yêu cầu đồng thời
            const worker = async () => {
                while (nextIndex < ids.length) {
                    const id = ids[nextIndex++];

                    try {
                        const data = await callApi(
                            `${PROFILE_API}/${id}`
                        );

                        if (version !== roomsVersion) return;

                        const rooms = new Set();

                        for (const visit of data.danhSachLanKham || []) {
                            const visitDate =
                                String(visit.ngayKham || "").slice(0, 10);

                            if (visitDate !== date) {
                                continue;
                            }

                            const room =
                                String(visit.phong || "").trim();

                            if (
                                room
                                && room !== "Chưa phân công"
                            ) {
                                rooms.add(room);
                                roomNames.add(room);
                            }
                        }

                        index.set(id, rooms);

                    } catch {
                        failed = true;
                    }
                }
            };

            await Promise.all(
                Array.from(
                    { length: Math.min(5, ids.length) },
                    worker
                )
            );

            if (version !== roomsVersion) return;

            if (failed) {
                throw new Error(
                    "Một số hồ sơ chưa tải được phòng khám. "
                    + "Hãy làm mới để thử lại."
                );
            }

            patientRoomIndex = index;
            roomsReady = true;

            select.replaceChildren(
                new Option("Tất cả phòng", "")
            );

            [...roomNames]
                .sort((a, b) => a.localeCompare(b, "vi"))
                .forEach(room => {
                    select.add(new Option(room, room));
                });

            if (![...roomNames].includes(filterRoom)) {
                filterRoom = "";
            }

            select.value = filterRoom;

            if (filterRoom) {
                void loadList(
                    1,
                    keyword,
                    size,
                    date,
                    filterRoom,
                    filterDoctor
                );
            }

        } catch (error) {
            if (version !== roomsVersion) return;

            roomsReady = false;
            filterRoom = "";

            select.replaceChildren(
                new Option("Chưa tải được phòng", "")
            );

            message(
                "patient-message",
                error.message,
                "warning"
            );

        } finally {
            if (version === roomsVersion) {
                roomsLoading = false;
                updateListControls();
            }
        }
    }

    async function loadAllMatchingPatients(
        targetKeyword,
        targetDate,
        targetDoctor
    ) {
        const items = [];

        let currentPage = 1;
        let pageCount = 1;

        do {
            const params = new URLSearchParams({
                keyword: targetKeyword,
                page: String(currentPage),
                size: "100",
                ngayKham: targetDate
            });

            if (targetDoctor) {
                params.set("maBacSi", targetDoctor);
            }

            const result = await callApi(
                `${LIST_API}?${params}`
            );

            if (
                result.success !== true
                || !Array.isArray(result.items)
                || !Number.isSafeInteger(result.totalPages)
            ) {
                throw new Error(
                    "Danh sách bệnh nhân không hợp lệ."
                );
            }

            items.push(...result.items);

            pageCount = result.totalPages;
            currentPage++;

        } while (currentPage <= pageCount);

        return items;
    }

    // =====================================================
    // TẢI DANH SÁCH VÀ LỌC
    // =====================================================

    async function loadList(
        targetPage = page,
        targetKeyword = keyword,
        targetSize = size,
        targetDate = filterDate,
        targetRoom = filterRoom,
        targetDoctor = filterDoctor
    ) {
        const version = ++listVersion;

        listLoading = true;
        updateListControls();

        message("patient-message", "");

        try {
            validateFilterDate(targetDate);

            if (
                !Number.isSafeInteger(targetPage)
                || targetPage < 1
            ) {
                throw new Error("Số trang không hợp lệ.");
            }

            if (
                !Number.isSafeInteger(targetSize)
                || targetSize < 1
                || targetSize > 100
            ) {
                throw new Error(
                    "Số bệnh nhân mỗi trang không hợp lệ."
                );
            }

            if ([...targetKeyword].length > 100) {
                throw new Error(
                    "Từ khóa không được vượt quá 100 ký tự."
                );
            }

            if (
                targetRoom
                && (
                    !roomsReady
                    || roomsDate !== targetDate
                )
            ) {
                throw new Error(
                    "Bộ lọc phòng chưa sẵn sàng."
                );
            }

            if (targetDoctor && !idOf(targetDoctor)) {
                throw new Error(
                    "Vui lòng chọn bác sĩ hợp lệ."
                );
            }

            // Lấy danh sách bác sĩ theo ngày
            const doctorParams = new URLSearchParams({
                ngayKham: targetDate
            });

            const doctorData = await callApi(
                `${LIST_API}/bac-si?${doctorParams}`
            );

            if (version !== listVersion) return;

            if (
                doctorData.success !== true
                || !Array.isArray(doctorData.items)
            ) {
                throw new Error(
                    "Danh sách bác sĩ không hợp lệ."
                );
            }

            const doctors = doctorData.items;

            if (
                targetDoctor
                && !doctors.some(item =>
                    String(item.maBacSi) === String(targetDoctor)
                )
            ) {
                targetDoctor = "";
            }

            let data;

            if (targetRoom) {
                // Lọc phòng trước, sau đó mới phân trang
                const all = await loadAllMatchingPatients(
                    targetKeyword,
                    targetDate,
                    targetDoctor
                );

                if (version !== listVersion) return;

                const filtered = all.filter(item =>
                    patientRoomIndex
                        .get(idOf(item.maBenhNhan))
                        ?.has(targetRoom)
                );

                const count = filtered.length;
                const pages = Math.ceil(count / targetSize);

                const correctedPage = pages
                    ? Math.min(targetPage, pages)
                    : 1;

                data = {
                    success: true,
                    page: correctedPage,
                    size: targetSize,
                    total: count,
                    totalPages: pages,
                    items: filtered.slice(
                        (correctedPage - 1) * targetSize,
                        correctedPage * targetSize
                    )
                };

            } else {
                const params = new URLSearchParams({
                    keyword: targetKeyword,
                    page: String(targetPage),
                    size: String(targetSize),
                    ngayKham: targetDate
                });

                if (targetDoctor) {
                    params.set("maBacSi", targetDoctor);
                }

                data = await callApi(
                    `${LIST_API}?${params}`
                );
            }

            if (version !== listVersion) return;

            // Không cho phản hồi cũ ghi đè tìm kiếm mới
            if (
                targetKeyword !==
                $("patient-search-input").value.trim()
            ) {
                return;
            }

            if (
                data.success !== true
                || !Array.isArray(data.items)
                || !Number.isSafeInteger(data.total)
                || !Number.isSafeInteger(data.totalPages)
            ) {
                throw new Error(
                    "Dữ liệu danh sách bệnh nhân không hợp lệ."
                );
            }

            if (
                data.totalPages > 0
                && targetPage > data.totalPages
                && !targetRoom
            ) {
                void loadList(
                    data.totalPages,
                    targetKeyword,
                    targetSize,
                    targetDate,
                    targetRoom,
                    targetDoctor
                );
                return;
            }

            page = data.total === 0 ? 1 : data.page;
            size = data.size;
            keyword = targetKeyword;
            filterDate = targetDate;
            filterRoom = targetRoom;
            filterDoctor = targetDoctor;

            total = data.total;
            totalPages = data.totalPages;

            const doctorSelect =
                $("patients-filter-doctor");

            doctorSelect.replaceChildren(
                new Option("Tất cả bác sĩ", "")
            );

            doctors.forEach(item => {
                doctorSelect.add(
                    new Option(
                        item.tenBacSi
                        || `Bác sĩ ${item.maBacSi}`,
                        String(item.maBacSi)
                    )
                );
            });

            doctorsReady = true;

            restoreListFilters();
            renderList(data.items);

            if (roomsDate !== targetDate) {
                void loadRooms(targetDate);
            }

        } catch (error) {
            if (version !== listVersion) return;

            message("patient-message", error.message);

            // Không giữ danh sách cũ khi tìm kiếm thất bại
            $("patients-table-body").replaceChildren();
            $("patients-empty").hidden = false;

            text(
                "patients-empty-message",
                "Chưa tải được danh sách bệnh nhân."
            );

            text(
                "patients-record-count",
                "Dữ liệu chưa được cập nhật."
            );

        } finally {
            if (version === listVersion) {
                listLoading = false;
                updateListControls();
            }
        }
    }

    async function refreshList() {
        if (profileSaving) return;

        updateHeaderDate();

        await loadList(
            page,
            $("patient-search-input").value.trim()
        );

        if (
            roomsDate === filterDate
            && !roomsLoading
        ) {
            void loadRooms(filterDate, true);
        }
    }

    // =====================================================
    // CHỌN NGÀY VÀ BỘ LỌC
    // =====================================================

    function moveDate(offset) {
        if (listLoading || profileSaving) return;

        try {
            const [year, month, day] =
                filterDate.split("-").map(Number);

            const date = new Date(
                Date.UTC(year, month - 1, day)
            );

            date.setUTCDate(
                date.getUTCDate() + offset
            );

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
                "",
                filterDoctor
            );

        } catch (error) {
            message("patient-message", error.message);
        }
    }

    function openDateCalendar() {
        if (listLoading || profileSaving) return;

        const input = $("patients-filter-date");
        input.value = filterDate;

        try {
            if (typeof input.showPicker === "function") {
                input.showPicker();
                return;
            }
        } catch {
            // Hiển thị ô chọn ngày thay thế
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
        if (listLoading || profileSaving) return;

        try {
            const input = $("patients-filter-date");

            validateFilterDate(input.value);

            void loadList(
                1,
                $("patient-search-input").value.trim(),
                size,
                input.value,
                input.value === filterDate
                    ? $("patients-filter-room").value
                    : "",
                $("patients-filter-doctor").value
            );

        } catch (error) {
            message("patient-message", error.message);
        }
    }

    // =====================================================
    // HỒ SƠ VÀ LỊCH SỬ KHÁM
    // =====================================================

    function canEditVitals() {
        return !!visit
            && String(visit.ngayKham).slice(0, 10)
                === todayVietnam()
            && ["Đã gọi", "DaGoi"].includes(visit.trangThai);
    }

    function updateProfileControls() {
        const editable =
            !!profile
            && !profileLoading
            && !profileSaving;

        $("patient-record-fields").disabled = !editable;
        $("patient-record-loading").hidden = !profileLoading;
        $("patient-record-save").disabled = !editable;
        $("patient-record-close").disabled = profileSaving;

        $("patient-record-save").textContent =
            profileSaving
                ? "Đang lưu…"
                : "Lưu hồ sơ";

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

        modalElement
            .querySelectorAll("details")
            .forEach(element => {
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
            text(
                "record-visit-code",
                `Mã lịch: ${item.maLichKham}`
            );

            text(
                "record-visit-time",
                `${dateText(item.ngayKham)} · ${
                    String(item.gioKham || "--:--").slice(0, 5)
                }`
            );

            text(
                "record-visit-sequence",
                idOf(item.soThuTu)
                    ? `#${String(item.soThuTu).padStart(3, "0")}`
                    : "Chưa có số"
            );

            text("record-visit-department", item.khoa);
            text("record-visit-doctor", item.bacSi);
            text(
                "record-visit-room",
                item.phong,
                "Chưa phân công"
            );

            text("record-visit-reason", item.lyDoKham);

            text(
                "record-visit-status",
                item.trangThai,
                "Chưa xác định"
            );

            $("record-visit-status").className =
                "badge " + (
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
        const matchingDate = items.find(item =>
            String(item.ngayKham).slice(0, 10)
                === filterDate
        );

        if (matchingDate) return matchingDate;

        const today = todayVietnam();

        return items.find(item =>
            String(item.ngayKham).slice(0, 10) === today
        ) || items.find(item =>
            String(item.ngayKham).slice(0, 10) < today
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
            message(
                "patient-message",
                "Mã bệnh nhân không hợp lệ."
            );
            return;
        }

        const version = ++profileVersion;
        trigger = button;

        clearProfile();

        profileLoading = true;
        updateProfileControls();
        modal.show();

        try {
            const data = await callApi(
                `${PROFILE_API}/${id}`
            );

            if (version !== profileVersion) return;

            if (
                idOf(data.maBenhNhan) !== id
                || !Array.isArray(data.danhSachLanKham)
            ) {
                throw new Error(
                    "Dữ liệu hồ sơ bệnh nhân không hợp lệ."
                );
            }

            profile = data;

            text(
                "record-patient-code",
                `Mã BN: ${id}`
            );

            Object.entries(personalFields).forEach(
                ([key, field]) => {
                    $(field).value = data[key] ?? "";
                }
            );

            $("record-birth-date").value =
                data.ngaySinh
                    ? dateText(data.ngaySinh)
                    : "";

            const select = $("record-visit-select");

            select.replaceChildren(
                new Option(
                    data.danhSachLanKham.length
                        ? "Chọn lịch sử khám"
                        : "Chưa có lịch sử khám",
                    ""
                )
            );

            data.danhSachLanKham.forEach(item => {
                const label =
                    `${dateText(item.ngayKham)} · `
                    + `${String(item.gioKham || "--:--").slice(0, 5)} · `
                    + `${item.khoa || "Chưa có khoa"} · `
                    + `Mã ${item.maLichKham}`;

                select.add(
                    new Option(
                        label,
                        String(item.maLichKham)
                    )
                );
            });

            const selected = appointmentId
                ? data.danhSachLanKham.find(item =>
                    idOf(item.maLichKham) === appointmentId
                )
                : defaultVisit(data.danhSachLanKham);

            renderVisit(selected || null);

            if (appointmentId && !selected) {
                message(
                    "patient-record-message",
                    "Lịch khám không thuộc hồ sơ này.",
                    "warning"
                );
            }

        } catch (error) {
            if (version === profileVersion) {
                message(
                    "patient-record-message",
                    error.message
                );
            }

        } finally {
            if (version === profileVersion) {
                profileLoading = false;
                updateProfileControls();
            }
        }
    }

    // =====================================================
    // KIỂM TRA DỮ LIỆU HỒ SƠ
    // =====================================================

    function personalPayload() {
        const data = {
            ngaySinh: readBirthDate()
        };

        Object.entries(personalFields).forEach(
            ([key, field]) => {
                data[key] = value(field);
            }
        );

        if (!data.hoTen) {
            throw new Error(
                "Vui lòng nhập họ tên bệnh nhân."
            );
        }

        for (const [key, label] of [
            ["hoTen", "Họ tên"],
            ["email", "Email"],
            ["diaChi", "Địa chỉ"]
        ]) {
            if (
                data[key]
                && [...data[key]].length > 255
            ) {
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
            if (
                data[key]
                && !/^\+?[0-9]{9,14}$/.test(data[key])
            ) {
                throw new Error(
                    `${label} phải gồm 9 đến 14 chữ số.`
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
            && new TextEncoder().encode(
                data.tienSuBenh
            ).length > 65535
        ) {
            throw new Error(
                "Nội dung tiền sử bệnh quá dài."
            );
        }

        return data;
    }

    function readVitals() {
        const data = {
            maLichKham: idOf(visit?.maLichKham)
        };

        Object.entries(vitalFields).forEach(
            ([key, field]) => {
                const input = $(field);
                const raw = value(field);

                if (
                    input.validity.badInput
                    || (
                        raw
                        && !Number.isFinite(Number(raw))
                    )
                ) {
                    throw new Error(
                        "Số đo phải là số hợp lệ."
                    );
                }

                data[key] =
                    raw === null
                        ? null
                        : Number(raw);
            }
        );

        return data;
    }

    function vitalsChanged(data) {
        return !!visit && Object.keys(vitalFields).some(
            key => {
                const previous =
                    visit[key] == null
                        ? null
                        : Number(visit[key]);

                return data[key] !== previous;
            }
        );
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
                    || number <= 0
                    || number > 999.99
                    || Math.abs(
                        number * 100 - Math.round(number * 100)
                    ) > 0.000001
                )
            ) {
                throw new Error(
                    `${label} phải lớn hơn 0, tối đa 999,99 `
                    + "và có tối đa hai chữ số thập phân."
                );
            }
        }

        for (const key of [
            "huyetApTamThu",
            "huyetApTamTruong"
        ]) {
            const number = data[key];

            if (
                number !== null
                && (
                    !Number.isInteger(number)
                    || number < 1
                    || number > 65535
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
    // LƯU HỒ SƠ BỆNH NHÂN
    // =====================================================

    async function saveProfile(event) {
        event.preventDefault();

        if (!profile || profileLoading || profileSaving) {
            return;
        }

        message("patient-record-message", "");

        let personal;
        let personalChanged;
        let vitals = null;

        try {
            personal = personalPayload();

            personalChanged = Object.keys(personal).some(
                key => {
                    const oldValue = profile[key];

                    const previous = key === "ngaySinh"
                        ? (
                            oldValue
                                ? String(oldValue).slice(0, 10)
                                : null
                        )
                        : (
                            oldValue == null
                                ? null
                                : String(oldValue).trim() || null
                        );

                    return personal[key] !== previous;
                }
            );

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
            message(
                "patient-record-message",
                error.message
            );
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
                        || "Máy chủ chưa xác nhận lưu hồ sơ."
                    );
                }

                Object.assign(profile, personal);
                personalSaved = true;
            }

            if (vitals) {
                const result = await callApi(
                    VITALS_API,
                    {
                        method: "POST",
                        body: JSON.stringify(vitals)
                    }
                );

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
                ? "Thông tin bệnh nhân đã lưu. "
                : "";

            message(
                "patient-record-message",
                partialMessage + error.message
                    + " Nếu kết quả chưa rõ, đóng và mở lại hồ sơ để kiểm tra."
            );

        } finally {
            profileSaving = false;
            updateProfileControls();
            void loadList();
        }
    }

    // =====================================================
    // NHẬP NGÀY SINH DD/MM/YYYY
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

            while (
                cursor < output.length
                && count < position
            ) {
                if (/\d/.test(output[cursor])) count++;
                cursor++;
            }

            if (output[cursor] === "/") cursor++;

            input.setSelectionRange(cursor, cursor);
        }

        function edit(action, added = "") {
            const raw = input.value;

            let from = digits(
                raw.slice(
                    0,
                    input.selectionStart ?? raw.length
                )
            ).length;

            let to = digits(
                raw.slice(
                    0,
                    input.selectionEnd ?? raw.length
                )
            ).length;

            let current = digits(raw);

            if (action === "insert") {
                const available = Math.max(
                    0,
                    8 - current.length + to - from
                );

                const extra =
                    digits(added).slice(0, available);

                current = current.slice(0, from)
                    + extra
                    + current.slice(to);

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

                current =
                    current.slice(0, from)
                    + current.slice(to);
            }

            render(current.slice(0, 8), from);
        }

        input.addEventListener("beforeinput", event => {
            if (!event.cancelable || event.isComposing) {
                return;
            }

            if (
                ["insertText", "insertReplacementText"]
                    .includes(event.inputType)
                && event.data !== null
            ) {
                event.preventDefault();
                edit("insert", event.data);

            } else if ([
                "deleteContentBackward",
                "deleteWordBackward",
                "deleteSoftLineBackward"
            ].includes(event.inputType)) {
                event.preventDefault();

                if (
                    event.inputType !==
                    "deleteContentBackward"
                ) {
                    input.setSelectionRange(
                        0,
                        input.selectionEnd ?? 0
                    );
                }

                edit("backward");

            } else if ([
                "deleteContentForward",
                "deleteWordForward",
                "deleteSoftLineForward"
            ].includes(event.inputType)) {
                event.preventDefault();

                if (
                    event.inputType !==
                    "deleteContentForward"
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

        const normalize = () => {
            const position = digits(
                input.value.slice(
                    0,
                    input.selectionStart ?? input.value.length
                )
            ).length;

            render(
                digits(input.value).slice(0, 8),
                position
            );
        };

        input.addEventListener("input", event => {
            if (!event.isComposing) normalize();
        });

        input.addEventListener(
            "compositionend",
            normalize
        );

        $("record-open-calendar").addEventListener(
            "click",
            () => {
                if (
                    profileLoading
                    || profileSaving
                    || !profile
                ) {
                    return;
                }

                picker.max = todayVietnam();

                try {
                    picker.value = readBirthDate() || "";
                } catch {
                    picker.value = "";
                }

                try {
                    if (
                        typeof picker.showPicker
                        === "function"
                    ) {
                        picker.showPicker();
                        return;
                    }
                } catch {
                    // Dùng cách nhập bằng bàn phím
                }

                input.focus();
            }
        );

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
    // THÔNG BÁO HEADER
    // =====================================================

    function initNotifications() {
        const wrapper = $("notification-wrapper");
        const button = $("notification-button");
        const panel = $("notification-panel");
        const close = $("notification-close");

        if (!wrapper || !button || !panel || !close) {
            return;
        }

        function setOpen(isOpen, focus = false) {
            panel.hidden = !isOpen;

            button.setAttribute(
                "aria-expanded",
                String(isOpen)
            );

            button.setAttribute(
                "aria-label",
                isOpen
                    ? "Đóng thông báo"
                    : "Mở thông báo"
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
            if (
                event.key === "Escape"
                && !panel.hidden
            ) {
                setOpen(false, true);
            }
        });
    }

    // =====================================================
    // SỰ KIỆN TÌM KIẾM VÀ BỘ LỌC
    // =====================================================

    $("patient-search-form").addEventListener(
        "submit",
        event => {
            event.preventDefault();

            clearTimeout(searchTimer);

            if (!profileSaving) {
                void loadList(
                    1,
                    $("patient-search-input").value.trim()
                );
            }
        }
    );

    // Tìm ngay khi nhập, đợi 300ms
    $("patient-search-input").addEventListener(
        "input",
        () => {
            clearTimeout(searchTimer);

            if (profileSaving) return;

            const current =
                $("patient-search-input").value.trim();

            if (!current) {
                void loadList(1, "");
            } else {
                searchTimer = setTimeout(
                    () => void loadList(1, current),
                    300
                );
            }
        }
    );

    $("clear-patient-search").addEventListener(
        "click",
        () => {
            if (profileSaving) return;

            clearTimeout(searchTimer);

            $("patient-search-input").value = "";

            void loadList(1, "");
        }
    );

    $("refresh-patients-button").addEventListener(
        "click",
        () => {
            void refreshList();
        }
    );

    $("patients-page-size").addEventListener(
        "change",
        () => {
            void loadList(
                1,
                keyword,
                Number($("patients-page-size").value)
            );
        }
    );

    $("patients-previous-page").addEventListener(
        "click",
        () => {
            if (page > 1) {
                void loadList(page - 1);
            }
        }
    );

    $("patients-next-page").addEventListener(
        "click",
        () => {
            if (page < totalPages) {
                void loadList(page + 1);
            }
        }
    );

    $("patients-filter-date").addEventListener(
        "change",
        applyFilters
    );

    $("patients-filter-room").addEventListener(
        "change",
        applyFilters
    );

    $("patients-filter-doctor").addEventListener(
        "change",
        applyFilters
    );

    $("patients-previous-date").addEventListener(
        "click",
        () => {
            moveDate(-1);
        }
    );

    $("patients-next-date").addEventListener(
        "click",
        () => {
            moveDate(1);
        }
    );

    $("patients-open-calendar").addEventListener(
        "click",
        openDateCalendar
    );

    // =====================================================
    // SỰ KIỆN MỞ HỒ SƠ
    // =====================================================


$("patients-table-body").addEventListener(
    "click",
    event => {
        const button = event.target.closest(
            "button[data-patient-id]"
        );

        if (!button || button.disabled) {
            return;
        }

        const maBenhNhan = Number(
            button.dataset.patientId
        );

        if (
            !Number.isSafeInteger(maBenhNhan)
            || maBenhNhan <= 0
        ) {
            message(
                "patient-message",
                "Mã bệnh nhân không hợp lệ."
            );
            return;
        }

        // Mở trang Hồ sơ bệnh nhân mới
        // Không sử dụng popup cũ nữa
        const params = new URLSearchParams({
            from: "patients"
        });

        window.location.assign(
            `/TiepNhan/ho-so-benh-nhan/${maBenhNhan}?${params.toString()}`
        );
    }
);


    $("patient-record-form").addEventListener(
        "submit",
        saveProfile
    );

    $("record-visit-select").addEventListener(
        "change",
        () => {
            if (
                profileLoading
                || profileSaving
                || !profile
            ) {
                return;
            }

            const select = $("record-visit-select");

            try {
                if (
                    canEditVitals()
                    && vitalsChanged(readVitals())
                ) {
                    throw new Error(
                        "Bạn đang thay đổi số đo. "
                        + "Hãy lưu trước khi chuyển lịch sử khám."
                    );
                }

                const next =
                    profile.danhSachLanKham.find(
                        item =>
                            idOf(item.maLichKham)
                            === idOf(select.value)
                    ) || null;

                renderVisit(next);
                message("patient-record-message", "");

            } catch (error) {
                select.value = visit
                    ? String(visit.maLichKham)
                    : "";

                message(
                    "patient-record-message",
                    error.message
                );
            }
        }
    );

    modalElement.addEventListener(
        "hide.bs.modal",
        event => {
            if (profileSaving) {
                event.preventDefault();
                return;
            }

            profileVersion++;
            profileLoading = false;
        }
    );

    modalElement.addEventListener(
        "hidden.bs.modal",
        () => {
            clearProfile();
            updateProfileControls();

            if (trigger?.isConnected) {
                trigger.focus();
            } else {
                $("refresh-patients-button").focus();
            }

            trigger = null;
        }
    );

    // =====================================================
    // KHỞI TẠO
    // =====================================================

    initRoomFilterUI();
    updateHeaderDate();
    initBirthInput();
    initNotifications();
    updateDateLabel();
    updateProfileControls();

    $("patients-total-count")?.remove();
    $("reset-patient-filters")?.remove();

    void refreshList();

    // Hỗ trợ mở hồ sơ từ đường dẫn có sẵn
    const params = new URLSearchParams(
        window.location.search
    );

    if (
        params.has("maBenhNhan")
        || params.has("maLichKham")
    ) {
        const patientId =
            idOf(params.get("maBenhNhan"));

        const visitId = params.has("maLichKham")
            ? idOf(params.get("maLichKham"))
            : null;

        if (
            !patientId
            || (
                params.has("maLichKham")
                && !visitId
            )
        ) {
            message(
                "patient-message",
                "Mã bệnh nhân hoặc mã lịch khám không hợp lệ."
            );
        } else {
            void openProfile(
                patientId,
                null,
                visitId
            );
        }
    }
})();
