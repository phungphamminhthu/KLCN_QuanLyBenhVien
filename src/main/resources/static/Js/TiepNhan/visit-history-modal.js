
/*
 * POPUP CHI TIẾT LỊCH SỬ KHÁM
 * Chỉ xem dữ liệu, không chỉnh sửa hồ sơ.
 */

(() => {
    "use strict";

    const API = "/api/tiepnhan/chi-tiet-lich-su";
    const $ = id => document.getElementById(id);

    const normal = value =>
        value === null
        || value === undefined
        || String(value).trim() === ""
            ? "Chưa có dữ liệu"
            : String(value).trim();

    const statusNames = {
        ChoGoi: "Chờ gọi",
        DaGoi: "Đã gọi",
        DaTiepNhan: "Đã tiếp nhận",
        ChoKham: "Chờ khám",
        DangKham: "Đang khám",
        ChoThanhToan: "Chờ thanh toán",
        ChoCLS: "Chờ cận lâm sàng",
        DangCLS: "Đang thực hiện cận lâm sàng",
        ChoLayThuoc: "Chờ lấy thuốc",
        DangLayThuoc: "Đang lấy thuốc",
        HoanTat: "Hoàn tất",
        DaHoanThanh: "Hoàn thành",
        ChoThucHien: "Chờ thực hiện"
    };

    let root = null;
    let trigger = null;
    let requestController = null;
    let oldBodyOverflow = "";

    // =====================================================
    // HÀM ĐỊNH DẠNG
    // =====================================================

    function label(status) {
        return statusNames[status] || normal(status);
    }

    function date(value) {
        const match =
            /^(\d{4})-(\d{2})-(\d{2})/
                .exec(String(value || ""));

        return match
            ? `${match[3]}/${match[2]}/${match[1]}`
            : normal(value);
    }

    function dateTime(value) {
        if (!value) {
            return "Chưa có dữ liệu";
        }

        const string = String(value).replace("T", " ");

        const match =
            /^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}:\d{2}))?/
                .exec(string);

        return match
            ? `${match[3]}/${match[2]}/${match[1]}`
              + `${match[4] ? " · " + match[4] : ""}`
            : string;
    }

    function money(value) {
        if (
            value === null
            || value === undefined
            || value === ""
        ) {
            return "Chưa có dữ liệu";
        }

        const number = Number(value);

        return Number.isFinite(number)
            ? new Intl.NumberFormat(
                "vi-VN",
                { maximumFractionDigits: 2 }
            ).format(number) + " đ"
            : normal(value);
    }

    function setText(id, value) {
        const node = $(id);

        if (node) {
            node.textContent = normal(value);
        }
    }

    function pair(parent, name, value) {
        const item = document.createElement("div");
        item.className = "vhm-pair";

        const key = document.createElement("span");
        key.className = "vhm-pair-label";
        key.textContent = name;

        const text = document.createElement("strong");
        text.className = "vhm-pair-value";
        text.textContent = normal(value);

        item.append(key, text);
        parent.append(item);

        return text;
    }

    function tableCell(
        row,
        value,
        className = ""
    ) {
        const cell = document.createElement("td");

        cell.className = className;
        cell.textContent = normal(value);

        row.append(cell);
        return cell;
    }

    function safeUrl(raw) {
        if (!raw || typeof raw !== "string") {
            return null;
        }

        try {
            const url = new URL(
                raw,
                window.location.origin
            );

            return url.protocol === "https:"
                || (
                    url.protocol === "http:"
                    && url.origin === window.location.origin
                )
                    ? url.href
                    : null;

        } catch {
            return null;
        }
    }

    // =====================================================
    // TẠO GIAO DIỆN POPUP
    // =====================================================

    function init() {
        if (root) {
            return;
        }

        const css = document.createElement("link");

        css.rel = "stylesheet";
        css.href =
            "/Css/TiepNhan/visit-history-modal.css";

        document.head.append(css);

        root = document.createElement("div");

        root.id = "visit-history-modal";
        root.className = "vhm-overlay";
        root.hidden = true;

        root.innerHTML = `
            <section
                class="vhm-shell"
                role="dialog"
                aria-modal="true"
                aria-labelledby="vhm-title"
                aria-describedby="vhm-subtitle"
                tabindex="-1">

                <header class="vhm-header">
                    <div>
                        <h2 id="vhm-title">
                            Chi tiết lịch sử khám
                        </h2>

                        <p id="vhm-subtitle">
                            Toàn bộ quá trình của lượt khám đã chọn
                        </p>
                    </div>

                    <button
                        id="vhm-close"
                        class="vhm-close"
                        type="button"
                        aria-label="Đóng">×</button>
                </header>

                <div class="vhm-content" id="vhm-content">

                    <p id="vhm-message"
                       class="vhm-message"
                       role="status">
                        Đang tải chi tiết lượt khám...
                    </p>

                    <div id="vhm-data" hidden>

                        <!-- THÔNG TIN LƯỢT KHÁM -->
                        <section class="vhm-section">
                            <h3>Thông tin lượt khám</h3>

                            <div class="vhm-info-grid">
                                <div
                                    id="vhm-visit-fields"
                                    class="vhm-info-card vhm-info-wide">
                                </div>

                                <div class="vhm-info-card">
                                    <h4>Thông tin bệnh nhân</h4>

                                    <div id="vhm-patient-fields"></div>
                                </div>
                            </div>
                        </section>

                        <!-- SỐ ĐO TRƯỚC KHÁM -->
                        <section class="vhm-section">
                            <h3>Số đo trước khám</h3>

                            <div class="vhm-vitals">

                                <div class="vhm-vital">
                                    <span>Cân nặng</span>
                                    <strong id="vhm-weight">—</strong>
                                </div>

                                <div class="vhm-vital">
                                    <span>Chiều cao</span>
                                    <strong id="vhm-height">—</strong>
                                </div>

                                <div class="vhm-vital">
                                    <span>Huyết áp tâm thu</span>
                                    <strong id="vhm-systolic">—</strong>
                                </div>

                                <div class="vhm-vital">
                                    <span>Huyết áp tâm trương</span>
                                    <strong id="vhm-diastolic">—</strong>
                                </div>

                            </div>
                        </section>

                        <!-- CẬN LÂM SÀNG -->
                        <section class="vhm-section">
                            <h3>Cận lâm sàng</h3>

                            <div class="vhm-table-scroll">
                                <table class="vhm-table">
                                    <thead>
                                        <tr>
                                            <th>STT</th>
                                            <th>Dịch vụ</th>
                                            <th>Phòng thực hiện</th>
                                            <th>Trạng thái</th>
                                            <th>Kết quả tóm tắt</th>
                                            <th>Chi tiết</th>
                                        </tr>
                                    </thead>

                                    <tbody id="vhm-cls-body"></tbody>
                                </table>
                            </div>

                            <p id="vhm-cls-empty"
                               class="vhm-empty"
                               hidden>
                                Chưa có chỉ định cận lâm sàng
                                cho lượt khám này.
                            </p>
                        </section>

                        <!-- HÓA ĐƠN THANH TOÁN -->
                        <section class="vhm-section">
                            <h3>Chi tiết thanh toán hóa đơn</h3>

                            <div id="vhm-invoices"></div>

                            <p id="vhm-billing-note"
                               class="vhm-empty"
                               hidden></p>
                        </section>

                        <!-- KẾT LUẬN -->
                        <section class="vhm-section">
                            <h3>Ghi chú / Kết luận</h3>

                            <div
                                id="vhm-conclusion"
                                class="vhm-conclusion">
                            </div>
                        </section>

                    </div>
                </div>

                <footer class="vhm-footer">
                    <button
                        id="vhm-bottom-close"
                        type="button">
                        Đóng
                    </button>
                </footer>

            </section>
        `;

        document.body.append(root);

        $("vhm-close").addEventListener(
            "click",
            close
        );

        $("vhm-bottom-close").addEventListener(
            "click",
            close
        );

        // Nhấn vùng tối bên ngoài để đóng
        root.addEventListener("click", event => {
            if (event.target === root) {
                close();
            }
        });

        // Escape và điều khiển bằng bàn phím
        root.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                event.preventDefault();
                close();
            }

            if (event.key !== "Tab") {
                return;
            }

            const visible = [
                ...root.querySelectorAll(
                    "button:not([disabled]), a[href]"
                )
            ].filter(element =>
                element.getClientRects().length > 0
            );

            if (!visible.length) {
                return;
            }

            if (
                event.shiftKey
                && document.activeElement === visible[0]
            ) {
                event.preventDefault();

                visible[visible.length - 1].focus();

            } else if (
                !event.shiftKey
                && document.activeElement
                    === visible[visible.length - 1]
            ) {
                event.preventDefault();
                visible[0].focus();
            }
        });
    }

    // =====================================================
    // MỞ POPUP VÀ GỌI API
    // =====================================================

    async function open(maLich, clicked) {
        init();

        requestController?.abort();
        requestController = new AbortController();

        trigger = clicked;

        oldBodyOverflow =
            document.body.style.overflow;

        document.body.style.overflow = "hidden";

        root.hidden = false;

        $("vhm-content").scrollTop = 0;
        $("vhm-data").hidden = true;
        $("vhm-message").hidden = false;

        $("vhm-message").textContent =
            "Đang tải chi tiết lượt khám...";

        $("vhm-close").focus();

        try {
            const token =
                sessionStorage.getItem("Token")
                || localStorage.getItem("Token")
                || sessionStorage.getItem("token")
                || localStorage.getItem("token");

            const headers = {
                Accept: "application/json"
            };

            if (token) {
                headers.Authorization =
                    /^Bearer\s/i.test(token)
                        ? token
                        : `Bearer ${token}`;
            }

            const response = await fetch(
                `${API}/${encodeURIComponent(maLich)}`,
                {
                    method: "GET",
                    cache: "no-store",
                    credentials: "same-origin",
                    headers,
                    signal: requestController.signal
                }
            );

            const data = await response.json()
                .catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.message
                    || data.detail
                    || (
                        response.status === 403
                            ? "Không có quyền xem lượt khám thuộc khoa khác."
                            : `Không tải được chi tiết lịch khám (HTTP ${response.status}).`
                    )
                );
            }

            if (!data.luotKham || !data.benhNhan) {
                throw new Error(
                    "Dữ liệu chi tiết lượt khám không hợp lệ."
                );
            }

            if (root.hidden) {
                return;
            }

            render(data);

            $("vhm-message").hidden = true;
            $("vhm-data").hidden = false;

        } catch (error) {
            if (
                error.name !== "AbortError"
                && !root.hidden
            ) {
                $("vhm-message").textContent =
                    error.message
                    || "Không tải được dữ liệu.";
            }
        }
    }

    // =====================================================
    // ĐÓNG POPUP
    // =====================================================

    function close() {
        if (!root || root.hidden) {
            return;
        }

        requestController?.abort();

        root.hidden = true;

        document.body.style.overflow =
            oldBodyOverflow;

        trigger?.focus?.();
        trigger = null;
    }

    // =====================================================
    // HIỂN THỊ THÔNG TIN KHÁM
    // =====================================================

    function render(data) {
        const l = data.luotKham;
        const p = data.benhNhan;

        const vitals = data.soDo || {};
        const exam = data.khamBenh || {};

        const visit = $("vhm-visit-fields");
        const patient = $("vhm-patient-fields");

        visit.replaceChildren();
        patient.replaceChildren();

        pair(
            visit,
            "Mã lịch khám",
            `#${l.maLichKham}`
        );

        pair(visit, "Ngày khám", date(l.ngayKham));

        pair(
            visit,
            "Giờ khám",
            String(l.gioKham || "").slice(0, 5)
        );

        pair(visit, "Khoa khám", l.tenKhoa);
        pair(visit, "Bác sĩ khám", l.tenBacSi);
        pair(visit, "Phòng khám", l.tenPhong);

        const status = pair(
            visit,
            "Trạng thái",
            label(l.trangThai)
        );

        status.classList.add("vhm-status");

        pair(visit, "Lý do khám", l.lyDoKham);

        pair(patient, "Họ và tên", p.hoTen);

        pair(
            patient,
            "Mã bệnh nhân",
            `BN-${p.maBenhNhan}`
        );

        pair(
            patient,
            "Ngày sinh",
            date(p.ngaySinh)
        );

        pair(patient, "Giới tính", p.gioiTinh);

        pair(
            patient,
            "Số điện thoại",
            p.soDienThoai
        );

        pair(patient, "Địa chỉ", p.diaChi);

        setText(
            "vhm-weight",
            vitals.canNang == null
                ? null
                : `${vitals.canNang} kg`
        );

        setText(
            "vhm-height",
            vitals.chieuCao == null
                ? null
                : `${vitals.chieuCao} cm`
        );

        setText(
            "vhm-systolic",
            vitals.huyetApTamThu == null
                ? null
                : `${vitals.huyetApTamThu} mmHg`
        );

        setText(
            "vhm-diastolic",
            vitals.huyetApTamTruong == null
                ? null
                : `${vitals.huyetApTamTruong} mmHg`
        );

        renderCls(data.canLamSang || []);
        renderInvoices(data.hoaDon || {});

        const conclusion =
            $("vhm-conclusion");

        conclusion.replaceChildren();

        pair(
            conclusion,
            "Triệu chứng",
            exam.trieuChung
        );

        pair(
            conclusion,
            "Chẩn đoán",
            exam.chanDoan
        );

        pair(
            conclusion,
            "Kết luận của bác sĩ",
            exam.ketLuan
        );

        pair(
            conclusion,
            "Hướng điều trị",
            exam.huongDieuTri
        );

        pair(
            conclusion,
            "Ngày tái khám",
            exam.ngayTaiKham
                ? date(exam.ngayTaiKham)
                : null
        );

        pair(
            conclusion,
            "Ghi chú tái khám",
            exam.ghiChuTaiKham
        );

        pair(
            conclusion,
            "Bác sĩ phụ trách",
            l.tenBacSi
        );
    }

    // =====================================================
    // HIỂN THỊ CẬN LÂM SÀNG
    // =====================================================

    function renderCls(items) {
        const body = $("vhm-cls-body");

        body.replaceChildren();

        $("vhm-cls-empty").hidden =
            items.length !== 0;

        items.forEach((item, index) => {
            const row = document.createElement("tr");

            tableCell(row, index + 1);
            tableCell(row, item.tenDichVu);
            tableCell(row, item.phong);

            const statusCell = tableCell(
                row,
                label(item.trangThai)
            );

            statusCell.classList.add("vhm-muted");

            tableCell(
                row,
                item.ketQuaTomTat
                || item.noiDungKetQua
            );

            const action =
                document.createElement("td");

            const button =
                document.createElement("button");

            button.type = "button";
            button.className = "vhm-link";
            button.textContent = "Xem kết quả";

            button.setAttribute(
                "aria-expanded",
                "false"
            );

            action.append(button);
            row.append(action);
            body.append(row);

            // Dòng mở rộng kết quả xét nghiệm
            const detailRow =
                document.createElement("tr");

            detailRow.hidden = true;

            const detailCell =
                document.createElement("td");

            detailCell.colSpan = 6;
            detailCell.className = "vhm-cls-detail";

            const grid =
                document.createElement("div");

            grid.className = "vhm-detail-grid";

            pair(
                grid,
                "Ngày chỉ định",
                dateTime(item.ngayChiDinh)
            );

            pair(
                grid,
                "Ngày có kết quả",
                dateTime(item.ngayKetQua)
            );

            pair(
                grid,
                "Loại chỉ định",
                item.loaiChiDinh
            );

            pair(
                grid,
                "Nội dung kết quả",
                item.noiDungKetQua
            );

            pair(
                grid,
                "Kết luận",
                item.ketQuaTomTat
            );

            detailCell.append(grid);

            // Bảng các chỉ số xét nghiệm
            if (
                Array.isArray(item.chiSo)
                && item.chiSo.length
            ) {
                const heading =
                    document.createElement("h4");

                heading.textContent =
                    "Các chỉ số xét nghiệm";

                detailCell.append(heading);

                const inner =
                    document.createElement("table");

                inner.className =
                    "vhm-table vhm-inner-table";

                inner.innerHTML = `
                    <thead>
                        <tr>
                            <th>Chỉ số</th>
                            <th>Giá trị</th>
                            <th>Đơn vị</th>
                            <th>Tham chiếu</th>
                            <th>Đánh giá</th>
                        </tr>
                    </thead>
                `;

                const tbody =
                    document.createElement("tbody");

                item.chiSo.forEach(cs => {
                    const r =
                        document.createElement("tr");

                    [
                        cs.tenChiSo,
                        cs.giaTri,
                        cs.donVi,
                        cs.giaTriThamChieu,
                        label(cs.trangThai)
                    ].forEach(v => tableCell(r, v));

                    tbody.append(r);
                });

                inner.append(tbody);
                detailCell.append(inner);
            }

            // Link xem tệp kết quả nếu đã lưu
            const url = safeUrl(item.fileURL);

            if (url) {
                const a =
                    document.createElement("a");

                a.href = url;
                a.target = "_blank";
                a.rel = "noopener noreferrer";

                a.className = "vhm-file-link";
                a.textContent = "Xem tệp kết quả";

                detailCell.append(a);
            }

            detailRow.append(detailCell);
            body.append(detailRow);

            button.addEventListener(
                "click",
                () => {
                    detailRow.hidden = !detailRow.hidden;

                    button.setAttribute(
                        "aria-expanded",
                        String(!detailRow.hidden)
                    );

                    button.textContent =
                        detailRow.hidden
                            ? "Xem kết quả"
                            : "Thu gọn";
                }
            );
        });
    }

    // =====================================================
    // HIỂN THỊ HÓA ĐƠN VÀ GIAO DỊCH
    // =====================================================

    function renderInvoices(wrapper) {
        const holder = $("vhm-invoices");
        holder.replaceChildren();

        const invoices =
            Array.isArray(wrapper.danhSach)
                ? wrapper.danhSach
                : [];

        const note = $("vhm-billing-note");

        note.hidden = !wrapper.ghiChu;
        note.textContent = wrapper.ghiChu || "";

        if (
            !invoices.length
            && !wrapper.ghiChu
        ) {
            note.hidden = false;

            note.textContent =
                "Chưa có hóa đơn cho lượt khám này.";
        }

        invoices.forEach(invoice => {
            const block =
                document.createElement("div");

            block.className = "vhm-invoice";

            // Thông tin hóa đơn
            const info =
                document.createElement("div");

            info.className = "vhm-invoice-info";

            const title =
                document.createElement("h4");

            title.textContent = "Thông tin hóa đơn";

            info.append(title);

            pair(
                info,
                "Mã hóa đơn",
                invoice.maHoaDon
            );

            pair(
                info,
                "Ngày lập",
                dateTime(invoice.ngayLap)
            );

            pair(
                info,
                "Trạng thái",
                label(invoice.trangThai)
            );

            // Bảng chi tiết hóa đơn
            const detail =
                document.createElement("div");

            detail.className =
                "vhm-table-scroll vhm-invoice-items";

            const table =
                document.createElement("table");

            table.className = "vhm-table";

            table.innerHTML = `
                <thead>
                    <tr>
                        <th>STT</th>
                        <th>Dịch vụ / Khoản thu</th>
                        <th>Số lượng</th>
                        <th>Đơn giá</th>
                        <th>Thành tiền</th>
                    </tr>
                </thead>
            `;

            const tbody =
                document.createElement("tbody");

            const items =
                Array.isArray(invoice.chiTiet)
                    ? invoice.chiTiet
                    : [];

            items.forEach((item, index) => {
                const row =
                    document.createElement("tr");

                tableCell(row, index + 1);
                tableCell(row, item.tenDichVu);
                tableCell(row, item.soLuong);

                tableCell(
                    row,
                    money(item.donGia)
                );

                tableCell(
                    row,
                    money(item.thanhTien)
                );

                tbody.append(row);
            });

            if (!items.length) {
                const row =
                    document.createElement("tr");

                const cell = tableCell(
                    row,
                    "Chưa có chi tiết hóa đơn."
                );

                cell.colSpan = 5;
                tbody.append(row);
            }

            table.append(tbody);
            detail.append(table);

            // Tổng tiền
            const summary =
                document.createElement("div");

            summary.className =
                "vhm-invoice-summary";

            pair(
                summary,
                "Tạm tính",
                money(invoice.tongTien)
            );

            pair(
                summary,
                "Giảm giá",
                money(invoice.giamGia)
            );

            pair(
                summary,
                "Tổng thanh toán",
                money(
                    invoice.soTienPhaiTra
                    ?? invoice.tongTien
                )
            );

            block.append(
                info,
                detail,
                summary
            );

            // Giao dịch thanh toán
            const payments =
                Array.isArray(invoice.thanhToan)
                    ? invoice.thanhToan
                    : [];

            const paymentPart =
                document.createElement("div");

            paymentPart.className = "vhm-payments";

            const heading =
                document.createElement("h4");

            heading.textContent =
                "Lịch sử giao dịch thanh toán";

            paymentPart.append(heading);

            if (payments.length) {
                const paymentTable =
                    document.createElement("table");

                paymentTable.className = "vhm-table";

                paymentTable.innerHTML = `
                    <thead>
                        <tr>
                            <th>Mã giao dịch</th>
                            <th>Ngày thanh toán</th>
                            <th>Phương thức</th>
                            <th>Số tiền</th>
                            <th>Trạng thái</th>
                        </tr>
                    </thead>
                `;

                const body =
                    document.createElement("tbody");

                payments.forEach(payment => {
                    const row =
                        document.createElement("tr");

                    tableCell(
                        row,
                        payment.maThanhToan
                    );

                    tableCell(
                        row,
                        dateTime(payment.ngayThanhToan)
                    );

                    tableCell(
                        row,
                        payment.phuongThuc
                    );

                    tableCell(
                        row,
                        money(payment.soTien)
                    );

                    tableCell(
                        row,
                        label(payment.trangThai)
                    );

                    body.append(row);
                });

                paymentTable.append(body);
                paymentPart.append(paymentTable);

            } else {
                const empty =
                    document.createElement("p");

                empty.className = "vhm-empty";

                empty.textContent =
                    "Chưa có giao dịch thanh toán "
                    + "liên kết với hóa đơn này.";

                paymentPart.append(empty);
            }

            block.append(paymentPart);
            holder.append(block);
        });
    }

    // =====================================================
    // BẮT SỰ KIỆN NHẤN VÀO LỊCH SỬ KHÁM
    //
    // Chặn điều hướng cũ và mở popup.
    // Không phải sửa patient-detail.js.
    // =====================================================

    document.addEventListener(
        "click",
        event => {
            if (
                event.defaultPrevented
                || event.button !== 0
                || event.ctrlKey
                || event.shiftKey
                || event.metaKey
                || event.altKey
            ) {
                return;
            }

            const anchor =
                event.target instanceof Element
                    ? event.target.closest(
                        "#profile-visit-list a[data-appointment-id]"
                    )
                    : null;

            if (!anchor) {
                return;
            }

            const id = Number(
                anchor.dataset.appointmentId
            );

            if (
                !Number.isSafeInteger(id)
                || id <= 0
            ) {
                return;
            }

            event.preventDefault();

            event.stopImmediatePropagation();

            void open(id, anchor);

        },
        true
    );
})();
