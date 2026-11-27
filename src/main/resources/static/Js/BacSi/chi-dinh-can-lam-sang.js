/* =========================================
   CHỈ ĐỊNH CẬN LÂM SÀNG - BÁC SĨ
========================================= */

const CLS_API_BASE = "/api/bac-si/kham-benh";

let clsMaLichKham = null;
let clsDanhSachDichVu = [];
let clsDanhSachChiDinh = [];
let clsCoTheKeDon = false;
let clsHoSoHoanTat = false;
let clsToastTimer = null;
// Quản lý ảnh kết quả cận lâm sàng trong modal
let clsAnhKetQuaUrls = [];
let clsAnhKetQuaController = null;

const clsEl = id => document.getElementById(id);

/* =========================================
   TOKEN VÀ API
========================================= */

function clsLayToken() {
    return localStorage.getItem("Token")
        || localStorage.getItem("token")
        || sessionStorage.getItem("Token")
        || sessionStorage.getItem("token");
}

function clsHeaders(coBody = false) {
    const headers = {};
    const token = clsLayToken();

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    if (coBody) {
        headers["Content-Type"] = "application/json";
    }

    return headers;
}

async function clsApi(url, options = {}) {
    const response = await fetch(url, options);
    const text = await response.text();

    let data = null;

    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            data = text;
        }
    }

    if (!response.ok) {
        throw new Error(
            typeof data === "string"
                ? data
                : data?.message
                    || data?.thongBao
                    || `Lỗi HTTP ${response.status}`
        );
    }

    return data;
}

/* =========================================
   TIỆN ÍCH
========================================= */

function clsThongBao(message, isError = false) {
    const toast = clsEl("toast");

    if (!toast) {
        console.error(message);
        return;
    }

    clsEl("toastTitle").textContent =
        isError ? "Có lỗi xảy ra" : "Thành công";

    clsEl("toastMessage").textContent = message;

    clsEl("toastIcon").innerHTML = isError
        ? '<i class="fa-solid fa-xmark"></i>'
        : '<i class="fa-solid fa-check"></i>';

    toast.classList.toggle("error", isError);
    toast.classList.remove("hidden");

    clearTimeout(clsToastTimer);

    clsToastTimer = setTimeout(() => {
        toast.classList.add("hidden");
    }, 3500);
}

function clsEscape(value) {
    return String(value ?? "").replace(
        /[&<>"']/g,
        char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]
    );
}

function clsGiaTri(item, ...keys) {
    for (const key of keys) {
        const value = key
            .split(".")
            .reduce((acc, name) => acc?.[name], item);

        if (value !== null && value !== undefined) {
            return value;
        }
    }

    return null;
}

function clsNgay(value) {
    if (!value) return "---";

    const str = String(value);

    const match = str.match(
        /^(\d{4})-(\d{2})-(\d{2})/
    );

    if (!match) return str;

    const ngay =
        `${match[3]}/${match[2]}/${match[1]}`;

    const gio = str.match(
        /[T ](\d{2}):(\d{2})/
    );

    return gio
        ? `${ngay} ${gio[1]}:${gio[2]}`
        : ngay;
}

/* =========================================
   LẤY MÃ LỊCH KHÁM
========================================= */

function clsLayMaLichKham() {
    const match = window.location.pathname.match(
        /\/auth\/bac-si\/kham-benh\/(\d+)\/can-lam-sang\/?$/
    );

    return match ? Number(match[1]) : null;
}

function clsTrangKham() {
    return `/auth/bac-si/kham-benh/${clsMaLichKham}`;
}

/* =========================================
   TRẠNG THÁI CHỈ ĐỊNH
========================================= */

function clsTenTrangThai(status) {
    const names = {
        ChoThanhToan: "Chờ thanh toán",
        ChoThucHien: "Chờ thực hiện",
        DangThucHien: "Đang thực hiện",
        DaHoanThanh: "Đã hoàn thành"
    };

    return names[status] || status || "Chưa xác định";
}

function clsKhoaKeDon(message) {
    clsCoTheKeDon = false;

    const button = clsEl("btnGoPrescription");

    if (button) button.disabled = true;

    clsEl("prescriptionButtonIcon")
        ?.classList.replace(
            "fa-prescription-bottle-medical",
            "fa-lock"
        );

    if (clsEl("prescriptionLockMessage")) {
        clsEl("prescriptionLockMessage").textContent =
            message;
    }
}

/* Cập nhật bảng trạng thái CLS tổng quan */
function clsCapNhatTongQuanCLS(total, ready, pending, processing, checks) {
    const text = clsEl("clinicalSummaryText");
    const badge = clsEl("clinicalSummaryBadge");
    if (!text || !badge) return;

    const active = checks.filter(c => clsGiaTri(c.item, "trangThai", "TrangThai") !== "DaHuy");
    if (total === 0 || active.length === 0) {
        text.textContent = total === 0 ? "Lượt khám chưa có chỉ định cận lâm sàng." : "Các chỉ định đã được hủy.";
        badge.textContent = total === 0 ? "Chưa có chỉ định" : "Đã hủy";
    } else if (ready === active.length) {
        text.textContent = `Tất cả ${ready} chỉ định đang hoạt động đã có kết quả.`;
        badge.textContent = "Hoàn tất";
    } else if (processing > 0) {
        text.textContent = `Đã có kết quả ${ready}/${active.length}; ${processing} chỉ định đang thực hiện.`;
        badge.textContent = "Đang thực hiện";
    } else {
        text.textContent = `Đã có kết quả ${ready}/${active.length}; còn ${active.length - ready} chỉ định chưa hoàn tất.`;
        badge.textContent = "Chưa hoàn tất";
    }
}

