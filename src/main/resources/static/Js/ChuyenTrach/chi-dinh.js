
document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const API = "/api/chuyen-trach/danh-sach-chi-dinh";
    const CLS_API = "/api/chuyen-trach/luot-kham";
    const PAGE_SIZE = 50;

    const $ = id => document.getElementById(id);

    const search = $("ctcdSearch");
    const fromDate = $("ctcdFromDate");
    const toDate = $("ctcdToDate");
    const roomFilter = $("ctcdRoom");
    const statusFilter = $("ctcdStatus");

    const tableBody = $("ctcdTableBody");
    const count = $("ctcdCount");
    const pageInfo = $("ctcdPageInfo");
    const currentPage = $("ctcdCurrentPage");
    const previous = $("ctcdPrevious");
    const next = $("ctcdNext");
    const refresh = $("ctcdRefresh");

    const modal = $("ctcdModal");
    const confirmModal = $("ctcdConfirm");
    const modalAction = $("ctcdModalAction");

    let page = 1;
    let totalPages = 1;
    let requestId = 0;
    let timer = null;
    let busy = false;
    let selectedOrder = null;
    let lastFocus = null;

    if (!tableBody || !modal || !confirmModal) return;

    // ==========================================
    // 1. NGÀY VIỆT NAM
    // ==========================================

    function todayVietnam() {
        const parts = new Intl.DateTimeFormat(
            "en-US",
            {
                timeZone: "Asia/Ho_Chi_Minh",
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            }
        ).formatToParts(new Date());

        const value = type =>
            parts.find(p => p.type === type)?.value || "";

        return (
            value("year") + "-" +
            value("month") + "-" +
            value("day")
        );
    }

    const today = todayVietnam();
    fromDate.value = today.slice(0, 8) + "01";
    toDate.value = today;

    // ==========================================
    // 2. GỌI API
    // ==========================================

    function getToken() {
        return sessionStorage.getItem("Token") ||
               localStorage.getItem("Token");
    }

    async function apiRequest(url, method = "GET") {
        const token = getToken();

        if (!token) {
            throw new Error(
                "Vui lòng đăng nhập tài khoản chuyên trách."
            );
        }

        const response = await fetch(url, {
            method,
            cache: "no-store",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            let message =
                `Yêu cầu thất bại (HTTP ${response.status}).`;

            try {
                const data = await response.json();
                message = data.detail ||
                          data.message ||
                          message;
            } catch (_) {}

            if ([401, 403].includes(response.status)) {
                message =
                    "Phiên đăng nhập không hợp lệ hoặc không có quyền.";
            }

            if (response.status === 409) {
                message =
                    "Trạng thái lượt khám đã thay đổi. Vui lòng làm mới.";
            }

            throw new Error(message);
        }

        return response.json();
    }

    // ==========================================
    // 3. HÀM TẠO HTML AN TOÀN
    // ==========================================

    function create(tag, className = "", value = null) {
        const node = document.createElement(tag);

        if (className) node.className = className;

        if (value !== null && value !== undefined) {
            node.textContent = String(value);
        }

        return node;
    }

    function cell(row, value, className = "") {
        const td = create("td", className, value ?? "—");
        row.appendChild(td);
        return td;
    }

    function setText(id, value) {
        const node = $(id);

        if (node) {
            node.textContent =
                value === undefined ||
                value === null ||
                value === ""
                    ? "—"
                    : String(value);
        }
    }

    function showMessage(message) {
        tableBody.replaceChildren();

        const tr = document.createElement("tr");
        const td = create(
            "td",
            "ctcd-empty",
            message
        );

        td.colSpan = 9;
        tr.appendChild(td);
        tableBody.appendChild(tr);
    }

    function formatDate(value) {
        if (!value) return "—";

        const raw = String(value);
        const [date, time] = raw.split("T");
        const parts = date.split("-");

        if (parts.length !== 3) return raw;

        return (
            `${parts[2]}/${parts[1]}/${parts[0]}` +
            (time ? ` ${time.slice(0, 5)}` : "")
        );
    }

    function patientCode(id) {
        return "BN" + String(id).padStart(6, "0");
    }

    function orderCode(id) {
        return "CD" + String(id).padStart(6, "0");
    }

    // ==========================================
    // 4. PHÂN BIỆT TRẠNG THÁI CHỈ ĐỊNH
    // VÀ TRẠNG THÁI LƯỢT KHÁM
    // ==========================================

    function orderStatus(status) {
        switch (status) {
            case "ChoThucHien":
                return {
                    text: "Chờ thực hiện",
                    css: "waiting"
                };

            case "DangThucHien":
                return {
                    text: "Đang thực hiện",
                    css: "doing"
                };

            case "DaHoanThanh":
                return {
                    text: "Đã hoàn thành",
                    css: "done"
                };

            default:
                return {
                    text: status || "Chưa xác định",
                    css: "other"
                };
        }
    }

    function visitStatus(status) {
        switch (status) {
            case "ChoCLS":
                return "Lượt khám: Chờ CLS";

            case "DangCLS":
                return "Lượt khám: Đang CLS";

            case "ChoKham":
                return "Lượt khám: Chờ bác sĩ";

            default:
                return "Lượt khám: " + (status || "—");
        }
    }

    // ==========================================
    // 5. HIỂN THỊ PHÒNG
    // ==========================================

    function updateRooms(rooms) {
        const selected = roomFilter.value;

        roomFilter.replaceChildren();

        const all = create(
            "option",
            "",
            "Tất cả phòng"
        );

        all.value = "";
        roomFilter.appendChild(all);

        rooms.forEach(room => {
            const option = create(
                "option",
                "",
                room.name
            );

            option.value = String(room.id);
            roomFilter.appendChild(option);
        });

        const exists = [...roomFilter.options].some(
            option => option.value === selected
        );

        roomFilter.value = exists ? selected : "";
    }

    // ==========================================
    // 6. RENDER BẢNG
    // ==========================================

    function renderTable(items) {
        tableBody.replaceChildren();

        if (!items.length) {
            showMessage(
                "Không tìm thấy chỉ định phù hợp với bộ lọc."
            );
            return;
        }

        items.forEach((item, index) => {
            const tr = document.createElement("tr");

            // STT
            cell(
                tr,
                (page - 1) * PAGE_SIZE + index + 1
            );

            // Mã chỉ định
            cell(
                tr,
                orderCode(item.maChiDinh),
                "ctcd-order-code"
            );

            // Bệnh nhân
            const patientTd = document.createElement("td");

            patientTd.appendChild(
                create(
                    "strong",
                    "ctcd-patient-name",
                    item.tenBenhNhan
                )
            );

            patientTd.appendChild(
                create(
                    "small",
                    "ctcd-patient-id",
                    patientCode(item.maBenhNhan)
                )
            );

            tr.appendChild(patientTd);

            // Dịch vụ
            const serviceTd = document.createElement("td");

            const service = create(
                "span",
                "ctcd-service-name",
                item.dichVu || "Chưa có dịch vụ"
            );

            service.title = item.dichVu || "";

            serviceTd.appendChild(service);
            tr.appendChild(serviceTd);

            // Bác sĩ
            const doctorTd = document.createElement("td");

            const doctor = create(
                "span",
                "ctcd-doctor-name",
                item.bacSiChiDinh || "—"
            );

            doctor.title = item.bacSiChiDinh || "";
            doctorTd.appendChild(doctor);
            tr.appendChild(doctorTd);

            // Phòng
            const roomTd = document.createElement("td");

            const room = create(
                "span",
                "ctcd-room-name",
                item.tenPhong || "Chưa phân phòng"
            );

            room.title = item.tenPhong || "";
            roomTd.appendChild(room);
            tr.appendChild(roomTd);

            // Ngày chỉ định
            cell(
                tr,
                formatDate(item.ngayChiDinh),
                "ctcd-date"
            );

            // Trạng thái thực của ChiDinhYTe
            const statusTd = document.createElement("td");

            const s = orderStatus(
                item.trangThaiChiDinh
            );

            const badge = create(
                "span",
                `ctcd-badge ${s.css}`,
                s.text
            );

            badge.title = visitStatus(
                item.trangThaiLuotKham
            );

            statusTd.appendChild(badge);
            tr.appendChild(statusTd);

            // Nút Xem
            const actionTd = document.createElement("td");

            const button = create(
                "button",
                "ctcd-view",
                "Xem"
            );

            button.type = "button";

            button.addEventListener("click", () => {
                window.location.assign(
                    "/ChuyenTrach/chi-dinh/" +
                    encodeURIComponent(item.maChiDinh)
                );
            });


            actionTd.appendChild(button);
            tr.appendChild(actionTd);

            tableBody.appendChild(tr);
        });
    }

    // ==========================================
    // 7. PHÂN TRANG
    // ==========================================

    function updatePagination(data) {
        page = Number(data.page) || 1;
        totalPages = Number(data.totalPages) || 1;

        const total = Number(data.total) || 0;

        count.textContent = `${total} chỉ định`;
        currentPage.textContent = String(page);

        previous.disabled = page <= 1;
        next.disabled = page >= totalPages;

        const first = total === 0
            ? 0
            : (page - 1) * PAGE_SIZE + 1;

        const last = Math.min(
            page * PAGE_SIZE,
            total
        );

        pageInfo.textContent =
            `Hiển thị ${first}-${last} / ${total} chỉ định` +
            ` • Trang ${page}/${totalPages}`;
    }

    // ==========================================
    // 8. TẢI CHỈ ĐỊNH TỪ MYSQL
    // ==========================================

    async function loadOrders() {
        const version = ++requestId;

        showMessage("Đang tải chỉ định từ hệ thống...");

        if (
            fromDate.value &&
            toDate.value &&
            fromDate.value > toDate.value
        ) {
            showMessage(
                "Ngày bắt đầu không được lớn hơn ngày kết thúc."
            );
            return;
        }

        const params = new URLSearchParams({
            tuNgay: fromDate.value,
            denNgay: toDate.value,
            q: search.value.trim(),
            phong: roomFilter.value,
            trangThai: statusFilter.value,
            page: String(page),
            pageSize: String(PAGE_SIZE)
        });

        try {
            const data = await apiRequest(
                `${API}?${params.toString()}`
            );

            if (version !== requestId) return;

            if (!Array.isArray(data.items)) {
                throw new Error(
                    "API không trả về danh sách hợp lệ."
                );
            }

            updateRooms(
                Array.isArray(data.phong)
                    ? data.phong
                    : []
            );

            updatePagination(data);
            renderTable(data.items);

        } catch (error) {
            if (version !== requestId) return;

            console.error("Lỗi danh sách chỉ định:", error);

            showMessage(error.message);
            count.textContent = "Không thể tải dữ liệu";
            pageInfo.textContent = "Có lỗi khi tải chỉ định";

            previous.disabled = true;
            next.disabled = true;
        }
    }

    // ==========================================
    // 9. BỘ LỌC
    // ==========================================

    function reloadFirstPage() {
        page = 1;
        loadOrders();
    }

    search.addEventListener("input", () => {
        clearTimeout(timer);

        timer = setTimeout(
            reloadFirstPage,
            350
        );
    });

    [
        fromDate,
        toDate,
        roomFilter,
        statusFilter
    ].forEach(control => {
        control.addEventListener(
            "change",
            reloadFirstPage
        );
    });

    previous.addEventListener("click", () => {
        if (page <= 1) return;
        page--;
        loadOrders();
    });

    next.addEventListener("click", () => {
        if (page >= totalPages) return;
        page++;
        loadOrders();
    });

    // Nút làm mới riêng (nếu có)
    if (refresh) {
        refresh.addEventListener("click", loadOrders);
    }

    // ==========================================
    // 10. POPUP CHI TIẾT
    // ==========================================

    function closeDetail() {
        modal.hidden = true;
        selectedOrder = null;

        if (lastFocus?.isConnected) {
            lastFocus.focus();
        }
    }

    function resultUrl(item) {
        const url =
            `/ChuyenTrach/nhap-ket-qua/` +
            encodeURIComponent(item.maLichKham);

        const params = new URLSearchParams({
            maChiDinh: String(item.maChiDinh)
        });

        return `${url}?${params.toString()}`;
    }

    function openDetail(item, button) {
        lastFocus = button;
        selectedOrder = item;

        setText(
            "ctcdDetailId",
            orderCode(item.maChiDinh)
        );

        setText(
            "ctcdDetailLich",
            item.maLichKham
        );

        setText(
            "ctcdDetailPatient",
            `${item.tenBenhNhan} - ` +
            patientCode(item.maBenhNhan)
        );

        setText(
            "ctcdDetailDoctor",
            item.bacSiChiDinh
        );

        setText(
            "ctcdDetailRoom",
            item.tenPhong
        );

        setText(
            "ctcdDetailDate",
            formatDate(item.ngayChiDinh)
        );

        setText(
            "ctcdDetailStatus",
            orderStatus(item.trangThaiChiDinh).text
        );

        setText(
            "ctcdDetailVisit",
            visitStatus(item.trangThaiLuotKham)
        );

        setText(
            "ctcdDetailService",
            item.dichVu
        );

        modalAction.hidden = true;

        // Chỉ cho thao tác khi chỉ định chưa hoàn thành
        if (item.trangThaiChiDinh !== "DaHoanThanh") {
            if (item.trangThaiLuotKham === "ChoCLS") {
                modalAction.hidden = false;
                modalAction.textContent = "Bắt đầu CLS";

            } else if (
                item.trangThaiLuotKham === "DangCLS"
            ) {
                modalAction.hidden = false;
                modalAction.textContent = "Nhập kết quả";
            }
        }

        modal.hidden = false;
        $("ctcdClose").focus();
    }

    $("ctcdClose").addEventListener(
        "click",
        closeDetail
    );

    $("ctcdCloseBottom").addEventListener(
        "click",
        closeDetail
    );

    modal.addEventListener("click", event => {
        if (event.target === modal) {
            closeDetail();
        }
    });

    // ==========================================
    // 11. POPUP XÁC NHẬN BẮT ĐẦU
    // ==========================================

    function askConfirmation(message) {
        return new Promise(resolve => {
            $("ctcdConfirmTitle").textContent = "Xác nhận bắt đầu CLS";
            $("ctcdAccept").hidden = false;
            $("ctcdCancel").textContent = "Hủy";
            $("ctcdConfirmText").textContent = message;

            confirmModal.hidden = false;
            let closed = false;

            const accept = $("ctcdAccept");
            const cancel = $("ctcdCancel");

            function close(result) {
                if (closed) return;
                closed = true;

                confirmModal.hidden = true;

                accept.removeEventListener(
                    "click", onAccept
                );

                cancel.removeEventListener(
                    "click", onCancel
                );

                confirmModal.removeEventListener(
                    "click", onOverlay
                );

                document.removeEventListener(
                    "keydown", onKeyDown
                );

                resolve(result);
            }

            function onAccept() {
                close(true);
            }

            function onCancel() {
                close(false);
            }

            function onOverlay(event) {
                if (event.target === confirmModal) {
                    close(false);
                }
            }

            function onKeyDown(event) {
                if (event.key === "Escape") {
                    close(false);
                }
            }

            accept.addEventListener(
                "click", onAccept
            );

            cancel.addEventListener(
                "click", onCancel
            );

            confirmModal.addEventListener(
                "click", onOverlay
            );

            document.addEventListener(
                "keydown", onKeyDown
            );

            cancel.focus();
        });
    }

    // ==========================================
    // 12. BẮT ĐẦU HOẶC TIẾP TỤC CLS
    // ==========================================

    modalAction.addEventListener("click", async () => {
        if (busy || !selectedOrder) return;

        const item = selectedOrder;

        // Ca đã DangCLS: mở trang nhập kết quả.
        if (item.trangThaiLuotKham === "DangCLS") {
            window.location.assign(resultUrl(item));
            return;
        }

        if (item.trangThaiLuotKham !== "ChoCLS") {
            return;
        }

        const confirmed = await askConfirmation(
            "Xác nhận bắt đầu khám chuyên trách cho " +
            "bệnh nhân " + item.tenBenhNhan + "?"
        );

        if (!confirmed || busy) return;

        busy = true;
        modalAction.disabled = true;
        modalAction.textContent = "Đang xử lý...";

        try {
            await apiRequest(
                `${CLS_API}/${encodeURIComponent(item.maLichKham)}/bat-dau`,
                "POST"
            );

            // API thành công mới chuyển trang.
            window.location.assign(resultUrl(item));

        } catch (error) {
            console.error("Lỗi bắt đầu CLS:", error);

            closeDetail();
            await loadOrders();

            // Chỉ thông báo lỗi; không cập nhật DB tại frontend.
            showErrorModal(error.message);

        } finally {
            busy = false;
            modalAction.disabled = false;
            modalAction.textContent = "Bắt đầu CLS";
        }
    });

    // Thông báo lỗi đơn giản, không dùng alert của Chrome.
    function showErrorModal(message) {
        $("ctcdConfirmTitle").textContent =
            "Không thể thực hiện";

        $("ctcdConfirmText").textContent = message;

        const accept = $("ctcdAccept");
        const cancel = $("ctcdCancel");

        accept.hidden = true;
        cancel.textContent = "Đóng";
        confirmModal.hidden = false;

        function close() {
            confirmModal.hidden = true;
            accept.hidden = false;
            cancel.textContent = "Hủy";

            cancel.removeEventListener("click", close);
            confirmModal.removeEventListener("click", outside);
        }

        function outside(event) {
            if (event.target === confirmModal) close();
        }

        cancel.addEventListener("click", close);
        confirmModal.addEventListener("click", outside);
        cancel.focus();
    }

    document.addEventListener("keydown", event => {
        if (
            event.key === "Escape" &&
            !modal.hidden &&
            confirmModal.hidden
        ) {
            closeDetail();
        }
    });

    // ==========================================
    // 13. KHỞI TẠO
    // ==========================================

    // Popup đặt ở body để căn đúng giữa màn hình.
    document.body.appendChild(modal);
    document.body.appendChild(confirmModal);

    loadOrders();
});
