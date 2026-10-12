document.addEventListener(
    "DOMContentLoaded",
    function () {

        // =====================================================
        // API
        // =====================================================

        const API_URL =
            "/api/duocsi/dashboard";


        // =====================================================
        // TOKEN
        // =====================================================

        function getToken() {

            return (
                sessionStorage.getItem("Token")
                ||
                localStorage.getItem("Token")
                ||
                ""
            );
        }


        // =====================================================
        // LOAD DASHBOARD
        // =====================================================

        async function loadDashboard() {

            const tbody =
                document.getElementById(
                    "prescriptionTable"
                );


            // Hiển thị trạng thái loading
            if (tbody) {

                tbody.innerHTML = `
                    <tr>
                        <td
                            colspan="7"
                            class="empty-row">

                            Đang tải dữ liệu...

                        </td>
                    </tr>
                `;
            }


            try {

                const token =
                    getToken();


                // =================================================
                // KIỂM TRA TOKEN
                // =================================================

                if (!token) {

                    console.error(
                        "Không tìm thấy Token."
                    );

                    showError(
                        "Vui lòng đăng nhập lại."
                    );

                    return;
                }


                // =================================================
                // GỌI API
                // =================================================

                const response =
                    await fetch(
                        API_URL,
                        {
                            method: "GET",

                            headers: {
                                "Authorization":
                                    "Bearer " + token,

                                "Content-Type":
                                    "application/json"
                            }
                        }
                    );


                // =================================================
                // 401 / 403
                // =================================================

                if (
                    response.status === 401
                    ||
                    response.status === 403
                ) {

                    console.error(
                        "Không có quyền truy cập Dashboard Dược sĩ."
                    );

                    showError(
                        "Phiên đăng nhập đã hết hạn hoặc bạn không có quyền truy cập."
                    );

                    return;
                }


                // =================================================
                // HTTP ERROR
                // =================================================

                if (!response.ok) {

                    throw new Error(
                        "HTTP " +
                        response.status
                    );
                }


                // =================================================
                // JSON
                // =================================================

                const data =
                    await response.json();


                console.log(
                    "Dữ liệu Dashboard Dược sĩ:",
                    data
                );


                console.log(
                    "Đơn thuốc chờ cấp:",
                    data.donThuoc
                );


                // =================================================
                // RENDER KPI
                // =================================================

                renderStatistics(
                    data
                );


                // =================================================
                // RENDER ĐƠN THUỐC
                // =================================================

                renderPrescriptions(
                    Array.isArray(
                        data.donThuoc
                    )
                        ? data.donThuoc
                        : []
                );


                // =================================================
                // RENDER CẢNH BÁO KHO
                // =================================================

                renderStockWarning(
                    data.stockWarning || {}
                );


            } catch (error) {

                console.error(
                    "Lỗi Dashboard:",
                    error
                );


                showError(
                    "Không thể tải dữ liệu Dashboard."
                );
            }
        }


        // =====================================================
        // FORMAT NUMBER
        // =====================================================

        function formatNumber(
            value
        ) {

            return new Intl.NumberFormat(
                "vi-VN"
            ).format(
                Number(value || 0)
            );
        }


        // =====================================================
        // SET TEXT
        // =====================================================

        function setText(
            id,
            value
        ) {

            const element =
                document.getElementById(
                    id
                );


            if (element) {

                element.textContent =
                    value;
            }
        }


        // =====================================================
        // KPI
        // =====================================================

        function renderStatistics(
            data
        ) {

            // -----------------------------------------------
            // Đơn thuốc chờ cấp
            // -----------------------------------------------

            setText(
                "pendingPrescriptions",
                formatNumber(
                    data.donThuocChoCap
                )
            );


            // -----------------------------------------------
            // Đã cấp hôm nay
            // -----------------------------------------------

            setText(
                "dispensedToday",
                formatNumber(
                    data.daCapHomNay
                )
            );


            // -----------------------------------------------
            // Số loại thuốc trong kho
            // -----------------------------------------------

            setText(
                "totalMedicines",
                formatNumber(
                    data.soLoaiThuocTrongKho
                )
            );


            // -----------------------------------------------
            // Thuốc sắp hết hạn
            // -----------------------------------------------

            setText(
                "expiringMedicines",
                formatNumber(
                    data.thuocSapHetHan
                )
            );


            // -----------------------------------------------
            // Thuốc đã hết hạn
            // -----------------------------------------------

            setText(
                "expiredMedicines",
                formatNumber(
                    data.thuocDaHetHan
                )
            );


            // -----------------------------------------------
            // Thuốc sắp hết tồn
            // -----------------------------------------------

            setText(
                "lowStockMedicines",
                formatNumber(
                    data.thuocSapHetTon
                )
            );
        }


        // =====================================================
        // CẢNH BÁO KHO
        // =====================================================

        function renderStockWarning(
            warning
        ) {

            // -----------------------------------------------
            // Sắp hết tồn
            // -----------------------------------------------

            setText(
                "lowStockWarning",
                formatNumber(
                    warning.sapHet
                )
            );


            // -----------------------------------------------
            // Sắp hết hạn
            // -----------------------------------------------

            setText(
                "expiringWarning",
                formatNumber(
                    warning.sapHetHan
                )
            );


            // -----------------------------------------------
            // Đã hết hạn
            // -----------------------------------------------

            setText(
                "expiredWarning",
                formatNumber(
                    warning.hetHan
                )
            );
        }


        // =====================================================
        // ĐƠN THUỐC CHỜ CẤP
        // =====================================================

        function renderPrescriptions(
            list
        ) {

            const tbody =
                document.getElementById(
                    "prescriptionTable"
                );


            // Không tìm thấy tbody
            if (!tbody) {

                console.error(
                    "Không tìm thấy #prescriptionTable trong HTML."
                );

                return;
            }


            // Đảm bảo list luôn là Array
            if (!Array.isArray(list)) {

                console.error(
                    "Dữ liệu donThuoc không phải Array:",
                    list
                );

                list = [];
            }


            console.log(
                "Số đơn thuốc chờ cấp:",
                list.length
            );


            // =================================================
            // KHÔNG CÓ DỮ LIỆU
            // =================================================

            if (list.length === 0) {

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


            // =================================================
            // CÓ DỮ LIỆU
            // =================================================

            tbody.innerHTML =
                list
                    .map(
                        function (item) {

                            // ---------------------------------
                            // Trạng thái
                            // ---------------------------------

                            const status =
                                normalizeStatus(
                                    item.trangThai
                                );


                            // ---------------------------------
                            // Mã đơn
                            // ---------------------------------

                            const maDonThuoc =
                                item.maDonThuoc
                                ??
                                "";


                            const maHienThi =
                                item.maHienThi
                                ||
                                (
                                    "DP" +
                                    String(
                                        maDonThuoc
                                    ).padStart(
                                        5,
                                        "0"
                                    )
                                );


                            // ---------------------------------
                            // Bệnh nhân
                            // ---------------------------------

                            const benhNhan =
                                item.benhNhan
                                ||
                                "Không có dữ liệu";


                            // ---------------------------------
                            // Bác sĩ
                            // ---------------------------------

                            const bacSi =
                                item.bacSi
                                ||
                                "Không có dữ liệu";


                            // ---------------------------------
                            // Ngày kê
                            // ---------------------------------

                            const ngayKe =
                                item.ngayKe
                                ||
                                "-";


                            // ---------------------------------
                            // Số loại thuốc
                            // ---------------------------------

                            const soLoaiThuoc =
                                item.soLoaiThuoc
                                ??
                                0;


                            // ---------------------------------
                            // HTML
                            // ---------------------------------

                            return `

                                <tr>

                                    <!-- MÃ ĐƠN -->

                                    <td>

                                        <span
                                            class="prescription-code">

                                            ${escapeHtml(
                                                maHienThi
                                            )}

                                        </span>

                                    </td>


                                    <!-- BỆNH NHÂN -->

                                    <td>

                                        <span
                                            class="patient-name">

                                            ${escapeHtml(
                                                benhNhan
                                            )}

                                        </span>

                                    </td>


                                    <!-- BÁC SĨ -->

                                    <td>

                                        <span
                                            class="doctor-name">

                                            BS.
                                            ${escapeHtml(
                                                bacSi
                                            )}

                                        </span>

                                    </td>


                                    <!-- NGÀY KÊ -->

                                    <td>

                                        ${escapeHtml(
                                            ngayKe
                                        )}

                                    </td>


                                    <!-- SỐ LOẠI THUỐC -->

                                    <td>

                                        ${formatNumber(
                                            soLoaiThuoc
                                        )}

                                    </td>


                                    <!-- TRẠNG THÁI -->

                                    <td>

                                        <span
                                            class="status ${status.className}">

                                            ${escapeHtml(
                                                status.text
                                            )}

                                        </span>

                                    </td>


                                    <!-- THAO TÁC -->

                                    <td>

                                        <button
                                            type="button"
                                            class="action-btn"
                                            onclick="viewPrescription(${maDonThuoc})">

                                            Cấp thuốc

                                        </button>

                                    </td>

                                </tr>

                            `;
                        }
                    )
                    .join("");
        }


        // =====================================================
        // STATUS ĐƠN THUỐC
        // =====================================================

        function normalizeStatus(
            status
        ) {

            switch (status) {

                // ---------------------------------------------
                // Chờ cấp thuốc
                // ---------------------------------------------

                case "ChoCapThuoc":

                    return {
                        text: "Chờ cấp thuốc",
                        className: "waiting"
                    };


                // ---------------------------------------------
                // Đang cấp thuốc
                // ---------------------------------------------

                case "DangCapThuoc":

                    return {
                        text: "Đang cấp thuốc",
                        className: "processing"
                    };


                // ---------------------------------------------
                // Đã cấp thuốc
                // ---------------------------------------------

                case "DaCapThuoc":

                    return {
                        text: "Đã cấp thuốc",
                        className: "completed"
                    };


                // ---------------------------------------------
                // Đã hủy
                // ---------------------------------------------

                case "DaHuy":

                    return {
                        text: "Đã hủy",
                        className: "cancelled"
                    };


                // ---------------------------------------------
                // Không xác định
                // ---------------------------------------------

                default:

                    return {
                        text:
                            status ||
                            "Không xác định",

                        className:
                            "processing"
                    };
            }
        }


        // =====================================================
        // XEM / CẤP THUỐC
        // =====================================================

        window.viewPrescription =
            function (id) {

                if (!id) {

                    console.error(
                        "Không có mã đơn thuốc."
                    );

                    return;
                }


                window.location.href =
                    "/DuocSi/cho-cap-thuoc/" +
                    id;
            };


        // =====================================================
        // ESCAPE HTML
        // =====================================================

        function escapeHtml(
            value
        ) {

            if (
                value === null
                ||
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


        // =====================================================
        // ERROR
        // =====================================================

        function showError(
            message
        ) {

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

                            ${escapeHtml(
                                message ||
                                "Không thể tải dữ liệu."
                            )}

                        </td>

                    </tr>

                `;
            }


            // Reset KPI

            setText(
                "pendingPrescriptions",
                "0"
            );


            setText(
                "dispensedToday",
                "0"
            );


            setText(
                "totalMedicines",
                "0"
            );


            setText(
                "expiringMedicines",
                "0"
            );


            setText(
                "expiredMedicines",
                "0"
            );


            setText(
                "lowStockMedicines",
                "0"
            );
        }


        // =====================================================
        // LOAD
        // =====================================================

        loadDashboard();

    }
);