document.addEventListener("DOMContentLoaded", function () {

    // =====================================================
    // LẤY ID TỪ URL
    // =====================================================

    const pathParts =
        window.location.pathname
            .split("/")
            .filter(Boolean);

    const id =
        pathParts[pathParts.length - 1];


    // =====================================================
    // API
    // =====================================================

    // API lấy chi tiết đơn thuốc
    const DETAIL_API =
        "/api/duocsi/cho-cap-thuoc/" +
        encodeURIComponent(id);


    // API tải đơn thuốc
    // KHÔNG CÓ TIỀN
    const PRESCRIPTION_PDF_API =
        "/api/duocsi/lich-su-cap-thuoc/" +
        encodeURIComponent(id) +
        "/pdf";


    // API tải hóa đơn
    // CÓ ĐƠN GIÁ + THÀNH TIỀN + TỔNG TIỀN
    const INVOICE_PDF_API =
        "/api/duocsi/lich-su-cap-thuoc/" +
        encodeURIComponent(id) +
        "/invoice-pdf";


    // =====================================================
    // ELEMENTS
    // =====================================================

    const loadingBox =
        document.getElementById("loadingBox");


    const errorBox =
        document.getElementById("errorBox");


    const detailContent =
        document.getElementById("detailContent");


    const medicineTableBody =
        document.getElementById("medicineTableBody");


    // Nút tải đơn thuốc
    const downloadPrescriptionButton =
        document.getElementById(
            "downloadPrescriptionButton"
        );


    // Nút tải hóa đơn
    const downloadInvoiceButton =
        document.getElementById(
            "downloadInvoiceButton"
        );


    // =====================================================
    // TOKEN
    // =====================================================

    function getToken() {

        return (
            sessionStorage.getItem("Token") ||
            localStorage.getItem("Token") ||
            ""
        );

    }


    // =====================================================
    // LOAD DETAIL
    // =====================================================

    async function loadDetail() {

        const token =
            getToken();


        if (!token) {

            showError(
                "Vui lòng đăng nhập lại."
            );

            return;
        }


        if (
            !id ||
            !/^\d+$/.test(id)
        ) {

            showError(
                "Mã đơn thuốc không hợp lệ."
            );

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
                                "Bearer " + token,

                            "Content-Type":
                                "application/json"

                        }

                    }
                );


            // =============================================
            // KHÔNG CÓ QUYỀN
            // =============================================

            if (
                response.status === 401 ||
                response.status === 403
            ) {

                throw new Error(
                    "Phiên đăng nhập đã hết hạn hoặc bạn không có quyền truy cập."
                );

            }


            // =============================================
            // API ERROR
            // =============================================

            if (!response.ok) {

                throw new Error(
                    "Không thể tải chi tiết đơn thuốc."
                );

            }


            const data =
                await response.json();


            console.log(
                "Chi tiết đơn thuốc:",
                data
            );


            renderDetail(data);


        } catch (error) {

            console.error(
                "Lỗi tải chi tiết:",
                error
            );


            showError(
                error.message ||
                "Không thể tải thông tin đơn thuốc."
            );

        }

    }


    // =====================================================
    // RENDER DETAIL
    // =====================================================

    function renderDetail(data) {

        if (loadingBox) {

            loadingBox.style.display =
                "none";

        }


        if (errorBox) {

            errorBox.style.display =
                "none";

        }


        if (detailContent) {

            detailContent.style.display =
                "block";

        }


        // =================================================
        // THÔNG TIN ĐƠN THUỐC
        // =================================================

        const maDon =
            data.maHienThi ||
            (
                "DP" +
                String(
                    data.maDonThuoc || ""
                ).padStart(
                    5,
                    "0"
                )
            );


        setText(
            "maDonThuoc",
            maDon
        );


        setText(
            "ngayKe",
            data.ngayKe || "-"
        );

        // NGÀY TÁI KHÁM
        setText(
            "ngayTaiKham",
            formatDate(
                data.ngayTaiKham || data.ngayTaiKhamFormatted
            )
        );


        setText(
            "ngayCap",
            data.ngayCap ||
            data.thoiGianCap ||
            "-"
        );


        setText(
            "nguoiCap",
            data.nguoiCap ||
            data.tenNguoiCap ||
            "-"
        );


        setText(
            "bacSi",
            data.bacSi || "-"
        );


        // =================================================
        // THÔNG TIN BỆNH NHÂN
        // =================================================

        setText(
            "benhNhan",
            data.benhNhan || "-"
        );


        const maBenhNhan =
            data.maBenhNhanHienThi ||
            (
                "BN" +
                String(
                    data.maBenhNhan || ""
                ).padStart(
                    5,
                    "0"
                )
            );


        setText(
            "maBenhNhan",
            maBenhNhan
        );


        setText(
            "gioiTinh",
            data.gioiTinh || "-"
        );


        setText(
            "ngaySinh",
            data.ngaySinh || "-"
        );


        setText(
            "diaChi",
            data.diaChi || "-"
        );


        // =================================================
        // CÂN NẶNG
        // =================================================

        setText(
            "canNang",
            data.canNang != null
                ? data.canNang + " kg"
                : "-"
        );


        // =================================================
        // HUYẾT ÁP
        // =================================================

        let huyetAp = "-";


        if (
            data.huyetApTamThu != null &&
            data.huyetApTamTruong != null
        ) {

            huyetAp =
                data.huyetApTamThu +
                "/" +
                data.huyetApTamTruong +
                " mmHg";

        }


        setText(
            "huyetAp",
            huyetAp
        );


        // =================================================
        // TRẠNG THÁI
        // =================================================

        const status =
            normalizeStatus(
                data.trangThai ||
                data.trangThaiCapThuoc
            );


        const statusBadge =
            document.getElementById(
                "statusBadge"
            );


        if (statusBadge) {

            statusBadge.textContent =
                status.text;


            statusBadge.className =
                "status-badge " +
                status.className;

        }


        // =================================================
        // DANH SÁCH THUỐC
        // =================================================

        renderMedicines(
            data.danhSachThuoc ||
            data.chiTietThuoc ||
            []
        );


        // =================================================
        // TỔNG TIỀN
        // =================================================

        setText(
            "tongTien",
            formatMoney(
                data.tongTien
            )
        );


        // =================================================
        // GHI CHÚ
        // =================================================

        setText(
            "ghiChu",
            data.ghiChu ||
            "Không có ghi chú."
        );

    }


    // =====================================================
    // RENDER MEDICINES
    // =====================================================

    function renderMedicines(list) {

        if (!medicineTableBody) {

            return;

        }


        if (
            !Array.isArray(list) ||
            list.length === 0
        ) {

            medicineTableBody.innerHTML = `

                <tr>

                    <td
                        colspan="8"
                        style="
                            text-align: center;
                            padding: 30px;
                            color: #64748b;
                        ">

                        Không có thông tin thuốc.

                    </td>

                </tr>

            `;

            return;
        }


        medicineTableBody.innerHTML =
            list.map(
                function (item, index) {

                    return `

                        <tr>

                            <!-- STT -->

                            <td>
                                ${index + 1}
                            </td>


                            <!-- TÊN THUỐC -->

                            <td>

                                <span class="medicine-name">

                                    ${escapeHtml(
                                        item.tenThuoc ||
                                        "-"
                                    )}

                                </span>

                            </td>


                            <!-- ĐƠN VỊ -->

                            <td>

                                ${escapeHtml(
                                    item.donViTinh ||
                                    "-"
                                )}

                            </td>


                            <!-- SỐ LƯỢNG -->

                            <td>

                                ${escapeHtml(
                                    item.soLuongHienThi ||
                                    item.soLuong ||
                                    "0"
                                )}

                            </td>


                            <!-- LIỀU DÙNG -->

                            <td>

                                ${escapeHtml(
                                    item.lieuDung ||
                                    "-"
                                )}

                            </td>


                            <!-- CÁCH DÙNG -->

                            <td>

                                ${escapeHtml(
                                    item.cachDung ||
                                    "-"
                                )}

                            </td>


                            <!-- ĐƠN GIÁ -->

                            <td>

                                ${formatMoney(
                                    item.donGia
                                )}

                            </td>


                            <!-- THÀNH TIỀN -->

                            <td>

                                ${formatMoney(
                                    item.thanhTien
                                )}

                            </td>

                        </tr>

                    `;

                }
            ).join("");

    }


    // =====================================================
    // TẢI ĐƠN THUỐC
    // KHÔNG CÓ TIỀN
    // =====================================================

    async function downloadPrescription() {

        await downloadPdfFile({

            apiUrl:
                PRESCRIPTION_PDF_API,

            button:
                downloadPrescriptionButton,

            loadingText:
                "Đang tạo đơn thuốc...",

            fileName:
                "DonThuoc_MedcareHospital_DP" +
                String(id).padStart(
                    5,
                    "0"
                ) +
                ".pdf",

            errorMessage:
                "Không thể tải đơn thuốc PDF."

        });

    }


    // =====================================================
    // TẢI HÓA ĐƠN
    // CÓ TIỀN
    // =====================================================

    async function downloadInvoice() {

        await downloadPdfFile({

            apiUrl:
                INVOICE_PDF_API,

            button:
                downloadInvoiceButton,

            loadingText:
                "Đang tạo hóa đơn...",

            fileName:
                "HoaDon_MedcareHospital_DP" +
                String(id).padStart(
                    5,
                    "0"
                ) +
                ".pdf",

            errorMessage:
                "Không thể tải hóa đơn PDF."

        });

    }


    // =====================================================
    // HÀM TẢI PDF DÙNG CHUNG
    // =====================================================

    async function downloadPdfFile(options) {

        const token =
            getToken();


        if (!token) {

            showError(
                "Vui lòng đăng nhập lại."
            );

            return;

        }


        if (
            !id ||
            !/^\d+$/.test(id)
        ) {

            showError(
                "Mã đơn thuốc không hợp lệ."
            );

            return;

        }


        const button =
            options.button;


        // =================================================
        // DISABLE BUTTON
        // =================================================

        if (button) {

            button.disabled =
                true;


            button.dataset.oldText =
                button.innerHTML;


            button.innerHTML = `

                <span>
                    ${options.loadingText}
                </span>

            `;

        }


        try {

            const response =
                await fetch(
                    options.apiUrl,
                    {
                        method: "GET",

                        headers: {

                            "Authorization":
                                "Bearer " + token

                        }

                    }
                );


            // =============================================
            // AUTH ERROR
            // =============================================

            if (
                response.status === 401 ||
                response.status === 403
            ) {

                throw new Error(
                    "Bạn không có quyền tải file này."
                );

            }


            // =============================================
            // SERVER ERROR
            // =============================================

            if (!response.ok) {

                throw new Error(
                    options.errorMessage
                );

            }


            // =============================================
            // LẤY FILE
            // =============================================

            const blob =
                await response.blob();


            if (!blob || blob.size === 0) {

                throw new Error(
                    "File PDF được tạo nhưng không có dữ liệu."
                );

            }


            // =============================================
            // CREATE URL
            // =============================================

            const url =
                window.URL.createObjectURL(
                    blob
                );


            // =============================================
            // CREATE LINK
            // =============================================

            const link =
                document.createElement("a");


            link.href =
                url;


            link.download =
                options.fileName;


            document.body.appendChild(
                link
            );


            // =============================================
            // DOWNLOAD
            // =============================================

            link.click();


            // =============================================
            // CLEAN
            // =============================================

            link.remove();


            window.URL.revokeObjectURL(
                url
            );


        } catch (error) {

            console.error(
                "Lỗi tải PDF:",
                error
            );


            showError(
                error.message ||
                options.errorMessage
            );


        } finally {

            if (button) {

                button.disabled =
                    false;


                button.innerHTML =
                    button.dataset.oldText;

            }

        }

    }


    // =====================================================
    // BUTTON: TẢI ĐƠN THUỐC
    // =====================================================

    if (downloadPrescriptionButton) {

        downloadPrescriptionButton.addEventListener(
            "click",
            downloadPrescription
        );

    }


    // =====================================================
    // BUTTON: TẢI HÓA ĐƠN
    // =====================================================

    if (downloadInvoiceButton) {

        downloadInvoiceButton.addEventListener(
            "click",
            downloadInvoice
        );

    }


    // =====================================================
    // STATUS
    // =====================================================

    function normalizeStatus(status) {

        switch (status) {

            case "ChoCapThuoc":

                return {
                    text: "Chờ cấp",
                    className: "waiting"
                };


            case "DangCapThuoc":

                return {
                    text: "Đang xử lý",
                    className: "processing"
                };


            case "DaCapThuoc":

                return {
                    text: "Đã cấp",
                    className: "completed"
                };


            case "DaHuy":

                return {
                    text: "Đã hủy",
                    className: "cancelled"
                };


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
    // FORMAT MONEY
    // =====================================================

    function formatMoney(value) {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {

            return "0 đ";

        }


        const number =
            Number(value);


        if (Number.isNaN(number)) {

            return escapeHtml(
                value
            );

        }


        return new Intl.NumberFormat(
            "vi-VN"
        ).format(number) + " đ";

    }

    // =====================================================
    // FORMAT DATE
    // Hỗ trợ yyyy-MM-dd hoặc chuỗi ISO datetime
    // =====================================================
    function formatDate(value) {
        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return "Chưa có";
        }

        const text = String(value).trim();

        const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

        if (match) {
            return `${match[3]}-${match[2]}-${match[1]}`;
        }

        return text;
    }
    // =====================================================
    // SET TEXT
    // =====================================================

    function setText(
        elementId,
        value
    ) {

        const element =
            document.getElementById(
                elementId
            );


        if (element) {

            element.textContent =
                value ?? "-";

        }

    }


    // =====================================================
    // SHOW ERROR
    // =====================================================

    function showError(message) {

        if (loadingBox) {

            loadingBox.style.display =
                "none";

        }


        if (detailContent) {

            detailContent.style.display =
                "none";

        }


        if (errorBox) {

            errorBox.style.display =
                "flex";

            errorBox.textContent =
                message;

        }

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
    // INIT
    // =====================================================

    loadDetail();

});