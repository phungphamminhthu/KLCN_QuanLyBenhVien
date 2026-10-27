const API_BASE = "/api/bac-si/kham-benh";


let danhSachChiDinh = [];
let danhSachPhieu = [];
let trangThaiDangChon = "ALL";

function gomChiDinhTheoPhieu(danhSach) {
    const nhom = new Map();

    danhSach.forEach(item => {
        // Chỉ gom những chỉ định có mã phiếu chung
        const key = item.maPhieuChiDinh
            ? `PHIEU_${item.maPhieuChiDinh}`
            : `CU_${item.maChiDinh}`;

        if (!nhom.has(key)) {
            nhom.set(key, {
                ...item,
                danhSachDichVu: [],
                danhSachChiDinh: []
            });
        }

        const phieu = nhom.get(key);

        phieu.danhSachDichVu.push(item.tenDichVu);
        phieu.danhSachChiDinh.push(item);
    });

    return Array.from(nhom.values()).map(phieu => {
        const trangThai = phieu.danhSachChiDinh.map(
            item => item.trangThai
        );

        if (trangThai.every(t => t === "DaHoanThanh")) {
            phieu.trangThai = "DaHoanThanh";
        } else if (trangThai.some(t =>
            t === "DangThucHien" || t === "DaHoanThanh"
        )) {
            phieu.trangThai = "DangThucHien";
        } else {
            phieu.trangThai = "ChoThucHien";
        }

        phieu.soDichVu = phieu.danhSachChiDinh.length;
        return phieu;
    });
}

/* =========================================================
   KHỞI TẠO TRANG
========================================================= */


document.addEventListener("DOMContentLoaded", function () {
    ganSuKienTimKiem();
    ganSuKienBoLoc();
    taiDanhSachChiDinh();
});

/* =========================================================
   TOKEN
========================================================= */

function layToken() {
    return (
        localStorage.getItem("token") ||
        localStorage.getItem("Token") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("Token")
    );
}

/* =========================================================
   FETCH API
========================================================= */

async function apiFetch(url, options = {}) {
    const token = layToken();

    const headers = {
        ...(options.headers || {})
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    if (
        options.body &&
        !(options.body instanceof FormData) &&
        !headers["Content-Type"]
    ) {
        headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("token");
        localStorage.removeItem("Token");
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("Token");

        window.location.href = "/login";

        throw new Error("Phiên đăng nhập đã hết hạn.");
    }

    let data = null;

    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
        data = await response.json();
    } else {
        const text = await response.text();
        data = text ? { message: text } : {};
    }

    if (!response.ok) {
        throw new Error(
            data?.message || "Không thể xử lý yêu cầu."
        );
    }

    return data;
}

/* =========================================================
   TẢI DANH SÁCH CHỈ ĐỊNH
========================================================= */

async function taiDanhSachChiDinh() {
    const tbody = document.getElementById("chiDinhTableBody");

    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="loading-cell">
                Đang tải danh sách chỉ định...
            </td>
        </tr>
    `;

    try {
        const data = await apiFetch(`${API_BASE}/chi-dinh`);

        danhSachChiDinh = Array.isArray(data) ? data : [];

        danhSachPhieu = gomChiDinhTheoPhieu(danhSachChiDinh);

        capNhatThongKe();
        locVaHienThi();
    } catch (error) {
        console.error("Lỗi tải danh sách chỉ định:", error);

        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="error-cell">
                    ${escapeHtml(
                        error.message ||
                        "Không thể tải danh sách chỉ định."
                    )}
                </td>
            </tr>
        `;

        capNhatThongKe();
        capNhatSoLuongBang(0);
    }
}

/* =========================================================
   CẬP NHẬT THỐNG KÊ
========================================================= */

function capNhatThongKe() {
    const tong = danhSachPhieu.length;

    const choThucHien = danhSachPhieu.filter(
        item => item.trangThai === "ChoThucHien"
    ).length;

    const dangThucHien = danhSachPhieu.filter(
        item => item.trangThai === "DangThucHien"
    ).length;

    const daHoanThanh = danhSachPhieu.filter(
        item => item.trangThai === "DaHoanThanh"
    ).length;

    ganText("tongChiDinh", tong);
    ganText("tongChoThucHien", choThucHien);
    ganText("tongDangThucHien", dangThucHien);
    ganText("tongDaHoanThanh", daHoanThanh);
}


