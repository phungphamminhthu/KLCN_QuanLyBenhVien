(() => {
    "use strict";

    const API_URL = "/api/thong-ke-bao-cao";
    const EXPORT_URL = `${API_URL}/export`;

    const $ = (id) => document.getElementById(id);

    // =====================================================
    // DOM ELEMENTS
    // =====================================================

    const filterType = $("filterType");
    const reportDate = $("reportDate");
    const fromDate = $("fromDate");
    const toDate = $("toDate");
    const khoaSelect = $("khoaSelect");

    const singleDateGroup = $("singleDateGroup");
    const fromDateGroup = $("fromDateGroup");
    const toDateGroup = $("toDateGroup");

    const btnFilter = $("btnFilter");
    const btnExport = $("btnExport");

    let isLoading = false;
    let isExporting = false;


    function renderDanhSachKhoa(danhSachKhoa = []) {
        if (!khoaSelect) return;

        // Giữ lại khoa đang chọn
        const selectedMaKhoa = khoaSelect.value;

        khoaSelect.innerHTML = `
            <option value="">Tất cả khoa</option>
        `;

        danhSachKhoa.forEach(khoa => {
            const option = document.createElement("option");
            option.value = khoa.maKhoa;
            option.textContent = khoa.tenKhoa;
            khoaSelect.appendChild(option);
        });

        // Khôi phục khoa đã chọn nếu còn trong danh sách
        if (
            selectedMaKhoa &&
            [...khoaSelect.options].some(
                option => option.value === selectedMaKhoa
            )
        ) {
            khoaSelect.value = selectedMaKhoa;
        }
    }
    if (khoaSelect) {
        khoaSelect.addEventListener("change", () => {
            loadReport();
        });
    }

    // =====================================================
    // HELPERS
    // =====================================================

    function getTodayString() {
        const now = new Date();

        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function getToken() {
        return localStorage.getItem("Token")
            || sessionStorage.getItem("Token")
            || "";
    }

    function formatDate(value) {
        if (!value) return "—";

        const text = String(value);

        // YYYY-MM-DD -> DD/MM/YYYY
        const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);

        if (match) {
            return `${match[3]}/${match[2]}/${match[1]}`;
        }

        // Backend có thể trả sẵn DD/MM hoặc DD/MM/YYYY
        return text;
    }

    function formatNumber(value) {
        const number = Number(value ?? 0);

        return Number.isFinite(number)
            ? number.toLocaleString("vi-VN")
            : "0";
    }

    function formatCurrency(value) {
        return `${formatNumber(value)} đ`;
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function getValue(object, keys, fallback = 0) {
        if (!object) return fallback;

        for (const key of keys) {
            if (object[key] !== undefined && object[key] !== null) {
                return object[key];
            }
        }

        return fallback;
    }

    function getArray(data, keys) {
        const value = getValue(data, keys, []);
        return Array.isArray(value) ? value : [];
    }

    function setText(id, value) {
        const element = $(id);

        if (element) {
            element.textContent = value;
        }
    }

    function showTableMessage(element, colspan, message) {
        if (!element) return;

        element.innerHTML = `
            <tr>
                <td colspan="${colspan}" class="empty-state">
                    ${escapeHtml(message)}
                </td>
            </tr>
        `;
    }

    function setButtonLoading(button, loading, loadingText, normalText) {
        if (!button) return;

        button.disabled = loading;
        button.textContent = loading ? loadingText : normalText;
    }

    // =====================================================
    // DATE FILTER
    // =====================================================

    function toggleDateFilter() {
        const isRange = filterType.value === "range";

        if (singleDateGroup) {
            singleDateGroup.hidden = isRange;
        }

        if (fromDateGroup) {
            fromDateGroup.hidden = !isRange;
        }

        if (toDateGroup) {
            toDateGroup.hidden = !isRange;
        }
    }

    function getSelectedDates() {
        if (filterType.value === "range") {
            return {
                from: fromDate.value,
                to: toDate.value
            };
        }

        return {
            from: reportDate.value,
            to: reportDate.value
        };
    }

    function validateDates(from, to) {
        if (!from || !to) {
            alert(
                filterType.value === "range"
                    ? "Vui lòng chọn đầy đủ từ ngày và đến ngày."
                    : "Vui lòng chọn ngày thống kê."
            );

            return false;
        }

        if (from > to) {
            alert("Từ ngày không được lớn hơn đến ngày.");
            return false;
        }

        return true;
    }

    // =====================================================
    // BUILD API PARAMS
    // =====================================================

    function buildParams() {
        const { from, to } = getSelectedDates();

        if (!validateDates(from, to)) {
            return null;
        }

        const params = new URLSearchParams();

        // Theo ngày: dùng ngày do người dùng chọn
        if (filterType.value === "day") {
            params.set("period", "custom");
            params.set("date", from);
        }

        // Theo khoảng thời gian
        else {
            params.set("period", "custom");
            params.set("fromDate", from);
            params.set("toDate", to);
        }

        // Lọc theo khoa nếu có chọn
        if (khoaSelect && khoaSelect.value) {
            params.set("maKhoa", khoaSelect.value);
        }

        return params;
    }

    function updatePeriodText(from, to) {
        const periodText = from === to
            ? `ngày ${formatDate(from)}`
            : `từ ${formatDate(from)} đến ${formatDate(to)}`;

        setText(
            "reportPeriodText",
            from === to
                ? `Thống kê ${periodText}`
                : `Thống kê ${periodText}`
        );

        setText(
            "luotKhamDescription",
            `Tổng lượt khám ${periodText}`
        );

        setText(
            "doanhThuDescription",
            `Tổng tiền đã thanh toán ${periodText}`
        );
    }

    // =====================================================
    // API REQUEST
    // =====================================================

    async function requestJson(url) {
        const token = getToken();

        if (!token) {
            throw new Error(
                "Không tìm thấy token đăng nhập. Vui lòng đăng nhập lại."
            );
        }

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "Authorization": `Bearer ${token}`
            },
            credentials: "same-origin"
        });

        const responseText = await response.text();

        if (!response.ok) {
            console.error(
                "API thống kê lỗi:",
                response.status,
                responseText
            );

            throw new Error(
                `HTTP ${response.status}: ${responseText || response.statusText}`
            );
        }

        try {
            return responseText ? JSON.parse(responseText) : {};
        } catch {
            throw new Error("Dữ liệu API trả về không phải JSON hợp lệ.");
        }
    }

    // =====================================================
    // SUMMARY CARDS
    // =====================================================

    function renderSummary(data) {
        setText(
            "tongLuotKham",
            formatNumber(
                getValue(data, [
                    "tongLuotKham",
                    "totalAppointments",
                    "tongLichKham",
                    "total"
                ])
            )
        );

        setText(
            "tongDoanhThu",
            formatCurrency(
                getValue(data, [
                    "tongDoanhThu",
                    "totalRevenue",
                    "doanhThu"
                ])
            )
        );

        setText(
            "tongBenhNhan",
            formatNumber(
                getValue(data, [
                    "tongBenhNhan",
                    "totalPatients",
                    "soBenhNhan"
                ])
            )
        );
    }

    // =====================================================
    // APPOINTMENT REPORT
    // =====================================================

    const appointmentKeys = {
        total: [
            "tongLuotKham",
            "luotKham",
            "total",
            "tong"
        ],
        completed: [
            "hoanThanh",
            "soLuotHoanThanh",
            "completed"
        ],
        inProgress: [
            "dangKham",
            "soLuotDangKham",
            "inProgress"
        ],
        cancelled: [
            "daHuy",
            "soLuotDaHuy",
            "cancelled"
        ],
        noShow: [
            "khongDen",
            "soLuotKhongDen",
            "noShow"
        ]
    };

    function sumRows(rows, keys) {
        return rows.reduce((sum, row) => {
            return sum + Number(getValue(row, keys, 0));
        }, 0);
    }

    function renderAppointmentReport(data) {
        const body = $("appointmentReportBody");

        const rows = getArray(data, [
            "luotKhamTheoNgay",
            "appointmentReport",
            "appointmentsByDate"
        ]);

        if (!rows.length) {
            showTableMessage(body, 6, "Không có dữ liệu");
        } else {
            body.innerHTML = rows.map((row) => {
                const date = getValue(row, [
                    "ngay",
                    "ngayKham",
                    "date",
                    "label"
                ], "");

                return `
                    <tr>
                        <td>${escapeHtml(formatDate(date))}</td>
                        <td>${formatNumber(getValue(row, appointmentKeys.total))}</td>
                        <td>${formatNumber(getValue(row, appointmentKeys.completed))}</td>
                        <td>${formatNumber(getValue(row, appointmentKeys.inProgress))}</td>
                        <td>${formatNumber(getValue(row, appointmentKeys.cancelled))}</td>
                        <td>${formatNumber(getValue(row, appointmentKeys.noShow))}</td>
                    </tr>
                `;
            }).join("");
        }

        setText(
            "appointmentTotal",
            formatNumber(sumRows(rows, appointmentKeys.total))
        );

        setText(
            "appointmentCompleted",
            formatNumber(sumRows(rows, appointmentKeys.completed))
        );

        setText(
            "appointmentInProgress",
            formatNumber(sumRows(rows, appointmentKeys.inProgress))
        );

        setText(
            "appointmentCancelled",
            formatNumber(sumRows(rows, appointmentKeys.cancelled))
        );

        setText(
            "appointmentNoShow",
            formatNumber(sumRows(rows, appointmentKeys.noShow))
        );
    }

    // =====================================================
    // REVENUE REPORT
    // =====================================================

    const revenueKeys = {
        examination: [
            "tienKham",
            "doanhThuKham",
            "revenueExamination"
        ],
        medicine: [
            "tienThuoc",
            "doanhThuThuoc",
            "revenueMedicine"
        ],
        service: [
            "tienDichVu",
            "doanhThuDichVu",
            "revenueService"
        ],
        total: [
            "tongDoanhThu",
            "doanhThu",
            "tongTien",
            "total"
        ]
    };

    function renderRevenueReport(data) {
        const body = $("revenueReportBody");

        const rows = getArray(data, [
            "doanhThuTheoNgay",
            "revenueReport",
            "revenueByDate"
        ]);

        if (!rows.length) {
            showTableMessage(body, 5, "Không có dữ liệu");
        } else {
            body.innerHTML = rows.map((row) => {
                const date = getValue(row, [
                    "ngay",
                    "ngayThanhToan",
                    "date",
                    "label"
                ], "");

                const examination = Number(
                    getValue(row, revenueKeys.examination, 0)
                );

                const medicine = Number(
                    getValue(row, revenueKeys.medicine, 0)
                );

                const service = Number(
                    getValue(row, revenueKeys.service, 0)
                );

                const total = Number(
                    getValue(
                        row,
                        revenueKeys.total,
                        examination + medicine + service
                    )
                );

                return `
                    <tr>
                        <td>${escapeHtml(formatDate(date))}</td>
                        <td>${formatCurrency(examination)}</td>
                        <td>${formatCurrency(medicine)}</td>
                        <td>${formatCurrency(service)}</td>
                        <td>${formatCurrency(total)}</td>
                    </tr>
                `;
            }).join("");
        }

        setText(
            "revenueExaminationTotal",
            formatCurrency(sumRows(rows, revenueKeys.examination))
        );

        setText(
            "revenueMedicineTotal",
            formatCurrency(sumRows(rows, revenueKeys.medicine))
        );

        setText(
            "revenueServiceTotal",
            formatCurrency(sumRows(rows, revenueKeys.service))
        );

        setText(
            "revenueGrandTotal",
            formatCurrency(sumRows(rows, revenueKeys.total))
        );
    }

    // =====================================================
    // DEPARTMENT REPORT
    // =====================================================

    function renderDepartmentReport(data) {
        const body = $("departmentReportBody");

        const rows = getArray(data, [
            "thongKeTheoKhoa",
            "baoCaoTheoKhoa",
            "departmentReport",
            "departments"
        ]);

        if (!rows.length) {
            showTableMessage(body, 5, "Không có dữ liệu");
            return;
        }

        body.innerHTML = rows.map((row, index) => {
            const name = getValue(row, [
                "tenKhoa",
                "khoa",
                "tenPhong",
                "departmentName"
            ], "Chưa xác định");

            const patients = getValue(row, [
                "soBenhNhan",
                "tongBenhNhan",
                "patients",
                "totalPatients"
            ]);

            const appointments = getValue(row, [
                "tongLuotKham",
                "luotKham",
                "appointments",
                "totalAppointments"
            ]);

            const revenue = getValue(row, [
                "tongDoanhThu",
                "doanhThu",
                "revenue"
            ]);

            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${escapeHtml(name)}</td>
                    <td>${formatNumber(patients)}</td>
                    <td>${formatNumber(appointments)}</td>
                    <td>${formatCurrency(revenue)}</td>
                </tr>
            `;
        }).join("");
    }

    // =====================================================
    // LOAD REPORT
    // =====================================================

    async function loadReport() {
        if (isLoading || isExporting) return;

        const { from, to } = getSelectedDates();

        if (!validateDates(from, to)) return;

        const params = buildParams();

        if (!params) return;

        isLoading = true;

        setButtonLoading(
            btnFilter,
            true,
            "Đang tải...",
            "Thống kê"
        );

        try {
            const url = `${API_URL}?${params.toString()}`;

            console.log("Request thống kê:", url);

            const data = await requestJson(url);

            console.log("Response thống kê:", data);

            if (Array.isArray(data.danhSachKhoa)) {
                renderDanhSachKhoa(data.danhSachKhoa);
            }

            renderSummary(data);
            renderAppointmentReport(data);
            renderRevenueReport(data);
            renderDepartmentReport(data);

            updatePeriodText(from, to);

        } catch (error) {
            console.error("Lỗi thống kê:", error);

            setText("tongLuotKham", "—");
            setText("tongDoanhThu", "—");
            setText("tongBenhNhan", "—");

            showTableMessage(
                $("appointmentReportBody"),
                6,
                "Không thể tải dữ liệu lượt khám"
            );

            showTableMessage(
                $("revenueReportBody"),
                5,
                "Không thể tải dữ liệu doanh thu"
            );

            showTableMessage(
                $("departmentReportBody"),
                5,
                "Không thể tải dữ liệu theo khoa"
            );

            alert(
                `Không thể tải dữ liệu thống kê.\n${error.message}`
            );

        } finally {
            isLoading = false;

            setButtonLoading(
                btnFilter,
                false,
                "Đang tải...",
                "Thống kê"
            );
        }
    }

    // =====================================================
    // EXPORT EXCEL
    // =====================================================

    async function exportReport() {
        if (isExporting || isLoading) return;

        const { from, to } = getSelectedDates();

        if (!validateDates(from, to)) return;

        const params = buildParams();
        if (!params) return;

        const token = getToken();

        if (!token) {
            alert("Không tìm thấy token đăng nhập. Vui lòng đăng nhập lại.");
            return;
        }

        isExporting = true;

        setButtonLoading(
            btnExport,
            true,
            "Đang xuất...",
            "Xuất báo cáo"
        );

        try {
            const url = `${EXPORT_URL}?${params.toString()}`;

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                },
                credentials: "same-origin"
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(
                    `HTTP ${response.status}: ${errorText || response.statusText}`
                );
            }

            const blob = await response.blob();

            if (!blob.size) {
                throw new Error("File Excel được tạo nhưng không có dữ liệu.");
            }

            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = objectUrl;
            link.download = `BaoCaoThongKe_${from}_${to}.xlsx`;

            document.body.appendChild(link);
            link.click();
            link.remove();

            setTimeout(() => {
                URL.revokeObjectURL(objectUrl);
            }, 1000);

        } catch (error) {
            console.error("Lỗi xuất báo cáo:", error);

            alert(`Không thể xuất báo cáo.\n${error.message}`);
        } finally {
            isExporting = false;

            setButtonLoading(
                btnExport,
                false,
                "Đang xuất...",
                "Xuất báo cáo"
            );
        }
    }

    // =====================================================
    // INITIALIZE
    // =====================================================

    function initialize() {
        if (!filterType || !reportDate || !fromDate || !toDate
            || !btnFilter || !btnExport) {
            console.error(
                "Không tìm thấy các thành phần bộ lọc thống kê trong HTML."
            );
            return;
        }

        const today = getTodayString();

        if (!reportDate.value) {
            reportDate.value = today;
        }

        if (!fromDate.value) {
            fromDate.value = today;
        }

        if (!toDate.value) {
            toDate.value = today;
        }

        toggleDateFilter();

        filterType.addEventListener("change", toggleDateFilter);

        btnFilter.addEventListener("click", loadReport);

        btnExport.addEventListener("click", exportReport);

        // Tự tải thống kê theo ngày hiện tại khi mở trang
        loadReport();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
})();