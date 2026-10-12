document.addEventListener("DOMContentLoaded", function () {

    // =====================================================
    // LẤY MÃ ĐƠN THUỐC TỪ URL
    // Ví dụ:
    // /DuocSi/cho-cap-thuoc/1
    // =====================================================

    const pathParts =
        window.location.pathname
            .split("/")
            .filter(Boolean);

    const maDonThuoc =
        pathParts[pathParts.length - 1];


    // =====================================================
    // API
    // =====================================================

    const API_URL =
        "/api/duocsi/cho-cap-thuoc/"
        + encodeURIComponent(maDonThuoc);


    // =====================================================
    // ELEMENT
    // =====================================================

    const orderCode =
        document.getElementById("orderCode");

    const patientName =
        document.getElementById("patientName");

    const patientCode =
        document.getElementById("patientCode");

    const doctorName =
        document.getElementById("doctorName");

    const prescriptionDate =
        document.getElementById("prescriptionDate");

    const note =
        document.getElementById("note");

    const medicineTableBody =
        document.getElementById("medicineTableBody");

    const totalMoney =
        document.getElementById("totalAmount");

    const stockWarning =
        document.getElementById("stockWarning");

    const dispenseButton =
        document.getElementById("dispenseButton");


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
    // ESCAPE HTML
    // =====================================================

    function escapeHtml(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }


        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    // =====================================================
    // FORMAT MONEY
    // =====================================================

    function formatMoney(value) {

        const number =
            Number(value || 0);

        return number.toLocaleString(
            "vi-VN"
        ) + "đ";
    }


    // =====================================================
    // SET TEXT
    // =====================================================

    function setText(
        element,
        value
    ) {

        if (!element) {
            return;
        }

        element.textContent =
            value ?? "-";
    }


    // =====================================================
    // TRẠNG THÁI KHO
    // =====================================================

//    function getStockStatus(
//        tonKho,
//        tonKhoToiThieu
//    ) {
//
//        tonKho =
//            Number(tonKho || 0);
//
//        tonKhoToiThieu =
//            Number(tonKhoToiThieu || 0);
//
//
//        if (tonKho <= 0) {
//
//            return {
//                text: "Hết",
//                className: "out"
//            };
//        }
//
//
//        if (
//            tonKho <=
//            tonKhoToiThieu
//        ) {
//
//            return {
//                text: "Sắp hết",
//                className: "low"
//            };
//        }
//
//
//        return {
//            text: "Đủ",
//            className: "good"
//        };
//    }


    // =====================================================
    // LOAD CHI TIẾT
    // =====================================================

    async function loadDetail() {

        const token =
            getToken();


        if (!token) {

            alert(
                "Vui lòng đăng nhập lại."
            );

            window.location.href =
                "/auth/login";

            return;
        }


        if (
            !maDonThuoc ||
            !/^\d+$/.test(
                String(maDonThuoc)
            )
        ) {

            showError(
                "Mã đơn thuốc không hợp lệ."
            );

            return;
        }


        console.log(
            "Đang gọi API:",
            API_URL
        );


        try {

            const response =
                await fetch(
                    API_URL,
                    {
                        method: "GET",

                        headers: {
                            "Authorization":
                                "Bearer " +
                                token,

                            "Content-Type":
                                "application/json"
                        }
                    }
                );


            console.log(
                "HTTP Status:",
                response.status
            );


            // =================================================
            // 401
            // =================================================

            if (
                response.status === 401
            ) {

                alert(
                    "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
                );

                window.location.href =
                    "/auth/login";

                return;
            }


            // =================================================
            // 403
            // =================================================

            if (
                response.status === 403
            ) {

                const errorText =
                    await response.text();

                console.error(
                    "API 403:",
                    errorText
                );

                alert(
                    "Bạn không có quyền truy cập dữ liệu đơn thuốc."
                );

                return;
            }


            // =================================================
            // 404
            // =================================================

            if (
                response.status === 404
            ) {

                showError(
                    "Không tìm thấy đơn thuốc."
                );

                return;
            }


            // =================================================
            // OTHER ERROR
            // =================================================

            if (!response.ok) {

                const errorText =
                    await response.text();

                console.error(
                    "API Error:",
                    errorText
                );

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
                "Dữ liệu chi tiết đơn thuốc:",
                data
            );


            renderDetail(
                data
            );


        } catch (error) {

            console.error(
                "Lỗi load chi tiết đơn thuốc:",
                error
            );


            showError(
                "Không thể tải dữ liệu đơn thuốc."
            );
        }
    }


    // =====================================================
    // RENDER CHI TIẾT
    // =====================================================

    function renderDetail(
        data
    ) {

        if (!data) {

            showError(
                "Không có dữ liệu đơn thuốc."
            );

            return;
        }


        // =================================================
        // THÔNG TIN ĐƠN
        // =================================================

        setText(
            orderCode,
            data.maHienThi
                ||
                (
                    "DP" +
                    String(
                        data.maDonThuoc || ""
                    ).padStart(
                        5,
                        "0"
                    )
                )
        );


        setText(
            patientName,
            data.benhNhan
        );


        setText(
            patientCode,
            data.maBenhNhanHienThi
                ||
                (
                    "BN" +
                    String(
                        data.maBenhNhan || ""
                    ).padStart(
                        5,
                        "0"
                    )
                )
        );


        setText(
            doctorName,
            data.bacSi
        );


        setText(
            prescriptionDate,
            data.ngayKe
        );


        setText(
            note,
            data.ghiChu
        );


        // =================================================
        // DANH SÁCH THUỐC
        // =================================================

        const medicines =
            Array.isArray(
                data.danhSachThuoc
            )
                ? data.danhSachThuoc
                : [];


        renderMedicines(
            medicines
        );


        // =================================================
        // TỔNG TIỀN
        // =================================================

        setText(
            totalMoney,
            formatMoney(
                data.tongTien
            )
        );


//        // =================================================
//        // CẢNH BÁO KHO
//        // =================================================
//
//        renderStockWarning(
//            medicines
//        );
    }


    // =====================================================
    // RENDER THUỐC
    // =====================================================

    function renderMedicines(
        medicines
    ) {

        if (!medicineTableBody) {

            console.error(
                "Không tìm thấy medicineTableBody."
            );

            return;
        }


        if (
            !Array.isArray(medicines)
            ||
            medicines.length === 0
        ) {

            medicineTableBody.innerHTML = `

                <tr>

                    <td
                        colspan="8"
                        class="table-empty">

                        Đơn thuốc chưa có thuốc.

                    </td>

                </tr>

            `;

            return;
        }


        medicineTableBody.innerHTML =
            medicines
                .map(
                    function (
                        item,
                        index
                    ) {

//                        const tonKho =
//                            Number(
//                                item.tonKho
//                                || 0
//                            );
//
//
//                        const tonKhoToiThieu =
//                            Number(
//                                item.tonKhoToiThieu
//                                || 0
//                            );


                        const soLuong =
                            Number(
                                item.soLuong
                                || 0
                            );


                        const donGia =
                            Number(
                                item.donGia
                                || 0
                            );


                        const thanhTien =
                            item.thanhTien !==
                            undefined
                                ? Number(
                                    item.thanhTien
                                )
                                : (
                                    donGia *
                                    soLuong
                                );


//                        const stock =
//                            getStockStatus(
//                                tonKho,
//                                tonKhoToiThieu
//                            );


                        return `

                            <tr>

                                <!-- STT -->

                                <td>
                                    ${index + 1}
                                </td>


                                <!-- TÊN THUỐC -->

                                <td>

                                    <span
                                        class="medicine-name">

                                        ${escapeHtml(
                                            item.tenThuoc
                                            ||
                                            "-"
                                        )}

                                    </span>

                                </td>


                                <!-- ĐƠN VỊ -->

                                <td>

                                    ${escapeHtml(
                                        item.donViTinh
                                        ||
                                        "-"
                                    )}

                                </td>


                                <!-- SỐ LƯỢNG -->

                                <td>

                                    ${escapeHtml(
                                        item.soLuongHienThi
                                        ||
                                        (
                                            soLuong +
                                            " " +
                                            (
                                                item.donViTinh
                                                || ""
                                            )
                                        )
                                    )}

                                </td>


                                <!-- LIỀU DÙNG -->

                                <td>

                                    ${escapeHtml(
                                        item.lieuDung
                                        ||
                                        "-"
                                    )}

                                </td>


                                <!-- CÁCH DÙNG -->

                                <td>

                                    ${escapeHtml(
                                        item.cachDung
                                        ||
                                        "-"
                                    )}

                                </td>


                                <!-- ĐƠN GIÁ -->

                                <td>

                                    ${formatMoney(
                                        donGia
                                    )}

                                </td>


                                <!-- THÀNH TIỀN -->

                                <td>

                                    ${formatMoney(
                                        thanhTien
                                    )}

                                </td>
                            </tr>

                        `;
                    }
                )
                .join("");
    }


    // =====================================================
    // CẢNH BÁO KHO
    // =====================================================

//    function renderStockWarning(
//        medicines
//    ) {
//
//        if (!stockWarning) {
//            return;
//        }
//
//
//        const warningMedicines =
//            medicines.filter(
//                function (item) {
//
//                    const tonKho =
//                        Number(
//                            item.tonKho
//                            || 0
//                        );
//
//
//                    const min =
//                        Number(
//                            item.tonKhoToiThieu
//                            || 0
//                        );
//
//
//                    return (
//                        tonKho <= min
//                    );
//                }
//            );
//
//
//        if (
//            warningMedicines.length === 0
//        ) {
//
//            stockWarning.style.display =
//                "none";
//
//            return;
//        }
//
//
//        const first =
//            warningMedicines[0];
//
//
//        const index =
//            medicines.indexOf(
//                first
//            ) + 1;
//
//
//        const tonKho =
//            Number(
//                first.tonKho || 0
//            );
//
//
//        stockWarning.style.display =
//            "flex";
//
//
//        stockWarning.innerHTML = `
//
//            <span>
//                ⚠
//            </span>
//
//            <span>
//
//                Cảnh báo kho thuốc:
//                Thuốc số ${index}
//                chỉ còn ${tonKho}
//                đơn vị (sắp hết).
//
//            </span>
//
//        `;
//    }


    // =====================================================
    // HIỂN THỊ LỖI
    // =====================================================

    function showError(
        message
    ) {

        setText(
            orderCode,
            "-"
        );

        setText(
            patientName,
            "-"
        );

        setText(
            patientCode,
            "-"
        );

        setText(
            doctorName,
            "-"
        );

        setText(
            prescriptionDate,
            "-"
        );

        setText(
            note,
            "-"
        );

        setText(
            totalMoney,
            "0đ"
        );


        if (medicineTableBody) {

            medicineTableBody.innerHTML = `

                <tr>

                    <td
                        colspan="10"
                        class="table-error">

                        ${escapeHtml(
                            message
                        )}

                    </td>

                </tr>

            `;
        }
    }


    // =====================================================
    // NÚT CẤP THUỐC
    // =====================================================

    if (dispenseButton) {

        dispenseButton.addEventListener(
            "click",
            function () {

                window.location.href =
                    "/DuocSi/cap-thuoc/" +
                    maDonThuoc;
            }
        );
    }


    // =====================================================
    // KHỞI ĐỘNG
    // =====================================================

    loadDetail();

});