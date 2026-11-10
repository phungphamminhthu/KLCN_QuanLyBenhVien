(() => {
    "use strict";

    /*
     * API:
     * GET  /api/phan-cong-chuyen-trach
     * GET  /api/phan-cong-chuyen-trach/tai-khoan
     * POST /api/phan-cong-chuyen-trach
     */

    const API = {
        list: "/api/phan-cong-chuyen-trach",
        account: "/api/phan-cong-chuyen-trach/tai-khoan"
    };

    const $ = selector => document.querySelector(selector);

    const el = {
        body: $("#assignmentTableBody"),
        summary: $("#tableSummary"),
        pagination: $("#pagination"),

        total: $("#statTotal"),
        active: $("#statActive"),
        upcoming: $("#statUpcoming"),

        search: $("#filterSearch"),
        from: $("#filterFrom"),
        to: $("#filterTo"),
        status: $("#filterStatus"),

        page: $("#pageMessage"),
        formMsg: $("#formMessage"),

        modal: $("#createModal"),
        detail: $("#detailModal"),

        form: $("#assignmentForm"),
        date: $("#workDate"),
        start: $("#startTime"),
        end: $("#endTime"),
        note: $("#note"),

        specialists: $("#specialistList"),
        specialistDropdown: $("#specialistDropdown"),
        specialistTrigger: $("#specialistDropdownTrigger"),
        specialistPanel: $("#specialistDropdownPanel"),
        specialistSelectedText: $("#specialistSelectedText"),
        specialistSelectedCount: $("#specialistSelectedCount"),
        specialistSearch: $("#specialistSearch"),

        submit: $("#btnSubmitCreate"),
        detailContent: $("#detailContent")
    };

    let assignments = [];
    let specialists = [];
    let isSubmitting = false;

    // Mỗi trang hiển thị tối đa 10 lịch phân công
    const PAGE_SIZE = 5;
    let currentPage = 1;

    // ========================================
    // KIỂM TRA CÁC PHẦN TỬ HTML
    // ========================================

    function validateElements() {
        const requiredElements = Object.entries(el)
            .filter(([, element]) => !element)
            .map(([name]) => name);

        const requiredButtons = [
            "btnOpenCreate",
            "btnCloseModal",
            "btnCancelCreate",
            "btnSelectAllSpecialists",
            "btnClearSpecialists",
            "btnCloseSpecialistDropdown",
            "btnCloseDetail",
            "btnCloseDetailFooter",
            "btnRefresh",
            "btnResetFilter"
        ];

        const missingButtons = requiredButtons.filter(
            id => !document.getElementById(id)
        );

        if (requiredElements.length || missingButtons.length) {
            console.error("Thiếu phần tử HTML:", {
                elements: requiredElements,
                buttons: missingButtons
            });
            return false;
        }

        return true;
    }

    // ========================================
    // JWT
    // ========================================

    function getToken() {
        const keys = [
            "Token",
            "accessToken",
            "access_token",
            "token",
            "jwt",
            "jwtToken"
        ];

        for (const storage of [sessionStorage, localStorage]) {
            for (const key of keys) {
                const value = storage.getItem(key);

                if (value && value.trim()) {
                    return value.trim().replace(/^Bearer\s+/i, "");
                }
            }
        }

        return null;
    }

    // ========================================
    // API REQUEST
    // ========================================

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

        let response;

        try {
            response = await fetch(url, {
                ...options,
                headers
            });
        } catch (error) {
            console.error("Lỗi kết nối API:", error);
            throw new Error(
                "Không kết nối được máy chủ. Hãy kiểm tra backend."
            );
        }

        const contentType = response.headers.get("content-type") || "";
        let data = null;

        if (contentType.includes("application/json")) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (response.status === 401) {
            throw new Error(
                "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại."
            );
        }

        if (response.status === 403) {
            throw new Error(
                "Bạn không có quyền thực hiện chức năng này."
            );
        }

        if (!response.ok) {
            const message = typeof data === "object" && data !== null
                ? data.detail || data.message || data.error || data.title
                : data;

            throw new Error(
                message || `Yêu cầu thất bại (${response.status}).`
            );
        }

        return data;
    }

    // ========================================
    // TIỆN ÍCH
    // ========================================

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    function getAssignmentId(item) {
        return item.maPhanCongChuyenTrach ??
            item.maPhanCong ??
            item.id ??
            "";
    }

    function getWorkDate(item) {
        return item.ngayLamViec || item.ngay || "";
    }

    function formatTime(value) {
        return String(value || "").slice(0, 5);
    }

    function formatDate(value) {
        if (!value) return "—";

        const date = new Date(`${value}T00:00:00`);

        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return new Intl.DateTimeFormat("vi-VN").format(date);
    }

    function getTodayString() {
        const now = new Date();

        return new Date(
            now.getTime() - now.getTimezoneOffset() * 60000
        ).toISOString().slice(0, 10);
    }

    function showMessage(element, message, type = "info") {
        if (!element) return;

        element.textContent = message;
        element.className = `pctc-alert pctc-alert-${type}`;
        element.hidden = false;
    }

    function hideMessage(element) {
        if (!element) return;

        element.hidden = true;
        element.textContent = "";
    }

    // ========================================
    // TRẠNG THÁI LỊCH
    // ========================================

    function getStatus(item) {
        if (
            item.trangThai === false ||
            Number(item.trangThai) === 0 ||
            item.trangThai === "INACTIVE"
        ) {
            return {
                key: "inactive",
                label: "Ngừng hoạt động"
            };
        }

        const date = getWorkDate(item);
        const start = new Date(
            `${date}T${formatTime(item.gioBatDau)}`
        );
        const end = new Date(
            `${date}T${formatTime(item.gioKetThuc)}`
        );
        const now = new Date();

        if (
            !date ||
            Number.isNaN(start.getTime()) ||
            Number.isNaN(end.getTime())
        ) {
            return {
                key: "inactive",
                label: "Không xác định"
            };
        }

        if (end <= now) {
            return {
                key: "ended",
                label: "Đã kết thúc"
            };
        }

        if (start > now) {
            return {
                key: "upcoming",
                label: "Sắp diễn ra"
            };
        }

        return {
            key: "active",
            label: "Đang hoạt động"
        };
    }

    // ========================================
    // DROPDOWN CHỌN NHIỀU NHÂN VIÊN
    // ========================================

    function getSelectedSpecialistIds() {
        return [
            ...el.specialists.querySelectorAll(
                'input[name="maNguoiDungs"]:checked'
            )
        ].map(input => Number(input.value));
    }

    function updateSpecialistSelection() {
        const selectedCount = getSelectedSpecialistIds().length;

        el.specialistSelectedCount.textContent =
            `Đã chọn ${selectedCount} nhân viên`;

        el.specialistSelectedText.textContent = selectedCount > 0
            ? `Đã chọn ${selectedCount} nhân viên chuyên trách`
            : "Chọn nhân viên chuyên trách";

        const visibleOptions = [
            ...el.specialists.querySelectorAll(
                ".pctc-specialist-option"
            )
        ].filter(option => option.style.display !== "none");

        const visibleCheckboxes = visibleOptions
            .map(option => option.querySelector(
                'input[name="maNguoiDungs"]'
            ))
            .filter(Boolean);

        const allVisibleChecked =
            visibleCheckboxes.length > 0 &&
            visibleCheckboxes.every(input => input.checked);

        const selectAllButton = $("#btnSelectAllSpecialists");

        if (selectAllButton) {
            selectAllButton.textContent = allVisibleChecked
                ? "Bỏ chọn tất cả"
                : "Chọn tất cả";
        }
    }

    function toggleSpecialistDropdown(open) {
        el.specialistPanel.hidden = !open;

        el.specialistTrigger.setAttribute(
            "aria-expanded",
            String(open)
        );

        if (open) {
            el.specialistSearch.focus();
        }
    }

    function renderSpecialists() {
        if (specialists.length === 0) {
            el.specialists.innerHTML = `
                <span class="pctc-empty">
                    Không có nhân viên chuyên trách.
                </span>
            `;
            updateSpecialistSelection();
            return;
        }

        el.specialists.innerHTML = specialists.map(item => {
            const id = item.maNguoiDung;
            const name = item.hoTen || "Chưa cập nhật họ tên";
            const username = item.tenDangNhap || "";
            const email = item.email || "";

            return `
                <label class="pctc-specialist-option">
                    <input
                        type="checkbox"
                        name="maNguoiDungs"
                        value="${escapeHTML(id)}"
                    >

                    <span class="pctc-specialist-info">
                        <strong>${escapeHTML(name)}</strong>
                        <small>
                            ${escapeHTML(username)}
                            ${email ? ` · ${escapeHTML(email)}` : ""}
                        </small>
                    </span>
                </label>
            `;
        }).join("");

        updateSpecialistSelection();
    }

    async function loadSpecialists() {
        el.specialists.innerHTML = `
            <span class="pctc-loading">
                Đang tải danh sách nhân viên...
            </span>
        `;

        const result = await apiRequest(API.account);

        specialists = Array.isArray(result)
            ? result
            : Array.isArray(result?.data)
                ? result.data
                : [];

        renderSpecialists();
    }

    function filterSpecialists() {
        const keyword = el.specialistSearch.value
            .trim()
            .toLowerCase();

        const options = el.specialists.querySelectorAll(
            ".pctc-specialist-option"
        );

        options.forEach(option => {
            const text = option.textContent.toLowerCase();

            option.style.display = text.includes(keyword)
                ? ""
                : "none";
        });

        updateSpecialistSelection();
    }

    function toggleSelectAllSpecialists() {
        const visibleOptions = [
            ...el.specialists.querySelectorAll(
                ".pctc-specialist-option"
            )
        ].filter(option => option.style.display !== "none");

        const checkboxes = visibleOptions
            .map(option => option.querySelector(
                'input[name="maNguoiDungs"]'
            ))
            .filter(Boolean);

        const shouldCheck = !checkboxes.every(
            checkbox => checkbox.checked
        );

        checkboxes.forEach(checkbox => {
            checkbox.checked = shouldCheck;
        });

        updateSpecialistSelection();
    }

    function clearSelectedSpecialists() {
        el.specialists.querySelectorAll(
            'input[name="maNguoiDungs"]'
        ).forEach(checkbox => {
            checkbox.checked = false;
        });

        updateSpecialistSelection();
    }

    function resetSpecialistDropdown() {
        clearSelectedSpecialists();

        el.specialistSearch.value = "";
        filterSpecialists();

        toggleSpecialistDropdown(false);
    }
        // ========================================
        // DROPDOWN CHỌN NHIỀU NHÂN VIÊN
        // ========================================

        function getSelectedSpecialistIds() {
            return [
                ...el.specialists.querySelectorAll(
                    'input[name="maNguoiDungs"]:checked'
                )
            ].map(input => Number(input.value));
        }

        function updateSpecialistSelection() {
            const selectedCount = getSelectedSpecialistIds().length;

            el.specialistSelectedCount.textContent =
                `Đã chọn ${selectedCount} nhân viên`;

            el.specialistSelectedText.textContent = selectedCount > 0
                ? `Đã chọn ${selectedCount} nhân viên chuyên trách`
                : "Chọn nhân viên chuyên trách";

            const visibleOptions = [
                ...el.specialists.querySelectorAll(
                    ".pctc-specialist-option"
                )
            ].filter(option => option.style.display !== "none");

            const visibleCheckboxes = visibleOptions
                .map(option => option.querySelector(
                    'input[name="maNguoiDungs"]'
                ))
                .filter(Boolean);

            const allVisibleChecked =
                visibleCheckboxes.length > 0 &&
                visibleCheckboxes.every(input => input.checked);

            const selectAllButton = $("#btnSelectAllSpecialists");

            if (selectAllButton) {
                selectAllButton.textContent = allVisibleChecked
                    ? "Bỏ chọn tất cả"
                    : "Chọn tất cả";
            }
        }

        function toggleSpecialistDropdown(open) {
            el.specialistPanel.hidden = !open;

            el.specialistTrigger.setAttribute(
                "aria-expanded",
                String(open)
            );

            if (open) {
                el.specialistSearch.focus();
            }
        }

        function renderSpecialists() {
            if (specialists.length === 0) {
                el.specialists.innerHTML = `
                    <span class="pctc-loading">
                        Không có nhân viên chuyên trách đang hoạt động.
                    </span>
                `;

                updateSpecialistSelection();
                return;
            }

            el.specialists.innerHTML = specialists.map(item => `
                <label class="pctc-specialist-option">
                    <input
                        type="checkbox"
                        name="maNguoiDungs"
                        value="${escapeHTML(item.maNguoiDung)}">

                    <span>
                        ${escapeHTML(item.hoTen || "Nhân viên chuyên trách")}
                        <small>
                            (Mã: ${escapeHTML(item.maNguoiDung)})
                        </small>
                    </span>
                </label>
            `).join("");

            updateSpecialistSelection();
        }

        async function loadSpecialists() {
            const data = await apiRequest(API.account);

            specialists = Array.isArray(data)
                ? data
                : Array.isArray(data?.data)
                    ? data.data
                    : [];

            renderSpecialists();
        }

        function filterSpecialists() {
            const keyword = el.specialistSearch.value
                .trim()
                .toLocaleLowerCase("vi-VN");

            el.specialists
                .querySelectorAll(".pctc-specialist-option")
                .forEach(option => {
                    const text = option.textContent
                        .toLocaleLowerCase("vi-VN");

                    option.style.display = text.includes(keyword)
                        ? "flex"
                        : "none";
                });

            updateSpecialistSelection();
        }

        function toggleSelectAllSpecialists() {
            const visibleCheckboxes = [
                ...el.specialists.querySelectorAll(
                    ".pctc-specialist-option"
                )
            ]
                .filter(option => option.style.display !== "none")
                .map(option => option.querySelector(
                    'input[name="maNguoiDungs"]'
                ))
                .filter(Boolean);

            const allChecked =
                visibleCheckboxes.length > 0 &&
                visibleCheckboxes.every(input => input.checked);

            visibleCheckboxes.forEach(input => {
                input.checked = !allChecked;
            });

            updateSpecialistSelection();
        }

        function clearSelectedSpecialists() {
            el.specialists
                .querySelectorAll('input[name="maNguoiDungs"]')
                .forEach(input => {
                    input.checked = false;
                });

            updateSpecialistSelection();
        }

        function resetSpecialistDropdown() {
            el.specialistSearch.value = "";

            el.specialists
                .querySelectorAll('input[name="maNguoiDungs"]')
                .forEach(input => {
                    input.checked = false;
                });

            el.specialists
                .querySelectorAll(".pctc-specialist-option")
                .forEach(option => {
                    option.style.display = "flex";
                });

            toggleSpecialistDropdown(false);
            updateSpecialistSelection();
        }

        // ========================================
        // TẢI DANH SÁCH PHÂN CÔNG
        // ========================================

        async function loadAssignments() {
            el.body.innerHTML = `
                <tr>
                    <td colspan="8">Đang tải dữ liệu...</td>
                </tr>
            `;

            const data = await apiRequest(API.list);

            assignments = Array.isArray(data)
                ? data
                : Array.isArray(data?.data)
                    ? data.data
                    : [];

            currentPage = 1;
            hideMessage(el.page);
            renderAssignments();
        }

        // ========================================
        // LỌC DỮ LIỆU
        // ========================================

        function getFilteredAssignments() {
            const keyword = el.search.value
                .trim()
                .toLocaleLowerCase("vi-VN");

            return assignments.filter(item => {
                const date = getWorkDate(item);
                const status = getStatus(item);

                const searchable = [
                    getAssignmentId(item),
                    item.maNguoiDung,
                    date,
                    item.tenNhanVien,
                    item.tenNguoiPhanCong,
                    item.ghiChu
                ]
                    .join(" ")
                    .toLocaleLowerCase("vi-VN");

                if (keyword && !searchable.includes(keyword)) {
                    return false;
                }

                if (el.from.value && date < el.from.value) {
                    return false;
                }

                if (el.to.value && date > el.to.value) {
                    return false;
                }

                if (
                    el.status.value &&
                    status.key !== el.status.value
                ) {
                    return false;
                }

                return true;
            });
        }

        // ========================================
        // THỐNG KÊ
        // ========================================

        function updateStatistics() {
            el.total.textContent = assignments.length;

            el.active.textContent = assignments.filter(item =>
                getStatus(item).key === "active"
            ).length;

            el.upcoming.textContent = assignments.filter(item =>
                getStatus(item).key === "upcoming"
            ).length;
        }

        // ========================================
        // HIỂN THỊ BẢNG
        // ========================================

        function renderPagination(totalItems) {
            const totalPages = Math.ceil(totalItems / PAGE_SIZE);
            if (!el.pagination) return;

            if (totalPages <= 1) {
                el.pagination.innerHTML = "";
                return;
            }

            const createButton = (label, page, options = {}) => `
                <button type="button"
                        class="pagination-button${options.active ? " active" : ""}"
                        data-page="${page}"
                        ${options.disabled ? "disabled" : ""}
                        ${options.active ? 'aria-current="page"' : ""}
                        aria-label="${escapeHTML(options.ariaLabel || label)}">
                    ${label}
                </button>
            `;

            let pages;
            if (totalPages <= 5) {
                pages = Array.from({ length: totalPages }, (_, index) => index + 1);
            } else if (currentPage <= 3) {
                pages = [1, 2, 3, 4, "…", totalPages];
            } else if (currentPage >= totalPages - 2) {
                pages = [1, "…", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
            } else {
                pages = [1, "…", currentPage - 1, currentPage, currentPage + 1, "…", totalPages];
            }

            el.pagination.innerHTML = `
                ${createButton("‹", currentPage - 1, {
                    disabled: currentPage === 1,
                    ariaLabel: "Trang trước"
                })}
                ${pages.map(page => page === "…"
                    ? '<span class="pagination-ellipsis">…</span>'
                    : createButton(page, page, {
                        active: page === currentPage,
                        ariaLabel: `Trang ${page}`
                    })
                ).join("")}
                ${createButton("›", currentPage + 1, {
                    disabled: currentPage === totalPages,
                    ariaLabel: "Trang sau"
                })}
            `;
        }

        function renderAssignments() {
            updateStatistics();

            const filtered = getFilteredAssignments();
            const totalItems = filtered.length;
            const totalPages = Math.ceil(totalItems / PAGE_SIZE);

            if (totalItems === 0) {
                currentPage = 1;
                el.body.innerHTML = `
                    <tr>
                        <td colspan="8">Không tìm thấy lịch phân công phù hợp.</td>
                    </tr>
                `;
                el.summary.textContent = "Hiển thị 0 trong tổng số 0 lịch phân công";
                renderPagination(0);
                return;
            }

            currentPage = Math.max(1, Math.min(currentPage, totalPages));

            const startIndex = (currentPage - 1) * PAGE_SIZE;
            const endIndex = Math.min(startIndex + PAGE_SIZE, totalItems);
            const pageItems = filtered.slice(startIndex, endIndex);

            el.body.innerHTML = pageItems.map((item, index) => {
                const status = getStatus(item);
                const assignmentId = getAssignmentId(item);

                return `
                    <tr>
                        <td>${startIndex + index + 1}</td>
                        <td>
                            <span class="pctc-person">
                                ${escapeHTML(formatDate(getWorkDate(item)))}
                            </span>
                            <span class="pctc-sub">
                                Mã lịch: ${escapeHTML(assignmentId || "—")}
                            </span>
                        </td>
                        <td>
                            <span class="pctc-person">
                                ${escapeHTML(item.tenNhanVien || "Chuyên trách")}
                            </span>
                            <span class="pctc-sub">
                                Mã tài khoản: ${escapeHTML(item.maNguoiDung ?? "—")}
                            </span>
                        </td>
                        <td>${escapeHTML(formatTime(item.gioBatDau))}</td>
                        <td>${escapeHTML(formatTime(item.gioKetThuc))}</td>
                        <td>${escapeHTML(item.tenNguoiPhanCong || "—")}</td>
                        <td>
                            <span class="pctc-status pctc-status-${status.key}">
                                ${escapeHTML(status.label)}
                            </span>
                        </td>
                        <td>
                            <button type="button"
                                    class="pctc-row-action"
                                    data-detail="${escapeHTML(assignmentId)}">
                                Chi tiết
                            </button>
                        </td>
                    </tr>
                `;
            }).join("");

            el.summary.textContent =
                `Hiển thị ${startIndex + 1}–${endIndex} trong tổng số ${totalItems} lịch phân công`;

            renderPagination(totalItems);
        }

        // ========================================
        // MODAL TẠO PHÂN CÔNG
        // ========================================

        function openCreateModal() {
            hideMessage(el.formMsg);

            el.form.reset();

            el.start.value = "07:00";
            el.end.value = "11:30";

            el.date.min = getTodayString();
            el.date.value = getTodayString();

            resetSpecialistDropdown();

            el.modal.classList.add("is-open");
            el.modal.setAttribute("aria-hidden", "false");

            document.body.style.overflow = "hidden";
        }

        function closeCreateModal(force = false) {
            if (isSubmitting && !force) return;

            el.modal.classList.remove("is-open");
            el.modal.setAttribute("aria-hidden", "true");

            document.body.style.overflow = "";
        }

        // ========================================
        // MODAL CHI TIẾT
        // ========================================

        function openDetailModal(id) {
            const item = assignments.find(
                x => String(getAssignmentId(x)) === String(id)
            );

            if (!item) return;

            const status = getStatus(item);

            const fields = [
                ["Mã lịch phân công", getAssignmentId(item) || "—"],
                ["Ngày làm việc", formatDate(getWorkDate(item))],
                ["Nhân viên", item.tenNhanVien || "Chuyên trách"],
                ["Mã tài khoản", item.maNguoiDung ?? "—"],
                ["Giờ bắt đầu", formatTime(item.gioBatDau)],
                ["Giờ kết thúc", formatTime(item.gioKetThuc)],
                ["Người phân công", item.tenNguoiPhanCong || "—"],
                ["Trạng thái", status.label],
                ["Ghi chú", item.ghiChu || "Không có"]
            ];

            el.detailContent.innerHTML = `
                <div class="pctc-detail-grid">
                    ${fields.map(([label, value]) => `
                        <div class="pctc-detail-item">
                            <small>${escapeHTML(label)}</small>
                            <strong>${escapeHTML(value)}</strong>
                        </div>
                    `).join("")}
                </div>
            `;

            el.detail.classList.add("is-open");
            el.detail.setAttribute("aria-hidden", "false");

            document.body.style.overflow = "hidden";
        }

        function closeDetailModal() {
            el.detail.classList.remove("is-open");
            el.detail.setAttribute("aria-hidden", "true");

            document.body.style.overflow = "";
        }

        // ========================================
        // TẠO PHÂN CÔNG VÀ GỬI THÔNG BÁO
        // ========================================

        async function createAssignment(event) {
            event.preventDefault();

            if (isSubmitting) return;

            hideMessage(el.formMsg);

            if (!el.form.reportValidity()) return;

            const date = el.date.value;
            const start = el.start.value;
            const end = el.end.value;

            if (!date || !start || !end) {
                showMessage(
                    el.formMsg,
                    "Vui lòng nhập đầy đủ ngày và giờ làm việc.",
                    "error"
                );
                return;
            }

            if (date < getTodayString()) {
                showMessage(
                    el.formMsg,
                    "Không thể phân công lịch vào ngày đã qua.",
                    "error"
                );
                return;
            }

            if (end <= start) {
                showMessage(
                    el.formMsg,
                    "Giờ kết thúc phải sau giờ bắt đầu.",
                    "error"
                );
                return;
            }

            const maNguoiDungs = getSelectedSpecialistIds();

            if (maNguoiDungs.length === 0) {
                showMessage(
                    el.formMsg,
                    "Vui lòng chọn ít nhất một nhân viên chuyên trách.",
                    "error"
                );
                return;
            }

            const payload = {
                maNguoiDungs,
                ngayLamViec: date,
                gioBatDau: `${start}:00`,
                gioKetThuc: `${end}:00`,
                ghiChu: el.note.value.trim() || null
            };

            isSubmitting = true;
            el.submit.disabled = true;
            el.submit.textContent = "Đang lưu và gửi...";

            try {
                const result = await apiRequest(API.list, {
                    method: "POST",
                    body: JSON.stringify(payload)
                });

                const successMessage = result?.message ||
                    `Đã phân công thành công cho ${maNguoiDungs.length} nhân viên chuyên trách.`;

                closeCreateModal(true);

                showMessage(
                    el.page,
                    successMessage,
                    "success"
                );

                await loadAssignments();

            } catch (error) {
                showMessage(
                    el.formMsg,
                    error.message || "Không thể tạo lịch phân công.",
                    "error"
                );

            } finally {
                isSubmitting = false;
                el.submit.disabled = false;
                el.submit.textContent = "Lưu và gửi thông báo";
            }
        }

        // ========================================
        // GẮN SỰ KIỆN
        // ========================================

        function bindEvents() {
            $("#btnOpenCreate").addEventListener(
                "click",
                openCreateModal
            );

            $("#btnCloseModal").addEventListener(
                "click",
                closeCreateModal
            );

            $("#btnCancelCreate").addEventListener(
                "click",
                closeCreateModal
            );

            el.modal.querySelector("[data-close-modal]")
                .addEventListener("click", closeCreateModal);

            el.specialistTrigger.addEventListener("click", () => {
                toggleSpecialistDropdown(el.specialistPanel.hidden);
            });

            $("#btnCloseSpecialistDropdown").addEventListener(
                "click",
                () => toggleSpecialistDropdown(false)
            );

            $("#btnSelectAllSpecialists").addEventListener(
                "click",
                toggleSelectAllSpecialists
            );

            $("#btnClearSpecialists").addEventListener(
                "click",
                clearSelectedSpecialists
            );

            el.specialistSearch.addEventListener(
                "input",
                filterSpecialists
            );

            el.specialists.addEventListener("change", event => {
                if (
                    event.target.matches(
                        'input[name="maNguoiDungs"]'
                    )
                ) {
                    updateSpecialistSelection();
                }
            });

            document.addEventListener("click", event => {
                if (
                    !el.specialistDropdown.contains(event.target) &&
                    !el.specialistPanel.hidden
                ) {
                    toggleSpecialistDropdown(false);
                }
            });

            $("#btnCloseDetail").addEventListener(
                "click",
                closeDetailModal
            );

            $("#btnCloseDetailFooter").addEventListener(
                "click",
                closeDetailModal
            );

            el.detail.querySelector("[data-close-detail]")
                .addEventListener("click", closeDetailModal);

            $("#btnRefresh").addEventListener("click", () => {
                loadAssignments().catch(error => {
                    showMessage(el.page, error.message, "error");
                });
            });

            el.pagination.addEventListener("click", event => {
                const button = event.target.closest("[data-page]");
                if (!button || button.disabled) return;

                const nextPage = Number(button.dataset.page);
                if (!Number.isInteger(nextPage) || nextPage < 1) return;

                currentPage = nextPage;
                renderAssignments();
            });

            el.form.addEventListener(
                "submit",
                createAssignment
            );

            [
                el.search,
                el.from,
                el.to,
                el.status
            ].forEach(element => {
                const handleFilterChange = () => {
                    currentPage = 1;
                    renderAssignments();
                };

                element.addEventListener("input", handleFilterChange);
                element.addEventListener("change", handleFilterChange);
            });

            $("#btnResetFilter").addEventListener("click", () => {
                el.search.value = "";
                el.from.value = "";
                el.to.value = "";
                el.status.value = "";
                currentPage = 1;

                renderAssignments();
            });

            el.body.addEventListener("click", event => {
                const button = event.target.closest("[data-detail]");

                if (button) {
                    openDetailModal(button.dataset.detail);
                }
            });

            document.addEventListener("keydown", event => {
                if (event.key !== "Escape") return;

                if (!el.specialistPanel.hidden) {
                    toggleSpecialistDropdown(false);
                    return;
                }

                closeCreateModal();
                closeDetailModal();
            });
        }

        // ========================================
        // KHỞI TẠO
        // ========================================

        async function init() {
            if (!validateElements()) return;

            bindEvents();

            const results = await Promise.allSettled([
                loadSpecialists(),
                loadAssignments()
            ]);

            const failed = results.filter(
                result => result.status === "rejected"
            );

            if (failed.length > 0) {
                const messages = failed.map(result =>
                    result.reason?.message || "Lỗi không xác định"
                );

                showMessage(
                    el.page,
                    `Không tải được đầy đủ dữ liệu: ${messages.join(" | ")}`,
                    "error"
                );

                console.error("Lỗi khởi tạo trang:", failed);
            }
        }

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", init);
        } else {
            init();
        }
})();
