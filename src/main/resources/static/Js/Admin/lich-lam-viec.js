(() => {
    "use strict";

    // =========================================================
    // API
    // =========================================================
    const API_LICH_LAM_VIEC = "/api/admin/lich-lam-viec";
    const API_LICH_KHAM = "/api/admin/lich-kham";

    const el = (id) => document.getElementById(id);

    // =========================================================
    // STATE
    // =========================================================
    let danhSachBacSi = [];
    let danhSachLich = [];
    let danhSachLichKhamDieuPhoi = [];

    let lichLamViecDangDieuPhoi = null;

    const PAGE_SIZE = 5;
    let currentPage = 1;

    const paginationElement = document.getElementById("schedulePagination");
    const paginationInfoElement = document.getElementById("schedulePaginationInfo");

    let adminScheduleCalendar = null;

    // =========================================================
    // ELEMENTS
    // =========================================================
    const modal = el("scheduleModal");
    const form = el("scheduleForm");
    const tbody = el("scheduleTableBody");

    const dieuPhoiModal = el("dieuPhoiModal");
    const dieuPhoiForm = el("dieuPhoiForm");
    const dieuPhoiTbody = el("dieuPhoiLichKhamBody");

    // =========================================================
    // API HELPER
    // =========================================================
    async function apiRequest(url, options = {}) {
        const response = await fetch(url, {
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            },
            ...options
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(
                data?.message ||
                data?.error ||
                "Có lỗi xảy ra khi xử lý yêu cầu."
            );
        }

        return data;
    }

    // ===================================================
    //
    // ===================================================
    function showAdminToast(message, type = "success") {
        let toast = document.getElementById("adminActionToast");

        if (!toast) {
            toast = document.createElement("div");
            toast.id = "adminActionToast";
            toast.className = "admin-action-toast";
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.className = `admin-action-toast ${type} show`;

        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => {
            toast.classList.remove("show");
        }, 3500);
    }

    function getTrangThaiLichKhamText(trangThai) {
        const trangThaiMap = {
            ChoGoi: "Chờ gọi",
            DaTiepNhan: "Đã tiếp nhận",
            DaDat: "Đã đặt",
            DaXacNhan: "Đã xác nhận",
            DangKham: "Đang khám",
            HoanThanh: "Hoàn thành",
            DaHuy: "Đã hủy",
            KhongDen: "Không đến"
        };

        return trangThaiMap[trangThai] || trangThai || "Không xác định";
    }

    // =========================================================
    // COMMON HELPERS
    // =========================================================
    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function formatDate(value) {
        if (!value) return "";

        const date = String(value).substring(0, 10);
        const parts = date.split("-");

        if (parts.length !== 3) return value;

        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    function formatTime(value) {
        return value ? String(value).substring(0, 5) : "";
    }

    function showError(message) {
        el("formError").textContent = message || "";
    }

    function showDieuPhoiError(message) {
        el("dieuPhoiError").textContent = message || "";
    }

    function getStatusText(status) {
        const map = {
            // Trạng thái lịch khám
            DaDat: "Đã đặt",
            DaXacNhan: "Đã xác nhận",
            DaTiepNhan: "Đã tiếp nhận",
            DangKham: "Đang khám",
            HoanThanh: "Hoàn thành",
            DaKham: "Đã khám",
            DaHuy: "Đã hủy",
            KhongDen: "Không đến",

            // Trạng thái lịch làm việc
            SapDienRa: "Sắp diễn ra",
            DangLamViec: "Đang làm việc",
            DaKetThuc: "Đã kết thúc",
            NgungLamViec: "Ngừng làm việc",

            ChuaXacDinh: "Chưa xác định"
        };

        return map[status] || status || "Chưa xác định";
    }

    function getStatusClass(status) {
        switch (status) {
            // Trạng thái lịch khám
            case "DaDat":
                return "pending";

            case "DaXacNhan":
                return "confirmed";

            case "DaTiepNhan":
                return "accepted";

            case "DangKham":
                return "in-progress";

            case "HoanThanh":
            case "DaKham":
                return "completed";

            case "DaHuy":
            case "KhongDen":
                return "cancelled";

            // Trạng thái lịch làm việc
            case "SapDienRa":
                return "schedule-upcoming";

            case "DangLamViec":
                return "schedule-active";

            case "DaKetThuc":
                return "schedule-ended";

            case "NgungLamViec":
                return "schedule-stopped";

            default:
                return "";
        }
    }
    function getScheduleStatusClass(status) {
        switch (status) {
            case "SapDienRa":
                return "schedule-upcoming";

            case "DangLamViec":
                return "schedule-active";

            case "DaKetThuc":
                return "schedule-ended";

            case "DaHuy":
                return "cancelled";

            case "NgungLamViec":
                return "schedule-stopped";

            default:
                return "";
        }
    }

    // =========================================================
    // TÍNH TRẠNG THÁI LỊCH LÀM VIỆC THEO THỜI GIAN THỰC
    // =========================================================
    function getScheduleStatus(lich) {
        const statusGoc = lich.trangThai || "";

        // Trạng thái nghiệp vụ đặc biệt phải được giữ nguyên
        if (statusGoc === "DaHuy" || statusGoc === "NgungLamViec") {
            return statusGoc;
        }

        if (
            !lich.ngayLamViec ||
            !lich.gioBatDau ||
            !lich.gioKetThuc
        ) {
            return statusGoc || "ChuaXacDinh";
        }

        const ngay = String(lich.ngayLamViec).substring(0, 10);
        const gioBatDau = formatTime(lich.gioBatDau);
        const gioKetThuc = formatTime(lich.gioKetThuc);

        // Tạo Date theo giờ local của trình duyệt
        const thoiGianBatDau = new Date(`${ngay}T${gioBatDau}:00`);
        const thoiGianKetThuc = new Date(`${ngay}T${gioKetThuc}:00`);
        const hienTai = new Date();

        if (Number.isNaN(thoiGianBatDau.getTime()) ||
            Number.isNaN(thoiGianKetThuc.getTime())) {
            return statusGoc || "ChuaXacDinh";
        }

        if (hienTai < thoiGianBatDau) {
            return "SapDienRa";
        }

        if (hienTai >= thoiGianKetThuc) {
            return "DaKetThuc";
        }

        return "DangLamViec";
    }

    function setButtonLoading(button, loading, loadingText = "Đang xử lý...") {
        if (!button) return;

        if (loading) {
            button.dataset.originalText = button.textContent;
            button.textContent = loadingText;
            button.disabled = true;
        } else {
            button.textContent =
                button.dataset.originalText || button.textContent;
            button.disabled = false;
        }
    }
    // ===============================================
    // thanh cong thong bao
    // ===============================================
    let scheduleToastTimer = null;

    function showScheduleToast(message, title = "Thành công") {
        const toast = document.getElementById("scheduleToast");

        document.getElementById("scheduleToastTitle").textContent = title;
        document.getElementById("scheduleToastMessage").textContent = message;

        toast.classList.add("show");

        clearTimeout(scheduleToastTimer);
        scheduleToastTimer = setTimeout(() => {
            hideScheduleToast();
        }, 4000);
    }

    function hideScheduleToast() {
        const toast = document.getElementById("scheduleToast");
        if (toast) {
            toast.classList.remove("show");
        }

        clearTimeout(scheduleToastTimer);
    }

    // ============================================
    // phan trang
    // ============================================
    function renderPagination(totalItems) {
        if (!paginationElement || !paginationInfoElement) return;

        const totalPages = Math.ceil(totalItems / PAGE_SIZE);

        if (totalPages <= 1) {
            paginationElement.innerHTML = "";

            paginationInfoElement.textContent = totalItems > 0
                ? `Hiển thị 1–${totalItems} / ${totalItems} lịch`
                : "Hiển thị 0 / 0 lịch";

            return;
        }

        // Hiển thị nhóm 3 trang: 1 2 3 -> 4 5 6 -> ...
        const groupSize = 3;
        const currentGroup = Math.floor((currentPage - 1) / groupSize);
        const startPage = currentGroup * groupSize + 1;
        const endPage = Math.min(startPage + groupSize - 1, totalPages);

        let html = `
            <button type="button"
                    data-page="${currentPage - 1}"
                    ${currentPage === 1 ? "disabled" : ""}
                    aria-label="Trang trước">
                ‹
            </button>
        `;

        for (let page = startPage; page <= endPage; page++) {
            html += `
                <button type="button"
                        data-page="${page}"
                        class="${page === currentPage ? "active" : ""}"
                        aria-current="${page === currentPage ? "page" : "false"}">
                    ${page}
                </button>
            `;
        }

        html += `
            <button type="button"
                    data-page="${currentPage + 1}"
                    ${currentPage === totalPages ? "disabled" : ""}
                    aria-label="Trang sau">
                ›
            </button>
        `;

        paginationElement.innerHTML = html;

        const startItem = (currentPage - 1) * PAGE_SIZE + 1;
        const endItem = Math.min(currentPage * PAGE_SIZE, totalItems);

        paginationInfoElement.textContent =
            `Hiển thị ${startItem}–${endItem} / ${totalItems} lịch`;
    }

    // ==============================================
    // lay token
    // =============================================
    function getToken() {
        const keys = [
            "Token",
            "accessToken",
            "access_token",
            "token",
            "jwt",
            "jwtToken"
        ];

        for (const storage of [sessionStorage, localStorage]) {
            for (const key of keys) {
                const value = storage.getItem(key);

                if (!value || !value.trim()) continue;

                const token = value.trim().replace(/^Bearer\s+/i, "");

                // JWT phải có 3 phần, ngăn cách bởi 2 dấu chấm
                if (token.split(".").length === 3) {
                    return token;
                }
            }
        }

        return null;
    }

    async function apiRequest(url, options = {}) {
        const token = getToken();

        const headers = {
            Accept: "application/json",
            ...(options.headers || {})
        };

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        if (options.body) {
            headers["Content-Type"] = "application/json";
        }

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (response.status === 401) {
            throw new Error("Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.");
        }

        if (response.status === 403) {
            throw new Error("Bạn không có quyền thực hiện chức năng này. Hãy đăng nhập bằng tài khoản Admin.");
        }

        const contentType = response.headers.get("content-type") || "";
        const data = contentType.includes("application/json")
            ? await response.json()
            : await response.text();

        if (!response.ok) {
            throw new Error(
                typeof data === "object"
                    ? data.message || data.error || `Yêu cầu thất bại (${response.status}).`
                    : data || `Yêu cầu thất bại (${response.status}).`
            );
        }

        return data;
    }

    // =========================================================
    // SCHEDULE MODAL
    // =========================================================
    function openModal(title) {
        el("modalTitle").textContent = title;
        showError("");
        modal.classList.add("show");
    }

    function closeModal() {
        modal.classList.remove("show");
        form.reset();

        el("maLichLamViec").value = "";
        el("formKhoaDisplay").value = "";
        el("formPhong").innerHTML =
            '<option value="">-- Chọn phòng --</option>';

        showError("");
    }

    function resetFormForCreate() {
        form.reset();

        el("maLichLamViec").value = "";
        el("formKhoaDisplay").value = "";
        el("formPhong").innerHTML =
            '<option value="">-- Chọn phòng --</option>';

        openModal("Thêm lịch làm việc");
    }

    // =========================================================
    // LOAD DEPARTMENTS
    // =========================================================
    async function loadKhoa() {
        const data = await apiRequest(`${API_LICH_LAM_VIEC}/khoa`);

        const options = (data || []).map(k => `
            <option value="${k.maKhoa}">
                ${escapeHtml(k.tenKhoa)}
            </option>
        `).join("");

        el("filterKhoa").innerHTML =
            '<option value="">Tất cả khoa</option>' + options;
    }

    // =========================================================
    // LOAD DOCTORS
    // =========================================================
    async function loadBacSi() {
        danhSachBacSi = await apiRequest(`${API_LICH_LAM_VIEC}/bac-si`);

        const options = (danhSachBacSi || []).map(b => `
            <option value="${b.maBacSi}"
                    data-khoa="${b.maKhoa ?? ""}"
                    data-ten-khoa="${escapeHtml(b.tenKhoa ?? "")}">
                ${escapeHtml(b.hoTen ?? b.tenBacSi ?? "")}
                - ${escapeHtml(b.tenKhoa ?? "")}
            </option>
        `).join("");

        el("filterBacSi").innerHTML =
            '<option value="">Tất cả bác sĩ</option>' + options;

        el("formBacSi").innerHTML =
            '<option value="">-- Chọn bác sĩ --</option>' + options;
    }

    // =========================================================
    // LOAD ROOMS BY DEPARTMENT
    // =========================================================
    async function loadPhong(maKhoa, selectedMaPhong = "") {
        const select = el("formPhong");

        select.innerHTML =
            '<option value="">Đang tải phòng...</option>';

        if (!maKhoa) {
            select.innerHTML =
                '<option value="">-- Chọn phòng --</option>';
            return;
        }

        const data = await apiRequest(
            `${API_LICH_LAM_VIEC}/phong?maKhoa=${encodeURIComponent(maKhoa)}`
        );

        select.innerHTML =
            '<option value="">-- Chọn phòng --</option>' +
            (data || []).map(p => `
                <option value="${p.maPhong}">
                    ${escapeHtml(p.tenPhong)}
                    ${p.viTri ? ` - ${escapeHtml(p.viTri)}` : ""}
                </option>
            `).join("");

        if (selectedMaPhong) {
            select.value = String(selectedMaPhong);
        }
    }

    // =========================================================
    // LOAD WORK SCHEDULES
    // =========================================================
    async function loadLich() {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    Đang tải dữ liệu...
                </td>
            </tr>
        `;

        const params = new URLSearchParams();

        if (el("filterTuNgay").value) {
            params.set("tuNgay", el("filterTuNgay").value);
        }

        if (el("filterDenNgay").value) {
            params.set("denNgay", el("filterDenNgay").value);
        }

        if (el("filterBacSi").value) {
            params.set("maBacSi", el("filterBacSi").value);
        }

        if (el("filterKhoa").value) {
            params.set("maKhoa", el("filterKhoa").value);
        }

        try {
            danhSachLich = await apiRequest(
                `${API_LICH_LAM_VIEC}${
                    params.toString() ? "?" + params.toString() : ""
                }`
            );

            danhSachLich = Array.isArray(danhSachLich)
                ? danhSachLich
                : [];

            renderLich();
            renderAdminScheduleCalendar();
        } catch (error) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        ${escapeHtml(error.message)}
                    </td>
                </tr>
            `;

            el("scheduleCount").textContent = "0 lịch";
        }
    }

    // =========================================================
    // RENDER WORK SCHEDULES
    // =========================================================
    function renderLich() {
        const totalItems = danhSachLich.length;
        const totalPages = Math.ceil(totalItems / PAGE_SIZE);

        // Nếu dữ liệu thay đổi khiến trang hiện tại vượt quá số trang
        if (totalPages === 0) {
            currentPage = 1;
        } else if (currentPage > totalPages) {
            currentPage = totalPages;
        }

        el("scheduleCount").textContent = `${totalItems} lịch`;

        if (!totalItems) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        Không có lịch làm việc phù hợp.
                    </td>
                </tr>
            `;

            renderPagination(0);
            return;
        }

        // Chỉ lấy 5 lịch của trang hiện tại
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        const pageLich = danhSachLich.slice(
            startIndex,
            startIndex + PAGE_SIZE
        );

        tbody.innerHTML = pageLich.map((lich, index) => {
            const status = getScheduleStatus(lich);
            const stt = startIndex + index + 1;

            return `
                <tr>
                    <td>${stt}</td>
                    <td>${escapeHtml(lich.hoTenBacSi)}</td>
                    <td>${escapeHtml(lich.tenKhoa)}</td>
                    <td>${escapeHtml(lich.tenPhong)}</td>
                    <td>${formatDate(lich.ngayLamViec)}</td>
                    <td>
                        ${formatTime(lich.gioBatDau)}
                        -
                        ${formatTime(lich.gioKetThuc)}
                    </td>
                    <td>
                        <span class="status-badge ${escapeHtml(getScheduleStatusClass(status))}">
                            ${escapeHtml(getStatusText(status))}
                        </span>
                    </td>
                    <td>
                        <div class="action-group">
                            <button type="button"
                                    class="btn-action"
                                    data-action="edit"
                                    data-id="${lich.maLichLamViec}">
                                Sửa
                            </button>

                            <button type="button"
                                    class="btn-action"
                                    data-action="dieu-phoi"
                                    data-id="${lich.maLichLamViec}">
                                Điều phối
                            </button>

                            <button type="button"
                                    class="btn-action delete"
                                    data-action="delete"
                                    data-id="${lich.maLichLamViec}">
                                Xóa
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");

        renderPagination(totalItems);
    }
    // =========================================================
    // EDIT WORK SCHEDULE
    // =========================================================
    async function editLich(maLich) {
        const lich = danhSachLich.find(
            item => String(item.maLichLamViec) === String(maLich)
        );

        if (!lich) {
            alert("Không tìm thấy lịch cần sửa.");
            return;
        }

        form.reset();

        el("maLichLamViec").value = lich.maLichLamViec;
        el("formBacSi").value = String(lich.maBacSi);
        el("formKhoaDisplay").value = lich.tenKhoa || "";
        el("formNgay").value = lich.ngayLamViec;
        el("formGioBatDau").value = formatTime(lich.gioBatDau);
        el("formGioKetThuc").value = formatTime(lich.gioKetThuc);

        await loadPhong(lich.maKhoa, lich.maPhong);

        openModal("Cập nhật lịch làm việc");
    }

    // =========================================================
    // DELETE WORK SCHEDULE
    // =========================================================
    let maLichChoXoa = null;

    function moModalXacNhanXoa(maLichLamViec) {
        if (!maLichLamViec) {
            showAdminToast("Không xác định được lịch cần xóa.", "error");
            return;
        }

        maLichChoXoa = maLichLamViec;
        el("modalXacNhanXoa").classList.add("show");
    }

    function dongModalXacNhanXoa() {
        el("modalXacNhanXoa").classList.remove("show");
        maLichChoXoa = null;
    }

    async function xoaLichLamViec(maLichLamViec) {
        try {
            await apiRequest(
                `/api/admin/lich-lam-viec/${maLichLamViec}`,
                {
                    method: "DELETE"
                }
            );

            showAdminToast(
                "Đã xóa lịch làm việc thành công.",
                "success"
            );

            await loadLich();

        } catch (error) {
            console.error("Lỗi xóa lịch:", error);
            showAdminToast(
                error.message || "Có lỗi xảy ra khi xóa lịch.",
                "error"
            );
        }
    }

    // =========================================================
    // REASSIGNMENT MODAL
    // =========================================================
    function openDieuPhoiModal() {
        showDieuPhoiError("");
        dieuPhoiModal.classList.add("show");
    }

    function closeDieuPhoiModal() {
        dieuPhoiModal.classList.remove("show");
        dieuPhoiForm.reset();

        el("dieuPhoiMaLichLamViec").value = "";
        el("dieuPhoiBacSiCu").value = "";
        el("dieuPhoiNgayKham").value = "";

        el("dieuPhoiBacSiMoi").innerHTML =
            '<option value="">-- Chọn bác sĩ tiếp nhận --</option>';

        el("checkAllLichKham").checked = false;

        danhSachLichKhamDieuPhoi = [];
        lichLamViecDangDieuPhoi = null;

        dieuPhoiTbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    Chưa tải danh sách lượt khám
                </td>
            </tr>
        `;

        showDieuPhoiError("");
    }

    // =========================================================
    // LOAD DOCTORS FOR REASSIGNMENT
    // =========================================================
    function loadBacSiDieuPhoi(maKhoa, maBacSiCu) {
        const select = el("dieuPhoiBacSiMoi");

        const bacSiPhuHop = danhSachBacSi.filter(b =>
            String(b.maKhoa) === String(maKhoa)
            && String(b.maBacSi) !== String(maBacSiCu)
        );

        select.innerHTML =
            '<option value="">-- Chọn bác sĩ tiếp nhận --</option>' +
            bacSiPhuHop.map(b => `
                <option value="${b.maBacSi}">
                    ${escapeHtml(b.hoTen ?? b.tenBacSi ?? "")}
                    - ${escapeHtml(b.tenKhoa ?? "")}
                </option>
            `).join("");

        if (!bacSiPhuHop.length) {
            select.innerHTML =
                '<option value="">Không có bác sĩ phù hợp</option>';
        }
    }

    // =========================================================
    // LOAD APPOINTMENTS TO REASSIGN
    // =========================================================
    async function loadLichKhamCanDieuPhoi(maBacSi, ngayKham) {
        dieuPhoiTbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    Đang tải lượt khám...
                </td>
            </tr>
        `;

        const params = new URLSearchParams({
            maBacSi: String(maBacSi),
            ngayKham: String(ngayKham)
        });

        try {
            const data = await apiRequest(
                `${API_LICH_KHAM}/can-dieu-phoi?${params.toString()}`
            );

            console.log("[Điều phối] Request:", {
                maBacSi,
                ngayKham
            });
            console.log("[Điều phối] API response:", data);

            if (Array.isArray(data)) {
                danhSachLichKhamDieuPhoi = data;
            } else if (Array.isArray(data?.data)) {
                danhSachLichKhamDieuPhoi = data.data;
            } else if (Array.isArray(data?.content)) {
                danhSachLichKhamDieuPhoi = data.content;
            } else if (Array.isArray(data?.items)) {
                danhSachLichKhamDieuPhoi = data.items;
            } else {
                danhSachLichKhamDieuPhoi = [];
            }

            console.log(
                "[Điều phối] Số lượt khám nhận được:",
                danhSachLichKhamDieuPhoi.length
            );

            renderLichKhamDieuPhoi();

        } catch (error) {
            console.error("[Điều phối] Lỗi tải lượt khám:", error);

            danhSachLichKhamDieuPhoi = [];

            dieuPhoiTbody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        Không tải được lượt khám. Vui lòng thử lại.
                    </td>
                </tr>
            `;
        }
    }

    // =========================================================
    // RENDER APPOINTMENTS TO REASSIGN
    // =========================================================
    function renderLichKhamDieuPhoi() {
        el("checkAllLichKham").checked = false;

        if (!danhSachLichKhamDieuPhoi.length) {
            dieuPhoiTbody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        Không có lượt khám cần điều phối trong ngày này.
                    </td>
                </tr>
            `;
            return;
        }

        dieuPhoiTbody.innerHTML =
            danhSachLichKhamDieuPhoi.map(lich => {
                const maLichKham =
                    lich.maLichKham ?? lich.MaLichKham;

                const tenBenhNhan =
                    lich.hoTenBenhNhan ??
                    lich.tenBenhNhan ??
                    lich.benhNhan?.nguoiDung?.hoTen ??
                    lich.benhNhan?.hoTen ??
                    "Bệnh nhân";

                const gioKham = formatTime(
                    lich.gioKham ?? lich.GioKham
                );

                const trangThai =
                    lich.trangThai ?? lich.TrangThai ?? "";

                return `
                    <tr>
                        <td>
                            <input type="checkbox"
                                   class="check-lich-kham"
                                   value="${maLichKham}"
                                   aria-label="Chọn lịch khám ${maLichKham}">
                        </td>
                        <td>${escapeHtml(maLichKham)}</td>
                        <td>${escapeHtml(tenBenhNhan)}</td>
                        <td>${escapeHtml(gioKham)}</td>
                        <td>
                            <span class="status-badge ${escapeHtml(
                                getStatusClass(trangThai)
                            )}">
                                ${escapeHtml(getStatusText(trangThai))}
                            </span>
                        </td>
                    </tr>
                `;
            }).join("");
    }

    // =========================================================
    // OPEN REASSIGNMENT FOR A WORK SCHEDULE
    // =========================================================
    async function moModalDieuPhoi(maLichLamViec) {
        const lich = danhSachLich.find(
            item => String(item.maLichLamViec) === String(maLichLamViec)
        );

        if (!lich) {
            alert("Không tìm thấy lịch làm việc.");
            return;
        }

        if (!lich.maBacSi || !lich.ngayLamViec) {
            alert("Lịch làm việc thiếu thông tin bác sĩ hoặc ngày làm.");
            return;
        }

        lichLamViecDangDieuPhoi = lich;

        el("dieuPhoiMaLichLamViec").value = lich.maLichLamViec;
        el("dieuPhoiBacSiCu").value = lich.hoTenBacSi || "";
        el("dieuPhoiNgayKham").value = lich.ngayLamViec;

        loadBacSiDieuPhoi(lich.maKhoa, lich.maBacSi);

        openDieuPhoiModal();

        try {
            await loadLichKhamCanDieuPhoi(
                lich.maBacSi,
                lich.ngayLamViec
            );
        } catch (error) {
            dieuPhoiTbody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        ${escapeHtml(error.message)}
                    </td>
                </tr>
            `;
        }
    }

    // =========================================================
    // SUBMIT REASSIGNMENT
    // =========================================================
    async function submitDieuPhoi(event) {
        event.preventDefault();
        showDieuPhoiError("");

        const danhSachMaLichKham = Array.from(
            document.querySelectorAll(".check-lich-kham:checked")
        ).map(input => Number(input.value));

        const maBacSiMoi = Number(
            el("dieuPhoiBacSiMoi").value
        );

        const lyDo = el("dieuPhoiLyDo").value.trim();

        if (!danhSachMaLichKham.length) {
            showDieuPhoiError(
                "Vui lòng chọn ít nhất một lượt khám cần điều phối."
            );
            return;
        }

        if (!maBacSiMoi) {
            showDieuPhoiError(
                "Vui lòng chọn bác sĩ tiếp nhận."
            );
            return;
        }

        const button = el("btnSubmitDieuPhoi");
        setButtonLoading(button, true, "Đang điều phối...");

        try {
            const result = await apiRequest(
                `${API_LICH_KHAM}/dieu-phoi`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        danhSachMaLichKham,
                        maBacSiMoi,
                        lyDo
                    })
                }
            );

            // Chỉ chạy tới đây khi API trả response thành công.
            const soLuong =
                result?.soLuongDaDieuPhoi ??
                danhSachMaLichKham.length;

            closeDieuPhoiModal();

            showAdminToast(
                result?.message ||
                `Điều phối thành công ${soLuong} lượt khám.`,
                "success"
            );

            await loadLich();

        } catch (error) {
            console.error("[Điều phối] Lỗi:", error);

            showDieuPhoiError(
                error.message || "Điều phối lịch khám thất bại."
            );

            showAdminToast(
                error.message || "Điều phối lịch khám thất bại.",
                "error"
            );

        } finally {
            setButtonLoading(button, false);
        }
    }

    // =========================================================
    // FORM SUBMIT: CREATE / UPDATE WORK SCHEDULE
    // =========================================================
    async function submitScheduleForm(event) {
        event.preventDefault();
        showError("");

        const maLich = el("maLichLamViec").value;

        const payload = {
            maBacSi: Number(el("formBacSi").value),
            maPhong: Number(el("formPhong").value),
            ngayLamViec: el("formNgay").value,
            gioBatDau: el("formGioBatDau").value,
            gioKetThuc: el("formGioKetThuc").value
        };

        if (
            !payload.maBacSi ||
            !payload.maPhong ||
            !payload.ngayLamViec ||
            !payload.gioBatDau ||
            !payload.gioKetThuc
        ) {
            showError("Vui lòng nhập đầy đủ thông tin.");
            return;
        }

        if (payload.gioKetThuc <= payload.gioBatDau) {
            showError("Giờ kết thúc phải sau giờ bắt đầu.");
            return;
        }

        const url = maLich
            ? `${API_LICH_LAM_VIEC}/${maLich}`
            : API_LICH_LAM_VIEC;

        const method = maLich ? "PUT" : "POST";

        const button = el("btnSaveSchedule");
        setButtonLoading(button, true, "Đang lưu...");

        try {
            await apiRequest(url, {
                method,
                body: JSON.stringify(payload)
            });

            closeModal();

            showScheduleToast(
                maLich
                    ? "Cập nhật lịch làm việc thành công."
                    : "Đã phân công lịch làm việc cho bác sĩ.",
                maLich ? "Cập nhật thành công" : "Thêm lịch thành công"
            );

            await loadLich();
        } catch (error) {
            showError(error.message);
        } finally {
            setButtonLoading(button, false);
        }
    }


    // =========================================================
    // EVENT LISTENERS
    // =========================================================

    // Add schedule
    el("btnThemLich").addEventListener(
        "click",
        resetFormForCreate
    );

    // Close schedule modal
    el("btnCloseModal").addEventListener(
        "click",
        closeModal
    );

    el("btnCancelModal").addEventListener(
        "click",
        closeModal
    );

    modal.addEventListener("click", event => {
        if (event.target === modal) {
            closeModal();
        }
    });

    // Filter schedules
    el("btnLoc").addEventListener("click", () => {
        currentPage = 1;
        loadLich();
    });

    el("btnReset").addEventListener("click", () => {
        el("filterKhoa").value = "";
        el("filterBacSi").value = "";
        el("filterTuNgay").value = "";
        el("filterDenNgay").value = "";

        Array.from(el("filterBacSi").options).forEach(option => {
            option.hidden = false;
        });

        currentPage = 1;
        loadLich();
    });

    // Filter doctor options by department
    el("filterKhoa").addEventListener("change", () => {
        const maKhoa = el("filterKhoa").value;
        const bacSiSelect = el("filterBacSi");

        bacSiSelect.value = "";

        Array.from(bacSiSelect.options).forEach(option => {
            if (!option.value) {
                option.hidden = false;
                return;
            }

            option.hidden =
                maKhoa && option.dataset.khoa !== maKhoa;
        });
    });

    // Doctor selection in create/edit form
    el("formBacSi").addEventListener("change", async () => {
        const selected = el("formBacSi").selectedOptions[0];

        const maKhoa = selected?.dataset.khoa || "";
        const tenKhoa = selected?.dataset.tenKhoa || "";

        el("formKhoaDisplay").value = tenKhoa;

        try {
            await loadPhong(maKhoa);
        } catch (error) {
            showError(error.message);
        }
    });

    // Schedule table actions
    tbody.addEventListener("click", async event => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;

        const { action, id } = button.dataset;

        if (action === "edit") {
            try {
                await editLich(id);
            } catch (error) {
                alert(error.message);
            }
        } else if (action === "delete") {
            await  moModalXacNhanXoa(id);
        } else if (action === "dieu-phoi") {
            await moModalDieuPhoi(id);
        }
    });

    // Schedule form submit
    form.addEventListener("submit", submitScheduleForm);

    // Close reassignment modal
    el("btnCloseDieuPhoiModal").addEventListener(
        "click",
        closeDieuPhoiModal
    );

    el("btnCancelDieuPhoi").addEventListener(
        "click",
        closeDieuPhoiModal
    );

    dieuPhoiModal.addEventListener("click", event => {
        if (event.target === dieuPhoiModal) {
            closeDieuPhoiModal();
        }
    });

    // Reassignment form submit
    dieuPhoiForm.addEventListener(
        "submit",
        submitDieuPhoi
    );

    // Select / unselect all appointments
    el("checkAllLichKham").addEventListener("change", event => {
        const checked = event.target.checked;

        document.querySelectorAll(".check-lich-kham")
            .forEach(input => {
                input.checked = checked;
            });
    });

    el("btnHuyXoaLich").addEventListener(
        "click",
        dongModalXacNhanXoa
    );

    el("btnXacNhanXoaLich").addEventListener("click", async () => {
        if (!maLichChoXoa) return;

        const maLich = maLichChoXoa;
        dongModalXacNhanXoa();

        await xoaLichLamViec(maLich);
    });

    el("modalXacNhanXoa").addEventListener("click", event => {
        if (event.target === el("modalXacNhanXoa")) {
            dongModalXacNhanXoa();
        }
    });

    // =========================================================
    // ADMIN WORK SCHEDULE CALENDAR
    // =========================================================

    function getCalendarEventColor(lich) {
        const status = getScheduleStatus(lich);

        switch (status) {
            case "DangLamViec":
                return {
                    backgroundColor: "#16a34a",
                    borderColor: "#15803d"
                };

            case "DaKetThuc":
                return {
                    backgroundColor: "#94a3b8",
                    borderColor: "#64748b"
                };

            case "NgungLamViec":
            case "DaHuy":
                return {
                    backgroundColor: "#ef4444",
                    borderColor: "#dc2626"
                };

            case "SapDienRa":
            default:
                return {
                    backgroundColor: "#2563eb",
                    borderColor: "#1d4ed8"
                };
        }
    }

    function convertLichToCalendarEvents() {
        return (danhSachLich || [])
            .filter(lich =>
                lich.ngayLamViec &&
                lich.gioBatDau &&
                lich.gioKetThuc
            )
            .map(lich => {
                const ngay = String(lich.ngayLamViec).substring(0, 10);
                const gioBatDau = formatTime(lich.gioBatDau);
                const gioKetThuc = formatTime(lich.gioKetThuc);

                const colors = getCalendarEventColor(lich);

                const tenBacSi = lich.hoTenBacSi || "Bác sĩ";
                const tenPhong = lich.tenPhong || "Chưa xác định";

                return {
                    id: String(lich.maLichLamViec),
                    title: `${tenBacSi} - ${tenPhong}`,
                    //title: `${gioBatDau} ${tenBacSi}`,
                    start: `${ngay}T${gioBatDau}:00`,
                    end: `${ngay}T${gioKetThuc}:00`,
                    backgroundColor: colors.backgroundColor,
                    borderColor: colors.borderColor,
                    textColor: "#ffffff",

                    extendedProps: {
                        maLichLamViec: lich.maLichLamViec,
                        maBacSi: lich.maBacSi,
                        hoTenBacSi: tenBacSi,
                        tenKhoa: lich.tenKhoa || "",
                        tenPhong: tenPhong,
                        ngayLamViec: ngay,
                        gioBatDau: gioBatDau,
                        gioKetThuc: gioKetThuc,
                        trangThai: getScheduleStatus(lich)
                    }
                };
            });
    }

    function renderAdminScheduleCalendar() {
        const calendarElement = el("adminScheduleCalendar");

        if (!calendarElement) {
            console.warn("Không tìm thấy #adminScheduleCalendar trong HTML.");
            return;
        }

        if (typeof FullCalendar === "undefined") {
            calendarElement.innerHTML = `
                <div class="empty-state">
                    Không tải được thư viện Calendar. Vui lòng kiểm tra kết nối mạng.
                </div>
            `;
            console.error("FullCalendar chưa được tải.");
            return;
        }

        if (!adminScheduleCalendar) {
            adminScheduleCalendar = new FullCalendar.Calendar(calendarElement, {
                initialView: "dayGridMonth",
                locale: "vi",
                firstDay: 1,
                height: "auto",
                contentHeight: 620,
                expandRows: true,
                nowIndicator: true,
                dayMaxEvents: 3,
                navLinks: false,

                headerToolbar: {
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth,timeGridWeek,timeGridDay"
                },

                buttonText: {
                    today: "Hôm nay",
                    month: "Tháng",
                    week: "Tuần",
                    day: "Ngày"
                },

                allDaySlot: false,
                slotMinTime: "06:00:00",
                slotMaxTime: "22:00:00",
                slotDuration: "00:30:00",

                eventTimeFormat: {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false
                },

                events: [],

                // Bấm lịch -> mở popup chi tiết
                eventClick: function (info) {
                    info.jsEvent.preventDefault();

                    const props = info.event.extendedProps;

                    openScheduleDetailPopup({
                        bacSi: props.hoTenBacSi,
                        khoa: props.tenKhoa,
                        phong: props.tenPhong,
                        ngay: props.ngayLamViec,
                        gioBatDau: props.gioBatDau,
                        gioKetThuc: props.gioKetThuc,
                        trangThai: props.trangThai
                    });
                },

                // Tooltip khi rê chuột
                eventDidMount: function (info) {
                    const props = info.event.extendedProps;

                    info.el.title =
                        `Bác sĩ: ${props.hoTenBacSi || "Chưa xác định"}\n` +
                        `Khoa: ${props.tenKhoa || "Chưa xác định"}\n` +
                        `Phòng: ${props.tenPhong || "Chưa xác định"}\n` +
                        `Ngày: ${formatDate(props.ngayLamViec)}\n` +
                        `Thời gian: ${props.gioBatDau} - ${props.gioKetThuc}`;
                }
            });

            adminScheduleCalendar.render();
        }

        // Cập nhật dữ liệu từ danhSachLich hiện tại
        adminScheduleCalendar.removeAllEvents();
        adminScheduleCalendar.addEventSource(convertLichToCalendarEvents());

        // Cập nhật kích thước khi Calendar đang hiển thị
        const calendarView = el("scheduleCalendarView");

        if (calendarView && !calendarView.hidden) {
            requestAnimationFrame(() => {
                adminScheduleCalendar.updateSize();
            });
        }

        window.adminScheduleCalendar = adminScheduleCalendar;
    }


    // =============================================
    // POPUP CHI TIẾT LỊCH CALENDAR
    // =============================================
    function openScheduleDetailPopup(data) {
        const modal = el("scheduleDetailModal");

        if (!modal) {
            console.error("Không tìm thấy scheduleDetailModal trong HTML.");
            return;
        }

        el("detailBacSi").textContent = data.bacSi || "Chưa xác định";
        el("detailKhoa").textContent = data.khoa || "Chưa xác định";
        el("detailPhong").textContent = data.phong || "Chưa xác định";
        el("detailNgay").textContent = formatDate(data.ngay);
        el("detailGio").textContent =
            `${data.gioBatDau || "--:--"} - ${data.gioKetThuc || "--:--"}`;

        const statusElement = el("detailTrangThai");
        statusElement.textContent = getStatusText(data.trangThai);
        statusElement.className = "schedule-detail-status";

        modal.classList.add("show");
        document.body.style.overflow = "hidden";
    }

    function closeScheduleDetailPopup() {
        const modal = el("scheduleDetailModal");

        if (modal) {
            modal.classList.remove("show");
        }

        document.body.style.overflow = "";
    }

    function bindScheduleDetailPopupEvents() {
        const closeButton = el("btnCloseScheduleDetail");
        const closeFooterButton = el("btnCloseScheduleDetailFooter");
        const modal = el("scheduleDetailModal");

        closeButton?.addEventListener("click", closeScheduleDetailPopup);
        closeFooterButton?.addEventListener("click", closeScheduleDetailPopup);

        // Bấm vùng nền ngoài popup để đóng
        modal?.addEventListener("click", function (event) {
            if (event.target === modal) {
                closeScheduleDetailPopup();
            }
        });

        // Nhấn ESC để đóng popup
        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && modal?.classList.contains("show")) {
                closeScheduleDetailPopup();
            }
        });
    }
    // =========================================================
    // INITIALIZATION
    // =========================================================
    async function init() {
        try {
        // Gắn sự kiện đóng popup chi tiết lịch
            bindScheduleDetailPopupEvents();
            await Promise.all([
                loadKhoa(),
                loadBacSi()
            ]);

            // Khởi tạo Calendar trước khi tải danh sách lịch
            renderAdminScheduleCalendar();

            paginationElement?.addEventListener("click", (event) => {
                const button = event.target.closest("button[data-page]");
                if (!button || button.disabled) return;

                const page = Number(button.dataset.page);
                if (!Number.isInteger(page) || page < 1) return;

                currentPage = page;
                renderLich();
            });

            await loadLich();
        } catch (error) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        ${escapeHtml(error.message)}
                    </td>
                </tr>
            `;

            el("scheduleCount").textContent = "0 lịch";
        }
    }

    init();
})();