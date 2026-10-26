(() => {
    "use strict";

    const $ = id => document.getElementById(id);

    const page = $("patient-detail-page");
    const root = $("appointment-detail-modal");
    const list = $("profile-visit-list");

    if (!page || !root || !list) return;

    function positiveId(value) {
        const text = String(value ?? "");
        const number = Number(text);

        return /^\d+$/.test(text)
            && Number.isSafeInteger(number)
            && number > 0
                ? number
                : null;
    }

    const patientId = positiveId(page.dataset.patientId);

    const statusNames = {
        ChoGoi: "Chờ gọi",
        DaGoi: "Đã gọi",
        DaTiepNhan: "Đã tiếp nhận",
        ChoKham: "Chờ khám",
        DangKham: "Đang khám",
        ChoThanhToan: "Chờ thanh toán",
        ChoCLS: "Chờ CLS",
        DangCLS: "Đang CLS",
        ChoLayThuoc: "Chờ lấy thuốc",
        DangLayThuoc: "Đang lấy thuốc",
        HoanTat: "Hoàn tất",
        DaHuy: "Đã hủy",
        KhongDen: "Không đến",

        ChoThucHien: "Chờ thực hiện",
        DangThucHien: "Đang thực hiện",
        DaHoanThanh: "Đã hoàn thành",
        HoanThanh: "Hoàn thành",

        ChuaThanhToan: "Chưa thanh toán",
        ThanhToanMotPhan: "Thanh toán một phần",
        DaThanhToan: "Đã thanh toán",

        ThanhCong: "Thành công",
        ThatBai: "Thất bại",
        DangXuLy: "Đang xử lý"
    };

    let requestVersion = 0;
    let requestController = null;
    let previousFocus = null;

    const feeButton = $("appointment-detail-open-fees");

    const feeDetails = document.createElement("div");

    feeDetails.id = "appointment-detail-fee-breakdown";
    feeDetails.className = "mt-3";
    feeDetails.hidden = true;

    feeButton?.closest("section")?.append(feeDetails);

    feeButton?.setAttribute(
        "aria-controls",
        feeDetails.id
    );

    feeButton?.setAttribute(
        "aria-expanded",
        "false"
    );

    // =====================================================
    // HÀM HỖ TRỢ
    // =====================================================

    function setText(elementId, value, fallback = "Chưa ghi nhận") {
        const element = $(elementId);

        if (!element) return;

        element.textContent = value == null || value === ""
            ? fallback
            : String(value);
    }

    function createElement(tag, value, className = "") {
        const element = document.createElement(tag);

        element.className = className;

        if (value != null) {
            element.textContent = String(value);
        }

        return element;
    }

    function formatDate(value) {
        const match = /^(\d{4})-(\d{2})-(\d{2})/
            .exec(String(value ?? ""));

        return match
            ? `${match[3]}/${match[2]}/${match[1]}`
            : "";
    }

    function formatDateTime(value) {
        const date = formatDate(value);
        const time = String(value || "").slice(11, 16);

        return date
            ? `${date}${time ? ` · ${time}` : ""}`
            : "";
    }

    function formatMoney(value) {
        if (
            value == null
            || !/^\d+(\.\d{1,2})?$/.test(String(value))
        ) {
            return "Chưa có số tiền";
        }

        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
            maximumFractionDigits: 2
        }).format(Number(value));
    }

    function formatMeasure(value, unit) {
        if (value == null || value === "") {
            return "Chưa ghi nhận";
        }

        const number = Number(value);

        if (!Number.isFinite(number) || number <= 0) {
            return "Chưa ghi nhận";
        }

        return new Intl.NumberFormat("vi-VN").format(number)
            + ` ${unit}`;
    }

    function rawStatus(value) {
        return Object.keys(statusNames).find(
            key => key === value || statusNames[key] === value
        ) || value;
    }

    function createBadge(value, label) {
        const status = rawStatus(value);

        let color = "text-secondary bg-secondary-subtle";

        if (
            [
                "HoanTat",
                "DangKham",
                "DaThanhToan",
                "ThanhCong",
                "DaHoanThanh",
                "HoanThanh"
            ].includes(status)
        ) {
            color = "text-success bg-success-subtle";
        } else if (
            [
                "DaHuy",
                "KhongDen",
                "ThatBai"
            ].includes(status)
        ) {
            color = "text-danger bg-danger-subtle";
        } else if (
            [
                "ChoThanhToan",
                "ChuaThanhToan",
                "ThanhToanMotPhan"
            ].includes(status)
        ) {
            color = "text-warning-emphasis bg-warning-subtle";
        } else if (
            [
                "DaGoi",
                "DaTiepNhan",
                "ChoGoi",
                "ChoKham",
                "ChoCLS",
                "DangCLS",
                "ChoThucHien",
                "DangThucHien"
            ].includes(status)
        ) {
            color = "text-primary bg-primary-subtle";
        }

        return createElement(
            "span",
            label
                || statusNames[status]
                || value
                || "Chưa xác định",
            `patient-detail-status ${color}`
        );
    }

    function showMessage(value = "", danger = false) {
        const box = $("appointment-detail-message");

        box.hidden = !value;

        box.className = danger
            ? "alert alert-danger"
            : "alert alert-warning";

        box.textContent = value;
    }

    // =====================================================
    // GỌI API
    // =====================================================

    async function getApi(url, signal) {
        const token = (
            sessionStorage.getItem("Token")
            || localStorage.getItem("Token")
            || sessionStorage.getItem("token")
            || localStorage.getItem("token")
            || ""
        ).trim();

        if (!token) {
            throw new Error(
                "Vui lòng đăng nhập lại để xem chi tiết."
            );
        }

        const response = await fetch(url, {
            method: "GET",
            cache: "no-store",
            signal,

            headers: {
                Accept: "application/json",

                Authorization: /^Bearer\s/i.test(token)
                    ? token
                    : `Bearer ${token}`
            }
        });

        let data;

        try {
            data = await response.json();
        } catch (error) {
            if (error.name === "AbortError") throw error;

            throw new Error(
                "Máy chủ trả về dữ liệu không hợp lệ. "
                + "Kiểm tra phiên đăng nhập."
            );
        }

        if (!response.ok) {
            const fallback = response.status === 401
                ? "Phiên đăng nhập đã hết hạn."
                : response.status === 403
                    ? "Bạn không có quyền xem dữ liệu này."
                    : "Không thể tải chi tiết lịch khám.";

            throw new Error(
                data?.message || data?.detail || fallback
            );
        }

        if (!data || data.success === false) {
            throw new Error(
                data?.message
                || "Máy chủ chưa trả về dữ liệu hợp lệ."
            );
        }

        return data;
    }

    // =====================================================
    // CHUẨN BỊ POPUP
    // =====================================================

    function resetPopup() {
        showMessage();

        $("appointment-detail-content").hidden = true;
        $("appointment-detail-loading").hidden = false;

        $("appointment-detail-body").setAttribute(
            "aria-busy",
            "true"
        );

        $("appointment-detail-body").scrollTop = 0;

        setText(
            "appointment-detail-patient",
            "Đang tải..."
        );

        $("appointment-detail-services-list")
            .replaceChildren();

        $("appointment-detail-invoices-list")
            .replaceChildren();

        $("appointment-detail-services-empty").hidden = true;
        $("appointment-detail-invoices-empty").hidden = true;

        feeDetails.replaceChildren();
        feeDetails.hidden = true;

        if (feeButton) {
            feeButton.disabled = true;

            feeButton.setAttribute(
                "aria-expanded",
                "false"
            );
        }
    }

    // =====================================================
    // HIỂN THỊ CHI TIẾT LỊCH KHÁM
    // =====================================================

    function renderDetail(item, appointmentId) {
        if (
            positiveId(item.maBenhNhan) !== patientId
            || positiveId(item.maLichKham) !== appointmentId
            || !Array.isArray(item.danhSachChiDinh)
        ) {
            throw new Error(
                "Dữ liệu chi tiết không khớp "
                + "bệnh nhân hoặc lịch khám."
            );
        }

        setText(
            "appointment-detail-patient",
            `${item.tenBenhNhan || "Bệnh nhân"}`
                + ` · BN-${String(patientId).padStart(3, "0")}`
        );

        setText(
            "appointment-detail-code",
            `#${appointmentId}`
        );

        setText(
            "appointment-detail-date",
            formatDate(item.ngayKham)
        );

        setText(
            "appointment-detail-time",
            String(item.gioKham || "").slice(0, 5)
        );

        setText(
            "appointment-detail-queue",
            positiveId(item.soThuTu)
                ? String(item.soThuTu).padStart(3, "0")
                : null
        );

        setText(
            "appointment-detail-department",
            item.khoa
        );

        setText(
            "appointment-detail-doctor",
            item.bacSi
        );

        setText(
            "appointment-detail-room",
            item.phong,
            "Chưa xác định phòng"
        );

        const badge = createBadge(item.trangThai);
        const status = $("appointment-detail-status");

        status.className = badge.className;
        status.textContent = badge.textContent;

        // Số đo của chính lịch khám được chọn.
        setText(
            "appointment-detail-weight",
            formatMeasure(item.canNang, "kg")
        );

        setText(
            "appointment-detail-height",
            formatMeasure(item.chieuCao, "cm")
        );

        setText(
            "appointment-detail-systolic",
            formatMeasure(item.huyetApTamThu, "mmHg")
        );

        setText(
            "appointment-detail-diastolic",
            formatMeasure(item.huyetApTamTruong, "mmHg")
        );

        setText(
            "appointment-detail-reason",
            item.lyDoKham
        );

        // Nhân viên thực tế đã tiếp nhận lịch này.
        const hasReception =
            !!positiveId(item.maTiepNhan);

        const employeeId =
            positiveId(item.maNhanVienTiepNhan);

        setText(
            "appointment-detail-receptionist",
            hasReception
                ? item.tenNhanVienTiepNhan
                : null,
            hasReception
                ? "Chưa lưu tên nhân viên tiếp nhận"
                : "Chưa ghi nhận tiếp nhận"
        );

        $("appointment-detail-receptionist-code")
            .textContent = hasReception && employeeId
                ? `Mã nhân viên: ${employeeId}`
                : "";

        setText(
            "appointment-detail-received-at",
            hasReception
                ? formatDateTime(item.thoiGianTiepNhan)
                : null
        );

        // Thông tin bác sĩ ghi trong hồ sơ bệnh án.
        const clinicalFields = {
            symptoms: "trieuChung",
            diagnosis: "chanDoan",
            conclusion: "ketLuan",
            treatment: "huongDieuTri",
            "followup-note": "ghiChuTaiKham"
        };

        for (
            const [element, field]
            of Object.entries(clinicalFields)
        ) {
            setText(
                `appointment-detail-${element}`,
                item[field]
            );
        }

        setText(
            "appointment-detail-followup-date",
            formatDate(item.ngayTaiKham)
        );

        renderServices(item.danhSachChiDinh);
    }

    // =====================================================
    // CHỈ ĐỊNH CẬN LÂM SÀNG
    // =====================================================

    function renderServices(services) {
        const serviceIds = services.map(
            item => positiveId(item?.maChiDinh)
        );

        if (
            serviceIds.some(value => !value)
            || new Set(serviceIds).size !== serviceIds.length
        ) {
            throw new Error(
                "Danh sách chỉ định trả về không hợp lệ."
            );
        }

        const body = $("appointment-detail-services-list");

        body.replaceChildren();

        for (const service of services) {
            const row = createElement("tr");

            row.append(
                createElement(
                    "td",
                    service.tenDichVu || "Chưa có tên dịch vụ"
                ),

                createElement(
                    "td",
                    service.tenPhong || "Chưa phân phòng"
                )
            );

            const statusCell = createElement("td");

            statusCell.append(
                createBadge(service.trangThai)
            );

            row.append(statusCell);
            body.append(row);
        }

        setText(
            "appointment-detail-services-empty",
            "Chưa có chỉ định cận lâm sàng."
        );

        $("appointment-detail-services-empty").hidden =
            services.length > 0;
    }

    // =====================================================
    // DANH SÁCH HÓA ĐƠN
    // =====================================================

    function renderInvoices(data, appointmentId) {
        if (
            positiveId(data.maLichKham) !== appointmentId
            || positiveId(data.maBenhNhan) !== patientId
            || !Array.isArray(data.danhSachHoaDon)
        ) {
            throw new Error(
                "Dữ liệu viện phí không khớp "
                + "bệnh nhân hoặc lịch khám."
            );
        }

        const invoices = data.danhSachHoaDon;

        const invoiceIds = invoices.map(
            invoice => positiveId(invoice?.maHoaDon)
        );

        if (
            invoiceIds.some(value => !value)
            || new Set(invoiceIds).size !== invoiceIds.length
        ) {
            throw new Error(
                "Danh sách hóa đơn trả về không hợp lệ."
            );
        }

        const body = $("appointment-detail-invoices-list");

        body.replaceChildren();
        feeDetails.replaceChildren();

        for (const invoice of invoices) {
            const invoiceCode = "HD-"
                + String(invoice.maHoaDon).padStart(3, "0");

            const row = createElement("tr");

            row.append(
                createElement("td", invoiceCode),

                createElement(
                    "td",
                    invoice.tenLoaiHoaDon
                        || invoice.loaiHoaDon
                        || "Chưa xác định"
                ),

                createElement(
                    "td",
                    formatMoney(invoice.tongTien),
                    "text-end"
                )
            );

            const statusCell = createElement("td");

            statusCell.append(
                createBadge(
                    invoice.trangThai,
                    invoice.trangThaiHienThi
                )
            );

            row.append(statusCell);
            body.append(row);

            renderInvoiceDetails(invoice, invoiceCode);
        }

        setText(
            "appointment-detail-invoices-empty",
            "Chưa có hóa đơn cho lịch khám này."
        );

        $("appointment-detail-invoices-empty").hidden =
            invoices.length > 0;

        if (feeButton) {
            feeButton.disabled = invoices.length === 0;
        }
    }

    // =====================================================
    // CHI TIẾT HÓA ĐƠN VÀ LỊCH SỬ THANH TOÁN
    // =====================================================

    function renderInvoiceDetails(invoice, invoiceCode) {
        const block = createElement(
            "section",
            null,
            "border rounded-3 p-3 mb-3"
        );

        block.append(
            createElement(
                "h4",
                `Hóa đơn ${invoiceCode}`,
                "fs-6 mb-2"
            ),

            createElement(
                "p",
                "Đã thanh toán: "
                    + formatMoney(invoice.daThanhToan)
                    + " · Còn phải thu: "
                    + formatMoney(invoice.conPhaiThu),
                "mb-2"
            )
        );

        const details = createElement(
            "ul",
            null,
            "mb-3 ps-3"
        );

        for (const detail of invoice.chiTiet || []) {
            details.append(
                createElement(
                    "li",
                    `${detail.noiDung || "Khoản thu"}`
                        + ` · Số lượng: ${detail.soLuong}`
                        + ` · ${formatMoney(detail.thanhTien)}`
                )
            );
        }

        block.append(
            details,
            createElement(
                "strong",
                "Lịch sử thanh toán"
            )
        );

        const payments = invoice.lichSuThanhToan || [];

        if (!payments.length) {
            block.append(
                createElement(
                    "p",
                    "Chưa có giao dịch thanh toán.",
                    "text-secondary mb-0"
                )
            );
        }

        for (const payment of payments) {
            const content = [
                `TT-${payment.maThanhToan}`,

                formatDateTime(
                    payment.ngayThanhToan
                ),

                formatMoney(payment.soTien),

                payment.phuongThucThanhToan,

                statusNames[payment.trangThai]
                    || payment.trangThai,

                "Người thu: "
                    + (payment.tenNguoiThu || "Chưa ghi nhận")
            ].filter(Boolean).join(" · ");

            block.append(
                createElement(
                    "p",
                    content,
                    "mt-2 mb-0"
                )
            );
        }

        feeDetails.append(block);
    }

    // =====================================================
    // MỞ POPUP VÀ TẢI DỮ LIỆU
    // =====================================================

    async function openPopup(appointmentId, trigger) {
        if (!patientId || !appointmentId) return;

        if (!window.bootstrap?.Modal) {
            const box = $("appointment-profile-message");

            if (box) {
                box.textContent =
                    "Chưa tải được Bootstrap. "
                    + "Hãy tải lại trang rồi thử lại.";

                box.className = "alert alert-warning";
                box.hidden = false;

                box.scrollIntoView({
                    block: "nearest"
                });
            }

            return;
        }

        const currentVersion = ++requestVersion;

        requestController?.abort();

        const controller = new AbortController();

        requestController = controller;

        const timer = setTimeout(
            () => controller.abort(),
            20000
        );

        previousFocus = trigger;

        resetPopup();

        bootstrap.Modal
            .getOrCreateInstance(root)
            .show();

        try {
            const results = await Promise.allSettled([
                getApi(
                    "/api/tiepnhan/chi-tiet-lich-kham/"
                        + `${patientId}/${appointmentId}`,
                    controller.signal
                ),

                getApi(
                    "/api/tiepnhan/hoa-don/lich-kham/"
                        + appointmentId,
                    controller.signal
                )
            ]);

            // Không đưa kết quả cũ vào popup đã đóng.
            if (currentVersion !== requestVersion) return;

            const detailResult = results[0];
            const invoiceResult = results[1];

            if (detailResult.status !== "fulfilled") {
                throw detailResult.reason;
            }

            renderDetail(
                detailResult.value,
                appointmentId
            );

            const warnings = [];

            try {
                if (invoiceResult.status !== "fulfilled") {
                    throw invoiceResult.reason;
                }

                renderInvoices(
                    invoiceResult.value,
                    appointmentId
                );
            } catch (error) {
                // Không hiển thị danh sách viện phí tải dở.
                $("appointment-detail-invoices-list")
                    .replaceChildren();

                feeDetails.replaceChildren();
                feeDetails.hidden = true;

                if (feeButton) {
                    feeButton.disabled = true;

                    feeButton.setAttribute(
                        "aria-expanded",
                        "false"
                    );
                }

                setText(
                    "appointment-detail-invoices-empty",
                    "Chưa tải được viện phí. "
                    + "Đóng popup và mở lại để thử lại."
                );

                $("appointment-detail-invoices-empty")
                    .hidden = false;

                warnings.push(
                    error.name === "AbortError"
                        ? "Yêu cầu viện phí quá thời gian chờ."
                        : error.message
                );
            }

            $("appointment-detail-content").hidden = false;

            // Bình thường không hiện thông báo màu vàng.
            showMessage(warnings.join(" "));
        } catch (error) {
            if (currentVersion !== requestVersion) return;

            showMessage(
                error.name === "AbortError"
                    ? "Tải chi tiết quá thời gian chờ. "
                        + "Vui lòng mở lại popup."
                    : error.message,
                true
            );
        } finally {
            clearTimeout(timer);

            if (currentVersion === requestVersion) {
                requestController = null;

                $("appointment-detail-loading").hidden = true;

                $("appointment-detail-body").setAttribute(
                    "aria-busy",
                    "false"
                );
            }
        }
    }

    // =====================================================
    // BẤM DÒNG LỊCH SỬ ĐỂ MỞ POPUP
    // =====================================================

    function prepareLinks() {
        const links = list.querySelectorAll(
            "a[data-appointment-id]"
        );

        for (const link of links) {
            link.href = "#appointment-detail-modal";

            link.setAttribute(
                "aria-haspopup",
                "dialog"
            );

            link.setAttribute(
                "aria-controls",
                root.id
            );
        }
    }

    prepareLinks();

    const observer = new MutationObserver(prepareLinks);

    observer.observe(list, {
        childList: true,
        subtree: true
    });

    /*
     * Bắt sự kiện trước bộ xử lý chuyển trang cũ.
     * Mở popup không làm mất nội dung chưa lưu của hồ sơ.
     */
    document.addEventListener("click", event => {
        const link = event.target instanceof Element
            ? event.target.closest(
                "#profile-visit-list a[data-appointment-id]"
            )
            : null;

        if (!link) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        const busy = $("appointment-profile-form")
            ?.getAttribute("aria-busy") === "true";

        if (
            busy
            || link.getAttribute("aria-disabled") === "true"
        ) {
            return;
        }

        void openPopup(
            positiveId(link.dataset.appointmentId),
            link
        );
    }, true);

    // =====================================================
    // ĐÓNG POPUP
    // =====================================================

    root.addEventListener("hide.bs.modal", () => {
        requestVersion++;

        requestController?.abort();
        requestController = null;
    });

    root.addEventListener("hidden.bs.modal", () => {
        if (previousFocus?.isConnected) {
            previousFocus.focus({
                preventScroll: true
            });
        }

        previousFocus = null;
    });

    // =====================================================
    // XEM CHI TIẾT VIỆN PHÍ
    // =====================================================

    feeButton?.addEventListener("click", () => {
        feeDetails.hidden = !feeDetails.hidden;

        feeButton.setAttribute(
            "aria-expanded",
            String(!feeDetails.hidden)
        );
    });
})();