/* =========================================
   THÔNG TIN HỒ SƠ BỆNH NHÂN
========================================= */

function clsCapNhatThongTinHoSo(data) {
    clsEl("patientName").textContent =
        clsGiaTri(data, "hoTen", "HoTen")
        || "Bệnh nhân";

    const id = clsGiaTri(
        data, "maBenhNhan", "MaBenhNhan"
    );

    clsEl("patientCode").textContent = id
        ? `BN${String(id).padStart(6, "0")}`
        : "---";

    clsEl("patientBirthDate").textContent =
        clsNgay(
            clsGiaTri(data, "ngaySinh", "NgaySinh")
        );

    clsEl("patientGender").textContent =
        clsGiaTri(data, "gioiTinh", "GioiTinh")
        || "---";

    const trangThai = clsGiaTri(
        data, "trangThai", "TrangThai"
    );

    clsHoSoHoanTat = trangThai === "HoanTat";

    clsEl("examStatus").textContent =
        clsHoSoHoanTat
            ? "Đã hoàn tất"
            : "Đang khám";

    if (clsHoSoHoanTat) {
        clsEl("btnOpenOrderForm").disabled = true;

        clsKhoaKeDon(
            "Lượt khám đã hoàn tất. Không thể kê đơn mới."
        );
    }
}

async function clsTaiHoSo() {
    const data = await clsApi(
        `${CLS_API_BASE}/${clsMaLichKham}/ho-so`,
        {
            headers: clsHeaders()
        }
    );

    clsCapNhatThongTinHoSo(data);
}

/* =========================================
   TẢI DỊCH VỤ
========================================= */

async function clsTaiDichVu() {
    const data = await clsApi(
        `${CLS_API_BASE}/dich-vu`,
        {
            headers: clsHeaders()
        }
    );

    // Giữ lại dịch vụ có mã nhỏ nhất cho mỗi tên.
    // Không xóa hoặc thay đổi dữ liệu trong MySQL.
    const danhSach = Array.isArray(data) ? data : [];

    const dichVuKhongTrung = new Map();

    danhSach
        .slice()
        .sort((a, b) =>
            Number(clsGiaTri(a, "maDichVu", "MaDichVu")) -
            Number(clsGiaTri(b, "maDichVu", "MaDichVu"))
        )
        .forEach(item => {
            const ten = String(
                clsGiaTri(item, "tenDichVu", "TenDichVu") || ""
            ).trim().toLocaleLowerCase("vi-VN");

            if (ten && !dichVuKhongTrung.has(ten)) {
                dichVuKhongTrung.set(ten, item);
            }
        });

    clsDanhSachDichVu = [...dichVuKhongTrung.values()];

    const select = clsEl("serviceSelect");

    select.replaceChildren(
        new Option("-- Chọn dịch vụ --", "")
    );

    clsDanhSachDichVu.forEach(item => {
        const id = clsGiaTri(
            item, "maDichVu", "MaDichVu"
        );

        const name = clsGiaTri(
            item, "tenDichVu", "TenDichVu"
        );

        if (id != null) {
            select.add(
                new Option(
                    name || `Dịch vụ ${id}`,
                    id
                )
            );
        }
    });
}

// Lấy thông số theo mã dịch vụ, không thay đổi API tạo chỉ định.
let clsThongSoRequestId = 0;
const clsThongSoCache = new Map();

function clsAnThongSo() {
    const panel = clsEl("clsParameterPanel");
    if (!panel) return;
    panel.hidden = true;
    clsEl("clsParameterGroups").replaceChildren();
    clsEl("clsParameterMessage").hidden = true;
    clsEl("clsParameterCount").textContent = "0 thông số";
}

function clsHienThongBaoThongSo(message) {
    const panel = clsEl("clsParameterPanel");
    const el = clsEl("clsParameterMessage");
    panel.hidden = false;
    el.hidden = false;
    el.textContent = message;
    clsEl("clsParameterGroups").replaceChildren();
}

