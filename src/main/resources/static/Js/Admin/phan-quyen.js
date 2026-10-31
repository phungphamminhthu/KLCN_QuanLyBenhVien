let maVaiTroDangChon = null;
let danhSachQuyen = [];
let danhSachVaiTro = [];

document.addEventListener("DOMContentLoaded", () => {
    taiDanhSachVaiTro();

    const searchInput = document.getElementById("searchPermission");
    if (searchInput) {
        searchInput.addEventListener("input", locChucNang);
    }
});

// Lấy giá trị hỗ trợ cả JSON PascalCase và camelCase
function getValue(obj, pascalName, camelName) {
    return obj?.[pascalName] ?? obj?.[camelName] ?? null;
}

// CSRF headers
function layCsrfHeaders() {
    const token = document.querySelector('meta[name="_csrf"]')?.content;
    const header = document.querySelector('meta[name="_csrf_header"]')?.content;

    const headers = {
        "Content-Type": "application/json"
    };

    if (token && header) {
        headers[header] = token;
    }

    return headers;
}

// Tải danh sách vai trò
async function taiDanhSachVaiTro() {
    const roleList = document.getElementById("roleList");

    roleList.innerHTML = `
        <div class="empty-state">Đang tải danh sách vai trò...</div>
    `;

    try {
        // Endpoint cần được khai báo trong PhanQuyenController
        const response = await fetch("/api/phan-quyen/vai-tro");

        if (!response.ok) {
            throw new Error("Không tải được danh sách vai trò.");
        }

        danhSachVaiTro = await response.json();
        renderDanhSachVaiTro();

    } catch (error) {
        roleList.innerHTML = `
            <div class="empty-state">${escapeHtml(error.message)}</div>
        `;
    }
}

// Hiển thị danh sách vai trò
function renderDanhSachVaiTro() {
    const roleList = document.getElementById("roleList");

    if (!danhSachVaiTro.length) {
        roleList.innerHTML = `
            <div class="empty-state">Chưa có vai trò nào.</div>
        `;
        return;
    }

    roleList.innerHTML = "";

    danhSachVaiTro.forEach(vaiTro => {
        const maVaiTro = getValue(vaiTro, "MaVaiTro", "maVaiTro");
        const tenVaiTro = getValue(vaiTro, "TenVaiTro", "tenVaiTro")
            || getValue(vaiTro, "Ten", "ten")
            || "Vai trò";

        const button = document.createElement("button");
        button.type = "button";
        button.className = "role-item";
        button.dataset.id = maVaiTro;
        button.dataset.name = tenVaiTro;

        button.innerHTML = `
            <span class="role-item-name">${escapeHtml(tenVaiTro)}</span>
        `;

        button.addEventListener("click", () => chonVaiTro(button));
        roleList.appendChild(button);
    });
}

// Chọn vai trò
async function chonVaiTro(button) {
    document.querySelectorAll(".role-item").forEach(item => {
        item.classList.remove("active");
    });

    button.classList.add("active");

    maVaiTroDangChon = button.dataset.id;

    document.getElementById("roleTitle").textContent =
        "Phân quyền: " + button.dataset.name;

    document.getElementById("saveButton").disabled = false;
    document.getElementById("message").textContent = "";

    await taiQuyenTheoVaiTro(maVaiTroDangChon);
}

// Tải quyền theo vai trò
async function taiQuyenTheoVaiTro(maVaiTro) {
    const body = document.getElementById("permissionBody");

    body.innerHTML = `
        <tr>
            <td colspan="5" class="empty-state">Đang tải dữ liệu...</td>
        </tr>
    `;

    try {
        const response = await fetch(
            `/api/phan-quyen/${encodeURIComponent(maVaiTro)}/quyen`
        );

        if (!response.ok) {
            throw new Error("Không tải được danh sách quyền.");
        }

        const data = await response.json();

        danhSachQuyen = Array.isArray(data) ? data : [];
        renderQuyen();

    } catch (error) {
        body.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    ${escapeHtml(error.message)}
                </td>
            </tr>
        `;
    }
}

// Hiển thị danh sách quyền
function renderQuyen() {
    const body = document.getElementById("permissionBody");

    if (!danhSachQuyen.length) {
        body.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    Chưa có chức năng nào được khai báo.
                </td>
            </tr>
        `;

        capNhatChonTatCa();
        return;
    }

    body.innerHTML = "";

    danhSachQuyen.forEach((quyen, index) => {
        const tenQuyen = getValue(quyen, "TenQuyen", "tenQuyen") || "";
        const moTa = getValue(quyen, "MoTa", "moTa") || "";

        const row = document.createElement("tr");
        row.dataset.name = `${tenQuyen} ${moTa}`.toLowerCase();

        row.innerHTML = `
            <td>
                <div class="permission-name">
                    <strong>${escapeHtml(tenQuyen)}</strong>
                    ${moTa ? `<small>${escapeHtml(moTa)}</small>` : ""}
                </div>
            </td>

            ${taoCheckbox(index, "QuyenXem",
                getValue(quyen, "QuyenXem", "quyenXem"))}

            ${taoCheckbox(index, "QuyenThem",
                getValue(quyen, "QuyenThem", "quyenThem"))}

            ${taoCheckbox(index, "QuyenSua",
                getValue(quyen, "QuyenSua", "quyenSua"))}

            ${taoCheckbox(index, "QuyenXoa",
                getValue(quyen, "QuyenXoa", "quyenXoa"))}
        `;

        body.appendChild(row);
    });

    capNhatChonTatCa();
    locChucNang();
}

