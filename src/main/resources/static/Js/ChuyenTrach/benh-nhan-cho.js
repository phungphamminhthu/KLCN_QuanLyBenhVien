
document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    // ============================================
    // 1. KHAI BÁO
    // ============================================

    const $ = id => document.getElementById(id);

    const LIST_API =
        "/api/chuyen-trach/danh-sach-benh-nhan";

    const CLS_API =
        "/api/chuyen-trach/luot-kham";

    const PAGE_SIZE = 7;

    const tableBody = $("ctqTableBody");
    const countBadge = $("ctqCount");
    const roomFilter = $("ctqRoomFilter");

    const pageInfo = $("ctqPageInfo");
    const pageNumber = $("ctqCurrentPage");
    const prevButton = $("ctqPrev");
    const nextButton = $("ctqNext");

    const patientModal = $("ctqPatientModal");
    const confirmModal = $("ctqConfirmModal");

    const closeModalButton = $("ctqCloseModal");
    const closeBottomButton = $("ctqCloseBottom");
    const startButton = $("ctqStartBtn");
    const cancelStartButton = $("ctqCancelStart");
    const confirmStartButton = $("ctqConfirmStart");

    if (!tableBody || !roomFilter || !patientModal) {
        console.error(
            "Trang bệnh nhân đang chờ thiếu phần tử HTML."
        );
        return;
    }

    let currentPage = 1;
    let totalPages = 1;
    let totalPatients = 0;

    let requestVersion = 0;
    let currentPatient = null;
    let previousFocus = null;

    let processing = false;
    let modalLoading = false;

    // ============================================
    // 2. NGÀY HIỆN TẠI THEO VIỆT NAM
    // ============================================

    function getTodayVietnam() {
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
            parts.find(part => part.type === type)?.value || "";

        return (
            value("year") + "-" +
            value("month") + "-" +
            value("day")
        );
    }

    // ============================================
    // 3. TOKEN
    // ============================================

    function getToken() {
        return (
            sessionStorage.getItem("Token") ||
            localStorage.getItem("Token")
        );
    }

    // ============================================
    // 4. GỌI API THẬT
    // ============================================

    async function apiRequest(
        url,
        method = "GET"
    ) {
        const token = getToken();

        if (!token) {
            throw new Error(
                "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại."
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
                const error = await response.json();

                message =
                    error.detail ||
                    error.message ||
                    message;

            } catch (_) {
                // Giữ thông báo HTTP mặc định.
            }

            if (
                response.status === 401 ||
                response.status === 403
            ) {
                message =
                    "Bạn không có quyền truy cập hoặc phiên đăng nhập đã hết hạn.";
            }

            if (response.status === 409) {
                message =
                    "Trạng thái lượt khám đã thay đổi. Vui lòng tải lại danh sách.";
            }

            throw new Error(message);
        }

        return response.json();
    }

    // ============================================
    // 5. CÁC HÀM HTML AN TOÀN
    // ============================================

    function element(
        tag,
        className = "",
        text = null
    ) {
        const node = document.createElement(tag);

        if (className) {
            node.className = className;
        }

        if (
            text !== null &&
            text !== undefined
        ) {
            node.textContent = String(text);
        }

        return node;
    }

    function addCell(row, value, className = "") {
        const td = element(
            "td",
            className,
            value ?? "—"
        );

        row.appendChild(td);

        return td;
    }

    function createIcon(className) {
        const icon = element("i", className);

        icon.setAttribute(
            "aria-hidden",
            "true"
        );

        return icon;
    }

    function setText(id, value) {
        const node = $(id);

        if (!node) return;

        node.textContent =
            value === null ||
            value === undefined ||
            value === ""
                ? "—"
                : String(value);
    }

    // ============================================
    // 6. ĐỊNH DẠNG
    // ============================================

    function formatDate(value) {
        if (!value) return "—";

        const parts = String(value)
            .slice(0, 10)
            .split("-");

        if (parts.length !== 3) {
            return String(value);
        }

        return (
            parts[2] + "/" +
            parts[1] + "/" +
            parts[0]
        );
    }

    function formatTime(value) {
        if (!value) return "—";

        return String(value).slice(0, 5);
    }

    function formatPatientCode(id) {
        return "BN" +
            String(id).padStart(6, "0");
    }

    // ============================================
    // 7. HIỂN THỊ THÔNG BÁO TRONG BẢNG
    // ============================================

    function showTableMessage(message) {
        tableBody.replaceChildren();

        const row = document.createElement("tr");

        const cell = element(
            "td",
            "ctq-empty",
            message
        );

        cell.colSpan = 7;

        row.appendChild(cell);
        tableBody.appendChild(row);
    }

    // ============================================
    // 8. HIỂN THỊ DANH SÁCH PHÒNG
    // ============================================

    function updateRoomOptions(rooms) {
        const selected = roomFilter.value;

        roomFilter.replaceChildren();

        const allOption = element(
            "option",
            "",
            "Tất cả phòng chuyên trách"
        );

        allOption.value = "";
        roomFilter.appendChild(allOption);

        rooms.forEach(room => {
            const option = element(
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

    // ============================================
    // 9. RENDER BẢNG HÀNG ĐỢI
    // ============================================

    function renderTable(rows) {
        tableBody.replaceChildren();

        if (!Array.isArray(rows) || rows.length === 0) {
            showTableMessage(
                "Không có chỉ định CLS chờ thực hiện phù hợp."
            );
            return;
        }

        rows.forEach((item, index) => {
            const row = document.createElement("tr");

            // STT
            addCell(
                row,
                (currentPage - 1) * PAGE_SIZE + index + 1
            );

            // BỆNH NHÂN
            const patientCell = document.createElement("td");
            const patientBox = element("div", "ctq-patient-cell");

            const patientName = element(
                "strong",
                "ctq-patient-name",
                item.hoTen || item.tenBenhNhan || "Chưa có tên"
            );

            patientName.title = item.hoTen || item.tenBenhNhan || "";

            const patientCode = element(
                "span",
                "ctq-patient-code",
                formatPatientCode(item.maBenhNhan)
            );

            patientBox.appendChild(patientName);
            patientBox.appendChild(patientCode);
            patientCell.appendChild(patientBox);
            row.appendChild(patientCell);

            // DỊCH VỤ
            const serviceCell = document.createElement("td");

            const serviceText = item.tenDichVu || "Chưa có chỉ định";

            const serviceElement = element(
                "span",
                "ctq-service",
                serviceText
            );

            serviceElement.title = serviceText;
            serviceCell.appendChild(serviceElement);
            row.appendChild(serviceCell);

            // PHÒNG
            const roomCell = document.createElement("td");

            const roomText = item.tenPhong ||
                (item.maPhong ? `Phòng ${item.maPhong}` : "Chưa phân phòng");

            const roomElement = element(
                "span",
                "ctq-room",
                roomText
            );

            roomElement.title = roomText;
            roomCell.appendChild(roomElement);
            row.appendChild(roomCell);

            // THỜI GIAN
            const timeCell = document.createElement("td");

            timeCell.appendChild(
                element(
                    "span",
                    "ctq-time",
                    formatTime(item.gioKham)
                )
            );

            timeCell.appendChild(
                element(
                    "span",
                    "ctq-date",
                    formatDate(item.ngayKham)
                )
            );

            row.appendChild(timeCell);

            // TRẠNG THÁI
            const statusCell = document.createElement("td");
            const status = element("span", "ctq-status");

            status.appendChild(
                element("span", "ctq-status-dot")
            );

            status.appendChild(
                document.createTextNode("Chờ thực hiện")
            );

            statusCell.appendChild(status);
            row.appendChild(statusCell);

            // XEM CHỈ ĐỊNH
            const actionCell = document.createElement("td");

            const viewButton = element(
                "button",
                "ctq-view-btn",
                "Xem"
            );

            viewButton.type = "button";

            viewButton.addEventListener("click", () => {
                openPatient(item, viewButton);
            });

            actionCell.appendChild(viewButton);
            row.appendChild(actionCell);

            tableBody.appendChild(row);
        });
    }

    // ============================================
    // 10. CẬP NHẬT PHÂN TRANG
    // ============================================

    function updatePagination(data) {
        currentPage = Number(data.page) || 1;
        totalPages = Number(data.totalPages) || 1;
        totalPatients = Number(data.total) || 0;

        pageNumber.textContent = String(currentPage);

        countBadge.textContent =
            totalPatients + " bệnh nhân";

        prevButton.disabled = currentPage <= 1;

        nextButton.disabled =
            currentPage >= totalPages;

        const from = totalPatients === 0
            ? 0
            : (currentPage - 1) * PAGE_SIZE + 1;

        const to = Math.min(
            currentPage * PAGE_SIZE,
            totalPatients
        );

        pageInfo.textContent =
            `Hiển thị ${from}-${to} trong tổng số ` +
            `${totalPatients} bệnh nhân chờ`;
    }

    // ============================================
    // 11. TẢI DANH SÁCH TỪ MYSQL
    // ============================================

    async function loadQueue() {
        const version = ++requestVersion;

        showTableMessage("Đang tải bệnh nhân chờ CLS...");

        try {
            const data = await apiRequest(`${CLS_API}/hom-nay`);

            if (version !== requestVersion) return;

            if (!Array.isArray(data)) {
                throw new Error("API không trả về danh sách hợp lệ.");
            }

            // Tách từng chỉ định CLS thành một dòng riêng.
            const allOrders = data.flatMap(appointment =>
                (appointment.chiDinh || []).map(order => ({
                    ...appointment,
                    ...order,
                    maLichKham: appointment.maLichKham,
                    maBenhNhan: appointment.maBenhNhan,
                    hoTen: appointment.tenBenhNhan,
                    gioKham: appointment.gioKham,
                    ngayKham: appointment.ngayKham,
                    bacSiPhuTrach: appointment.bacSiPhuTrach
                }))
            );

            // Chỉ lấy chỉ định đang chờ.
            let waitingOrders = allOrders.filter(
                order => order.trangThai === "ChoThucHien"
            );

            // Lọc phòng theo MaPhong.
            if (roomFilter.value) {
                waitingOrders = waitingOrders.filter(
                    order => String(order.maPhong || "") === roomFilter.value
                );
            }

            // Sắp xếp theo giờ khám.
            waitingOrders.sort((a, b) => {
                const timeCompare = String(a.gioKham || "")
                    .localeCompare(String(b.gioKham || ""));

                if (timeCompare !== 0) {
                    return timeCompare;
                }

                return Number(a.maLichKham) - Number(b.maLichKham);
            });

            // Tạo danh sách phòng từ dữ liệu thực.
            const roomMap = new Map();

            allOrders.forEach(order => {
                if (order.maPhong != null) {
                    roomMap.set(String(order.maPhong), {
                        id: order.maPhong,
                        name: order.tenPhong || `Phòng ${order.maPhong}`
                    });
                }
            });

            updateRoomOptions([...roomMap.values()]);

            // Phân trang phía frontend.
            totalPatients = waitingOrders.length;
            totalPages = Math.max(
                1,
                Math.ceil(totalPatients / PAGE_SIZE)
            );

            if (currentPage > totalPages) {
                currentPage = totalPages;
            }

            const startIndex = (currentPage - 1) * PAGE_SIZE;

            const displayedOrders = waitingOrders.slice(
                startIndex,
                startIndex + PAGE_SIZE
            );

            updatePagination({
                page: currentPage,
                totalPages,
                total: totalPatients
            });

            renderTable(displayedOrders);

        } catch (error) {
            if (version !== requestVersion) return;

            console.error("Lỗi tải hàng đợi CLS:", error);

            showTableMessage(error.message);

            countBadge.textContent = "Không thể tải";
            pageInfo.textContent = "Không thể tải dữ liệu";

            prevButton.disabled = true;
            nextButton.disabled = true;
        }
    }

    // ============================================
    // 12. SỰ KIỆN BỘ LỌC VÀ PHÂN TRANG
    // ============================================

    roomFilter.addEventListener("change", () => {
        currentPage = 1;
        loadQueue();
    });

    prevButton.addEventListener("click", () => {
        if (currentPage <= 1) return;

        currentPage--;
        loadQueue();
    });

    nextButton.addEventListener("click", () => {
        if (currentPage >= totalPages) return;

        currentPage++;
        loadQueue();
    });

    // ============================================
    // 13. POPUP XEM CHI TIẾT
    // ============================================

    function setNotice(message) {
        const notice = $("ctqModalNotice");

        if (!message) {
            notice.hidden = true;
            notice.textContent = "";
            return;
        }

        notice.textContent = message;
        notice.hidden = false;
    }

    function closePatientModal() {
        patientModal.hidden = true;

        currentPatient = null;
        modalLoading = false;
        startButton.disabled = true;

        if (previousFocus?.isConnected) {
            previousFocus.focus();
        }
    }

    function fillPatientDetails(data) {
        setText(
            "ctqDetailName",
            data.hoTen || data.tenBenhNhan || data.tenBN
        );

        setText(
            "ctqDetailCode",
            formatPatientCode(data.maBenhNhan)
        );

        setText("ctqDetailAppointment", data.maLichKham);

        setText("ctqDetailDate", formatDate(data.ngayKham));

        setText(
            "ctqDetailBirthday",
            formatDate(
                data.ngaySinh ||
                data.ngaySinhBenhNhan ||
                data.birthDate
            )
        );

        setText(
            "ctqDetailGender",
            data.gioiTinh ||
            data.gender ||
            data.gioiTinhBenhNhan
        );

        setText(
            "ctqDetailDepartment",
            data.tenKhoa ||
            data.khoa ||
            data.tenKhoaBenhNhan
        );

        setText(
            "ctqDetailDoctor",
            data.bacSiPhuTrach ||
            data.tenBacSi ||
            data.bacSi
        );

        setText(
            "ctqDetailRoom",
            data.tenPhong ||
            (data.maPhong ? `Phòng ${data.maPhong}` : "Chưa phân phòng")
        );

        setText("ctqDetailStatus", "Chờ thực hiện");

        setText(
            "ctqDetailService",
            data.dichVu ||
            data.tenDichVu ||
            "Chưa có chỉ định"
        );

        const hasOrder =
            data.maChiDinh != null &&
            data.trangThai === "ChoThucHien";

        startButton.disabled = !hasOrder;

        if (!hasOrder) {
            setNotice("Chỉ định không còn ở trạng thái chờ thực hiện.");
        } else {
            setNotice("");
        }
    }

    async function openPatient(item, button) {
        previousFocus = button;
        currentPatient = item;
        modalLoading = true;

        setNotice("");

        patientModal.hidden = false;
        closeModalButton.focus();

        startButton.disabled = true;

        setText("ctqDetailName", "Đang tải...");
        setText("ctqDetailCode", "—");
        setText("ctqDetailAppointment", item.maLichKham);
        setText("ctqDetailDate", formatDate(item.ngayKham));
        setText("ctqDetailBirthday", "Đang tải...");
        setText("ctqDetailGender", "Đang tải...");
        setText("ctqDetailDepartment", "Đang tải...");
        setText("ctqDetailDoctor", "Đang tải...");
        setText("ctqDetailRoom", "Đang tải...");
        setText("ctqDetailStatus", "Đang tải...");
        setText("ctqDetailService", item.tenDichVu || "Đang tải...");

        try {
            const data = await apiRequest(
                `${LIST_API}/ho-so/${encodeURIComponent(item.maLichKham)}`
            );

            // Nếu modal đã đóng trong lúc API chạy thì không xử lý tiếp.
            if (patientModal.hidden) return;

            currentPatient = {
                ...data,

                // Giữ nguyên thông tin của chỉ định đang được chọn.
                maLichKham: item.maLichKham,
                maChiDinh: item.maChiDinh,
                maBenhNhan: item.maBenhNhan,
                hoTen: item.hoTen || item.tenBenhNhan,

                tenDichVu: item.tenDichVu,
                dichVu: item.tenDichVu,

                maPhong: item.maPhong,
                tenPhong: item.tenPhong,

                trangThai: item.trangThai,

                gioKham: item.gioKham,
                ngayKham: item.ngayKham,
                bacSiPhuTrach: item.bacSiPhuTrach
            };

            fillPatientDetails(currentPatient);

        } catch (error) {
            console.error("Lỗi tải hồ sơ bệnh nhân:", error);

            setNotice(
                error.message || "Không thể tải thông tin bệnh nhân."
            );

        } finally {
            modalLoading = false;
        }
    }

    closeModalButton.addEventListener(
        "click",
        closePatientModal
    );

    closeBottomButton.addEventListener(
        "click",
        closePatientModal
    );

    patientModal.addEventListener(
        "click",
        event => {
            if (event.target === patientModal) {
                closePatientModal();
            }
        }
    );

    // ============================================
    // 14. POPUP XÁC NHẬN BẮT ĐẦU CLS
    // ============================================

    function showConfirm(message) {
        return new Promise(resolve => {
            $("ctqConfirmMessage").textContent =
                message;

            confirmModal.hidden = false;

            let closed = false;

            function close(result) {
                if (closed) return;
                closed = true;

                confirmModal.hidden = true;

                cancelStartButton.removeEventListener(
                    "click",
                    onCancel
                );

                confirmStartButton.removeEventListener(
                    "click",
                    onConfirm
                );

                document.removeEventListener(
                    "keydown",
                    onKeyDown
                );

                confirmModal.removeEventListener(
                    "click",
                    onOverlay
                );

                resolve(result);
            }

            function onCancel() {
                close(false);
            }

            function onConfirm() {
                close(true);
            }

            function onKeyDown(event) {
                if (event.key === "Escape") {
                    close(false);
                }
            }

            function onOverlay(event) {
                if (event.target === confirmModal) {
                    close(false);
                }
            }

            cancelStartButton.addEventListener(
                "click",
                onCancel
            );

            confirmStartButton.addEventListener(
                "click",
                onConfirm
            );

            document.addEventListener(
                "keydown",
                onKeyDown
            );

            confirmModal.addEventListener(
                "click",
                onOverlay
            );

            confirmStartButton.focus();
        });
    }

    // ============================================
    // 15. BẮT ĐẦU CLS
    // ChoCLS -> DangCLS
    // ============================================

    startButton.addEventListener("click", async () => {
        if (
            processing ||
            modalLoading ||
            !currentPatient ||
            currentPatient.trangThai !== "ChoThucHien" ||
            currentPatient.maChiDinh == null
        ) {
            return;
        }

        const order = currentPatient;

        const confirmed = await showConfirm(
            `Xác nhận bắt đầu thực hiện ${order.tenDichVu || "chỉ định CLS"} cho bệnh nhân ${order.hoTen || order.tenBenhNhan}?`
        );

        if (!confirmed) return;
        if (processing) return;

        processing = true;

        startButton.disabled = true;
        startButton.textContent = "Đang xử lý...";

        try {
            await apiRequest(
                `${CLS_API}/` +
                encodeURIComponent(order.maLichKham) +
                `/chi-dinh/` +
                encodeURIComponent(order.maChiDinh) +
                `/bat-dau`,
                "POST"
            );

            window.location.assign(
                "/ChuyenTrach/nhap-ket-qua/" +
                encodeURIComponent(order.maLichKham)
            );

        } catch (error) {
            console.error("Lỗi bắt đầu CLS:", error);

            setNotice(error.message);

            await loadQueue();

        } finally {
            processing = false;

            startButton.replaceChildren(
                createIcon("fa-solid fa-stethoscope"),
                document.createTextNode("Bắt đầu CLS")
            );

            startButton.disabled = true;
        }
    });

    // ============================================
    // 16. PHÍM ESC
    // ============================================

    document.addEventListener(
        "keydown",
        event => {
            if (
                event.key === "Escape" &&
                !confirmModal.hidden
            ) {
                return;
            }

            if (
                event.key === "Escape" &&
                !patientModal.hidden
            ) {
                closePatientModal();
            }
        }
    );

    // ============================================
    // 17. LÀM MỚI TỪ HEADER
    // ============================================

    const refreshButton = document.getElementById(
        "refresh-dashboard-button"
    );

    if (refreshButton) {
        refreshButton.addEventListener(
            "click",
            loadQueue
        );
    }

    // ============================================
    // 18. KHỞI TẠO
    // ============================================

    // Đưa popup ra body để tránh ảnh hưởng
    // của phần tử layout cha.
    document.body.appendChild(patientModal);
    document.body.appendChild(confirmModal);

    loadQueue();
});