function clsVeThongSo(thongSo) {
    const panel = clsEl("clsParameterPanel");
    const groups = clsEl("clsParameterGroups");
    panel.hidden = false;
    groups.replaceChildren();
    clsEl("clsParameterMessage").hidden = true;
    clsEl("clsParameterCount").textContent = `${thongSo.length} thông số`;

    if (thongSo.length === 0) {
        clsHienThongBaoThongSo(
            "Dịch vụ này chưa được cấu hình thông số. " +
            "Bác sĩ vẫn có thể tạo chỉ định; KTV sẽ cần biểu mẫu phù hợp."
        );
        return;
    }

    const byGroup = new Map();
    for (const item of thongSo) {
        const groupName = String(
            clsGiaTri(item, "nhomChiSo", "NhomChiSo") || "Thông số khác"
        ).trim() || "Thông số khác";
        if (!byGroup.has(groupName)) byGroup.set(groupName, []);
        byGroup.get(groupName).push(item);
    }

    for (const [groupName, values] of byGroup) {
        const section = document.createElement("section");
        section.className = "cls-parameter-group";

        const title = document.createElement("h5");
        title.textContent = groupName;
        section.appendChild(title);

        const list = document.createElement("div");
        list.className = "cls-parameter-chips";

        for (const item of values) {
            const chip = document.createElement("div");
            chip.className = "cls-parameter-chip";
            const name = document.createElement("strong");
            name.textContent = String(
                clsGiaTri(item, "tenChiSo", "TenChiSo") || "Thông số"
            );
            chip.appendChild(name);

            const unitText = clsGiaTri(item, "donVi", "DonVi");
            if (unitText) {
                const unit = document.createElement("small");
                unit.textContent = String(unitText);
                chip.appendChild(unit);
            }
            list.appendChild(chip);
        }
        section.appendChild(list);
        groups.appendChild(section);
    }
}

async function clsChonDichVu() {
    const requestId = ++clsThongSoRequestId;
    const id = Number(clsEl("serviceSelect").value);
    const dichVu = clsDanhSachDichVu.find(
        item => Number(clsGiaTri(item, "maDichVu", "MaDichVu")) === id
    );

    clsEl("orderType").value =
        clsGiaTri(dichVu, "loaiDichVu", "LoaiDichVu") || "";

    if (!Number.isInteger(id) || id <= 0) {
        clsAnThongSo();
        return;
    }

    if (clsThongSoCache.has(id)) {
        clsVeThongSo(clsThongSoCache.get(id));
        return;
    }

    clsHienThongBaoThongSo("Đang tải thông số dịch vụ...");
    try {
        const result = await clsApi(
            `${CLS_API_BASE}/dich-vu/${id}/chi-so`,
            { headers: clsHeaders() }
        );
        if (requestId !== clsThongSoRequestId) return;
        if (!Array.isArray(result)) {
            throw new Error("Dữ liệu thông số không hợp lệ.");
        }
        clsThongSoCache.set(id, result);
        clsVeThongSo(result);
    } catch (error) {
        if (requestId !== clsThongSoRequestId) return;
        clsHienThongBaoThongSo(
            "Không tải được thông số: " + error.message
        );
    }
}

/* =========================================
   FORM TẠO CHỈ ĐỊNH
========================================= */

function clsDongForm() {
    ++clsThongSoRequestId;
    clsAnThongSo();
    clsEl("clinicalOrderForm")
        .classList.add("hidden");

    clsEl("serviceSelect").value = "";
    clsEl("roomId").value = "";
    clsEl("orderType").value = "";
}

async function clsTaoChiDinh() {
    if (clsHoSoHoanTat) {
        clsThongBao(
            "Lượt khám đã hoàn tất.", true
        );
        return;
    }

    const maDichVu = Number(
        clsEl("serviceSelect").value
    );

    const roomValue =
        clsEl("roomId").value.trim();

    if (
        !Number.isInteger(maDichVu)
        || maDichVu <= 0
    ) {
        clsThongBao(
            "Vui lòng chọn dịch vụ.", true
        );
        return;
    }

    const maPhong = roomValue
        ? Number(roomValue)
        : null;

    if (
        maPhong !== null
        && (
            !Number.isInteger(maPhong)
            || maPhong <= 0
        )
    ) {
        clsThongBao(
            "Mã phòng phải là số nguyên dương.",
            true
        );
        return;
    }

    const button = clsEl("btnCreateOrder");
    button.disabled = true;

    try {
        await clsApi(
            `${CLS_API_BASE}/${clsMaLichKham}/chi-dinh`,
            {
                method: "POST",
                headers: clsHeaders(true),
                body: JSON.stringify({
                    maDichVu,
                    maPhong
                })
            }
        );

        clsDongForm();

        clsThongBao(
            "Đã tạo chỉ định cận lâm sàng."
        );

        await clsTaiChiDinh();

    } catch (error) {
        clsThongBao(error.message, true);

    } finally {
        button.disabled = false;
    }
}

/* =========================================
   TÊN DỊCH VỤ
========================================= */

function clsTenDichVu(item) {
    const name = clsGiaTri(
        item, "tenDichVu", "TenDichVu"
    );

    if (name) return name;

    const id = clsGiaTri(
        item, "maDichVu", "MaDichVu"
    );

    const service = clsDanhSachDichVu.find(
        d =>
            Number(
                clsGiaTri(
                    d, "maDichVu", "MaDichVu"
                )
            ) === Number(id)
    );

    return clsGiaTri(
        service, "tenDichVu", "TenDichVu"
    ) || `Dịch vụ ${id ?? ""}`;
}

/* =========================================
   DANH SÁCH VÀ TRẠNG THÁI CLS
========================================= */

/* =========================================
   DANH SÁCH CLS - GOM NHÓM XÉT NGHIỆM
========================================= */

