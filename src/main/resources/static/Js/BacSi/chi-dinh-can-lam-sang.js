
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

    clsDanhSachDichVu = Array.isArray(data)
        ? data
        : [];

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

function clsChonDichVu() {
    const id = Number(
        clsEl("serviceSelect").value
    );

    const dichVu = clsDanhSachDichVu.find(
        item =>
            Number(
                clsGiaTri(
                    item, "maDichVu", "MaDichVu"
                )
            ) === id
    );

    clsEl("orderType").value =
        clsGiaTri(
            dichVu, "loaiDichVu", "LoaiDichVu"
        ) || "";
}

/* =========================================
   FORM TẠO CHỈ ĐỊNH
========================================= */

function clsDongForm() {
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

async function clsTaiChiDinh() {
    const loading = clsEl("clinicalLoading");
    const list = clsEl("clinicalList");
    const empty = clsEl("clinicalEmpty");

    loading.classList.remove("hidden");
    empty.classList.add("hidden");
    list.replaceChildren();

    clsKhoaKeDon(
        "Đang kiểm tra kết quả các chỉ định..."
    );

    try {
        const data = await clsApi(
            `${CLS_API_BASE}/${clsMaLichKham}/chi-dinh`,
            {
                headers: clsHeaders()
            }
        );

        if (!Array.isArray(data)) {
            throw new Error(
                "Dữ liệu danh sách chỉ định không hợp lệ."
            );
        }

        clsDanhSachChiDinh = data;

        const total = data.length;

        let pending = 0;
        let processing = 0;
        let ready = 0;

        const checks = await Promise.all(
            data.map(async item => {
                const status = clsGiaTri(
                    item, "trangThai", "TrangThai"
                );

                if (status === "ChoThucHien") {
                    pending++;
                } else if (status === "DangThucHien") {
                    processing++;
                }

                const id = clsGiaTri(
                    item, "maChiDinh", "MaChiDinh"
                );

                if (
                    status !== "DaHoanThanh"
                    || !id
                ) {
                    return {
                        item,
                        hasResult: false
                    };
                }

                try {
                    const result = await clsApi(
                        `${CLS_API_BASE}/${clsMaLichKham}/chi-dinh/${id}/ket-qua`,
                        {
                            headers: clsHeaders()
                        }
                    );

                    const valid =
                        result?.coKetQua === true
                        && clsGiaTri(
                            result,
                            "trangThai",
                            "TrangThai"
                        ) === "DaHoanThanh";

                    if (valid) ready++;

                    return {
                        item,
                        hasResult: valid
                    };

                } catch (error) {
                    console.error(
                        "Không thể kiểm tra kết quả:",
                        id,
                        error
                    );

                    return {
                        item,
                        hasResult: false
                    };
                }
            })
        );

        clsEl("totalOrders").textContent =
            total;

        clsEl("pendingOrders").textContent =
            pending;

        clsEl("processingOrders").textContent =
            processing;

        clsEl("completedOrders").textContent =
            ready;

        empty.classList.toggle(
            "hidden",
            total !== 0
        );

        checks.forEach(({ item, hasResult }) => {
            const id = clsGiaTri(
                item, "maChiDinh", "MaChiDinh"
            );

            const status = clsGiaTri(
                item, "trangThai", "TrangThai"
            );

            const box = document.createElement("div");
            box.className = "clinical-item";

            const statusClass = hasResult
                ? "completed"
                : status === "DangThucHien"
                    ? "processing"
                    : "";

            const statusName = hasResult
                ? "Đã có kết quả"
                : status === "DaHoanThanh"
                    ? "Đang xác minh kết quả"
                    : clsTenTrangThai(status);

            const room = clsGiaTri(
                item, "maPhong", "MaPhong"
            );

            const date = clsGiaTri(
                item, "ngayChiDinh", "NgayChiDinh"
            );

            const type = clsGiaTri(
                item, "loaiChiDinh", "LoaiChiDinh"
            );

            box.innerHTML = `
                <div class="clinical-item-header">
                    <div>
                        <div class="clinical-item-title">
                            ${clsEscape(clsTenDichVu(item))}
                        </div>

                        <div class="clinical-item-meta">
                            ${clsEscape(type || "")}
                            ${room ? ` • Phòng ${clsEscape(room)}` : ""}
                            ${date ? ` • ${clsEscape(clsNgay(date))}` : ""}
                        </div>
                    </div>

                    <span class="clinical-status ${statusClass}">
                        ${clsEscape(statusName)}
                    </span>
                </div>

                <div class="clinical-item-actions">
                    <button
                        type="button"
                        class="clinical-result-button"
                        ${hasResult ? "" : "disabled"}
                    >
                        <i class="fa-solid fa-file-medical"></i>
                        ${hasResult ? "Xem kết quả" : "Chưa có kết quả"}
                    </button>
                </div>
            `;

            const button = box.querySelector(
                ".clinical-result-button"
            );

            if (hasResult) {
                button.addEventListener(
                    "click",
                    () => clsXemKetQua(
                        id,
                        clsTenDichVu(item)
                    )
                );
            }

            list.appendChild(box);
        });

        const allReady =
            total > 0
            && ready === total
            && !clsHoSoHoanTat;

        const badge = clsEl(
            "clinicalSummaryBadge"
        );

        badge.className =
            `clinical-summary-badge ${
                allReady ? "completed" : "pending"
            }`;

        if (total === 0) {
            badge.textContent = "Chưa chỉ định";

            clsEl("clinicalSummaryText").textContent =
                "Chưa có chỉ định cận lâm sàng trong lượt khám này.";

            clsKhoaKeDon(
                "Không có chỉ định CLS. Quay lại trang khám để kê đơn nếu cần."
            );

        } else if (allReady) {
            badge.textContent = "Đã có đủ kết quả";

            clsEl("clinicalSummaryText").textContent =
                `Đã có kết quả của ${ready}/${total} chỉ định.`;

            clsCoTheKeDon = true;

            clsEl("btnGoPrescription").disabled =
                false;

            clsEl("prescriptionButtonIcon")
                .classList.replace(
                    "fa-lock",
                    "fa-prescription-bottle-medical"
                );

            clsEl("prescriptionLockMessage").textContent =
                "Đã đủ kết quả cận lâm sàng. Có thể trở về kê đơn.";

        } else {
            badge.textContent = "Đang chờ kết quả";

            clsEl("clinicalSummaryText").textContent =
                `Đã có kết quả ${ready}/${total} chỉ định. Chưa đủ điều kiện kê đơn.`;

            clsKhoaKeDon(
                "Còn chỉ định chưa hoàn thành hoặc chưa có kết quả hợp lệ."
            );
        }

    } catch (error) {
        clsDanhSachChiDinh = [];

        empty.classList.remove("hidden");

        empty.querySelector("p").textContent =
            error.message;

        clsKhoaKeDon(
            "Không thể xác minh trạng thái cận lâm sàng."
        );

        clsThongBao(error.message, true);

    } finally {
        loading.classList.add("hidden");
    }
}

/* =========================================
   MODAL XEM KẾT QUẢ
========================================= */

function clsMoModal() {
    clsEl("resultOverlay")
        .classList.remove("hidden");

    document.body.style.overflow = "hidden";
}

function clsDongModal() {
    clsEl("resultOverlay")
        .classList.add("hidden");

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

        if (
            !["http:", "https:"].includes(
                parsed.protocol
            )
        ) {
            return "";
        }

        return `
            <div class="result-section">
                <h3>File đính kèm</h3>

                <a href="${clsEscape(parsed.href)}"
                   target="_blank"
                   rel="noopener noreferrer">
                    Mở file kết quả
                </a>
            </div>
        `;

    } catch {
        return "";
    }
}

