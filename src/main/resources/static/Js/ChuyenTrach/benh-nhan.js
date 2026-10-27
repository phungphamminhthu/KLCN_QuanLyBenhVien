
document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const API = "/api/chuyen-trach/danh-sach-benh-nhan";
    const PAGE_SIZE = 5;

    const $ = id => document.getElementById(id);

    const searchInput = $("patientSearch");
    const fromDate = $("fromDate");
    const toDate = $("toDate");
    const departmentFilter = $("departmentFilter");
    const roomFilter = $("roomFilter");
    const statusFilter = $("statusFilter");

    const tableBody = $("patientTableBody");
    const patientTotal = $("patientTotal");
    const previousPage = $("previousPage");
    const nextPage = $("nextPage");
    const currentPage = $("currentPage");

    const modal = $("ctPatientModal");
    const closeModalButton = $("closePatientModal");
    const modalCloseButton = $("modalCloseButton");
    const continueClsLink = $("continueClsLink");

    let page = 1;
    let totalPages = 1;
    let requestVersion = 0;
    let searchTimer = null;
    let modalReturnFocus = null;

    // ============================================
    // NGÀY THEO GIỜ VIỆT NAM
    // ============================================

    function todayVietnam() {
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Ho_Chi_Minh",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).formatToParts(new Date());

        const value = type =>
            parts.find(p => p.type === type)?.value || "";

        return `${value("year")}-${value("month")}-${value("day")}`;
    }

    const today = todayVietnam();

    fromDate.value = today.slice(0, 8) + "01";
    toDate.value = today;

    // ============================================
    // TOKEN VÀ API
    // ============================================

    function getToken() {
        return sessionStorage.getItem("Token") ||
               localStorage.getItem("Token");
    }

    async function apiGet(url) {
        const token = getToken();

        if (!token) {
            throw new Error("Vui lòng đăng nhập tài khoản chuyên trách.");
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
            if (response.status === 401 ||
                response.status === 403) {
                throw new Error(
                    "Phiên đăng nhập không hợp lệ hoặc không đủ quyền."
                );
            }

            let message = `Không tải được dữ liệu (HTTP ${response.status}).`;

            try {
                const errorData = await response.json();
                message = errorData.detail ||
                          errorData.message ||
                          message;
            } catch (_) {
                // Giữ thông báo mặc định
            }

            throw new Error(message);
        }

        return response.json();
    }

    // ============================================
    // HÀM TẠO PHẦN TỬ
    // ============================================

    function element(tag, className = "", value = null) {
        const node = document.createElement(tag);

        if (className) {
            node.className = className;
        }

        if (value !== null && value !== undefined) {
            node.textContent = String(value);
        }

        return node;
    }

    function addCell(row, value, className = "") {
        const td = element("td", className, value ?? "—");
        row.appendChild(td);
        return td;
    }

    // ============================================
    // HIỂN THỊ NGÀY
    // ============================================

    function formatDate(value) {
        if (!value) return "—";

        const text = String(value).slice(0, 10);
        const parts = text.split("-");

        if (parts.length !== 3) return text;

        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    function formatGender(value) {
        const text = String(value || "").toLowerCase();

        if (text === "nam" || text === "male") {
            return {
                label: "Nam",
                className: "ct-gender male",
                icon: "fa-solid fa-mars"
            };
        }

        if (text === "nữ" || text === "nu" ||
            text === "female") {
            return {
                label: "Nữ",
                className: "ct-gender female",
                icon: "fa-solid fa-venus"
            };
        }

        return {
            label: value || "—",
            className: "ct-gender",
            icon: "fa-solid fa-user"
        };
    }

    function statusInfo(value) {
        switch (value) {
            case "ChoCLS":
                return {
                    label: "Chờ thực hiện",
                    className: "ct-patient-status waiting",
                    icon: "fa-solid fa-clock"
                };

            case "DangCLS":
                return {
                    label: "Đang thực hiện",
                    className: "ct-patient-status doing",
                    icon: "fa-solid fa-spinner"
                };

            case "HoanThanhCLS":
                return {
                    label: "Hoàn thành",
                    className: "ct-patient-status done",
                    icon: "fa-solid fa-check"
                };

            default:
                return {
                    label: value || "Không xác định",
                    className: "ct-patient-status",
                    icon: "fa-solid fa-circle"
                };
        }
    }

    function createIcon(className) {
        const icon = element("i", className);
        icon.setAttribute("aria-hidden", "true");
        return icon;
    }

    // ============================================
    // CẬP NHẬT DROPDOWN
    // ============================================

    function updateOptions(select, options) {
        const selectedValue = select.value;

        select.replaceChildren();

        const defaultOption = element(
            "option", "", "Tất cả"
        );

        defaultOption.value = "";
        select.appendChild(defaultOption);

        options.forEach(item => {
            const option = element(
                "option", "", item.name
            );

            option.value = String(item.id);
            select.appendChild(option);
        });

        const exists = [...select.options].some(
            option => option.value === selectedValue
        );

        select.value = exists ? selectedValue : "";
    }

    // ============================================
    // THÔNG BÁO KHI KHÔNG CÓ DỮ LIỆU
    // ============================================

    function showTableMessage(message) {
        tableBody.replaceChildren();

        const tr = document.createElement("tr");
        const td = element(
            "td",
            "ct-table-loading",
            message
        );

        td.colSpan = 10;
        tr.appendChild(td);
        tableBody.appendChild(tr);
    }

    // ============================================
    // RENDER BẢNG BỆNH NHÂN
    // ============================================

    function renderTable(items, pageNumber) {
        tableBody.replaceChildren();

        if (!items.length) {
            showTableMessage(
                "Không tìm thấy bệnh nhân phù hợp với bộ lọc."
            );
            return;
        }

        items.forEach((item, index) => {
            const row = document.createElement("tr");

            // STT
            addCell(
                row,
                (pageNumber - 1) * PAGE_SIZE + index + 1
            );

            // Mã bệnh nhân
            addCell(
                row,
                "BN" + String(item.maBenhNhan).padStart(6, "0"),
                "ct-patient-code"
            );

            // Họ tên
            addCell(
                row,
                item.hoTen,
                "ct-patient-name"
            );

            // Ngày sinh
            addCell(
                row,
                formatDate(item.ngaySinh)
            );

            // Giới tính
            const gender = formatGender(item.gioiTinh);
            const genderCell = document.createElement("td");
            const genderBox = element(
                "span",
                gender.className
            );

            genderBox.appendChild(createIcon(gender.icon));
            genderBox.appendChild(
                document.createTextNode(gender.label)
            );

            genderCell.appendChild(genderBox);
            row.appendChild(genderCell);

            // Khoa
            addCell(row, item.tenKhoa);

            // Bác sĩ
            addCell(row, item.bacSiPhuTrach);

            // Dịch vụ

            // Dịch vụ
            const serviceCell = document.createElement("td");

            const serviceBadge = element(
                "span",
                "ct-service-badge",
                item.dichVu || "Chưa có chỉ định"
            );

            // Tooltip hiển thị đầy đủ dịch vụ khi di chuột
            serviceBadge.title = item.dichVu || "Chưa có chỉ định";

            serviceCell.appendChild(serviceBadge);
            row.appendChild(serviceCell);

            // Trạng thái
            const status = statusInfo(item.trangThai);
            const statusCell = document.createElement("td");
            const statusBadge = element(
                "span",
                status.className
            );

            statusBadge.appendChild(
                createIcon(status.icon)
            );

            statusBadge.appendChild(
                document.createTextNode(status.label)
            );

            statusCell.appendChild(statusBadge);
            row.appendChild(statusCell);

            // Nút xem hồ sơ
            const actionCell = document.createElement("td");

            const button = element(
                "button",
                "ct-view-record"
            );

            button.type = "button";
            button.appendChild(
                createIcon("fa-regular fa-eye")
            );

            button.appendChild(
                document.createTextNode("Xem hồ sơ")
            );

            button.addEventListener("click", () => {
                openPatientModal(item.maLichKham, button);
            });

            actionCell.appendChild(button);
            row.appendChild(actionCell);

            tableBody.appendChild(row);
        });
    }

    // ============================================
    // PHÂN TRANG
    // ============================================

    function renderPagination(data) {
        page = data.page;
        totalPages = data.totalPages;

        currentPage.textContent = String(page);

        previousPage.disabled = page <= 1;
        nextPage.disabled = page >= totalPages;

        patientTotal.textContent =
            `Tổng cộng ${data.total} lượt khám CLS` +
            ` • Trang ${page}/${totalPages}`;
    }

    previousPage.addEventListener("click", () => {
        if (page > 1) {
            page--;
            loadPatients();
        }
    });

    nextPage.addEventListener("click", () => {
        if (page < totalPages) {
            page++;
            loadPatients();
        }
    });

    // ============================================
    // TẢI DANH SÁCH TỪ MYSQL
    // ============================================

    async function loadPatients() {
        const version = ++requestVersion;

        showTableMessage("Đang tải dữ liệu bệnh nhân...");

        if (fromDate.value && toDate.value &&
            fromDate.value > toDate.value) {
            showTableMessage(
                "Ngày bắt đầu không được lớn hơn ngày kết thúc."
            );
            return;
        }

        const params = new URLSearchParams({
            tuNgay: fromDate.value,
            denNgay: toDate.value,
            q: searchInput.value.trim(),
            khoa: departmentFilter.value,
            phong: roomFilter.value,
            trangThai: statusFilter.value,
            page: String(page),
            pageSize: String(PAGE_SIZE)
        });

        try {
            const data = await apiGet(`${API}?${params}`);

            // Không hiển thị kết quả từ request cũ
            if (version !== requestVersion) return;

            updateOptions(
                departmentFilter,
                Array.isArray(data.khoa) ? data.khoa : []
            );

            updateOptions(
                roomFilter,
                Array.isArray(data.phong) ? data.phong : []
            );

            renderTable(data.items || [], data.page);
            renderPagination(data);

        } catch (error) {
            if (version !== requestVersion) return;

            console.error("Danh sách bệnh nhân CLS:", error);

            showTableMessage(error.message);
            patientTotal.textContent = "Không thể tải dữ liệu";

            previousPage.disabled = true;
            nextPage.disabled = true;
        }
    }

    // ============================================
    // BỘ LỌC VÀ TÌM KIẾM
    // ============================================

    function reloadFromFirstPage() {
        page = 1;
        loadPatients();
    }

    searchInput.addEventListener("input", () => {
        clearTimeout(searchTimer);

        searchTimer = setTimeout(() => {
            reloadFromFirstPage();
        }, 350);
    });

    [
        fromDate,
        toDate,
        departmentFilter,
        roomFilter,
        statusFilter
    ].forEach(control => {
        control.addEventListener(
            "change",
            reloadFromFirstPage
        );
    });

    // ============================================
    // POPUP XEM HỒ SƠ
    // ============================================

    function setDetail(id, value) {
        const node = $(id);

        if (node) {
            node.textContent =
                value === null ||
                value === undefined ||
                value === ""
                    ? "—"
                    : String(value);
        }
    }

    function closePatientModal() {
        modal.hidden = true;

        document.body.classList.remove(
            "ct-patient-modal-open"
        );

        if (modalReturnFocus?.isConnected) {
            modalReturnFocus.focus();
        }
    }

    function fillPatientDetail(data) {
        setDetail("detailName", data.hoTen);

        setDetail(
            "detailCode",
            "Mã BN: BN" +
            String(data.maBenhNhan).padStart(6, "0")
        );

        setDetail("detailBirth", formatDate(data.ngaySinh));
        setDetail("detailGender", data.gioiTinh);
        setDetail("detailAppointment", data.maLichKham);
        setDetail("detailDate", formatDate(data.ngayKham));
        setDetail("detailDepartment", data.tenKhoa);
        setDetail("detailDoctor", data.bacSiPhuTrach);
        setDetail("detailRoom", data.tenPhong);
        setDetail(
            "detailStatus",
            statusInfo(data.trangThai).label
        );

        setDetail("detailService", data.dichVu);
        setDetail("detailAddress", data.diaChi);
        setDetail("detailHistory", data.tienSuBenh);

        const diagnosis = [
            data.trieuChung
                ? "Triệu chứng: " + data.trieuChung
                : null,

            data.chanDoan
                ? "Chẩn đoán: " + data.chanDoan
                : null
        ].filter(Boolean).join("\n");

        setDetail("detailDiagnosis", diagnosis || "—");

        if (data.trangThai === "DangCLS") {
            continueClsLink.hidden = false;

            continueClsLink.href =
                `/ChuyenTrach/nhap-ket-qua/` +
                encodeURIComponent(data.maLichKham);
        } else {
            continueClsLink.hidden = true;
            continueClsLink.removeAttribute("href");
        }
    }

    async function openPatientModal(maLichKham, button) {
        modalReturnFocus = button;

        setDetail("detailName", "Đang tải hồ sơ...");
        setDetail("detailCode", "");
        continueClsLink.hidden = true;

        modal.hidden = false;

        document.body.classList.add(
            "ct-patient-modal-open"
        );

        closeModalButton.focus();

        try {
            const data = await apiGet(
                `${API}/ho-so/${encodeURIComponent(maLichKham)}`
            );

            if (modal.hidden) return;

            fillPatientDetail(data);

        } catch (error) {
            console.error("Lỗi xem hồ sơ:", error);

            setDetail(
                "detailName",
                "Không thể tải hồ sơ"
            );

            setDetail("detailCode", error.message);
        }
    }

    closeModalButton.addEventListener(
        "click",
        closePatientModal
    );

    modalCloseButton.addEventListener(
        "click",
        closePatientModal
    );

    modal.addEventListener("click", event => {
        if (event.target === modal) {
            closePatientModal();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !modal.hidden) {
            closePatientModal();
        }
    });

    // ============================================
    // NÚT LÀM MỚI TRÊN HEADER
    // ============================================

    const refreshButton = document.getElementById(
        "refresh-dashboard-button"
    );

    if (refreshButton) {
        refreshButton.addEventListener("click", () => {
            loadPatients();
        });
    }

    // ============================================
    // KHỞI TẠO
    // ============================================

    document.body.appendChild(modal);

    loadPatients();
});
