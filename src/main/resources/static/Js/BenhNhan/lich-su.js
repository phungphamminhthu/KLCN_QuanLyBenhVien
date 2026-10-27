(() => {
    "use strict";

    const $ = (selector) => document.querySelector(selector);

    const state = {
        appointments: [],
        filter: "all",
        loading: false
    };

    function getToken() {
        return sessionStorage.getItem("Token")
            || localStorage.getItem("Token")
            || "";
    }

    function authHeaders() {
        const token = getToken();

        return {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        };
    }

    function amount(value) {
        const number = Number(value);
        return Number.isFinite(number) ? number : 0;
    }

    function money(value) {
        return new Intl.NumberFormat("vi-VN").format(amount(value)) + " đ";
    }

    function dateText(value) {
        if (!value) return "Chưa cập nhật";

        const parts = String(value).slice(0, 10).split("-");
        if (parts.length !== 3) return value;

        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    function timeText(value) {
        if (!value) return "Chưa cập nhật";

        const parts = String(value).split(":");
        return parts.length >= 2
            ? `${parts[0]}:${parts[1]}`
            : value;
    }

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    function isCancelled(appointment) {
        return ["DaHuy", "KhongDen"].includes(
            appointment.trangThaiLichKham
        );
    }

    function isPaid(appointment) {
        const invoices = appointment.danhSachHoaDon || [];
        const activeInvoices = invoices.filter(
            invoice => invoice.trangThai !== "DaHuy"
        );

        if (activeInvoices.length) {
            return activeInvoices.every(
                invoice => invoice.trangThai === "DaThanhToan"
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

    async function getJson(url) {
        const response = await fetch(url, {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
            headers: authHeaders()
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(
                data?.message || `Lỗi máy chủ HTTP ${response.status}`
            );
        }

        return data;
    }

    async function loadAppointments() {
        state.loading = true;
        $("#loadingState").hidden = false;
        $("#errorState").hidden = true;
        $("#emptyState").hidden = true;
        $("#appointmentList").replaceChildren();
        $("#refreshButton").disabled = true;

        try {
            const response = await getJson("/api/lich-kham/cua-toi");

            if (!Array.isArray(response)) {
                throw new Error("Dữ liệu lịch khám không hợp lệ.");
            }

            const appointments = response.map(item => ({
                ...item,
                tongChiPhi: amount(item.tongChiPhi),
                tongDaThanhToan: amount(item.tongDaThanhToan),
                soTienConLai: amount(item.soTienConLai),
                danhSachHoaDon: []
            }));

            // Lấy hóa đơn của từng lịch để xác định chính xác trạng thái.
            await Promise.all(appointments.map(async appointment => {
                const id = Number(appointment.maLichKham);
                if (!Number.isInteger(id) || id <= 0) return;

                try {
                    const invoices = await getJson(
                        `/api/thanh-toan/lich-kham/${id}/hoa-don`
                    );

                    if (Array.isArray(invoices)) {
                        appointment.danhSachHoaDon = invoices;
                    }
                } catch (error) {
                    console.error(
                        `Không tải được hóa đơn lịch ${id}:`,
                        error
                    );
                }
            }));

            state.appointments = appointments;
            renderAppointments();
        } catch (error) {
            $("#errorMessage").textContent =
                error.message || "Không thể tải lịch khám. Vui lòng thử lại.";
            $("#errorState").hidden = false;
        } finally {
            state.loading = false;
            $("#loadingState").hidden = true;
            $("#refreshButton").disabled = false;
        }
    }

    function filteredAppointments() {
        return state.appointments.filter(appointment => {
            if (state.filter === "all") return true;
            if (isCancelled(appointment)) return false;

            if (state.filter === "paid") {
                return isPaid(appointment)
                    && appointment.tongChiPhi > 0;
            }

            if (state.filter === "unpaid") {
                return appointment.soTienConLai > 0;
            }

            return true;
        });
    }

    function renderAppointments() {
        const list = $("#appointmentList");
        list.replaceChildren();

        const appointments = filteredAppointments();

        $("#emptyState").hidden = appointments.length !== 0;

        appointments.forEach(appointment => {
            const paid = isPaid(appointment);
            const cancelled = isCancelled(appointment);
            const remaining = appointment.soTienConLai;

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
                    <strong>${dateText(appointment.ngayKham)} · ${timeText(appointment.gioKham)}</strong>
                </div>

                <div class="info-row">
                    <span>⌂ Phòng khám</span>
                    <strong>${escapeHtml(appointment.tenPhong || "Chưa cập nhật")}</strong>
                </div>

                <div class="info-row">
                    <span>₫ Tổng chi phí</span>
                    <strong>${money(appointment.tongChiPhi)}</strong>
                </div>

                ${remaining > 0 ? `
                    <div class="info-row remaining">
                        <span>Còn phải trả</span>
                        <strong>${money(remaining)}</strong>
                    </div>
                ` : ""}

                <div class="badge-row">
                    <span class="status-badge ${cancelled ? "danger" : "normal"}">
                        ${escapeHtml(statusText(appointment.trangThaiLichKham))}
                    </span>

                    <span class="status-badge ${paid ? "success" : "pending"}">
                        ${paid ? "Đã thanh toán" : remaining > 0 ? "Chưa thanh toán đủ" : "Chưa có chi phí"}
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

           card.querySelector(".detail-button").addEventListener("click", () => {
               const maLichKham = Number(appointment.maLichKham);

               if (!Number.isInteger(maLichKham) || maLichKham <= 0) {
                   alert("Không xác định được mã lịch khám.");
                   return;
               }

               window.location.href =
                   `/benh-nhan/lich-su/chi-tiet?maLichKham=${encodeURIComponent(maLichKham)}`;
           });

            const paymentButton = card.querySelector(".payment-button");
            if (paymentButton) {
                paymentButton.addEventListener("click", () => {
                    openPayment(appointment);
                });
            }

            list.appendChild(card);
        });
    }

    function showDetails(appointment) {
        const paid = isPaid(appointment);

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
            ["Trạng thái lịch", statusText(appointment.trangThaiLichKham)],
            ["Trạng thái thanh toán", paid ? "Đã thanh toán đủ" : "Chưa thanh toán đủ"]
        ];

        $("#detailContent").innerHTML = rows.map(([label, value]) => `
            <div class="detail-row">
                <span>${escapeHtml(label)}</span>
                <strong>${escapeHtml(value ?? "Chưa cập nhật")}</strong>
            </div>
        `).join("");

        $("#detailModal").hidden = false;
    }

    async function openPayment(appointment) {
        const invoice = (appointment.danhSachHoaDon || []).find(
            item => item.trangThai === "ChuaThanhToan"
        );

        const maHoaDon = Number(invoice?.maHoaDon);

        if (!Number.isInteger(maHoaDon) || maHoaDon <= 0) {
            alert("Chưa tìm thấy hóa đơn chưa thanh toán.");
            return;
        }

        /*
         * Chưa tự chuyển sang một URL thanh toán web chưa được xác nhận.
         * Phần mở QR cần nối với cấu trúc response thực tế của
         * GET /api/thanh-toan/hoa-don/{maHoaDon}/qr.
         */
        try {
            const data = await getJson(
                `/api/thanh-toan/hoa-don/${maHoaDon}/qr`
            );

            if (!data?.qrUrl) {
                throw new Error("API chưa trả về đường dẫn ảnh QR (qrUrl).");
            }

            const win = window.open("", "_blank");
            if (!win) {
                throw new Error("Trình duyệt đã chặn cửa sổ thanh toán.");
            }

            const qrUrl = escapeHtml(data.qrUrl);
            const total = money(data.tongTien ?? appointment.soTienConLai);

            win.document.write(`
                <!DOCTYPE html>
                <html lang="vi">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <title>Thanh toán hóa đơn</title>
                    <style>
                        body{font-family:Arial,sans-serif;background:#f0f8ff;
                        color:#1e293b;text-align:center;padding:30px}
                        main{max-width:460px;margin:auto;background:white;
                        padding:28px;border-radius:20px}
                        img{width:min(100%,300px);height:auto}
                        h1{font-size:24px} .amount{font-size:22px;color:#2563eb;
                        font-weight:bold}
                    </style>
                </head>
                <body>
                    <main>
                        <h1>Thanh toán lịch khám</h1>
                        <p>Hóa đơn #${maHoaDon}</p>
                        <p class="amount">${total}</p>
                        <img src="${qrUrl}" alt="Mã QR thanh toán">
                        <p>Quét mã QR bằng ứng dụng ngân hàng để thanh toán.</p>
                    </main>
                </body>
                </html>
            `);
            win.document.close();
        } catch (error) {
            alert(error.message || "Không thể mở thanh toán.");
        }
    }

    document.querySelectorAll(".filter-chip").forEach(button => {
        button.addEventListener("click", () => {
            state.filter = button.dataset.filter;

            document.querySelectorAll(".filter-chip").forEach(item => {
                item.classList.toggle("active", item === button);
            });

            renderAppointments();
        });
    });

    $("#refreshButton").addEventListener("click", loadAppointments);
    $("#retryButton").addEventListener("click", loadAppointments);
    $("#closeDetail").addEventListener("click", () => {
        $("#detailModal").hidden = true;
    });

    $("#detailModal").addEventListener("click", event => {
        if (event.target === $("#detailModal")) {
            $("#detailModal").hidden = true;
        }
    });

    loadAppointments();
})();