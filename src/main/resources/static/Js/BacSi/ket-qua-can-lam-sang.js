
const API_BASE = "/api/bac-si/kham-benh";

let danhSachKetQua = [];
let danhSachNhomDangHienThi = [];
let boLocHienTai = "all";
let tuKhoaTimKiem = "";
let dangXemChiTietTuNhom = false;

function layHeadersAuth() {
    const token =
        localStorage.getItem("Token") ||
        sessionStorage.getItem("Token");

    return token
        ? { Authorization: `Bearer ${token}` }
        : {};
}

// =========================================
// KHỞI TẠO
// =========================================

document.addEventListener("DOMContentLoaded", () => {
    khoiTaoBoLoc();
    khoiTaoTimKiem();
    khoiTaoModal();
    taiDanhSachKetQua();
});

// =========================================
// BỘ LỌC
// =========================================

function khoiTaoBoLoc() {
    const buttons = document.querySelectorAll(".filter-btn");

    buttons.forEach(button => {
        button.addEventListener("click", () => {
            buttons.forEach(item => {
                item.classList.remove("active");
            });

            button.classList.add("active");
            boLocHienTai = button.dataset.filter;

            hienThiDanhSach();
        });
    });
}

// =========================================
// TÌM KIẾM
// =========================================

function khoiTaoTimKiem() {
    const searchInput = document.getElementById("searchInput");
    const headerSearch = document.getElementById("headerSearch");

    function capNhatTimKiem(value, otherInput) {
        tuKhoaTimKiem = chuanHoa(value);

        if (otherInput) {
            otherInput.value = value;
        }

        hienThiDanhSach();
    }

    searchInput?.addEventListener("input", () => {
        capNhatTimKiem(searchInput.value, headerSearch);
    });

    headerSearch?.addEventListener("input", () => {
        capNhatTimKiem(headerSearch.value, searchInput);
    });
}

// =========================================
// KHỞI TẠO MODAL
// =========================================

function khoiTaoModal() {
    const groupModal = document.getElementById("groupModal");
    const detailModal = document.getElementById("detailModal");

    document.getElementById("closeGroupModal")
        ?.addEventListener("click", dongGroupModal);

    document.getElementById("closeModal")
        ?.addEventListener("click", dongModal);

    groupModal?.addEventListener("click", event => {
        if (event.target === groupModal) {
            dongGroupModal();
        }
    });

    detailModal?.addEventListener("click", event => {
        if (event.target === detailModal) {
            dongModal();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;

        if (!detailModal?.classList.contains("hidden")) {
            dongModal();
        } else if (!groupModal?.classList.contains("hidden")) {
            dongGroupModal();
        }
    });
}

// =========================================
// LOAD DANH SÁCH TỪ API
// =========================================

async function taiDanhSachKetQua() {
    const tbody = document.getElementById("resultTableBody");

    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="empty">
                Đang tải dữ liệu...
            </td>
        </tr>
    `;

    try {
        const response = await fetch(
            `${API_BASE}/ket-qua-can-lam-sang`,
            {
                headers: layHeadersAuth()
            }
        );

        if (!response.ok) {
            const error = await docJson(response);

            throw new Error(
                error?.message ||
                "Không thể tải kết quả cận lâm sàng."
            );
        }

        const data = await response.json();

        danhSachKetQua = Array.isArray(data) ? data : [];

        capNhatThongKe();
        hienThiDanhSach();

    } catch (error) {
        console.error(error);

        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty">
                    ${escapeHtml(error.message)}
                </td>
            </tr>
        `;
    }
}

// =========================================
// KIỂM TRA CÓ KẾT QUẢ
// =========================================

function coKetQua(item) {
    if (typeof item.coKetQua === "boolean") {
        return item.coKetQua;
    }

    return item.maKetQua != null;
}

// =========================================
// THỐNG KÊ THEO TỪNG XÉT NGHIỆM
// =========================================

function capNhatThongKe() {
    const tong = danhSachKetQua.length;

    const daCoKetQua = danhSachKetQua.filter(
        item => coKetQua(item)
    ).length;

    const dangCho = tong - daCoKetQua;

    document.getElementById("totalCount").textContent = tong;
    document.getElementById("resultCount").textContent = daCoKetQua;
    document.getElementById("waitingCount").textContent = dangCho;
}

// =========================================
// GOM NHÓM THEO PHIẾU CHỈ ĐỊNH
// =========================================