/* =========================================================
   TÌM KIẾM
   Dùng được với ô tìm kiếm của trang và header nếu có.
========================================================= */

function ganSuKienTimKiem() {
    const searchInput = document.getElementById("searchInput");
    const headerSearch = document.getElementById("headerSearch");

    if (searchInput) {
        searchInput.addEventListener("input", function () {
            if (headerSearch) {
                headerSearch.value = searchInput.value;
            }

            locVaHienThi();
        });
    }

    if (headerSearch) {
        headerSearch.addEventListener("input", function () {
            if (searchInput) {
                searchInput.value = headerSearch.value;
            }

            locVaHienThi();
        });
    }
}

/* =========================================================
   BỘ LỌC TRẠNG THÁI
========================================================= */

function ganSuKienBoLoc() {
    const buttons = document.querySelectorAll(".filter-btn");

    buttons.forEach(button => {
        button.addEventListener("click", function () {
            buttons.forEach(btn => btn.classList.remove("active"));

            button.classList.add("active");

            trangThaiDangChon = button.dataset.status || "ALL";

            locVaHienThi();
        });
    });
}

/* =========================================================
   LỌC VÀ HIỂN THỊ DANH SÁCH
========================================================= */

function locVaHienThi() {
    const searchInput = document.getElementById("searchInput");

    const keyword = chuanHoaChuoi(
        searchInput ? searchInput.value : ""
    );

    const ketQua = danhSachPhieu.filter(item => {
        const dungTrangThai =
            trangThaiDangChon === "ALL" ||
            item.trangThai === trangThaiDangChon;

        const hoTen = chuanHoaChuoi(item.hoTen || "");
        const maBenhNhan = chuanHoaChuoi(item.maBenhNhan || "");

        const tenDichVu = chuanHoaChuoi(
            item.danhSachDichVu.join(" ")
        );

        const dungTuKhoa =
            !keyword ||
            hoTen.includes(keyword) ||
            maBenhNhan.includes(keyword) ||
            tenDichVu.includes(keyword);

        return dungTrangThai && dungTuKhoa;
    });

    hienThiDanhSach(ketQua);
}


/* =========================================================
   HIỂN THỊ BẢNG
========================================================= */

