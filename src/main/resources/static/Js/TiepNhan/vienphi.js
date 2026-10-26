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
    let controller = null;
    let version = 0;
    let opener = null;

    let loading = false;
    let paying = false;
    let confirming = false;
    let exporting = false;

    const uncertainInvoices = new Set();

    // =====================================================
    // HÀM DÙNG CHUNG
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

    function cents(value) {
        const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(
            String(value ?? "")
        );

        if (!match) {
            throw new Error("Dữ liệu số tiền không hợp lệ.");
        }

        return BigInt(match[1]) * 100n
            + BigInt((match[2] || "").padEnd(2, "0"));
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
            ? `${match[3]}/${match[2]}/${match[1]} · `
                + `${match[4]}:${match[5]}`
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

    function getToken() {
        return (
            sessionStorage.getItem("Token")
            || localStorage.getItem("Token")
            || sessionStorage.getItem("token")
            || localStorage.getItem("token")
            || ""
        ).trim();
    }

    function authorization(token) {
        return /^Bearer\s/i.test(token)
            ? token
            : `Bearer ${token}`;
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
        $("vien-phi-message").className = "alert alert-danger";
        write("vien-phi-message", message);
        $("vien-phi-message").hidden = false;
    }

    function showSuccess(message, receipt = null) {
        const box = $("vien-phi-message");

        box.className = "alert alert-success";
        box.hidden = false;

        if (receipt) {
            fillPaymentNotice(box, receipt);
        } else {
            box.textContent = message;
        }
    }

    // =====================================================
    // NỘI DUNG THANH TOÁN NGẮN GỌN
    // =====================================================

    function paymentNotice(receipt) {
        const result = receipt.result;

        const summary =
            `${receipt.name} · `
            + `HD${String(result.maHoaDon).padStart(3, "0")} · `
            + money(result.soTien);

        if (receipt.type !== "CanLamSang") {
            return {
                summary,
                rooms: [],
                note: "Tiếp tục nhập số đo và xác nhận tiếp nhận."
            };
        }

        const rooms = Array.isArray(result.danhSachPhong)
            ? result.danhSachPhong.filter(
                room => room && typeof room === "object"
            )
            : [];

        const missing = !rooms.length || rooms.some(room =>
            !positiveId(room.maPhong)
            || typeof room.tenPhong !== "string"
            || !room.tenPhong.trim()
        );

        const note = result.trangThaiLichKham !== "ChoCLS"
            ? "Chưa đủ điều kiện thực hiện CLS. "
                + "Kiểm tra các khoản còn lại."
            : missing
                ? "Cần kiểm tra phân phòng CLS."
                : "";

        return { summary, rooms, note };
    }

    function fillPaymentNotice(container, receipt) {
        const { summary, rooms, note } = paymentNotice(receipt);

        container.replaceChildren(
            element("p", "mb-2", summary)
        );

        const seen = new Set();

        for (const room of rooms) {
            const name =
                positiveId(room.maPhong)
                && typeof room.tenPhong === "string"
                    ? room.tenPhong.trim()
                    : "";

            const service = typeof room.noiDung === "string"
                ? room.noiDung.trim()
                : "";

            const key = `${service}\n${name}`;

            if (seen.has(key)) continue;
            seen.add(key);

            const line = element("p", "mb-2");

            line.append(
                document.createTextNode(
                    (service || "Phòng CLS") + ": "
                ),
                element(
                    "strong",
                    "fw-bold",
                    name || "Chưa phân phòng"
                )
            );

            container.append(line);
        }

        if (note) {
            container.append(
                element("p", "mb-0", note)
            );
        }
    }

    // =====================================================
    // THÔNG BÁO ĐẨY THANH TOÁN THÀNH CÔNG
    // =====================================================

    function showPaymentSuccessToast(receipt) {
        root.querySelector(".fee-payment-success-toast")
            ?.dispatchEvent(new Event("fee:close-notice"));

        const notice = element(
            "section",
            "fee-confirm-toast fee-payment-success-toast"
        );

        notice.setAttribute("role", "status");
        notice.setAttribute("aria-live", "polite");
        notice.setAttribute("aria-atomic", "true");

        const title = element(
            "strong",
            "fee-confirm-title",
            "Thanh toán thành công"
        );

        const content = element(
            "div",
            "fee-confirm-text"
        );

        fillPaymentNotice(content, receipt);

        const actions = element(
            "div",
            "fee-confirm-actions"
        );

        const close = element(
            "button",
            "fee-confirm-accept",
            "Đã hiểu"
        );

        close.type = "button";

        let closed = false;

        function dismiss() {
            if (closed) return;
            closed = true;

            root.removeEventListener(
                "hidden.bs.modal",
                dismiss
            );

            notice.remove();
        }

        close.addEventListener("click", dismiss);
        notice.addEventListener("fee:close-notice", dismiss);

        notice.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                dismiss();
            }
        });

        root.addEventListener("hidden.bs.modal", dismiss);

        actions.append(close);
        notice.append(title, content, actions);
        root.append(notice);

        requestAnimationFrame(() => {
            if (!closed && notice.isConnected) {
                notice.classList.add("is-visible");
            }
        });
    }

    function selectedInvoice() {
        return data?.danhSachHoaDon.find(
            invoice =>
                positiveId(invoice.maHoaDon) === selectedId
        );
    }

    // =====================================================
    // ĐIỀU KIỆN THU TIỀN
    // =====================================================

    function invoicePayable(invoice) {
        return !!invoice
            && invoice.choPhepThanhToan === true
            && ["PhiKham", "CanLamSang"]
                .includes(invoice.loaiHoaDon)
            && invoice.trangThai === "ChuaThanhToan"
            && cents(invoice.daThanhToan) === 0n
            && cents(invoice.conPhaiThu) > 0n
            && cents(invoice.conPhaiThu)
                === cents(invoice.tongTien);
    }

    function canPay(invoice) {
        return invoicePayable(invoice)
            && (
                invoice.loaiHoaDon === "PhiKham"
                    ? data?.trangThaiLichKham === "DaGoi"
                    : data?.trangThaiLichKham === "ChoThanhToan"
            );
    }

    // =====================================================
    // ĐIỀU KIỆN XUẤT HÓA ĐƠN
    // =====================================================

    function exportUnavailableReason(invoice) {
        if (!invoice) {
            return "Chọn hóa đơn để xuất.";
        }

        if (invoice.trangThai === "DaHuy") {
            return "Hóa đơn đã hủy không được xuất.";
        }

        if (invoice.trangThaiHienThi === "Cần đối soát") {
            return "Cần đối soát dữ liệu trước khi xuất.";
        }

        if (
            invoice.trangThai !== "DaThanhToan"
            || cents(invoice.conPhaiThu) !== 0n
        ) {
            return "Thanh toán đủ để xuất hóa đơn.";
        }

        const total = cents(invoice.tongTien);

        const collected = invoice.lichSuThanhToan
            .filter(payment => payment.trangThai === "ThanhCong")
            .reduce(
                (sum, payment) => sum + cents(payment.soTien),
                0n
            );

        const details = invoice.chiTiet.reduce(
            (sum, item) => sum + cents(item.thanhTien),
            0n
        );

        if (
            total <= 0n
            || cents(invoice.daThanhToan) !== total
            || collected !== total
            || details !== total
        ) {
            return "Chi tiết hóa đơn và giao dịch thu tiền "
                + "chưa khớp. Cần kiểm tra lại.";
        }

        return "";
    }

    function updatePaymentUI() {
        const invoice = selectedInvoice();
        const eligible = canPay(invoice);
        const payable = invoicePayable(invoice);

        const busy = loading || paying || confirming || exporting;
        const blocked = uncertainInvoices.has(selectedId);

        const exportButton = $("vien-phi-export-invoice");

        if (exportButton) {
            const reason = exportUnavailableReason(invoice);

            const hint = exporting
                ? "Đang kiểm tra hóa đơn..."
                : reason || "In hoặc lưu PDF hóa đơn đang chọn";

            exportButton.disabled = busy || !!reason;
            exportButton.title = hint;

            const wrapper = $("vien-phi-export-wrapper");
            if (wrapper) wrapper.title = hint;
        }

        $("vien-phi-payment-section").hidden = !payable || loading;

        $("vien-phi-payment-fields").disabled =
            busy || !eligible || blocked;

        const button = $("vien-phi-confirm-payment");

        button.hidden = !payable || loading;
        button.disabled = busy || !eligible || blocked;

        button.querySelector("span").textContent = paying
            ? "Đang ghi nhận..."
            : "Xác nhận thu tiền";

        root.querySelectorAll(
            "[data-bs-dismiss='modal']"
        ).forEach(el => {
            el.disabled = paying || exporting;
        });

        $("vien-phi-invoice-list")
            .querySelectorAll("button")
            .forEach(el => {
                el.disabled = busy;
            });

        const transfer = root.querySelector(
            'input[name="vienPhiPhuongThuc"]:checked'
        )?.value === "CHUYEN_KHOAN";

        $("vien-phi-reference-group").hidden = !transfer;
        $("vien-phi-reference").required = transfer && eligible;

        if (payable && !eligible && !busy) {
            const hint = invoice.loaiHoaDon === "PhiKham"
                ? "Hãy gọi bệnh nhân trước khi thu phí khám."
                : "Chỉ thu phí CLS khi lịch ở trạng thái "
                    + "Chờ thanh toán.";

            button.title = hint;
            write("vien-phi-footer-status", hint);
        } else {
            button.title = "";
        }

        if (eligible && blocked && !busy) {
            write(
                "vien-phi-footer-status",
                "Cần kiểm tra kết quả giao dịch trước khi thu lại"
            );
        }
    }

    function resetPaymentFields() {
        const cash = root.querySelector(
            'input[name="vienPhiPhuongThuc"][value="TIEN_MAT"]'
        );

        if (cash) cash.checked = true;

        $("vien-phi-reference").value = "";
    }

    function setLoading(value) {
        loading = value;

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

        updatePaymentUI();
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

            ["tongTien", "daThanhToan", "conPhaiThu"]
                .forEach(key => cents(invoice[key]));

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

    // =====================================================
    // TẢI VIỆN PHÍ
    // =====================================================

    async function load(visitId) {
        if (paying || confirming) return false;

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
                credentials: "same-origin",
                signal: requestController.signal,
                headers: {
                    Accept: "application/json",
                    Authorization: authorization(token)
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

            if (requestVersion !== version) return false;

            data = validateResponse(result, visitId);

            for (const invoice of data.danhSachHoaDon) {
                if (
                    invoice.trangThai === "DaThanhToan"
                    && invoice.trangThaiHienThi === "Đã thanh toán"
                    && cents(invoice.conPhaiThu) === 0n
                ) {
                    uncertainInvoices.delete(
                        positiveId(invoice.maHoaDon)
                    );
                }
            }

            render();
            return true;
        } catch (error) {
            if (requestVersion !== version) return false;

            data = null;
            $("vien-phi-content").hidden = true;

            showError(
                error.name === "AbortError"
                    ? "Tải viện phí quá thời gian chờ. "
                        + "Hãy đóng popup và mở lại."
                    : error.message
            );

            return false;
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
    // THÔNG BÁO XÁC NHẬN THU TIỀN
    // =====================================================

    function requestPaymentConfirmation(message) {
        confirming = true;
        updatePaymentUI();

        return new Promise(resolve => {
            const previousFocus = document.activeElement;
            const notice = element("section", "fee-confirm-toast");

            notice.setAttribute("role", "alertdialog");
            notice.setAttribute(
                "aria-labelledby",
                "fee-confirm-title"
            );
            notice.setAttribute(
                "aria-describedby",
                "fee-confirm-text"
            );

            const title = element(
                "strong",
                "fee-confirm-title",
                "Xác nhận thu tiền"
            );
            title.id = "fee-confirm-title";

            const text = element(
                "p",
                "fee-confirm-text",
                message
            );
            text.id = "fee-confirm-text";

            const actions = element("div", "fee-confirm-actions");
            const cancel = element("button", "fee-confirm-cancel", "Hủy");

            const accept = element(
                "button",
                "fee-confirm-accept",
                "Xác nhận đã nhận tiền"
            );

            cancel.type = "button";
            accept.type = "button";

            actions.append(cancel, accept);
            notice.append(title, text, actions);
            root.append(notice);

            let finished = false;

            function finish(accepted) {
                if (finished) return;
                finished = true;

                root.removeEventListener("hide.bs.modal", onHide);
                notice.remove();

                confirming = false;
                updatePaymentUI();

                if (
                    root.classList.contains("show")
                    && previousFocus?.isConnected
                ) {
                    previousFocus.focus();
                }

                resolve(accepted);
            }

            function onHide(event) {
                if (!event.defaultPrevented) finish(false);
            }

            root.addEventListener("hide.bs.modal", onHide);

            cancel.addEventListener("click", () => finish(false));
            accept.addEventListener("click", () => finish(true));

            notice.addEventListener("keydown", event => {
                if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    finish(false);
                }
            });

            requestAnimationFrame(() => {
                if (finished) return;

                notice.classList.add("is-visible");
                cancel.focus();
            });
        });
    }

    // =====================================================
    // THU TIỀN
    // =====================================================

    async function confirmPayment() {
        const invoice = selectedInvoice();

        if (
            loading
            || paying
            || confirming
            || exporting
            || !canPay(invoice)
            || uncertainInvoices.has(selectedId)
        ) {
            return;
        }

        const invoiceId = positiveId(invoice.maHoaDon);
        const visitId = currentVisitId;
        const amount = cents(invoice.conPhaiThu);

        const method = root.querySelector(
            'input[name="vienPhiPhuongThuc"]:checked'
        )?.value;

        const reference = $("vien-phi-reference").value.trim();

        if (!["TIEN_MAT", "CHUYEN_KHOAN"].includes(method)) {
            showError("Hãy chọn phương thức thanh toán.");
            return;
        }

        if (
            method === "CHUYEN_KHOAN"
            && (!reference || reference.length > 255)
        ) {
            showError(
                "Nhập mã giao dịch chuyển khoản, tối đa 255 ký tự."
            );
            $("vien-phi-reference").focus();
            return;
        }

        const token = getToken();

        if (!token) {
            showError(
                "Phiên đăng nhập chưa có token. "
                + "Vui lòng đăng nhập lại."
            );
            return;
        }

        const label = method === "TIEN_MAT"
            ? "tiền mặt"
            : "chuyển khoản";

        const confirmationVersion = version;

        const accepted = await requestPaymentConfirmation(
            `Xác nhận đã nhận đủ ${money(invoice.conPhaiThu)} `
            + `bằng ${label}\n`
            + `cho hóa đơn HD${String(invoiceId).padStart(3, "0")} `
            + `của ${data.tenBenhNhan || "bệnh nhân"}?\n\n`
            + "Chỉ xác nhận sau khi đã kiểm tra nhận đủ tiền."
        );

        if (
            !accepted
            || version !== confirmationVersion
            || currentVisitId !== visitId
            || selectedId !== invoiceId
            || loading
            || paying
            || exporting
            || !canPay(selectedInvoice())
            || uncertainInvoices.has(invoiceId)
        ) {
            return;
        }

        paying = true;
        $("vien-phi-message").hidden = true;
        updatePaymentUI();

        write(
            "vien-phi-footer-status",
            "Đang ghi nhận thanh toán..."
        );

        const postController = new AbortController();

        const timer = setTimeout(
            () => postController.abort(),
            20000
        );

        let receipt = null;
        let succeeded = false;
        let knownRejection = false;
        let message = "";

        try {
            const response = await fetch(
                `/api/tiepnhan/hoa-don/${invoiceId}/thanh-toan`,
                {
                    method: "POST",
                    cache: "no-store",
                    credentials: "same-origin",
                    signal: postController.signal,
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        Authorization: authorization(token)
                    },
                    body: JSON.stringify({
                        maLichKham: visitId,
                        soTien: `${amount / 100n}.`
                            + String(amount % 100n).padStart(2, "0"),
                        phuongThucThanhToan: method,
                        maGiaoDich: method === "CHUYEN_KHOAN"
                            ? reference
                            : null
                    })
                }
            );

            const result = await response.json()
                .catch(() => null);

            if (!response.ok) {
                knownRejection =
                    response.status >= 400
                    && response.status < 500
                    && result?.success === false;

                throw new Error(
                    result?.message
                    || "Máy chủ chưa xác nhận được kết quả thanh toán."
                );
            }

            if (
                result?.success !== true
                || positiveId(result.maHoaDon) !== invoiceId
                || positiveId(result.maLichKham) !== visitId
                || !positiveId(result.maThanhToan)
                || cents(result.soTien) !== amount
            ) {
                throw new Error(
                    "Phản hồi thanh toán chưa hợp lệ. "
                    + "Cần kiểm tra lại lịch sử giao dịch."
                );
            }

            succeeded = true;
            uncertainInvoices.delete(invoiceId);

            receipt = {
                name: String(data?.tenBenhNhan || "").trim()
                    || "Bệnh nhân",
                type: invoice.loaiHoaDon,
                result
            };

            const notice = paymentNotice(receipt);
            message = "Thanh toán thành công. " + notice.summary;
        } catch (error) {
            if (!knownRejection) {
                uncertainInvoices.add(invoiceId);
            }

            message = error.name === "AbortError"
                ? "Chưa nhận được kết quả thanh toán "
                    + "do quá thời gian chờ."
                : error.message;

            if (!knownRejection) {
                message +=
                    " Không xác nhận thu lại khi chưa kiểm tra "
                    + "kết quả giao dịch trên máy chủ.";
            }
        } finally {
            clearTimeout(timer);
            paying = false;
        }

        const refreshTask = load(visitId);
        const refreshVersion = version;
        const refreshed = await refreshTask;

        if (
            refreshVersion !== version
            || currentVisitId !== visitId
        ) {
            return;
        }

        if (succeeded) {
            resetPaymentFields();
            showPaymentSuccessToast(receipt);

            if (refreshed) {
                if (!$("vien-phi-history-panel").hidden) {
                    $("vien-phi-history-panel").scrollIntoView({
                        behavior: "smooth",
                        block: "nearest"
                    });
                }

                showSuccess(message, receipt);
            } else {
                showError(
                    message
                    + " Chưa tải lại được hóa đơn. "
                    + "Đóng popup và mở lại để kiểm tra."
                );
            }

            root.dispatchEvent(
                new CustomEvent("vienphi:updated", {
                    bubbles: true,
                    detail: {
                        maLichKham: visitId,
                        maHoaDon: invoiceId
                    }
                })
            );
        } else {
            showError(
                message
                + (
                    refreshed
                        ? " Đã tải lại thông tin hóa đơn."
                        : " Chưa tải lại được viện phí."
                )
            );
        }

        updatePaymentUI();
        modal?.handleUpdate();
    }

    // =====================================================
    // TỔNG QUAN
    // =====================================================

    function render() {
        write(
            "vien-phi-patient-name",
            data.tenBenhNhan || "Chưa có tên bệnh nhân"
        );
        write("vien-phi-patient-code", `Mã BN: ${data.maBenhNhan}`);
        write(
            "vien-phi-appointment-code",
            `Lịch khám: #${data.maLichKham}`
        );
        write("vien-phi-department", data.tenKhoa || "Chưa có khoa");

        write("vien-phi-total", money(data.tongTienHieuLuc));
        write("vien-phi-paid", money(data.tongDaThanhToan));
        write("vien-phi-due", money(data.tongConPhaiThu));

        $("vien-phi-content").hidden = false;

        const invoices = data.danhSachHoaDon;

        $("vien-phi-empty").hidden = invoices.length > 0;
        $("vien-phi-workspace").hidden = invoices.length === 0;

        if (!invoices.length) {
            selectedId = null;
            $("vien-phi-invoice-list").replaceChildren();
            write("vien-phi-footer-status", "Chưa có hóa đơn");
            $("vien-phi-footer-status").className =
                "reception-fee-footer-status";
            return;
        }

        if (
            !invoices.some(
                invoice =>
                    positiveId(invoice.maHoaDon) === selectedId
            )
        ) {
            const unpaid = invoice =>
                invoice.trangThai !== "DaHuy"
                && cents(invoice.conPhaiThu) > 0n;

            const first =
                invoices.find(
                    invoice =>
                        invoice.loaiHoaDon === "PhiKham"
                        && unpaid(invoice)
                )
                || invoices.find(unpaid)
                || invoices.find(
                    invoice => invoice.trangThai !== "DaHuy"
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
    // DANH SÁCH HÓA ĐƠN
    // =====================================================

    function renderInvoiceList() {
        const list = $("vien-phi-invoice-list");
        list.replaceChildren();

        for (const invoice of data.danhSachHoaDon) {
            const id = positiveId(invoice.maHoaDon);
            const li = element("li");
            const button = element("button", "fee-invoice-button");

            button.type = "button";
            button.dataset.invoiceId = String(id);

            button.classList.toggle("is-selected", id === selectedId);
            button.classList.toggle(
                "is-cancelled",
                invoice.trangThai === "DaHuy"
            );

            button.setAttribute(
                "aria-pressed",
                String(id === selectedId)
            );

            button.setAttribute(
                "aria-label",
                `Xem hóa đơn HD${String(id).padStart(3, "0")}, `
                + (invoice.tenLoaiHoaDon || "Chưa phân loại")
            );

            const icon = element(
                "i",
                "fa-solid fa-file-invoice fee-invoice-icon"
            );
            icon.setAttribute("aria-hidden", "true");

            const main = element("span", "fee-invoice-main");
            const top = element("span", "fee-invoice-line");

            top.append(
                element(
                    "span",
                    "fee-invoice-name",
                    `HD${String(id).padStart(3, "0")} · `
                    + (invoice.tenLoaiHoaDon || "Chưa phân loại")
                ),
                element(
                    "span",
                    "fee-invoice-amount",
                    money(invoice.tongTien)
                )
            );

            const bottom = element("span", "fee-invoice-line");

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
    // CHI TIẾT HÓA ĐƠN
    // =====================================================

    function renderSelected() {
        const invoice = selectedInvoice();

        if (!invoice) return;

        write(
            "vien-phi-detail-title",
            `Chi tiết hóa đơn HD${String(selectedId).padStart(3, "0")}`
        );

        const badge = $("vien-phi-invoice-status");

        badge.textContent =
            invoice.trangThaiHienThi || "Chưa xác định";
        badge.className =
            `reception-fee-status ${badgeClass(invoice)}`;

        write(
            "vien-phi-invoice-meta",
            `${invoice.tenLoaiHoaDon || "Chưa phân loại"} · `
            + dateTime(invoice.ngayLapHoaDon)
        );

        write("vien-phi-invoice-warning", invoice.thongBao || "");
        $("vien-phi-invoice-warning").hidden = !invoice.thongBao;

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
                element("td", "fee-quantity", String(item.soLuong)),
                element("td", "fee-money", money(item.donGia)),
                element("td", "fee-money", money(item.thanhTien))
            );

            rows.append(tr);
        }

        $("vien-phi-details-empty").hidden =
            invoice.chiTiet.length > 0;

        write("vien-phi-selected-total", money(invoice.tongTien));
        write("vien-phi-selected-paid", money(invoice.daThanhToan));
        write("vien-phi-selected-due", money(invoice.conPhaiThu));

        $("vien-phi-details-panel").hidden = false;
        renderHistory(invoice.lichSuThanhToan);

        $("vien-phi-history-panel").hidden =
            invoice.lichSuThanhToan.length === 0
            && invoice.trangThai !== "DaThanhToan";

        const footer = $("vien-phi-footer-status");
        footer.className = "reception-fee-footer-status";

        if (invoice.trangThai === "DaHuy") {
            footer.textContent = "Hóa đơn đã hủy";
        } else if (invoice.trangThaiHienThi === "Cần đối soát") {
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

        updatePaymentUI();
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

        $("vien-phi-history-empty").hidden = payments.length > 0;

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
                `fee-history-card ${
                    success ? "is-success" : failed ? "is-failed" : ""
                }`
            );

            const heading = element("div", "fee-history-heading");

            heading.append(
                element(
                    "span",
                    `reception-fee-status ${
                        success ? "is-paid" : failed ? "is-error" : ""
                    }`,
                    label
                ),
                element(
                    "strong",
                    "fee-history-amount",
                    money(payment.soTien)
                )
            );

            const fields = element("dl", "fee-history-fields");

            const collector =
                payment.tenNguoiThu
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
                ["Thời gian", dateTime(payment.ngayThanhToan)],
                [
                    "Phương thức",
                    payment.phuongThucThanhToan || "Chưa ghi nhận"
                ],
                ["Người thu", collector],
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
    // XUẤT MỘT HÓA ĐƠN ĐÃ THANH TOÁN
    // =====================================================

    async function exportSelectedInvoice() {
        const current = selectedInvoice();

        if (
            loading || paying || confirming || exporting || !data
        ) {
            return;
        }

        const reason = exportUnavailableReason(current);

        if (reason) {
            showError(reason);
            return;
        }

        const invoiceId = positiveId(current.maHoaDon);
        const visitId = currentVisitId;

        const printWindow = window.open(
            "",
            "_blank",
            "width=900,height=720"
        );

        if (!printWindow) {
            showError(
                "Trình duyệt đã chặn cửa sổ in. "
                + "Cho phép popup cho localhost rồi thử lại."
            );
            return;
        }

        printWindow.opener = null;
        printWindow.document.body.textContent =
            "Đang kiểm tra hóa đơn đã thanh toán...";

        exporting = true;
        updatePaymentUI();

        try {
            const ok = await load(visitId);
            const invoice = selectedInvoice();

            if (
                !ok
                || currentVisitId !== visitId
                || positiveId(invoice?.maHoaDon) !== invoiceId
            ) {
                throw new Error(
                    "Chưa kiểm tra được đúng hóa đơn. "
                    + "Vui lòng thử lại."
                );
            }

            const updatedReason = exportUnavailableReason(invoice);

            if (updatedReason) {
                throw new Error(updatedReason);
            }

            if (!printWindow.closed) {
                buildPrintableInvoice(invoice, data, printWindow);
            }
        } catch (error) {
            if (!printWindow.closed) printWindow.close();
            showError(error.message);
        } finally {
            exporting = false;
            updatePaymentUI();
        }
    }

    // =====================================================
    // DỰNG BẢN IN
    // =====================================================

    function buildPrintableInvoice(invoice, snapshot, printWindow) {
        printWindow.opener = null;

        const doc = printWindow.document;
        doc.documentElement.lang = "vi";
        doc.title =
            `HoaDon-HD${String(invoice.maHoaDon).padStart(3, "0")}`;

        const make = (tag, text, className = "") => {
            const node = doc.createElement(tag);

            if (text !== undefined) node.textContent = String(text);
            if (className) node.className = className;

            return node;
        };

        const charset = doc.createElement("meta");
        charset.charset = "UTF-8";
        doc.head.append(charset);
        doc.body.className = "fee-print-page";

        const toolbar = make("div", undefined, "fee-print-toolbar");
        const printButton = make("button", "In / Lưu PDF");
        printButton.type = "button";

        printButton.addEventListener(
            "click",
            () => printWindow.print()
        );

        toolbar.append(printButton);

        const page = make("main", undefined, "fee-print-document");

        page.append(
            make("strong", "BỆNH VIỆN ABC"),
            make("h1", "HÓA ĐƠN VIỆN PHÍ")
        );

        const line = (label, value) => {
            const p = make("p");

            p.append(
                make("strong", label + ": "),
                make("span", value ?? "Chưa ghi nhận")
            );

            return p;
        };

        page.append(
            line(
                "Mã hóa đơn",
                `HD${String(invoice.maHoaDon).padStart(3, "0")}`
            ),
            line("Ngày lập", dateTime(invoice.ngayLapHoaDon)),
            line(
                "Loại hóa đơn",
                invoice.tenLoaiHoaDon || invoice.loaiHoaDon
            ),
            line("Bệnh nhân", snapshot.tenBenhNhan),
            line("Mã bệnh nhân", snapshot.maBenhNhan),
            line("Mã lịch khám", snapshot.maLichKham),
            line("Khoa", snapshot.tenKhoa),
            line(
                "Trạng thái",
                invoice.trangThaiHienThi || invoice.trangThai
            )
        );

        const table = make("table");
        const head = make("thead");
        const headerRow = make("tr");

        ["STT", "Nội dung", "Số lượng", "Đơn giá", "Thành tiền"]
            .forEach(text => headerRow.append(make("th", text)));

        head.append(headerRow);

        const body = make("tbody");

        invoice.chiTiet.forEach((item, index) => {
            const row = make("tr");

            [
                index + 1,
                item.noiDung || `Chi tiết #${item.maCTHoaDon}`,
                item.soLuong,
                money(item.donGia),
                money(item.thanhTien)
            ].forEach(text => row.append(make("td", text)));

            body.append(row);
        });

        table.append(head, body);

        page.append(
            table,
            line("Tổng hóa đơn", money(invoice.tongTien)),
            line("Đã thanh toán", money(invoice.daThanhToan)),
            line("Còn phải thu", money(invoice.conPhaiThu))
        );

        if (invoice.thongBao) {
            page.append(line("Lưu ý", invoice.thongBao));
        }

        if (invoice.lichSuThanhToan.length) {
            page.append(make("h2", "Lịch sử thanh toán"));

            const paymentStatus = {
                ThanhCong: "Thành công",
                ThatBai: "Thất bại",
                DangXuLy: "Đang xử lý"
            };

            invoice.lichSuThanhToan.forEach(payment => {
                const block = make(
                    "section",
                    undefined,
                    "fee-print-payment"
                );

                const collector =
                    payment.tenNguoiThu
                    || (
                        payment.maNguoiThu
                            ? `Mã nhân viên ${payment.maNguoiThu}`
                            : "Chưa ghi nhận"
                    );

                const reference =
                    payment.maGiaoDich
                    || (
                        payment.phuongThucThanhToan === "Tiền mặt"
                            ? "Không áp dụng"
                            : "Chưa ghi nhận"
                    );

                block.append(
                    line(
                        "Mã thanh toán",
                        `TT${String(payment.maThanhToan).padStart(3, "0")}`
                    ),
                    line("Thời gian", dateTime(payment.ngayThanhToan)),
                    line("Số tiền", money(payment.soTien)),
                    line(
                        "Trạng thái giao dịch",
                        paymentStatus[payment.trangThai]
                            || payment.trangThai
                    ),
                    line("Phương thức", payment.phuongThucThanhToan),
                    line("Người thu", collector),
                    line("Mã giao dịch", reference)
                );

                page.append(block);
            });
        }

        const exportedAt = new Intl.DateTimeFormat("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
            dateStyle: "short",
            timeStyle: "short"
        }).format(new Date());

        page.append(line("Thời điểm xuất", exportedAt));
        doc.body.replaceChildren(toolbar, page);

        const stylesheet = doc.createElement("link");
        stylesheet.rel = "stylesheet";

        stylesheet.href = new URL(
            "/Css/TiepNhan/vienphi.css",
            window.location.origin
        ).href;

        stylesheet.addEventListener("load", () => {
            if (!printWindow.closed) {
                printWindow.focus();

                printWindow.setTimeout(() => {
                    if (!printWindow.closed) printWindow.print();
                }, 100);
            }
        });

        stylesheet.addEventListener("error", () => {
            toolbar.append(
                make(
                    "span",
                    " Chưa tải được định dạng bản in. "
                    + "Đóng cửa sổ và thử lại."
                )
            );
        });

        doc.head.append(stylesheet);
    }

    // =====================================================
    // MỞ / ĐÓNG POPUP
    // =====================================================

    async function mo(maLichKham, trigger = null) {
        if (paying || confirming || exporting) return false;

        if (!window.bootstrap?.Modal) {
            console.error(
                "Popup viện phí cần Bootstrap bundle "
                + "được nạp trước vienphi.js."
            );
            return false;
        }

        const id = positiveId(maLichKham);

        if (!modal) {
            modal = window.bootstrap.Modal.getOrCreateInstance(root);
        }

        opener = trigger || document.activeElement;
        currentVisitId = id;
        selectedId = null;

        resetPaymentFields();
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
        if (!paying && !exporting) modal?.hide();
    }

    async function lamMoi() {
        if (
            !paying
            && !confirming
            && !exporting
            && currentVisitId
            && root.classList.contains("show")
        ) {
            await load(currentVisitId);
        }
    }

    // =====================================================
    // SỰ KIỆN
    // =====================================================

    $("vien-phi-invoice-list").addEventListener("click", event => {
        const button = event.target instanceof Element
            ? event.target.closest("button[data-invoice-id]")
            : null;

        if (
            !button
            || button.disabled
            || !data
            || loading
            || paying
            || confirming
            || exporting
        ) {
            return;
        }

        selectedId = positiveId(button.dataset.invoiceId);
        resetPaymentFields();

        $("vien-phi-invoice-list")
            .querySelectorAll("button[data-invoice-id]")
            .forEach(item => {
                const selected =
                    positiveId(item.dataset.invoiceId) === selectedId;

                item.classList.toggle("is-selected", selected);
                item.setAttribute("aria-pressed", String(selected));
            });

        renderSelected();

        const scroll = root.querySelector(
            ".reception-fee-detail-scroll"
        );

        if (scroll) scroll.scrollTop = 0;
    });

    root.querySelectorAll(
        'input[name="vienPhiPhuongThuc"]'
    ).forEach(input => {
        input.addEventListener("change", updatePaymentUI);
    });

    $("vien-phi-confirm-payment").addEventListener(
        "click",
        () => void confirmPayment()
    );

    $("vien-phi-export-invoice")?.addEventListener(
        "click",
        () => void exportSelectedInvoice()
    );

    root.addEventListener("hide.bs.modal", event => {
        if (paying || exporting) {
            event.preventDefault();
            return;
        }

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

    document.addEventListener("click", event => {
        const button = event.target instanceof Element
            ? event.target.closest("button[data-vienphi-lichkham]")
            : null;

        if (!button || button.disabled) return;

        event.preventDefault();
        event.stopPropagation();

        void mo(button.dataset.vienphiLichkham, button);
    }, true);

    window.VienPhi = Object.freeze({
        mo,
        dong,
        lamMoi
    });

    setLoading(false);
})();