// Tạo checkbox
function taoCheckbox(index, field, checked) {
    return `
        <td>
            <input
                type="checkbox"
                class="permission-checkbox"
                data-index="${index}"
                data-field="${field}"
                ${checked === true ? "checked" : ""}
                onchange="capNhatGiaTri(this)">
        </td>
    `;
}

// Cập nhật quyền khi tích checkbox
function capNhatGiaTri(input) {
    const index = Number(input.dataset.index);
    const field = input.dataset.field;

    danhSachQuyen[index][field] = input.checked;

    capNhatChonTatCa();
}

// Chọn/bỏ chọn tất cả quyền
function chonTatCa(checked) {
    danhSachQuyen.forEach(quyen => {
        quyen.QuyenXem = checked;
        quyen.QuyenThem = checked;
        quyen.QuyenSua = checked;
        quyen.QuyenXoa = checked;
    });

    renderQuyen();
}

// Cập nhật checkbox chọn tất cả
function capNhatChonTatCa() {
    const selectAll = document.getElementById("selectAll");

    const allChecked = danhSachQuyen.length > 0 &&
        danhSachQuyen.every(quyen =>
            Boolean(getValue(quyen, "QuyenXem", "quyenXem")) &&
            Boolean(getValue(quyen, "QuyenThem", "quyenThem")) &&
            Boolean(getValue(quyen, "QuyenSua", "quyenSua")) &&
            Boolean(getValue(quyen, "QuyenXoa", "quyenXoa"))
        );

    if (selectAll) {
        selectAll.checked = allChecked;
    }
}

// Lọc chức năng
function locChucNang() {
    const keyword = document
        .getElementById("searchPermission")
        .value
        .trim()
        .toLowerCase();

    document.querySelectorAll("#permissionBody tr").forEach(row => {
        if (row.classList.contains("group-row")) {
            return;
        }

        const name = row.dataset.name || "";
        row.style.display = name.includes(keyword) ? "" : "none";
    });
}

// Lưu phân quyền
async function luuPhanQuyen() {
    if (!maVaiTroDangChon) {
        hienThongBao("Vui lòng chọn vai trò.", false);
        return;
    }

    const button = document.getElementById("saveButton");
    button.disabled = true;
    button.textContent = "Đang lưu...";

    try {
        // Chuyển dữ liệu thành camelCase để phù hợp JSON mặc định của Spring
        const payload = danhSachQuyen.map(quyen => ({
            maQuyen: getValue(quyen, "MaQuyen", "maQuyen"),
            tenQuyen: getValue(quyen, "TenQuyen", "tenQuyen"),
            moTa: getValue(quyen, "MoTa", "moTa"),
            quyenXem: Boolean(getValue(quyen, "QuyenXem", "quyenXem")),
            quyenThem: Boolean(getValue(quyen, "QuyenThem", "quyenThem")),
            quyenSua: Boolean(getValue(quyen, "QuyenSua", "quyenSua")),
            quyenXoa: Boolean(getValue(quyen, "QuyenXoa", "quyenXoa"))
        }));

        const response = await fetch(
            `/api/phan-quyen/${encodeURIComponent(maVaiTroDangChon)}/luu`,
            {
                method: "POST",
                headers: layCsrfHeaders(),
                body: JSON.stringify(payload)
            }
        );

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                result.message || result.error || "Lưu phân quyền thất bại."
            );
        }

        hienThongBao(
            result.message || "Lưu phân quyền thành công.",
            true
        );

    } catch (error) {
        hienThongBao(error.message, false);
    } finally {
        button.disabled = false;
        button.textContent = "Lưu phân quyền";
    }
}

// Hiển thị thông báo
function hienThongBao(message, success) {
    const element = document.getElementById("message");

    element.textContent = message;
    element.className = success
        ? "message success"
        : "message error";
}

// Escape nội dung trước khi render HTML
function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}