/* =========================================
   XEM CHI TIẾT KẾT QUẢ
========================================= */

async function clsXemKetQua(
    maChiDinh,
    tenDichVu
) {
    clsMoModal();

    clsEl("resultServiceName").textContent =
        tenDichVu;

    clsEl("resultLoading")
        .classList.remove("hidden");

    clsEl("resultDetail").innerHTML = "";

    try {
        const data = await clsApi(
            `${CLS_API_BASE}/${clsMaLichKham}/chi-dinh/${maChiDinh}/ket-qua`,
            {
                headers: clsHeaders()
            }
        );

        if (
            data?.coKetQua !== true
            || clsGiaTri(
                data,
                "trangThai",
                "TrangThai"
            ) !== "DaHoanThanh"
        ) {
            throw new Error(
                "Kết quả chưa được hoàn tất hoặc chưa sẵn sàng."
            );
        }

        const details = clsGiaTri(
            data, "chiTiet", "ChiTiet"
        );

        const rows = Array.isArray(details)
            ? details
            : [];

        const table = rows.length
            ? `
                <section class="result-section">
                    <h3>Chỉ số xét nghiệm</h3>

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
                                        <td>${clsEscape(clsGiaTri(row, "tenChiSo", "TenChiSo"))}</td>
                                        <td>${clsEscape(clsGiaTri(row, "giaTri", "GiaTri"))}</td>
                                        <td>${clsEscape(clsGiaTri(row, "donVi", "DonVi"))}</td>
                                        <td>${clsEscape(clsGiaTri(row, "giaTriThamChieu", "GiaTriThamChieu"))}</td>
                                        <td>${clsEscape(clsGiaTri(row, "trangThai", "TrangThai"))}</td>
                                    </tr>
                                `).join("")}
                            </tbody>
                        </table>
                    </div>
                </section>
            `
            : "";

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

            ${clsLinkFile(
                clsGiaTri(
                    data,
                    "fileURL",
                    "FileURL"
                )
            )}
        `;

    } catch (error) {
        clsEl("resultDetail").textContent =
            error.message;

        clsThongBao(error.message, true);

    } finally {
        clsEl("resultLoading")
            .classList.add("hidden");
    }
}