async function clsTaiChiDinh(silent = false) {
    const loading = clsEl("clinicalLoading");
    const list = clsEl("clinicalList");
    const empty = clsEl("clinicalEmpty");

    // Polling nền không bật loading và không xóa danh sách trước,
    // tránh giao diện nhấp nháy mỗi 5 giây.
    if (!silent) {
        loading.classList.remove("hidden");
        empty.classList.add("hidden");
        list.replaceChildren();
        clsKhoaKeDon("Đang kiểm tra kết quả các chỉ định...");
    }

    try {
        const data = await clsApi(
            `${CLS_API_BASE}/${clsMaLichKham}/chi-dinh`,
            { headers: clsHeaders() }
        );

        if (!Array.isArray(data)) {
            throw new Error("Dữ liệu danh sách chỉ định không hợp lệ.");
        }

        clsDanhSachChiDinh = data;
        const total = data.length;

        // Kiểm tra API kết quả thực tế cho mọi chỉ định chưa hủy,
        // không phụ thuộc status của danh sách có thể chưa đồng bộ.
        const checks = await Promise.all(data.map(async item => {
            const status = clsGiaTri(item, "trangThai", "TrangThai");
            const id = clsGiaTri(item, "maChiDinh", "MaChiDinh");

            if (status === "DaHuy" || !id) {
                return { item, hasResult: false, ketQua: null };
            }

            try {
                const result = await clsApi(
                    `${CLS_API_BASE}/${clsMaLichKham}/chi-dinh/${id}/ket-qua`,
                    { headers: clsHeaders() }
                );

                const valid = result?.coKetQua === true &&
                    clsGiaTri(result, "trangThai", "TrangThai") === "DaHoanThanh";

                return { item, hasResult: valid, ketQua: valid ? result : null };
            } catch (error) {
                // Chưa có kết quả thường là trạng thái hợp lệ; tránh log lỗi liên tục khi polling.
                if (!silent) {
                    console.debug("Chỉ định chưa có kết quả:", id, error.message);
                }
                return { item, hasResult: false, ketQua: null };
            }
        }));

        const ready = checks.filter(check => check.hasResult).length;
        const pending = checks.filter(check => !check.hasResult && [
            "ChoThanhToan", "ChoThucHien"
        ].includes(clsGiaTri(check.item, "trangThai", "TrangThai"))).length;
        const processing = checks.filter(check => !check.hasResult &&
            clsGiaTri(check.item, "trangThai", "TrangThai") === "DangThucHien").length;

        clsEl("totalOrders").textContent = total;
        clsEl("pendingOrders").textContent = pending;
        clsEl("processingOrders").textContent = processing;
        clsEl("completedOrders").textContent = ready;
        clsCapNhatTongQuanCLS(total, ready, pending, processing, checks);

        empty.classList.toggle("hidden", total !== 0);

        // Render từ dữ liệu vừa kiểm tra.
        // silent vẫn render lại trạng thái, nhưng không bật loading.
        list.replaceChildren();

        const nhomXetNghiem = new Map();
        const dichVuKhac = [];

        checks.forEach(check => {
            const { item } = check;
            const loai = String(
                clsGiaTri(item, "loaiDichVu", "LoaiDichVu") ||
                clsGiaTri(item, "loaiChiDinh", "LoaiChiDinh") || ""
            ).trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

            if (loai !== "xet nghiem") {
                dichVuKhac.push(check);
                return;
            }

            const tenNhom = String(clsGiaTri(item, "nhomXetNghiem", "NhomXetNghiem") ||
                "XÉT NGHIỆM KHÁC").trim() || "XÉT NGHIỆM KHÁC";

            if (!nhomXetNghiem.has(tenNhom)) nhomXetNghiem.set(tenNhom, []);
            nhomXetNghiem.get(tenNhom).push(check);
        });

        const grid = document.createElement("div");
        grid.className = "cls-result-grid";

        for (const [tenNhom, items] of nhomXetNghiem) {
            const box = document.createElement("section");
            box.className = "cls-result-group";
            const soDaCo = items.filter(check => check.hasResult).length;

            const title = document.createElement("div");
            title.className = "cls-result-group-title";
            title.innerHTML = `
                <strong><i class="fa-solid fa-flask-vial"></i> ${clsEscape(tenNhom)}</strong>
                <span>${soDaCo}/${items.length}</span>
            `;
            box.appendChild(title);

            for (const check of items) {
                const { item, hasResult, ketQua } = check;
                const row = document.createElement("div");
                row.className = "cls-result-row";

                const ten = document.createElement("span");
                ten.className = "cls-result-name";
                ten.textContent = clsTenDichVu(item);

                const giaTri = document.createElement("strong");
                giaTri.className = hasResult ? "cls-result-value" : "cls-result-waiting";
                const noiDung = clsGiaTri(ketQua, "noiDungKetQua", "NoiDungKetQua");
                giaTri.textContent = hasResult ? String(noiDung ?? "—") : "Chờ kết quả";
                row.appendChild(ten);
                row.appendChild(giaTri);

                if (hasResult) {
                    const maChiDinh = clsGiaTri(item, "maChiDinh", "MaChiDinh");
                    row.classList.add("cls-result-clickable");
                    row.setAttribute("role", "button");
                    row.setAttribute("tabindex", "0");
                    row.title = "Bấm để xem chi tiết kết quả";
                    const moChiTiet = () => clsXemKetQua(maChiDinh, clsTenDichVu(item));
                    row.addEventListener("click", moChiTiet);
                    row.addEventListener("keydown", event => {
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            moChiTiet();
                        }
                    });
                }
                box.appendChild(row);
            }
            grid.appendChild(box);
        }

        if (nhomXetNghiem.size > 0) list.appendChild(grid);

        dichVuKhac.forEach(({ item, hasResult }) => {
            const id = clsGiaTri(item, "maChiDinh", "MaChiDinh");
            const status = clsGiaTri(item, "trangThai", "TrangThai");
            const statusClass = hasResult ? "completed" : status === "DangThucHien" ? "processing" : "";
            const statusName = hasResult ? "Đã có kết quả" :
                status === "DaHoanThanh" ? "Đang xác minh kết quả" : clsTenTrangThai(status);
            const box = document.createElement("div");
            box.className = "clinical-item";
            const roomName = clsGiaTri(item, "tenPhong", "TenPhong", "tenPhongChuyenTrach", "TenPhongChuyenTrach", "phong.tenPhong", "Phong.TenPhong", "tenPhongThucHien", "TenPhongThucHien");
            const roomId = clsGiaTri(item, "maPhong", "MaPhong");
            const room = roomName || (roomId ? `Phòng ${roomId}` : "");
            const date = clsGiaTri(item, "ngayChiDinh", "NgayChiDinh");
            const type = clsGiaTri(item, "loaiChiDinh", "LoaiChiDinh");

            box.innerHTML = `
                <div class="clinical-item-header">
                    <div>
                        <div class="clinical-item-title">${clsEscape(clsTenDichVu(item))}</div>
                        <div class="clinical-item-meta">
                            ${clsEscape(type || "")}${room ? ` • ${clsEscape(room)}` : ""}${date ? ` • ${clsEscape(clsNgay(date))}` : ""}
                        </div>
                    </div>
                    <span class="clinical-status ${statusClass}">${clsEscape(statusName)}</span>
                </div>
                <div class="clinical-item-actions">
                    <button type="button" class="clinical-result-button" ${hasResult ? "" : "disabled"}>
                        <i class="fa-solid fa-file-medical"></i>
                        ${hasResult ? "Xem kết quả" : "Chưa có kết quả"}
                    </button>
                </div>
            `;

            if (hasResult) {
                box.querySelector(".clinical-result-button").addEventListener("click", () =>
                    clsXemKetQua(id, clsTenDichVu(item))
                );
            }
            list.appendChild(box);
        });

        // Có thể kê đơn khi không còn chỉ định nào đang chờ hoặc thực hiện,
        // và các chỉ định đang hoạt động đều đã có kết quả.
        const conDangXuLy = checks.some(check => {
            const status = clsGiaTri(check.item, "trangThai", "TrangThai");
            return status !== "DaHuy" && !check.hasResult;
        });

        if (total === 0) {
            clsKhoaKeDon("Chưa có chỉ định cận lâm sàng.");
        } else if (conDangXuLy) {
            clsKhoaKeDon(`Đã có kết quả ${ready}/${total} chỉ định. Chưa đủ điều kiện kê đơn.`);
        } else {
            clsCoTheKeDon = true;
            const button = clsEl("btnGoPrescription");
            if (button) button.disabled = false;
            clsEl("prescriptionButtonIcon")?.classList.replace("fa-lock", "fa-prescription-bottle-medical");
            if (clsEl("prescriptionLockMessage")) {
                clsEl("prescriptionLockMessage").textContent = `Đã có kết quả ${ready}/${total} chỉ định. Có thể kê đơn.`;
            }
        }

    } catch (error) {
        if (!silent) {
            clsThongBao(error.message, true);
        }
        console.error("Lỗi tải danh sách CLS:", error);
    } finally {
        if (!silent) loading.classList.add("hidden");
    }
}