function gomNhomKetQua(danhSach) {
    const nhomMap = new Map();

    danhSach.forEach((item, index) => {
        const maLich = item.maLichKham;
        const maPhieu = item.maPhieuChiDinh;

        const coMaPhieu =
            maPhieu !== null &&
            maPhieu !== undefined &&
            String(maPhieu).trim() !== "";

        // Không có mã phiếu thì không gom tùy tiện.
        // Mỗi chỉ định sẽ thành một nhóm riêng.
        const khoa = coMaPhieu
            ? `lich:${maLich}|phieu:${maPhieu}`
            : `lich:${maLich}|chi-dinh:${item.maChiDinh ?? index}`;

        if (!nhomMap.has(khoa)) {
            nhomMap.set(khoa, {
                maLichKham: maLich,
                maPhieuChiDinh: maPhieu,
                hoTen: item.hoTen || "—",
                ngayChiDinh: item.ngayChiDinh,
                dichVu: []
            });
        }

        const nhom = nhomMap.get(khoa);
        nhom.dichVu.push(item);

        // Lấy ngày chỉ định sớm nhất trong phiếu.
        if (
            item.ngayChiDinh &&
            (
                !nhom.ngayChiDinh ||
                String(item.ngayChiDinh) <
                    String(nhom.ngayChiDinh)
            )
        ) {
            nhom.ngayChiDinh = item.ngayChiDinh;
        }
    });

    return Array.from(nhomMap.values()).sort(
        (a, b) => String(b.ngayChiDinh || "")
            .localeCompare(String(a.ngayChiDinh || ""))
    );
}

// =========================================
// HIỂN THỊ DANH SÁCH NHÓM
// =========================================

