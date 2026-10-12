document.addEventListener(
    "DOMContentLoaded",
    function () {

        const API_URL =
            "/api/dashboard";


        let appointmentChart = null;

        let departmentChart = null;


        // ==========================================
        // LẤY TOKEN
        // ==========================================

        function getToken() {

            return (
                localStorage.getItem("Token") ||
                sessionStorage.getItem("Token") ||
                ""
            );
        }


        // ==========================================
        // HEADER
        // ==========================================

        function getHeaders() {

            const token =
                getToken();

            const headers = {
                "Content-Type":
                    "application/json"
            };

            if (token) {

                headers["Authorization"] =
                    "Bearer " + token;
            }

            return headers;
        }


        // ==========================================
        // FORMAT SỐ
        // ==========================================

        function formatNumber(number) {

            return new Intl.NumberFormat(
                "vi-VN"
            ).format(
                Number(number || 0)
            );
        }


        // ==========================================
        // FORMAT TIỀN
        // ==========================================

        function formatCurrency(value) {

            return new Intl.NumberFormat(
                "vi-VN",
                {
                    style: "currency",
                    currency: "VND",
                    maximumFractionDigits: 0
                }
            ).format(
                Number(value || 0)
            );
        }


        // ==========================================
        // LOAD DASHBOARD
        // ==========================================

        async function loadDashboard() {

            try {

                const response =
                    await fetch(
                        API_URL,
                        {
                            method: "GET",
                            headers:
                                getHeaders()
                        }
                    );


                if (response.status === 401 ||
                    response.status === 403) {

                    console.error(
                        "Không có quyền truy cập Dashboard"
                    );

                    return;
                }


                if (!response.ok) {

                    throw new Error(
                        "Không thể tải dữ liệu Dashboard"
                    );
                }


                const data =
                    await response.json();


                renderStatistics(data);

                renderAppointmentChart(
                    data.luotKhamTheoNgay || []
                );

                renderDepartmentChart(
                    data.luotKhamTheoKhoa || []
                );

                renderPrescriptions(
                    data.donThuocChoCap || []
                );

                renderActivities(
                    data.hoatDongGanDay || []
                );


            } catch (error) {

                console.error(
                    "Dashboard error:",
                    error
                );

                showDashboardError();
            }
        }


        // ==========================================
        // THỐNG KÊ
        // ==========================================

//        function renderStatistics(data) {
//
//            setText(
//                "tongBenhNhan",
//                formatNumber(
//                    data.tongBenhNhan
//                )
//            );
//
//
//            setText(
//                "lichKhamHomNay",
//                formatNumber(
//                    data.lichKhamHomNay
//                )
//            );
//
//
//            setText(
//                "tongBacSi",
//                formatNumber(
//                    data.tongBacSi
//                )
//            );
//
//
//            setText(
//                "tongNhanVien",
//                formatNumber(
//                    data.tongNhanVien
//                )
//            );
//
//
//            setText(
//                "doanhThu",
//                formatCurrency(
//                    data.doanhThu
//                )
//            );
//
//
//            setText(
//                "tongLoaiThuoc",
//                formatNumber(
//                    data.tongLoaiThuoc
//                )
//            );
//        }


        function renderStatistics(data) {

            // Tổng bệnh nhân
            setText(
                "tongBenhNhan",
                formatNumber(
                    data.tongBenhNhan
                )
            );


            // Lịch khám theo khoảng thời gian
            setText(
                "lichKhamHomNay",
                formatNumber(
                    data.lichKhamHomNay ?? data.lichKham ?? 0
                )
            );


            // Tổng bác sĩ
            setText(
                "tongBacSi",
                formatNumber(
                    data.tongBacSi
                )
            );


            // Tổng nhân viên
            setText(
                "tongNhanVien",
                formatNumber(
                    data.tongNhanVien
                )
            );


            // Doanh thu theo khoảng thời gian
            setText(
                "doanhThu",
                formatCurrency(
                    data.doanhThu
                )
            );


            // Tổng loại thuốc
            setText(
                "tongLoaiThuoc",
                formatNumber(
                    data.tongLoaiThuoc
                )
            );
        }

        // =============================================
        // UPDATE DOANH THU
        // =============================================
        function updatePeriodDescriptions(period) {

            // ==========================================
            // MÔ TẢ LỊCH KHÁM
            // ==========================================

            const lichKhamDescription =
                document.getElementById(
                    "lichKhamDescription"
                );


            if (lichKhamDescription) {

                switch (period) {

                    case "today":

                        lichKhamDescription.textContent =
                            "Lịch khám trong ngày";

                        break;

                    case "7days":

                        lichKhamDescription.textContent =
                            "Tổng lịch khám 7 ngày qua";

                        break;

                    case "30days":

                        lichKhamDescription.textContent =
                            "Tổng lịch khám 30 ngày qua";

                        break;

                    case "custom":

                        lichKhamDescription.textContent =
                            "Tổng lịch khám ngày đã chọn";

                        break;
                }
            }


            // ==========================================
            // MÔ TẢ DOANH THU
            // ==========================================

            const doanhThuDescription =
                document.getElementById(
                    "doanhThuDescription"
                );


            if (doanhThuDescription) {

                switch (period) {

                    case "today":

                        doanhThuDescription.textContent =
                            "Tổng tiền đã thanh toán hôm nay";

                        break;

                    case "7days":

                        doanhThuDescription.textContent =
                            "Tổng tiền đã thanh toán 7 ngày qua";

                        break;

                    case "30days":

                        doanhThuDescription.textContent =
                            "Tổng tiền đã thanh toán 30 ngày qua";

                        break;

                    case "custom":

                        doanhThuDescription.textContent =
                            "Tổng tiền đã thanh toán ngày đã chọn";

                        break;
                }
            }
        }

        // ==========================================
        // CHART LƯỢT KHÁM
        // ==========================================

        function renderAppointmentChart(
            data
        ) {

            const canvas =
                document.getElementById(
                    "appointmentChart"
                );


            if (!canvas) {
                return;
            }


            const labels =
                data.map(
                    item => item.label
                );


            const values =
                data.map(
                    item => item.value
                );


            if (appointmentChart) {

                appointmentChart.destroy();
            }


            appointmentChart =
                new Chart(
                    canvas,
                    {
                        type: "line",

                        data: {

                            labels: labels,

                            datasets: [
                                {
                                    label:
                                        "Lượt khám",

                                    data:
                                        values,

                                    borderWidth: 3,

                                    tension: 0.35,

                                    fill: true,

                                    pointRadius: 4,

                                    pointHoverRadius: 6
                                }
                            ]
                        },

                        options: {

                            responsive: true,

                            maintainAspectRatio:
                                false,

                            plugins: {

                                legend: {
                                    display: false
                                }
                            },

                            scales: {

                                y: {

                                    beginAtZero:
                                        true,

                                    ticks: {
                                        precision: 0
                                    },

                                    grid: {
                                        color:
                                            "#e2e8f0"
                                    }
                                },

                                x: {

                                    grid: {
                                        display:
                                            false
                                    }
                                }
                            }
                        }
                    }
                );
        }


        // ==========================================
        // CHART THEO KHOA
        // ==========================================

        function renderDepartmentChart(
            data
        ) {

            const canvas =
                document.getElementById(
                    "departmentChart"
                );


            if (!canvas) {
                return;
            }


            const labels =
                data.map(
                    item => shortenText(
                        item.label,
                        12
                    )
                );


            const values =
                data.map(
                    item => item.value
                );


            if (departmentChart) {

                departmentChart.destroy();
            }


            departmentChart =
                new Chart(
                    canvas,
                    {
                        type: "bar",

                        data: {

                            labels: labels,

                            datasets: [
                                {
                                    label:
                                        "Lượt khám",

                                    data:
                                        values,

                                    borderRadius:
                                        7,

                                    borderSkipped:
                                        false
                                }
                            ]
                        },

                        options: {

                            responsive: true,

                            maintainAspectRatio:
                                false,

                            plugins: {

                                legend: {
                                    display: false
                                }
                            },

                            scales: {

                                y: {

                                    beginAtZero:
                                        true,

                                    ticks: {
                                        precision: 0
                                    },

                                    grid: {
                                        color:
                                            "#e2e8f0"
                                    }
                                },

                                x: {

                                    grid: {
                                        display:
                                            false
                                    }
                                }
                            }
                        }
                    }
                );
        }

        // ==========================================
        // ĐƠN THUỐC
        // ==========================================

        function renderPrescriptions(
            list
        ) {

            const tbody =
                document.getElementById(
                    "prescriptionTable"
                );


            if (!tbody) {
                return;
            }


            if (!list.length) {

                tbody.innerHTML = `
                    <tr>
                        <td
                            colspan="7"
                            class="empty-row">

                            Không có đơn thuốc chờ cấp

                        </td>
                    </tr>
                `;

                return;
            }


            tbody.innerHTML =
                list.map(
                    item => {

                        const status =
                            normalizeStatus(
                                item.trangThai
                            );


                        return `
                            <tr>

                                <td>
                                    <span
                                        class="prescription-code">

                                        ${escapeHtml(
                                            item.maHienThi
                                        )}

                                    </span>
                                </td>


                                <td>
                                    <span
                                        class="patient-name">

                                        ${escapeHtml(
                                            item.benhNhan
                                        )}

                                    </span>
                                </td>


                                <td>
                                    <span
                                        class="doctor-name">

                                        BS. ${escapeHtml(
                                            item.bacSi
                                        )}

                                    </span>
                                </td>


                                <td>
                                    ${escapeHtml(
                                        item.ngayKe
                                    )}
                                </td>


                                <td>
                                    ${formatNumber(
                                        item.soLoaiThuoc
                                    )}
                                </td>


                                <td>

                                    <span
                                        class="status ${status.className}">

                                        ${escapeHtml(
                                            status.text
                                        )}

                                    </span>

                                </td>


                                <td>

                                    <button
                                        type="button"
                                        class="action-btn"
                                        onclick="viewPrescription(${item.maDonThuoc})">

                                        Xem

                                    </button>

                                </td>

                            </tr>
                        `;
                    }
                ).join("");
        }


        // ==========================================
        // HOẠT ĐỘNG GẦN ĐÂY
        // ==========================================

        function renderActivities(
            list
        ) {

            const container =
                document.getElementById(
                    "activityList"
                );


            if (!container) {
                return;
            }


            if (!list.length) {

                container.innerHTML = `
                    <div class="activity-empty">
                        Chưa có hoạt động gần đây
                    </div>
                `;

                return;
            }


            container.innerHTML =
                list.map(
                    item => `

                        <div class="activity-item">

                            <div class="activity-time">

                                ${escapeHtml(
                                    item.thoiGian
                                )}

                            </div>


                            <div class="activity-content">

                                <strong>

                                    ${escapeHtml(
                                        item.noiDung
                                    )}

                                </strong>


                                <span>

                                    ${
                                        item.nguoiThucHien
                                            ? escapeHtml(
                                                item.nguoiThucHien
                                            )
                                            : "Hệ thống"
                                    }

                                </span>

                            </div>

                        </div>

                    `
                ).join("");
        }


        // ==========================================
        // STATUS ĐƠN THUỐC
        // ==========================================

        function normalizeStatus(
            status
        ) {

            const value =
                String(
                    status || ""
                ).toLowerCase();


            if (
                value.includes("cho") ||
                value.includes("chờ")
            ) {

                return {
                    text: "Chờ cấp",
                    className: "waiting"
                };
            }


            if (
                value.includes("xu ly") ||
                value.includes("xử lý") ||
                value.includes("dang") ||
                value.includes("đang")
            ) {

                return {
                    text: "Đang xử lý",
                    className: "processing"
                };
            }


            return {
                text:
                    status || "Chưa xác định",

                className:
                    "processing"
            };
        }


        // ==========================================
        // XEM ĐƠN THUỐC
        // ==========================================

        window.viewPrescription =
            function (id) {

                /*
                 * Sau này có thể đổi thành
                 * route thật của Dược sĩ.
                 */

                window.location.href =
                    "/DuocSi/don-thuoc/" +
                    id;
            };


        // ==========================================
        // TEXT
        // ==========================================

        function setText(
            id,
            value
        ) {

            const element =
                document.getElementById(id);

            if (element) {

                element.textContent =
                    value;
            }
        }


        // ==========================================
        // RÚT GỌN TEXT
        // ==========================================

        function shortenText(
            text,
            maxLength
        ) {

            if (!text) {
                return "";
            }


            return text.length >
                maxLength

                ? text.substring(
                    0,
                    maxLength
                ) + "..."

                : text;
        }


        // ==========================================
        // ESCAPE HTML
        // ==========================================

        function escapeHtml(
            value
        ) {

            if (
                value === null ||
                value === undefined
            ) {

                return "";
            }


            return String(value)
                .replace(
                    /&/g,
                    "&amp;"
                )
                .replace(
                    /</g,
                    "&lt;"
                )
                .replace(
                    />/g,
                    "&gt;"
                )
                .replace(
                    /"/g,
                    "&quot;"
                )
                .replace(
                    /'/g,
                    "&#039;"
                );
        }


        // ==========================================
        // LỖI
        // ==========================================

        function showDashboardError() {

            const tbody =
                document.getElementById(
                    "prescriptionTable"
                );

            if (tbody) {

                tbody.innerHTML = `
                    <tr>
                        <td
                            colspan="7"
                            class="empty-row">

                            Không thể tải dữ liệu

                        </td>
                    </tr>
                `;
            }


            const activity =
                document.getElementById(
                    "activityList"
                );

            if (activity) {

                activity.innerHTML = `
                    <div class="activity-empty">

                        Không thể tải dữ liệu

                    </div>
                `;
            }
        }

        // ==========================================
        // THAY ĐỔI NỘI DUNG KHI SORT
        // ==========================================
        function updatePeriodTitles(period) {

            const title =
                 document.getElementById(
                     "lichKhamTitle"
            );

            if (!title) {
                 return;
            }

            switch (period) {
                 case "today":
                     title.textContent =
                          "Lịch khám hôm nay";
                 break;

                 case "7days":
                      title.textContent =
                           "Lịch khám 7 ngày qua";
                 break;

                 case "30days":
                      title.textContent =
                           "Lịch khám 30 ngày qua";
                 break;

                 case "custom":
                      title.textContent =
                           "Lịch khám ngày đã chọn";
                 break;
            }
        }

        // ==========================================
        // FILTER DASHBOARD
        // ==========================================

        const filterButtons =
            document.querySelectorAll(".filter-btn[data-period]");

        const customDateBtn =
            document.getElementById("customDateBtn");

        const customDateInput =
            document.getElementById("customDate");

        const customDateText =
            document.getElementById("customDateText");


        // ==========================================
        // FORMAT NGÀY
        // ==========================================

        function formatDateForApi(date) {

            const year = date.getFullYear();

            const month =
                String(date.getMonth() + 1)
                    .padStart(2, "0");

            const day =
                String(date.getDate())
                    .padStart(2, "0");

            return `${year}-${month}-${day}`;
        }


        // ==========================================
        // FORMAT NGÀY HIỂN THỊ
        // ==========================================

        function formatDateDisplay(dateString) {

            const parts =
                dateString.split("-");

            if (parts.length !== 3) {
                return dateString;
            }

            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }


        // ==========================================
        // LOAD DASHBOARD THEO BỘ LỌC
        // ==========================================

        async function loadDashboardByPeriod(
            period,
            selectedDate = null
        ) {
            updatePeriodTitles(period);
            updatePeriodDescriptions(period);
            updateChartTitles(period);

            try {

                let url =
                    `${API_URL}?period=${encodeURIComponent(period)}`;


                // Nếu là tùy chọn ngày
                if (
                    period === "custom"
                    && selectedDate
                ) {

                    url +=
                        `&date=${encodeURIComponent(selectedDate)}`;
                }


                console.log(
                    "Dashboard API:",
                    url
                );


                const response =
                    await fetch(
                        url,
                        {
                            method: "GET",
                            headers: getHeaders()
                        }
                    );


                if (
                    response.status === 401
                    || response.status === 403
                ) {

                    console.error(
                        "Không có quyền truy cập Dashboard"
                    );

                    return;
                }


                if (!response.ok) {

                    throw new Error(
                        "Không thể tải dữ liệu Dashboard"
                    );
                }


                const data =
                    await response.json();


                // Render lại toàn bộ dashboard
                renderStatistics(data);

                renderAppointmentChart(
                    data.luotKhamTheoNgay || []
                );

                renderDepartmentChart(
                    data.luotKhamTheoKhoa || []
                );

                renderPrescriptions(
                    data.donThuocChoCap || []
                );

                renderActivities(
                    data.hoatDongGanDay || []
                );


            } catch (error) {

                console.error(
                    "Dashboard filter error:",
                    error
                );

                showDashboardError();
            }
        }

        // ==========================================
        // UPDATE CHỌN NGÀY
        // ==========================================
        function updateChartTitles(period) {

            const appointmentChartPeriod =
                document.getElementById(
                    "appointmentChartPeriod"
                );

            if (!appointmentChartPeriod) {
                return;
            }


            switch (period) {

                case "today":

                    appointmentChartPeriod.textContent =
                        "Hôm nay";

                    break;


                case "7days":

                    appointmentChartPeriod.textContent =
                        "7 ngày qua";

                    break;


                case "30days":

                    appointmentChartPeriod.textContent =
                        "30 ngày qua";

                    break;


                case "custom":

                    appointmentChartPeriod.textContent =
                        "Ngày đã chọn";

                    break;
            }
        }


        // ==========================================
        // HÔM NAY / 7 NGÀY / 30 NGÀY
        // ==========================================

        filterButtons.forEach(button => {

            button.addEventListener(
                "click",
                function () {

                    const period =
                        this.dataset.period;


                    // TÙY CHỌN
                    if (period === "custom") {
                        return;
                    }


                    // Bỏ active tất cả
                    filterButtons.forEach(btn => {

                        btn.classList.remove(
                            "active"
                        );

                    });


                    // Active nút hiện tại
                    this.classList.add(
                        "active"
                    );


                    // Tải dữ liệu mới
                    loadDashboardByPeriod(
                        period
                    );

                }
            );

        });


        // ==========================================
        // TÙY CHỌN NGÀY
        // ==========================================

        if (
            customDateBtn
            && customDateInput
        ) {

            customDateBtn.addEventListener(
                "click",
                function () {

                    // Active nút Tùy chọn
                    filterButtons.forEach(btn => {

                        btn.classList.remove(
                            "active"
                        );

                    });

                    customDateBtn.classList.add(
                        "active"
                    );


                    // Mở lịch
                    if (
                        typeof customDateInput.showPicker
                        === "function"
                    ) {

                        customDateInput.showPicker();

                    } else {

                        customDateInput.click();

                    }

                }
            );


            // Khi chọn ngày
            customDateInput.addEventListener(
                "change",
                function () {

                    const selectedDate =
                        this.value;


                    if (!selectedDate) {
                        return;
                    }


                    // Đổi chữ Tùy chọn thành ngày
                    customDateText.textContent =
                        formatDateDisplay(
                            selectedDate
                        );


                    // Load dashboard theo ngày
                    loadDashboardByPeriod(
                        "custom",
                        selectedDate
                    );

                }
            );

        }


        // ==========================================
        // CHẠY
        // ==========================================

        loadDashboard();

    }
);