// Không polling/render lại toàn bộ trang liên tục.
// Dữ liệu được tải khi mở trang, bấm Làm mới hoặc quay lại màn hình.

/* =========================================
   MODAL XEM KẾT QUẢ
========================================= */

// Thu hồi các URL ảnh đã tải để tránh rò rỉ bộ nhớ
function clsDonDepAnhKetQua() {
    if (clsAnhKetQuaController) {
        clsAnhKetQuaController.abort();
        clsAnhKetQuaController = null;
    }

    clsAnhKetQuaUrls.forEach(url => {
        URL.revokeObjectURL(url);
    });

    clsAnhKetQuaUrls = [];

    document.getElementById("clsImageLightbox")?.remove();
}

function clsMoModal() {
    clsEl("resultOverlay").classList.remove("hidden");
    document.body.style.overflow = "hidden";
}

function clsDongModal() {
    clsDonDepAnhKetQua();

    clsEl("resultOverlay").classList.add("hidden");
    document.body.style.overflow = "";
}

function clsDongKetQua(content, title) {
    return `
        <section class="result-section">
            <h3>${clsEscape(title)}</h3>

            <div class="result-section-content">
                ${clsEscape(content || "---")}
            </div>
        </section>
    `;
}

function clsLinkFile(url) {
    if (!url) return "";

    try {
        const parsed = new URL(
            url,
            window.location.origin
        );

        if (!["http:", "https:"].includes(parsed.protocol)) {
            return "";
        }

        return `
            <div class="result-section">
                <h3>
                    <i class="fa-solid fa-paperclip"></i>
                    File đính kèm
                </h3>

                <a href="${clsEscape(parsed.href)}"
                   target="_blank"
                   rel="noopener noreferrer"
                   class="cls-result-file-link">

                    <i class="fa-solid fa-arrow-up-right-from-square"></i>
                    Mở file kết quả
                </a>
            </div>
        `;
    } catch {
        return "";
    }
}

