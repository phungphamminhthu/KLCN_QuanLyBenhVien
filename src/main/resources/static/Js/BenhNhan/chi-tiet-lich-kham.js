
(() => {
    "use strict";

    const $ = (id) => document.getElementById(id);

    const elements = {
        content: $("detailContent"),
        loading: $("loadingState"),
        error: $("errorState"),
        errorTitle: $("errorTitle"),
        errorMessage: $("errorMessage"),
        retry: $("retryButton"),
        paymentButton: $("paymentButton")
    };

    function number(value) {
        const result = Number(value);
        return Number.isFinite(result) ? result : 0;
    }

    function money(value) {
        return `${Math.round(number(value)).toLocaleString("vi-VN")} đ`;
    }

    function date(value) {
        if (!value) return "Chưa cập nhật";

        const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);

        if (match) {
            return `${match[3]}/${match[2]}/${match[1]}`;
        }

        return String(value);
    }

    function time(value) {
        if (!value) return "Chưa cập nhật";

        const match = String(value).match(/^(\d{1,2}:\d{2})/);
        return match ? match[1] : String(value);
    }

    function text(value, fallback = "Chưa cập nhật") {
        const result = value == null ? "" : String(value).trim();
        return result || fallback;
    }

    function setText(id, value) {
        // Dùng textContent để không diễn giải dữ liệu API thành HTML.
        $(id).textContent = value;
    }



    async function getJson(url) {
        // Dự án đang lưu JWT trong sessionStorage với key Token
        const token = sessionStorage.getItem("Token");

        if (!token) {
            throw new Error(
                "Không tìm thấy token đăng nhập. Vui lòng đăng nhập lại."
            );
        }

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));

            throw new Error(
                error.message ||
                error.error ||
                `Lỗi HTTP ${response.status}.`
            );
        }

        return await response.json();
    }



    function appointmentStatus(status) {
        const labels = {
            ChoGoi: "Chờ gọi",
            DaGoi: "Đã gọi",
            DaTiepNhan: "Đã tiếp nhận",
            DangKham: "Đang khám",
            ChoThanhToan: "Chờ thanh toán",
            ChoCLS: "Chờ cận lâm sàng",
            DangCLS: "Đang thực hiện cận lâm sàng",
            ChoKham: "Chờ khám",
            ChoLayThuoc: "Chờ lấy thuốc",
            DangLayThuoc: "Đang lấy thuốc",
            HoanTat: "Hoàn tất",
            HoanThanh: "Hoàn thành",
            DaXacNhan: "Đã xác nhận",
            DaHuy: "Đã hủy",
            KhongDen: "Không đến"
        };

        return labels[status] || status || "Chưa cập nhật";
    }

    function setBadge(element, label, type) {
        element.textContent = label;
        element.className = `status-badge ${type || ""}`.trim();
    }

    async function layLichKhamCuaToi() {
        const token = localStorage.getItem("token");

        if (!token) {
            alert("Vui lòng đăng nhập để xem lịch khám.");
            window.location.href = "/auth/login";
            return;
        }

        const response = await fetch("/api/lich-kham/cua-toi", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(
                error.message || "Không thể tải lịch khám."
            );
        }

        return await response.json();
    }

    function appointmentStatusType(status) {
        if (["HoanTat", "HoanThanh"].includes(status)) {
            return "success";
        }

        if (["DaHuy", "KhongDen"].includes(status)) {
            return "danger";
        }

        if (["DangKham", "DangCLS", "DangLayThuoc"].includes(status)) {
            return "purple";
        }

        if (status === "ChoThanhToan") {
            return "warning";
        }

        return "";
    }

    function getInvoiceStatus(invoices, appointment) {
        const activeInvoices = invoices.filter(
            invoice => invoice.trangThai !== "DaHuy"
        );

        if (activeInvoices.length > 0) {
            const paid = activeInvoices.every(
                invoice => invoice.trangThai === "DaThanhToan"
            );

            return paid
                ? { label: "Đã thanh toán", type: "success" }
                : { label: "Chưa thanh toán đủ", type: "warning" };
        }

        const total = number(appointment.tongChiPhi);
        const remaining = number(appointment.soTienConLai);

        if (total > 0 && remaining <= 0) {
            return { label: "Đã thanh toán", type: "success" };
        }

        if (remaining > 0) {
            return { label: "Chưa thanh toán", type: "warning" };
        }

        return { label: "Chưa có chi phí", type: "" };
    }

    function renderAppointment(appointment, invoices) {
        const status = text(appointment.trangThaiLichKham, "");
        const total = number(appointment.tongChiPhi);
        const paid = number(appointment.tongDaThanhToan);
        const remaining = number(appointment.soTienConLai);
        const payment = getInvoiceStatus(invoices, appointment);

        const maLichKham = text(appointment.maLichKham, "—");
        const tenKhoa = text(appointment.tenKhoa);
        const tenBacSi = text(appointment.tenBacSi, "Chưa phân công");

        setText("maLichKham", maLichKham);
        setText("maLichKhamInfo", maLichKham);
        setText("tenKhoa", tenKhoa);
        setText("khoaInfo", tenKhoa);
        setText("tenBacSi", `BS. ${tenBacSi}`);
        setText("bacSiInfo", tenBacSi);

        setText("ngayKham", date(appointment.ngayKham));
        setText("gioKham", time(appointment.gioKham));

        setText(
            "soThuTu",
            appointment.soThuTu == null ? "—" : String(appointment.soThuTu)
        );

        setText("tenPhong", text(appointment.tenPhong));
        setText("lyDoKham", text(appointment.lyDoKham, "Không có thông tin"));

        setText("tongChiPhi", money(total));
        setText("tongDaThanhToan", money(paid));
        setText("soTienConLai", money(remaining));

        setBadge(
            $("trangThaiLich"),
            appointmentStatus(status),
            appointmentStatusType(status)
        );

        setBadge(
            $("trangThaiThanhToan"),
            payment.label,
            payment.type
        );

        $("soTienConLai").classList.toggle("paid-amount", remaining <= 0);
        $("soTienConLai").classList.toggle("unpaid-amount", remaining > 0);

        if (remaining <= 0) {
            setText(
                "paymentNote",
                total > 0
                    ? "Lịch khám không còn số tiền cần thanh toán."
                    : "Lịch khám hiện chưa có chi phí được ghi nhận."
            );
        } else {
            setText(
                "paymentNote",
                "Lịch khám còn khoản phí chưa thanh toán. Vui lòng kiểm tra hóa đơn."
            );
        }

        /*
         * Chỉ hiển thị nút thanh toán nếu:
         * - Lịch không bị hủy hoặc bệnh nhân không đến.
         * - Còn tiền phải thanh toán.
         * - Có hóa đơn đang ChuaThanhToan với mã hợp lệ.
         *
         * Chưa tự chuyển trang thanh toán vì cần dùng đúng route
         * thanh toán trên website của dự án.
         */
        const cancelled = ["DaHuy", "KhongDen"].includes(status);

        const unpaidInvoice = invoices.find(invoice =>
            invoice.trangThai === "ChuaThanhToan" &&
            Number.isInteger(Number(invoice.maHoaDon)) &&
            Number(invoice.maHoaDon) > 0
        );

        const canPay = remaining > 0 && !cancelled && Boolean(unpaidInvoice);

        elements.paymentButton.hidden = !canPay;

        if (canPay) {
            elements.paymentButton.onclick = () => {
                if (unpaidInvoice) {
                    openPayment(unpaidInvoice.maHoaDon);
                }
            };
        }
    }

    function showError(message, title = "Không thể tải lịch khám") {
        elements.content.hidden = true;
        elements.loading.hidden = true;
        elements.error.hidden = false;

        setText("errorTitle", title);
        setText("errorMessage", message);
    }

    async function loadAppointment() {
        elements.content.hidden = true;
        elements.error.hidden = true;
        elements.loading.hidden = false;

        try {
            const params = new URLSearchParams(window.location.search);
            const rawId = params.get("maLichKham");
            const id = Number(rawId);

            if (
                !rawId ||
                !Number.isSafeInteger(id) ||
                id <= 0
            ) {
                throw new Error("Mã lịch khám không hợp lệ.");
            }

            const appointments = await getJson("/api/lich-kham/cua-toi");

            if (!Array.isArray(appointments)) {
                throw new Error("Dữ liệu lịch khám không đúng định dạng.");
            }

            // Tìm trong danh sách lịch của chính bệnh nhân đang đăng nhập.
            const appointment = appointments.find(item =>
                Number(item.maLichKham) === id
            );

            if (!appointment) {
                throw new Error(
                    "Không tìm thấy lịch khám hoặc bạn không có quyền xem lịch này."
                );
            }

            let invoices = [];

            try {
                const result = await getJson(
                    `/api/thanh-toan/lich-kham/${id}/hoa-don`
                );

                if (Array.isArray(result)) {
                    invoices = result.filter(
                        item => item && typeof item === "object"
                    );
                }
            } catch (error) {
                console.error("Không tải được danh sách hóa đơn:", error);
                // Vẫn hiển thị thông tin lịch nếu API hóa đơn gặp lỗi.
            }

            renderAppointment(appointment, invoices);

            elements.loading.hidden = true;
            elements.error.hidden = true;
            elements.content.hidden = false;
        } catch (error) {
            console.error("Lỗi tải chi tiết lịch khám:", error);

            showError(
                error.message || "Đã xảy ra lỗi. Vui lòng thử lại."
            );
        }
    }

    elements.retry.addEventListener("click", loadAppointment);

    // ================================================
    // THANH TOÁN
    // ================================================
    const paymentElements = {
        modal: $("paymentModal"),
        close: $("closePaymentModal"),
        loading: $("paymentLoading"),
        content: $("paymentContent"),
        loadError: $("paymentLoadError"),
        loadErrorText: $("paymentLoadErrorText"),
        retry: $("retryPayment"),
        invoiceId: $("paymentInvoiceId"),
        amount: $("paymentAmount"),
        qrBox: $("paymentQrBox"),
        qrImage: $("paymentQrImage"),
        transferContent: $("paymentTransferContent"),
        copyContent: $("copyTransferContent"),
        statusIcon: $("paymentStatusIcon"),
        statusText: $("paymentStatusText"),
        checking: $("paymentChecking"),
        error: $("paymentError"),
        checkNow: $("checkPaymentNow")
    };

    let paymentTimer = null;
    let currentInvoiceId = null;
    let checkingPayment = false;
    let paymentPaid = false;

    function formatMoney(value) {
        return `${Math.round(number(value)).toLocaleString("vi-VN")} đ`;
    }

    function stopPaymentPolling() {
        if (paymentTimer) {
            clearInterval(paymentTimer);
            paymentTimer = null;
        }
    }

    function closePayment() {
        stopPaymentPolling();
        currentInvoiceId = null;
        paymentPaid = false;
        checkingPayment = false;
        paymentElements.modal.hidden = true;
    }

    function showPaymentError(message) {
        paymentElements.error.textContent = message;
        paymentElements.error.hidden = false;
    }

    async function paymentGetJson(url) {
        // Cùng key JWT đang dùng trong ứng dụng bệnh nhân.
        const token = sessionStorage.getItem("Token");

        if (!token) {
            throw new Error(
                "Không tìm thấy thông tin đăng nhập. Vui lòng đăng nhập lại."
            );
        }

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json"
            }
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                data.message ||
                data.error ||
                `Không thể gọi API thanh toán (HTTP ${response.status}).`
            );
        }

        return data;
    }

    async function openPayment(invoiceId) {
        const id = Number(invoiceId);

        if (!Number.isSafeInteger(id) || id <= 0) {
            alert("Mã hóa đơn không hợp lệ.");
            return;
        }

        stopPaymentPolling();
        currentInvoiceId = id;
        paymentPaid = false;

        paymentElements.modal.hidden = false;
        paymentElements.loading.hidden = false;
        paymentElements.content.hidden = true;
        paymentElements.loadError.hidden = true;
        paymentElements.error.hidden = true;

        try {
            const data = await paymentGetJson(
                `/api/thanh-toan/hoa-don/${id}/qr`
            );

            if (currentInvoiceId !== id) return;

            paymentElements.invoiceId.textContent = `#${id}`;
            paymentElements.amount.textContent = formatMoney(data.soTien);
            paymentElements.transferContent.textContent =
                data.noiDungChuyenKhoan || "Không có nội dung chuyển khoản";

            const qrUrl = data.qrUrl || "";

            if (qrUrl) {
                paymentElements.qrImage.src = qrUrl;
                paymentElements.qrBox.hidden = false;
                paymentElements.qrImage.onerror = () => {
                    paymentElements.qrBox.hidden = true;
                    showPaymentError("Không tải được ảnh QR. Hãy thử tải lại.");
                };
            } else {
                paymentElements.qrBox.hidden = true;
                showPaymentError("API chưa trả về đường dẫn mã QR.");
            }

            paymentElements.loading.hidden = true;
            paymentElements.content.hidden = false;
            paymentElements.statusIcon.classList.remove("paid");
            paymentElements.statusIcon.textContent = "₫";
            paymentElements.statusText.textContent = "Quét mã QR để thanh toán";
            paymentElements.checking.hidden = false;
            paymentElements.checkNow.hidden = false;

            await checkPaymentStatus();

            if (currentInvoiceId === id && !paymentPaid) {
                paymentTimer = setInterval(checkPaymentStatus, 3000);
            }
        } catch (error) {
            if (currentInvoiceId !== id) return;

            paymentElements.loading.hidden = true;
            paymentElements.content.hidden = true;
            paymentElements.loadError.hidden = false;
            paymentElements.loadErrorText.textContent =
                error.message || "Không thể tạo mã QR thanh toán.";
        }
    }


    async function checkPaymentStatus() {
        const id = currentInvoiceId;

        if (!id || checkingPayment || paymentPaid) return;

        checkingPayment = true;
        paymentElements.checkNow.disabled = true;
        paymentElements.error.hidden = true;

        try {
            const data = await paymentGetJson(
                `/api/thanh-toan/hoa-don/${id}/trang-thai`
            );

            if (currentInvoiceId !== id) return;

            if (data.trangThai === "DaThanhToan") {
                paymentPaid = true;
                stopPaymentPolling();

                paymentElements.statusIcon.classList.add("paid");
                paymentElements.statusIcon.textContent = "✓";
                paymentElements.statusText.textContent =
                    "Thanh toán thành công!";
                paymentElements.checking.hidden = true;
                paymentElements.checkNow.hidden = true;
                paymentElements.error.hidden = true;

                // Cập nhật dữ liệu ngay trên trang, không tải lại trình duyệt.
                await loadAppointment();

                // Giữ thông báo thành công 2 giây rồi tự đóng modal.
                setTimeout(() => {
                    if (paymentPaid && currentInvoiceId === id) {
                        closePayment();
                    }
                }, 2000);

            } else if (data.trangThai === "DaHuy") {
                stopPaymentPolling();

                paymentElements.checking.hidden = true;
                paymentElements.checkNow.hidden = true;

                showPaymentError("Hóa đơn đã bị hủy.");
            } else {
                paymentElements.statusText.textContent =
                    "Đang chờ xác nhận thanh toán...";
            }
        } catch (error) {
            if (currentInvoiceId === id) {
                showPaymentError(
                    error.message || "Chưa kiểm tra được trạng thái thanh toán."
                );
            }
        } finally {
            checkingPayment = false;
            paymentElements.checkNow.disabled = false;
        }
    }


    paymentElements.close.addEventListener("click", closePayment);

    paymentElements.modal.addEventListener("click", event => {
        if (event.target === paymentElements.modal) {
            closePayment();
        }
    });

    paymentElements.checkNow.addEventListener("click", checkPaymentStatus);

    paymentElements.retry.addEventListener("click", () => {
        if (currentInvoiceId) {
            openPayment(currentInvoiceId);
        }
    });

    paymentElements.copyContent.addEventListener("click", async () => {
        const content = paymentElements.transferContent.textContent.trim();

        if (!content || content === "Không có nội dung chuyển khoản") return;

        try {
            await navigator.clipboard.writeText(content);
            paymentElements.copyContent.textContent = "Đã sao chép";
        } catch {
            showPaymentError(
                "Không sao chép được. Bạn có thể bôi đen nội dung để sao chép."
            );
        }
    });


    loadAppointment();
})();
