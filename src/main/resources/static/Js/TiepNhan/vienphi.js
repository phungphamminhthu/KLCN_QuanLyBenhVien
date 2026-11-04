
(() => {
    "use strict";

    // =====================================================
    // 1. KHAI BÁO
    // =====================================================

    const $ = id => document.getElementById(id);
    const root = $("vien-phi-modal");

    if (!root) return;

    const API_HOA_DON =
        "/api/tiepnhan/hoa-don/lich-kham/";

    const API_THU_TIEN =
        "/api/tiepnhan/hoa-don/";

    const formatter = new Intl.NumberFormat("vi-VN");

    let modal = null;
    let data = null;
    let room = null;
    let currentVisitId = null;
    let selectedId = null;
    let controller = null;
    let version = 0;
    let processing = false;
    let dialogMode = "confirm";
    let opener = null;

    let sepayTimer = null;
    let sepayPolling = false;
    let sepaySequence = 0;
    let sepayInvoiceId = null;
    let sepayVisitId = null;

    let toastTimer = null;

    // =====================================================
    // 2. HÀM HỖ TRỢ
    // =====================================================

    function positiveId(value) {
        const str = String(value ?? "");
        const num = Number(str);

        return /^\d+$/.test(str)
            && Number.isSafeInteger(num)
            && num > 0
            ? num
            : null;
    }

    function cents(value) {
        const match = /^(\d+)(?:\.(\d{1,2}))?$/
            .exec(String(value ?? ""));

        if (!match) {
            throw new Error("Số tiền không hợp lệ.");
        }

        return BigInt(match[1]) * 100n
            + BigInt((match[2] || "").padEnd(2, "0"));
    }

    function money(value) {
        const amount = cents(value);
        const fraction = amount % 100n;

        return formatter.format(amount / 100n)
            + (
                fraction > 0n
                    ? `,${String(fraction).padStart(2, "0")}`
                    : ""
            )
            + "đ";
    }

    function dateTime(value) {
        const match =
            /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/
                .exec(String(value || ""));

        if (!match) return "Chưa ghi nhận";

        return `${match[3]}/${match[2]}/${match[1]}`
            + ` · ${match[4]}:${match[5]}`;
    }

    function el(tag, className = "", text) {
        const node = document.createElement(tag);

        if (className) {
            node.className = className;
        }

        if (text !== undefined) {
            node.textContent = text;
        }

        return node;
    }

    function write(id, value) {
        const node = $(id);

        if (node) {
            node.textContent = value ?? "";
        }
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function getToken() {
        return (
            sessionStorage.getItem("Token")
            || localStorage.getItem("Token")
            || sessionStorage.getItem("token")
            || localStorage.getItem("token")
            || ""
        ).trim();
    }

    function authHeaders() {
        const token = getToken();

        if (!token) {
            throw new Error(
                "Phiên đăng nhập không hợp lệ. "
                + "Vui lòng đăng nhập lại."
            );
        }

        return {
            Accept: "application/json",
            Authorization: /^Bearer\s/i.test(token)
                ? token
                : `Bearer ${token}`
        };
    }

    function showError(message) {
        write("vien-phi-message", message);
        $("vien-phi-message").hidden = false;
    }

    function clearError() {
        write("vien-phi-message", "");
        $("vien-phi-message").hidden = true;
    }

    // =====================================================
    // 3. THÔNG BÁO LỖI TRƯỢT TỪ TRÊN XUỐNG
    // =====================================================

    function ensureTopToast() {
        let toast = $("vien-phi-top-toast");

        if (toast) return toast;

        if (!$("vien-phi-top-toast-style")) {
            const style = document.createElement("style");

            style.id = "vien-phi-top-toast-style";

            style.textContent = `
                #vien-phi-top-toast {
                    position: fixed;
                    top: 20px;
                    left: 50%;
                    transform: translate(-50%, -35px);
                    width: max-content;
                    min-width: 320px;
                    max-width: min(92vw, 720px);
                    padding: 15px 20px;
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    color: #991b1b;
                    border-radius: 12px;
                    box-shadow: 0 14px 35px rgba(15,23,42,.2);
                    font-size: 14px;
                    font-weight: 600;
                    line-height: 1.6;
                    opacity: 0;
                    pointer-events: none;
                    z-index: 20000;
                    transition:
                        transform .3s ease,
                        opacity .3s ease;
                }

                #vien-phi-top-toast[hidden] {
                    display: none !important;
                }

                #vien-phi-top-toast.show {
                    opacity: 1;
                    transform: translate(-50%, 0);
                }

                #vien-phi-top-toast.is-success {
                    background: #f0fdf4;
                    border-color: #86efac;
                    color: #166534;
                }

                #vien-phi-top-toast.is-warning {
                    background: #fffbeb;
                    border-color: #fde68a;
                    color: #92400e;
                }

                #vien-phi-top-toast.is-danger {
                    background: #fef2f2;
                    border-color: #fecaca;
                    color: #991b1b;
                }
            `;

            document.head.appendChild(style);
        }

        toast = document.createElement("div");

        toast.id = "vien-phi-top-toast";
        toast.hidden = true;

        toast.setAttribute("role", "alert");
        toast.setAttribute("aria-live", "assertive");

        // Đặt ở body để không bị vùng cuộn popup che.
        document.body.appendChild(toast);

        return toast;
    }

    function hideTopToast() {
        clearTimeout(toastTimer);
        toastTimer = null;

        const toast = $("vien-phi-top-toast");

        if (!toast) return;

        toast.classList.remove("show");

        setTimeout(() => {
            if (!toast.classList.contains("show")) {
                toast.hidden = true;
                toast.textContent = "";
            }
        }, 310);
    }

    function showTopToast(
        message,
        type = "danger",
        duration = 5000
    ) {
        const toast = ensureTopToast();

        clearTimeout(toastTimer);

        toast.textContent =
            message || "Có lỗi xảy ra.";

        toast.className = `is-${type}`;
        toast.hidden = false;

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                toast.classList.add("show");
            });
        });

        toastTimer = setTimeout(() => {
            hideTopToast();
        }, duration);
    }

    // =====================================================
    // 4. THÔNG TIN NHÂN VIÊN TIẾP NHẬN
    // =====================================================

    function currentReceptionistName() {
        const selectors = [
            "[data-receptionist-name]",
            "[data-current-user-name]",
            ".reception-header .user-name",
            ".reception-header .user-info strong",
            ".header-user-info strong",
            ".header-user .user-name",
            ".header-profile .user-name",
            ".topbar-user-name",
            ".user-details .user-name",
            ".user-details strong",
            ".user-info .user-name",
            ".user-info strong",
            ".account-info strong"
        ];

        for (const selector of selectors) {
            const node =
                document.querySelector(selector);

            if (!node || root.contains(node)) {
                continue;
            }

            const name =
                String(node.textContent || "").trim();

            if (
                name
                && !name.includes("@")
                && name.length <= 90
                && !/^nhân viên tiếp nhận$/i.test(name)
            ) {
                return name;
            }
        }

        return "";
    }

    function successfulPayment(payment) {
        return [
            "ThanhCong",
            "DaThanhToan"
        ].includes(payment?.trangThai);
    }

    function collectorName(payment) {
        const name = String(
            payment?.tenNguoiThu ?? ""
        ).trim();

        if (name) return name;

        if (positiveId(payment?.maNguoiThu)) {
            return `Nhân viên #${payment.maNguoiThu}`;
        }

        // Webhook SePay hiện chưa lưu MaNguoiThu.
        // Không gán tên người đang xem thành người
        // đã thu trong lịch sử giao dịch.
        if (
            successfulPayment(payment)
            && payment?.phuongThucThanhToan
                === "Chuyển khoản"
        ) {
            return "SePay tự động";
        }

        return "Chưa xác định";
    }

    function responsibleReceptionistText(invoice) {
        if (!invoice) {
            return "Chưa ghi nhận";
        }

        const collectors = new Set();

        for (const payment of invoice.lichSuThanhToan) {
            if (successfulPayment(payment)) {
                collectors.add(collectorName(payment));
            }
        }

        const name = currentReceptionistName();

        const hasAutoSepay =
            invoice.lichSuThanhToan.some(payment =>
                successfulPayment(payment)
                && payment.phuongThucThanhToan
                    === "Chuyển khoản"
                && !payment.tenNguoiThu
                && !positiveId(payment.maNguoiThu)
            );

        if (hasAutoSepay && name) {
            return `SePay tự động · NV tiếp nhận: ${name}`;
        }

        if (collectors.size) {
            return [...collectors].join(", ");
        }

        return "Chưa ghi nhận";
    }

    // =====================================================
    // 5. ĐIỀU KIỆN HÓA ĐƠN
    // =====================================================

    function getSelectedInvoice() {
        if (!data || !selectedId) {
            return null;
        }

        return data.danhSachHoaDon.find(
            invoice =>
                positiveId(invoice.maHoaDon)
                    === selectedId
        ) || null;
    }

    function canPrint(invoice) {
        if (!invoice) return false;

        return invoice.trangThai === "DaThanhToan"
            && invoice.trangThaiHienThi !== "Cần đối soát"
            && cents(invoice.tongTien) > 0n
            && cents(invoice.conPhaiThu) === 0n
            && cents(invoice.daThanhToan)
                === cents(invoice.tongTien);
    }

    function hasAmountDue(invoice) {
        return !!invoice
            && invoice.trangThai !== "DaHuy"
            && cents(invoice.conPhaiThu) > 0n;
    }

    function canPay(invoice) {
        const loaiDuocThu = [
            "PhiKham",
            "CanLamSang"
        ];

        return hasAmountDue(invoice)
            && loaiDuocThu.includes(invoice.loaiHoaDon)
            && invoice.trangThai === "ChuaThanhToan"
            && invoice.choPhepThanhToan === true
            && invoice.trangThaiHienThi !== "Cần đối soát";
    }

    function canReceive(invoice) {
        return !!invoice
            && invoice.loaiHoaDon === "PhiKham"
            && canPrint(invoice)
            && data?.trangThaiLichKham
                !== "DaTiepNhan";
    }

    function selectedMethod() {
        return root.querySelector(
            'input[name="vienPhiPhuongThuc"]:checked'
        )?.value || "TIEN_MAT";
    }

    function statusClass(invoice) {
        if (
            invoice.trangThaiHienThi === "Cần đối soát"
        ) {
            return "is-error";
        }

        return invoice.trangThai === "DaThanhToan"
            ? "is-paid"
            : "is-unpaid";
    }

    // =====================================================
    // 6. THÔNG TIN PHÒNG KHÁM
    // =====================================================

    async function fetchRoom(visitId, signal) {
        try {
            const response = await fetch(
                `${API_HOA_DON}${visitId}/phong`,
                {
                    method: "GET",
                    headers: authHeaders(),
                    cache: "no-store",
                    credentials: "same-origin",
                    signal
                }
            );

            if (!response.ok) {
                throw new Error(
                    `Không đọc được phòng (HTTP ${response.status}).`
                );
            }

            const result = await response.json();

            if (
                positiveId(result.maLichKham) !== visitId
                || result.xacDinh !== true
                || !String(result.tenPhong ?? "").trim()
            ) {
                return {
                    tenPhong: null,
                    thongBao: result.thongBao
                        || "Chưa xác định phòng khám."
                };
            }

            return {
                tenPhong: String(result.tenPhong).trim(),
                thongBao: null
            };

        } catch (error) {
            if (error.name !== "AbortError") {
                console.warn(
                    "Không lấy được phòng viện phí:",
                    error
                );
            }

            return {
                tenPhong: null,
                thongBao: "Chưa xác định phòng khám."
            };
        }
    }

    function renderRoom() {
        const name =
            room?.tenPhong || "Chưa xác định phòng";

        write("vien-phi-room", name);
        write("vien-phi-payment-room", name);

        const banner = $("vien-phi-room");

        if (banner) {
            banner.title = room?.thongBao || name;
        }
    }

    // =====================================================
    // 7. HỘP XÁC NHẬN THANH TOÁN
    // =====================================================

    function ensureDialog() {
        if ($("vien-phi-cash-confirm")) return;

        root.insertAdjacentHTML(
            "beforeend",
            `
            <div id="vien-phi-cash-confirm"
                 class="fee-payment-confirm-overlay"
                 hidden>

                <div class="fee-payment-confirm-box"
                     role="dialog"
                     aria-modal="true"
                     aria-labelledby="vien-phi-confirm-title">

                    <div class="fee-payment-confirm-icon">
                        <i id="vien-phi-confirm-icon"
                           class="fa-solid fa-wallet"></i>
                    </div>

                    <h3 id="vien-phi-confirm-title">
                        Xác nhận thanh toán
                    </h3>

                    <p id="vien-phi-confirm-text"></p>

                    <div class="fee-payment-confirm-actions">
                        <button id="vien-phi-cancel-cash"
                                class="fee-payment-cancel"
                                type="button">
                            Hủy
                        </button>

                        <button id="vien-phi-accept-cash"
                                class="fee-payment-accept"
                                type="button">
                            Xác nhận thu tiền
                        </button>
                    </div>
                </div>
            </div>
            `
        );

        $("vien-phi-cancel-cash").addEventListener(
            "click",
            closeDialog
        );

        $("vien-phi-accept-cash").addEventListener(
            "click",
            () => {
                if (dialogMode === "confirm") {
                    void submitCashPayment();
                } else {
                    closeDialog();
                }
            }
        );

        $("vien-phi-cash-confirm").addEventListener(
            "click",
            event => {
                if (
                    event.target
                        === $("vien-phi-cash-confirm")
                    && !processing
                ) {
                    closeDialog();
                }
            }
        );
    }

    function dialogOpen() {
        return !!$("vien-phi-cash-confirm")
            && !$("vien-phi-cash-confirm").hidden;
    }

    function openConfirm() {
        const invoice = getSelectedInvoice();

        if (
            !canPay(invoice)
            || selectedMethod() !== "TIEN_MAT"
            || processing
        ) {
            return;
        }

        ensureDialog();
        dialogMode = "confirm";

        const code = `HD${String(
            invoice.maHoaDon
        ).padStart(3, "0")}`;

        write(
            "vien-phi-confirm-title",
            "Xác nhận thanh toán viện phí"
        );

        write(
            "vien-phi-confirm-text",
            `Bạn xác nhận đã nhận đủ `
            + `${money(invoice.conPhaiThu)} tiền mặt `
            + `cho hóa đơn ${code}?\n\n`
            + `Người thu sẽ được lấy từ tài khoản `
            + `đang đăng nhập.`
        );

        $("vien-phi-confirm-icon").className =
            "fa-solid fa-wallet";

        $("vien-phi-cancel-cash").hidden = false;

        const accept = $("vien-phi-accept-cash");

        accept.disabled = false;
        accept.textContent = "Xác nhận thu tiền";

        $("vien-phi-cash-confirm").hidden = false;
        accept.focus();
    }

    function showResult(success, message) {
        ensureDialog();
        dialogMode = "result";

        write(
            "vien-phi-confirm-title",
            success
                ? "Thanh toán thành công"
                : "Không thể thanh toán"
        );

        write("vien-phi-confirm-text", message);

        $("vien-phi-confirm-icon").className =
            success
                ? "fa-solid fa-circle-check"
                : "fa-solid fa-circle-exclamation";

        $("vien-phi-cancel-cash").hidden = true;

        const accept = $("vien-phi-accept-cash");

        accept.disabled = false;
        accept.textContent = "Đóng";

        $("vien-phi-cash-confirm").hidden = false;
        accept.focus();
    }

    function closeDialog() {
        if (processing || !dialogOpen()) return;

        $("vien-phi-cash-confirm").hidden = true;

        $("vien-phi-open-payment").focus({
            preventScroll: true
        });
    }

    // =====================================================
    // 8. LOADING
    // =====================================================

    function setLoading(value) {
        $("vien-phi-loading").hidden = !value;

        $("vien-phi-body").setAttribute(
            "aria-busy",
            String(value)
        );

        if (value) {
            $("vien-phi-content").hidden = true;
            $("vien-phi-open-payment").hidden = true;
            $("vien-phi-print-invoice").disabled = true;
            clearError();
        }
    }

    function setProcessing(value) {
        processing = value;

        const accept = $("vien-phi-accept-cash");

        if (accept && dialogMode === "confirm") {
            accept.disabled = value;
            accept.textContent = value
                ? "Đang xử lý..."
                : "Xác nhận thu tiền";
        }

        if (value) {
            $("vien-phi-open-payment").disabled = true;
            $("vien-phi-print-invoice").disabled = true;
            $("vien-phi-payment-fields").disabled = true;

        } else if (data) {
            syncControls();
        }
    }

    // =====================================================
    // 9. KIỂM TRA DỮ LIỆU API
    // =====================================================

    function validateResponse(result, visitId) {
        if (
            !result
            || positiveId(result.maLichKham) !== visitId
            || !positiveId(result.maBenhNhan)
            || !Array.isArray(result.danhSachHoaDon)
        ) {
            throw new Error(
                "Dữ liệu viện phí không hợp lệ."
            );
        }

        [
            "tongTienHieuLuc",
            "tongDaThanhToan",
            "tongConPhaiThu"
        ].forEach(key => cents(result[key]));

        for (const invoice of result.danhSachHoaDon) {
            if (
                !positiveId(invoice.maHoaDon)
                || !Array.isArray(invoice.chiTiet)
                || !Array.isArray(invoice.lichSuThanhToan)
            ) {
                throw new Error(
                    "Thông tin hóa đơn không hợp lệ."
                );
            }

            [
                "tongTien",
                "daThanhToan",
                "conPhaiThu"
            ].forEach(key => cents(invoice[key]));
        }

        return result;
    }

    // =====================================================
    // 10. TẢI HÓA ĐƠN
    // =====================================================

    async function load(visitId) {
        const currentVersion = ++version;

        controller?.abort();

        const request = new AbortController();
        controller = request;

        data = null;
        room = null;

        setLoading(true);

        const timeout = setTimeout(
            () => request.abort(),
            20000
        );

        try {
            const response = await fetch(
                API_HOA_DON + visitId,
                {
                    method: "GET",
                    cache: "no-store",
                    credentials: "same-origin",
                    signal: request.signal,
                    headers: authHeaders()
                }
            );

            let result;

            try {
                result = await response.json();
            } catch {
                throw new Error(
                    "API viện phí không trả về JSON hợp lệ."
                );
            }

            if (!response.ok) {
                throw new Error(
                    result.message
                    || result.detail
                    || `Lỗi API viện phí HTTP ${response.status}`
                );
            }

            if (currentVersion !== version) {
                return false;
            }

            data = validateResponse(result, visitId);

            room = await fetchRoom(
                visitId,
                request.signal
            );

            if (currentVersion !== version) {
                return false;
            }

            render();

            return true;

        } catch (error) {
            if (currentVersion !== version) {
                return false;
            }

            data = null;

            $("vien-phi-content").hidden = true;

            showError(
                error.name === "AbortError"
                    ? "Tải viện phí quá thời gian chờ."
                    : error.message
            );

            return false;

        } finally {
            clearTimeout(timeout);

            if (currentVersion === version) {
                controller = null;
                setLoading(false);
                modal?.handleUpdate();
            }
        }
    }

    // =====================================================
    // 11. RENDER THÔNG TIN CHUNG
    // =====================================================

    function render() {
        if (!data) return;

        write(
            "vien-phi-patient-name",
            data.tenBenhNhan || "Chưa có tên"
        );

        write(
            "vien-phi-patient-code",
            `Mã BN: ${data.maBenhNhan}`
        );

        write(
            "vien-phi-appointment-code",
            `Lịch khám: #${data.maLichKham}`
        );

        write(
            "vien-phi-department",
            data.tenKhoa || "Chưa có khoa"
        );

        renderRoom();

        write(
            "vien-phi-total",
            money(data.tongTienHieuLuc)
        );

        write(
            "vien-phi-paid",
            money(data.tongDaThanhToan)
        );

        write(
            "vien-phi-due",
            money(data.tongConPhaiThu)
        );

        $("vien-phi-content").hidden = false;

        const invoices = data.danhSachHoaDon;

        $("vien-phi-empty").hidden =
            invoices.length > 0;

        $("vien-phi-workspace").hidden =
            invoices.length === 0;

        if (!invoices.length) {
            selectedId = null;

            $("vien-phi-invoice-list").replaceChildren();

            $("vien-phi-open-payment").hidden = true;
            $("vien-phi-print-invoice").disabled = true;

            write(
                "vien-phi-footer-status",
                "Chưa có hóa đơn"
            );

            return;
        }

        if (
            !invoices.some(
                item =>
                    positiveId(item.maHoaDon)
                        === selectedId
            )
        ) {
            const first = invoices.find(
                item =>
                    item.loaiHoaDon === "PhiKham"
                    && hasAmountDue(item)
            )
                || invoices.find(hasAmountDue)
                || invoices[0];

            selectedId = positiveId(first.maHoaDon);
        }

        write(
            "vien-phi-invoice-count",
            `${invoices.length} hóa đơn`
        );

        renderInvoiceList();
        renderSelected();
    }

    // =====================================================
    // 12. DANH SÁCH HÓA ĐƠN
    // =====================================================

    function renderInvoiceList() {
        const list = $("vien-phi-invoice-list");

        list.replaceChildren();

        for (const invoice of data.danhSachHoaDon) {
            const id = positiveId(invoice.maHoaDon);
            const code =
                `HD${String(id).padStart(3, "0")}`;

            const li = el("li");
            const button = el(
                "button",
                "fee-invoice-button"
            );

            button.type = "button";
            button.dataset.invoiceId = String(id);

            button.classList.toggle(
                "is-selected",
                id === selectedId
            );

            button.setAttribute(
                "aria-pressed",
                String(id === selectedId)
            );

            const icon = el(
                "i",
                "fa-solid fa-file-invoice fee-invoice-icon"
            );

            const main = el(
                "span",
                "fee-invoice-main"
            );

            const top = el(
                "span",
                "fee-invoice-line"
            );

            top.append(
                el(
                    "span",
                    "fee-invoice-name",
                    `${code} · ${
                        invoice.tenLoaiHoaDon || "Hóa đơn"
                    }`
                ),
                el(
                    "span",
                    "fee-invoice-amount",
                    money(invoice.tongTien)
                )
            );

            const bottom = el(
                "span",
                "fee-invoice-line"
            );

            bottom.append(
                el(
                    "span",
                    "fee-invoice-date",
                    dateTime(invoice.ngayLapHoaDon)
                ),
                el(
                    "span",
                    `reception-fee-status ${
                        statusClass(invoice)
                    }`,
                    invoice.trangThaiHienThi
                        || "Chưa xác định"
                )
            );

            main.append(top, bottom);
            button.append(icon, main);
            li.append(button);
            list.append(li);
        }
    }

    // =====================================================
    // 13. CHI TIẾT HÓA ĐƠN
    // =====================================================

    function renderSelected() {
        const invoice = getSelectedInvoice();

        if (!invoice) return;

        const code =
            `HD${String(invoice.maHoaDon).padStart(3, "0")}`;

        write(
            "vien-phi-detail-title",
            `Chi tiết hóa đơn ${code}`
        );

        const status = $("vien-phi-invoice-status");

        status.textContent =
            invoice.trangThaiHienThi
            || "Chưa xác định";

        status.className =
            `reception-fee-status ${
                statusClass(invoice)
            }`;

        write(
            "vien-phi-invoice-meta",
            `${invoice.tenLoaiHoaDon || "Hóa đơn"}`
            + ` · ${dateTime(invoice.ngayLapHoaDon)}`
        );

        write(
            "vien-phi-invoice-warning",
            invoice.thongBao || ""
        );

        $("vien-phi-invoice-warning").hidden =
            !invoice.thongBao;

        const rows = $("vien-phi-detail-rows");

        rows.replaceChildren();

        for (const item of invoice.chiTiet) {
            const tr = el("tr");

            tr.append(
                el(
                    "td",
                    "",
                    item.noiDung || "Khoản thu"
                ),
                el(
                    "td",
                    "fee-quantity",
                    String(item.soLuong)
                ),
                el(
                    "td",
                    "fee-money",
                    money(item.donGia)
                ),
                el(
                    "td",
                    "fee-money",
                    money(item.thanhTien)
                )
            );

            rows.append(tr);
        }

        $("vien-phi-details-empty").hidden =
            invoice.chiTiet.length > 0;

        write(
            "vien-phi-selected-total",
            money(invoice.tongTien)
        );

        write(
            "vien-phi-selected-paid",
            money(invoice.daThanhToan)
        );

        write(
            "vien-phi-selected-due",
            money(invoice.conPhaiThu)
        );

        // Hiển thị nhân viên phụ trách hiện tại
        // nhưng không thay thế dữ liệu thu tiền
        // thực tế do backend ghi nhận.
        write(
            "vien-phi-collector",
            responsibleReceptionistText(invoice)
        );

        renderHistory(invoice);

        $("vien-phi-payment-section").hidden =
            !hasAmountDue(invoice);

        write(
            "vien-phi-payment-amount",
            money(invoice.conPhaiThu)
        );

        $("vien-phi-open-payment").hidden = false;

        syncControls();

        const footer = $("vien-phi-footer-status");

        footer.className =
            "reception-fee-footer-status";

        if (invoice.trangThai === "DaHuy") {
            footer.textContent = "Hóa đơn đã hủy";

        } else if (
            invoice.trangThaiHienThi === "Cần đối soát"
        ) {
            footer.textContent = "Cần đối soát dữ liệu";

        } else if (canPrint(invoice)) {
            footer.textContent = "Đã thanh toán đủ";
            footer.classList.add("is-paid");

        } else {
            footer.textContent =
                `Còn phải thu: ${money(invoice.conPhaiThu)}`;

            footer.classList.add("is-due");
        }

        modal?.handleUpdate();
    }

    // =====================================================
    // 14. LỊCH SỬ THANH TOÁN
    // =====================================================

    function renderHistory(invoice) {
        const section = $("vien-phi-history-section");
        const list = $("vien-phi-history-list");

        list.replaceChildren();

        const payments = invoice.lichSuThanhToan;

        section.hidden = payments.length === 0;

        if (!payments.length) return;

        for (const payment of payments) {
            const success =
                successfulPayment(payment);

            const code =
                `TT${String(
                    payment.maThanhToan
                ).padStart(3, "0")}`;

            const card = el(
                "article",
                "fee-history-card"
            );

            const header = el(
                "div",
                "fee-history-header"
            );

            header.append(
                el("strong", "", code),
                el(
                    "span",
                    `reception-fee-status ${
                        success ? "is-paid" : "is-error"
                    }`,
                    success
                        ? "Thành công"
                        : payment.trangThai
                            || "Chưa xác định"
                )
            );

            const fields = el(
                "dl",
                "fee-history-fields"
            );

            const details = [
                [
                    "Thời gian",
                    dateTime(payment.ngayThanhToan)
                ],
                [
                    "Hóa đơn",
                    `HD${String(
                        invoice.maHoaDon
                    ).padStart(3, "0")}`
                ],
                [
                    "Số tiền",
                    money(payment.soTien)
                ],
                [
                    "Phương thức",
                    payment.phuongThucThanhToan
                        || "Chưa ghi nhận"
                ],
                [
                    "Người thu",
                    collectorName(payment)
                ],
                [
                    "Trạng thái",
                    payment.trangThai
                        || "Chưa xác định"
                ],
                [
                    "Mã giao dịch",
                    payment.maGiaoDich || "Không có"
                ]
            ];

            for (const [label, value] of details) {
                fields.append(
                    el("dt", "", label),
                    el("dd", "", value)
                );
            }

            card.append(header, fields);
            list.append(card);
        }
    }

    // =====================================================
    // 15. ĐỔI NÚT THANH TOÁN / TIẾP NHẬN
    // =====================================================

    function setActionButton(mode = "PAY") {
        const button = $("vien-phi-open-payment");

        if (!button) return;

        const icon = button.querySelector("i");
        const text = button.querySelector("span");

        button.hidden = false;

        if (mode === "RECEIVE") {
            if (icon) {
                icon.className =
                    "fa-solid fa-user-check";
            }

            if (text) {
                text.textContent = "Tiếp nhận";
            }

        } else {
            if (icon) {
                icon.className =
                    "fa-solid fa-credit-card";
            }

            if (text) {
                text.textContent = "Thanh toán";
            }
        }
    }

    function handleReceiveClick() {
        const invoice = getSelectedInvoice();

        if (!canReceive(invoice)) {
            showTopToast(
                "Bệnh nhân chưa đủ điều kiện chuyển sang bước tiếp nhận."
            );
            return;
        }

        const patientId =
            positiveId(data?.maBenhNhan);

        const visitId =
            positiveId(currentVisitId);

        if (!patientId || !visitId) {
            showTopToast(
                "Không xác định được bệnh nhân hoặc lịch khám."
            );
            return;
        }

        // Giữ đúng nghiệp vụ:
        // Thanh toán đủ mới được sang bước tiếp nhận.
        // Chưa cập nhật DaTiepNhan tại đây.
        // Việc lưu sinh hiệu và xác nhận tiếp nhận
        // được xử lý tại trang hồ sơ bệnh nhân.

        closeSepayPanel();
        hideTopToast();

        const params = new URLSearchParams({
            maLichKham: String(visitId),
            from: "vienphi"
        });

        window.location.assign(
            `/TiepNhan/ho-so-benh-nhan/${patientId}`
            + `?${params.toString()}`
        );
    }

    // =====================================================
    // 16. ĐIỀU KHIỂN NÚT
    // =====================================================

    function syncControls() {
        const invoice = getSelectedInvoice();

        const button =
            $("vien-phi-open-payment");

        const print =
            $("vien-phi-print-invoice");

        const fields =
            $("vien-phi-payment-fields");

        if (!invoice) {
            setActionButton("PAY");

            button.disabled = true;
            print.disabled = true;
            fields.disabled = true;

            return;
        }

        const payable = canPay(invoice);
        const printable = canPrint(invoice);
        const method = selectedMethod();

        print.disabled =
            processing || !printable;

        // Sau khi thanh toán đủ PHÍ KHÁM,
        // chuyển nút sang bước tiếp nhận.
        if (canReceive(invoice)) {
            setActionButton("RECEIVE");

            button.disabled = processing;

            button.title =
                "Mở hồ sơ để thực hiện tiếp nhận bệnh nhân";

            fields.disabled = true;

            write(
                "vien-phi-payment-notice",
                "Bệnh nhân đã thanh toán đủ. "
                + "Nhấn Tiếp nhận để chuyển đến "
                + "hồ sơ và hoàn tất bước tiếp nhận."
            );

            return;
        }

        // Nếu đã tiếp nhận rồi.
        if (
            printable
            && invoice.loaiHoaDon === "PhiKham"
            && data?.trangThaiLichKham
                === "DaTiepNhan"
        ) {
            setActionButton("RECEIVE");

            const text = button.querySelector("span");

            if (text) {
                text.textContent = "Đã tiếp nhận";
            }

            button.disabled = true;
            button.title = "Bệnh nhân đã được tiếp nhận";

            fields.disabled = true;

            return;
        }

        setActionButton("PAY");

        fields.disabled = !payable || processing;

        // Cho phép bấm để hiện lỗi QR khi
        // bệnh nhân chưa được gọi.
        // Việc tạo QR vẫn phải qua backend.
        const qrCanExplain =
            method === "CHUYEN_KHOAN"
            && invoice.loaiHoaDon === "PhiKham"
            && invoice.trangThai === "ChuaThanhToan"
            && hasAmountDue(invoice)
            && invoice.trangThaiHienThi
                !== "Cần đối soát";

        button.disabled =
            processing || (!payable && !qrCanExplain);

        if (method === "CHUYEN_KHOAN") {
            button.title = payable
                ? "Hiển thị QR chuyển khoản SePay"
                : "Kiểm tra điều kiện tạo QR";
        } else {
            button.title = payable
                ? "Thanh toán phí khám"
                : invoice.thongBao
                    || "Không được phép thanh toán";
        }

        if (!hasAmountDue(invoice)) {
            write("vien-phi-payment-notice", "");
            return;
        }

        if (!payable) {
            write(
                "vien-phi-payment-notice",
                invoice.thongBao
                    || "Hóa đơn chưa đủ điều kiện thu tiền."
            );

        } else if (method === "TIEN_MAT") {
            write(
                "vien-phi-payment-notice",
                "Kiểm tra tổng hóa đơn và phòng khám. "
                + "Sau khi đã nhận đủ tiền mặt, "
                + "nhấn Thanh toán để xác nhận thu tiền."
            );

        } else {
            write(
                "vien-phi-payment-notice",
                "Nhấn Thanh toán để hiển thị mã QR SePay. "
                + "Chỉ ghi nhận đã thanh toán "
                + "sau khi Webhook xác nhận."
            );
        }
    }

    // =====================================================
    // 17. XỬ LÝ NÚT THANH TOÁN / TIẾP NHẬN
    // =====================================================

    function handlePayClick() {
        if (processing || dialogOpen()) return;

        const invoice = getSelectedInvoice();

        if (!invoice) return;

        // Đã thanh toán đủ:
        // nút hiện tại là Tiếp nhận.
        if (canReceive(invoice)) {
            handleReceiveClick();
            return;
        }

        // Chưa đủ điều kiện tạo QR.
        if (!canPay(invoice)) {
            if (selectedMethod() === "CHUYEN_KHOAN") {
                showTopToast(
                    "Hóa đơn chưa đủ điều kiện tạo QR.",
                    "danger",
                    5000
                );
            } else {
                showTopToast(
                    invoice.thongBao
                        || "Hóa đơn chưa đủ điều kiện thanh toán.",
                    "danger",
                    5000
                );
            }

            return;
        }

        // Chuyển khoản:
        // gọi API QR ngay.
        if (selectedMethod() === "CHUYEN_KHOAN") {
            void openSepayQr();
            return;
        }

        // Tiền mặt:
        // giữ nguyên hành vi cuộn xuống cuối.
        const body = $("vien-phi-body");

        const remainingScroll =
            body.scrollHeight
            - body.clientHeight
            - body.scrollTop;

        if (remainingScroll > 32) {
            body.scrollTo({
                top: body.scrollHeight,
                behavior: "smooth"
            });

            return;
        }

        openConfirm();
    }

    // =====================================================
    // 18. THU TIỀN MẶT
    // =====================================================

    async function submitCashPayment() {
        if (
            processing
            || dialogMode !== "confirm"
        ) {
            return;
        }

        const invoice = getSelectedInvoice();

        if (
            !canPay(invoice)
            || selectedMethod() !== "TIEN_MAT"
        ) {
            showResult(
                false,
                "Hóa đơn không đủ điều kiện thanh toán."
            );

            return;
        }

        const maHoaDon =
            positiveId(invoice.maHoaDon);

        const maLichKham = currentVisitId;

        setProcessing(true);
        clearError();

        try {
            const response = await fetch(
                `${API_THU_TIEN}${maHoaDon}/thu-tien-mat`,
                {
                    method: "POST",
                    cache: "no-store",
                    credentials: "same-origin",
                    headers: authHeaders()
                }
            );

            let result;

            try {
                result = await response.json();
            } catch {
                throw new Error(
                    "Không đọc được kết quả thanh toán. "
                    + "Hãy kiểm tra hóa đơn trước khi thử lại."
                );
            }

            if (
                !response.ok
                || result?.success !== true
            ) {
                throw new Error(
                    result.message
                    || result.detail
                    || "Không thể ghi nhận thanh toán."
                );
            }

            const refreshed =
                await load(maLichKham);

            showResult(
                true,
                `Hóa đơn: HD${String(
                    maHoaDon
                ).padStart(3, "0")}\n`
                + `Số tiền: ${money(result.soTien)}\n`
                + `Người thu: ${
                    result.tenNguoiThu
                        || "Chưa xác định"
                }\n`
                + `Mã thanh toán: ${result.maThanhToan}\n`
                + `Phòng khám: ${
                    room?.tenPhong
                        || "Chưa xác định"
                }`
                + (
                    refreshed
                        ? ""
                        : "\nVui lòng tải lại viện phí "
                            + "để xem lịch sử thanh toán."
                )
            );

        } catch (error) {
            showResult(
                false,
                (error.message || "Thanh toán thất bại.")
                + "\nHãy kiểm tra lại dữ liệu hóa đơn "
                + "trước khi thao tác lần nữa."
            );

        } finally {
            setProcessing(false);
        }
    }

    // =====================================================
    // 19. GIAO DIỆN QR SEPAY
    // =====================================================

    function ensureSepayPanel() {
        const existing =
            $("vien-phi-sepay-panel");

        if (existing) return existing;

        const notice =
            $("vien-phi-payment-notice");

        if (!notice) {
            throw new Error(
                "Không tìm thấy vị trí hiển thị QR."
            );
        }

        const style =
            document.createElement("style");

        style.textContent = `
            #vien-phi-modal .vien-phi-sepay-panel {
                margin-top: 15px;
                padding: 16px;
                border: 1px solid #bfdbfe;
                border-radius: 10px;
                background: #fff;
                font-size: 13px;
                color: #334155;
            }

            #vien-phi-modal .vien-phi-sepay-panel h5 {
                margin: 0 0 12px;
                font-size: 15px;
                font-weight: 700;
                color: #1e40af;
            }

            #vien-phi-modal .vien-phi-sepay-img {
                display: block;
                margin: 12px auto;
                width: min(100%, 270px);
                height: auto;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
            }

            #vien-phi-modal .vien-phi-sepay-details {
                display: grid;
                grid-template-columns:
                    110px minmax(0, 1fr);
                gap: 9px;
                margin: 12px 0;
            }

            #vien-phi-modal .vien-phi-sepay-details dt {
                color: #64748b;
            }

            #vien-phi-modal .vien-phi-sepay-details dd {
                margin: 0;
                font-weight: 700;
                overflow-wrap: anywhere;
            }

            #vien-phi-modal .vien-phi-sepay-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }

            #vien-phi-modal .vien-phi-sepay-actions button {
                border: 1px solid #bfdbfe;
                background: #eff6ff;
                border-radius: 7px;
                padding: 8px 10px;
                color: #1d4ed8;
                font-size: 12px;
                font-weight: 600;
            }

            #vien-phi-modal .vien-phi-sepay-status {
                margin: 12px 0 0;
                color: #1e40af;
                line-height: 1.6;
            }
        `;

        root.append(style);

        const panel = el(
            "section",
            "vien-phi-sepay-panel"
        );

        panel.id = "vien-phi-sepay-panel";
        panel.hidden = true;

        panel.innerHTML = `
            <h5>
                Chuyển khoản qua SePay (Test Mode)
            </h5>

            <p>
                Mã QR mô phỏng để kiểm thử.
                Không chuyển tiền thật.
            </p>

            <img id="vien-phi-sepay-img"
                 class="vien-phi-sepay-img"
                 alt="Mã QR chuyển khoản phí khám"
                 hidden>

            <dl class="vien-phi-sepay-details">
                <dt>Ngân hàng</dt>
                <dd id="vien-phi-sepay-bank">—</dd>

                <dt>Số tài khoản</dt>
                <dd id="vien-phi-sepay-account">—</dd>

                <dt>Số tiền</dt>
                <dd id="vien-phi-sepay-amount">—</dd>

                <dt>Nội dung CK</dt>
                <dd id="vien-phi-sepay-content">—</dd>
            </dl>

            <div class="vien-phi-sepay-actions">
                <button id="vien-phi-sepay-copy"
                        type="button">
                    Sao chép nội dung
                </button>

                <button id="vien-phi-sepay-check"
                        type="button">
                    Kiểm tra thanh toán
                </button>

                <button id="vien-phi-sepay-close"
                        type="button">
                    Ẩn mã QR
                </button>
            </div>

            <p id="vien-phi-sepay-status"
               class="vien-phi-sepay-status"
               role="status"
               aria-live="polite">
            </p>
        `;

        notice.insertAdjacentElement(
            "afterend",
            panel
        );

        $("vien-phi-sepay-close").addEventListener(
            "click",
            closeSepayPanel
        );

        $("vien-phi-sepay-check").addEventListener(
            "click",
            () => {
                void checkSepayPayment();
            }
        );

        $("vien-phi-sepay-copy").addEventListener(
            "click",
            async () => {
                const content =
                    $("vien-phi-sepay-content").textContent;

                try {
                    await navigator.clipboard.writeText(
                        content
                    );

                    write(
                        "vien-phi-sepay-status",
                        "Đã sao chép nội dung chuyển khoản."
                    );

                } catch {
                    write(
                        "vien-phi-sepay-status",
                        "Không sao chép được, "
                        + "hãy sao chép thủ công."
                    );
                }
            }
        );

        return panel;
    }

    function closeSepayPanel() {
        if (sepayTimer !== null) {
            clearInterval(sepayTimer);
            sepayTimer = null;
        }

        ++sepaySequence;

        sepayInvoiceId = null;
        sepayVisitId = null;

        const panel = $("vien-phi-sepay-panel");

        if (panel) {
            panel.hidden = true;
        }
    }

    // =====================================================
    // 20. GỌI API TẠO QR
    // =====================================================

    async function openSepayQr() {
        const invoice = getSelectedInvoice();

        if (
            processing
            || !canPay(invoice)
            || selectedMethod() !== "CHUYEN_KHOAN"
        ) {
            return;
        }

        const invoiceId =
            positiveId(invoice.maHoaDon);

        const visitId = currentVisitId;

        const panel = ensureSepayPanel();

        if (
            !panel.hidden
            && sepayInvoiceId === invoiceId
        ) {
            panel.scrollIntoView({
                behavior: "smooth",
                block: "nearest"
            });

            return;
        }

        closeSepayPanel();

        const requestSequence = ++sepaySequence;

        setProcessing(true);
        clearError();

        try {
            const response = await fetch(
                `${API_THU_TIEN}${invoiceId}/sepay-qr`,
                {
                    method: "GET",
                    cache: "no-store",
                    credentials: "same-origin",
                    headers: authHeaders()
                }
            );

            const result = await response.json()
                .catch(() => null);

            if (
                !response.ok
                || result?.success !== true
            ) {
                throw new Error(
                    result?.message
                    || `Không lấy được QR (HTTP ${response.status}).`
                );
            }

            if (
                requestSequence !== sepaySequence
                || currentVisitId !== visitId
                || selectedId !== invoiceId
                || selectedMethod() !== "CHUYEN_KHOAN"
            ) {
                return;
            }

            const qrUrl =
                String(result.qrUrl || "");

            const qr = new URL(qrUrl);

            const code =
                String(result.noiDung || "");

            const amount =
                String(result.soTien ?? "");

            if (
                positiveId(result.maHoaDon) !== invoiceId
                || positiveId(result.maLichKham)
                    !== visitId
                || !/^MED\d{6,8}$/.test(code)
                || qr.protocol !== "https:"
                || qr.hostname !== "vietqr.app"
                || cents(amount)
                    !== cents(invoice.conPhaiThu)
            ) {
                throw new Error(
                    "Thông tin QR không khớp "
                    + "với hóa đơn đang chọn."
                );
            }

            sepayInvoiceId = invoiceId;
            sepayVisitId = visitId;

            write(
                "vien-phi-sepay-bank",
                result.nganHang || "MBBank"
            );

            write(
                "vien-phi-sepay-account",
                result.soTaiKhoan || "—"
            );

            write(
                "vien-phi-sepay-amount",
                money(amount)
            );

            write(
                "vien-phi-sepay-content",
                code
            );

            const image =
                $("vien-phi-sepay-img");

            image.hidden = false;
            image.src = qrUrl;

            image.onerror = () => {
                write(
                    "vien-phi-sepay-status",
                    "Không tải được ảnh QR. "
                    + "Bạn vẫn có thể dùng nội dung "
                    + "chuyển khoản để mô phỏng trên SePay."
                );
            };

            panel.hidden = false;

            write(
                "vien-phi-sepay-status",
                "Đang chờ SePay xác nhận. "
                + "Hãy mô phỏng giao dịch tiền vào "
                + "với đúng số tiền và nội dung trên."
            );

            panel.scrollIntoView({
                behavior: "smooth",
                block: "nearest"
            });

            // Tự kiểm tra mỗi 4 giây.
            sepayTimer = setInterval(() => {
                void checkSepayPayment();
            }, 4000);

        } catch (error) {
            if (
                requestSequence === sepaySequence
            ) {
                // LỖI QR HIỆN DẠNG TOAST 5 GIÂY.
                // Không hiển thị ở đầu popup nữa.
                showTopToast(
                    error.message
                    || "Không thể tạo mã QR SePay.",
                    "danger",
                    5000
                );
            }

        } finally {
            setProcessing(false);
        }
    }

    // =====================================================
    // 21. KIỂM TRA THANH TOÁN SEPAY
    // =====================================================

    async function checkSepayPayment() {
        if (
            sepayPolling
            || !sepayInvoiceId
            || !sepayVisitId
        ) {
            return;
        }

        const seq = sepaySequence;
        const invoiceId = sepayInvoiceId;
        const visitId = sepayVisitId;

        sepayPolling = true;

        try {
            const response = await fetch(
                API_HOA_DON + visitId,
                {
                    method: "GET",
                    cache: "no-store",
                    credentials: "same-origin",
                    headers: authHeaders()
                }
            );

            const result = await response.json()
                .catch(() => null);

            if (!response.ok) {
                throw new Error(
                    result?.message
                    || `HTTP ${response.status}`
                );
            }

            if (
                seq !== sepaySequence
                || currentVisitId !== visitId
            ) {
                return;
            }

            const invoice =
                result?.danhSachHoaDon?.find(
                    item =>
                        positiveId(item.maHoaDon)
                            === invoiceId
                );

            if (!invoice) {
                throw new Error(
                    "Không tìm thấy hóa đơn trong dữ liệu mới."
                );
            }

            if (
                invoice.trangThai === "DaThanhToan"
                && cents(invoice.conPhaiThu) === 0n
            ) {
                const viaTransfer =
                    invoice.lichSuThanhToan?.some(
                        payment =>
                            payment.phuongThucThanhToan
                                === "Chuyển khoản"
                            && successfulPayment(payment)
                    );

                closeSepayPanel();

                const refreshed = await load(visitId);

                showResult(
                    true,
                    `Hóa đơn HD${String(
                        invoiceId
                    ).padStart(3, "0")} `
                    + "đã thanh toán đủ.\n"
                    + (
                        viaTransfer
                            ? "Đã ghi nhận chuyển khoản từ SePay."
                            : "Đã ghi nhận thanh toán "
                                + "trên hệ thống."
                    )
                    + (
                        refreshed
                            ? ""
                            : "\nVui lòng tải lại viện phí "
                                + "để xem lịch sử."
                    )
                );

            } else {
                write(
                    "vien-phi-sepay-status",
                    "Chưa nhận được xác nhận thanh toán. "
                    + "Vui lòng chờ SePay hoặc nhấn "
                    + "Kiểm tra thanh toán."
                );
            }

        } catch (error) {
            if (seq === sepaySequence) {
                write(
                    "vien-phi-sepay-status",
                    "Chưa kiểm tra được trạng thái: "
                    + error.message
                );
            }

        } finally {
            sepayPolling = false;
        }
    }

    // =====================================================
    // 22. IN HÓA ĐƠN
    // =====================================================

    function inHoaDon() {
        const invoice = getSelectedInvoice();

        if (!invoice || !canPrint(invoice)) {
            showError(
                "Chỉ được in hóa đơn đã thanh toán đủ."
            );
            return;
        }

        const code =
            `HD${String(invoice.maHoaDon).padStart(3, "0")}`;

        const rows = invoice.chiTiet.map(item => `
            <tr>
                <td>${escapeHtml(
                    item.noiDung || "Khoản thu"
                )}</td>
                <td>${escapeHtml(item.soLuong)}</td>
                <td>${escapeHtml(money(item.donGia))}</td>
                <td>${escapeHtml(money(item.thanhTien))}</td>
            </tr>
        `).join("");

        const collectors = new Set();

        for (const payment of invoice.lichSuThanhToan) {
            if (successfulPayment(payment)) {
                collectors.add(collectorName(payment));
            }
        }

        const printWindow = window.open(
            "",
            "_blank",
            "width=900,height=750"
        );

        if (!printWindow) {
            showError(
                "Trình duyệt đã chặn cửa sổ in hóa đơn."
            );
            return;
        }

        const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Hóa đơn ${escapeHtml(code)}</title>
<style>
    @page {
        size: A4;
        margin: 18mm;
    }

    body {
        font-family: Arial, sans-serif;
        color: #1e293b;
        font-size: 13px;
        line-height: 1.6;
    }

    h1 {
        color: #2563eb;
        text-align: center;
    }

    h2 {
        font-size: 16px;
        margin-top: 25px;
    }

    .center {
        text-align: center;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 14px;
    }

    th, td {
        padding: 9px;
        border: 1px solid #cbd5e1;
        text-align: left;
    }

    th {
        background: #eff6ff;
    }

    .totals {
        max-width: 350px;
        margin: 24px 0 20px auto;
    }

    .totals p {
        display: flex;
        justify-content: space-between;
    }

    .note {
        margin-top: 25px;
        color: #64748b;
        font-size: 11px;
    }
</style>
</head>

<body>
<h1>MEDCARE HOSPITAL</h1>

<p class="center">
    <strong>
        PHIẾU VIỆN PHÍ - ${escapeHtml(code)}
    </strong>
</p>

<p>
    <strong>Bệnh nhân:</strong>
    ${escapeHtml(data.tenBenhNhan)}
</p>

<p>
    <strong>Mã bệnh nhân:</strong>
    ${escapeHtml(data.maBenhNhan)}
</p>

<p>
    <strong>Lịch khám:</strong>
    ${escapeHtml(data.maLichKham)}
</p>

<p>
    <strong>Khoa:</strong>
    ${escapeHtml(data.tenKhoa || "Chưa xác định")}
</p>

<p>
    <strong>Phòng khám:</strong>
    <b>${escapeHtml(
        room?.tenPhong || "Chưa xác định"
    )}</b>
</p>

<p>
    <strong>Ngày lập:</strong>
    ${escapeHtml(dateTime(invoice.ngayLapHoaDon))}
</p>

<h2>Chi tiết khoản thu</h2>

<table>
    <thead>
        <tr>
            <th>Nội dung</th>
            <th>SL</th>
            <th>Đơn giá</th>
            <th>Thành tiền</th>
        </tr>
    </thead>

    <tbody>${rows}</tbody>
</table>

<div class="totals">
    <p>
        <span>Tổng hóa đơn</span>
        <strong>
            ${escapeHtml(money(invoice.tongTien))}
        </strong>
    </p>

    <p>
        <span>Đã thu</span>
        <strong>
            ${escapeHtml(money(invoice.daThanhToan))}
        </strong>
    </p>

    <p>
        <span>Còn phải thu</span>
        <strong>
            ${escapeHtml(money(invoice.conPhaiThu))}
        </strong>
    </p>
</div>

<p>
    <strong>Người thu tiền:</strong>
    ${escapeHtml(
        collectors.size
            ? [...collectors].join(", ")
            : "Chưa ghi nhận"
    )}
</p>

<h2>Lịch sử thanh toán</h2>

${invoice.lichSuThanhToan.map(payment => `
    <p>
        TT${escapeHtml(payment.maThanhToan)}
        · ${escapeHtml(dateTime(payment.ngayThanhToan))}
        · ${escapeHtml(money(payment.soTien))}
        · ${escapeHtml(
            payment.phuongThucThanhToan || "—"
        )}
        · ${escapeHtml(collectorName(payment))}
    </p>
`).join("")}

<p class="note">
    Thời điểm in:
    ${escapeHtml(new Date().toLocaleString("vi-VN"))}
</p>

</body>
</html>`;

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();

        printWindow.setTimeout(() => {
            if (!printWindow.closed) {
                printWindow.focus();
                printWindow.print();
            }
        }, 350);
    }

    // =====================================================
    // 23. MỞ POPUP VIỆN PHÍ
    // =====================================================

    async function mo(maLichKham, trigger = null) {
        if (!window.bootstrap?.Modal) {
            console.error(
                "Chưa nạp Bootstrap Modal."
            );
            return false;
        }

        if (processing || dialogOpen()) {
            return false;
        }

        const id = positiveId(maLichKham);

        if (!modal) {
            modal = window.bootstrap.Modal
                .getOrCreateInstance(root);
        }

        opener = trigger || document.activeElement;

        closeSepayPanel();
        hideTopToast();

        currentVisitId = id;
        selectedId = null;

        const cash = root.querySelector(
            'input[name="vienPhiPhuongThuc"][value="TIEN_MAT"]'
        );

        if (cash) cash.checked = true;

        modal.show();

        if (!id) {
            showError("Mã lịch khám không hợp lệ.");
            return false;
        }

        return await load(id);
    }

    function dong() {
        if (!processing && !dialogOpen()) {
            modal?.hide();
        }
    }

    async function lamMoi() {
        if (
            !processing
            && !dialogOpen()
            && currentVisitId
            && root.classList.contains("show")
        ) {
            return await load(currentVisitId);
        }

        return false;
    }

    // =====================================================
    // 24. SỰ KIỆN GIAO DIỆN
    // =====================================================

    $("vien-phi-invoice-list").addEventListener(
        "click",
        event => {
            const button =
                event.target instanceof Element
                    ? event.target.closest(
                        "button[data-invoice-id]"
                    )
                    : null;

            if (
                !button
                || !data
                || processing
                || dialogOpen()
            ) {
                return;
            }

            closeSepayPanel();

            selectedId =
                positiveId(button.dataset.invoiceId);

            const cash = root.querySelector(
                'input[name="vienPhiPhuongThuc"][value="TIEN_MAT"]'
            );

            if (cash) cash.checked = true;

            renderInvoiceList();
            renderSelected();
        }
    );

    root.querySelectorAll(
        'input[name="vienPhiPhuongThuc"]'
    ).forEach(radio => {
        radio.addEventListener(
            "change",
            () => {
                closeSepayPanel();
                syncControls();
            }
        );
    });

    // Nút Thanh toán hoặc Tiếp nhận.
    $("vien-phi-open-payment").addEventListener(
        "click",
        event => {
            event.preventDefault();
            handlePayClick();
        }
    );

    // In hóa đơn.
    $("vien-phi-print-invoice").addEventListener(
        "click",
        event => {
            event.preventDefault();

            if (!processing && !dialogOpen()) {
                inHoaDon();
            }
        }
    );

    // Phím ESC đóng hộp xác nhận.
    root.addEventListener(
        "keydown",
        event => {
            if (
                event.key === "Escape"
                && dialogOpen()
            ) {
                event.preventDefault();
                event.stopPropagation();
                closeDialog();
            }
        },
        true
    );

    // Đóng popup.
    root.addEventListener(
        "hide.bs.modal",
        event => {
            if (processing || dialogOpen()) {
                event.preventDefault();
                return;
            }

            closeSepayPanel();
            hideTopToast();

            ++version;
            controller?.abort();

            controller = null;
            data = null;
            room = null;
            currentVisitId = null;
            selectedId = null;

            setLoading(false);
        }
    );

    root.addEventListener(
        "hidden.bs.modal",
        () => {
            if (opener?.isConnected) {
                opener.focus({
                    preventScroll: true
                });
            }

            opener = null;
        }
    );

    // Mở từ danh sách lịch khám.
    document.addEventListener(
        "click",
        event => {
            const button =
                event.target instanceof Element
                    ? event.target.closest(
                        "button[data-vienphi-lichkham]"
                    )
                    : null;

            if (!button || button.disabled) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            void mo(
                button.dataset.vienphiLichkham,
                button
            );
        },
        true
    );

    // =====================================================
    // 25. API DÙNG CHUNG
    // =====================================================

    window.VienPhi = Object.freeze({
        mo,
        dong,
        lamMoi
    });

    setLoading(false);

})();