/* =========================================
   TẢI ẢNH KẾT QUẢ TỪ BACKEND
========================================= */

async function clsTaiMotAnhKetQua(
    maChiDinh,
    maAnh,
    signal
) {
    const url =
        `${CLS_API_BASE}/${clsMaLichKham}` +
        `/chi-dinh/${maChiDinh}` +
        `/ket-qua/anh/${maAnh}`;

    const response = await fetch(url, {
        method: "GET",
        headers: clsHeaders(),
        signal
    });

    if (!response.ok) {
        throw new Error(
            `Không tải được ảnh (${response.status})`
        );
    }

    const blob = await response.blob();

    if (!blob.size) {
        throw new Error("Ảnh không có dữ liệu.");
    }

    const objectUrl = URL.createObjectURL(blob);

    clsAnhKetQuaUrls.push(objectUrl);

    return objectUrl;
}

/* =========================================
   PHÓNG TO ẢNH
========================================= */

function clsMoAnhPhongTo(src, tenAnh) {
    document.getElementById("clsImageLightbox")?.remove();

    const overlay = document.createElement("div");
    overlay.id = "clsImageLightbox";
    overlay.className = "cls-image-lightbox";

    overlay.innerHTML = `
        <div class="cls-image-lightbox-content">

            <button type="button"
                    class="cls-image-lightbox-close"
                    aria-label="Đóng ảnh">

                <i class="fa-solid fa-xmark"></i>
            </button>

            <img src="${clsEscape(src)}"
                 alt="${clsEscape(tenAnh)}">

            <div class="cls-image-lightbox-caption">
                ${clsEscape(tenAnh)}
            </div>

        </div>
    `;

    document.body.appendChild(overlay);

    overlay.addEventListener("click", event => {
        if (
            event.target === overlay ||
            event.target.closest(".cls-image-lightbox-close")
        ) {
            overlay.remove();
        }
    });

    const closeOnEscape = event => {
        if (event.key === "Escape") {
            overlay.remove();
            document.removeEventListener(
                "keydown",
                closeOnEscape
            );
        }
    };

    document.addEventListener(
        "keydown",
        closeOnEscape
    );
}

/* =========================================
   HIỂN THỊ DANH SÁCH ẢNH
========================================= */

async function clsRenderAnhKetQua(
    data,
    maChiDinh,
    signal
) {
    const danhSachAnh = clsGiaTri(
        data,
        "anhKetQua",
        "AnhKetQua"
    );

    if (
        !Array.isArray(danhSachAnh) ||
        danhSachAnh.length === 0
    ) {
        return "";
    }

    const ketQuaAnh = await Promise.all(
        danhSachAnh.map(async (anh, index) => {
            const maAnh = clsGiaTri(
                anh,
                "maAnh",
                "MaAnh"
            );

            const tenAnh = clsGiaTri(
                anh,
                "tenFile",
                "TenFile"
            ) || `Hình ảnh ${index + 1}`;

            if (!maAnh) {
                return {
                    tenAnh,
                    error: "Không tìm thấy mã ảnh."
                };
            }

            try {
                const src = await clsTaiMotAnhKetQua(
                    maChiDinh,
                    maAnh,
                    signal
                );

                return {
                    tenAnh,
                    src
                };

            } catch (error) {
                if (error.name === "AbortError") {
                    throw error;
                }

                console.error(
                    "Lỗi tải ảnh kết quả:",
                    maAnh,
                    error
                );

                return {
                    tenAnh,
                    error: error.message
                };
            }
        })
    );

    if (signal.aborted) {
        throw new DOMException(
            "Đã hủy tải ảnh.",
            "AbortError"
        );
    }

    return `
        <section class="result-section cls-result-images">

            <h3>
                <i class="fa-solid fa-images"></i>
                Hình ảnh kết quả
                <span class="cls-image-count">
                    ${danhSachAnh.length} ảnh
                </span>
            </h3>

            <div class="cls-result-image-grid">

                ${ketQuaAnh.map((anh, index) => `
                    <div class="cls-result-image-card">

                        ${
                            anh.src
                                ? `
                                    <button type="button"
                                            class="cls-result-image-button"
                                            data-image-src="${clsEscape(anh.src)}"
                                            data-image-name="${clsEscape(anh.tenAnh)}">

                                        <img src="${clsEscape(anh.src)}"
                                             alt="${clsEscape(anh.tenAnh)}"
                                             loading="lazy">

                                        <span class="cls-result-image-zoom">
                                            <i class="fa-solid fa-magnifying-glass-plus"></i>
                                            Xem ảnh
                                        </span>
                                    </button>
                                `
                                : `
                                    <div class="cls-result-image-error">
                                        <i class="fa-solid fa-image"></i>
                                        <span>${clsEscape(anh.error)}</span>
                                    </div>
                                `
                        }



                    </div>
                `).join("")}

            </div>

            <p class="cls-result-image-note">
                <i class="fa-solid fa-circle-info"></i>
                Nhấn vào hình ảnh để xem kích thước lớn hơn.
            </p>

        </section>
    `;
}

