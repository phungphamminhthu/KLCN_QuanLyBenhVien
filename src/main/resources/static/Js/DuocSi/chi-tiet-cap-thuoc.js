
document.addEventListener("DOMContentLoaded", function () {

    // =====================================================
    // LẤY MÃ ĐƠN THUỐC TỪ URL
    // =====================================================

    const pathParts = window.location.pathname
        .split("/")
        .filter(Boolean);

    const maDonThuoc = pathParts[pathParts.length - 1];

    const API_URL =
        "/api/duocsi/cho-cap-thuoc/" +
        encodeURIComponent(maDonThuoc);

    // =====================================================
    // ELEMENT
    // =====================================================

    const orderCode = document.getElementById("orderCode");
    const patientName = document.getElementById("patientName");
    const patientCode = document.getElementById("patientCode");
    const doctorName = document.getElementById("doctorName");
    const prescriptionDate = document.getElementById("prescriptionDate");
    const note = document.getElementById("note");
    const medicineTableBody = document.getElementById("medicineTableBody");
    const totalMoney = document.getElementById("totalAmount");
    const stockWarning = document.getElementById("stockWarning");
    const dispenseButton = document.getElementById("dispenseButton");
    const backButton = document.getElementById("backButton");

    // Lưu dữ liệu thuốc đang hiển thị
    let currentMedicines = [];

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
    // ESCAPE HTML
    // =====================================================

    function escapeHtml(value) {
        if (value === null || value === undefined) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // =====================================================
    // FORMAT TIỀN
    // =====================================================

    function formatMoney(value) {
        const number = Number(value || 0);

        return number.toLocaleString("vi-VN") + "đ";
    }

    // =====================================================
    // SET TEXT
    // =====================================================

    function setText(element, value) {
        if (!element) {
            return;
        }

        element.textContent = value ?? "-";
    }

    // =====================================================
    // TẢI CHI TIẾT ĐƠN THUỐC
    // =====================================================

    async function loadDetail() {
        const token = getToken();

        if (!token) {
            showNotification("Vui lòng đăng nhập lại.", "error");
            window.location.href = "/auth/login";
            return;
        }

        if (!maDonThuoc || !/^\d+$/.test(String(maDonThuoc))) {
            showError("Mã đơn thuốc không hợp lệ.");
            return;
        }

        try {
            const response = await fetch(API_URL, {
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + token,
                    "Content-Type": "application/json"
                }
            });

            if (response.status === 401) {
                alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
                window.location.href = "/auth/login";
                return;
            }

            if (response.status === 403) {
                console.error("API 403:", await response.text());
                alert("Bạn không có quyền truy cập dữ liệu đơn thuốc.");
                return;
            }

            if (response.status === 404) {
                showError("Không tìm thấy đơn thuốc.");
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error("API Error:", errorText);
                throw new Error("HTTP " + response.status);
            }

            const data = await response.json();

            console.log("Dữ liệu chi tiết đơn thuốc:", data);

            renderDetail(data);

        } catch (error) {
            console.error("Lỗi tải chi tiết đơn thuốc:", error);
            showError("Không thể tải dữ liệu đơn thuốc.");
        }
    }

    // =====================================================
    // HIỂN THỊ CHI TIẾT ĐƠN THUỐC
    // =====================================================

    function renderDetail(data) {
        if (!data) {
            showError("Không có dữ liệu đơn thuốc.");
            return;
        }

        setText(
            orderCode,
            data.maHienThi ||
            ("DP" + String(data.maDonThuoc || "").padStart(5, "0"))
        );

        setText(patientName, data.benhNhan);

        setText(
            patientCode,
            data.maBenhNhanHienThi ||
            ("BN" + String(data.maBenhNhan || "").padStart(5, "0"))
        );

        setText(doctorName, data.bacSi);
        setText(prescriptionDate, data.ngayKe);
        setText(note, data.ghiChu);

        const medicines = Array.isArray(data.danhSachThuoc)
            ? data.danhSachThuoc
            : [];

        currentMedicines = medicines.map(function (item) {
            return {
                ...item,
                soLuong: Number(item.soLuong || 0),
                thoiGianDung: Number(item.thoiGianDung || 0),
                donGia: Number(item.donGia || 0)
            };
        });

        renderMedicines(currentMedicines);
        recalculateTotal();
    }

    // =====================================================
    // HIỂN THỊ DANH SÁCH THUỐC
    // Bảng gồm 9 cột
    // =====================================================

    function renderMedicines(medicines) {
        if (!medicineTableBody) {
            console.error("Không tìm thấy medicineTableBody.");
            return;
        }

        if (!Array.isArray(medicines) || medicines.length === 0) {
            medicineTableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="table-empty">
                        Đơn thuốc chưa có thuốc.
                    </td>
                </tr>
            `;
            return;
        }

        medicineTableBody.innerHTML = medicines.map(function (item, index) {
            const soLuong = Number(item.soLuong || 0);
            const thoiGianDung = Number(item.thoiGianDung || 0);
            const donGia = Number(item.donGia || 0);
            const thanhTien = donGia * soLuong;

            return `
                <tr data-index="${index}">
                    <td>${index + 1}</td>

                    <td>
                        <span class="medicine-name">
                            ${escapeHtml(item.tenThuoc || "-")}
                        </span>
                    </td>

                    <td>
                        ${escapeHtml(item.donViTinh || "-")}
                    </td>

                    <td>
                        <input
                            type="number"
                            class="medicine-quantity-input"
                            data-index="${index}"
                            min="1"
                            step="1"
                            value="${soLuong}"
                            aria-label="Số lượng thuốc ${escapeHtml(item.tenThuoc || "")}"
                            style="width: 90px; padding: 6px;"
                        />
                    </td>

                    <td>
                        ${escapeHtml(item.lieuDung || "-")}
                    </td>

                    <td>
                        <input
                            type="number"
                            class="medicine-duration-input"
                            data-index="${index}"
                            min="1"
                            step="1"
                            value="${thoiGianDung || ""}"
                            aria-label="Thời gian dùng thuốc ${escapeHtml(item.tenThuoc || "")}"
                            style="width: 100px; padding: 6px;"
                        />
                    </td>

                    <td>
                        ${escapeHtml(item.cachDung || "-")}
                    </td>

                    <td>
                        ${formatMoney(donGia)}
                    </td>

                    <td class="medicine-line-total">
                        ${formatMoney(thanhTien)}
                    </td>
                </tr>
            `;
        }).join("");
    }

    // =====================================================
    // TÍNH LẠI THÀNH TIỀN VÀ TỔNG TIỀN
    // Chỉ tính trên giao diện, chưa lưu DB
    // =====================================================

    function recalculateTotal() {
        let total = 0;

        currentMedicines.forEach(function (item, index) {
            const quantityInput = medicineTableBody?.querySelector(
                `.medicine-quantity-input[data-index="${index}"]`
            );

            const durationInput = medicineTableBody?.querySelector(
                `.medicine-duration-input[data-index="${index}"]`
            );

            if (quantityInput) {
                item.soLuong = Number(quantityInput.value || 0);
            }

            if (durationInput) {
                item.thoiGianDung = Number(durationInput.value || 0);
            }

            const lineTotal =
                Number(item.soLuong || 0) *
                Number(item.donGia || 0);

            total += lineTotal;

            const row = medicineTableBody?.querySelector(
                `tr[data-index="${index}"]`
            );

            const lineTotalElement = row?.querySelector(
                ".medicine-line-total"
            );

            if (lineTotalElement) {
                lineTotalElement.textContent = formatMoney(lineTotal);
            }
        });

        setText(totalMoney, formatMoney(total));
    }

    // =====================================================
    // THEO DÕI THAY ĐỔI SỐ LƯỢNG / THỜI GIAN DÙNG
    // =====================================================

    if (medicineTableBody) {
        medicineTableBody.addEventListener("input", function (event) {
            if (
                event.target.matches(".medicine-quantity-input") ||
                event.target.matches(".medicine-duration-input")
            ) {
                recalculateTotal();
            }
        });

        // Không cho nhập số âm hoặc số thập phân.
        medicineTableBody.addEventListener("change", function (event) {
            if (
                event.target.matches(".medicine-quantity-input") ||
                event.target.matches(".medicine-duration-input")
            ) {
                const value = Number(event.target.value);

                if (!Number.isInteger(value) || value < 1) {
                    event.target.value = 1;
                }

                recalculateTotal();
            }
        });
    }

    // =====================================================
    // HIỂN THỊ LỖI
    // =====================================================

    function showError(message) {
        setText(orderCode, "-");
        setText(patientName, "-");
        setText(patientCode, "-");
        setText(doctorName, "-");
        setText(prescriptionDate, "-");
        setText(note, "-");
        setText(totalMoney, "0đ");

        if (medicineTableBody) {
            medicineTableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="table-error">
                        ${escapeHtml(message)}
                    </td>
                </tr>
            `;
        }
    }

    // =====================================================
    // NÚT QUAY LẠI
    // =====================================================

    if (backButton) {
        backButton.addEventListener("click", function () {
            window.location.href = "/DuocSi/cho-cap-thuoc";
        });
    }


        // =====================================================
        // THÔNG BÁO TRÊN GIAO DIỆN MEDCARE
        // =====================================================

        function showNotification(message, type = "success") {
            let notification =
                document.getElementById("appNotification");

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
                    background: "#ffffff",
                    boxShadow: "0 8px 28px rgba(15,23,42,0.14)",
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

            notification.innerHTML = `
                <span style="
                    width: 34px;
                    height: 34px;
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    background: ${background};
                    color: ${color};
                    font-size: 19px;
                    font-weight: 700;
                ">${success ? "✓" : "!"}</span>

                <div style="flex: 1; line-height: 1.5;">
                    <div style="font-weight: 600; margin-bottom: 2px;">
                        ${success ? "Thành công" : "Có lỗi xảy ra"}
                    </div>
                    <div>${escapeHtml(message)}</div>
                </div>
            `;

            requestAnimationFrame(() => {
                notification.style.opacity = "1";
                notification.style.transform = "translateY(0)";
            });

            notification.hideTimer = setTimeout(() => {
                notification.style.opacity = "0";
                notification.style.transform = "translateY(-12px)";
            }, 3000);
        }

    // =====================================
    // thông báo ra màn hình khi cấp thuốc
    // =====================================

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
                background: "#ffffff",
                boxShadow: "0 8px 28px rgba(15, 23, 42, 0.14)",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                fontSize: "14px",
                color: "#1e293b",
                opacity: "0",
                transform: "translateY(-12px)",
                transition: "opacity .25s ease, transform .25s ease",
                pointerEvents: "none"
            });

            document.body.appendChild(notification);
        }

        clearTimeout(notification.hideTimer);

        const success = type === "success";
        const color = success ? "#16a34a" : "#dc2626";
        const bg = success ? "#dcfce7" : "#fee2e2";

        notification.style.border = `1px solid ${success ? "#bbf7d0" : "#fecaca"}`;
        notification.style.borderLeft = `4px solid ${color}`;

        notification.innerHTML = `
            <span style="
                width: 34px;
                height: 34px;
                flex-shrink: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                background: ${bg};
                color: ${color};
                font-size: 19px;
                font-weight: 700;
            ">${success ? "✓" : "!"}</span>

            <div style="flex: 1; line-height: 1.5;">
                <div style="font-weight: 600; margin-bottom: 2px;">
                    ${success ? "Thành công" : "Có lỗi xảy ra"}
                </div>
                <div>${escapeHtml(message)}</div>
            </div>
        `;

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
    // NÚT CẤP THUỐC: LƯU ĐIỀU CHỈNH TRƯỚC KHI CHUYỂN TRANG
    // =====================================================

    if (dispenseButton) {
        dispenseButton.addEventListener("click", async function () {
            const token = getToken();

            if (!token) {
                alert("Vui lòng đăng nhập lại.");
                window.location.href = "/auth/login";
                return;
            }

            // Đồng bộ giá trị mới nhất từ các ô nhập
            recalculateTotal();

            // Kiểm tra dữ liệu trước khi gửi
            const chiTietDieuChinh = currentMedicines.map(function (item) {
                return {
                    maCTDonThuoc: Number(item.maCTDonThuoc),
                    soLuong: Number(item.soLuong),
                    thoiGianDung: Number(item.thoiGianDung)
                };
            });

            const duLieuKhongHopLe = chiTietDieuChinh.some(function (item) {
                return !Number.isInteger(item.maCTDonThuoc)
                    || item.maCTDonThuoc <= 0
                    || !Number.isInteger(item.soLuong)
                    || item.soLuong <= 0
                    || !Number.isInteger(item.thoiGianDung)
                    || item.thoiGianDung <= 0;
            });

            if (duLieuKhongHopLe) {
                alert("Vui lòng kiểm tra mã chi tiết thuốc, số lượng và thời gian dùng.");
                return;
            }

            try {
                dispenseButton.disabled = true;
                dispenseButton.textContent = "Đang lưu...";

                const response = await fetch(
                    `/api/duocsi/cho-cap-thuoc/${encodeURIComponent(maDonThuoc)}/dieu-chinh`,
                    {
                        method: "PUT",
                        headers: {
                            "Authorization": "Bearer " + token,
                            "Content-Type": "application/json"
                        },
                        // Tên thuộc tính danh sách phải khớp với DTO Java
                        body: JSON.stringify({
                            chiTietDieuChinh: chiTietDieuChinh
                        })
                    }
                );

                const result = await response.text();

                if (!response.ok) {
                    throw new Error(
                        result || "Không lưu được điều chỉnh đơn thuốc."
                    );
                }

                sessionStorage.setItem(
                    "capThuocNotification",
                    JSON.stringify({
                        message: "Đã lưu điều chỉnh đơn thuốc!",
                        type: "success"
                    })
                );

                // Bước 1: Điều chỉnh đơn thuốc đã lưu thành công.
                // Bước 2: Tạo hóa đơn từ dữ liệu mới nhất trong CSDL.
                const hoaDonResponse = await fetch(
                    `/api/duocsi/cho-cap-thuoc/${encodeURIComponent(maDonThuoc)}/hoa-don`,
                    {
                        method: "POST",
                        headers: {
                            "Authorization": "Bearer " + token,
                            "Content-Type": "application/json"
                        }
                    }
                );

                const hoaDonData = await hoaDonResponse.json();

                if (!hoaDonResponse.ok || !hoaDonData.success) {
                    throw new Error(
                        hoaDonData.message || "Không thể tạo hóa đơn thuốc."
                    );
                }

                // Lưu mã hóa đơn để sử dụng ở bước thanh toán.
                sessionStorage.setItem(
                    "hoaDonThuocChoThanhToan",
                    JSON.stringify({
                        maDonThuoc: maDonThuoc,
                        maHoaDon: hoaDonData.maHoaDon
                    })
                );

                // Tạm thời chuyển đến màn hình cấp thuốc.
                // Bước tiếp theo sẽ thay bằng giao diện thanh toán QR.
                window.location.href =
                    "/DuocSi/cap-thuoc/" + encodeURIComponent(maDonThuoc);

            } catch (error) {
                console.error("Lỗi lưu điều chỉnh đơn thuốc:", error);
                showNotification(
                    error.message || "Có lỗi khi lưu điều chỉnh.",
                    "error"
                );
            } finally {
                dispenseButton.disabled = false;
                dispenseButton.textContent = "Cấp thuốc";
            }
        });
    }


    // =====================================================
    // KHỞI ĐỘNG
    // =====================================================

    loadDetail();

});
