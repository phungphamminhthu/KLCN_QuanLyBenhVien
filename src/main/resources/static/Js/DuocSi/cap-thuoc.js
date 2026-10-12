document.addEventListener(
    "DOMContentLoaded",
    function () {

        "use strict";


        // =====================================================
        // LẤY ID ĐƠN THUỐC
        // =====================================================

        const parts =
            window.location.pathname
                .split("/")
                .filter(Boolean);

        const id =
            parts[parts.length - 1];


        // =====================================================
        // API
        // =====================================================

        const DETAIL_API =
            "/api/duocsi/cho-cap-thuoc/"
            + encodeURIComponent(id);

        const DISPENSE_API =
            "/api/duocsi/cho-cap-thuoc/"
            + encodeURIComponent(id)
            + "/cap-thuoc";


        // =====================================================
        // ELEMENT
        // =====================================================

        const patientName =
            document.getElementById(
                "patientName"
            );

        const patientCode =
            document.getElementById(
                "patientCode"
            );

        const patientGender =
            document.getElementById(
                "patientGender"
            );

        const patientDob =
            document.getElementById(
                "patientDob"
            );

        const patientWeight =
            document.getElementById(
                "patientWeight"
            );

        const patientSystolic =
            document.getElementById(
                "patientSystolic"
            );

        const patientDiastolic =
            document.getElementById(
                "patientDiastolic"
            );

        const patientAddress =
            document.getElementById(
                "patientAddress"
            );

        const orderCode =
            document.getElementById(
                "orderCode"
            );

        const prescriptionDate =
            document.getElementById(
                "prescriptionDate"
            );

        const tableBody =
            document.getElementById(
                "dispenseTableBody"
            );

        const cancelButton =
            document.getElementById(
                "cancelButton"
            );

        const confirmButton =
            document.getElementById(
                "confirmButton"
            );


        // =====================================================
        // ERROR MESSAGE
        // =====================================================

        const pageError =
            document.getElementById(
                "pageError"
            );

        const pageErrorTitle =
            document.getElementById(
                "pageErrorTitle"
            );

        const pageErrorMessage =
            document.getElementById(
                "pageErrorMessage"
            );

        const closePageError =
            document.getElementById(
                "closePageError"
            );


        // =====================================================
        // DATA
        // =====================================================

        let currentPrescription = null;

        let medicines = [];


        // =====================================================
        // TOKEN
        // =====================================================

        function getToken() {

            return (
                sessionStorage.getItem(
                    "Token"
                )
                ||
                localStorage.getItem(
                    "Token"
                )
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
        // FORMAT DATE
        // =====================================================

        function formatDate(value) {

            if (!value) {
                return "-";
            }

            const text =
                String(value);

            const datePart =
                text.substring(0, 10);

            const dateParts =
                datePart.split("-");


            if (
                dateParts.length === 3 &&
                dateParts[0].length === 4
            ) {

                return (
                    dateParts[2]
                    + "/"
                    + dateParts[1]
                    + "/"
                    + dateParts[0]
                );

            }

            return text;

        }


        // =====================================================
        // FORMAT WEIGHT
        // =====================================================

        function formatWeight(value) {

            if (
                value === null ||
                value === undefined ||
                value === ""
            ) {
                return "-";
            }

            const number =
                Number(value);

            if (
                Number.isNaN(number)
            ) {
                return escapeHtml(value);
            }

            const formatted =
                Number.isInteger(number)
                    ? String(number)
                    : number
                        .toFixed(2)
                        .replace(
                            /\.?0+$/,
                            ""
                        );

            return formatted + " kg";

        }


        // =====================================================
        // HAS VALUE
        // =====================================================

        function hasValue(value) {

            return (
                value !== null &&
                value !== undefined &&
                value !== ""
            );

        }


        // =====================================================
        // HIỆN LỖI TRÊN TRANG
        // =====================================================

        function showPageError(
            title,
            message
        ) {

            pageErrorTitle.textContent =
                title;

            pageErrorMessage.textContent =
                message;

            pageError.style.display =
                "flex";


            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        }


        // =====================================================
        // ẨN LỖI
        // =====================================================

        function hidePageError() {

            pageError.style.display =
                "none";

        }


        // =====================================================
        // LOAD DETAIL
        // =====================================================

        async function loadDetail() {

            const token =
                getToken();


            // =============================================
            // CHƯA ĐĂNG NHẬP
            // =============================================

            if (!token) {

                showPageError(
                    "Chưa đăng nhập",
                    "Vui lòng đăng nhập lại để tiếp tục."
                );

                confirmButton.disabled =
                    true;

                return;
            }


            try {

                const response =
                    await fetch(
                        DETAIL_API,
                        {
                            method: "GET",

                            headers: {
                                "Authorization":
                                    "Bearer "
                                    + token
                            }
                        }
                    );


                // =========================================
                // 401 / 403
                // =========================================

                if (
                    response.status === 401 ||
                    response.status === 403
                ) {

                    showPageError(
                        "Phiên đăng nhập hết hạn",
                        "Phiên đăng nhập của bạn đã hết hạn. Vui lòng đăng nhập lại."
                    );

                    confirmButton.disabled =
                        true;

                    return;
                }


                // =========================================
                // ERROR
                // =========================================

                if (!response.ok) {

                    throw new Error(
                        "Không thể tải đơn thuốc."
                    );

                }


                // =========================================
                // DATA
                // =========================================

                const data =
                    await response.json();


                console.log(
                    "Dữ liệu cấp thuốc:",
                    data
                );


                render(data);

            }
            catch (error) {

                console.error(
                    "Lỗi tải dữ liệu cấp thuốc:",
                    error
                );


                tableBody.innerHTML = `
                    <tr>
                        <td
                            colspan="6"
                            class="loading">

                            Không thể tải dữ liệu.

                        </td>
                    </tr>
                `;


                showPageError(
                    "Không thể tải dữ liệu",
                    error.message
                    ||
                    "Không thể tải đơn thuốc. Vui lòng thử lại."
                );

            }

        }


        // =====================================================
        // RENDER
        // =====================================================

        function render(data) {

            currentPrescription =
                data;


            patientName.textContent =
                data.benhNhan || "-";


            patientCode.textContent =
                data.maBenhNhanHienThi || "-";


            patientGender.textContent =
                data.gioiTinh || "-";


            patientDob.textContent =
                formatDate(
                    data.ngaySinh
                );


            patientWeight.textContent =
                formatWeight(
                    data.canNang
                );


            patientAddress.textContent =
                data.diaChi || "-";


            patientSystolic.textContent =
                hasValue(
                    data.huyetApTamThu
                )
                    ? data.huyetApTamThu
                    : "-";


            patientDiastolic.textContent =
                hasValue(
                    data.huyetApTamTruong
                )
                    ? data.huyetApTamTruong
                    : "-";


            orderCode.textContent =
                data.maHienThi || "-";


            prescriptionDate.textContent =
                formatDate(
                    data.ngayKe
                );


            medicines =
                Array.isArray(
                    data.danhSachThuoc
                )
                    ? data.danhSachThuoc
                    : [];


            renderTable();

        }


        // =====================================================
        // RENDER TABLE
        // =====================================================

        function renderTable() {

            if (!medicines.length) {

                tableBody.innerHTML = `
                    <tr>
                        <td
                            colspan="6"
                            class="loading">

                            Đơn thuốc không có thuốc.

                        </td>
                    </tr>
                `;

                confirmButton.disabled =
                    true;

                return;
            }


            confirmButton.disabled =
                false;


            tableBody.innerHTML =
                medicines
                    .map(
                        function (
                            item,
                            index
                        ) {

                            const quantity =
                                Number(
                                    item.soLuong
                                    || 0
                                );


                            const stock =
                                Number(
                                    item.tonKho
                                    || 0
                                );


                            const minStock =
                                Number(
                                    item.tonKhoToiThieu
                                    || 0
                                );


                            let noteText =
                                "Đủ";

                            let noteClass =
                                "good";

                            let stockClass =
                                "stock-good";


                            // =================================
                            // HẾT
                            // =================================

                            if (
                                stock <= 0
                            ) {

                                noteText =
                                    "Hết";

                                noteClass =
                                    "out";

                                stockClass =
                                    "stock-out";

                            }


                            // =================================
                            // KHÔNG ĐỦ
                            // =================================

                            else if (
                                stock < quantity
                            ) {

                                noteText =
                                    "Không đủ";

                                noteClass =
                                    "out";

                                stockClass =
                                    "stock-out";

                            }


                            // =================================
                            // SẮP HẾT
                            // =================================

                            else if (
                                stock <= minStock
                            ) {

                                noteText =
                                    "Sắp hết";

                                noteClass =
                                    "low";

                                stockClass =
                                    "stock-low";

                            }


                            return `
                                <tr>

                                    <td>
                                        ${index + 1}
                                    </td>


                                    <td>

                                        <div
                                            class="medicine-name">

                                            ${escapeHtml(
                                                item.tenThuoc
                                                || "-"
                                            )}

                                        </div>

                                    </td>


                                    <td>

                                        <span
                                            class="quantity-text">

                                            ${quantity}
                                            ${escapeHtml(
                                                item.donViTinh
                                                || ""
                                            )}

                                        </span>

                                    </td>


                                    <td>

                                        <span
                                            class="${stockClass}">

                                            ${stock}

                                        </span>

                                    </td>


                                    <td>

                                        <span
                                            class="actual-quantity-display">

                                            ${quantity}
                                            ${escapeHtml(
                                                item.donViTinh
                                                || ""
                                            )}

                                        </span>

                                    </td>


                                    <td>

                                        <span
                                            class="stock-note ${noteClass}">

                                            ${noteText}

                                        </span>

                                    </td>

                                </tr>
                            `;

                        }
                    )
                    .join("");

        }


        // =====================================================
        // XÁC NHẬN CẤP THUỐC
        //
        // KHÔNG confirm()
        // KHÔNG alert()
        // =====================================================

        confirmButton.addEventListener(
            "click",
            async function () {

                hidePageError();


                // =============================================
                // KHÔNG CÓ THUỐC
                // =============================================

                if (!medicines.length) {

                    showPageError(
                        "Không thể cấp thuốc",
                        "Đơn thuốc này không có thuốc để cấp."
                    );

                    return;
                }


                // =============================================
                // TẠO CHI TIẾT
                // =============================================

                const chiTiet = [];

                let valid = true;


                medicines.forEach(
                    function (item) {

                        const quantity =
                            Number(
                                item.soLuong
                                || 0
                            );


                        const stock =
                            Number(
                                item.tonKho
                                || 0
                            );


                        if (
                            quantity < 0 ||
                            quantity > stock
                        ) {

                            valid = false;

                            return;
                        }


                        chiTiet.push({

                            maThuoc:
                                Number(
                                    item.maThuoc
                                ),

                            soLuongThucCap:
                                quantity

                        });

                    }
                );


                // =============================================
                // KHÔNG ĐỦ TỒN KHO
                // =============================================

                if (!valid) {

                    showPageError(
                        "Không đủ tồn kho",
                        "Một hoặc nhiều thuốc không đủ tồn kho để cấp theo đơn bác sĩ kê."
                    );

                    return;
                }


                // =============================================
                // TOKEN
                // =============================================

                const token =
                    getToken();


                if (!token) {

                    showPageError(
                        "Phiên đăng nhập hết hạn",
                        "Phiên đăng nhập của bạn đã hết hạn. Vui lòng đăng nhập lại."
                    );

                    return;
                }


                // =============================================
                // DISABLE BUTTON
                // =============================================

                confirmButton.disabled =
                    true;

                cancelButton.disabled =
                    true;

                confirmButton.textContent =
                    "Đang xử lý...";


                try {

                    // =========================================
                    // POST
                    // =========================================

                    const response =
                        await fetch(
                            DISPENSE_API,
                            {
                                method: "POST",

                                headers: {

                                    "Authorization":
                                        "Bearer "
                                        + token,

                                    "Content-Type":
                                        "application/json"

                                },

                                body:
                                    JSON.stringify({
                                        chiTiet:
                                            chiTiet
                                    })

                            }
                        );


                    const text =
                        await response.text();


                    // =========================================
                    // QUYỀN
                    // =========================================

                    if (
                        response.status === 401 ||
                        response.status === 403
                    ) {

                        throw new Error(
                            "Bạn không có quyền cấp thuốc."
                        );

                    }


                    // =========================================
                    // API ERROR
                    // =========================================

                    if (!response.ok) {

                        throw new Error(
                            text
                            ||
                            "Cấp thuốc thất bại."
                        );

                    }


                    // =========================================
                    // THÀNH CÔNG
                    //
                    // CHUYỂN SANG TRANG RIÊNG
                    // =========================================

                    window.location.href =
                        "/DuocSi/cap-thuoc-thanh-cong/"
                        +
                        encodeURIComponent(
                            currentPrescription.maDonThuoc
                        );

                }
                catch (error) {

                    console.error(
                        "Lỗi cấp thuốc:",
                        error
                    );


                    showPageError(
                        "Cấp thuốc thất bại",
                        error.message
                        ||
                        "Không thể cấp thuốc. Vui lòng thử lại."
                    );


                    confirmButton.disabled =
                        false;

                    cancelButton.disabled =
                        false;

                    confirmButton.textContent =
                        "Xác nhận cấp thuốc";

                }

            }
        );


        // =====================================================
        // HỦY
        // =====================================================

        cancelButton.addEventListener(
            "click",
            function () {

                window.location.href =
                    "/DuocSi/cho-cap-thuoc";

            }
        );


        // =====================================================
        // ĐÓNG ERROR
        // =====================================================

        closePageError.addEventListener(
            "click",
            function () {

                hidePageError();

            }
        );


        // =====================================================
        // KIỂM TRA ID
        // =====================================================

        if (
            !id ||
            !/^\d+$/.test(id)
        ) {

            showPageError(
                "Mã đơn thuốc không hợp lệ",
                "Không tìm thấy mã đơn thuốc hợp lệ để tải dữ liệu."
            );

            confirmButton.disabled =
                true;

            return;
        }


        // =====================================================
        // INIT
        // =====================================================

        loadDetail();

    }

);