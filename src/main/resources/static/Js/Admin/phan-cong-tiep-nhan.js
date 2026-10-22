
(() => {
    "use strict";

    const API = {
        assignments: "/api/phan-cong-tiep-nhan",
        employees: "/api/phan-cong-tiep-nhan/nhan-vien",
        departments: "/api/phan-cong-tiep-nhan/khoa"
    };

    const $ = (selector) => document.querySelector(selector);

    const elements = {
        tableBody: $("#assignmentTableBody"),
        tableSummary: $("#tableSummary"),
        statTotal: $("#statTotal"),
        statActive: $("#statActive"),
        statUpcoming: $("#statUpcoming"),

        search: $("#filterSearch"),
        filterEmployee: $("#filterEmployee"),
        filterDepartment: $("#filterDepartment"),
        filterStatus: $("#filterStatus"),

        pageMessage: $("#pageMessage"),
        formMessage: $("#formMessage"),

        modal: $("#createModal"),
        form: $("#assignmentForm"),
        employeeId: $("#employeeId"),
        departmentId: $("#departmentId"),
        startTime: $("#startTime"),
        endTime: $("#endTime"),
        submitButton: $("#btnSubmitCreate")
    };

    let assignments = [];
    let employees = [];
    let departments = [];
    let isSubmitting = false;

    // ========================================
    // JWT
    // ========================================
    function getToken() {
        const keys = [
            "Token",        // Key thực tế của ứng dụng
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


    async function apiRequest(url, options = {}) {
        const token = getToken();

        const headers = {
            "Accept": "application/json",
            ...(options.headers || {})
        };

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
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
            throw new Error(
                "Không kết nối được máy chủ. Hãy kiểm tra backend và kết nối mạng."
            );
        }

        if (response.status === 401) {
            throw new Error(
                "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại."
            );
        }

        if (response.status === 403) {
            throw new Error(
                "Bạn không có quyền thực hiện chức năng này. Hãy đăng nhập bằng tài khoản Admin."
            );
        }

        const contentType =
            response.headers.get("content-type") || "";

        let data = null;

        if (contentType.includes("application/json")) {
            data = await response.json();
        } else {
            const text = await response.text();

            if (text) {
                data = text;
            }
        }

        if (!response.ok) {
            const message =
                data && typeof data === "object"
                    ? data.detail || data.message || data.error
                    : data;

            throw new Error(
                message || `Yêu cầu thất bại (${response.status}).`
            );
        }

        return data;
    }

    // ========================================
    // UTILITIES
    // ========================================

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    function toDate(value) {
        if (!value) return null;

        const date = new Date(value);

        return Number.isNaN(date.getTime()) ? null : date;
    }

    function formatDateTime(value) {
        const date = toDate(value);

        if (!date) return "—";

        return new Intl.DateTimeFormat("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        }).format(date);
    }

    function formatDateInput(date) {
        const pad = (value) => String(value).padStart(2, "0");

        return [
            date.getFullYear(),
            "-",
            pad(date.getMonth() + 1),
            "-",
            pad(date.getDate()),
            "T",
            pad(date.getHours()),
            ":",
            pad(date.getMinutes())
        ].join("");
    }

    function showMessage(element, message, type = "info") {
        if (!element) return;

        element.textContent = message;
        element.className = `pct-alert pct-alert-${type}`;
        element.hidden = false;
    }

    function hideMessage(element) {
        if (!element) return;

        element.hidden = true;
        element.textContent = "";
    }

    // ========================================
    // THÔNG BÁO RA MÀN HÌNH
    // ========================================

    function showToast(message, type = "success") {
        let container = document.getElementById("pctToastContainer");

        if (!container) {
            container = document.createElement("div");
            container.id = "pctToastContainer";

            Object.assign(container.style, {
                position: "fixed",
                top: "24px",
                right: "24px",
                zIndex: "99999",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                maxWidth: "min(380px, calc(100vw - 32px))"
            });

            document.body.appendChild(container);
        }

        const toast = document.createElement("div");

        Object.assign(toast.style, {
            padding: "14px 18px",
            borderRadius: "10px",
            background: type === "success" ? "#16a34a" : "#dc2626",
            color: "#ffffff",
            boxShadow: "0 8px 24px rgba(0,0,0,.18)",
            fontSize: "14px",
            fontWeight: "500",
            lineHeight: "1.5",
            opacity: "0",
            transform: "translateX(20px)",
            transition: "opacity .2s ease, transform .2s ease"
        });

        toast.textContent = message;
        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.opacity = "1";
            toast.style.transform = "translateX(0)";
        });

        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateX(20px)";

            setTimeout(() => toast.remove(), 250);
        }, 3500);
    }


    function setSelectOptions(
        select,
        items,
        valueKey,
        labelKey,
        placeholder
    ) {
        select.replaceChildren();

        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = placeholder;
        select.appendChild(defaultOption);

        items.forEach((item) => {
            const option = document.createElement("option");

            option.value = String(item[valueKey]);
            option.textContent = item[labelKey] ?? "";

            select.appendChild(option);
        });
    }

    function getStatus(assignment) {
        const now = Date.now();
        const start = toDate(assignment.thoiGianBatDau);
        const end = toDate(assignment.thoiGianKetThuc);

        if (Number(assignment.trangThai) !== 1) {
            return {
                key: "inactive",
                label: "Ngừng hoạt động"
            };
        }

        if (!start || !end) {
            return {
                key: "inactive",
                label: "Không xác định"
            };
        }

        if (end.getTime() <= now) {
            return {
                key: "ended",
                label: "Đã kết thúc"
            };
        }

        if (start.getTime() > now) {
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
    // LOAD DATA
    // ========================================

    async function loadEmployees() {
        const data = await apiRequest(API.employees);

        employees = Array.isArray(data) ? data : [];

        setSelectOptions(
            elements.employeeId,
            employees,
            "maNguoiDung",
            "hoTen",
            "Chọn nhân viên tiếp nhận"
        );

        setSelectOptions(
            elements.filterEmployee,
            employees,
            "maNguoiDung",
            "hoTen",
            "Tất cả nhân viên"
        );
    }

    async function loadDepartments() {
        const data = await apiRequest(API.departments);

        departments = Array.isArray(data) ? data : [];

        setSelectOptions(
            elements.departmentId,
            departments,
            "maKhoa",
            "tenKhoa",
            "Chọn khoa phụ trách"
        );

        setSelectOptions(
            elements.filterDepartment,
            departments,
            "maKhoa",
            "tenKhoa",
            "Tất cả khoa"
        );
    }

    async function loadAssignments() {
        elements.tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="pct-table-message">
                    Đang tải dữ liệu...
                </td>
            </tr>
        `;

        try {
            const data = await apiRequest(API.assignments);

            assignments = Array.isArray(data) ? data : [];

            hideMessage(elements.pageMessage);
            renderAssignments();
        } catch (error) {
            elements.tableBody.innerHTML = `
                <tr>
                    <td colspan="7"
                        class="pct-table-message pct-error-text">
                        ${escapeHTML(error.message)}
                    </td>
                </tr>
            `;

            elements.tableSummary.textContent =
                "Không tải được danh sách phân công.";

            showMessage(
                elements.pageMessage,
                error.message,
                "error"
            );
        }
    }

    // ========================================
    // RENDER TABLE AND STATISTICS
    // ========================================

    function updateStatistics() {
        const now = Date.now();

        elements.statTotal.textContent = assignments.length;

        elements.statActive.textContent = assignments.filter((item) => {
            const status = getStatus(item);
            return status.key === "active";
        }).length;

        elements.statUpcoming.textContent = assignments.filter((item) => {
            const start = toDate(item.thoiGianBatDau);
            const end = toDate(item.thoiGianKetThuc);

            return Number(item.trangThai) === 1
                && start
                && end
                && start.getTime() > now
                && end.getTime() > now;
        }).length;
    }

    function getFilteredAssignments() {
        const keyword = elements.search.value
            .trim()
            .toLocaleLowerCase("vi-VN");

        const employeeId = elements.filterEmployee.value;
        const departmentId = elements.filterDepartment.value;
        const statusFilter = elements.filterStatus.value;

        return assignments.filter((item) => {
            const status = getStatus(item);

            const searchableText = [
                item.maPhanCong,
                item.tenNhanVien,
                item.tenKhoa,
                item.tenNguoiPhanCong
            ].join(" ").toLocaleLowerCase("vi-VN");

            if (keyword && !searchableText.includes(keyword)) {
                return false;
            }

            if (
                employeeId
                && String(item.maNhanVienTiepNhan) !== employeeId
            ) {
                return false;
            }

            if (
                departmentId
                && String(item.maKhoa) !== departmentId
            ) {
                return false;
            }

            if (statusFilter && status.key !== statusFilter) {
                return false;
            }

            return true;
        });
    }

    // ====================================
    // STT
    // ====================================

    function renderAssignments() {
        updateStatistics();

        const filtered = getFilteredAssignments();

        if (filtered.length === 0) {
            elements.tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="pct-table-message">
                        Không tìm thấy phân công phù hợp.
                    </td>
                </tr>
            `;

            elements.tableSummary.textContent =
                `Hiển thị 0/${assignments.length} phân công`;

            return;
        }

        elements.tableBody.innerHTML = filtered.map((item, index) => {
            const status = getStatus(item);

            return `
                <tr>
                    <td>${index + 1}</td>

                    <td>
                        <span class="pct-person-name">
                            ${escapeHTML(item.tenNhanVien)}
                        </span>
                        <span class="pct-subtext">
                            Mã NV: ${escapeHTML(item.maNhanVienTiepNhan)}
                        </span>
                    </td>

                    <td>
                        <span class="pct-person-name">
                            ${escapeHTML(item.tenKhoa)}
                        </span>
                        <span class="pct-subtext">
                            Mã khoa: ${escapeHTML(item.maKhoa)}
                        </span>
                    </td>

                    <td>${escapeHTML(
                        formatDateTime(item.thoiGianBatDau)
                    )}</td>

                    <td>${escapeHTML(
                        formatDateTime(item.thoiGianKetThuc)
                    )}</td>

                    <td>
                        <span class="pct-person-name">
                            ${escapeHTML(item.tenNguoiPhanCong)}
                        </span>
                        <span class="pct-subtext">
                            Mã Admin: ${escapeHTML(item.maNguoiPhanCong)}
                        </span>
                    </td>

                    <td>
                        <span class="pct-status pct-status-${status.key}">
                            ${escapeHTML(status.label)}
                        </span>
                    </td>
                </tr>
            `;
        }).join("");

        elements.tableSummary.textContent =
            `Hiển thị ${filtered.length}/${assignments.length} phân công`;
    }


    // ========================================
    // MODAL
    // ========================================

    function openModal() {
        hideMessage(elements.formMessage);

        elements.modal.classList.add("is-open");
        elements.modal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";

        elements.employeeId.focus();
    }

    function closeModal() {
        if (isSubmitting) return;

        elements.modal.classList.remove("is-open");
        elements.modal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";

        elements.form.reset();
        hideMessage(elements.formMessage);
    }

    function setSubmitting(value) {
        isSubmitting = value;
        elements.submitButton.disabled = value;
        elements.submitButton.textContent = value
            ? "Đang lưu..."
            : "Lưu phân công";
    }

    // ========================================
    // CREATE ASSIGNMENT
    // ========================================

    async function createAssignment(event) {
        event.preventDefault();

        if (isSubmitting) return;

        hideMessage(elements.formMessage);

        if (!elements.form.reportValidity()) return;

        const startValue = elements.startTime.value;
        const endValue = elements.endTime.value;

        if (!startValue || !endValue) {
            showMessage(
                elements.formMessage,
                "Vui lòng nhập đầy đủ thời gian bắt đầu và kết thúc.",
                "error"
            );
            return;
        }

        const start = new Date(startValue);
        const end = new Date(endValue);

        if (
            Number.isNaN(start.getTime())
            || Number.isNaN(end.getTime())
            || end.getTime() <= start.getTime()
        ) {
            showMessage(
                elements.formMessage,
                "Thời gian kết thúc phải sau thời gian bắt đầu.",
                "error"
            );
            return;
        }

        const payload = {
            maNhanVienTiepNhan: Number(elements.employeeId.value),
            maKhoa: Number(elements.departmentId.value),
            thoiGianBatDau: startValue + ":00",
            thoiGianKetThuc: endValue + ":00"
        };

        setSubmitting(true);

        try {
            await apiRequest(API.assignments, {
                method: "POST",
                body: JSON.stringify(payload)
            });

            elements.modal.classList.remove("is-open");
            elements.modal.setAttribute("aria-hidden", "true");
            document.body.style.overflow = "";
            elements.form.reset();

            showToast("Tạo phân công tiếp nhận thành công!", "success");

            showMessage(
                elements.pageMessage,
                "Tạo phân công thành công.",
                "success"
            );

            await loadAssignments();
        } catch (error) {
            showMessage(
                elements.formMessage,
                error.message,
                "error"
            );
        } finally {
            setSubmitting(false);
        }
    }

    // ========================================
    // EVENTS
    // ========================================

    function bindEvents() {
        $("#btnOpenCreate").addEventListener("click", openModal);
        $("#btnCloseModal").addEventListener("click", closeModal);
        $("#btnCancelCreate").addEventListener("click", closeModal);
        $("#btnRefresh").addEventListener("click", loadAssignments);

        elements.modal
            .querySelectorAll("[data-close-modal]")
            .forEach((element) => {
                element.addEventListener("click", closeModal);
            });

        elements.form.addEventListener("submit", createAssignment);

        [
            elements.search,
            elements.filterEmployee,
            elements.filterDepartment,
            elements.filterStatus
        ].forEach((element) => {
            element.addEventListener("input", renderAssignments);
            element.addEventListener("change", renderAssignments);
        });

        $("#btnResetFilter").addEventListener("click", () => {
            elements.search.value = "";
            elements.filterEmployee.value = "";
            elements.filterDepartment.value = "";
            elements.filterStatus.value = "";

            renderAssignments();
        });

        elements.startTime.addEventListener("change", () => {
            elements.endTime.min = elements.startTime.value;
        });

        elements.endTime.addEventListener("change", () => {
            elements.startTime.max = elements.endTime.value;
        });

        document.addEventListener("keydown", (event) => {
            if (
                event.key === "Escape"
                && elements.modal.classList.contains("is-open")
            ) {
                closeModal();
            }
        });
    }

    // ========================================
    // INITIALIZE
    // ========================================

    async function init() {
        bindEvents();

        // Gợi ý mặc định là giờ hiện tại và một giờ sau.
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

        elements.startTime.value = formatDateInput(now);
        elements.endTime.value = formatDateInput(oneHourLater);

        elements.startTime.min = formatDateInput(now);
        elements.endTime.min = formatDateInput(now);

        const results = await Promise.allSettled([
            loadEmployees(),
            loadDepartments(),
            loadAssignments()
        ]);

        const failed = results.filter(
            (result) => result.status === "rejected"
        );

        if (failed.length > 0) {
            showMessage(
                elements.pageMessage,
                "Một số danh sách chưa tải được. Hãy kiểm tra JWT, quyền Admin và các API backend.",
                "error"
            );
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
