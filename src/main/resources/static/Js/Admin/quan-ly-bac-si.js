
/* =========================================================
   MEDCARE - QUẢN LÝ BÁC SĨ
   ========================================================= */

(function () {
    "use strict";

    const API_BASE = "/api/admin/bac-si";

    let danhSachBacSi = [];
    let danhSachKhoa = [];
    let danhSachTaiKhoan = [];

    let trangHienTai = 1;
    const SO_DONG_MOI_TRANG = 5;
    let danhSachDangHienThi = [];

    let bacSiDangSua = null;
    let dangLuu = false;

    const $ = (selector, root = document) =>
        root.querySelector(selector);

    const $$ = (selector, root = document) =>
        Array.from(root.querySelectorAll(selector));

    /* =====================================================
       TOKEN / AUTHENTICATION
       ===================================================== */

    function layToken() {
        const keys = [
            "Token",
            "accessToken",
            "access_token",
            "token",
            "jwt",
            "jwtToken"
        ];

        for (const key of keys) {
            const value =
                sessionStorage.getItem(key) ||
                localStorage.getItem(key);

            if (value) {
                return value.replace(/^Bearer\s+/i, "").trim();
            }
        }

        return null;
    }

    async function apiFetch(url, options = {}) {
        const token = layToken();

        const headers = {
            "Accept": "application/json",
            ...(options.headers || {})
        };

        if (options.body && !headers["Content-Type"]) {
            headers["Content-Type"] = "application/json";
        }

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (response.status === 401) {
            throw new Error(
                "Phiên đăng nhập đã hết hạn hoặc bạn chưa đăng nhập."
            );
        }

        if (response.status === 403) {
            throw new Error(
                "Bạn không có quyền thực hiện chức năng này."
            );
        }

        if (!response.ok) {
            let message = `Yêu cầu thất bại (${response.status}).`;

            try {
                const data = await response.json();

                message =
                    data.message ||
                    data.error ||
                    data.detail ||
                    message;
            } catch (_) {
                try {
                    const text = await response.text();
                    if (text) message = text;
                } catch (_) {
                    // Giữ thông báo mặc định.
                }
            }

            throw new Error(message);
        }

        if (response.status === 204) {
            return null;
        }

        const contentType =
            response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            return response.json();
        }

        return null;
    }

    /* =====================================================
       HELPERS
       ===================================================== */

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    function giaTri(object, ...keys) {
        for (const key of keys) {
            if (object && object[key] !== undefined &&
                object[key] !== null) {
                return object[key];
            }
        }

        return null;
    }

    function layMaBacSi(bacSi) {
        return giaTri(bacSi, "maBacSi", "MaBacSi");
    }

    function layMaNguoiDung(bacSi) {
        return giaTri(bacSi, "maNguoiDung", "MaNguoiDung");
    }

    function layHoTen(bacSi) {
        return giaTri(bacSi, "hoTen", "HoTen") || "Chưa có tên";
    }

    function layTenDangNhap(bacSi) {
        return giaTri(bacSi, "tenDangNhap", "TenDangNhap") || "";
    }

    function layTenKhoa(bacSi) {
        return giaTri(bacSi, "tenKhoa", "TenKhoa") || "";
    }

    function laHoSoDayDu(bacSi) {
        return layMaBacSi(bacSi) !== null &&
            layMaBacSi(bacSi) !== undefined;
    }

    function dangHoatDong(value) {
        return value === true ||
            value === 1 ||
            value === "1" ||
            value === "true";
    }

    function hienThiGiaTri(value) {
        if (value === null || value === undefined ||
            String(value).trim() === "") {
            return '<span class="doctor-text-muted">Chưa cập nhật</span>';
        }

        return escapeHtml(value);
    }

    function hienThiThongBao(message, type = "error") {
        const container = $("#doctorMessage");

        if (!container) {
            if (type === "error") {
                console.error(message);
            }
            return;
        }

        container.className =
            `doctor-message doctor-message-${type}`;

        container.textContent = message;
        container.style.display = "block";

        container.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });
    }

    function anThongBao() {
        const container = $("#doctorMessage");

        if (container) {
            container.style.display = "none";
            container.textContent = "";
        }
    }

    function layDanhSach(data) {
        if (Array.isArray(data)) {
            return data;
        }

        if (Array.isArray(data?.content)) {
            return data.content;
        }

        if (Array.isArray(data?.data)) {
            return data.data;
        }

        if (Array.isArray(data?.result)) {
            return data.result;
        }

        return [];
    }

    function taoAvatar(hoTen) {
        const parts = String(hoTen || "")
            .trim()
            .split(/\s+/)
            .filter(Boolean);

        if (parts.length === 0) return "BS";

        if (parts.length === 1) {
            return parts[0].substring(0, 2).toUpperCase();
        }

        return (
            parts[parts.length - 2][0] +
            parts[parts.length - 1][0]
        ).toUpperCase();
    }

    /* =====================================================
       LOAD DATA
       ===================================================== */

    async function taiDanhSachBacSi() {
        const tbody = $("#doctorTableBody");

        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="doctor-loading">
                            <span class="doctor-loading-spinner"></span>
                            Đang tải danh sách bác sĩ...
                        </div>
                    </td>
                </tr>
            `;
        }

        try {
            const data = await apiFetch(API_BASE);
            danhSachBacSi = layDanhSach(data);

            capNhatThongKe();
            apDungBoLoc();
        } catch (error) {
            console.error("Lỗi tải danh sách bác sĩ:", error);

            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7">
                            <div class="doctor-empty-state">
                                <div class="doctor-empty-title">
                                    Không thể tải danh sách bác sĩ
                                </div>
                                <p class="doctor-empty-description">
                                    ${escapeHtml(error.message)}
                                </p>
                                <button type="button"
                                        class="doctor-btn doctor-btn-outline"
                                        id="doctorRetryBtn">
                                    Thử lại
                                </button>
                            </div>
                        </td>
                    </tr>
                `;

                $("#doctorRetryBtn")?.addEventListener(
                    "click",
                    taiDanhSachBacSi
                );
            }

            hienThiThongBao(error.message);
        }
    }



    async function taiDanhSachKhoa() {
        try {
            const data = await apiFetch(`${API_BASE}/khoa`);
            danhSachKhoa = layDanhSach(data);

            const filter = $("#filterDepartment");
            const department = $("#departmentId");

            if (filter) {
                const selected = filter.value;

                filter.innerHTML = '<option value="">Tất cả khoa</option>';

                danhSachKhoa.forEach(khoa => {
                    const id = giaTri(khoa, "maKhoa", "MaKhoa");
                    const name = giaTri(khoa, "tenKhoa", "TenKhoa");

                    if (id == null || name == null) return;

                    filter.add(new Option(name, String(id)));
                });

                filter.value = selected;
            }

            if (department) {
                const selected = department.value;

                department.innerHTML = '<option value="">-- Chọn khoa --</option>';

                danhSachKhoa.forEach(khoa => {
                    const id = giaTri(khoa, "maKhoa", "MaKhoa");
                    const name = giaTri(khoa, "tenKhoa", "TenKhoa");

                    if (id == null || name == null) return;

                    department.add(new Option(name, String(id)));
                });

                department.value = selected;
            }
        } catch (error) {
            console.error("Lỗi tải khoa:", error);
            if ($("#departmentId")) {
                $("#departmentId").innerHTML =
                    '<option value="">Không tải được khoa</option>';
            }
            throw error;
        }
    }




    async function taiTaiKhoanChuaCoHoSo() {
        const select = $("#doctorUserId");
        if (!select) return;

        const selectedValue = select.value;

        try {
            const data = await apiFetch(
                `${API_BASE}/tai-khoan-chua-co-ho-so`
            );

            danhSachTaiKhoan = layDanhSach(data);

            select.innerHTML =
                '<option value="">-- Chọn tài khoản bác sĩ --</option>';

            danhSachTaiKhoan.forEach(user => {
                const id = giaTri(user, "maNguoiDung", "MaNguoiDung");
                const name = giaTri(user, "hoTen", "HoTen") || "";
                const username = giaTri(
                    user, "tenDangNhap", "TenDangNhap"
                ) || "";
                const email = giaTri(user, "email", "Email") || "";

                if (id == null) return;

                const option = new Option(
                    [name, username ? `(${username})` : "", email]
                        .filter(Boolean).join(" "),
                    String(id)
                );

                select.add(option);
            });

            if (selectedValue) select.value = selectedValue;
        } catch (error) {
            console.error("Lỗi tải tài khoản:", error);
            select.innerHTML =
                '<option value="">Không tải được tài khoản</option>';
            throw error;
        }
    }

    function capNhatDanhSachTaiKhoan() {
        const select = $("#doctorAccount");

        if (!select) return;

        const selectedValue = select.value;

        select.innerHTML = `
            <option value="">-- Chọn tài khoản bác sĩ --</option>
            ${danhSachTaiKhoan.map(user => {
                const maNguoiDung = giaTri(
                    user, "maNguoiDung", "MaNguoiDung"
                );

                const hoTen = giaTri(user, "hoTen", "HoTen") || "";
                const tenDangNhap = giaTri(
                    user, "tenDangNhap", "TenDangNhap"
                ) || "";
                const email = giaTri(user, "email", "Email") || "";

                const label = [
                    hoTen,
                    tenDangNhap ? `(${tenDangNhap})` : "",
                    email ? `- ${email}` : ""
                ].filter(Boolean).join(" ");

                return `
                    <option value="${escapeHtml(maNguoiDung)}">
                        ${escapeHtml(label)}
                    </option>
                `;
            }).join("")}
        `;

        if (selectedValue) {
            select.value = selectedValue;
        }
    }

    /* =====================================================
       STATISTICS
       ===================================================== */

    function capNhatThongKe() {
        // Tổng số tài khoản bác sĩ trong dữ liệu API trả về
        const tong = danhSachBacSi.length;

        // Số tài khoản đã có hồ sơ bác sĩ
        const daCoHoSo = danhSachBacSi.filter(bacSi =>
            layMaBacSi(bacSi) !== null &&
            layMaBacSi(bacSi) !== undefined
        ).length;

        // Số tài khoản chưa có hồ sơ
        const chuaCoHoSo = tong - daCoHoSo;

        // Phải dùng đúng ID trong file HTML
        const totalElement = $("#statTotal");
        const completeElement = $("#statCompleted");
        const missingElement = $("#statMissing");

        if (totalElement) {
            totalElement.textContent = tong;
        }

        if (completeElement) {
            completeElement.textContent = daCoHoSo;
        }

        if (missingElement) {
            missingElement.textContent = chuaCoHoSo;
        }

        console.log("Thống kê bác sĩ:", {
            tong,
            daCoHoSo,
            chuaCoHoSo
        });
    }

    /* =====================================================
       FILTERS
       ===================================================== */

    function capNhatBoLocKhoa() {
        const select = $("#doctorFilterDepartment");

        if (!select) return;

        const currentValue = select.value;

        select.innerHTML = `
            <option value="">Tất cả khoa</option>
            ${danhSachKhoa.map(khoa => {
                const maKhoa = giaTri(khoa, "maKhoa", "MaKhoa");
                const tenKhoa = giaTri(khoa, "tenKhoa", "TenKhoa");

                return `
                    <option value="${escapeHtml(maKhoa)}">
                        ${escapeHtml(tenKhoa)}
                    </option>
                `;
            }).join("")}
        `;

        select.value = currentValue;
    }

    function apDungBoLoc() {
        const keyword = (
            $("#doctorSearch")?.value || ""
        ).trim().toLocaleLowerCase("vi");

        const maKhoaFilter =
            $("#doctorFilterDepartment")?.value || "";

        const profileFilter =
            $("#doctorFilterProfile")?.value || "";

        const statusFilter =
            $("#doctorFilterStatus")?.value || "";

        const ketQua = danhSachBacSi.filter(bacSi => {
            const hoTen = String(layHoTen(bacSi)).toLocaleLowerCase("vi");

            const tenDangNhap = String(
                layTenDangNhap(bacSi)
            ).toLocaleLowerCase("vi");

            const email = String(
                giaTri(bacSi, "email", "Email") || ""
            ).toLocaleLowerCase("vi");

            const chuyenMon = String(
                giaTri(bacSi, "chuyenMon", "ChuyenMon") || ""
            ).toLocaleLowerCase("vi");

            const tenKhoa = String(layTenKhoa(bacSi))
                .toLocaleLowerCase("vi");

            const maBacSi = String(layMaBacSi(bacSi) || "");

            const matchesKeyword =
                !keyword ||
                hoTen.includes(keyword) ||
                tenDangNhap.includes(keyword) ||
                email.includes(keyword) ||
                chuyenMon.includes(keyword) ||
                tenKhoa.includes(keyword) ||
                maBacSi.includes(keyword);

            const maKhoa = String(
                giaTri(bacSi, "maKhoa", "MaKhoa") || ""
            );

            const matchesDepartment =
                !maKhoaFilter || maKhoa === maKhoaFilter;

            const matchesProfile =
                !profileFilter ||
                (profileFilter === "complete" && laHoSoDayDu(bacSi)) ||
                (profileFilter === "missing" && !laHoSoDayDu(bacSi));

            const status = dangHoatDong(
                giaTri(bacSi, "trangThai", "TrangThai")
            );

            const matchesStatus =
                !statusFilter ||
                (statusFilter === "active" && status) ||
                (statusFilter === "inactive" && !status);

            return matchesKeyword &&
                matchesDepartment &&
                matchesProfile &&
                matchesStatus;
        });

        trangHienTai = 1;
        hienThiDanhSach(ketQua);
        capNhatSoLuongKetQua(ketQua.length);
    }

    function capNhatSoLuongKetQua(count) {
        const element = $("#doctorResultCount");

        if (element) {
            element.textContent = `${count} bác sĩ`;
        }
    }

    /* =====================================================
       RENDER TABLE
       ===================================================== */

    function hienThiDanhSach(danhSach) {
        const tbody = $("#doctorTableBody");
        if (!tbody) return;

        danhSachDangHienThi = danhSach || [];

        const tongSoDong = danhSachDangHienThi.length;
        const tongSoTrang = Math.max(
            1,
            Math.ceil(tongSoDong / SO_DONG_MOI_TRANG)
        );

        if (trangHienTai > tongSoTrang) {
            trangHienTai = tongSoTrang;
        }

        if (trangHienTai < 1) {
            trangHienTai = 1;
        }

        const batDau = (trangHienTai - 1) * SO_DONG_MOI_TRANG;
        const duLieuTrang = danhSachDangHienThi.slice(
            batDau,
            batDau + SO_DONG_MOI_TRANG
        );

        if (tongSoDong === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="qbs-table-message">
                        Không tìm thấy bác sĩ phù hợp.
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = duLieuTrang.map((bacSi, index) => {
                const maNguoiDung = layMaNguoiDung(bacSi);
                const hoTen = layHoTen(bacSi);
                const tenDangNhap = layTenDangNhap(bacSi);
                const email = giaTri(bacSi, "email", "Email") || "";
                const tenKhoa = layTenKhoa(bacSi);
                const chuyenMon = giaTri(bacSi, "chuyenMon", "ChuyenMon");
                const trinhDo = giaTri(bacSi, "trinhDo", "TrinhDo");
                const chungChi = giaTri(
                    bacSi, "soChungChiHanhNghe", "SoChungChiHanhNghe"
                );

                const coHoSo = laHoSoDayDu(bacSi);
                const hoatDong = dangHoatDong(
                    giaTri(bacSi, "trangThai", "TrangThai")
                );

                return `
                    <tr>
                        <td class="qbs-stt-cell">${batDau + index + 1}</td>

                        <td>
                            <div class="qbs-account-info">
                                <div class="qbs-account-avatar">
                                    ${escapeHtml(taoAvatar(hoTen))}
                                </div>
                                <div class="qbs-account-content">
                                    <span class="qbs-account-name">
                                        ${escapeHtml(hoTen)}
                                    </span>
                                    <span class="qbs-account-detail">
                                        ${escapeHtml(tenDangNhap || "Chưa có tài khoản")}
                                    </span>
                                    ${email ? `
                                        <span class="qbs-account-detail">
                                            ${escapeHtml(email)}
                                        </span>
                                    ` : ""}
                                </div>
                            </div>
                        </td>

                        <td>${tenKhoa
                            ? escapeHtml(tenKhoa)
                            : '<span class="qbs-text-muted">Chưa phân khoa</span>'}</td>

                        <td>${hienThiGiaTri(chuyenMon)}</td>
                        <td>${hienThiGiaTri(trinhDo)}</td>
                        <td>${hienThiGiaTri(chungChi)}</td>

                        <td>
                            <div class="qbs-status-list">
                                <span class="qbs-status ${
                                    coHoSo ? "qbs-status-active" : "qbs-status-missing"
                                }">
                                    ${coHoSo ? "Đã có hồ sơ" : "Chưa có hồ sơ"}
                                </span>
                                ${coHoSo ? `
                                    <span class="qbs-status ${
                                        hoatDong ? "qbs-status-active" : "qbs-status-inactive"
                                    }">
                                        ${hoatDong ? "Đang hoạt động" : "Ngừng hoạt động"}
                                    </span>
                                ` : ""}
                            </div>
                        </td>

                        <td>
                            <button type="button"
                                    class="qbs-btn-edit"
                                    data-action="edit"
                                    data-user-id="${escapeHtml(maNguoiDung ?? "")}">
                                ${coHoSo ? "Sửa hồ sơ" : "Tạo hồ sơ"}
                            </button>
                        </td>
                    </tr>
                `;
            }).join("");
        }

        const summary = $("#tableSummary");
        if (summary) {
            summary.textContent = tongSoDong === 0
                ? "Không có dữ liệu"
                : `Hiển thị ${batDau + 1}–${Math.min(
                    batDau + SO_DONG_MOI_TRANG, tongSoDong
                )} trong tổng số ${tongSoDong} bác sĩ`;
        }

        const pageNumbers = $("#pageNumbers");
        if (pageNumbers) {
            pageNumbers.innerHTML = "";

            for (let page = 1; page <= tongSoTrang; page++) {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "qbs-page-btn" +
                    (page === trangHienTai ? " active" : "");
                button.textContent = page;
                button.setAttribute("aria-label", `Trang ${page}`);

                button.addEventListener("click", () => {
                    trangHienTai = page;
                    hienThiDanhSach(danhSachDangHienThi);
                });

                pageNumbers.appendChild(button);
            }
        }

        const prev = $("#btnPrevPage");
        const next = $("#btnNextPage");

        if (prev) prev.disabled = trangHienTai <= 1 || tongSoDong === 0;
        if (next) next.disabled = trangHienTai >= tongSoTrang || tongSoDong === 0;
    }



    /* =====================================================
       MODAL OPEN / CLOSE
       ===================================================== */

    function moModal() {
        const modal = $("#doctorModal");

        if (!modal) {
            console.error("Không tìm thấy #doctorModal trong HTML.");
            return;
        }

        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
    }

    function dongModal() {
        const modal = $("#doctorModal");

        if (!modal) return;

        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";

        bacSiDangSua = null;
        dangLuu = false;

        const form = $("#doctorForm");

        if (form) {
            form.reset();

            $$(".doctor-form-control", form).forEach(input => {
                input.classList.remove("invalid");
            });
        }

        const saveButton = $("#doctorSaveBtn");

        if (saveButton) {
            saveButton.disabled = false;
            saveButton.classList.remove("is-loading");
        }

        const title = $("#doctorModalTitle");

        if (title) {
            title.textContent = "Tạo hồ sơ bác sĩ";
        }

        const account = $("#doctorAccount");

        if (account) {
            account.disabled = false;
        }

        anThongBao();
    }

    async function moFormThem() {
        bacSiDangSua = null;
        anThongBao();

        const form = $("#doctorForm");

        if (form) form.reset();

        const title = $("#doctorModalTitle");

        if (title) {
            title.textContent = "Tạo hồ sơ bác sĩ";
        }

        const account = $("#doctorAccount");

        if (account) {
            account.disabled = false;
        }

//        const status = $("#doctorStatus");
//
//        if (status) {
//            status.checked = true;
//        }
        const status = $("#doctorStatus");
        if (status) status.value = "1";

        moModal();

        await Promise.all([
            taiDanhSachKhoa(),
            taiTaiKhoanChuaCoHoSo()
        ]);
    }



    async function moFormSua(maNguoiDung) {
        // Tìm bác sĩ theo mã người dùng
        const bacSi = danhSachBacSi.find(item =>
            String(layMaNguoiDung(item)) === String(maNguoiDung)
        );

        if (!bacSi) {
            hienThiThongBao("Không tìm thấy thông tin bác sĩ.");
            return;
        }

        bacSiDangSua = bacSi;
        anThongBao();

        const form = $("#doctorForm");
        if (form) form.reset();

        const title = $("#modalTitle");
        const coHoSo = laHoSoDayDu(bacSi);

        if (title) {
            title.textContent = coHoSo
                ? "Cập nhật hồ sơ bác sĩ"
                : "Bổ sung hồ sơ bác sĩ";
        }

        // Mở modal
        moModal();

        try {
            // Xóa thông báo lỗi cũ
            const formMessage = $("#formMessage");
            if (formMessage) {
                formMessage.hidden = true;
                formMessage.textContent = "";
            }

            // Tải danh sách khoa trước
            await taiDanhSachKhoa();

            // Nếu là tài khoản chưa có hồ sơ thì tải danh sách tài khoản
            if (!coHoSo) {
                await taiTaiKhoanChuaCoHoSo();
            }

            // ==============================
            // 1. TÀI KHOẢN BÁC SĨ
            // ==============================
            const account = $("#doctorUserId");
            const userId = layMaNguoiDung(bacSi);

            if (account) {
                const hoTen = layHoTen(bacSi);
                const tenDangNhap = layTenDangNhap(bacSi);
                const email = giaTri(bacSi, "email", "Email") || "";

                // Đảm bảo tài khoản hiện tại có trong dropdown
                let option = Array.from(account.options).find(
                    item => String(item.value) === String(userId)
                );

                if (!option) {
                    option = new Option(
                        [
                            hoTen,
                            tenDangNhap ? `(${tenDangNhap})` : "",
                            email
                        ].filter(Boolean).join(" "),
                        String(userId)
                    );

                    account.add(option);
                }

                account.value = String(userId);

                // Không cho đổi tài khoản của hồ sơ đã tồn tại
                account.disabled = coHoSo;
            }

            // ==============================
            // 2. KHOA CÔNG TÁC
            // ==============================
            const department = $("#departmentId");
            const maKhoa = giaTri(bacSi, "maKhoa", "MaKhoa");

            if (department) {
                if (
                    maKhoa != null &&
                    !Array.from(department.options).some(
                        option => option.value === String(maKhoa)
                    )
                ) {
                    console.warn(
                        "Không tìm thấy mã khoa trong dropdown:",
                        maKhoa
                    );
                }

                department.value = maKhoa == null
                    ? ""
                    : String(maKhoa);
            }

            // ==============================
            // 3. CHUYÊN MÔN
            // ==============================
            const specialty = $("#specialty");

            if (specialty) {
                specialty.value =
                    giaTri(bacSi, "chuyenMon", "ChuyenMon") || "";
            }

            // ==============================
            // 4. TRÌNH ĐỘ
            // ==============================
            const degree = $("#degree");

            if (degree) {
                degree.value =
                    giaTri(bacSi, "trinhDo", "TrinhDo") || "";
            }

            // ==============================
            // 5. CHỨNG CHỈ HÀNH NGHỀ
            // ==============================
            const license = $("#licenseNumber");

            if (license) {
                license.value =
                    giaTri(
                        bacSi,
                        "soChungChiHanhNghe",
                        "SoChungChiHanhNghe"
                    ) || "";
            }

            // ==============================
            // 6. TRẠNG THÁI
            // ==============================
            const status = $("#doctorStatus");

            if (status) {
                status.value = dangHoatDong(
                    giaTri(bacSi, "trangThai", "TrangThai")
                ) ? "1" : "0";
            }

        } catch (error) {
            console.error("Lỗi tải thông tin bác sĩ:", error);

            const formMessage = $("#formMessage");

            if (formMessage) {
                formMessage.textContent =
                    "Không thể tải thông tin bác sĩ: " + error.message;
                formMessage.hidden = false;
            }
        }
    }



    /* =====================================================
       FORM VALIDATION
       ===================================================== */

    function kiemTraForm() {
        const account = $("#doctorAccount");
        const department = $("#doctorDepartment");
        const specialty = $("#doctorSpecialty");
        const degree = $("#doctorDegree");
        const license = $("#doctorLicense");

        let valid = true;

        const fields = [
            {
                element: account,
                message: "Vui lòng chọn tài khoản bác sĩ."
            },
            {
                element: department,
                message: "Vui lòng chọn khoa."
            },
            {
                element: specialty,
                message: "Vui lòng nhập chuyên môn."
            }
        ];

        fields.forEach(field => {
            if (!field.element) return;

            const value = String(field.element.value || "").trim();

            field.element.classList.remove("invalid");

            if (!value) {
                field.element.classList.add("invalid");
                valid = false;
            }
        });

        if (!valid) {
            hienThiThongBao(
                "Vui lòng chọn tài khoản, khoa và nhập chuyên môn."
            );
            return false;
        }

        if (degree && degree.value.trim().length > 100) {
            degree.classList.add("invalid");
            hienThiThongBao("Trình độ không được vượt quá 100 ký tự.");
            return false;
        }

        if (license && license.value.trim().length > 100) {
            license.classList.add("invalid");
            hienThiThongBao(
                "Số chứng chỉ hành nghề không được vượt quá 100 ký tự."
            );
            return false;
        }

        return true;
    }

    /* =====================================================
       SAVE DOCTOR PROFILE
       ===================================================== */

    //    async function luuHoSoBacSi(event) {
    //        event?.preventDefault();
    //
    //        if (dangLuu) return;
    //
    //        anThongBao();
    //
    //        if (!kiemTraForm()) return;
    //
    //        const maNguoiDung = $("#doctorAccount")?.value;
    //        const maKhoa = $("#doctorDepartment")?.value;
    //
    //        const chuyenMon =
    //            $("#doctorSpecialty")?.value.trim() || "";
    //
    //        const trinhDo =
    //            $("#doctorDegree")?.value.trim() || "";
    //
    //        const soChungChiHanhNghe =
    //            $("#doctorLicense")?.value.trim() || "";
    //
    //        //        const trangThai =
    //        //            $("#doctorStatus")?.checked ?? true;
    //        const trangThai = $("#doctorStatus")?.value === "1";
    //
    //        const payload = {
    //            maNguoiDung: Number(maNguoiDung),
    //            maKhoa: Number(maKhoa),
    //            chuyenMon,
    //            trinhDo,
    //            soChungChiHanhNghe,
    //            trangThai
    //        };
    //
    //        const saveButton = $("#doctorSaveBtn");
    //
    //        try {
    //            dangLuu = true;
    //
    //            if (saveButton) {
    //                saveButton.disabled = true;
    //                saveButton.classList.add("is-loading");
    //            }
    //
    //            if (bacSiDangSua && laHoSoDayDu(bacSiDangSua)) {
    //                const maBacSi = layMaBacSi(bacSiDangSua);
    //
    //                await apiFetch(
    //                    `${API_BASE}/${encodeURIComponent(maBacSi)}`,
    //                    {
    //                        method: "PUT",
    //                        body: JSON.stringify(payload)
    //                    }
    //                );
    //
    //                hienThiThongBao(
    //                    "Cập nhật hồ sơ bác sĩ thành công.",
    //                    "success"
    //                );
    //            } else {
    //                await apiFetch(API_BASE, {
    //                    method: "POST",
    //                    body: JSON.stringify(payload)
    //                });
    //
    //                hienThiThongBao(
    //                    "Tạo hồ sơ bác sĩ thành công.",
    //                    "success"
    //                );
    //            }
    //
    //            dongModal();
    //
    //            await Promise.all([
    //                taiDanhSachBacSi(),
    //                taiTaiKhoanChuaCoHoSo()
    //            ]);
    //        } catch (error) {
    //            console.error("Lỗi lưu hồ sơ bác sĩ:", error);
    //            hienThiThongBao(error.message || "Không thể lưu hồ sơ bác sĩ.");
    //        } finally {
    //            dangLuu = false;
    //
    //            if (saveButton) {
    //                saveButton.disabled = false;
    //                saveButton.classList.remove("is-loading");
    //            }
    //        }
    //    }

    async function luuHoSoBacSi(event) {
        event?.preventDefault();

        if (dangLuu) return;

        anThongBao();

        if (!kiemTraForm()) return;

        // Dùng đúng ID trong HTML hiện tại
        const maNguoiDung = $("#doctorUserId")?.value;
        const maKhoa = $("#departmentId")?.value;

        const chuyenMon = $("#specialty")?.value.trim() || "";
        const trinhDo = $("#degree")?.value.trim() || "";
        const soChungChiHanhNghe =
            $("#licenseNumber")?.value.trim() || "";

        const trangThai = $("#doctorStatus")?.value === "1";

        if (!maNguoiDung) {
            hienThiThongBao("Vui lòng chọn tài khoản bác sĩ.");
            return;
        }

        if (!maKhoa) {
            hienThiThongBao("Vui lòng chọn khoa công tác.");
            return;
        }

        const payload = {
            maNguoiDung: Number(maNguoiDung),
            maKhoa: Number(maKhoa),
            chuyenMon,
            trinhDo,
            soChungChiHanhNghe,
            trangThai
        };

        // Đúng ID nút lưu trong HTML
        const saveButton = $("#btnSubmit");
        const laCapNhat = Boolean(
            bacSiDangSua && laHoSoDayDu(bacSiDangSua)
        );

        try {
            dangLuu = true;

            if (saveButton) {
                saveButton.disabled = true;
                saveButton.classList.add("is-loading");
                saveButton.textContent = "Đang lưu...";
            }

            if (laCapNhat) {
                const maBacSi = layMaBacSi(bacSiDangSua);

                await apiFetch(
                    `${API_BASE}/${encodeURIComponent(maBacSi)}`,
                    {
                        method: "PUT",
                        body: JSON.stringify(payload)
                    }
                );
            } else {
                await apiFetch(API_BASE, {
                    method: "POST",
                    body: JSON.stringify(payload)
                });
            }

            // Đóng modal sau khi backend xác nhận lưu thành công
            dongModal();

            // Thông báo kết quả ngay trên giao diện Admin
            hienThiThongBao(
                laCapNhat
                    ? "Cập nhật hồ sơ bác sĩ thành công."
                    : "Bổ sung hồ sơ bác sĩ thành công.",
                "success"
            );

            // Tải lại dữ liệu để cập nhật bảng và thống kê
            await Promise.all([
                taiDanhSachBacSi(),
                taiTaiKhoanChuaCoHoSo()
            ]);

        } catch (error) {
            console.error("Lỗi lưu hồ sơ bác sĩ:", error);

            const formMessage = $("#formMessage");

            if (formMessage) {
                formMessage.textContent =
                    error.message || "Không thể lưu hồ sơ bác sĩ.";
                formMessage.hidden = false;
            } else {
                hienThiThongBao(
                    error.message || "Không thể lưu hồ sơ bác sĩ."
                );
            }

        } finally {
            dangLuu = false;

            if (saveButton) {
                saveButton.disabled = false;
                saveButton.classList.remove("is-loading");
                saveButton.textContent = "Lưu hồ sơ";
            }
        }
    }


    /* =====================================================
       EVENT LISTENERS
       ===================================================== */


    function ganSuKien() {
        // Mở modal bổ sung hồ sơ
        $("#btnOpenCreate")?.addEventListener("click", () => {
            moFormThem();
        });

        // Làm mới dữ liệu
        $("#btnRefresh")?.addEventListener("click", async () => {
            anThongBao();

            await Promise.all([
                taiDanhSachBacSi(),
                taiDanhSachKhoa(),
                taiTaiKhoanChuaCoHoSo()
            ]);
        });

        // Đóng modal
        $("#btnCloseModal")?.addEventListener("click", dongModal);
        $("#btnCancel")?.addEventListener("click", dongModal);

        // Bấm vùng nền để đóng
        $$("[data-close-modal]").forEach(element => {
            element.addEventListener("click", dongModal);
        });

        // Gửi form lưu hồ sơ
        $("#doctorForm")?.addEventListener("submit", luuHoSoBacSi);

        // Bộ lọc
        $("#filterSearch")?.addEventListener("input", () => {
            trangHienTai = 1;
            apDungBoLoc();
        });

        $("#filterDepartment")?.addEventListener("change", () => {
            trangHienTai = 1;
            apDungBoLoc();
        });

        $("#filterProfileStatus")?.addEventListener("change", () => {
            trangHienTai = 1;
            apDungBoLoc();
        });

        $("#filterStatus")?.addEventListener("change", () => {
            trangHienTai = 1;
            apDungBoLoc();
        });

        $("#btnResetFilter")?.addEventListener("click", () => {
            $("#filterSearch").value = "";
            $("#filterDepartment").value = "";
            $("#filterProfileStatus").value = "";
            $("#filterStatus").value = "";

            trangHienTai = 1;
            anThongBao();
            apDungBoLoc();
        });

        // Nút phân trang
        $("#btnPrevPage")?.addEventListener("click", () => {
            if (trangHienTai > 1) {
                trangHienTai--;
                hienThiDanhSach(danhSachDangHienThi);
            }
        });

        $("#btnNextPage")?.addEventListener("click", () => {
            const tongSoTrang = Math.ceil(
                danhSachDangHienThi.length / SO_DONG_MOI_TRANG
            );

            if (trangHienTai < tongSoTrang) {
                trangHienTai++;
                hienThiDanhSach(danhSachDangHienThi);
            }
        });

        // Nút sửa/tạo hồ sơ trong bảng
        $("#doctorTableBody")?.addEventListener("click", event => {
            const button = event.target.closest("[data-action='edit']");
            if (!button) return;

            const userId = button.dataset.userId;
            if (userId) {
                moFormSua(userId);
            }
        });

        // Đóng modal bằng Escape
        document.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                const modal = $("#doctorModal");

                if (modal?.getAttribute("aria-hidden") === "false") {
                    dongModal();
                }
            }
        });
    }


    /* =====================================================
       INITIALIZATION
       ===================================================== */

    async function khoiTaoTrang() {
        ganSuKien();

        const modal = $("#doctorModal");

        if (modal) {
            modal.setAttribute("aria-hidden", "true");
        }

        await Promise.all([
            taiDanhSachBacSi(),
            taiDanhSachKhoa(),
            taiTaiKhoanChuaCoHoSo()
        ]);
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            khoiTaoTrang
        );
    } else {
        khoiTaoTrang();
    }
})();
