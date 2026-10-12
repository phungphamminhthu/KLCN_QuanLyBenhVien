// =========================================================
// CẤU HÌNH API
// =========================================================

const API_BASE = "/api/bac-si/kham-benh";

let maLichKham = null;
let hoSoHienTai = null;

let danhSachDichVu = [];
let danhSachChiDinh = [];


// =========================================================
// KIỂM TRA ĐIỀU KIỆN KÊ ĐƠN / HOÀN TẤT KHÁM
// =========================================================

async function kiemTraDieuKienCLS() {
    try {
        const danhSach = await goiApi(
            `${API_BASE}/${maLichKham}/chi-dinh`,
            {
                method: "GET",
                headers: taoHeaders()
            }
        );

        if (!Array.isArray(danhSach)) {
            throw new Error("Danh sách chỉ định không hợp lệ.");
        }

        // Không có chỉ định thì được kê đơn / hoàn tất khám.
        if (danhSach.length === 0) {
            return {
                duocPhep: true,
                thongBao: ""
            };
        }

        for (const chiDinh of danhSach) {
            const maChiDinh = layGiaTri(
                chiDinh,
                ["maChiDinh", "MaChiDinh"]
            );

            const trangThai = layGiaTri(
                chiDinh,
                ["trangThai", "TrangThai"]
            );

            if (!maChiDinh || trangThai !== "DaHoanThanh") {
                return {
                    duocPhep: false,
                    thongBao:
                        "Còn chỉ định cận lâm sàng chưa hoàn thành. " +
                        "Vui lòng đợi kết quả trước khi kê đơn hoặc hoàn tất khám."
                };
            }

            const ketQua = await goiApi(
                `${API_BASE}/${maLichKham}/chi-dinh/${maChiDinh}/ket-qua`,
                {
                    method: "GET",
                    headers: taoHeaders()
                }
            );

            const trangThaiKetQua = layGiaTri(
                ketQua,
                ["trangThai", "TrangThai"]
            );

            if (
                ketQua?.coKetQua !== true ||
                trangThaiKetQua !== "DaHoanThanh"
            ) {
                return {
                    duocPhep: false,
                    thongBao:
                        "Kết quả cận lâm sàng chưa được hoàn tất. " +
                        "Vui lòng kiểm tra lại trang Cận lâm sàng."
                };
            }
        }

        return {
            duocPhep: true,
            thongBao: ""
        };

    } catch (error) {
        console.error("Không thể kiểm tra CLS:", error);

        return {
            duocPhep: false,
            thongBao:
                error.message ||
                "Không thể kiểm tra trạng thái cận lâm sàng."
        };
    }
}

// =========================================================
// CẬP NHẬT TRẠNG THÁI NÚT TRÊN GIAO DIỆN
// =========================================================

async function capNhatKhoaCLS() {
    const ketQua = await kiemTraDieuKienCLS();

    const tabPrescription = getElement("tabPrescription");
    const btnComplete = getElement("btnComplete");

    const trangThaiHoSo = layGiaTri(
        hoSoHienTai,
        ["trangThai", "TrangThai"]
    );

    const daHoanTat = trangThaiHoSo === "HoanTat";

    if (tabPrescription) {
        tabPrescription.disabled = !ketQua.duocPhep;
        tabPrescription.title = ketQua.duocPhep
            ? "Kê đơn thuốc"
            : ketQua.thongBao;
    }

    if (btnComplete) {
        btnComplete.disabled =
            !ketQua.duocPhep || daHoanTat;

        btnComplete.title = ketQua.duocPhep
            ? ""
            : ketQua.thongBao;
    }

    return ketQua;
}
// =========================================================
// ĐƠN THUỐC
// =========================================================

let danhSachThuoc = [];
let danhSachThuocDaKe = [];
let coDonThuoc = false;
let donThuocHienTai = null;

// =========================================================
// TOKEN
// =========================================================

function layToken() {

    return localStorage.getItem("Token")
        || localStorage.getItem("token")
        || sessionStorage.getItem("Token")
        || sessionStorage.getItem("token");
}


// =========================================================
// HEADER CHO REQUEST
// =========================================================

function taoHeaders(coBody = false) {

    const headers = {};

    const token = layToken();

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    if (coBody) {
        headers["Content-Type"] = "application/json";
    }

    return headers;
}


// =========================================================
// FETCH API
// =========================================================

async function goiApi(url, options = {}) {

    const response = await fetch(url, options);

    let data = null;

    try {
        data = await response.json();
    } catch (error) {

        try {
            data = await response.text();
        } catch (ignored) {
            data = null;
        }
    }

    if (response.status === 401 || response.status === 403) {

        throw new Error(
            "Phiên đăng nhập không hợp lệ hoặc bạn không có quyền truy cập."
        );
    }

    if (!response.ok) {

        let message = "Có lỗi xảy ra.";

        if (typeof data === "string" && data.trim() !== "") {

            message = data;

        } else if (data) {

            message =
                data.message
                || data.error
                || data.thongBao
                || message;
        }

        throw new Error(message);
    }

    return data;
}


// =========================================================
// LẤY MÃ LỊCH KHÁM TỪ URL
//
// Ví dụ:
// /auth/bac-si/kham-benh/16
//
// => maLichKham = 16
// =========================================================

function layMaLichKhamTuUrl() {

    const path = window.location.pathname;

    const parts = path
        .split("/")
        .filter(Boolean);

    const value = parts[parts.length - 1];

    const id = Number(value);

    if (!Number.isInteger(id) || id <= 0) {
        return null;
    }

    return id;
}


// =========================================================
// TIỆN ÍCH DOM
// =========================================================

function getElement(id) {
    return document.getElementById(id);
}


function ganText(id, value, fallback = "---") {

    const element = getElement(id);

    if (!element) {
        return;
    }

    if (
        value === null
        || value === undefined
        || String(value).trim() === ""
    ) {

        element.textContent = fallback;

        return;
    }

    element.textContent = value;
}


function ganValue(id, value) {

    const element = getElement(id);

    if (!element) {
        return;
    }

    element.value =
        value === null || value === undefined
            ? ""
            : value;
}


// =========================================================
// FORMAT NGÀY
// =========================================================