/* =========================================
   XEM CHI TIẾT KẾT QUẢ
========================================= */

async function clsXemKetQua(
    maChiDinh,
    tenDichVu
) {
    // Dọn ảnh của lần xem trước
    clsDonDepAnhKetQua();

    clsMoModal();

    clsEl("resultServiceName").textContent =
        tenDichVu;

    clsEl("resultLoading")
        .classList.remove("hidden");

    clsEl("resultDetail").innerHTML = "";

    const controller = new AbortController();

    clsAnhKetQuaController = controller;

    try {
        const data = await clsApi(
            `${CLS_API_BASE}/${clsMaLichKham}/chi-dinh/${maChiDinh}/ket-qua`,
            {
                headers: clsHeaders(),
                signal: controller.signal
            }
        );

        if (
            data?.coKetQua !== true ||
            clsGiaTri(
                data,
                "trangThai",
                "TrangThai"
            ) !== "DaHoanThanh"
        ) {
            throw new Error(
                "Kết quả chưa được hoàn tất hoặc chưa sẵn sàng."
            );
        }


        // Lấy danh sách chỉ số xét nghiệm
        const details = clsGiaTri(
            data,
            "chiTiet",
            "ChiTiet"
        );

        const images = clsGiaTri(
            data,
            "anhKetQua",
            "AnhKetQua"
        );

        const rows = Array.isArray(details)
            ? details.filter(item => item != null)
            : [];

        const hasImages = Array.isArray(images)
            && images.length > 0;

        console.log("===== KIỂM TRA KẾT QUẢ CLS =====");
        console.log("API data:", data);
        console.log("chiTiet:", details);
        console.log("anhKetQua:", images);
        console.log("Số chỉ số:", rows.length);
        console.log("Có hình ảnh:", hasImages);
        // Nếu kết quả có hình ảnh thì không hiển thị bảng chỉ số.
        // Nếu không có hình ảnh thì hiển thị bảng khi có chỉ số.
        const table = (!hasImages && rows.length > 0)
            ? `
                <section class="result-section">
                    <h3>
                        <i class="fa-solid fa-chart-simple"></i>
                        Chi tiết chỉ số xét nghiệm
                    </h3>

                    <div class="result-table-wrapper">
                        <table class="result-table">
                            <thead>
                                <tr>
                                    <th>Chỉ số</th>
                                    <th>Giá trị</th>
                                    <th>Đơn vị</th>
                                    <th>Tham chiếu</th>
                                    <th>Trạng thái</th>
                                </tr>
                            </thead>

                            <tbody>
                                ${rows.map(row => `
                                    <tr>
                                        <td>${clsEscape(clsGiaTri(row, "tenChiSo", "TenChiSo") ?? "---")}</td>
                                        <td>${clsEscape(clsGiaTri(row, "giaTri", "GiaTri") ?? "---")}</td>
                                        <td>${clsEscape(clsGiaTri(row, "donVi", "DonVi") ?? "---")}</td>
                                        <td>${clsEscape(clsGiaTri(row, "giaTriThamChieu", "GiaTriThamChieu") ?? "---")}</td>
                                        <td>${clsEscape(clsGiaTri(row, "trangThai", "TrangThai") ?? "---")}</td>
                                    </tr>
                                `).join("")}
                            </tbody>
                        </table>
                    </div>
                </section>
            `
            : "";

        console.log("HTML bảng chỉ số:", table);

        // Tải ảnh kết quả từ API
        const htmlAnh = await clsRenderAnhKetQua(
            data,
            maChiDinh,
            controller.signal
        );

        if (controller.signal.aborted) return;

        clsEl("resultDetail").innerHTML = `
            <div class="result-info-grid">

                <div class="result-info-item">
                    <span>Mã kết quả</span>

                    <strong>
                        ${clsEscape(
                            clsGiaTri(
                                data,
                                "maKetQua",
                                "MaKetQua"
                            ) ?? "---"
                        )}
                    </strong>
                </div>

                <div class="result-info-item">
                    <span>Ngày có kết quả</span>

                    <strong>
                        ${clsEscape(
                            clsNgay(
                                clsGiaTri(
                                    data,
                                    "ngayCoKetQua",
                                    "NgayCoKetQua"
                                )
                            )
                        )}
                    </strong>
                </div>

            </div>

            ${clsDongKetQua(
                clsGiaTri(
                    data,
                    "noiDungKetQua",
                    "NoiDungKetQua"
                ),
                "Nội dung kết quả"
            )}

            ${clsDongKetQua(
                clsGiaTri(
                    data,
                    "ketLuan",
                    "KetLuan"
                ),
                "Kết luận cận lâm sàng"
            )}

            ${table}

            ${htmlAnh}

            ${clsLinkFile(
                clsGiaTri(
                    data,
                    "fileURL",
                    "FileURL"
                )
            )}
        `;

        // Gắn sự kiện phóng to ảnh
        clsEl("resultDetail")
            .querySelectorAll(".cls-result-image-button")
            .forEach(button => {
                button.addEventListener("click", () => {
                    clsMoAnhPhongTo(
                        button.dataset.imageSrc,
                        button.dataset.imageName
                    );
                });
            });

    } catch (error) {
        if (error.name === "AbortError") return;

        console.error(
            "Lỗi xem kết quả CLS:",
            error
        );

        clsEl("resultDetail").textContent =
            error.message;

        clsThongBao(error.message, true);

    } finally {
        if (clsAnhKetQuaController === controller) {
            clsAnhKetQuaController = null;
        }

        if (!controller.signal.aborted) {
            clsEl("resultLoading")
                .classList.add("hidden");
        }
    }
}



