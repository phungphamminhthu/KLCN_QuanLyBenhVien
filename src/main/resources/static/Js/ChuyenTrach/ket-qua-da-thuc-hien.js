document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    // =====================================================
    // 1. CẤU HÌNH
    // =====================================================

    const $ = id => document.getElementById(id);

    const API = "/api/chuyen-trach/danh-sach-chi-dinh";
    const PAGE_SIZE = 50;

    const search = $("ctkqSearch");
    const fromDate = $("ctkqFromDate");
    const toDate = $("ctkqToDate");
    const roomFilter = $("ctkqRoom");

    const tableBody = $("ctkqTableBody");
    const countBadge = $("ctkqCount");
    const pageInfo = $("ctkqPageInfo");

    const previousButton = $("ctkqPrevious");
    const nextButton = $("ctkqNext");
    const currentPageText = $("ctkqCurrentPage");

    if (
        !search ||
        !fromDate ||
        !toDate ||
        !roomFilter ||
        !tableBody ||
        !countBadge ||
        !pageInfo ||
        !previousButton ||
        !nextButton ||
        !currentPageText
    ) {
        console.error(
            "Trang kết quả đã thực hiện thiếu phần tử HTML."
        );
        return;
    }

    let page = 1;
    let totalPages = 1;
    let requestVersion = 0;
    let searchTimer = null;

    // =====================================================
    // 2. NGÀY HIỆN TẠI THEO VIỆT NAM
    // =====================================================

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
            parts.find(part => part.type === type)?.value || "";

        return (
            value("year") + "-" +
            value("month") + "-" +
            value("day")
        );
    }

    const today = todayVietnam();

    // Mặc định tìm trong tháng hiện tại.
    fromDate.value = today.slice(0, 8) + "01";
    toDate.value = today;

    // =====================================================
    // 3. TOKEN VÀ GỌI API
    // =====================================================

    function getToken() {
        return (
            sessionStorage.getItem("Token") ||
            localStorage.getItem("Token")
        );
    }

    async function apiGet(url) {
        const token = getToken();

        if (!token) {
            throw new Error(
                "Không tìm thấy phiên đăng nhập. " +
                "Vui lòng đăng nhập tài khoản chuyên trách."
            );
        }

        const response = await fetch(url, {
            method: "GET",
            cache: "no-store",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            let message =
                `Không tải được dữ liệu (HTTP ${response.status}).`;

            try {
                const errorData = await response.json();

                message =
                    errorData.detail ||
                    errorData.message ||
                    message;
            } catch (_) {
                // Giữ thông báo mặc định.
            }

            if (
                response.status === 401 ||
                response.status === 403
            ) {
                message =
                    "Phiên đăng nhập không hợp lệ " +
                    "hoặc không có quyền xem kết quả.";
            }

            throw new Error(message);
        }

        return response.json();
    }

    // =====================================================
    // 4. HÀM TẠO ELEMENT AN TOÀN
    // =====================================================

    function create(tag, className = "", text = null) {
        const node = document.createElement(tag);

        if (className) {
            node.className = className;
        }

        if (text !== null && text !== undefined) {
            node.textContent = String(text);
        }

        return node;
    }

    function addCell(row, text, className = "") {
        const td = create(
            "td",
            className,
            text ?? "—"
        );

        row.appendChild(td);
        return td;
    }

    function addClampedCell(row, value, className) {
        const td = create("td");
        const text = value || "—";

        const span = create(
            "span",
            className,
            text
        );

        span.title = String(text);

        td.appendChild(span);
        row.appendChild(td);

        return td;
    }

    // =====================================================
    // 5. ĐỊNH DẠNG
    // =====================================================

    function orderCode(value) {
        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return "—";
        }

        return "CD" + String(value).padStart(6, "0");
    }

    function patientCode(value) {
        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return "—";
        }

        return "BN" + String(value).padStart(6, "0");
    }

    function formatDate(value) {
        if (!value) return "—";

        const normalized = String(value).replace(" ", "T");
        const [date, time] = normalized.split("T");
        const parts = date.split("-");

        if (parts.length !== 3) {
            return String(value);
        }

        let result =
            `${parts[2]}/${parts[1]}/${parts[0]}`;

        if (time) {
            result += ` ${time.slice(0, 5)}`;
        }

        return result;
    }

    // =====================================================
    // 6. THÔNG BÁO TRONG BẢNG
    // =====================================================

    function showMessage(message) {
        tableBody.replaceChildren();

        const tr = document.createElement("tr");

        const td = create(
            "td",
            "ctkq-empty",
            message
        );

        td.colSpan = 9;

        tr.appendChild(td);
        tableBody.appendChild(tr);
    }

    // =====================================================
    // 7. CẬP NHẬT DANH SÁCH PHÒNG
    // =====================================================

    function renderRooms(rooms) {
        const selected = roomFilter.value;

        roomFilter.replaceChildren();

        const all = create(
            "option",
            "",
            "Tất cả phòng"
        );

        all.value = "";
        roomFilter.appendChild(all);

        for (const room of rooms) {
            const option = create(
                "option",
                "",
                room.name || ("Phòng " + room.id)
            );

            option.value = String(room.id);
            roomFilter.appendChild(option);
        }

        const exists = [...roomFilter.options].some(
            option => option.value === selected
        );

        roomFilter.value = exists ? selected : "";
    }

    // =====================================================
    // 8. VẼ BẢNG KẾT QUẢ ĐÃ THỰC HIỆN
    // =====================================================

    function renderTable(items) {
        tableBody.replaceChildren();

        if (!Array.isArray(items) || items.length === 0) {
            showMessage(
                "Không có chỉ định đã hoàn thành " +
                "trong khoảng thời gian được chọn."
            );
            return;
        }

        items.forEach((item, index) => {
            const tr = document.createElement("tr");

            // 1. STT
            addCell(
                tr,
                (page - 1) * PAGE_SIZE + index + 1
            );

            // 2. Mã phiếu xét nghiệm hoặc mã chỉ định.
            const isLabSheet =
                Boolean(item.laPhieuXetNghiem) &&
                item.maPhieuChiDinh !== null &&
                item.maPhieuChiDinh !== undefined &&
                String(item.maPhieuChiDinh).trim() !== "";

            const displayCode = isLabSheet
                ? String(item.maPhieuChiDinh)
                : orderCode(item.maChiDinh);

            // 2. Mã phiếu xét nghiệm hoặc mã chỉ định.
            const codeCell = document.createElement("td");
            codeCell.className = "ctkq-code-cell";

            const codeText = document.createElement("span");
            codeText.className = "ctkq-code";
            codeText.textContent = displayCode;
            codeText.title = displayCode;

            codeCell.appendChild(codeText);
            tr.appendChild(codeCell);

            if (isLabSheet) {
                codeCell.title = String(item.maPhieuChiDinh);
            }

            // 3. Bệnh nhân
            const patientTd = document.createElement("td");

            patientTd.appendChild(
                create(
                    "strong",
                    "ctkq-patient-name",
                    item.tenBenhNhan || "—"
                )
            );

            patientTd.appendChild(
                create(
                    "small",
                    "ctkq-patient-code",
                    patientCode(item.maBenhNhan)
                )
            );

            tr.appendChild(patientTd);

            // 4. Dịch vụ
            addClampedCell(
                tr,
                item.dichVu,
                "ctkq-service"
            );

            // 5. Bác sĩ phụ trách
            addClampedCell(
                tr,
                item.bacSiChiDinh,
                "ctkq-doctor"
            );

            // 6. Phòng thực hiện
            addClampedCell(
                tr,
                item.tenPhong || "Chưa phân phòng",
                "ctkq-room"
            );

            // 7. Ngày chỉ định
            addCell(
                tr,
                formatDate(item.ngayChiDinh),
                "ctkq-date"
            );

            // 8. Trạng thái chỉ định
            const statusTd = document.createElement("td");

            const status = create(
                "span",
                "ctkq-done"
            );

            const icon = create(
                "i",
                "fa-solid fa-circle-check"
            );

            icon.setAttribute("aria-hidden", "true");

            status.appendChild(icon);

            status.appendChild(
                document.createTextNode("Hoàn thành")
            );

            statusTd.appendChild(status);
            tr.appendChild(statusTd);

            // 9. Nút xem chi tiết
            const actionTd = document.createElement("td");

            const link = create(
                "a",
                "ctkq-view"
            );

            if (isLabSheet) {
                // Xem toàn bộ phiếu xét nghiệm đã gom.
                link.href =
                    "/ChuyenTrach/ket-qua-da-thuc-hien/phieu/" +
                    encodeURIComponent(item.maPhieuChiDinh);

                link.title = "Xem toàn bộ phiếu xét nghiệm";
            } else if (
                Number.isInteger(Number(item.maChiDinh)) &&
                Number(item.maChiDinh) > 0
            ) {
                // Xem kết quả của một chỉ định thông thường.
                link.href =
                    "/ChuyenTrach/ket-qua-da-thuc-hien/" +
                    encodeURIComponent(item.maChiDinh);

                link.title = "Xem chi tiết chỉ định";
            } else {
                link.removeAttribute("href");
                link.setAttribute("aria-disabled", "true");
                link.title = "Không có mã chỉ định hợp lệ";
            }

            link.appendChild(
                create("i", "fa-regular fa-eye")
            );

            link.appendChild(
                document.createTextNode("Xem")
            );

            actionTd.appendChild(link);
            tr.appendChild(actionTd);

            tableBody.appendChild(tr);
        });
    }

    // =====================================================
    // 9. PHÂN TRANG
    // =====================================================

    function updatePagination(result) {
        page = Number(result.page) || 1;

        totalPages = Math.max(
            1,
            Number(result.totalPages) || 1
        );

        const total = Number(result.total) || 0;

        countBadge.textContent = `${total} chỉ định`;

        currentPageText.textContent = String(page);

        previousButton.disabled = page <= 1;
        nextButton.disabled = page >= totalPages;

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

    // =====================================================
    // 10. TẢI DỮ LIỆU THẬT TỪ API
    // =====================================================

    async function loadResults() {
        const version = ++requestVersion;

        if (!fromDate.value || !toDate.value) {
            showMessage(
                "Vui lòng chọn đầy đủ khoảng ngày."
            );
            return;
        }

        if (fromDate.value > toDate.value) {
            showMessage(
                "Ngày bắt đầu không được lớn hơn ngày kết thúc."
            );
            return;
        }

        showMessage(
            "Đang tải danh sách chỉ định đã hoàn thành..."
        );

        const params = new URLSearchParams({
            tuNgay: fromDate.value,
            denNgay: toDate.value,
            gomPhieu: "true",
            q: search.value.trim(),
            phong: roomFilter.value,
            trangThai: "DaHoanThanh",
            page: String(page),
            pageSize: String(PAGE_SIZE)
        });

        try {
            const data = await apiGet(
                `${API}?${params.toString()}`
            );

            // Bỏ phản hồi cũ nếu người dùng đổi bộ lọc.
            if (version !== requestVersion) {
                return;
            }

            if (!Array.isArray(data.items)) {
                throw new Error(
                    "API trả về danh sách không hợp lệ."
                );
            }

            renderRooms(
                Array.isArray(data.phong)
                    ? data.phong
                    : []
            );

            updatePagination(data);

            // Backend là nơi lọc trạng thái chính.
            const completed = data.items.filter(
                item =>
                    item.trangThaiChiDinh === "DaHoanThanh"
            );

            renderTable(completed);
        } catch (error) {
            if (version !== requestVersion) {
                return;
            }

            console.error(
                "Lỗi tải kết quả đã thực hiện:",
                error
            );

            showMessage(
                error.message || "Không thể tải danh sách kết quả."
            );

            countBadge.textContent = "Không thể tải dữ liệu";
            pageInfo.textContent = "Không tải được danh sách";

            previousButton.disabled = true;
            nextButton.disabled = true;
        }
    }

    // =====================================================
    // 11. TÌM KIẾM VÀ BỘ LỌC
    // =====================================================

    function reloadFirstPage() {
        page = 1;
        loadResults();
    }

    search.addEventListener("input", () => {
        clearTimeout(searchTimer);

        searchTimer = setTimeout(
            reloadFirstPage,
            350
        );
    });

    [
        fromDate,
        toDate,
        roomFilter
    ].forEach(control => {
        control.addEventListener(
            "change",
            reloadFirstPage
        );
    });

    // =====================================================
    // 12. CHUYỂN TRANG
    // =====================================================

    previousButton.addEventListener("click", () => {
        if (page <= 1) return;

        page--;
        loadResults();
    });

    nextButton.addEventListener("click", () => {
        if (page >= totalPages) return;

        page++;
        loadResults();
    });

    // =====================================================
    // 13. NÚT LÀM MỚI TRÊN HEADER
    // =====================================================

    const refreshButton = $("refresh-dashboard-button");

    if (refreshButton) {
        refreshButton.addEventListener(
            "click",
            () => {
                loadResults();
            }
        );
    }

    // =====================================================
    // 14. KHỞI TẠO
    // =====================================================

    loadResults();
});