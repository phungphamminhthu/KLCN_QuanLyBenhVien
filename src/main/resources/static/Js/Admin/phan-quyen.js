document.addEventListener("DOMContentLoaded", () => {
    const roleList = document.getElementById("roleList");
    const roleTitle = document.getElementById("roleTitle");
    const searchPermission = document.getElementById("searchPermission");
    const permissionBody = document.getElementById("permissionBody");
    const selectAll = document.getElementById("selectAll");
    const message = document.getElementById("message");
    const saveButton = document.getElementById("saveButton");

    let danhSachVaiTro = [];
    let danhSachQuyen = [];
    let maVaiTroDangChon = null;
    let taiQuyenThanhCong = false;

    const VAI_TRO_HIEN_THI = {
        ADMIN: "Quản trị viên",
        TIEPNHAN: "Nhân viên tiếp nhận",
        BACSI: "Bác sĩ",
        CHUYENTRACH: "Nhân viên chuyên trách",
        DUOCSI: "Dược sĩ"
    };

    const VAI_TRO_CHO_PHEP = Object.keys(VAI_TRO_HIEN_THI);

    const TEN_QUYEN = {
        quyenXem: "Xem",
        quyenThem: "Thêm",
        quyenSua: "Sửa",
        quyenXoa: "Xóa"
    };

    // =====================================================
    // JWT và headers
    // =====================================================

    function getToken() {
        return localStorage.getItem("Token")
            || sessionStorage.getItem("Token")
            || "";
    }

    function getHeaders(includeJson = false) {
        const headers = {};

        if (includeJson) {
            headers["Content-Type"] = "application/json";
        }

        const token = getToken();

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        // CSRF token nếu ứng dụng có cấu hình
        const csrfToken = document
            .querySelector('meta[name="_csrf"]')
            ?.getAttribute("content");

        const csrfHeader = document
            .querySelector('meta[name="_csrf_header"]')
            ?.getAttribute("content");

        if (csrfToken && csrfHeader) {
            headers[csrfHeader] = csrfToken;
        }

        return headers;
    }

    // =====================================================
    // API request
    // =====================================================

    async function apiRequest(url, options = {}) {
        const method = (options.method || "GET").toUpperCase();

        const response = await fetch(url, {
            ...options,
            method,
            headers: {
                ...getHeaders(
                    method === "POST"
                    || method === "PUT"
                    || method === "PATCH"
                ),
                ...(options.headers || {})
            }
        });

        if (response.status === 401) {
            throw new Error(
                "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
            );
        }

        if (response.status === 403) {
            throw new Error(
                "Bạn không có quyền thực hiện chức năng này."
            );
        }

        if (!response.ok) {
            let errorMessage = `Lỗi HTTP ${response.status}`;

            try {
                const contentType =
                    response.headers.get("content-type") || "";

                if (contentType.includes("application/json")) {
                    const errorData = await response.json();

                    errorMessage =
                        errorData.message
                        || errorData.error
                        || errorData.detail
                        || errorMessage;
                } else {
                    const text = await response.text();

                    if (text) {
                        errorMessage = text;
                    }
                }
            } catch (_) {
                // Giữ thông báo lỗi mặc định
            }

            throw new Error(errorMessage);
        }

        if (response.status === 204) {
            return null;
        }

        const contentType =
            response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            return response.json();
        }

        return response.text();
    }

    // =====================================================
    // Helpers dữ liệu
    // =====================================================

    function layDanhSach(data) {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        if (Array.isArray(data?.content)) return data.content;
        if (Array.isArray(data?.result)) return data.result;

        return [];
    }

    function layMaVaiTro(vaiTro) {
        return (
            vaiTro.maVaiTro
            ?? vaiTro.MaVaiTro
            ?? vaiTro.id
            ?? vaiTro.ID
        );
    }

    function layTenVaiTro(vaiTro) {
        return String(
            vaiTro.tenVaiTro
            ?? vaiTro.TenVaiTro
            ?? vaiTro.name
            ?? ""
        ).trim().toUpperCase();
    }

    function layMaQuyen(quyen) {
        return (
            quyen.maQuyen
            ?? quyen.MaQuyen
            ?? quyen.id
            ?? quyen.ID
        );
    }

    function layTenQuyen(quyen) {
        return (
            quyen.tenQuyen
            ?? quyen.TenQuyen
            ?? quyen.name
            ?? "Chức năng"
        );
    }

    function layMoTaQuyen(quyen) {
        return (
            quyen.moTa
            ?? quyen.MoTa
            ?? quyen.description
            ?? ""
        );
    }

    function laDuocCapQuyen(value) {
        return value === true
            || value === 1
            || value === "1";
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    // =====================================================
    // Thông báo
    // =====================================================

    function hienThongBao(noiDung, loai = "info") {
        if (!message) {
            alert(noiDung);
            return;
        }

        message.textContent = noiDung;
        message.className = `message ${loai}`;

        clearTimeout(message._timeout);

        message._timeout = setTimeout(() => {
            message.textContent = "";
            message.className = "message";
        }, 4000);
    }

    // =====================================================
    // Tải danh sách vai trò
    // GET /api/phan-quyen/vai-tro
    // =====================================================

    async function taiDanhSachVaiTro() {
        if (!roleList) return;

        roleList.innerHTML = `
            <div class="empty-state">
                Đang tải danh sách vai trò...
            </div>
        `;

        if (saveButton) {
            saveButton.disabled = true;
        }

        try {
            const data = await apiRequest(
                "/api/phan-quyen/vai-tro"
            );

            // Chỉ hiển thị 5 vai trò nhân viên, không hiển thị BENHNHAN
            danhSachVaiTro = layDanhSach(data).filter(vaiTro => {
                return VAI_TRO_CHO_PHEP.includes(
                    layTenVaiTro(vaiTro)
                );
            });

            if (danhSachVaiTro.length === 0) {
                roleList.innerHTML = `
                    <div class="empty-state">
                        Không có vai trò nhân viên nào.
                    </div>
                `;

                hienThiDanhSachQuyen([]);
                return;
            }

            hienThiDanhSachVaiTro();

            const vaiTroDauTien = danhSachVaiTro[0];

            await chonVaiTro(layMaVaiTro(vaiTroDauTien));

        } catch (error) {
            console.error("Lỗi tải danh sách vai trò:", error);

            roleList.innerHTML = `
                <div class="empty-state">
                    ${escapeHtml(error.message)}
                </div>
            `;

            hienThongBao(error.message, "error");
        }
    }

    // =====================================================
    // Hiển thị danh sách vai trò
    // =====================================================

    function hienThiDanhSachVaiTro() {
        if (!roleList) return;

        roleList.innerHTML = "";

        danhSachVaiTro.forEach(vaiTro => {
            const maVaiTro = layMaVaiTro(vaiTro);
            const ma = layTenVaiTro(vaiTro);
            const tenHienThi = VAI_TRO_HIEN_THI[ma] || ma;

            const item = document.createElement("button");

            item.type = "button";
            item.className = "role-item";
            item.dataset.maVaiTro = maVaiTro;

            item.innerHTML = `
                <span>
                    <span class="role-item-name">
                        ${escapeHtml(tenHienThi)}
                    </span>
                    <small>${escapeHtml(ma)}</small>
                </span>
            `;

            if (
                String(maVaiTro) ===
                String(maVaiTroDangChon)
            ) {
                item.classList.add("active");
            }

            item.addEventListener("click", () => {
                chonVaiTro(maVaiTro);
            });

            roleList.appendChild(item);
        });
    }

    // =====================================================
    // Chọn vai trò
    // GET /api/phan-quyen/{MaVaiTro}/quyen
    // =====================================================

    async function chonVaiTro(maVaiTro) {
        maVaiTroDangChon = maVaiTro;
        taiQuyenThanhCong = false;

        const vaiTro = danhSachVaiTro.find(item =>
            String(layMaVaiTro(item)) === String(maVaiTro)
        );

        const ma = vaiTro ? layTenVaiTro(vaiTro) : "";
        const tenHienThi = VAI_TRO_HIEN_THI[ma] || ma;

        if (roleTitle) {
            roleTitle.textContent = vaiTro
                ? `Phân quyền: ${tenHienThi}`
                : "Phân quyền";
        }

        hienThiDanhSachVaiTro();

        if (permissionBody) {
            permissionBody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        Đang tải quyền...
                    </td>
                </tr>
            `;
        }

        if (selectAll) {
            selectAll.checked = false;
            selectAll.indeterminate = false;
        }

        if (saveButton) {
            saveButton.disabled = true;
        }

        try {
            const data = await apiRequest(
                `/api/phan-quyen/${encodeURIComponent(maVaiTro)}/quyen`
            );

            danhSachQuyen = layDanhSach(data).map(quyen => ({
                maQuyen: Number(layMaQuyen(quyen)),
                tenQuyen: String(layTenQuyen(quyen)),
                nhomQuyen: quyen.nhomQuyen ?? "Chức năng",
                moTa: String(layMoTaQuyen(quyen)),
                quyenXem: laDuocCapQuyen(
                    quyen.quyenXem ?? quyen.QuyenXem
                ),
                quyenThem: laDuocCapQuyen(
                    quyen.quyenThem ?? quyen.QuyenThem
                ),
                quyenSua: laDuocCapQuyen(
                    quyen.quyenSua ?? quyen.QuyenSua
                ),
                quyenXoa: laDuocCapQuyen(
                    quyen.quyenXoa ?? quyen.QuyenXoa
                )
            }));

            hienThiDanhSachQuyen(danhSachQuyen);
            capNhatSelectAll();

            taiQuyenThanhCong = true;

        } catch (error) {
            console.error("Lỗi tải quyền:", error);

            danhSachQuyen = [];

            if (permissionBody) {
                permissionBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="empty-state">
                            ${escapeHtml(error.message)}
                        </td>
                    </tr>
                `;
            }

            hienThongBao(error.message, "error");

        } finally {
            if (saveButton) {
                saveButton.disabled = !taiQuyenThanhCong;
            }
        }
    }

    // =====================================================
    // Tạo checkbox quyền
    // =====================================================

    function taoCheckbox(quyen, field) {
        const checked = quyen[field] === true;

        return `
            <td class="text-center">
                <input
                    type="checkbox"
                    class="permission-checkbox"
                    data-ma-quyen="${quyen.maQuyen}"
                    data-field="${field}"
                    ${checked ? "checked" : ""}
                    aria-label="${escapeHtml(quyen.tenQuyen)} - ${TEN_QUYEN[field]}"
                >
            </td>
        `;
    }

    // =====================================================
    // Hiển thị bảng quyền
    // =====================================================

    function hienThiDanhSachQuyen(danhSach) {
        if (!permissionBody) return;

        permissionBody.innerHTML = "";

        const tuKhoa = (
            searchPermission?.value || ""
        ).trim().toLowerCase();

        const danhSachLoc = danhSach.filter(quyen => {
            const ten = quyen.tenQuyen.toLowerCase();
            const moTa = quyen.moTa.toLowerCase();

            return ten.includes(tuKhoa)
                || moTa.includes(tuKhoa);
        });

        if (danhSachLoc.length === 0) {
            permissionBody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        Không có chức năng phù hợp.
                    </td>
                </tr>
            `;

            capNhatSelectAll();
            return;
        }

        danhSachLoc.forEach((quyen, index) => {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td class="permission-name">
                    <strong>
                        ${index + 1}. ${escapeHtml(quyen.tenQuyen)}
                    </strong>
                    ${
                        quyen.moTa
                            ? `<small>${escapeHtml(quyen.moTa)}</small>`
                            : ""
                    }
                </td>

                ${taoCheckbox(quyen, "quyenXem")}
                ${taoCheckbox(quyen, "quyenThem")}
                ${taoCheckbox(quyen, "quyenSua")}
                ${taoCheckbox(quyen, "quyenXoa")}
            `;

            permissionBody.appendChild(row);
        });

        ganSuKienCheckbox();
        capNhatSelectAll();
    }

    // =====================================================
    // Thay đổi checkbox quyền
    // =====================================================

    function ganSuKienCheckbox() {
        permissionBody
            ?.querySelectorAll(".permission-checkbox")
            .forEach(checkbox => {
                checkbox.addEventListener("change", event => {
                    const maQuyen = Number(
                        event.target.dataset.maQuyen
                    );

                    const field = event.target.dataset.field;

                    const quyen = danhSachQuyen.find(item =>
                        Number(item.maQuyen) === maQuyen
                    );

                    if (quyen && field in quyen) {
                        quyen[field] = event.target.checked;
                    }

                    capNhatSelectAll();
                });
            });
    }

    // =====================================================
    // Chọn tất cả quyền
    // Áp dụng cho tất cả chức năng của vai trò đang chọn
    // =====================================================

    function chonTatCaQuyen(checked) {
        danhSachQuyen.forEach(quyen => {
            quyen.quyenXem = checked;
            quyen.quyenThem = checked;
            quyen.quyenSua = checked;
            quyen.quyenXoa = checked;
        });

        hienThiDanhSachQuyen(danhSachQuyen);
    }

    function capNhatSelectAll() {
        if (!selectAll) return;

        const tatCaCheckbox = danhSachQuyen.flatMap(quyen => [
            quyen.quyenXem,
            quyen.quyenThem,
            quyen.quyenSua,
            quyen.quyenXoa
        ]);

        if (tatCaCheckbox.length === 0) {
            selectAll.checked = false;
            selectAll.indeterminate = false;
            return;
        }

        const checkedCount = tatCaCheckbox.filter(Boolean).length;

        selectAll.checked =
            checkedCount === tatCaCheckbox.length;

        selectAll.indeterminate =
            checkedCount > 0
            && checkedCount < tatCaCheckbox.length;
    }

    if (selectAll) {
        selectAll.addEventListener("change", () => {
            chonTatCaQuyen(selectAll.checked);
        });
    }

    // =====================================================
    // Tìm kiếm chức năng
    // =====================================================

    if (searchPermission) {
        searchPermission.addEventListener("input", () => {
            hienThiDanhSachQuyen(danhSachQuyen);
        });
    }

    // =====================================================
    // Lưu phân quyền
    // POST /api/phan-quyen/{MaVaiTro}/luu
    // =====================================================

    async function luuPhanQuyen() {
        if (
            maVaiTroDangChon === null
            || maVaiTroDangChon === undefined
        ) {
            hienThongBao(
                "Vui lòng chọn vai trò cần phân quyền.",
                "error"
            );
            return;
        }

        if (!taiQuyenThanhCong) {
            hienThongBao(
                "Chưa tải được dữ liệu quyền. Vui lòng thử lại.",
                "error"
            );
            return;
        }

        if (saveButton) {
            saveButton.disabled = true;
            saveButton.dataset.originalText =
                saveButton.textContent || "Lưu phân quyền";
            saveButton.textContent = "Đang lưu...";
        }

        try {
            const payload = {
                danhSachQuyen: danhSachQuyen.map(quyen => ({
                    maQuyen: Number(quyen.maQuyen),
                    quyenXem: quyen.quyenXem === true,
                    quyenThem: quyen.quyenThem === true,
                    quyenSua: quyen.quyenSua === true,
                    quyenXoa: quyen.quyenXoa === true
                }))
            };

            await apiRequest(
                `/api/phan-quyen/${encodeURIComponent(maVaiTroDangChon)}/luu`,
                {
                    method: "POST",
                    body: JSON.stringify(payload)
                }
            );

            hienThongBao(
                "Lưu phân quyền thành công.",
                "success"
            );

        } catch (error) {
            console.error("Lỗi lưu phân quyền:", error);
            hienThongBao(error.message, "error");

        } finally {
            if (saveButton) {
                saveButton.disabled = !taiQuyenThanhCong;
                saveButton.textContent =
                    saveButton.dataset.originalText
                    || "Lưu phân quyền";
            }
        }
    }

    if (saveButton) {
        saveButton.addEventListener("click", luuPhanQuyen);
    }

    // =====================================================
    // Khởi tạo trang
    // =====================================================

    taiDanhSachVaiTro();
});