/* =========================================
   GẮN SỰ KIỆN
========================================= */

function clsGanSuKien() {

    // Quay lại trang khám bệnh
    clsEl("btnBackToExam").addEventListener(
        "click",
        () => window.location.assign(clsTrangKham())
    );

    clsEl("btnReturnExam").addEventListener(
        "click",
        () => window.location.assign(clsTrangKham())
    );

    // Làm mới danh sách chỉ định
    clsEl("btnRefreshClinical").addEventListener(
        "click",
        clsTaiChiDinh
    );

    // Tạo chỉ định mới
    clsEl("btnOpenOrderForm").addEventListener(
        "click",
        () => {

            if (!clsMaLichKham) {
                clsThongBao(
                    "Không tìm thấy mã lịch khám.",
                    true
                );
                return;
            }

            if (clsHoSoHoanTat) {
                clsThongBao(
                    "Hồ sơ đã hoàn tất, không thể tạo chỉ định.",
                    true
                );
                return;
            }

            window.location.href =
                `/auth/bac-si/tao-chi-dinh?maLichKham=${clsMaLichKham}`;
        }
    );

    // Hủy form
    clsEl("btnCancelOrder").addEventListener(
        "click",
        clsDongForm
    );

    // Xác nhận tạo chỉ định
    clsEl("btnCreateOrder").addEventListener(
        "click",
        clsTaoChiDinh
    );

    // Chọn dịch vụ
    clsEl("serviceSelect").addEventListener(
        "change",
        clsChonDichVu
    );

    // Chuyển sang kê đơn
    clsEl("btnGoPrescription").addEventListener(
        "click",
        async () => {

            if (!clsCoTheKeDon) return;

            await clsTaiChiDinh();

            if (!clsCoTheKeDon) return;

            window.location.assign(
                `${clsTrangKham()}?tab=prescription`
            );
        }
    );

    // Đóng modal kết quả
    clsEl("btnCloseResult").addEventListener(
        "click",
        clsDongModal
    );

    clsEl("btnCloseResultFooter").addEventListener(
        "click",
        clsDongModal
    );

    // Nhấn bên ngoài modal để đóng
    clsEl("resultOverlay").addEventListener(
        "click",
        event => {
            if (event.target === clsEl("resultOverlay")) {
                clsDongModal();
            }
        }
    );

    // Nhấn ESC để đóng modal
    document.addEventListener(
        "keydown",
        event => {
            if (event.key === "Escape") {
                clsDongModal();
            }
        }
    );
}

/* =========================================
   KHỞI TẠO TRANG
========================================= */

async function clsKhoiTao() {
    clsMaLichKham = clsLayMaLichKham();

    if (!clsMaLichKham) {
        clsThongBao(
            "Đường dẫn không có mã lịch khám hợp lệ.",
            true
        );
        return;
    }

    clsGanSuKien();
    clsDaKhoiTao = true;

    clsEl("pageLoading")
        .classList.remove("hidden");

    try {
        await clsTaiHoSo();
        await clsTaiDichVu();
        await clsTaiChiDinh();

    } catch (error) {
        clsKhoaKeDon(
            "Không thể kiểm tra dữ liệu lượt khám."
        );

        clsThongBao(error.message, true);

    } finally {
        clsEl("pageLoading")
            .classList.add("hidden");
    }
}

document.addEventListener(
    "DOMContentLoaded",
    clsKhoiTao
);



// Khi bác sĩ quay lại tab/trang đang được giữ trong bộ nhớ trình duyệt,
// tải lại dữ liệu CLS một lần (không polling và không reload toàn trang).
let clsDaKhoiTao = false;

window.addEventListener("pageshow", event => {
    if (event.persisted && clsDaKhoiTao && clsMaLichKham) {
        clsTaiChiDinh();
    }
});

document.addEventListener("visibilitychange", () => {
    if (!document.hidden && clsDaKhoiTao && clsMaLichKham) {
        clsTaiChiDinh();
    }
});
