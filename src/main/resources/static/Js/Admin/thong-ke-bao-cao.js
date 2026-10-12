document.addEventListener(
    "DOMContentLoaded",
    function () {

        const API_URL =
            "/api/thong-ke-bao-cao";


        let appointmentChart = null;

        let revenueChart = null;


        // =========================================
        // TOKEN
        // =========================================

        function getToken() {

            return (
                localStorage.getItem("Token") ||
                sessionStorage.getItem("Token") ||
                ""
            );
        }


        function getHeaders() {

            const headers = {
                "Content-Type":
                    "application/json"
            };


            const token =
                getToken();


            if (token) {

                headers["Authorization"] =
                    "Bearer " + token;
            }


            return headers;
        }


        // =========================================
        // FORMAT
        // =========================================

        function formatNumber(value) {

            return new Intl.NumberFormat(
                "vi-VN"
            ).format(
                Number(value || 0)
            );
        }


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


        // =========================================
        // LOAD
        // =========================================

        async function loadReport() {

            const period =
                document.getElementById(
                    "periodSelect"
                ).value;


            const maKhoa =
                document.getElementById(
                    "khoaSelect"
                ).value;


            const customDate =
                document.getElementById(
                    "customDate"
                ).value;


            let url =
                `${API_URL}?period=${encodeURIComponent(period)}`;


            if (maKhoa) {

                url +=
                    `&maKhoa=${encodeURIComponent(maKhoa)}`;
            }


            if (
                period === "custom"
                && customDate
            ) {

                url +=
                    `&date=${encodeURIComponent(customDate)}`;
            }


            console.log(
                "Report API:",
                url
            );


            try {

                const response =
                    await fetch(
                        url,
                        {
                            method: "GET",
                            headers: getHeaders()
                        }
                    );


                if (!response.ok) {

                    throw new Error(
                        "Không thể tải thống kê"
                    );
                }


                const data =
                    await response.json();


                renderStatistics(data);

                renderAppointmentChart(
                    data.luotKhamTheoNgay || []
                );

                renderRevenueChart(
                    data.doanhThuTheoNgay || []
                );

            }
            catch (error) {

                console.error(
                    "Report error:",
                    error
                );

                alert(
                    "Không thể tải dữ liệu thống kê."
                );
            }
        }


        // =========================================
        // STATISTICS
        // =========================================

        function renderStatistics(data) {

            document.getElementById(
                "tongLuotKham"
            ).textContent =
                formatNumber(
                    data.tongLuotKham
                );


            document.getElementById(
                "tongDoanhThu"
            ).textContent =
                formatCurrency(
                    data.tongDoanhThu
                );


            document.getElementById(
                "tongBenhNhan"
            ).textContent =
                formatNumber(
                    data.tongBenhNhan
                );
        }


        // =========================================
        // APPOINTMENT CHART
        // =========================================

        function renderAppointmentChart(data) {

            const canvas =
                document.getElementById(
                    "appointmentChart"
                );


            const labels =
                data.map(
                    item => item.label
                );


            const values =
                data.map(
                    item => item.luotKham
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
                                    }
                                },

                                x: {

                                    grid: {
                                        display: false
                                    }
                                }
                            }
                        }
                    }
                );
        }


        // =========================================
        // REVENUE CHART
        // =========================================

        function renderRevenueChart(data) {

            const canvas =
                document.getElementById(
                    "revenueChart"
                );


            const labels =
                data.map(
                    item => item.label
                );


            const values =
                data.map(
                    item =>
                        Number(
                            item.doanhThu || 0
                        )
                );


            if (revenueChart) {

                revenueChart.destroy();
            }


            revenueChart =
                new Chart(
                    canvas,
                    {
                        type: "bar",

                        data: {

                            labels: labels,

                            datasets: [
                                {
                                    label:
                                        "Doanh thu",

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
                                },

                                tooltip: {

                                    callbacks: {

                                        label:
                                            function (
                                                context
                                            ) {

                                                return formatCurrency(
                                                    context.raw
                                                );
                                            }
                                    }
                                }
                            },

                            scales: {

                                y: {

                                    beginAtZero: true,

                                    ticks: {

                                        callback: function(value) {

                                            return new Intl.NumberFormat(
                                                "vi-VN"
                                            ).format(value) + " ₫";

                                        }

                                    }

                                },

                                x: {

                                    grid: {
                                        display: false
                                    }
                                }
                            }
                        }
                    }
                );
        }


        // =========================================
        // LOAD KHOA
        // =========================================

        async function loadKhoa() {

            try {

                const response =
                    await fetch(
                        API_URL,
                        {
                            headers:
                                getHeaders()
                        }
                    );


                if (!response.ok) {
                    return;
                }


                const data =
                    await response.json();


                const select =
                    document.getElementById(
                        "khoaSelect"
                    );


                if (
                    !select
                    || !data.danhSachKhoa
                ) {
                    return;
                }


                data.danhSachKhoa
                    .forEach(khoa => {

                        const option =
                            document.createElement(
                                "option"
                            );


                        option.value =
                            khoa.maKhoa;


                        option.textContent =
                            khoa.tenKhoa;


                        select.appendChild(
                            option
                        );

                    });

            }
            catch (error) {

                console.error(
                    "Không thể tải khoa:",
                    error
                );
            }
        }


        // =========================================
        // PERIOD
        // =========================================

        document
            .getElementById(
                "periodSelect"
            )
            .addEventListener(
                "change",
                function () {

                    const customDate =
                        document.getElementById(
                            "customDate"
                        );


                    if (
                        this.value ===
                        "custom"
                    ) {

                        customDate.classList.add(
                            "show"
                        );

                    }
                    else {

                        customDate.classList.remove(
                            "show"
                        );

                        loadReport();
                    }
                }
            );


        // =========================================
        // CUSTOM DATE
        // =========================================

        document
            .getElementById(
                "customDate"
            )
            .addEventListener(
                "change",
                function () {

                    if (
                        this.value
                    ) {

                        loadReport();
                    }
                }
            );


        // =========================================
        // KHOA
        // =========================================

        document
            .getElementById(
                "khoaSelect"
            )
            .addEventListener(
                "change",
                function () {

                    loadReport();
                }
            );


        // =========================================
        // EXPORT
        // =========================================

        document
            .getElementById(
                "btnExport"
            )
            .addEventListener(
                "click",
                function () {

                    alert(
                        "Chức năng xuất báo cáo sẽ được kết nối ở bước tiếp theo."
                    );

                }
            );


        // =========================================
        // INIT
        // =========================================

        loadKhoa();

        loadReport();

        // ===========================================
        //
        // ===========================================
        document
            .getElementById("btnExport")
            .addEventListener("click", function () {

                const period =
                    document.getElementById("periodSelect").value;

                const khoa =
                    document.getElementById("khoaSelect").value;

                const customDate =
                    document.getElementById("customDate").value;

                let url =
                    `/api/thong-ke-bao-cao/export?period=${encodeURIComponent(period)}`;

                if (khoa) {
                    url += `&khoa=${encodeURIComponent(khoa)}`;
                }

                if (period === "custom") {

                    if (!customDate) {
                        alert("Vui lòng chọn ngày cần xuất báo cáo.");
                        return;
                    }

                    url += `&date=${encodeURIComponent(customDate)}`;
                }

                window.location.href = url;
            });

    }
);