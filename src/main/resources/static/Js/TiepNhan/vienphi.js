(() => {
    "use strict";

    const $ = id => document.getElementById(id);
    const root = $("vien-phi-modal");

    if (!root) return;

    const API = "/api/tiepnhan/hoa-don/lich-kham/";
    const moneyFormatter = new Intl.NumberFormat("vi-VN");

    let modal = null;
    let data = null;
    let currentVisitId = null;
    let selectedId = null;
    let activeTab = "details";

    let controller = null;
    let version = 0;
    let opener = null;

    // =====================================================
    // HÀM HỖ TRỢ
    // =====================================================

    function positiveId(value) {
        const text = String(value ?? "");
        const number = Number(text);

        return /^\d+$/.test(text)
            && Number.isSafeInteger(number)
            && number > 0
                ? number
                : null;
    }

    // Biểu diễn tiền bằng số nguyên, đơn vị 1/100 đồng.
    function cents(value) {
        const match = /^(\d+)(?:\.(\d{1,2}))?$/
            .exec(String(value ?? ""));

        if (!match) {
            throw new Error("Dữ liệu số tiền không hợp lệ.");
        }

        return BigInt(match[1]) * 100n
            + BigInt(
                (match[2] || "").padEnd(2, "0")
            );
    }

    function money(value) {
        const amount = cents(value);
        const fraction = amount % 100n;

        return moneyFormatter.format(amount / 100n)
            + (
                fraction
                    ? `,${String(fraction).padStart(2, "0")}`
                    : ""
            )
            + "đ";
    }

    function dateTime(value) {
        const match =
            /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/
                .exec(String(value || ""));

        return match
            ? `${match[3]}/${match[2]}/${match[1]}`
                + ` · ${match[4]}:${match[5]}`
            : "Chưa ghi nhận";
    }

    function element(tag, className, text) {
        const node = document.createElement(tag);

        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;

        return node;
    }

    function write(id, text) {
        $(id).textContent = text;
    }

    function badgeClass(invoice) {
        if (invoice.trangThaiHienThi === "Cần đối soát") {
            return "is-error";
        }

        if (invoice.trangThai === "DaThanhToan") {
            return "is-paid";
        }

        if (
            ["ChuaThanhToan", "ThanhToanMotPhan"]
                .includes(invoice.trangThai)
        ) {
            return "is-unpaid";
        }

        return "";
    }

    function showError(message) {
        write("vien-phi-message", message);
        $("vien-phi-message").hidden = false;
    }

    function setLoading(value) {
        $("vien-phi-loading").hidden = !value;

        $("vien-phi-body").setAttribute(
            "aria-busy",
            String(value)
        );

        if (value) {
            $("vien-phi-content").hidden = true;
            $("vien-phi-message").hidden = true;

            write("vien-phi-footer-status", "");
        }

        // Chưa kết nối API thu tiền.
        $("vien-phi-payment-section").hidden = true;
        $("vien-phi-payment-fields").disabled = true;

        $("vien-phi-confirm-payment").disabled = true;
        $("vien-phi-confirm-payment").hidden = true;
    }

    // =====================================================
    // KIỂM TRA DỮ LIỆU API
    // =====================================================

    function validateResponse(result, visitId) {
        if (
            !result
            || positiveId(result.maLichKham) !== visitId
            || !positiveId(result.maBenhNhan)
            || !Array.isArray(result.danhSachHoaDon)
        ) {
            throw new Error(
                "Dữ liệu viện phí trả về không đúng "
                + "lịch khám hoặc định dạng."
            );
        }

        [
            "tongTienHieuLuc",
            "tongDaThanhToan",
            "tongConPhaiThu"
        ].forEach(key => cents(result[key]));

        const seen = new Set();

        for (const invoice of result.danhSachHoaDon) {
            const id = positiveId(invoice?.maHoaDon);

            if (
                !id
                || seen.has(id)
                || !Array.isArray(invoice.chiTiet)
                || !Array.isArray(invoice.lichSuThanhToan)
            ) {
                throw new Error(
                    "Danh sách hóa đơn không hợp lệ."
                );
            }

            seen.add(id);

            [
                "tongTien",
                "daThanhToan",
                "conPhaiThu"
            ].forEach(key => cents(invoice[key]));

            for (const item of invoice.chiTiet) {
                if (!item || !positiveId(item.maCTHoaDon)) {
                    throw new Error(
                        "Chi tiết hóa đơn không hợp lệ."
                    );
                }

                cents(item.donGia);
                cents(item.thanhTien);
            }

            for (const payment of invoice.lichSuThanhToan) {
                if (
                    !payment
                    || !positiveId(payment.maThanhToan)
                ) {
                    throw new Error(
                        "Lịch sử thanh toán không hợp lệ."
                    );
                }

                cents(payment.soTien);
            }
        }

        return result;
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

    // =====================================================
    // TẢI VIỆN PHÍ
    // =====================================================

    async function load(visitId) {
        const requestVersion = ++version;

        controller?.abort();

        const requestController = new AbortController();

        controller = requestController;
        data = null;

        setLoading(true);

        const timer = setTimeout(
            () => requestController.abort(),
            20000
        );

        try {
            const token = getToken();

            if (!token) {
                throw new Error(
                    "Phiên đăng nhập chưa có token. "
                    + "Vui lòng đăng nhập lại."
                );
            }

            const response = await fetch(API + visitId, {
                method: "GET",
                cache: "no-store",
                signal: requestController.signal,

                headers: {
                    Accept: "application/json",
                    Authorization: /^Bearer\s/i.test(token)
                        ? token
                        : `Bearer ${token}`
                }
            });

            const text = await response.text();

            let result;

            try {
                result = JSON.parse(text);
            } catch {
                throw new Error(
                    "Máy chủ chưa trả về dữ liệu JSON hợp lệ. "
                    + "Hãy kiểm tra phiên đăng nhập."
                );
            }

            if (!response.ok) {
                throw new Error(
                    result?.message
                    || result?.detail
                    || (
                        response.status === 401
                            ? "Phiên đăng nhập đã hết hạn."
                            : response.status === 403
                                ? "Bạn không có quyền xem viện phí "
                                    + "của lịch khám này."
                                : "Không thể tải thông tin viện phí."
                    )
                );
            }

            // Bỏ kết quả cũ nếu đã chuyển sang lịch khác hoặc đóng popup.
            if (requestVersion !== version) return;

            data = validateResponse(result, visitId);

            render();
        } catch (error) {
            if (requestVersion !== version) return;

            data = null;

            $("vien-phi-content").hidden = true;

            showError(
                error.name === "AbortError"
                    ? "Tải viện phí quá thời gian chờ. "
                        + "Hãy đóng popup và mở lại."
                    : error.message
            );
        } finally {
            clearTimeout(timer);

            if (requestVersion === version) {
                controller = null;

                setLoading(false);
                modal?.handleUpdate();
            }
        }
    }

    // =====================================================
    // HIỂN THỊ TỔNG HỢP
    // =====================================================

    function render() {
        write(
            "vien-phi-patient-name",
            data.tenBenhNhan || "Chưa có tên bệnh nhân"
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

        write("vien-phi-total", money(data.tongTienHieuLuc));
        write("vien-phi-paid", money(data.tongDaThanhToan));
        write("vien-phi-due", money(data.tongConPhaiThu));

        $("vien-phi-content").hidden = false;

        const invoices = data.danhSachHoaDon;

        $("vien-phi-empty").hidden = invoices.length > 0;

        $("vien-phi-workspace").hidden =
            invoices.length === 0;

        if (!invoices.length) {
            selectedId = null;

            $("vien-phi-invoice-list").replaceChildren();

            write(
                "vien-phi-footer-status",
                "Chưa có hóa đơn"
            );

            $("vien-phi-footer-status").className =
                "reception-fee-footer-status";

            return;
        }

        if (
            !invoices.some(
                item => positiveId(item.maHoaDon) === selectedId
            )
        ) {
            const unpaid = item =>
                item.trangThai !== "DaHuy"
                && cents(item.conPhaiThu) > 0n;

            const first = invoices.find(
                item => item.loaiHoaDon === "PhiKham"
                    && unpaid(item)
            )
                || invoices.find(unpaid)
                || invoices.find(
                    item => item.trangThai !== "DaHuy"
                )
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
    // DANH SÁCH HÓA ĐƠN BÊN TRÁI
    // =====================================================

    function renderInvoiceList() {
        const list = $("vien-phi-invoice-list");

        list.replaceChildren();

        for (const invoice of data.danhSachHoaDon) {
            const id = positiveId(invoice.maHoaDon);

            const li = element("li");
            const button = element(
                "button",
                "fee-invoice-button"
            );

            button.type = "button";
            button.dataset.invoiceId = String(id);

            button.classList.toggle(
                "is-selected",
                id === selectedId
            );

            button.classList.toggle(
                "is-cancelled",
                invoice.trangThai === "DaHuy"
            );

            button.setAttribute(
                "aria-pressed",
                String(id === selectedId)
            );

            const code = `HD${String(id).padStart(3, "0")}`;

            const typeName = invoice.tenLoaiHoaDon
                || "Chưa phân loại";

            button.setAttribute(
                "aria-label",
                `Xem hóa đơn ${code}, ${typeName}`
            );

            const icon = element(
                "i",
                "fa-solid fa-file-invoice fee-invoice-icon"
            );

            icon.setAttribute("aria-hidden", "true");

            const main = element(
                "span",
                "fee-invoice-main"
            );

            const top = element(
                "span",
                "fee-invoice-line"
            );

            top.append(
                element(
                    "span",
                    "fee-invoice-name",
                    `${code} · ${typeName}`
                ),
                element(
                    "span",
                    "fee-invoice-amount",
                    money(invoice.tongTien)
                )
            );

            const bottom = element(
                "span",
                "fee-invoice-line"
            );

            bottom.append(
                element(
                    "span",
                    "fee-invoice-date",
                    dateTime(invoice.ngayLapHoaDon)
                ),
                element(
                    "span",
                    `reception-fee-status ${badgeClass(invoice)}`,
                    invoice.trangThaiHienThi || "Chưa xác định"
                )
            );

            main.append(top, bottom);
            button.append(icon, main);
            li.append(button);
            list.append(li);
        }
    }

    // =====================================================
    // CHI TIẾT HÓA ĐƠN ĐANG CHỌN
    // =====================================================

    function renderSelected() {
        const invoice = data?.danhSachHoaDon.find(
            item => positiveId(item.maHoaDon) === selectedId
        );

        if (!invoice) return;

        write(
            "vien-phi-detail-title",
            "Chi tiết hóa đơn "
            + `HD${String(selectedId).padStart(3, "0")}`
        );

        const badge = $("vien-phi-invoice-status");

        badge.textContent =
            invoice.trangThaiHienThi || "Chưa xác định";

        badge.className =
            `reception-fee-status ${badgeClass(invoice)}`;

        write(
            "vien-phi-invoice-meta",
            `${invoice.tenLoaiHoaDon || "Chưa phân loại"}`
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
            const tr = element("tr");

            tr.append(
                element(
                    "td",
                    "",
                    item.noiDung || `Chi tiết #${item.maCTHoaDon}`
                ),
                element(
                    "td",
                    "fee-quantity",
                    String(item.soLuong)
                ),
                element(
                    "td",
                    "fee-money",
                    money(item.donGia)
                ),
                element(
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

        renderHistory(invoice.lichSuThanhToan);
        selectTab(activeTab);

        const footer = $("vien-phi-footer-status");

        footer.className = "reception-fee-footer-status";

        if (invoice.trangThai === "DaHuy") {
            footer.textContent = "Hóa đơn đã hủy";
        } else if (
            invoice.trangThaiHienThi === "Cần đối soát"
        ) {
            footer.textContent = "Cần đối soát dữ liệu";
        } else if (
            invoice.trangThai === "DaThanhToan"
            && cents(invoice.conPhaiThu) === 0n
        ) {
            footer.textContent = "✓ Đã thanh toán đủ";
            footer.classList.add("is-paid");
        } else {
            footer.textContent =
                `Còn phải thu: ${money(invoice.conPhaiThu)}`;

            footer.classList.add("is-due");
        }
    }

    // =====================================================
    // LỊCH SỬ THANH TOÁN
    // =====================================================

    function renderHistory(payments) {
        const list = $("vien-phi-history-list");

        list.replaceChildren();

        write(
            "vien-phi-history-count",
            `${payments.length} lần thanh toán`
        );

        $("vien-phi-history-empty").hidden =
            payments.length > 0;

        for (const payment of payments) {
            const success = payment.trangThai === "ThanhCong";
            const failed = payment.trangThai === "ThatBai";

            const label = success
                ? "Thanh toán thành công"
                : failed
                    ? "Thanh toán thất bại"
                    : payment.trangThai === "DangXuLy"
                        ? "Đang xử lý"
                        : payment.trangThai || "Chưa xác định";

            const li = element("li");

            const card = element(
                "article",
                "fee-history-card "
                + (
                    success
                        ? "is-success"
                        : failed
                            ? "is-failed"
                            : ""
                )
            );

            const heading = element(
                "div",
                "fee-history-heading"
            );

            heading.append(
                element(
                    "span",
                    "reception-fee-status "
                    + (
                        success
                            ? "is-paid"
                            : failed
                                ? "is-error"
                                : ""
                    ),
                    label
                ),
                element(
                    "strong",
                    "fee-history-amount",
                    money(payment.soTien)
                )
            );

            const fields = element(
                "dl",
                "fee-history-fields"
            );

            const collector = payment.tenNguoiThu
                || (
                    positiveId(payment.maNguoiThu)
                        ? `Mã nhân viên: ${payment.maNguoiThu}`
                        : "Chưa ghi nhận"
                );

            const values = [
                [
                    "Mã thanh toán",
                    `TT${String(payment.maThanhToan).padStart(3, "0")}`
                ],
                [
                    "Thời gian",
                    dateTime(payment.ngayThanhToan)
                ],
                [
                    "Phương thức",
                    payment.phuongThucThanhToan || "Chưa ghi nhận"
                ],
                [
                    "Người thu",
                    collector
                ],
                [
                    "Mã giao dịch",
                    payment.maGiaoDich
                    || (
                        payment.phuongThucThanhToan === "Tiền mặt"
                            ? "Không áp dụng"
                            : "Chưa ghi nhận"
                    )
                ]
            ];

            for (const [key, value] of values) {
                fields.append(
                    element("dt", "", key),
                    element("dd", "", value)
                );
            }

            card.append(heading, fields);
            li.append(card);
            list.append(li);
        }
    }

    // =====================================================
    // CHUYỂN TAB
    // =====================================================

    function selectTab(name, focus = false) {
        activeTab = name === "history"
            ? "history"
            : "details";

        for (const key of ["details", "history"]) {
            const active = key === activeTab;
            const tab = $(`vien-phi-${key}-tab`);

            tab.classList.toggle("is-active", active);

            tab.setAttribute(
                "aria-selected",
                String(active)
            );

            tab.tabIndex = active ? 0 : -1;

            $(`vien-phi-${key}-panel`).hidden = !active;

            if (active && focus) tab.focus();
        }
    }

    // =====================================================
    // CÁC HÀM DÙNG TỪ DASHBOARD
    // =====================================================

    async function mo(maLichKham, trigger = null) {
        if (!window.bootstrap?.Modal) {
            console.error(
                "Popup viện phí cần Bootstrap bundle "
                + "được nạp trước vienphi.js."
            );

            return false;
        }

        const id = positiveId(maLichKham);

        if (!modal) {
            modal = window.bootstrap.Modal
                .getOrCreateInstance(root);
        }

        opener = trigger || document.activeElement;
        currentVisitId = id;
        selectedId = null;
        activeTab = "details";

        modal.show();

        if (!id) {
            ++version;

            controller?.abort();

            data = null;

            setLoading(false);

            $("vien-phi-content").hidden = true;

            write("vien-phi-footer-status", "");

            showError(
                "Mã lịch khám không hợp lệ. "
                + "Hãy chọn lại từ danh sách."
            );

            return false;
        }

        await load(id);

        return !!data;
    }

    function dong() {
        modal?.hide();
    }

    async function lamMoi() {
        if (
            currentVisitId
            && root.classList.contains("show")
        ) {
            await load(currentVisitId);
        }
    }

    // =====================================================
    // SỰ KIỆN CHỌN HÓA ĐƠN
    // =====================================================

    $("vien-phi-invoice-list")
        .addEventListener("click", event => {
            const button = event.target instanceof Element
                ? event.target.closest(
                    "button[data-invoice-id]"
                )
                : null;

            if (!button || !data) return;

            selectedId = positiveId(
                button.dataset.invoiceId
            );

            for (
                const item of $("vien-phi-invoice-list")
                    .querySelectorAll("button[data-invoice-id]")
            ) {
                const selected =
                    positiveId(item.dataset.invoiceId)
                    === selectedId;

                item.classList.toggle(
                    "is-selected",
                    selected
                );

                item.setAttribute(
                    "aria-pressed",
                    String(selected)
                );
            }

            renderSelected();
        });

    // =====================================================
    // SỰ KIỆN TAB VÀ BÀN PHÍM
    // =====================================================

    for (const name of ["details", "history"]) {
        const tab = $(`vien-phi-${name}-tab`);

        tab.addEventListener("click", () => {
            selectTab(name);
        });

        tab.addEventListener("keydown", event => {
            if (
                !["ArrowLeft", "ArrowRight", "Home", "End"]
                    .includes(event.key)
            ) {
                return;
            }

            event.preventDefault();

            selectTab(
                event.key === "Home"
                    ? "details"
                    : event.key === "End"
                        ? "history"
                        : activeTab === "details"
                            ? "history"
                            : "details",
                true
            );
        });
    }

    // =====================================================
    // ĐÓNG POPUP: HỦY YÊU CẦU CÒN ĐANG TẢI
    // =====================================================

    root.addEventListener("hide.bs.modal", () => {
        ++version;

        controller?.abort();

        controller = null;
        data = null;
        currentVisitId = null;

        setLoading(false);
    });

    root.addEventListener("hidden.bs.modal", () => {
        if (opener?.isConnected) {
            opener.focus({ preventScroll: true });
        }

        opener = null;
    });

    // =====================================================
    // NÚT VIỆN PHÍ TRÊN DANH SÁCH BỆNH NHÂN
    // data-vienphi-lichkham phải chứa mã lịch khám thật.
    // =====================================================

    document.addEventListener("click", event => {
        const button = event.target instanceof Element
            ? event.target.closest(
                "button[data-vienphi-lichkham]"
            )
            : null;

        if (!button || button.disabled) return;

        event.preventDefault();

        // Không kích hoạt thao tác mở hồ sơ của dòng bệnh nhân.
        event.stopPropagation();

        void mo(
            button.dataset.vienphiLichkham,
            button
        );
    }, true);

    window.VienPhi = Object.freeze({
        mo,
        dong,
        lamMoi
    });

    setLoading(false);
})();