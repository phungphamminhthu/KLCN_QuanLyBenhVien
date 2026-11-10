(() => {
    "use strict";

    const $ = (selector, root = document) => root.querySelector(selector);

    const state = {
        appointments: [],
        filter: "all",
        loading: false
    };

    // =========================
    // HỒ SƠ BỆNH NHÂN ĐANG CHỌN
    // =========================

    function getToken() {
        return sessionStorage.getItem("Token")
            || localStorage.getItem("Token")
            || "";
    }

    function getSelectedPatientProfile() {
        const maBenhNhan =
            sessionStorage.getItem("MaBenhNhanDangChon")
            || localStorage.getItem("MaBenhNhanDangChon");

        const rawProfile =
            sessionStorage.getItem("HoSoBenhNhanDangChon")
            || localStorage.getItem("HoSoBenhNhanDangChon");

        if (!maBenhNhan || !rawProfile) {
            return null;
        }

        try {
            const profile = JSON.parse(rawProfile);
            const profileId = profile.maBenhNhan ?? profile.MaBenhNhan;

            if (
                profileId == null
                || String(profileId) !== String(maBenhNhan)
            ) {
                return null;
            }

            return profile;
        } catch (error) {
            console.error("Lỗi đọc hồ sơ bệnh nhân đang chọn:", error);
            return null;
        }
    }

    function getSelectedPatientId() {
        const profile = getSelectedPatientProfile();

        if (!profile) {
            return null;
        }

        const id = Number(profile.maBenhNhan ?? profile.MaBenhNhan);

        return Number.isInteger(id) && id > 0 ? id : null;
    }

    // =========================
    // HÀM TIỆN ÍCH
    // =========================

    function authHeaders() {
        const token = getToken();

        return {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        };
    }

    function amount(value) {
        if (value === null || value === undefined || value === "") {
            return 0;
        }

        const number = Number(value);
        return Number.isFinite(number) ? number : 0;
    }

    function money(value) {
        return new Intl.NumberFormat("vi-VN").format(amount(value)) + " đ";
    }

    function dateText(value) {
        if (!value) return "Chưa cập nhật";

        const text = String(value);
        const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

        if (!match) return text;

        return `${match[3]}/${match[2]}/${match[1]}`;
    }

    function timeText(value) {
        if (!value) return "Chưa cập nhật";

        const match = String(value).match(/^(\d{1,2}):(\d{2})/);
        return match ? `${match[1].padStart(2, "0")}:${match[2]}` : String(value);
    }

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    function getAppointmentStatus(appointment) {
        return appointment?.trangThaiLichKham ?? "";
    }

    function isCancelled(appointment) {
        return ["DaHuy", "KhongDen"].includes(
            getAppointmentStatus(appointment)
        );
    }

    function normalizeInvoiceList(data) {
        if (Array.isArray(data)) return data;

        // Hỗ trợ trường hợp API bọc danh sách trong object.
        if (Array.isArray(data?.data)) return data.data;
        if (Array.isArray(data?.danhSachHoaDon)) return data.danhSachHoaDon;

        return [];
    }

    function isPaid(appointment) {
        const invoices = Array.isArray(appointment.danhSachHoaDon)
            ? appointment.danhSachHoaDon
            : [];

        const activeInvoices = invoices.filter(invoice =>
            invoice.trangThai !== "DaHuy"
        );

        if (activeInvoices.length > 0) {
            return activeInvoices.every(invoice =>
                invoice.trangThai === "DaThanhToan"
            );
        }

        return amount(appointment.tongChiPhi) > 0
            && amount(appointment.soTienConLai) <= 0;
    }

    function statusText(status) {
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

    function paymentStatusText(appointment) {
        if (isCancelled(appointment)) {
            return "Không áp dụng";
        }

        if (isPaid(appointment) && amount(appointment.tongChiPhi) > 0) {
            return "Đã thanh toán đủ";
        }

        if (amount(appointment.soTienConLai) > 0) {
            return "Chưa thanh toán đủ";
        }

        return "Chưa có chi phí";
    }

    // =========================
    // GỌI API
    // =========================

    async function getJson(url) {
        const response = await fetch(url, {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
            headers: authHeaders()
        });

        if (response.status === 204) {
            return null;
        }

        const contentType = response.headers.get("content-type") || "";
        let data = null;

        if (contentType.includes("application/json")) {
            data = await response.json().catch(() => null);
        } else {
            const text = await response.text().catch(() => "");
            data = text ? { message: text } : null;
        }

        if (!response.ok) {
            throw new Error(
                data?.message
                || data?.error
                || `Lỗi máy chủ HTTP ${response.status}`
            );
        }

        return data;
    }

    async function loadInvoicesForAppointment(appointment, maBenhNhan) {
        const maLichKham = Number(appointment.maLichKham);

        if (!Number.isInteger(maLichKham) || maLichKham <= 0) {
            return;
        }

        if (!Number.isInteger(maBenhNhan) || maBenhNhan <= 0) {
            console.error("Không xác định được mã hồ sơ bệnh nhân.");
            appointment.danhSachHoaDon = [];
            return;
        }

        try {
            const data = await getJson(
                `/api/thanh-toan/lich-kham/${encodeURIComponent(maLichKham)}/hoa-don` +
                `?maBenhNhan=${encodeURIComponent(maBenhNhan)}`
            );

            appointment.danhSachHoaDon = normalizeInvoiceList(data);

            console.log(
                `Hóa đơn lịch ${maLichKham}:`,
                appointment.danhSachHoaDon
            );
        } catch (error) {
            console.error(
                `Không tải được hóa đơn lịch khám ${maLichKham}:`,
                error
            );

            appointment.danhSachHoaDon = [];
        }
    }

    async function loadAppointments() {
        if (state.loading) return;

        state.loading = true;

        const loadingState = $("#loadingState");
        const errorState = $("#errorState");
        const emptyState = $("#emptyState");
        const appointmentList = $("#appointmentList");
        const refreshButton = $("#refreshButton");

        if (loadingState) loadingState.hidden = false;
        if (errorState) errorState.hidden = true;
        if (emptyState) emptyState.hidden = true;
        if (appointmentList) appointmentList.replaceChildren();
        if (refreshButton) refreshButton.disabled = true;

        try {
            const token = getToken();

            if (!token) {
                throw new Error("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.");
            }

            const maBenhNhan = getSelectedPatientId();

            if (!maBenhNhan) {
                throw new Error(
                    "Bạn chưa chọn hồ sơ bệnh nhân. Vui lòng quay lại trang chủ để chọn hồ sơ."
                );
            }

            const response = await getJson(
                `/api/lich-kham/cua-toi?maBenhNhan=${encodeURIComponent(maBenhNhan)}`
            );

            // API hiện tại được Service mô tả là trả về danh sách trực tiếp.
            const rawAppointments = Array.isArray(response)
                ? response
                : Array.isArray(response?.data)
                    ? response.data
                    : null;

            if (!rawAppointments) {
                throw new Error("Dữ liệu lịch khám trả về không đúng định dạng.");
            }

            const appointments = rawAppointments.map(item => ({
                ...item,

                // Gắn mã hồ sơ bệnh nhân đang được chọn.
                maBenhNhan: maBenhNhan,

                tongChiPhi: amount(item.tongChiPhi),
                tongDaThanhToan: amount(item.tongDaThanhToan),
                soTienConLai: amount(item.soTienConLai),

                danhSachHoaDon: []
            }));

            // Tải hóa đơn cho từng lịch khám.
            // Truyền đúng mã hồ sơ bệnh nhân vào API.
            await Promise.all(
                appointments.map(appointment =>
                    loadInvoicesForAppointment(appointment, maBenhNhan)
                )
            );

            state.appointments = appointments;
            renderAppointments();
        } catch (error) {
            console.error("Lỗi tải lịch sử khám:", error);

            if ($("#errorMessage")) {
                $("#errorMessage").textContent =
                    error.message || "Không thể tải lịch khám. Vui lòng thử lại.";
            }

            if (errorState) errorState.hidden = false;
            state.appointments = [];
        } finally {
            state.loading = false;

            if (loadingState) loadingState.hidden = true;
            if (refreshButton) refreshButton.disabled = false;
        }
    }

    // =========================
    // LỌC LỊCH KHÁM
    // =========================

    function filteredAppointments() {
        return state.appointments.filter(appointment => {
            if (state.filter === "all") {
                return true;
            }

            if (isCancelled(appointment)) {
                return false;
            }

            if (state.filter === "paid") {
                return isPaid(appointment)
                    && amount(appointment.tongChiPhi) > 0;
            }

            if (state.filter === "unpaid") {
                return amount(appointment.soTienConLai) > 0;
            }

            return true;
        });
    }

    // =========================
    // HIỂN THỊ DANH SÁCH
    // =========================

    function renderAppointments() {
        const list = $("#appointmentList");
        const emptyState = $("#emptyState");

        if (!list) return;

        list.replaceChildren();

        const appointments = filteredAppointments();

        if (emptyState) {
            emptyState.hidden = appointments.length !== 0;
        }

        appointments.forEach(appointment => {
            const paid = isPaid(appointment)
                && amount(appointment.tongChiPhi) > 0;
            const cancelled = isCancelled(appointment);
            const remaining = amount(appointment.soTienConLai);
            const status = getAppointmentStatus(appointment);

            const card = document.createElement("article");
            card.className = "appointment-card";

            card.innerHTML = `
                <div class="appointment-heading">
                    <div class="medical-icon">✚</div>
                    <div class="appointment-title">
                        <h2>${escapeHtml(appointment.tenKhoa || "Chưa cập nhật")}</h2>
                        <p>BS. ${escapeHtml(appointment.tenBacSi || "Chưa phân công")}</p>
                        <small>STT: ${escapeHtml(appointment.soThuTu ?? "Chưa cấp")}</small>
                    </div>
                </div>

                <div class="appointment-divider"></div>

                <div class="info-row">
                    <span>▦ Ngày khám</span>
                    <strong>${escapeHtml(dateText(appointment.ngayKham))} · ${escapeHtml(timeText(appointment.gioKham))}</strong>
                </div>

                <div class="info-row">
                    <span>⌂ Phòng khám</span>
                    <strong>${escapeHtml(appointment.tenPhong || "Chưa cập nhật")}</strong>
                </div>

                <div class="info-row">
                    <span>₫ Tổng chi phí</span>
                    <strong>${escapeHtml(money(appointment.tongChiPhi))}</strong>
                </div>

                ${remaining > 0 ? `
                    <div class="info-row remaining">
                        <span>Còn phải trả</span>
                        <strong>${escapeHtml(money(remaining))}</strong>
                    </div>
                ` : ""}

                <div class="badge-row">
                    <span class="status-badge ${cancelled ? "danger" : "normal"}">
                        ${escapeHtml(statusText(status))}
                    </span>

                    <span class="status-badge ${paid ? "success" : "pending"}">
                        ${escapeHtml(paymentStatusText(appointment))}
                    </span>
                </div>

                <div class="card-actions">
                    <button type="button" class="detail-button">
                        Xem chi tiết lịch
                    </button>

                    ${remaining > 0 && !cancelled && !paid ? `
                        <button type="button" class="payment-button">
                            Thanh toán
                        </button>
                    ` : ""}
                </div>
            `;

            // Mở modal chi tiết ngay trên trang hiện tại.
            const detailButton = $(".detail-button", card);
            detailButton?.addEventListener("click", () => {
                showDetails(appointment);
            });

            const paymentButton = $(".payment-button", card);
            paymentButton?.addEventListener("click", () => {
                openPayment(appointment);
            });

            list.appendChild(card);
        });
    }

    // =========================
    // CHI TIẾT LỊCH KHÁM
    // =========================

    function showDetails(appointment) {
        const detailContent = $("#detailContent");
        const detailModal = $("#detailModal");

        if (!detailContent || !detailModal) {
            console.error("Không tìm thấy thành phần modal chi tiết trong HTML.");
            return;
        }

        const rows = [
            ["Mã lịch khám", appointment.maLichKham],
            ["Số thứ tự", appointment.soThuTu ?? "Chưa cấp"],
            ["Chuyên khoa", appointment.tenKhoa],
            ["Bác sĩ", appointment.tenBacSi],
            ["Ngày khám", dateText(appointment.ngayKham)],
            ["Giờ khám", timeText(appointment.gioKham)],
            ["Phòng khám", appointment.tenPhong],
            ["Lý do khám", appointment.lyDoKham || "Không có"],
            ["Tổng chi phí", money(appointment.tongChiPhi)],
            ["Đã thanh toán", money(appointment.tongDaThanhToan)],
            ["Còn phải thanh toán", money(appointment.soTienConLai)],
            ["Trạng thái lịch", statusText(getAppointmentStatus(appointment))],
            ["Trạng thái số thứ tự", statusText(appointment.trangThaiSoThuTu)],
            ["Trạng thái thanh toán", paymentStatusText(appointment)]
        ];

        detailContent.innerHTML = rows.map(([label, value]) => `
            <div class="detail-row">
                <span>${escapeHtml(label)}</span>
                <strong>${escapeHtml(value ?? "Chưa cập nhật")}</strong>
            </div>
        `).join("");

        detailModal.hidden = false;
    }

    function closeDetailModal() {
        const modal = $("#detailModal");
        if (modal) modal.hidden = true;
    }

    // =========================
    // THANH TOÁN QR
    // =========================
    async function openPayment(appointment) {
        const invoices = Array.isArray(appointment.danhSachHoaDon)
            ? appointment.danhSachHoaDon
            : [];

        // Tìm hóa đơn chưa thanh toán.
        const invoice = invoices.find(item => {
            const trangThai = item.trangThai ?? item.TrangThai;

            return trangThai === "ChuaThanhToan";
        });

        const maHoaDon = Number(
            invoice?.maHoaDon ?? invoice?.MaHoaDon
        );

        const maBenhNhan = Number(
            appointment.maBenhNhan
        );

        console.log("===== DEBUG THANH TOÁN =====");
        console.log("Mã lịch khám:", appointment.maLichKham);
        console.log("Mã bệnh nhân:", maBenhNhan);
        console.log("Mã hóa đơn:", maHoaDon);
        console.log("Thông tin hóa đơn:", invoice);

        if (!Number.isInteger(maBenhNhan) || maBenhNhan <= 0) {
            alert("Không xác định được hồ sơ bệnh nhân. Vui lòng chọn lại hồ sơ.");
            return;
        }

        if (!Number.isInteger(maHoaDon) || maHoaDon <= 0) {
            alert(
                "Chưa tìm thấy hóa đơn chưa thanh toán. Vui lòng tải lại lịch sử."
            );
            return;
        }

        // Mở tab ngay trong thao tác click để tránh bị chặn popup.
        const paymentWindow = window.open("", "_blank");

        if (!paymentWindow) {
            alert(
                "Trình duyệt đã chặn cửa sổ thanh toán. Vui lòng cho phép popup."
            );
            return;
        }

        paymentWindow.document.write(`
            <!DOCTYPE html>
            <html lang="vi">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>Đang tải thanh toán</title>
            </head>
            <body style="font-family:Arial,sans-serif;text-align:center;padding:40px">
                <p>Đang tải mã QR thanh toán...</p>
            </body>
            </html>
        `);

        paymentWindow.document.close();

        try {
            // Gọi API QR kèm mã hồ sơ bệnh nhân.
            const data = await getJson(
                `/api/thanh-toan/hoa-don/${encodeURIComponent(maHoaDon)}/qr` +
                `?maBenhNhan=${encodeURIComponent(maBenhNhan)}`
            );

            if (!data?.qrUrl) {
                throw new Error(
                    "API chưa trả về đường dẫn mã QR (qrUrl)."
                );
            }

            const qrUrl = new URL(data.qrUrl, window.location.origin);

            if (!["http:", "https:"].includes(qrUrl.protocol)) {
                throw new Error("Đường dẫn mã QR không hợp lệ.");
            }

            const total = money(
                data.tongTien ??
                data.soTien ??
                appointment.soTienConLai
            );

            paymentWindow.document.open();

            paymentWindow.document.write(`
                <!DOCTYPE html>
                <html lang="vi">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <title>Thanh toán hóa đơn</title>
                    <style>
                        * {
                            box-sizing: border-box;
                        }

                        body {
                            font-family: Arial, sans-serif;
                            background: #f0f8ff;
                            color: #1e293b;
                            text-align: center;
                            padding: 30px;
                            margin: 0;
                        }

                        main {
                            max-width: 460px;
                            margin: 30px auto;
                            background: #fff;
                            padding: 28px;
                            border-radius: 20px;
                            box-shadow: 0 8px 28px rgba(15, 23, 42, .08);
                        }

                        img {
                            width: min(100%, 300px);
                            height: auto;
                            margin: 12px auto;
                        }

                        h1 {
                            font-size: 24px;
                        }

                        .amount {
                            font-size: 22px;
                            color: #2563eb;
                            font-weight: bold;
                        }
                    </style>
                </head>

                <body>
                    <main>
                        <h1>Thanh toán lịch khám</h1>
                        <p>Hóa đơn #${maHoaDon}</p>
                        <p class="amount">${escapeHtml(total)}</p>

                        <img
                            src="${escapeHtml(qrUrl.href)}"
                            alt="Mã QR thanh toán"
                        >

                        <p>Quét mã QR bằng ứng dụng ngân hàng để thanh toán.</p>
                    </main>
                </body>
                </html>
            `);

            paymentWindow.document.close();

        } catch (error) {
            console.error("Lỗi mở thanh toán:", error);

            if (!paymentWindow.closed) {
                paymentWindow.close();
            }

            alert(error.message || "Không thể mở thanh toán.");
        }
    }


    // =========================
    // KHỞI TẠO SỰ KIỆN
    // =========================

    function initializeEvents() {
        document.querySelectorAll(".filter-chip").forEach(button => {
            button.addEventListener("click", () => {
                state.filter = button.dataset.filter || "all";

                document.querySelectorAll(".filter-chip").forEach(item => {
                    item.classList.toggle("active", item === button);
                });

                renderAppointments();
            });
        });

        $("#refreshButton")?.addEventListener("click", loadAppointments);
        $("#retryButton")?.addEventListener("click", loadAppointments);
        $("#closeDetail")?.addEventListener("click", closeDetailModal);

        $("#detailModal")?.addEventListener("click", event => {
            if (event.target === $("#detailModal")) {
                closeDetailModal();
            }
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                closeDetailModal();
            }
        });
    }

    // =========================
    // CHẠY TRANG
    // =========================

    function initialize() {
        initializeEvents();
        loadAppointments();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize, { once: true });
    } else {
        initialize();
    }
})();