function dinhDangNgay(value) {

    if (!value) {
        return "---";
    }

    const dateString = String(value).substring(0, 10);

    const parts = dateString.split("-");

    if (parts.length !== 3) {
        return value;
    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}


// =========================================================
// FORMAT NGÀY GIỜ
// =========================================================

function dinhDangNgayGio(value) {

    if (!value) {
        return "---";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString("vi-VN");
}


// =========================================================
// HIỂN THỊ LOADING
// =========================================================

function hienThiLoading(show) {

    const loading = getElement("pageLoading");

    if (!loading) {
        return;
    }

    if (show) {
        loading.classList.remove("hidden");
    } else {
        loading.classList.add("hidden");
    }
}


// =========================================================
// TOAST
// =========================================================

let toastTimer = null;


function hienThiThongBao(
    message,
    type = "success",
    title = null
) {

    const toast = getElement("toast");

    const toastTitle = getElement("toastTitle");

    const toastMessage = getElement("toastMessage");

    const toastIcon = getElement("toastIcon");

    if (!toast) {
        return;
    }

    if (toastTimer) {
        clearTimeout(toastTimer);
    }

    toast.classList.remove(
        "hidden",
        "error"
    );

    if (type === "error") {

        toast.classList.add("error");

        if (toastTitle) {
            toastTitle.textContent =
                title || "Có lỗi xảy ra";
        }

        if (toastIcon) {
            toastIcon.innerHTML =
                '<i class="fa-solid fa-xmark"></i>';
        }

    } else {

        if (toastTitle) {
            toastTitle.textContent =
                title || "Thành công";
        }

        if (toastIcon) {
            toastIcon.innerHTML =
                '<i class="fa-solid fa-check"></i>';
        }
    }

    if (toastMessage) {
        toastMessage.textContent = message;
    }

    toastTimer = setTimeout(() => {

        toast.classList.add("hidden");

    }, 3500);
}


//// =========================================================
//// HIỂN THỊ THÔNG TIN BÁC SĨ
//// =========================================================
//
//function hienThiThongTinBacSi() {
//    const hoTen =
//        localStorage.getItem("HoTen")
//        || sessionStorage.getItem("HoTen")
//        || "Bác sĩ";
//
//    ganText("doctorName", hoTen, "Bác sĩ");
//
//    const avatar = getElement("doctorAvatar");
//
//    // Header dùng thẻ <img>: giữ ảnh, không gán textContent.
//    if (avatar instanceof HTMLImageElement) {
//        avatar.onerror = function () {
//            this.onerror = null;
//            this.src = "/Images/default-avatar.png";
//        };
//        return;
//    }
//
//    // Nếu trang nào đó dùng avatar dạng div thì hiển thị chữ viết tắt.
//    if (avatar) {
//        const words = hoTen.trim().split(/\s+/).filter(Boolean);
//
//        avatar.textContent = words.length >= 2
//            ? (words[words.length - 2][0]
//                + words[words.length - 1][0]).toUpperCase()
//            : (words[0] || "BS").substring(0, 2).toUpperCase();
//    }
//}


// =========================================================
// LẤY GIÁ TRỊ TỪ OBJECT
//
// Backend có thể trả Entity trực tiếp hoặc object lồng nhau.
// Hàm này giúp trang đọc được các tên field phổ biến.
// =========================================================

function layGiaTri(object, paths) {

    if (!object) {
        return null;
    }

    for (const path of paths) {

        const keys = path.split(".");

        let current = object;

        let valid = true;

        for (const key of keys) {

            if (
                current === null
                || current === undefined
                || !(key in Object(current))
            ) {

                valid = false;

                break;
            }

            current = current[key];
        }

        if (
            valid
            && current !== null
            && current !== undefined
        ) {

            return current;
        }
    }

    return null;
}


// =========================================================
// LẤY THÔNG TIN BỆNH NHÂN TỪ HỒ SƠ
// =========================================================

function layThongTinBenhNhan(data) {

    const ten = layGiaTri(
        data,
        [
            "HoTen",
            "hoTen",
            "TenBenhNhan",
            "tenBenhNhan",

            "BenhNhan.HoTen",
            "BenhNhan.hoTen",

            "benhNhan.HoTen",
            "benhNhan.hoTen",

            "LichDangKyKham.BenhNhan.HoTen",
            "LichDangKyKham.BenhNhan.hoTen",

            "lichDangKyKham.BenhNhan.HoTen",
            "lichDangKyKham.BenhNhan.hoTen",

            "lichDangKyKham.benhNhan.HoTen",
            "lichDangKyKham.benhNhan.hoTen",

            "BenhNhan.NguoiDung.HoTen",
            "BenhNhan.NguoiDung.hoTen",

            "benhNhan.nguoiDung.HoTen",
            "benhNhan.nguoiDung.hoTen",

            "lichDangKyKham.benhNhan.nguoiDung.HoTen",
            "lichDangKyKham.benhNhan.nguoiDung.hoTen"
        ]
    );


    const maBenhNhan = layGiaTri(
        data,
        [
            "MaBenhNhan",
            "maBenhNhan",

            "BenhNhan.MaBenhNhan",
            "BenhNhan.maBenhNhan",

            "benhNhan.MaBenhNhan",
            "benhNhan.maBenhNhan",

            "LichDangKyKham.MaBenhNhan",
            "LichDangKyKham.maBenhNhan",

            "lichDangKyKham.MaBenhNhan",
            "lichDangKyKham.maBenhNhan",

            "LichDangKyKham.BenhNhan.MaBenhNhan",
            "LichDangKyKham.BenhNhan.maBenhNhan",

            "lichDangKyKham.benhNhan.MaBenhNhan",
            "lichDangKyKham.benhNhan.maBenhNhan"
        ]
    );


    const ngaySinh = layGiaTri(
        data,
        [
            "NgaySinh",
            "ngaySinh",

            "BenhNhan.NgaySinh",
            "BenhNhan.ngaySinh",

            "benhNhan.NgaySinh",
            "benhNhan.ngaySinh",

            "LichDangKyKham.BenhNhan.NgaySinh",
            "LichDangKyKham.BenhNhan.ngaySinh",

            "lichDangKyKham.benhNhan.NgaySinh",
            "lichDangKyKham.benhNhan.ngaySinh"
        ]
    );


    const gioiTinh = layGiaTri(
        data,
        [
            "GioiTinh",
            "gioiTinh",

            "BenhNhan.GioiTinh",
            "BenhNhan.gioiTinh",

            "benhNhan.GioiTinh",
            "benhNhan.gioiTinh",

            "LichDangKyKham.BenhNhan.GioiTinh",
            "LichDangKyKham.BenhNhan.gioiTinh",

            "lichDangKyKham.benhNhan.GioiTinh",
            "lichDangKyKham.benhNhan.gioiTinh"
        ]
    );


    return {
        ten,
        maBenhNhan,
        ngaySinh,
        gioiTinh
    };
}


// =========================================================
// HIỂN THỊ THÔNG TIN BỆNH NHÂN
// =========================================================

function hienThiThongTinBenhNhan(data) {

    const patient =
        layThongTinBenhNhan(data);


    ganText(
        "patientName",
        patient.ten,
        "Bệnh nhân"
    );


    if (patient.maBenhNhan) {

        ganText(
            "patientCode",
            `BN${String(patient.maBenhNhan).padStart(6, "0")}`
        );

    } else {

        ganText(
            "patientCode",
            "---"
        );
    }


    ganText(
        "patientBirthDate",
        dinhDangNgay(patient.ngaySinh)
    );


    ganText(
        "patientGender",
        patient.gioiTinh
    );
}


// =========================================================
// HIỂN THỊ TRẠNG THÁI
// =========================================================

function hienThiTrangThai(data) {

    const trangThai = layGiaTri(
        data,
        [
            "TrangThai",
            "trangThai",

            "LichDangKyKham.TrangThai",
            "LichDangKyKham.trangThai",

            "lichDangKyKham.TrangThai",
            "lichDangKyKham.trangThai"
        ]
    );


    const badge =
        getElement("examStatus");

    if (!badge) {
        return;
    }


    switch (trangThai) {

        case "DaKham":

            badge.textContent =
                "Đã khám";

            break;


        case "ChoKham":

            badge.textContent =
                "Chờ khám";

            break;


        case "DaHuy":

            badge.textContent =
                "Đã hủy";

            break;


        case "DangKham":

            badge.textContent =
                "Đang khám";

            break;


        default:

            badge.textContent =
                "Đang khám";

            break;
    }
}


// =========================================================
// HIỂN THỊ DỮ LIỆU HỒ SƠ
// =========================================================

function hienThiHoSo(data) {

    if (!data) {
        return;
    }


    hoSoHienTai = data;


    hienThiThongTinBenhNhan(data);

    hienThiTrangThai(data);


    const trieuChung = layGiaTri(
        data,
        [
            "TrieuChung",
            "trieuChung"
        ]
    );


    const chanDoan = layGiaTri(
        data,
        [
            "ChanDoan",
            "chanDoan"
        ]
    );


    const ketLuan = layGiaTri(
        data,
        [
            "KetLuan",
            "ketLuan"
        ]
    );


    const huongDieuTri = layGiaTri(
        data,
        [
            "HuongDieuTri",
            "huongDieuTri"
        ]
    );


    const ngayTaiKham = layGiaTri(
        data,
        [
            "NgayTaiKham",
            "ngayTaiKham"
        ]
    );


    const ghiChuTaiKham = layGiaTri(
        data,
        [
            "GhiChuTaiKham",
            "ghiChuTaiKham"
        ]
    );


    ganValue(
        "symptoms",
        trieuChung
    );


    ganValue(
        "diagnosis",
        chanDoan
    );


    ganValue(
        "conclusion",
        ketLuan
    );


    ganValue(
        "treatment",
        huongDieuTri
    );


    if (ngayTaiKham) {

        ganValue(
            "reExamDate",
            String(ngayTaiKham).substring(0, 10)
        );

    } else {

        ganValue(
            "reExamDate",
            ""
        );
    }


    ganValue(
        "reExamNote",
        ghiChuTaiKham
    );


    const trangThaiHoSo = layGiaTri(
        data,
        [
            "TrangThai",
            "trangThai"
        ]
    );


    if (trangThaiHoSo === "HoanTat") {
        khoaHoSo();
    }
}


// =========================================================
// KHÓA HỒ SƠ KHI ĐÃ HOÀN TẤT
// =========================================================

function khoaHoSo() {

    const ids = [
        "symptoms",
        "diagnosis",
        "conclusion",
        "treatment",
        "reExamDate",
        "reExamNote"
    ];

    ids.forEach(id => {

        const element = getElement(id);

        if (element) {
            element.disabled = true;
        }
    });


    const btnSave =
        getElement("btnSave");

    const btnComplete =
        getElement("btnComplete");


    if (btnSave) {
        btnSave.disabled = true;
    }


    if (btnComplete) {

        btnComplete.disabled = true;

        btnComplete.innerHTML =
            '<i class="fa-solid fa-check"></i>'
            + "<span>Đã hoàn tất</span>";
    }
    khoaDonThuoc();
}


// =========================================================
// LẤY HỒ SƠ KHÁM
// =========================================================

async function taiHoSo() {

    const data = await goiApi(
        `${API_BASE}/${maLichKham}/ho-so`,
        {
            method: "GET",
            headers: taoHeaders()
        }
    );

    hienThiHoSo(data);

    return data;
}


// =========================================================
// THU THẬP FORM HỒ SƠ
// =========================================================

function layDuLieuHoSoTuForm() {

    return {

        trieuChung:
            getElement("symptoms")?.value.trim() || "",

        chanDoan:
            getElement("diagnosis")?.value.trim() || "",

        ketLuan:
            getElement("conclusion")?.value.trim() || "",

        huongDieuTri:
            getElement("treatment")?.value.trim() || "",

        ngayTaiKham:
            getElement("reExamDate")?.value || null,

        ghiChuTaiKham:
            getElement("reExamNote")?.value.trim() || null
    };
}

// =========================================================
// LƯU HỒ SƠ
// =========================================================

async function luuHoSo() {

    const btn =
        getElement("btnSave");

    try {

        if (btn) {
            btn.disabled = true;
        }


        const body =
            layDuLieuHoSoTuForm();


        const data = await goiApi(
            `${API_BASE}/${maLichKham}/ho-so`,
            {
                method: "PUT",

                headers:
                    taoHeaders(true),

                body:
                    JSON.stringify(body)
            }
        );


        if (data) {
            hienThiHoSo(data);
        }


        hienThiThongBao(
            "Đã lưu hồ sơ khám bệnh."
        );


    } catch (error) {

        console.error(error);

        hienThiThongBao(
            error.message || "Không thể lưu hồ sơ.",
            "error"
        );


    } finally {

        if (btn && !btn.dataset.locked) {
            btn.disabled = false;
        }
    }
}


// =========================================================
// KIỂM TRA TRƯỚC KHI HOÀN TẤT
// =========================================================

function kiemTraHoSo() {

    const trieuChung =
        getElement("symptoms")?.value.trim();

    const chanDoan =
        getElement("diagnosis")?.value.trim();

    const ketLuan =
        getElement("conclusion")?.value.trim();

    const huongDieuTri =
        getElement("treatment")?.value.trim();


    if (!trieuChung) {

        hienThiThongBao(
            "Vui lòng nhập triệu chứng.",
            "error"
        );

        getElement("symptoms")?.focus();

        return false;
    }


    if (!chanDoan) {

        hienThiThongBao(
            "Vui lòng nhập chẩn đoán.",
            "error"
        );

        getElement("diagnosis")?.focus();

        return false;
    }


    if (!ketLuan) {

        hienThiThongBao(
            "Vui lòng nhập kết luận.",
            "error"
        );

        getElement("conclusion")?.focus();

        return false;
    }


    if (!huongDieuTri) {

        hienThiThongBao(
            "Vui lòng nhập hướng điều trị.",
            "error"
        );

        getElement("treatment")?.focus();

        return false;
    }


    return true;
}


// =========================================================
// HOÀN TẤT KHÁM
// =========================================================

async function hoanTatKham() {

    if (!kiemTraHoSo()) {
        return;
    }

    const ketQuaCLS = await kiemTraDieuKienCLS();

    if (!ketQuaCLS.duocPhep) {
        hienThiThongBao(
            ketQuaCLS.thongBao,
            "error"
        );
        return;
    }
    const confirmed = window.confirm(
        "Bạn có chắc muốn hoàn tất lần khám này?\n\n"
        + "Sau khi hoàn tất, hồ sơ sẽ chuyển sang trạng thái chỉ đọc."
    );


    if (!confirmed) {
        return;
    }


    const btn =
        getElement("btnComplete");


    try {

        if (btn) {
            btn.disabled = true;
        }


        // Lưu dữ liệu mới nhất trước.
        const body =
            layDuLieuHoSoTuForm();


        await goiApi(
            `${API_BASE}/${maLichKham}/ho-so`,
            {
                method: "PUT",

                headers:
                    taoHeaders(true),

                body:
                    JSON.stringify(body)
            }
        );


        // Sau đó hoàn tất khám.
        const data = await goiApi(
            `${API_BASE}/${maLichKham}/hoan-tat`,
            {
                method: "POST",

                headers:
                    taoHeaders()
            }
        );


        if (data) {
            hienThiHoSo(data);
        }


        hienThiThongBao(
            "Đã hoàn tất khám bệnh."
        );


        setTimeout(() => {

            window.location.href =
                "/auth/bac-si/kham-benh";

        }, 1000);


    } catch (error) {

        console.error(error);

        hienThiThongBao(
            error.message || "Không thể hoàn tất khám.",
            "error"
        );


        if (btn) {
            btn.disabled = false;
        }
    }
}


// =========================================================
// CHUYỂN TAB
// =========================================================
// =========================================================
// CHUYỂN TAB
// =========================================================

async function chuyenTab(tabName) {

    // Kiểm tra trước khi mở tab Đơn thuốc.
    if (tabName === "prescription") {
        const ketQua = await kiemTraDieuKienCLS();

        if (!ketQua.duocPhep) {
            hienThiThongBao(
                ketQua.thongBao,
                "error"
            );

            return;
        }
    }

    // Giữ nguyên toàn bộ code cũ bên dưới.


    const medicalButton =
        getElement("tabMedical");

    const clinicalButton =
        getElement("tabClinical");

    const prescriptionButton =
        getElement("tabPrescription");


    const medicalContent =
        getElement("medicalTabContent");

    const clinicalContent =
        getElement("clinicalTabContent");

    const prescriptionContent =
        getElement("prescriptionTabContent");


    // Xóa active tất cả tab

    medicalButton?.classList.remove("active");

    clinicalButton?.classList.remove("active");

    prescriptionButton?.classList.remove("active");


    // Ẩn tất cả nội dung

    medicalContent?.classList.add("hidden");

    clinicalContent?.classList.add("hidden");

    prescriptionContent?.classList.add("hidden");


    // ================================
    // CẬN LÂM SÀNG
    // ================================

    if (tabName === "clinical") {

        clinicalButton?.classList.add("active");

        clinicalContent?.classList.remove("hidden");

        taiDanhSachChiDinh();

        return;
    }


    // ================================
    // ĐƠN THUỐC
    // ================================

    if (tabName === "prescription") {

        prescriptionButton?.classList.add("active");

        prescriptionContent?.classList.remove("hidden");

        return;
    }


    // ================================
    // THÔNG TIN KHÁM
    // ================================

    medicalButton?.classList.add("active");

    medicalContent?.classList.remove("hidden");
}
// =========================================================
// TẢI DANH SÁCH DỊCH VỤ
// =========================================================

async function taiDanhSachDichVu() {

    try {

        const data = await goiApi(
            `${API_BASE}/dich-vu`,
            {
                method: "GET",
                headers: taoHeaders()
            }
        );


        danhSachDichVu =
            Array.isArray(data)
                ? data
                : [];


        renderDichVu();


    } catch (error) {

        console.error(
            "Không thể tải dịch vụ:",
            error
        );
    }
}


// =========================================================
// RENDER DỊCH VỤ
// =========================================================

function renderDichVu() {

    const select =
        getElement("serviceSelect");

    if (!select) {
        return;
    }


    select.innerHTML =
        '<option value="">-- Chọn dịch vụ --</option>';


    danhSachDichVu.forEach(item => {

        const maDichVu =
            layGiaTri(
                item,
                [
                    "MaDichVu",
                    "maDichVu"
                ]
            );


        const tenDichVu =
            layGiaTri(
                item,
                [
                    "TenDichVu",
                    "tenDichVu"
                ]
            );


        if (!maDichVu) {
            return;
        }


        const option =
            document.createElement("option");


        option.value =
            maDichVu;


        option.textContent =
            tenDichVu || `Dịch vụ ${maDichVu}`;


        select.appendChild(option);
    });
}


// =========================================================
// MỞ FORM TẠO CHỈ ĐỊNH
// =========================================================

function moFormChiDinh() {

    const form =
        getElement("clinicalOrderForm");

    if (!form) {
        return;
    }


    form.classList.remove("hidden");


    if (danhSachDichVu.length === 0) {
        taiDanhSachDichVu();
    }
}


// =========================================================
// ĐÓNG FORM TẠO CHỈ ĐỊNH
// =========================================================

function dongFormChiDinh() {

    const form =
        getElement("clinicalOrderForm");

    if (form) {
        form.classList.add("hidden");
    }


    ganValue(
        "serviceSelect",
        ""
    );


    ganValue(
        "roomId",
        ""
    );


    ganValue(
        "orderType",
        ""
    );
}


// =========================================================
// TẠO CHỈ ĐỊNH
// =========================================================

async function taoChiDinh() {

    const maDichVu =
        Number(
            getElement("serviceSelect")?.value
        );


    const maPhongValue =
        getElement("roomId")?.value;


    const loaiChiDinh =
        getElement("orderType")?.value.trim();


    if (!maDichVu) {

        hienThiThongBao(
            "Vui lòng chọn dịch vụ.",
            "error"
        );

        return;
    }


    const body = {

        maDichVu:
            maDichVu,

        maPhong:
            maPhongValue
                ? Number(maPhongValue)
                : null
    };


    const btn =
        getElement("btnCreateOrder");


    try {

        if (btn) {
            btn.disabled = true;
        }


        await goiApi(
            `${API_BASE}/${maLichKham}/chi-dinh`,
            {
                method: "POST",

                headers:
                    taoHeaders(true),

                body:
                    JSON.stringify(body)
            }
        );


        hienThiThongBao(
            "Đã tạo chỉ định cận lâm sàng."
        );


        dongFormChiDinh();


        await taiDanhSachChiDinh();


    } catch (error) {

        console.error(error);

        hienThiThongBao(
            error.message || "Không thể tạo chỉ định.",
            "error"
        );


    } finally {

        if (btn) {
            btn.disabled = false;
        }
    }
}


// =========================================================
// TẢI DANH SÁCH CHỈ ĐỊNH
// =========================================================

async function taiDanhSachChiDinh() {

    const loading =
        getElement("clinicalLoading");

    const empty =
        getElement("clinicalEmpty");

    const list =
        getElement("clinicalList");


    if (loading) {
        loading.classList.remove("hidden");
    }


    if (empty) {
        empty.classList.add("hidden");
    }


    if (list) {
        list.innerHTML = "";
    }


    try {

        const data = await goiApi(
            `${API_BASE}/${maLichKham}/chi-dinh`,
            {
                method: "GET",
                headers: taoHeaders()
            }
        );


        danhSachChiDinh =
            Array.isArray(data)
                ? data
                : [];


        renderDanhSachChiDinh();


    } catch (error) {

        console.error(error);


        if (empty) {

            empty.classList.remove("hidden");

            const p =
                empty.querySelector("p");

            if (p) {

                p.textContent =
                    error.message
                    || "Không thể tải danh sách chỉ định.";
            }
        }


    } finally {

        if (loading) {
            loading.classList.add("hidden");
        }
    }
}


// =========================================================
// ESCAPE HTML
// =========================================================

function escapeHtml(value) {

    if (
        value === null
        || value === undefined
    ) {

        return "";
    }


    return String(value)

        .replaceAll("&", "&amp;")

        .replaceAll("<", "&lt;")

        .replaceAll(">", "&gt;")

        .replaceAll('"', "&quot;")

        .replaceAll("'", "&#039;");
}


// =========================================================
// TÊN TRẠNG THÁI CHỈ ĐỊNH
// =========================================================

function tenTrangThaiChiDinh(status) {

    switch (status) {

        case "ChoThucHien":
            return "Chờ thực hiện";

        case "DangThucHien":
            return "Đang thực hiện";

        case "DaHoanThanh":
            return "Đã hoàn thành";

        default:
            return status || "Chưa xác định";
    }
}


// =========================================================
// CLASS TRẠNG THÁI CHỈ ĐỊNH
// =========================================================

function classTrangThaiChiDinh(status) {

    switch (status) {

        case "DaHoanThanh":
            return "completed";

        case "DangThucHien":
            return "processing";

        default:
            return "";
    }
}


// =========================================================
// TÌM TÊN DỊCH VỤ
// =========================================================

function timTenDichVu(item) {

    const directName =
        layGiaTri(
            item,
            [
                "TenDichVu",
                "tenDichVu",

                "DichVuYTe.TenDichVu",
                "DichVuYTe.tenDichVu",

                "dichVuYTe.TenDichVu",
                "dichVuYTe.tenDichVu",

                "DichVu.TenDichVu",
                "DichVu.tenDichVu",

                "dichVu.TenDichVu",
                "dichVu.tenDichVu"
            ]
        );


    if (directName) {
        return directName;
    }


    const maDichVu =
        layGiaTri(
            item,
            [
                "MaDichVu",
                "maDichVu",

                "DichVuYTe.MaDichVu",
                "DichVuYTe.maDichVu",

                "dichVuYTe.MaDichVu",
                "dichVuYTe.maDichVu"
            ]
        );


    if (maDichVu) {

        const dichVu =
            danhSachDichVu.find(service => {

                const id =
                    layGiaTri(
                        service,
                        [
                            "MaDichVu",
                            "maDichVu"
                        ]
                    );

                return Number(id)
                    === Number(maDichVu);
            });


        if (dichVu) {

            return layGiaTri(
                dichVu,
                [
                    "TenDichVu",
                    "tenDichVu"
                ]
            ) || `Dịch vụ ${maDichVu}`;
        }


        return `Dịch vụ ${maDichVu}`;
    }


    return "Dịch vụ cận lâm sàng";
}


// =========================================================
// RENDER DANH SÁCH CHỈ ĐỊNH
// =========================================================

function renderDanhSachChiDinh() {

    const list =
        getElement("clinicalList");

    const empty =
        getElement("clinicalEmpty");


    if (!list) {
        return;
    }


    list.innerHTML = "";


    if (danhSachChiDinh.length === 0) {

        if (empty) {
            empty.classList.remove("hidden");
        }

        return;
    }


    if (empty) {
        empty.classList.add("hidden");
    }


    danhSachChiDinh.forEach(item => {

        const tenDichVu =
            timTenDichVu(item);


        const loaiChiDinh =
            layGiaTri(
                item,
                [
                    "LoaiChiDinh",
                    "loaiChiDinh"
                ]
            );


        const ngayChiDinh =
            layGiaTri(
                item,
                [
                    "NgayChiDinh",
                    "ngayChiDinh"
                ]
            );


        const maPhong =
            layGiaTri(
                item,
                [
                    "MaPhong",
                    "maPhong",

                    "Phong.MaPhong",
                    "Phong.maPhong",

                    "phong.MaPhong",
                    "phong.maPhong"
                ]
            );


        const trangThai =
            layGiaTri(
                item,
                [
                    "TrangThai",
                    "trangThai"
                ]
            );


        const element =
            document.createElement("div");


        element.className =
            "clinical-item";


        let meta = "";


        if (loaiChiDinh) {

            meta +=
                escapeHtml(loaiChiDinh);
        }


        if (maPhong) {

            if (meta) {
                meta += " • ";
            }

            meta +=
                `Phòng ${escapeHtml(maPhong)}`;
        }


        if (ngayChiDinh) {

            if (meta) {
                meta += " • ";
            }

            meta +=
                escapeHtml(
                    dinhDangNgayGio(ngayChiDinh)
                );
        }


        element.innerHTML = `

            <div class="clinical-item-header">

                <div>

                    <div class="clinical-item-title">
                        ${escapeHtml(tenDichVu)}
                    </div>

                    <div class="clinical-item-meta">
                        ${meta || "Chỉ định cận lâm sàng"}
                    </div>

                </div>

                <span
                    class="clinical-status ${classTrangThaiChiDinh(trangThai)}"
                >
                    ${escapeHtml(tenTrangThaiChiDinh(trangThai))}
                </span>

            </div>

        `;


        list.appendChild(element);
    });
}

// =========================================================
// ĐƠN THUỐC
// =========================================================


// =========================================================
// FORMAT TIỀN
// =========================================================

function dinhDangTien(value) {

    const number = Number(value);

    if (Number.isNaN(number)) {
        return "0 đ";
    }

    return number.toLocaleString("vi-VN") + " đ";
}


// =========================================================
// TẢI DANH SÁCH THUỐC
// =========================================================

async function taiDanhSachThuoc() {

    try {

        const data = await goiApi(
            `${API_BASE}/thuoc`,
            {
                method: "GET",
                headers: taoHeaders()
            }
        );


        danhSachThuoc =
            Array.isArray(data)
                ? data
                : [];


        renderDanhSachThuoc();

    } catch (error) {

        console.error(
            "Không thể tải danh sách thuốc:",
            error
        );

        hienThiThongBao(
            error.message || "Không thể tải danh sách thuốc.",
            "error"
        );
    }
}


// =========================================================
// RENDER SELECT THUỐC
// =========================================================

function renderDanhSachThuoc() {

    const select =
        getElement("medicineSelect");

    if (!select) {
        return;
    }


    select.innerHTML =
        '<option value="">-- Chọn thuốc --</option>';


    danhSachThuoc.forEach(thuoc => {

        const maThuoc =
            layGiaTri(
                thuoc,
                [
                    "MaThuoc",
                    "maThuoc"
                ]
            );


        const tenThuoc =
            layGiaTri(
                thuoc,
                [
                    "TenThuoc",
                    "tenThuoc"
                ]
            );


        const donViTinh =
            layGiaTri(
                thuoc,
                [
                    "DonViTinh",
                    "donViTinh"
                ]
            );


        if (!maThuoc) {
            return;
        }


        const option =
            document.createElement("option");


        option.value =
            maThuoc;


        option.textContent =
            `${tenThuoc || "Thuốc"}`
            + `${donViTinh ? ` - ${donViTinh}` : ""}`;


        select.appendChild(option);
    });
}


// =========================================================
// TÌM THUỐC THEO MÃ
// =========================================================

function timThuocTheoMa(maThuoc) {

    return danhSachThuoc.find(item => {

        const id =
            layGiaTri(
                item,
                [
                    "MaThuoc",
                    "maThuoc"
                ]
            );

        return Number(id) === Number(maThuoc);
    });
}


// =========================================================
// HIỂN THỊ THÔNG TIN THUỐC ĐƯỢC CHỌN
// =========================================================

function hienThiThongTinThuocDangChon() {

    const maThuoc =
        Number(
            getElement("medicineSelect")?.value
        );


    const info =
        getElement("medicineInfo");


    if (!maThuoc) {

        info?.classList.add("hidden");

        ganText(
            "medicineUnit",
            ""
        );

        ganText(
            "medicinePrice",
            ""
        );

        return;
    }


    const thuoc =
        timThuocTheoMa(maThuoc);


    if (!thuoc) {

        info?.classList.add("hidden");

        return;
    }


    const donViTinh =
        layGiaTri(
            thuoc,
            [
                "DonViTinh",
                "donViTinh"
            ]
        );


    const gia =
        layGiaTri(
            thuoc,
            [
                "Gia",
                "gia"
            ]
        );


    ganText(
        "medicineUnit",
        `Đơn vị: ${donViTinh || "---"}`
    );


    ganText(
        "medicinePrice",
        `Đơn giá: ${dinhDangTien(gia)}`
    );


    info?.classList.remove("hidden");
}


// =========================================================
// XÓA FORM NHẬP THUỐC
// =========================================================

function resetFormThuoc() {

    ganValue(
        "medicineSelect",
        ""
    );

    ganValue(
        "medicineQuantity",
        ""
    );

    ganValue(
        "medicineDosage",
        ""
    );

    ganValue(
        "medicineDuration",
        ""
    );

    ganValue(
        "medicineInstruction",
        ""
    );


    getElement("medicineInfo")
        ?.classList.add("hidden");
}


// =========================================================
// THÊM THUỐC VÀO ĐƠN
// =========================================================

function themThuocVaoDon() {

    const maThuoc =
        Number(
            getElement("medicineSelect")?.value
        );


    const soLuong =
        Number(
            getElement("medicineQuantity")?.value
        );


    const lieuDung =
        getElement("medicineDosage")
            ?.value.trim() || "";


    const durationValue =
        getElement("medicineDuration")?.value;


    const thoiGianDung =
        durationValue
            ? Number(durationValue)
            : null;


    const huongDanSuDung =
        getElement("medicineInstruction")
            ?.value.trim() || "";


    // ================================
    // VALIDATE
    // ================================

    if (!maThuoc) {

        hienThiThongBao(
            "Vui lòng chọn thuốc.",
            "error"
        );

        getElement("medicineSelect")?.focus();

        return;
    }


    if (!Number.isInteger(soLuong) || soLuong <= 0) {

        hienThiThongBao(
            "Số lượng thuốc phải lớn hơn 0.",
            "error"
        );

        getElement("medicineQuantity")?.focus();

        return;
    }


    if (
        thoiGianDung !== null
        && (
            !Number.isInteger(thoiGianDung)
            || thoiGianDung <= 0
        )
    ) {

        hienThiThongBao(
            "Thời gian dùng phải lớn hơn 0.",
            "error"
        );

        getElement("medicineDuration")?.focus();

        return;
    }


    const thuoc =
        timThuocTheoMa(maThuoc);


    if (!thuoc) {

        hienThiThongBao(
            "Không tìm thấy thông tin thuốc.",
            "error"
        );

        return;
    }


    // Không cho cùng một thuốc xuất hiện hai dòng.

    const daTonTai =
        danhSachThuocDaKe.some(item =>
            Number(item.maThuoc) === Number(maThuoc)
        );


    if (daTonTai) {

        hienThiThongBao(
            "Thuốc này đã có trong đơn.",
            "error"
        );

        return;
    }


    const tenThuoc =
        layGiaTri(
            thuoc,
            [
                "TenThuoc",
                "tenThuoc"
            ]
        );


    const donViTinh =
        layGiaTri(
            thuoc,
            [
                "DonViTinh",
                "donViTinh"
            ]
        );


    const gia =
        layGiaTri(
            thuoc,
            [
                "Gia",
                "gia"
            ]
        );


    danhSachThuocDaKe.push({

        maThuoc:
            maThuoc,

        tenThuoc:
            tenThuoc || `Thuốc ${maThuoc}`,

        donViTinh:
            donViTinh || "",

        gia:
            Number(gia) || 0,

        soLuong:
            soLuong,

        lieuDung:
            lieuDung,

        thoiGianDung:
            thoiGianDung,

        huongDanSuDung:
            huongDanSuDung
    });


    renderThuocDaKe();

    resetFormThuoc();


    hienThiThongBao(
        "Đã thêm thuốc vào đơn."
    );
}


// =========================================================
// XÓA THUỐC KHỎI ĐƠN
// =========================================================

function xoaThuocKhoiDon(maThuoc) {

    danhSachThuocDaKe =
        danhSachThuocDaKe.filter(
            item =>
                Number(item.maThuoc)
                !== Number(maThuoc)
        );


    renderThuocDaKe();
}


// =========================================================
// RENDER DANH SÁCH THUỐC ĐÃ KÊ
// =========================================================

function renderThuocDaKe() {

    const list =
        getElement("prescriptionList");

    const empty =
        getElement("prescriptionEmpty");

    const count =
        getElement("prescriptionCount");


    if (!list) {
        return;
    }


    list.innerHTML = "";


    if (count) {

        count.textContent =
            `${danhSachThuocDaKe.length} thuốc`;
    }


    if (danhSachThuocDaKe.length === 0) {

        empty?.classList.remove("hidden");

        return;
    }


    empty?.classList.add("hidden");


    danhSachThuocDaKe.forEach(item => {

        const element =
            document.createElement("div");


        element.className =
            "prescription-item";


        const tongTien =
            Number(item.gia || 0)
            * Number(item.soLuong || 0);


        element.innerHTML = `

            <div class="prescription-item-main">

                <div class="prescription-item-title">

                    ${escapeHtml(item.tenThuoc)}

                </div>

                <div class="prescription-item-meta">

                    <span>
                        Số lượng:
                        <strong>
                            ${escapeHtml(item.soLuong)}
                            ${escapeHtml(item.donViTinh)}
                        </strong>
                    </span>

                    <span>
                        Đơn giá:
                        <strong>
                            ${escapeHtml(dinhDangTien(item.gia))}
                        </strong>
                    </span>

                    <span>
                        Thành tiền:
                        <strong>
                            ${escapeHtml(dinhDangTien(tongTien))}
                        </strong>
                    </span>

                </div>


                ${
                    item.lieuDung
                        ? `
                            <div class="prescription-item-detail">
                                <strong>Liều dùng:</strong>
                                ${escapeHtml(item.lieuDung)}
                            </div>
                        `
                        : ""
                }


                ${
                    item.thoiGianDung
                        ? `
                            <div class="prescription-item-detail">
                                <strong>Thời gian:</strong>
                                ${escapeHtml(item.thoiGianDung)} ngày
                            </div>
                        `
                        : ""
                }


                ${
                    item.huongDanSuDung
                        ? `
                            <div class="prescription-item-detail">
                                <strong>Hướng dẫn:</strong>
                                ${escapeHtml(item.huongDanSuDung)}
                            </div>
                        `
                        : ""
                }

            </div>


            <button
                    type="button"
                    class="prescription-remove"
                    data-id="${escapeHtml(item.maThuoc)}"
                    title="Xóa thuốc"
            >

                <i class="fa-solid fa-trash"></i>

            </button>
        `;


        element
            .querySelector(".prescription-remove")
            ?.addEventListener(
                "click",
                () => xoaThuocKhoiDon(item.maThuoc)
            );


        list.appendChild(element);
    });
}


// =========================================================
// LẤY CHI TIẾT THUỐC TỪ RESPONSE BACKEND
// =========================================================

function layDanhSachChiTietDonThuoc(data) {

    if (!data) {
        return [];
    }


    const possibleLists = [

        data.danhSachThuoc,
        data.DanhSachThuoc,

        data.chiTietDonThuoc,
        data.ChiTietDonThuoc,

        data.chiTiet,
        data.ChiTiet,

        data.dsChiTiet,
        data.DsChiTiet
    ];


    for (const list of possibleLists) {

        if (Array.isArray(list)) {
            return list;
        }
    }


    if (Array.isArray(data)) {
        return data;
    }


    return [];
}


// =========================================================
// CHUYỂN CHI TIẾT BACKEND SANG DỮ LIỆU FRONTEND
// =========================================================

function chuyenChiTietDonThuoc(item) {

    const maThuoc =
        layGiaTri(
            item,
            [
                "MaThuoc",
                "maThuoc",

                "Thuoc.MaThuoc",
                "Thuoc.maThuoc",

                "thuoc.MaThuoc",
                "thuoc.maThuoc"
            ]
        );


    const thuoc =
        timThuocTheoMa(maThuoc);


    const tenThuoc =
        layGiaTri(
            item,
            [
                "TenThuoc",
                "tenThuoc",

                "Thuoc.TenThuoc",
                "Thuoc.tenThuoc",

                "thuoc.TenThuoc",
                "thuoc.tenThuoc"
            ]
        )
        || layGiaTri(
            thuoc,
            [
                "TenThuoc",
                "tenThuoc"
            ]
        )
        || `Thuốc ${maThuoc}`;


    const donViTinh =
        layGiaTri(
            item,
            [
                "DonViTinh",
                "donViTinh",

                "Thuoc.DonViTinh",
                "Thuoc.donViTinh",

                "thuoc.DonViTinh",
                "thuoc.donViTinh"
            ]
        )
        || layGiaTri(
            thuoc,
            [
                "DonViTinh",
                "donViTinh"
            ]
        )
        || "";


    const donGia =
        layGiaTri(
            item,
            [
                "DonGiaBan",
                "donGiaBan"
            ]
        )
        ?? layGiaTri(
            thuoc,
            [
                "Gia",
                "gia"
            ]
        );


    return {

        maThuoc:
            Number(maThuoc),

        tenThuoc:
            tenThuoc,

        donViTinh:
            donViTinh,

        gia:
            Number(donGia) || 0,

        soLuong:
            Number(
                layGiaTri(
                    item,
                    [
                        "SoLuong",
                        "soLuong"
                    ]
                )
            ) || 0,

        lieuDung:
            layGiaTri(
                item,
                [
                    "LieuDung",
                    "lieuDung"
                ]
            ) || "",

        thoiGianDung:
            layGiaTri(
                item,
                [
                    "ThoiGianDung",
                    "thoiGianDung"
                ]
            ),

        huongDanSuDung:
            layGiaTri(
                item,
                [
                    "HuongDanSuDung",
                    "huongDanSuDung"
                ]
            ) || ""
    };
}


// =========================================================
// TẢI ĐƠN THUỐC HIỆN TẠI
// =========================================================

async function taiDonThuoc() {

    try {

        const data = await goiApi(
            `${API_BASE}/${maLichKham}/don-thuoc`,
            {
                method: "GET",
                headers: taoHeaders()
            }
        );


        // Một số controller có thể trả:
        // { coDonThuoc: false }

        if (
            !data
            || data.coDonThuoc === false
            || data.CoDonThuoc === false
        ) {

            coDonThuoc = false;

            donThuocHienTai = null;

            danhSachThuocDaKe = [];

            ganValue(
                "prescriptionNote",
                ""
            );

            ganText(
                "prescriptionStatusText",
                "Chưa lưu đơn thuốc"
            );

            renderThuocDaKe();

            return;
        }


        coDonThuoc = true;

        donThuocHienTai =
            data.donThuoc
            || data.DonThuoc
            || data;


        const ghiChu =
            layGiaTri(
                donThuocHienTai,
                [
                    "GhiChu",
                    "ghiChu"
                ]
            );


        ganValue(
            "prescriptionNote",
            ghiChu || ""
        );


        let chiTiet =
            layDanhSachChiTietDonThuoc(data);


        if (chiTiet.length === 0) {

            chiTiet =
                layDanhSachChiTietDonThuoc(
                    donThuocHienTai
                );
        }


        danhSachThuocDaKe =
            chiTiet
                .map(chuyenChiTietDonThuoc)
                .filter(
                    item =>
                        Number.isInteger(item.maThuoc)
                        && item.maThuoc > 0
                );


        renderThuocDaKe();


        ganText(
            "prescriptionStatusText",
            "Đơn thuốc đã được lưu"
        );


        const btn =
            getElement("btnSavePrescription");


        if (btn) {

            btn.innerHTML =
                '<i class="fa-regular fa-floppy-disk"></i>'
                + "<span>Cập nhật đơn thuốc</span>";
        }


    } catch (error) {

        // Nếu backend dùng 404 để báo chưa có đơn,
        // goiApi sẽ throw.
        // Không làm hỏng toàn bộ trang.

        console.error(
            "Không thể tải đơn thuốc:",
            error
        );


        coDonThuoc = false;

        donThuocHienTai = null;

        danhSachThuocDaKe = [];

        renderThuocDaKe();


        ganText(
            "prescriptionStatusText",
            "Chưa có đơn thuốc"
        );
    }
}


// =========================================================
// BODY GỬI BACKEND
// =========================================================

function layDuLieuDonThuoc() {

    return {

        // Lấy chẩn đoán trực tiếp từ hồ sơ khám.
        chanDoan:
            getElement("diagnosis")
                ?.value.trim() || "",

        ghiChu:
            getElement("prescriptionNote")
                ?.value.trim() || null,

        danhSachThuoc:
            danhSachThuocDaKe.map(item => ({

                maThuoc:
                    Number(item.maThuoc),

                soLuong:
                    Number(item.soLuong),

                lieuDung:
                    item.lieuDung || null,

                thoiGianDung:
                    item.thoiGianDung
                        ? Number(item.thoiGianDung)
                        : null,

                huongDanSuDung:
                    item.huongDanSuDung || null
            }))
    };
}


// =========================================================
// LƯU / CẬP NHẬT ĐƠN THUỐC
// =========================================================

async function luuDonThuoc() {
    const ketQuaCLS = await kiemTraDieuKienCLS();

    if (!ketQuaCLS.duocPhep) {
        hienThiThongBao(
            ketQuaCLS.thongBao,
            "error"
        );
        return;
    }

    if (danhSachThuocDaKe.length === 0) {

        hienThiThongBao(
            "Vui lòng thêm ít nhất một thuốc vào đơn.",
            "error"
        );

        return;
    }


    const chanDoan =
        getElement("diagnosis")
            ?.value.trim();


    if (!chanDoan) {

        hienThiThongBao(
            "Vui lòng nhập chẩn đoán ở tab Thông tin khám trước khi kê đơn.",
            "error"
        );

        chuyenTab("medical");

        getElement("diagnosis")?.focus();

        return;
    }


    const btn =
        getElement("btnSavePrescription");


    try {

        if (btn) {
            btn.disabled = true;
        }


        // Lưu hồ sơ trước để chẩn đoán trên backend là mới nhất.

        const hoSoBody =
            layDuLieuHoSoTuForm();


        const hoSoMoi = await goiApi(
            `${API_BASE}/${maLichKham}/ho-so`,
            {
                method: "PUT",

                headers:
                    taoHeaders(true),

                body:
                    JSON.stringify(hoSoBody)
            }
        );


        if (hoSoMoi) {
            hienThiHoSo(hoSoMoi);
        }


        const body =
            layDuLieuDonThuoc();


        const method =
            coDonThuoc
                ? "PUT"
                : "POST";


        const data = await goiApi(
            `${API_BASE}/${maLichKham}/don-thuoc`,
            {
                method:
                    method,

                headers:
                    taoHeaders(true),

                body:
                    JSON.stringify(body)
            }
        );


        coDonThuoc = true;

        donThuocHienTai =
            data || donThuocHienTai;


        ganText(
            "prescriptionStatusText",
            "Đơn thuốc đã được lưu"
        );


        if (btn) {

            btn.innerHTML =
                '<i class="fa-regular fa-floppy-disk"></i>'
                + "<span>Cập nhật đơn thuốc</span>";
        }


        hienThiThongBao(
            method === "POST"
                ? "Đã tạo đơn thuốc."
                : "Đã cập nhật đơn thuốc."
        );


        // Đọc lại dữ liệu chuẩn từ backend.
        await taiDonThuoc();


    } catch (error) {

        console.error(error);


        hienThiThongBao(
            error.message || "Không thể lưu đơn thuốc.",
            "error"
        );


    } finally {

        if (btn && !btn.dataset.locked) {
            btn.disabled = false;
        }
    }
}


// =========================================================
// KHÓA PHẦN ĐƠN THUỐC
// =========================================================

function khoaDonThuoc() {

    const ids = [

        "medicineSelect",
        "medicineQuantity",
        "medicineDosage",
        "medicineDuration",
        "medicineInstruction",
        "prescriptionNote",
        "btnAddMedicine",
        "btnSavePrescription"
    ];


    ids.forEach(id => {

        const element =
            getElement(id);

        if (element) {

            element.disabled = true;

            element.dataset.locked = "true";
        }
    });


    document
        .querySelectorAll(".prescription-remove")
        .forEach(button => {

            button.disabled = true;

            button.dataset.locked = "true";
        });
}
// =========================================================
// LỊCH SỬ KHÁM
// =========================================================

let danhSachLichSuKham = [];

let trangLichSuHienTai = 0;
let kichThuocTrangLichSu = 5;
let tongTrangLichSu = 0;
let tongLichSu = 0;

// =========================================================
// MỞ MODAL LỊCH SỬ KHÁM
// =========================================================

async function moLichSuKham() {

    const overlay = getElement("historyOverlay");

    if (!overlay) {
        return;
    }

    overlay.classList.remove("hidden");

    document.body.classList.add("history-open");

    hienThiDanhSachLichSu();

    // Mỗi lần mở modal thì quay về trang đầu tiên.
    trangLichSuHienTai = 0;

    await taiLichSuKham(trangLichSuHienTai);
}


// =========================================================
// ĐÓNG MODAL LỊCH SỬ KHÁM
// =========================================================

function dongLichSuKham() {

    const overlay = getElement("historyOverlay");

    overlay?.classList.add("hidden");

    document.body.classList.remove("history-open");

    hienThiDanhSachLichSu();
}
// =========================================================
// CHUYỂN VỀ DANH SÁCH LỊCH SỬ
// =========================================================

function hienThiDanhSachLichSu() {

    getElement("historyListView")
        ?.classList.remove("hidden");

    getElement("historyDetailView")
        ?.classList.add("hidden");
}


// =========================================================
// CHUYỂN SANG CHI TIẾT LỊCH SỬ
// =========================================================

function hienThiManHinhChiTietLichSu() {

    getElement("historyListView")
        ?.classList.add("hidden");

    getElement("historyDetailView")
        ?.classList.remove("hidden");
}


// =========================================================
// TẢI DANH SÁCH LỊCH SỬ KHÁM - PHÂN TRANG
// =========================================================

async function taiLichSuKham(page = 0) {

    const loading = getElement("historyLoading");
    const empty = getElement("historyEmpty");
    const list = getElement("historyList");
    const pagination = getElement("historyPagination");

    loading?.classList.remove("hidden");
    empty?.classList.add("hidden");
    pagination?.classList.add("hidden");

    if (list) {
        list.innerHTML = "";
    }

    try {

        const data = await goiApi(
            `${API_BASE}/${maLichKham}/lich-su-kham?page=${page}&size=${kichThuocTrangLichSu}`,
            {
                method: "GET",
                headers: taoHeaders()
            }
        );

        danhSachLichSuKham =
            Array.isArray(data?.content)
                ? data.content
                : [];

        trangLichSuHienTai =
            Number(data?.page) || 0;

        tongTrangLichSu =
            Number(data?.totalPages) || 0;

        tongLichSu =
            Number(data?.totalElements) || 0;

        renderLichSuKham();

        renderPhanTrangLichSu();

    } catch (error) {

        console.error(
            "Không thể tải lịch sử khám:",
            error
        );

        if (empty) {

            empty.classList.remove("hidden");

            const title = empty.querySelector("h3");
            const message = empty.querySelector("p");

            if (title) {
                title.textContent =
                    "Không thể tải lịch sử khám";
            }

            if (message) {
                message.textContent =
                    error.message
                    || "Vui lòng thử lại sau.";
            }
        }

    } finally {

        loading?.classList.add("hidden");
    }
}
// =========================================================
// RENDER DANH SÁCH LỊCH SỬ KHÁM
// =========================================================

function renderLichSuKham() {

    const list = getElement("historyList");
    const empty = getElement("historyEmpty");

    if (!list) {
        return;
    }

    list.innerHTML = "";

    if (danhSachLichSuKham.length === 0) {

        empty?.classList.remove("hidden");

        const title = empty?.querySelector("h3");
        const message = empty?.querySelector("p");

        if (title) {
            title.textContent = "Chưa có lịch sử khám";
        }

        if (message) {
            message.textContent =
                "Bệnh nhân chưa có lần khám nào đã hoàn tất trước đây.";
        }

        return;
    }

    empty?.classList.add("hidden");

    danhSachLichSuKham.forEach(item => {

        const maHoSoBenhAn =
            layGiaTri(
                item,
                [
                    "maHoSoBenhAn",
                    "MaHoSoBenhAn"
                ]
            );

        const ngayKham =
            layGiaTri(
                item,
                [
                    "ngayKham",
                    "NgayKham"
                ]
            );

        const gioKham =
            layGiaTri(
                item,
                [
                    "gioKham",
                    "GioKham"
                ]
            );

        const tenKhoa =
            layGiaTri(
                item,
                [
                    "tenKhoa",
                    "TenKhoa"
                ]
            );

        const tenBacSi =
            layGiaTri(
                item,
                [
                    "tenBacSi",
                    "TenBacSi"
                ]
            );

        const lyDoKham =
            layGiaTri(
                item,
                [
                    "lyDoKham",
                    "LyDoKham"
                ]
            );

        const chanDoan =
            layGiaTri(
                item,
                [
                    "chanDoan",
                    "ChanDoan"
                ]
            );

        const element =
            document.createElement("div");

        element.className = "history-item";

        element.innerHTML = `

            <div class="history-item-date">

                <div class="history-date-day">
                    ${escapeHtml(
                        dinhDangNgay(ngayKham)
                    )}
                </div>

                ${
                    gioKham
                        ? `
                            <div class="history-date-time">
                                ${escapeHtml(
                                    String(gioKham)
                                        .substring(0, 5)
                                )}
                            </div>
                        `
                        : ""
                }

            </div>

            <div class="history-item-info">

                <div class="history-item-meta">

                    <span>
                        <i class="fa-solid fa-building"></i>
                        ${escapeHtml(
                            tenKhoa || "---"
                        )}
                    </span>

                    <span>
                        <i class="fa-solid fa-user-doctor"></i>
                        ${
                            escapeHtml(
                                tenBacSi
                                    ? `BS. ${tenBacSi}`
                                    : "---"
                            )
                        }
                    </span>

                </div>

                ${
                    lyDoKham
                        ? `
                            <div class="history-item-reason">
                                <strong>Lý do khám:</strong>
                                ${escapeHtml(lyDoKham)}
                            </div>
                        `
                        : ""
                }

                <div class="history-item-diagnosis">

                    <strong>Chẩn đoán:</strong>

                    ${escapeHtml(
                        chanDoan || "Chưa có chẩn đoán"
                    )}

                </div>

            </div>

            <div class="history-item-action">

                <button
                    type="button"
                    class="history-detail-button"
                >
                    Xem chi tiết
                    <i class="fa-solid fa-chevron-right"></i>
                </button>

            </div>
        `;

        element
            .querySelector(".history-detail-button")
            ?.addEventListener(
                "click",
                () => {
                    xemChiTietLichSuKham(
                        maHoSoBenhAn
                    );
                }
            );

        list.appendChild(element);
    });
}
// =========================================================
// RENDER PHÂN TRANG LỊCH SỬ KHÁM
// =========================================================

function renderPhanTrangLichSu() {

    const pagination =
        getElement("historyPagination");

    const pageNumbers =
        getElement("historyPageNumbers");

    const btnPrev =
        getElement("btnHistoryPrev");

    const btnNext =
        getElement("btnHistoryNext");

    if (!pagination || !pageNumbers) {
        return;
    }

    pageNumbers.innerHTML = "";

    // Không có dữ liệu thì không hiện phân trang.
    if (tongLichSu === 0 || tongTrangLichSu === 0) {

        pagination.classList.add("hidden");

        return;
    }

    pagination.classList.remove("hidden");

    if (btnPrev) {
        btnPrev.disabled =
            trangLichSuHienTai <= 0;
    }

    if (btnNext) {
        btnNext.disabled =
            trangLichSuHienTai >= tongTrangLichSu - 1;
    }


    // Hiển thị tối đa 5 nút số trang.
    let startPage =
        Math.max(
            0,
            trangLichSuHienTai - 2
        );

    let endPage =
        Math.min(
            tongTrangLichSu - 1,
            startPage + 4
        );


    // Nếu đang ở gần cuối thì lùi startPage lại.
    startPage =
        Math.max(
            0,
            endPage - 4
        );


    for (
        let page = startPage;
        page <= endPage;
        page++
    ) {

        const button =
            document.createElement("button");

        button.type = "button";

        button.className =
            "history-page-number";

        button.textContent =
            String(page + 1);


        if (page === trangLichSuHienTai) {

            button.classList.add("active");

            button.disabled = true;
        }


        button.addEventListener(
            "click",
            () => chuyenTrangLichSu(page)
        );


        pageNumbers.appendChild(button);
    }
}


// =========================================================
// CHUYỂN TRANG LỊCH SỬ
// =========================================================

async function chuyenTrangLichSu(page) {

    if (
        page < 0
        || page >= tongTrangLichSu
        || page === trangLichSuHienTai
    ) {
        return;
    }

    await taiLichSuKham(page);
}

// =========================================================
// TẢI CHI TIẾT MỘT LẦN KHÁM CŨ
// =========================================================

async function xemChiTietLichSuKham(maHoSoBenhAn) {

    if (!maHoSoBenhAn) {

        hienThiThongBao(
            "Không tìm thấy mã hồ sơ bệnh án.",
            "error"
        );

        return;
    }


    const loading =
        getElement("historyDetailLoading");

    const detail =
        getElement("historyDetail");


    hienThiManHinhChiTietLichSu();

    loading?.classList.remove("hidden");

    if (detail) {
        detail.innerHTML = "";
    }


    try {

        const data = await goiApi(
            `${API_BASE}/${maLichKham}/lich-su-kham/${maHoSoBenhAn}`,
            {
                method: "GET",
                headers: taoHeaders()
            }
        );

        renderChiTietLichSuKham(data);

    } catch (error) {

        console.error(
            "Không thể tải chi tiết lịch sử khám:",
            error
        );

        if (detail) {

            detail.innerHTML = `

                <div class="history-detail-empty">

                    <i class="fa-solid fa-circle-exclamation"></i>

                    <p>
                        ${escapeHtml(
                            error.message
                            || "Không thể tải hồ sơ khám."
                        )}
                    </p>

                </div>

            `;
        }

    } finally {

        loading?.classList.add("hidden");
    }
}


// =========================================================
// RENDER CHI TIẾT LỊCH SỬ KHÁM
// =========================================================

function renderChiTietLichSuKham(data) {

    const detail =
        getElement("historyDetail");

    if (!detail || !data) {
        return;
    }


    const ngayKham =
        layGiaTri(
            data,
            [
                "ngayKham",
                "NgayKham"
            ]
        );

    const gioKham =
        layGiaTri(
            data,
            [
                "gioKham",
                "GioKham"
            ]
        );

    const tenKhoa =
        layGiaTri(
            data,
            [
                "tenKhoa",
                "TenKhoa"
            ]
        );

    const tenBacSi =
        layGiaTri(
            data,
            [
                "tenBacSi",
                "TenBacSi"
            ]
        );

    const lyDoKham =
        layGiaTri(
            data,
            [
                "lyDoKham",
                "LyDoKham"
            ]
        );

    const trieuChung =
        layGiaTri(
            data,
            [
                "trieuChung",
                "TrieuChung"
            ]
        );

    const chanDoan =
        layGiaTri(
            data,
            [
                "chanDoan",
                "ChanDoan"
            ]
        );

    const ketLuan =
        layGiaTri(
            data,
            [
                "ketLuan",
                "KetLuan"
            ]
        );

    const huongDieuTri =
        layGiaTri(
            data,
            [
                "huongDieuTri",
                "HuongDieuTri"
            ]
        );

    const ngayTaiKham =
        layGiaTri(
            data,
            [
                "ngayTaiKham",
                "NgayTaiKham"
            ]
        );

    const ghiChuTaiKham =
        layGiaTri(
            data,
            [
                "ghiChuTaiKham",
                "GhiChuTaiKham"
            ]
        );


    const canLamSang =
        layGiaTri(
            data,
            [
                "canLamSang",
                "CanLamSang"
            ]
        );


    const coDonThuocLichSu =
        layGiaTri(
            data,
            [
                "coDonThuoc",
                "CoDonThuoc"
            ]
        );


    const donThuoc =
        layGiaTri(
            data,
            [
                "donThuoc",
                "DonThuoc"
            ]
        );


    detail.innerHTML = `

        <div class="history-detail-head">

            <div class="history-detail-date">

                <i class="fa-regular fa-calendar-check"></i>

                <div>

                    <strong>
                        ${escapeHtml(dinhDangNgay(ngayKham))}
                    </strong>

                    ${
                        gioKham
                            ? `
                                <span>
                                    ${escapeHtml(String(gioKham).substring(0, 5))}
                                </span>
                            `
                            : ""
                    }

                </div>

            </div>


            <div class="history-detail-meta">

                <span>
                    <i class="fa-solid fa-building"></i>
                    ${escapeHtml(tenKhoa || "---")}
                </span>

                <span>
                    <i class="fa-solid fa-user-doctor"></i>
                    ${escapeHtml(
                        tenBacSi
                            ? `BS. ${tenBacSi}`
                            : "---"
                    )}
                </span>

            </div>

        </div>


        <section class="history-section">

            <h3>
                <i class="fa-regular fa-file-lines"></i>
                Thông tin khám
            </h3>

            ${taoDongChiTietLichSu(
                "Lý do khám",
                lyDoKham
            )}

            ${taoDongChiTietLichSu(
                "Triệu chứng",
                trieuChung
            )}

            ${taoDongChiTietLichSu(
                "Chẩn đoán",
                chanDoan
            )}

            ${taoDongChiTietLichSu(
                "Kết luận",
                ketLuan
            )}

            ${taoDongChiTietLichSu(
                "Hướng điều trị",
                huongDieuTri
            )}

        </section>


        <section class="history-section">

            <h3>
                <i class="fa-solid fa-flask-vial"></i>
                Cận lâm sàng
            </h3>

            ${renderCanLamSangLichSu(canLamSang)}

        </section>


        <section class="history-section">

            <h3>
                <i class="fa-solid fa-prescription-bottle-medical"></i>
                Đơn thuốc
            </h3>

            ${
                renderDonThuocLichSu(
                    coDonThuocLichSu,
                    donThuoc
                )
            }

        </section>


        <section class="history-section">

            <h3>
                <i class="fa-regular fa-calendar-check"></i>
                Tái khám
            </h3>

            ${
                ngayTaiKham
                    ? taoDongChiTietLichSu(
                        "Ngày tái khám",
                        dinhDangNgay(ngayTaiKham)
                    )
                    : `
                        <div class="history-section-empty">
                            Không có lịch tái khám.
                        </div>
                    `
            }

            ${
                ghiChuTaiKham
                    ? taoDongChiTietLichSu(
                        "Ghi chú",
                        ghiChuTaiKham
                    )
                    : ""
            }

        </section>

    `;
}


// =========================================================
// TẠO DÒNG THÔNG TIN CHI TIẾT
// =========================================================

function taoDongChiTietLichSu(label, value) {

    return `

        <div class="history-field">

            <span class="history-field-label">
                ${escapeHtml(label)}
            </span>

            <div class="history-field-value">
                ${escapeHtml(value || "---")}
            </div>

        </div>

    `;
}


// =========================================================
// RENDER CẬN LÂM SÀNG LỊCH SỬ
// =========================================================

function renderCanLamSangLichSu(data) {

    if (!Array.isArray(data) || data.length === 0) {

        return `

            <div class="history-section-empty">

                <i class="fa-solid fa-flask-vial"></i>

                <span>
                    Không có chỉ định cận lâm sàng.
                </span>

            </div>

        `;
    }


    return data.map(item => {

        const tenDichVu =
            layGiaTri(
                item,
                [
                    "tenDichVu",
                    "TenDichVu",
                    "dichVuYTe.tenDichVu",
                    "DichVuYTe.TenDichVu"
                ]
            )
            || "Dịch vụ cận lâm sàng";


        const loaiChiDinh =
            layGiaTri(
                item,
                [
                    "loaiChiDinh",
                    "LoaiChiDinh"
                ]
            );


        const ngayChiDinh =
            layGiaTri(
                item,
                [
                    "ngayChiDinh",
                    "NgayChiDinh"
                ]
            );


        const coKetQua =
            layGiaTri(
                item,
                [
                    "coKetQua",
                    "CoKetQua"
                ]
            );


        const ketQua =
            layGiaTri(
                item,
                [
                    "ketQua",
                    "KetQua"
                ]
            );


        let ketQuaHtml = `

            <div class="history-clinical-no-result">
                Chưa có kết quả.
            </div>

        `;


        if (coKetQua && ketQua) {

            const noiDungKetQua =
                layGiaTri(
                    ketQua,
                    [
                        "noiDungKetQua",
                        "NoiDungKetQua"
                    ]
                );

            const ketLuanKetQua =
                layGiaTri(
                    ketQua,
                    [
                        "ketLuan",
                        "KetLuan"
                    ]
                );

            const ngayCoKetQua =
                layGiaTri(
                    ketQua,
                    [
                        "ngayCoKetQua",
                        "NgayCoKetQua"
                    ]
                );


            ketQuaHtml = `

                <div class="history-clinical-result">

                    ${
                        ngayCoKetQua
                            ? `
                                <div>
                                    <strong>Ngày có kết quả:</strong>
                                    ${escapeHtml(
                                        dinhDangNgayGio(ngayCoKetQua)
                                    )}
                                </div>
                            `
                            : ""
                    }

                    <div>
                        <strong>Nội dung kết quả:</strong>
                        ${escapeHtml(noiDungKetQua || "---")}
                    </div>

                    <div>
                        <strong>Kết luận:</strong>
                        ${escapeHtml(ketLuanKetQua || "---")}
                    </div>

                </div>

            `;
        }


        return `

            <div class="history-clinical-item">

                <div class="history-clinical-title">
                    ${escapeHtml(tenDichVu)}
                </div>

                ${
                    loaiChiDinh
                        ? `
                            <div class="history-clinical-meta">
                                ${escapeHtml(loaiChiDinh)}
                            </div>
                        `
                        : ""
                }

                ${
                    ngayChiDinh
                        ? `
                            <div class="history-clinical-meta">
                                Chỉ định:
                                ${escapeHtml(
                                    dinhDangNgayGio(ngayChiDinh)
                                )}
                            </div>
                        `
                        : ""
                }

                ${ketQuaHtml}

            </div>

        `;

    }).join("");
}


// =========================================================
// RENDER ĐƠN THUỐC LỊCH SỬ
// =========================================================

function renderDonThuocLichSu(
    coDonThuocLichSu,
    donThuoc
) {

    if (!coDonThuocLichSu || !donThuoc) {

        return `

            <div class="history-section-empty">

                <i class="fa-solid fa-pills"></i>

                <span>
                    Không có đơn thuốc.
                </span>

            </div>

        `;
    }


    const ghiChu =
        layGiaTri(
            donThuoc,
            [
                "ghiChu",
                "GhiChu"
            ]
        );


    const danhSach =
        layDanhSachChiTietDonThuoc(
            donThuoc
        );


    let danhSachHtml = "";


    if (danhSach.length === 0) {

        danhSachHtml = `

            <div class="history-section-empty">
                Không có chi tiết thuốc.
            </div>

        `;

    } else {

        danhSachHtml =
            danhSach
                .map(item => {

                    const thuoc =
                        chuyenChiTietDonThuoc(item);


                    return `

                        <div class="history-medicine-item">

                            <div class="history-medicine-name">

                                <i class="fa-solid fa-capsules"></i>

                                ${escapeHtml(
                                    thuoc.tenThuoc
                                )}

                            </div>


                            <div class="history-medicine-grid">

                                <div>
                                    <span>Số lượng</span>
                                    <strong>
                                        ${escapeHtml(
                                            thuoc.soLuong
                                        )}
                                        ${escapeHtml(
                                            thuoc.donViTinh
                                        )}
                                    </strong>
                                </div>


                                <div>
                                    <span>Liều dùng</span>
                                    <strong>
                                        ${escapeHtml(
                                            thuoc.lieuDung || "---"
                                        )}
                                    </strong>
                                </div>


                                <div>
                                    <span>Thời gian dùng</span>
                                    <strong>
                                        ${
                                            thuoc.thoiGianDung
                                                ? `${escapeHtml(
                                                    thuoc.thoiGianDung
                                                )} ngày`
                                                : "---"
                                        }
                                    </strong>
                                </div>


                                <div>
                                    <span>Hướng dẫn</span>
                                    <strong>
                                        ${escapeHtml(
                                            thuoc.huongDanSuDung
                                            || "---"
                                        )}
                                    </strong>
                                </div>

                            </div>

                        </div>

                    `;

                })
                .join("");
    }


    return `

        ${danhSachHtml}

        ${
            ghiChu
                ? `
                    <div class="history-prescription-note">

                        <strong>
                            Ghi chú đơn thuốc
                        </strong>

                        <p>
                            ${escapeHtml(ghiChu)}
                        </p>

                    </div>
                `
                : ""
        }

    `;
}
// =========================================================
// QUAY VỀ DANH SÁCH CHỜ KHÁM
// =========================================================

function quayLaiDanhSach() {

    window.location.href =
        "/auth/bac-si/kham-benh";
}


// =========================================================
// ĐĂNG XUẤT
// =========================================================

function dangXuat() {

    const keys = [

        "token",
        "Token",

        "HoTen",
        "VaiTro",

        "MaNguoiDung",
        "TenDangNhap",

        "Email",
        "AnhDaiDien"
    ];


    keys.forEach(key => {

        localStorage.removeItem(key);

        sessionStorage.removeItem(key);
    });


    window.location.href =
        "/auth/login";
}


// =========================================================
// GẮN EVENT
// =========================================================

function ganSuKien() {

    getElement("btnBack")
        ?.addEventListener(
            "click",
            quayLaiDanhSach
        );


    getElement("btnCancel")
        ?.addEventListener(
            "click",
            quayLaiDanhSach
        );


    getElement("btnLogout")
        ?.addEventListener(
            "click",
            dangXuat
        );


    getElement("tabMedical")
        ?.addEventListener(
            "click",
            () => chuyenTab("medical")
        );


    getElement("btnGoClinical")
        ?.addEventListener("click", async () => {

            if (!maLichKham) {
                hienThiThongBao(
                    "Không tìm thấy mã lịch khám.",
                    "error"
                );
                return;
            }

            const button = getElement("btnGoClinical");

            try {
                if (button) button.disabled = true;

                // Lưu thông tin khám trước khi chuyển trang
                const body = layDuLieuHoSoTuForm();

                await goiApi(
                    `${API_BASE}/${maLichKham}/ho-so`,
                    {
                        method: "PUT",
                        headers: taoHeaders(true),
                        body: JSON.stringify(body)
                    }
                );

                // Chuyển sang trang cận lâm sàng riêng
                window.location.href =
                    `/auth/bac-si/kham-benh/${maLichKham}/can-lam-sang`;

            } catch (error) {
                console.error(error);

                hienThiThongBao(
                    error.message ||
                    "Không thể lưu hồ sơ trước khi chuyển trang.",
                    "error"
                );

                if (button) button.disabled = false;
            }
        });

    getElement("tabPrescription")
        ?.addEventListener(
            "click",
            () => chuyenTab("prescription")
        );


    getElement("medicineSelect")
        ?.addEventListener(
            "change",
            hienThiThongTinThuocDangChon
        );


    getElement("btnAddMedicine")
        ?.addEventListener(
            "click",
            themThuocVaoDon
        );


    getElement("btnSavePrescription")
        ?.addEventListener(
            "click",
            luuDonThuoc
        );


    getElement("btnSave")
        ?.addEventListener(
            "click",
            luuHoSo
        );


    getElement("btnComplete")
        ?.addEventListener(
            "click",
            hoanTatKham
        );


    getElement("btnOpenOrderForm")
        ?.addEventListener(
            "click",
            moFormChiDinh
        );


    getElement("btnCancelOrder")
        ?.addEventListener(
            "click",
            dongFormChiDinh
        );


    getElement("btnCreateOrder")
        ?.addEventListener(
            "click",
            taoChiDinh
        );

        // ================================
        // LỊCH SỬ KHÁM
        // ================================

        getElement("btnHistory")
            ?.addEventListener(
                "click",
                moLichSuKham
            );


        getElement("btnCloseHistory")
            ?.addEventListener(
                "click",
                dongLichSuKham
            );


        getElement("historyOverlay")
            ?.addEventListener(
                "click",
                event => {

                    if (
                        event.target
                        === getElement("historyOverlay")
                    ) {
                        dongLichSuKham();
                    }
                }
            );


        getElement("btnBackHistory")
            ?.addEventListener(
                "click",
                hienThiDanhSachLichSu
            );

        getElement("btnHistoryPrev")
            ?.addEventListener(
                "click",
                () => {

                    if (trangLichSuHienTai > 0) {

                        chuyenTrangLichSu(
                            trangLichSuHienTai - 1
                        );
                    }
                }
            );


        getElement("btnHistoryNext")
            ?.addEventListener(
                "click",
                () => {

                    if (
                        trangLichSuHienTai
                        < tongTrangLichSu - 1
                    ) {

                        chuyenTrangLichSu(
                            trangLichSuHienTai + 1
                        );
                    }
                }
            );
}


// =========================================================
// KHỞI TẠO TRANG
// =========================================================

async function khoiTaoTrang() {

    maLichKham =
        layMaLichKhamTuUrl();


    if (!maLichKham) {

        hienThiThongBao(
            "Không tìm thấy mã lịch khám trên đường dẫn.",
            "error"
        );

        return;
    }


    hienThiThongTinBacSi();

    ganSuKien();

    chuyenTab("medical");


    try {

        hienThiLoading(true);


        // Tải dịch vụ trước để tab CLS sẵn sàng.
       // Tải dịch vụ cận lâm sàng.
       await taiDanhSachDichVu();


       // Tải danh sách thuốc.
       await taiDanhSachThuoc();


       // Lấy hồ sơ của lần khám.
       await taiHoSo();


       // Lấy đơn thuốc hiện tại nếu đã có.
       // Lấy đơn thuốc hiện tại nếu đã có.
       await taiDonThuoc();

       // Kiểm tra CLS và cập nhật trạng thái các nút.
       const ketQuaCLS = await capNhatKhoaCLS();

       // Kiểm tra tab được yêu cầu từ URL.
       const tabDuocChon =
           new URLSearchParams(window.location.search)
               .get("tab");

       if (tabDuocChon === "prescription") {
           if (ketQuaCLS.duocPhep) {
               await chuyenTab("prescription");
           } else {
               hienThiThongBao(
                   ketQuaCLS.thongBao,
                   "error"
               );
           }
       }


    } catch (error) {

        console.error(error);


        hienThiThongBao(
            error.message
            || "Không thể tải thông tin khám bệnh.",
            "error"
        );


    } finally {

        hienThiLoading(false);
    }

}


// =========================================================
// START
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    khoiTaoTrang
);