function hienThiDanhSach() {
    const tbody = document.getElementById("resultTableBody");

    if (!tbody) return;

    const tatCaNhom = gomNhomKetQua(danhSachKetQua);

    danhSachNhomDangHienThi = tatCaNhom.filter(nhom => {
        const soCoKetQua = nhom.dichVu.filter(coKetQua).length;
        const tong = nhom.dichVu.length;

        const coDaCo = soCoKetQua > 0;
        const coDangCho = soCoKetQua < tong;

        // Phiếu có ít nhất một xét nghiệm có kết quả.
        if (boLocHienTai === "done" && !coDaCo) {
            return false;
        }

        // Phiếu còn ít nhất một xét nghiệm đang chờ.
        if (boLocHienTai === "waiting" && !coDangCho) {
            return false;
        }

        if (!tuKhoaTimKiem) return true;

        const tenBenhNhan = chuanHoa(nhom.hoTen);
        const maPhieu = chuanHoa(nhom.maPhieuChiDinh);

        const khopDichVu = nhom.dichVu.some(item => {
            return chuanHoa(item.tenDichVu)
                .includes(tuKhoaTimKiem);
        });

        return (
            tenBenhNhan.includes(tuKhoaTimKiem) ||
            maPhieu.includes(tuKhoaTimKiem) ||
            khopDichVu
        );
    });

    if (danhSachNhomDangHienThi.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty">
                    Không có dữ liệu phù hợp.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = danhSachNhomDangHienThi.map(
        (nhom, index) => {

            const tong = nhom.dichVu.length;
            const soCo = nhom.dichVu.filter(coKetQua).length;

            const daDayDu = soCo === tong;

            const nhan = daDayDu
                ? "Đã đủ kết quả"
                : soCo > 0
                    ? "Có kết quả một phần"
                    : "Chờ kết quả";

            const maPhieu =
                nhom.maPhieuChiDinh != null &&
                String(nhom.maPhieuChiDinh).trim() !== ""
                    ? `#${nhom.maPhieuChiDinh}`
                    : `Chỉ định #${nhom.dichVu[0]?.maChiDinh ?? "—"}`;

            const tenDichVu = nhom.dichVu.map(
                item => item.tenDichVu || "Dịch vụ"
            ).join(", ");

            return `
                <tr>
                    <td>${index + 1}</td>

                    <td>
                        <strong>${escapeHtml(nhom.hoTen)}</strong>
                    </td>

                    <td>
                        ${escapeHtml(maPhieu)}
                    </td>

                    <td>
                        <strong>${tong} xét nghiệm</strong>

                        <div style="
                            font-size:12px;
                            color:#64748b;
                            max-width:280px;
                            white-space:normal;
                            margin-top:5px;
                        ">
                            ${escapeHtml(tenDichVu)}
                        </div>
                    </td>

                    <td>
                        ${escapeHtml(
                            dinhDangNgay(nhom.ngayChiDinh)
                        )}
                    </td>

                    <td>
                        <span class="status ${
                            daDayDu ? "done" : "waiting"
                        }">
                            ${soCo}/${tong} · ${nhan}
                        </span>
                    </td>

                    <td>
                        <button
                            type="button"
                            class="view-btn group-view-btn"
                            data-index="${index}">
                            Xem
                        </button>
                    </td>
                </tr>
            `;
        }
    ).join("");

    ganSuKienNutXemNhom();
}

// =========================================
// NÚT XEM NHÓM
// =========================================

function ganSuKienNutXemNhom() {
    const buttons = document.querySelectorAll(".group-view-btn");

    buttons.forEach(button => {
        button.addEventListener("click", () => {
            const index = Number(button.dataset.index);
            const nhom = danhSachNhomDangHienThi[index];

            if (!nhom) return;

            moGroupModal(nhom);
        });
    });
}

// =========================================
// MỞ POPUP DANH SÁCH XÉT NGHIỆM
// =========================================

function moGroupModal(nhom) {
    const modal = document.getElementById("groupModal");
    const tbody = document.getElementById("groupResultBody");
    const patientInfo = document.getElementById("groupPatientInfo");

    if (!modal || !tbody || !patientInfo) {
        console.error("Thiếu HTML của popup groupModal.");
        return;
    }

    dangXemChiTietTuNhom = false;

    const maPhieu =
        nhom.maPhieuChiDinh != null &&
        String(nhom.maPhieuChiDinh).trim() !== ""
            ? `Phiếu #${nhom.maPhieuChiDinh}`
            : "Chỉ định riêng";

    patientInfo.textContent =
        `${nhom.hoTen} · ${maPhieu} · ${nhom.dichVu.length} xét nghiệm`;

    tbody.innerHTML = nhom.dichVu.map((item, index) => {
        const daCo = coKetQua(item);

        return `
            <tr>
                <td>${index + 1}</td>

                <td>
                    ${escapeHtml(item.tenDichVu || "—")}
                </td>

                <td>
                    ${
                        daCo
                            ? escapeHtml(
                                dinhDangNgay(item.ngayCoKetQua)
                            )
                            : "—"
                    }
                </td>

                <td>
                    <span class="status ${
                        daCo ? "done" : "waiting"
                    }">
                        ${
                            daCo
                                ? "Có kết quả"
                                : "Chờ kết quả"
                        }
                    </span>
                </td>

                <td>
                    <button
                        type="button"
                        class="view-btn group-detail-btn"
                        data-index="${index}"
                        ${daCo ? "" : "disabled"}>
                        Xem kết quả
                    </button>
                </td>
            </tr>
        `;
    }).join("");

    // Gắn sự kiện xem từng xét nghiệm.
    tbody.querySelectorAll(
        ".group-detail-btn:not(:disabled)"
    ).forEach(button => {
        button.addEventListener("click", () => {
            const index = Number(button.dataset.index);
            const item = nhom.dichVu[index];

            if (!item) return;

            xemChiTietKetQua(
                item.maLichKham,
                item.maChiDinh,
                true
            );
        });
    });

    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
}

// =========================================
// ĐÓNG POPUP DANH SÁCH
// =========================================

function dongGroupModal() {
    document.getElementById("groupModal")
        ?.classList.add("hidden");

    dangXemChiTietTuNhom = false;
    document.body.style.overflow = "";
}

// =========================================
// XEM CHI TIẾT KẾT QUẢ XÉT NGHIỆM
// =========================================

async function xemChiTietKetQua(
    maLichKham,
    maChiDinh,
    tuNhom = false
) {
    if (!maLichKham || !maChiDinh) {
        alert("Không xác định được lịch khám hoặc chỉ định.");
        return;
    }

    try {
        const url =
            `${API_BASE}/${maLichKham}/chi-dinh/${maChiDinh}/ket-qua`;

        const response = await fetch(url, {
            headers: layHeadersAuth()
        });

        const data = await docJson(response);

        if (!response.ok) {
            throw new Error(
                data?.message ||
                "Không thể tải chi tiết kết quả."
            );
        }

        if (!data?.coKetQua) {
            alert(
                data?.message ||
                "Chỉ định chưa có kết quả."
            );
            return;
        }

        // Tìm thông tin dịch vụ tương ứng.
        const item = danhSachKetQua.find(value => {
            return (
                String(value.maLichKham) === String(maLichKham) &&
                String(value.maChiDinh) === String(maChiDinh)
            );
        }) || {};

        document.getElementById("detailPatient").textContent =
            item.hoTen || "—";

        document.getElementById("detailService").textContent =
            item.tenDichVu || "—";

        document.getElementById("detailOrderDate").textContent =
            dinhDangNgay(item.ngayChiDinh);

        document.getElementById("detailResultDate").textContent =
            dinhDangNgay(data.ngayCoKetQua);

        document.getElementById("detailContent").textContent =
            data.noiDungKetQua || "—";

        document.getElementById("detailConclusion").textContent =
            data.ketLuan || "—";

        hienThiFile(data.fileURL);
        hienThiChiTietChiSo(data.chiTiet);

        dangXemChiTietTuNhom = tuNhom;
        moModal();

    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

// =========================================
// HIỂN THỊ FILE KẾT QUẢ
// =========================================

function hienThiFile(fileURL) {
    const section = document.getElementById("fileSection");
    const link = document.getElementById("resultFile");

    if (!section || !link) return;

    if (!fileURL) {
        section.classList.add("hidden");
        link.removeAttribute("href");
        return;
    }

    // Chỉ cho phép URL HTTP/HTTPS hoặc đường dẫn nội bộ.
    const url = String(fileURL).trim();
    const hopLe =
        /^https?:\/\//i.test(url) ||
        (url.startsWith("/") && !url.startsWith("//"));

    if (!hopLe) {
        section.classList.add("hidden");
        link.removeAttribute("href");
        return;
    }

    link.href = url;
    section.classList.remove("hidden");
}

// =========================================
// HIỂN THỊ CHI TIẾT CHỈ SỐ
// =========================================

function hienThiChiTietChiSo(danhSach) {
    const tbody = document.getElementById("detailTableBody");

    if (!tbody) return;

    if (!Array.isArray(danhSach) || danhSach.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty">
                    Không có chi tiết chỉ số.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = danhSach.map(item => {
        return `
            <tr>
                <td>${escapeHtml(item.tenChiSo || "—")}</td>
                <td>${escapeHtml(item.giaTri ?? "—")}</td>
                <td>${escapeHtml(item.donVi || "—")}</td>
                <td>${escapeHtml(item.giaTriThamChieu || "—")}</td>
                <td>${escapeHtml(item.trangThai || "—")}</td>
            </tr>
        `;
    }).join("");
}

// =========================================
// MỞ POPUP CHI TIẾT
// =========================================

function moModal() {
    const detailModal = document.getElementById("detailModal");
    const groupModal = document.getElementById("groupModal");

    if (!detailModal) return;

    // Ẩn popup danh sách khi mở chi tiết.
    if (dangXemChiTietTuNhom) {
        groupModal?.classList.add("hidden");
    }

    detailModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
}

// =========================================
// ĐÓNG POPUP CHI TIẾT
// =========================================

function dongModal() {
    const detailModal = document.getElementById("detailModal");
    const groupModal = document.getElementById("groupModal");

    detailModal?.classList.add("hidden");

    if (dangXemChiTietTuNhom && groupModal) {
        // Quay lại danh sách xét nghiệm của phiếu.
        groupModal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
    } else {
        document.body.style.overflow = "";
    }

    dangXemChiTietTuNhom = false;
}

// =========================================
// ĐỊNH DẠNG NGÀY
// =========================================

function dinhDangNgay(value) {
    if (!value) return "—";

    const text = String(value);

    // Ngày dạng yyyy-MM-dd.
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        const parts = text.split("-");
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    const date = new Date(text);

    if (Number.isNaN(date.getTime())) {
        return text;
    }

    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(date);
}

// =========================================
// CHUẨN HÓA CHUỖI TÌM KIẾM
// =========================================

function chuanHoa(value) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "d")
        .toLowerCase()
        .trim();
}

// =========================================
// ESCAPE HTML
// =========================================

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

// =========================================
// ĐỌC JSON AN TOÀN
// =========================================

async function docJson(response) {
    try {
        return await response.json();
    } catch (error) {
        return null;
    }
}
