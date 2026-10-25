document.addEventListener(
    "DOMContentLoaded",
    function () {

        "use strict";


        // Khai báo các phần tử HTML trước khi sử dụng
            const confirmButton = document.getElementById("confirmButton");
            const paymentButton = document.getElementById("paymentButton");

            const paymentModal = document.getElementById("paymentModal");
            const closePaymentButton = document.getElementById("closePaymentButton");
            const finishPaymentButton = document.getElementById("finishPaymentButton");

            const paymentInvoiceCode = document.getElementById("paymentInvoiceCode");
            const paymentAmount = document.getElementById("paymentAmount");
            const paymentQrImage = document.getElementById("paymentQrImage");
            const paymentStatus = document.getElementById("paymentStatus");
            const paymentError = document.getElementById("paymentError");

            let paymentConfirmed = false;
            let paymentCheckTimer = null;
            let checkingPayment = false;

            let paymentStarted = false;
            let savingReplacement = false;
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

        const totalAmount = document.getElementById("totalAmount");

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

        // ========================================
        // QR
        // ========================================

        function formatMoney(value) {
            return Number(value).toLocaleString("vi-VN") + " ₫";
        }

        function closePaymentModal() {
            paymentModal.hidden = true;
            paymentModal.setAttribute("aria-hidden", "true");
        }

        function stopPaymentPolling() {
            if (paymentCheckTimer !== null) {
                clearInterval(paymentCheckTimer);
                paymentCheckTimer = null;
            }
        }

        //        async function openPaymentModal() {
        //            const token = getToken();
        //
        //            if (!token) {
        //                showNotificationModal(
        //                    "error",
        //                    "Chưa đăng nhập",
        //                    "Vui lòng đăng nhập lại để tiếp tục."
        //                );
        //                return;
        //            }
        //
        //            paymentButton.disabled = true;
        //            paymentButton.textContent = "Đang tạo QR...";
        //
        //            paymentError.hidden = true;
        //            paymentError.textContent = "";
        //            paymentQrImage.removeAttribute("src");
        //            paymentStatus.textContent = "Đang tạo mã QR...";
        //            paymentStatus.classList.remove("paid");
        //
        //            try {
        //                const response = await fetch(
        //                    `/api/duocsi/cho-cap-thuoc/${encodeURIComponent(id)}/hoa-don/qr`,
        //                    {
        //                        method: "GET",
        //                        headers: {
        //                            "Authorization": "Bearer " + token
        //                        }
        //                    }
        //                );
        //
        //                const data = await response.json();
        //
        //                if (!response.ok || !data.success) {
        //                    throw new Error(
        //                        data.message || "Không thể tạo mã QR thanh toán."
        //                    );
        //                }
        //
        //                paymentInvoiceCode.textContent = "BV" + data.maHoaDon;
        //                paymentAmount.textContent = formatMoney(data.tongTien);
        //                paymentQrImage.src = data.qrUrl;
        //                paymentStatus.textContent =
        //                    "Vui lòng quét QR và chuyển khoản đúng số tiền.";
        //
        //                paymentModal.hidden = false;
        //                paymentModal.setAttribute("aria-hidden", "false");
        //
        //                startPaymentPolling();
        //
        //            } catch (error) {
        //                showNotificationModal(
        //                    "error",
        //                    "Không thể tạo mã QR",
        //                    error.message || "Vui lòng thử lại."
        //                );
        //            } finally {
        //                paymentButton.disabled = false;
        //                paymentButton.textContent = "Thanh toán";
        //            }
        //        }

        async function openPaymentModal() {
            const token = getToken();

            if (!token) {
                showNotificationModal(
                    "error",
                    "Chưa đăng nhập",
                    "Vui lòng đăng nhập lại để tiếp tục."
                );
                return;
            }

            if (paymentStarted || savingReplacement || paymentConfirmed) {
                return;
            }

            // Khóa đổi thuốc trong lúc tạo QR và chờ thanh toán.
            paymentStarted = true;

            paymentButton.disabled = true;
            paymentButton.textContent = "Đang tạo QR...";
            renderTable();

            paymentError.hidden = true;
            paymentError.textContent = "";
            paymentQrImage.removeAttribute("src");
            paymentStatus.textContent = "Đang tạo mã QR...";
            paymentStatus.classList.remove("paid");

            try {
                const response = await fetch(
                    `/api/duocsi/cho-cap-thuoc/${encodeURIComponent(id)}/hoa-don/qr`,
                    {
                        method: "GET",
                        headers: {
                            "Authorization": "Bearer " + token
                        }
                    }
                );

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(
                        data.message || "Không thể tạo mã QR thanh toán."
                    );
                }

                paymentInvoiceCode.textContent = "BV" + data.maHoaDon;
                paymentAmount.textContent = formatMoney(data.tongTien);
                paymentQrImage.src = data.qrUrl;

                paymentStatus.textContent =
                    "Vui lòng quét QR và chuyển khoản đúng số tiền.";

                paymentModal.hidden = false;
                paymentModal.setAttribute("aria-hidden", "false");

                // Giữ khóa đổi thuốc trong thời gian chờ thanh toán.
                startPaymentPolling();

            } catch (error) {
                console.error("Lỗi tạo QR thanh toán:", error);

                // Chỉ mở khóa khi chưa tạo được QR.
                paymentStarted = false;

                showNotificationModal(
                    "error",
                    "Không thể tạo mã QR",
                    error.message || "Vui lòng thử lại."
                );

            } finally {
                paymentButton.textContent = "Thanh toán";

                // Không bật lại nút nếu đã thanh toán hoặc đang xử lý đổi thuốc.
                paymentButton.disabled =
                    paymentConfirmed || savingReplacement;

                renderTable();
            }
        }



        async function checkPaymentStatus(showSuccessMessage) {
            if (checkingPayment || paymentConfirmed) {
                return;
            }

            const token = getToken();

            if (!token) {
                return;
            }

            checkingPayment = true;

            try {
                const response = await fetch(
                    `/api/duocsi/cho-cap-thuoc/${encodeURIComponent(id)}/hoa-don/trang-thai`,
                    {
                        method: "GET",
                        headers: {
                            "Authorization": "Bearer " + token
                        },
                        cache: "no-store"
                    }
                );

                if (!response.ok) {
                    return;
                }

                const data = await response.json();

                if (data.trangThai === "DaThanhToan") {

                    paymentButton.disabled = true;
                    paymentButton.textContent = "Đã thanh toán";
                    paymentConfirmed = true;
                    stopPaymentPolling();

                    confirmButton.disabled = medicines.length === 0;
                    paymentStatus.textContent = "Thanh toán thành công.";
                    paymentStatus.classList.add("paid");

                    closePaymentModal();

                    if (showSuccessMessage) {
                        showNotificationModal(
                            "success",
                            "Thanh toán thành công",
                            "Hóa đơn đã được thanh toán. Bạn có thể xác nhận cấp thuốc."
                        );
                    }
                } else if (data.trangThai === "ChuaThanhToan") {
                    paymentConfirmed = false;
                    confirmButton.disabled = true;
                    paymentStatus.textContent =
                        "Đang chờ SePay xác nhận giao dịch...";
                }
            } catch (error) {
                console.error("Không kiểm tra được trạng thái thanh toán:", error);
            } finally {
                checkingPayment = false;
            }
        }

        function startPaymentPolling() {
            stopPaymentPolling();

            checkPaymentStatus(false);

            paymentCheckTimer = setInterval(function () {
                checkPaymentStatus(true);
            }, 3000);
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

            totalAmount.textContent =
                Number(data.tongTien || 0).toLocaleString("vi-VN") + " ₫";

            renderTable();

        }


        // =====================================================
        // RENDER TABLE
        // =====================================================

        //        function renderTable() {
        //
        //            if (!medicines.length) {
        //
        //                tableBody.innerHTML = `
        //                    <tr>
        //                        <td
        //                            colspan="6"
        //                            class="loading">
        //
        //                            Đơn thuốc không có thuốc.
        //
        //                        </td>
        //                    </tr>
        //                `;
        //
        //                confirmButton.disabled =
        //                    true;
        //
        //                return;
        //            }
        //
        //
        //            confirmButton.disabled =
        //                !paymentConfirmed || medicines.length === 0;
        //
        //
        //            tableBody.innerHTML =
        //                medicines
        //                    .map(
        //                        function (
        //                            item,
        //                            index
        //                        ) {
        //
        //                            const quantity =
        //                                Number(
        //                                    item.soLuong
        //                                    || 0
        //                                );
        //
        //
        //                            const stock =
        //                                Number(
        //                                    item.tonKho
        //                                    || 0
        //                                );
        //
        //
        //                            const minStock =
        //                                Number(
        //                                    item.tonKhoToiThieu
        //                                    || 0
        //                                );
        //
        //
        //                            let noteText =
        //                                "Đủ";
        //
        //                            let noteClass =
        //                                "good";
        //
        //                            let stockClass =
        //                                "stock-good";
        //
        //
        //                            // =================================
        //                            // HẾT
        //                            // =================================
        //
        //                            if (
        //                                stock <= 0
        //                            ) {
        //
        //                                noteText =
        //                                    "Hết";
        //
        //                                noteClass =
        //                                    "out";
        //
        //                                stockClass =
        //                                    "stock-out";
        //
        //                            }
        //
        //
        //                            // =================================
        //                            // KHÔNG ĐỦ
        //                            // =================================
        //
        //                            else if (
        //                                stock < quantity
        //                            ) {
        //
        //                                noteText =
        //                                    "Không đủ";
        //
        //                                noteClass =
        //                                    "out";
        //
        //                                stockClass =
        //                                    "stock-out";
        //
        //                            }
        //
        //
        //                            // =================================
        //                            // SẮP HẾT
        //                            // =================================
        //
        //                            else if (
        //                                stock <= minStock
        //                            ) {
        //
        //                                noteText =
        //                                    "Sắp hết";
        //
        //                                noteClass =
        //                                    "low";
        //
        //                                stockClass =
        //                                    "stock-low";
        //
        //                            }
        //
        //
        //                            return `
        //                                <tr>
        //
        //                                    <td>
        //                                        ${index + 1}
        //                                    </td>
        //
        //
        //                                    <td>
        //
        //                                        <div
        //                                            class="medicine-name">
        //
        //                                            ${escapeHtml(
        //                                                item.tenThuoc
        //                                                || "-"
        //                                            )}
        //
        //                                        </div>
        //
        //                                    </td>
        //
        //
        //                                    <td>
        //
        //                                        <span
        //                                            class="quantity-text">
        //
        //                                            ${quantity}
        //                                            ${escapeHtml(
        //                                                item.donViTinh
        //                                                || ""
        //                                            )}
        //
        //                                        </span>
        //
        //                                    </td>
        //
        //
        //                                    <td>
        //
        //                                        <span
        //                                            class="${stockClass}">
        //
        //                                            ${stock}
        //
        //                                        </span>
        //
        //                                    </td>
        //
        //
        //                                    <td>
        //
        //                                        <span
        //                                            class="actual-quantity-display">
        //
        //                                            ${quantity}
        //                                            ${escapeHtml(
        //                                                item.donViTinh
        //                                                || ""
        //                                            )}
        //
        //                                        </span>
        //
        //                                    </td>
        //
        //
        //                                    <td>
        //
        //                                        <span
        //                                            class="stock-note ${noteClass}">
        //
        //                                            ${noteText}
        //
        //                                        </span>
        //
        //                                    </td>
        //
        //                                </tr>
        //                            `;
        //
        //                        }
        //                    )
        //                    .join("");
        //
        //        }

        function renderTable() {
            if (!medicines.length) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="loading">
                            Đơn thuốc không có thuốc.
                        </td>
                    </tr>
                `;
                confirmButton.disabled = true;
                return;
            }

            confirmButton.disabled =
                !paymentConfirmed || medicines.length === 0;

            tableBody.innerHTML = medicines.map(function (item, index) {
                const quantity = Number(item.soLuong || 0);
                const stock = Number(item.tonKho || 0);
                const minStock = Number(item.tonKhoToiThieu || 0);

                const originalName =
                    item.tenThuocGoc || item.tenThuoc || "-";

                const alternatives = Array.isArray(item.danhSachThuocThayThe)
                    ? item.danhSachThuocThayThe
                    : [];

                const selectedReplacement = item.maThuocThucCap == null
                    ? ""
                    : String(item.maThuocThucCap);

                let noteText = "Đủ";
                let noteClass = "good";
                let stockClass = "stock-good";

                if (stock <= 0) {
                    noteText = "Hết";
                    noteClass = "out";
                    stockClass = "stock-out";
                } else if (stock < quantity) {
                    noteText = "Không đủ";
                    noteClass = "out";
                    stockClass = "stock-out";
                } else if (stock <= minStock) {
                    noteText = "Sắp hết";
                    noteClass = "low";
                    stockClass = "stock-low";
                }

                const replacementControl = alternatives.length
                    ? `
                        <div class="replacement-picker" style="margin-top:8px;">
                            <label for="replacement-${index}"
                                   style="display:block;font-size:12px;margin-bottom:4px;color:#64748b;">
                                Thuốc thay thế
                            </label>

                            <select
                                id="replacement-${index}"
                                class="replacement-select"
                                data-index="${index}"
                                ${paymentStarted || paymentConfirmed || savingReplacement ? "disabled" : ""}
                                style="max-width:100%;width:100%;padding:7px 9px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;"
                            >
                                <option value="" ${selectedReplacement === "" ? "selected" : ""}>
                                    Dùng thuốc gốc: ${escapeHtml(originalName)}
                                </option>

                                ${alternatives.map(function (alt) {
                                    const altId = String(alt.maThuoc);
                                    const altName = alt.tenThuoc || "Thuốc thay thế";
                                    const altUnit = alt.donViTinh
                                        ? " · " + alt.donViTinh
                                        : "";

                                    const altStock = Number(alt.tonKho || 0);

                                    const selected =
                                        selectedReplacement === altId
                                            ? "selected"
                                            : "";

                                    const disabled =
                                        altStock <= 0 && selectedReplacement !== altId
                                            ? "disabled"
                                            : "";

                                    return `
                                        <option value="${escapeHtml(altId)}"
                                                ${selected} ${disabled}>
                                            ${escapeHtml(altName + altUnit)}
                                            — tồn: ${altStock}
                                        </option>
                                    `;
                                }).join("")}
                            </select>

                            <small style="display:block;margin-top:4px;color:#64748b;">
                                ${selectedReplacement
                                    ? "Đang chọn thuốc thay thế."
                                    : "Đang dùng thuốc bác sĩ kê."}
                            </small>
                        </div>
                    `
                    : `
                        <small style="display:block;margin-top:5px;color:#64748b;">
                            Không có thuốc thay thế được cấu hình.
                        </small>
                    `;

                const actualName = item.tenThuoc || originalName;
                const changed = selectedReplacement !== "";

                return `
                    <tr>
                        <td>${index + 1}</td>

                        <td>
                            <div class="medicine-name">
                                ${escapeHtml(actualName)}
                            </div>

                            ${changed
                                ? `<small style="display:block;color:#64748b;margin-top:3px;">
                                       Thuốc gốc: ${escapeHtml(originalName)}
                                   </small>`
                                : ""}

                            ${replacementControl}
                        </td>

                        <td>
                            <span class="quantity-text">
                                ${quantity} ${escapeHtml(item.donViTinh || "")}
                            </span>
                        </td>

                        <td>
                            <span class="${stockClass}">${stock}</span>
                        </td>

                        <td>
                            <span class="actual-quantity-display">
                                ${quantity} ${escapeHtml(item.donViTinh || "")}
                            </span>
                        </td>

                        <td>
                            <span class="stock-note ${noteClass}">
                                ${noteText}
                            </span>
                        </td>
                    </tr>
                `;
            }).join("");
        }

        // ===================================================
        // lưu don thuoc
        // ====================================================

        async function saveReplacement(index, selectElement) {
            if (savingReplacement || paymentStarted || paymentConfirmed) {
                return;
            }

            const item = medicines[index];

            if (!item) return;

            const token = getToken();

            if (!token) {
                showNotification("Vui lòng đăng nhập lại.", "error");
                await loadDetail();
                return;
            }

            const selectedValue = selectElement.value;

            const maThuocThayThe = selectedValue === ""
                ? null
                : Number(selectedValue);

            if (
                selectedValue !== "" &&
                (!Number.isInteger(maThuocThayThe) || maThuocThayThe <= 0)
            ) {
                showNotification("Mã thuốc thay thế không hợp lệ.", "error");
                await loadDetail();
                return;
            }

            const currentValue = item.maThuocThucCap == null
                ? ""
                : String(item.maThuocThucCap);

            if (selectedValue === currentValue) return;

            if (!item.maCTDonThuoc) {
                showNotification("Thiếu mã chi tiết đơn thuốc.", "error");
                await loadDetail();
                return;
            }

            // Kiểm tra dữ liệu trước khi gửi backend.
            const chiTietDieuChinh = medicines.map(function (medicine) {
                return {
                    maCTDonThuoc: Number(medicine.maCTDonThuoc),
                    soLuong: Number(medicine.soLuong),
                    thoiGianDung: Number(medicine.thoiGianDung),
                    maThuocThayThe:
                        Number(medicine.maCTDonThuoc) ===
                        Number(item.maCTDonThuoc)
                            ? maThuocThayThe
                            : (
                                medicine.maThuocThucCap == null
                                    ? null
                                    : Number(medicine.maThuocThucCap)
                            )
                };
            });

            const invalid = chiTietDieuChinh.some(function (detail) {
                return (
                    !Number.isInteger(detail.maCTDonThuoc) ||
                    detail.maCTDonThuoc <= 0 ||
                    !Number.isInteger(detail.soLuong) ||
                    detail.soLuong <= 0 ||
                    !Number.isInteger(detail.thoiGianDung) ||
                    detail.thoiGianDung <= 0
                );
            });

            if (invalid) {
                showNotification(
                    "Chi tiết đơn thuốc thiếu số lượng hoặc thời gian dùng hợp lệ.",
                    "error"
                );
                await loadDetail();
                return;
            }

            savingReplacement = true;
            paymentButton.disabled = true;
            renderTable();

            try {
                // Bước 1: Lưu thuốc thay thế.
                const updateResponse = await fetch(
                    `/api/duocsi/cho-cap-thuoc/${encodeURIComponent(id)}/dieu-chinh`,
                    {
                        method: "PUT",
                        headers: {
                            "Authorization": "Bearer " + token,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            chiTietDieuChinh: chiTietDieuChinh
                        })
                    }
                );

                const updateText = await updateResponse.text();

                if (!updateResponse.ok) {
                    throw new Error(
                        updateText || "Không lưu được thuốc thay thế."
                    );
                }

                // Bước 2: Đồng bộ hóa đơn theo thuốc mới.
                const invoiceResponse = await fetch(
                    `/api/duocsi/cho-cap-thuoc/${encodeURIComponent(id)}/hoa-don`,
                    {
                        method: "POST",
                        headers: {
                            "Authorization": "Bearer " + token,
                            "Content-Type": "application/json"
                        }
                    }
                );

                const invoiceText = await invoiceResponse.text();

                let invoiceData = {};

                try {
                    invoiceData = invoiceText ? JSON.parse(invoiceText) : {};
                } catch (_) {
                    // API có thể trả về nội dung dạng text.
                }

                if (
                    !invoiceResponse.ok ||
                    invoiceData.success === false
                ) {
                    throw new Error(
                        invoiceData.message ||
                        invoiceText ||
                        "Không thể cập nhật hóa đơn."
                    );
                }

                // Bước 3: Tải lại dữ liệu mới nhất.
                await loadDetail();

                showNotification(
                    "Đã lưu thuốc thay thế và cập nhật hóa đơn.",
                    "success"
                );

            } catch (error) {
                console.error("Lỗi lưu thuốc thay thế:", error);

                showNotification(
                    error.message || "Không thể lưu thuốc thay thế.",
                    "error"
                );

                // Đồng bộ lại giao diện với dữ liệu backend.
                await loadDetail();

            } finally {
                savingReplacement = false;
                paymentButton.disabled = paymentConfirmed;
                renderTable();
            }
        }

        // Bắt sự kiện thay đổi dropdown thuốc.
        tableBody.addEventListener("change", function (event) {
            const select = event.target.closest(".replacement-select");

            if (!select) return;

            const index = Number(select.dataset.index);

            if (!Number.isInteger(index)) return;

            saveReplacement(index, select);
        });



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


                if (!paymentConfirmed) {
                    showNotificationModal(
                        "warning",
                        "Chưa thanh toán",
                        "Vui lòng thanh toán hóa đơn trước khi xác nhận cấp thuốc."
                    );
                    return;
                }
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

        //====================================================
        //
        // ===================================================

        function showNotification(message, type = "success") {
            let notification = document.getElementById("appNotification");

            if (!notification) {
                notification = document.createElement("div");
                notification.id = "appNotification";
                notification.setAttribute("role", "status");
                notification.setAttribute("aria-live", "polite");

                Object.assign(notification.style, {
                    position: "fixed",
                    top: "24px",
                    right: "24px",
                    zIndex: "99999",
                    width: "min(380px, calc(100vw - 32px))",
                    padding: "16px",
                    borderRadius: "12px",
                    background: "#fff",
                    boxShadow: "0 8px 28px rgba(15,23,42,.14)",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    fontSize: "14px",
                    color: "#1e293b",
                    opacity: "0",
                    transform: "translateY(-12px)",
                    transition: "opacity .25s ease, transform .25s ease"
                });

                document.body.appendChild(notification);
            }

            clearTimeout(notification.hideTimer);

            const success = type === "success";
            const color = success ? "#16a34a" : "#dc2626";
            const background = success ? "#dcfce7" : "#fee2e2";

            notification.style.border =
                `1px solid ${success ? "#bbf7d0" : "#fecaca"}`;
            notification.style.borderLeft = `4px solid ${color}`;

            const icon = document.createElement("span");
            icon.textContent = success ? "✓" : "!";
            Object.assign(icon.style, {
                width: "34px",
                height: "34px",
                flexShrink: "0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                background,
                color,
                fontSize: "19px",
                fontWeight: "700"
            });

            const content = document.createElement("div");
            content.style.flex = "1";
            content.style.lineHeight = "1.5";

            const title = document.createElement("div");
            title.style.fontWeight = "600";
            title.textContent = success ? "Thành công" : "Có lỗi xảy ra";

            const text = document.createElement("div");
            text.textContent = message;

            content.append(title, text);
            notification.replaceChildren(icon, content);

            requestAnimationFrame(() => {
                notification.style.opacity = "1";
                notification.style.transform = "translateY(0)";
            });

            notification.hideTimer = setTimeout(() => {
                notification.style.opacity = "0";
                notification.style.transform = "translateY(-12px)";
            }, 3000);
        }

        // =====================================================
        // thông báo từ chi tiết đơn thuốc qua cấp thuốc
        // =====================================================

        const savedNotification = sessionStorage.getItem("capThuocNotification");

        if (savedNotification) {
            sessionStorage.removeItem("capThuocNotification");

            try {
                const notificationData = JSON.parse(savedNotification);

                showNotification(
                    notificationData.message,
                    notificationData.type
                );
            } catch (error) {
                console.error("Không đọc được thông báo:", error);
            }
        }


        // =====================================================
        // SỰ KIỆN THANH TOÁN QR
        // =====================================================

        paymentButton.addEventListener("click", openPaymentModal);

        closePaymentButton.addEventListener("click", function () {
            closePaymentModal();
            stopPaymentPolling();
        });

        finishPaymentButton.addEventListener("click", function () {
            closePaymentModal();
            stopPaymentPolling();
        });

        paymentModal.addEventListener("click", function (event) {
            if (event.target === paymentModal) {
                closePaymentModal();
                stopPaymentPolling();
            }
        });
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
        checkPaymentStatus(false);

    }

);