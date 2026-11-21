
document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    // ============================================
    // 1. KHAI BÁO
    // ============================================

    const statCards = document.getElementById("statCards");
    const tableArea = document.getElementById("tableArea");
    const newBadge = document.getElementById("newBadge");
    const viewAllPatients = document.getElementById("viewAllPatients");

    const modal = document.getElementById("ctConfirmModal");
    const modalMessage = document.getElementById("ctModalMessage");
    const modalCancel = document.getElementById("ctModalCancel");
    const modalConfirm = document.getElementById("ctModalConfirm");

    if (!statCards || !tableArea) {
        console.error("Dashboard: Không tìm thấy statCards hoặc tableArea.");
        return;
    }

    const API = "/api/chuyen-trach/luot-kham";
    const MAX_DASHBOARD_ROWS = 5;

    let isLoading = false;
    let isProcessing = false;

    // ============================================
    // 2. LẤY ĐƯỜNG DẪN BỆNH NHÂN ĐANG CHỜ
    // ============================================

    function setupViewAllLink() {
        if (!viewAllPatients) return;

        const sidebarLinks = [
            ...document.querySelectorAll(".reception-sidebar a[href]")
        ];

        const waitingLink = sidebarLinks.find(link =>
            link.textContent.trim().includes("Bệnh nhân đang chờ")
        );

        const href = waitingLink?.getAttribute("href");

        if (href && href !== "#" && !href.startsWith("javascript:")) {
            viewAllPatients.setAttribute("href", href);
            viewAllPatients.removeAttribute("aria-disabled");
        } else {
            viewAllPatients.removeAttribute("href");
            viewAllPatients.setAttribute("aria-disabled", "true");
            viewAllPatients.title =
                "Mục Bệnh nhân đang chờ chưa có đường dẫn hợp lệ.";
        }
    }

    // ============================================
    // 3. LẤY TOKEN ĐĂNG NHẬP
    // ============================================

    function getToken() {
        return sessionStorage.getItem("Token") ||
               localStorage.getItem("Token");
    }

    // ============================================
    // 4. GỌI API THẬT
    // ============================================
    async function apiRequest(path, method = "GET") {
        const token = getToken();

        if (!token) {
            throw new Error(
                "Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn."
            );
        }

        const response = await fetch(API + path, {
            method,
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`
            },
            cache: "no-store"
        });

        const raw = await response.text();
        let data = null;

        try {
            data = raw ? JSON.parse(raw) : null;
        } catch {
            data = { message: raw };
        }

        if (!response.ok) {
            console.error("API chuyên trách lỗi:", {
                url: API + path,
                status: response.status,
                response: data
            });

            throw new Error(
                data?.message ||
                data?.detail ||
                data?.error ||
                `Không thể xử lý yêu cầu (HTTP ${response.status}).`
            );
        }

        return data;
    }


    // ============================================
    // 5. TẠO PHẦN TỬ HTML AN TOÀN
    // ============================================

    function element(tag, className = "", text = null) {
        const node = document.createElement(tag);

        if (className) {
            node.className = className;
        }

        if (text !== null && text !== undefined) {
            node.textContent = String(text);
        }

        return node;
    }

    function addCell(row, value, className = "") {
        const cell = element("td", className, value ?? "—");
        row.appendChild(cell);
        return cell;
    }

    function formatTime(value) {
        if (!value) return "—";
        return String(value).slice(0, 5);
    }

    // ============================================
    // 6. TRẠNG THÁI
    // ============================================

    function getStatus(status) {
        switch (status) {
            case "ChoThucHien":
                return {
                    label: "Chờ thực hiện",
                    className: "ct-status ct-status-waiting"
                };

            case "DangThucHien":
                return {
                    label: "Đang thực hiện",
                    className: "ct-status ct-status-processing"
                };

            case "DaHoanThanh":
                return {
                    label: "Đã hoàn thành",
                    className: "ct-status ct-status-done"
                };

            default:
                return {
                    label: status || "Không xác định",
                    className: "ct-status"
                };
        }
    }

    // ============================================
    // 7. RENDER 4 Ô THỐNG KÊ
    // ============================================

    function renderCards(rows) {
        const orders = rows.flatMap(item => item.chiDinh || []);

        const choCLS = orders.filter(
            order => order.trangThai === "ChoThucHien"
        ).length;

        const dangCLS = orders.filter(
            order => order.trangThai === "DangThucHien"
        ).length;

        const cards = [
            {
                color: "blue",
                title: "Lượt CLS đang xử lý",
                value: orders.length,
                note: "Chỉ định CLS",
                icon: "fa-regular fa-calendar-check"
            },
            {
                color: "teal",
                title: "Chờ thực hiện",
                value: choCLS,
                note: "Chỉ định",
                icon: "fa-regular fa-clock"
            },
            {
                color: "purple",
                title: "Đang thực hiện",
                value: dangCLS,
                note: "Chỉ định",
                icon: "fa-solid fa-stethoscope"
            },
            {
                color: "green",
                title: "Đã hoàn thành",
                value: "—",
                note: "Chưa có thống kê riêng",
                icon: "fa-regular fa-circle-check"
            }
        ];

        statCards.replaceChildren();

        cards.forEach((cardData, index) => {
            const card = element(
                "article",
                `ct-stat-card ${cardData.color}`
            );

            const content = element("div", "ct-stat-content");

            content.appendChild(
                element("div", "ct-stat-label", cardData.title)
            );

            content.appendChild(
                element("div", "ct-stat-value", cardData.value)
            );

            content.appendChild(
                element("div", "ct-stat-note", cardData.note)
            );

            const iconWrapper = element("div", "ct-stat-icon");
            const icon = element("i", cardData.icon);

            icon.setAttribute("aria-hidden", "true");
            iconWrapper.appendChild(icon);

            card.appendChild(content);
            card.appendChild(iconWrapper);

            if (index === 2 && dangCLS > 0) {
                card.style.cursor = "pointer";
                card.title = "Tiếp tục chỉ định đang thực hiện";
                card.setAttribute("role", "button");
                card.setAttribute("tabindex", "0");

                const openDoingOrder = () => {
                    const appointment = rows.find(item =>
                        (item.chiDinh || []).some(
                            order => order.trangThai === "DangThucHien"
                        )
                    );

                    if (appointment) {
                        openResultPage(appointment.maLichKham);
                    }
                };

                card.addEventListener("click", openDoingOrder);

                card.addEventListener("keydown", event => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openDoingOrder();
                    }
                });
            }

            statCards.appendChild(card);
        });

        if (newBadge) {
            newBadge.textContent = `${choCLS} chờ`;
        }
    }

    // ============================================
    // 8. HIỂN THỊ THÔNG BÁO TRONG BẢNG
    // ============================================

    function showMessage(message) {
        tableArea.replaceChildren(
            element("div", "ct-table-empty", message)
        );
    }

    // ============================================
    // 9. POPUP XÁC NHẬN Ở GIỮA MÀN HÌNH
    // ============================================

    function showConfirmModal(message) {
        return new Promise(resolve => {
            if (!modal || !modalMessage ||
                !modalCancel || !modalConfirm) {

                console.error("Thiếu HTML popup xác nhận.");
                resolve(false);
                return;
            }

            const previousFocus = document.activeElement;
            let closed = false;

            modalMessage.textContent = message;
            modal.hidden = false;

            function close(result) {
                if (closed) return;
                closed = true;

                modal.hidden = true;

                modalCancel.removeEventListener("click", onCancel);
                modalConfirm.removeEventListener("click", onConfirm);
                modal.removeEventListener("click", onOverlayClick);
                document.removeEventListener("keydown", onKeyDown);

                if (previousFocus && previousFocus.isConnected) {
                    previousFocus.focus();
                }

                resolve(result);
            }

            function onCancel() {
                close(false);
            }

            function onConfirm() {
                close(true);
            }

            function onOverlayClick(event) {
                if (event.target === modal) {
                    close(false);
                }
            }

            function onKeyDown(event) {
                if (event.key === "Escape") {
                    close(false);
                }

                // Giữ Tab trong popup.
                if (event.key === "Tab") {
                    const buttons = [modalCancel, modalConfirm];

                    if (event.shiftKey &&
                        document.activeElement === buttons[0]) {
                        event.preventDefault();
                        buttons[1].focus();
                    } else if (!event.shiftKey &&
                        document.activeElement === buttons[1]) {
                        event.preventDefault();
                        buttons[0].focus();
                    }
                }
            }

            modalCancel.addEventListener("click", onCancel);
            modalConfirm.addEventListener("click", onConfirm);
            modal.addEventListener("click", onOverlayClick);
            document.addEventListener("keydown", onKeyDown);

            modalCancel.focus();
        });
    }

    // ============================================
    // 10. MỞ TRANG NHẬP KẾT QUẢ
    // ============================================

    function openResultPage(maLichKham) {
        window.location.assign(
            `/ChuyenTrach/nhap-ket-qua/${encodeURIComponent(maLichKham)}`
        );
    }

    // ============================================
    // 11. BẮT ĐẦU KHÁM CHUYÊN TRÁCH
    // ChoCLS -> DangCLS
    // ============================================

    async function batDauCLS(item, button) {
        if (item.trangThai !== "ChoThucHien" || isProcessing) {
            return;
        }

        const confirmed = await showConfirmModal(
            `Bạn có chắc chắn muốn bắt đầu thực hiện dịch vụ ${item.tenDichVu} cho bệnh nhân ${item.tenBenhNhan}?`
        );

        if (!confirmed) return;
        if (isProcessing) return;

        isProcessing = true;
        button.disabled = true;
        button.textContent = "Đang xử lý...";

        try {
            await apiRequest(
                `/${item.maLichKham}/chi-dinh/${item.maChiDinh}/bat-dau`,
                "POST"
            );

            openResultPage(item.maLichKham);

        } catch (error) {
            console.error("Lỗi bắt đầu CLS:", error);

            button.disabled = false;
            button.textContent = "Thực hiện";

            window.alert(error.message);

            await loadDashboard();

        } finally {
            isProcessing = false;
        }
    }

    // ============================================
    // 12. RENDER BẢNG BỆNH NHÂN CHỜ CLS
    // ============================================

    function renderTable(rows, totalWaiting) {
        tableArea.replaceChildren();

        if (rows.length === 0) {
            showMessage(
                "Không có chỉ định CLS chờ thực hiện hôm nay."
            );
            return;
        }

        const wrapper = element("div", "ct-table-wrap");
        const table = element("table", "ct-order-table");

        const thead = document.createElement("thead");
        const tbody = document.createElement("tbody");
        const headerRow = document.createElement("tr");

        const columns = [
            "STT",
            "MÃ LỊCH",
            "MÃ BN",
            "TÊN BỆNH NHÂN",
            "DỊCH VỤ",
            "BÁC SĨ PHỤ TRÁCH",
            "GIỜ",
            "TRẠNG THÁI",
            "THAO TÁC"
        ];

        columns.forEach(title => {
            headerRow.appendChild(element("th", "", title));
        });

        thead.appendChild(headerRow);

        rows.forEach((item, index) => {
            const row = document.createElement("tr");

            addCell(row, index + 1);

            addCell(row, item.maLichKham, "ct-code-cell");

            addCell(row, item.maBenhNhan);

            addCell(row, item.tenBenhNhan, "ct-name-cell");

            const serviceCell = document.createElement("td");

            serviceCell.appendChild(
                element(
                    "span",
                    "ct-service-tag",
                    item.tenDichVu || "Chưa có dịch vụ"
                )
            );

            row.appendChild(serviceCell);

            addCell(
                row,
                item.bacSiPhuTrach || "Chưa có bác sĩ"
            );

            addCell(row, formatTime(item.gioKham));

            const status = getStatus(item.trangThai);
            const statusCell = document.createElement("td");

            statusCell.appendChild(
                element(
                    "span",
                    status.className,
                    status.label
                )
            );

            row.appendChild(statusCell);

            const actionCell = document.createElement("td");
            const actionGroup = element("div", "ct-action-group");

            if (item.trangThai === "ChoThucHien") {
                const button = element(
                    "button",
                    "ct-action-btn",
                    "Thực hiện"
                );

                button.type = "button";

                button.addEventListener("click", () => {
                    batDauCLS(item, button);
                });

                actionGroup.appendChild(button);
            }

            actionCell.appendChild(actionGroup);
            row.appendChild(actionCell);

            tbody.appendChild(row);
        });

        table.appendChild(thead);
        table.appendChild(tbody);

        wrapper.appendChild(table);

        const footer = element("div", "ct-table-footer");

        footer.appendChild(
            element(
                "div",
                "ct-footer-left",
                `Hiển thị ${rows.length}/${totalWaiting} chỉ định chờ CLS`
            )
        );

        footer.appendChild(
            element(
                "div",
                "ct-footer-right",
                "Công việc trong ngày"
            )
        );

        wrapper.appendChild(footer);
        tableArea.appendChild(wrapper);
    }

    // ============================================
    // 13. TẢI DỮ LIỆU TỪ BACKEND
    // ============================================

    async function loadDashboard() {
        if (isLoading) return;

        isLoading = true;

        showMessage("Đang tải dữ liệu từ hệ thống...");

        try {
            const data = await apiRequest("/hom-nay");

            if (!Array.isArray(data)) {
                throw new Error(
                    "API không trả về danh sách hợp lệ."
                );
            }

            renderCards(data);

            // Tách mỗi chỉ định thành một dòng độc lập.
            const allOrders = data.flatMap(appointment =>
                (appointment.chiDinh || []).map(order => ({
                    ...appointment,
                    ...order,
                    maLichKham: appointment.maLichKham,
                    maBenhNhan: appointment.maBenhNhan,
                    tenBenhNhan: appointment.tenBenhNhan,
                    bacSiPhuTrach: appointment.bacSiPhuTrach,
                    gioKham: appointment.gioKham
                }))
            );

            const waitingOrders = allOrders.filter(
                item => item.trangThai === "ChoThucHien"
            );

            waitingOrders.sort((a, b) => {
                const timeCompare = String(
                    a.gioKham || ""
                ).localeCompare(
                    String(b.gioKham || "")
                );

                if (timeCompare !== 0) {
                    return timeCompare;
                }

                return Number(a.maLichKham) -
                       Number(b.maLichKham);
            });

            const displayedOrders =
                waitingOrders.slice(0, MAX_DASHBOARD_ROWS);

            renderTable(
                displayedOrders,
                waitingOrders.length
            );

        } catch (error) {
            console.error("Dashboard chuyên trách:", error);
            showMessage(error.message);

        } finally {
            isLoading = false;
        }
    }

    // ============================================
    // 14. KHỞI TẠO
    // ============================================

    setupViewAllLink();
    loadDashboard();
});