function hienThiDanhSach(danhSach) {
    const tbody = document.getElementById("chiDinhTableBody");

    if (!tbody) return;

    if (!danhSach.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-cell">
                    Không có chỉ định phù hợp.
                </td>
            </tr>
        `;

        capNhatSoLuongBang(0);
        return;
    }

    tbody.innerHTML = danhSach
        .map((item, index) => taoDongChiDinh(item, index))
        .join("");

    capNhatSoLuongBang(danhSach.length);
    ganSuKienNutXem();
}

/* =========================================================
   TẠO DÒNG CHỈ ĐỊNH
========================================================= */

function taoDongChiDinh(item, index) {
    const hoTen = item.hoTen || "Chưa có thông tin";

    const maBenhNhan = item.maBenhNhan != null
        ? `BN${item.maBenhNhan}`
        : "--";

   const tenDichVu = item.maPhieuChiDinh
       ? `${item.soDichVu} xét nghiệm`
       : (item.tenDichVu || "Chưa xác định");

   const loaiDichVu = item.maPhieuChiDinh
       ? item.danhSachDichVu.join(", ")
       : (item.loaiDichVu || item.loaiChiDinh || "");

    const ngayChiDinh = dinhDangNgayGio(item.ngayChiDinh);

    const phong = item.maPhong != null
        ? `Phòng ${item.maPhong}`
        : "Chưa phân phòng";

    return `
        <tr>
            <td>${index + 1}</td>

            <td>
                <span class="patient-name">
                    ${escapeHtml(hoTen)}
                </span>

                <span class="patient-code">
                    ${escapeHtml(maBenhNhan)}
                </span>
            </td>

            <td>
                <span class="service-name">
                    ${escapeHtml(tenDichVu)}
                </span>

                ${
                    loaiDichVu
                        ? `
                            <span class="service-type">
                                ${escapeHtml(loaiDichVu)}
                            </span>
                        `
                        : ""
                }
            </td>

            <td>${escapeHtml(ngayChiDinh)}</td>

            <td>${escapeHtml(phong)}</td>

            <td>${taoTrangThaiHtml(item.trangThai)}</td>

            <td>
                <button
                    type="button"
                    class="view-button"
                    data-id="${escapeHtml(String(item.maChiDinh ?? ""))}">
                    Xem
                </button>
            </td>
        </tr>
    `;
}

/* =========================================================
   HIỂN THỊ TRẠNG THÁI
========================================================= */

function taoTrangThaiHtml(trangThai) {
    if (trangThai === "ChoThucHien") {
        return `
            <span class="status status-waiting">
                Chờ thực hiện
            </span>
        `;
    }

    if (trangThai === "DangThucHien") {
        return `
            <span class="status status-processing">
                Đang thực hiện
            </span>
        `;
    }

    if (trangThai === "DaHoanThanh") {
        return `
            <span class="status status-completed">
                Đã hoàn thành
            </span>
        `;
    }

    return `
        <span class="status status-default">
            ${escapeHtml(trangThai || "Chưa xác định")}
        </span>
    `;
}

/* =========================================================
   SỰ KIỆN NÚT XEM CHI TIẾT
========================================================= */

function ganSuKienNutXem() {
    const buttons = document.querySelectorAll(".view-button");

    buttons.forEach(button => {
        button.addEventListener("click", function () {
            const id = button.dataset.id;

            const phieu = danhSachPhieu.find(
                item => String(item.maChiDinh) === String(id)
            );

            if (phieu) {
                moChiTietChiDinh(phieu);
            }
        });
    });
}


/* =========================================================
   MỞ MODAL CHI TIẾT
========================================================= */


/* =========================================================
   MỞ TRANG CHI TIẾT CHỈ ĐỊNH
========================================================= */

function moChiTietChiDinh(item) {
    const maLichKham = item.maLichKham;
    const maPhieuChiDinh = item.maPhieuChiDinh;
    const maChiDinh = item.maChiDinh;

    if (!maLichKham) {
        alert("Không tìm thấy lịch khám.");
        return;
    }

    let url = `/auth/bac-si/chi-dinh/chi-tiet`
        + `?maLichKham=${encodeURIComponent(maLichKham)}`;

    if (maPhieuChiDinh) {
        // Phiếu mới có mã nhóm
        url += `&maPhieuChiDinh=${encodeURIComponent(maPhieuChiDinh)}`;
    } else if (maChiDinh) {
        // Chỉ định cũ chưa có mã phiếu
        url += `&maChiDinh=${encodeURIComponent(maChiDinh)}`;
    } else {
        alert("Không tìm thấy thông tin chỉ định.");
        return;
    }

    window.location.href = url;
}


/* =========================================================
   ĐÓNG MODAL
========================================================= */

function ganSuKienModal() {
    const modal = document.getElementById("detailModal");
    const closeButton = document.getElementById("btnCloseModal");
    const closeBottomButton = document.getElementById("btnDongModal");

    if (closeButton) {
        closeButton.addEventListener("click", dongModal);
    }

    if (closeBottomButton) {
        closeBottomButton.addEventListener("click", dongModal);
    }

    if (modal) {
        modal.addEventListener("click", function (event) {
            if (event.target === modal) {
                dongModal();
            }
        });
    }

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            dongModal();
        }
    });
}

function dongModal() {
    const modal = document.getElementById("detailModal");

    if (modal) {
        modal.classList.remove("show");
    }
}

/* =========================================================
   CẬP NHẬT SỐ LƯỢNG BẢNG
========================================================= */

function capNhatSoLuongBang(soLuong) {
    const element = document.getElementById("tableCount");

    if (element) {
        element.textContent = `Hiển thị ${soLuong} phiếu chỉ định`;
    }
}

/* =========================================================
   HÀM HỖ TRỢ
========================================================= */

function ganText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent =
            value == null || value === ""
                ? "--"
                : value;
    }
}

function chuanHoaChuoi(value) {
    return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function dinhDangNgay(value) {
    if (!value) {
        return "--";
    }

    const text = String(value);

    const datePart = text.includes("T")
        ? text.split("T")[0]
        : text.split(" ")[0];

    const parts = datePart.split("-");

    if (parts.length !== 3) {
        return text;
    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function dinhDangNgayGio(value) {
    if (!value) {
        return "--";
    }

    const text = String(value);
    const normalized = text.replace(" ", "T");
    const parts = normalized.split("T");

    const ngay = dinhDangNgay(parts[0]);

    if (parts.length < 2 || !parts[1]) {
        return ngay;
    }

    const gio = parts[1].substring(0, 5);

    return `${ngay} ${gio}`;
}

function escapeHtml(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}