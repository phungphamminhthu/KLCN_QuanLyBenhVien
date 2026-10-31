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

    // =====================================================
    // JWT và headers
    // =====================================================

    function getToken() {
        return (
            localStorage.getItem("Token") ||
            sessionStorage.getItem("Token") ||
            ""
        );
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
                    method === "POST" ||
                    method === "PUT" ||
                    method === "PATCH"
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
                        errorData.message ||
                        errorData.error ||
                        errorData.detail ||
                        errorMessage;
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
            vaiTro.maVaiTro ??
            vaiTro.MaVaiTro ??
            vaiTro.id ??
            vaiTro.ID
        );
    }

    function layTenVaiTro(vaiTro) {
        return (
            vaiTro.tenVaiTro ??
            vaiTro.TenVaiTro ??
            vaiTro.name ??
            "Vai trò"
        );
    }

    function layMaQuyen(quyen) {
        return (
            quyen.maQuyen ??
            quyen.MaQuyen ??
            quyen.id ??
            quyen.ID
        );
    }

    function layTenQuyen(quyen) {
        return (
            quyen.tenQuyen ??
            quyen.TenQuyen ??
            quyen.name ??
            "Chức năng"
        );
    }

    function layMoTaQuyen(quyen) {
        return (
            quyen.moTa ??
            quyen.MoTa ??
            quyen.description ??
            ""
        );
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
        message.className = `alert alert-${loai}`;
        message.classList.remove("d-none");

        clearTimeout(message._timeout);

        message._timeout = setTimeout(() => {
            message.classList.add("d-none");
        }, 4000);
    }

    // =====================================================
    // Tải danh sách vai trò
    // GET /api/phan-quyen/vai-tro
    // =====================================================

    async function taiDanhSachVaiTro() {
        if (!roleList) return;

        roleList.innerHTML = `
            <div class="text-center py-3">
                <span class="spinner-border spinner-border-sm"></span>
                Đang tải vai trò...
            </div>
        `;

        try {
            const data = await apiRequest(
                "/api/phan-quyen/vai-tro"
            );

            danhSachVaiTro = layDanhSach(data);

            if (danhSachVaiTro.length === 0) {
                roleList.innerHTML = `
                    <div class="text-muted text-center py-3">
                        Không có vai trò nào.
                    </div>
                `;

                hienThiDanhSachQuyen([]);
                return;
            }

            hienThiDanhSachVaiTro();

            const vaiTroDauTien = danhSachVaiTro[0];
            await chonVaiTro(layMaVaiTro(vaiTroDauTien));

        } catch (error) {
            console.error(
                "Lỗi tải danh sách vai trò:",
                error
            );

            roleList.innerHTML = `
                <div class="text-danger p-2">
                    ${escapeHtml(error.message)}
                </div>
            `;

            hienThongBao(error.message, "danger");
        }
    }

    function hienThiDanhSachVaiTro() {
        if (!roleList) return;

        roleList.innerHTML = "";

        danhSachVaiTro.forEach(vaiTro => {
            const maVaiTro = layMaVaiTro(vaiTro);
            const tenVaiTro = layTenVaiTro(vaiTro);

            const item = document.createElement("button");

            item.type = "button";
            item.className =
                "list-group-item list-group-item-action";
            item.dataset.maVaiTro = maVaiTro;
            item.textContent = tenVaiTro;

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

        const vaiTro = danhSachVaiTro.find(
            item =>
                String(layMaVaiTro(item)) ===
                String(maVaiTro)
        );

        if (roleTitle) {
            roleTitle.textContent = vaiTro
                ? `Phân quyền: ${layTenVaiTro(vaiTro)}`
                : "Phân quyền";
        }

        hienThiDanhSachVaiTro();

        if (permissionBody) {
            permissionBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-3">
                        <span class="spinner-border spinner-border-sm"></span>
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
                tenQuyen: layTenQuyen(quyen),
                nhomQuyen: quyen.nhomQuyen ?? "Chức năng",
                moTa: layMoTaQuyen(quyen),
                quyenXem: quyen.quyenXem === true,
                quyenThem: quyen.quyenThem === true,
                quyenSua: quyen.quyenSua === true,
                quyenXoa: quyen.quyenXoa === true
            }));

            hienThiDanhSachQuyen(danhSachQuyen);
            capNhatSelectAll();

        } catch (error) {
            console.error("Lỗi tải quyền:", error);

            if (permissionBody) {
                permissionBody.innerHTML = `
                    <tr>
                        <td colspan="5"
                            class="text-danger text-center py-3">
                            ${escapeHtml(error.message)}
                        </td>
                    </tr>
                `;
            }

            hienThongBao(error.message, "danger");

        } finally {
            if (saveButton) {
                saveButton.disabled = false;
            }
        }
    }

    // =====================================================
    // Hiển thị quyền với 4 checkbox
    // =====================================================

    function taoCheckbox(quyen, field) {
        const checked = quyen[field] === true;

        return `
            <td class="text-center">
                <input
                    type="checkbox"
                    class="form-check-input permission-checkbox"
                    data-ma-quyen="${quyen.maQuyen}"
                    data-field="${field}"
                    ${checked ? "checked" : ""}
                    aria-label="${escapeHtml(quyen.tenQuyen)} - ${field}"
                >
            </td>
        `;
    }

    function hienThiDanhSachQuyen(danhSach) {
        if (!permissionBody) return;

        permissionBody.innerHTML = "";

        const tuKhoa = (
            searchPermission?.value || ""
        ).trim().toLowerCase();

        const danhSachLoc = danhSach.filter(quyen => {
            const ten = quyen.tenQuyen.toLowerCase();
            const moTa = quyen.moTa.toLowerCase();

            return (
                ten.includes(tuKhoa) ||
                moTa.includes(tuKhoa)
            );
        });

        if (danhSachLoc.length === 0) {
            permissionBody.innerHTML = `
                <tr>
                    <td colspan="5"
                        class="text-center text-muted py-3">
                        Không có chức năng phù hợp.
                    </td>
                </tr>
            `;
            return;
        }

        danhSachLoc.forEach((quyen, index) => {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>
                    ${index + 1}.
                    ${escapeHtml(quyen.tenQuyen)}
                    ${
                        quyen.moTa
                            ? `<div class="small text-muted">
                                   ${escapeHtml(quyen.moTa)}
                               </div>`
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

                    const field =
                        event.target.dataset.field;

                    const quyen = danhSachQuyen.find(
                        item =>
                            Number(item.maQuyen) === maQuyen
                    );

                    if (quyen && field in quyen) {
                        quyen[field] =
                            event.target.checked;
                    }

                    capNhatSelectAll();
                });
            });
    }

    // =====================================================
    // Chọn tất cả quyền
    // =====================================================

    function capNhatSelectAll() {
        if (!selectAll) return;

        const checkboxes = permissionBody
            ?.querySelectorAll(".permission-checkbox");

        if (!checkboxes || checkboxes.length === 0) {
            selectAll.checked = false;
            selectAll.indeterminate = false;
            return;
        }

        const checkedCount = Array.from(checkboxes)
            .filter(checkbox => checkbox.checked)
            .length;

        selectAll.checked =
            checkedCount === checkboxes.length;

        selectAll.indeterminate =
            checkedCount > 0 &&
            checkedCount < checkboxes.length;
    }

    if (selectAll) {
        selectAll.addEventListener("change", () => {
            const checked = selectAll.checked;

            danhSachQuyen.forEach(quyen => {
                quyen.quyenXem = checked;
                quyen.quyenThem = checked;
                quyen.quyenSua = checked;
                quyen.quyenXoa = checked;
            });

            hienThiDanhSachQuyen(danhSachQuyen);
            capNhatSelectAll();
        });
    }

    // =====================================================
    // Tìm kiếm chức năng
    // =====================================================

    if (searchPermission) {
        searchPermission.addEventListener("input", () => {
            hienThiDanhSachQuyen(danhSachQuyen);
            capNhatSelectAll();
        });
    }

    // =====================================================
    // Lưu phân quyền
    // POST /api/phan-quyen/{MaVaiTro}/luu
    // =====================================================

    async function luuPhanQuyen() {
        if (
            maVaiTroDangChon === null ||
            maVaiTroDangChon === undefined
        ) {
            hienThongBao(
                "Vui lòng chọn vai trò cần phân quyền.",
                "warning"
            );
            return;
        }

        if (saveButton) {
            saveButton.disabled = true;
            saveButton.dataset.originalText =
                saveButton.textContent ||
                "Lưu phân quyền";
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
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                }
            );

            hienThongBao(
                "Lưu phân quyền thành công.",
                "success"
            );

        } catch (error) {
            console.error("Lỗi lưu phân quyền:", error);
            hienThongBao(error.message, "danger");

        } finally {
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.textContent =
                    saveButton.dataset.originalText ||
                    "Lưu phân quyền";
            }
        }
    }

    if (saveButton) {
        saveButton.addEventListener(
            "click",
            luuPhanQuyen
        );
    }

    // =====================================================
    // Khởi tạo trang
    // =====================================================

    taiDanhSachVaiTro();
});