/* =========================================
   GẮN SỰ KIỆN
========================================= */

function clsGanSuKien() {
    clsEl("btnBackToExam").addEventListener(
        "click",
        () => window.location.assign(clsTrangKham())
    );

    clsEl("btnReturnExam").addEventListener(
        "click",
        () => window.location.assign(clsTrangKham())
    );

    clsEl("btnRefreshClinical").addEventListener(
        "click",
        clsTaiChiDinh
    );

    clsEl("btnOpenOrderForm").addEventListener(
        "click",
        () => {
            clsEl("clinicalOrderForm")
                .classList.remove("hidden");
        }
    );

    clsEl("btnCancelOrder").addEventListener(
        "click",
        clsDongForm
    );

    clsEl("btnCreateOrder").addEventListener(
        "click",
        clsTaoChiDinh
    );

    clsEl("serviceSelect").addEventListener(
        "change",
        clsChonDichVu
    );

    clsEl("btnGoPrescription").addEventListener(
        "click",
        async () => {
            if (!clsCoTheKeDon) return;

            // Kiểm tra lại trạng thái mới nhất
            // trước khi rời trang.
            await clsTaiChiDinh();

            if (!clsCoTheKeDon) return;

            window.location.assign(
                `${clsTrangKham()}?tab=prescription`
            );
        }
    );

    clsEl("btnCloseResult").addEventListener(
        "click",
        clsDongModal
    );

    clsEl("btnCloseResultFooter").addEventListener(
        "click",
        clsDongModal
    );

    clsEl("resultOverlay").addEventListener(
        "click",
        event => {
            if (
                event.target
                === clsEl("resultOverlay")
            ) {
                clsDongModal();
            }
        }
    );

    document.addEventListener(
        "keydown",
        event => {
            if (event.key === "Escape") {
                clsDongModal();
            }
        }
    );

    clsEl("btnLogout").addEventListener(
        "click",
        () => {
            [
                "token",
                "Token",
                "HoTen",
                "VaiTro",
                "MaNguoiDung",
                "TenDangNhap",
                "Email",
                "AnhDaiDien"
            ].forEach(key => {
                localStorage.removeItem(key);
                sessionStorage.removeItem(key);
            });

            window.location.assign("/auth/login");
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

    const name =
        localStorage.getItem("HoTen")
        || sessionStorage.getItem("HoTen")
        || "Bác sĩ";

    clsEl("doctorName").textContent = name;

    const words = name.trim().split(/\s+/);

    clsEl("doctorAvatar").textContent =
        words.length > 1
            ? (
                words[words.length - 2][0]
                + words[words.length - 1][0]
            ).toUpperCase()
            : name.substring(0, 2).toUpperCase();

    clsGanSuKien();

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
