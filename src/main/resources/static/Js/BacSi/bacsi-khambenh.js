/* =====================================================
   CẤU HÌNH API
===================================================== */

const API_BASE = "/api/bac-si/kham-benh";


/* =====================================================
   BIẾN TOÀN CỤC
===================================================== */

let danhSachBenhNhan = [];
let lichKhamDangChon = null;

let danhSachDichVu = [];
let danhSachChiDinh = [];

let hoSoDangKhoa = false;


/* =====================================================
   DOM - DANH SÁCH BỆNH NHÂN
===================================================== */

const patientTableBody =
    document.getElementById("patientTableBody");

const loadingState =
    document.getElementById("loadingState");

const emptyState =
    document.getElementById("emptyState");

const totalPatients =
    document.getElementById("totalPatients");

const waitingCount =
    document.getElementById("waitingCount");

const examiningCount =
    document.getElementById("examiningCount");

const completedCount =
    document.getElementById("completedCount");

const btnRefresh =
    document.getElementById("btnRefresh");

const patientSearch =
    document.getElementById("patientSearch");

const currentDate =
    document.getElementById("currentDate");


/* =====================================================
   DOM - MODAL
===================================================== */

const examModal =
    document.getElementById("examModal");

const btnCloseModal =
    document.getElementById("btnCloseModal");

const btnCancelExam =
    document.getElementById("btnCancelExam");

const btnSaveMedicalRecord =
    document.getElementById("btnSaveMedicalRecord");

const btnCompleteExam =
    document.getElementById("btnCompleteExam");


/* =====================================================
   DOM - THÔNG TIN BỆNH NHÂN
===================================================== */

const modalPatientName =
    document.getElementById("modalPatientName");

const modalPatientId =
    document.getElementById("modalPatientId");

const modalBirthDate =
    document.getElementById("modalBirthDate");

const modalGender =
    document.getElementById("modalGender");

const modalStatus =
    document.getElementById("modalStatus");


/* =====================================================
   DOM - FORM HỒ SƠ
===================================================== */

const trieuChung =
    document.getElementById("trieuChung");

const chanDoan =
    document.getElementById("chanDoan");

const ketLuan =
    document.getElementById("ketLuan");

const huongDieuTri =
    document.getElementById("huongDieuTri");

const ngayTaiKham =
    document.getElementById("ngayTaiKham");

const ghiChuTaiKham =
    document.getElementById("ghiChuTaiKham");


/* =====================================================
   DOM - TAB
===================================================== */

const tabMedicalInfo =
    document.getElementById("tabMedicalInfo");

const tabClinical =
    document.getElementById("tabClinical");

const medicalTabContent =
    document.getElementById("medicalTabContent");

const clinicalTabContent =
    document.getElementById("clinicalTabContent");


/* =====================================================
   DOM - CẬN LÂM SÀNG
===================================================== */

const dichVuSelect =
    document.getElementById("dichVuSelect");

const maPhongChiDinh =
    document.getElementById("maPhongChiDinh");

const btnCreateOrder =
    document.getElementById("btnCreateOrder");

const btnRefreshOrders =
    document.getElementById("btnRefreshOrders");

const selectedServiceInfo =
    document.getElementById("selectedServiceInfo");

const selectedServiceName =
    document.getElementById("selectedServiceName");

const selectedServiceType =
    document.getElementById("selectedServiceType");

const selectedServicePrice =
    document.getElementById("selectedServicePrice");

const clinicalOrderBody =
    document.getElementById("clinicalOrderBody");

const clinicalOrderLoading =
    document.getElementById("clinicalOrderLoading");

const clinicalOrderEmpty =
    document.getElementById("clinicalOrderEmpty");


/* =====================================================
   TOKEN
===================================================== */

function layToken() {

    return localStorage.getItem("token")
        || localStorage.getItem("Token")
        || sessionStorage.getItem("token")
        || sessionStorage.getItem("Token");
}


/* =====================================================
   FETCH CÓ JWT
===================================================== */

async function apiFetch(url, options = {}) {

    const token = layToken();

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers: headers
    });

    let data = null;

    const contentType =
        response.headers.get("content-type");

    if (
        contentType &&
        contentType.includes("application/json")
    ) {

        data = await response.json();

    } else {

        const text = await response.text();

        data = {
            message: text
        };
    }

    if (!response.ok) {

        const message =
            data?.message ||
            "Có lỗi xảy ra khi xử lý yêu cầu.";

        throw new Error(message);
    }

    return data;
}


/* =====================================================
   NGÀY HIỆN TẠI
===================================================== */

function hienThiNgayHienTai() {

    const today = new Date();

    if (currentDate) {

        currentDate.textContent =
            today.toLocaleDateString("vi-VN");
    }
}


/* =====================================================
   FORMAT NGÀY
===================================================== */

function formatDate(dateString) {

    if (!dateString) {
        return "---";
    }

    const parts =
        String(dateString).split("-");

    if (parts.length !== 3) {
        return dateString;
    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}


/* =====================================================
   FORMAT GIỜ
===================================================== */

function formatTime(time) {

    if (!time) {
        return "---";
    }

    return String(time).substring(0, 5);
}


/* =====================================================
   FORMAT NGÀY GIỜ
===================================================== */

function formatDateTime(value) {

    if (!value) {
        return "---";
    }

    try {

        const date =
            new Date(value);

        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return date.toLocaleString("vi-VN");

    } catch (error) {

        return value;
    }
}


/* =====================================================
   FORMAT TIỀN
===================================================== */

function formatMoney(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "---";
    }

    const number =
        Number(value);

    if (Number.isNaN(number)) {
        return value;
    }

    return new Intl.NumberFormat(
        "vi-VN",
        {
            style: "currency",
            currency: "VND"
        }
    ).format(number);
}


/* =====================================================
   LOAD THỐNG KÊ
===================================================== */

async function loadThongKe() {

    try {

        const data =
            await apiFetch(
                `${API_BASE}/thong-ke`
            );

        if (waitingCount) {

            waitingCount.textContent =
                data.choKham ?? 0;
        }

        if (examiningCount) {

            examiningCount.textContent =
                data.dangKham ?? 0;
        }

        if (completedCount) {

            completedCount.textContent =
                data.daHoanThanh ?? 0;
        }

    } catch (error) {

        console.error(
            "Không thể tải thống kê:",
            error
        );

        if (waitingCount) {
            waitingCount.textContent = "0";
        }

        if (examiningCount) {
            examiningCount.textContent = "0";
        }

        if (completedCount) {
            completedCount.textContent = "0";
        }
    }
}


/* =====================================================
   LOAD DANH SÁCH CHỜ + ĐANG KHÁM
===================================================== */

async function loadDanhSachBenhNhan() {

    if (loadingState) {
        loadingState.classList.remove("hidden");
    }

    if (emptyState) {
        emptyState.classList.add("hidden");
    }

    if (patientTableBody) {
        patientTableBody.innerHTML = "";
    }

    try {

        const [
            danhSachCho,
            danhSachDangKham
        ] = await Promise.all([

            apiFetch(
                `${API_BASE}/danh-sach-cho-kham`
            ),

            apiFetch(
                `${API_BASE}/danh-sach-dang-kham`
            )

        ]);

        const choKham =
            Array.isArray(danhSachCho)
                ? danhSachCho
                : [];

        const dangKham =
            Array.isArray(danhSachDangKham)
                ? danhSachDangKham
                : [];

        danhSachBenhNhan = [
            ...dangKham,
            ...choKham
        ];

        renderDanhSach(
            danhSachBenhNhan
        );

        if (totalPatients) {

            totalPatients.textContent =
                danhSachBenhNhan.length;
        }

    } catch (error) {

        console.error(error);

        danhSachBenhNhan = [];

        renderDanhSach([]);

        showToast(
            "Không thể tải dữ liệu",
            error.message,
            true
        );

        if (!layToken()) {

            showToast(
                "Chưa đăng nhập",
                "Không tìm thấy JWT Token. Hãy đăng nhập trước.",
                true
            );
        }

    } finally {

        if (loadingState) {
            loadingState.classList.add("hidden");
        }
    }
}


/* =====================================================
   LÀM MỚI TOÀN BỘ DỮ LIỆU
===================================================== */

async function lamMoiDuLieu() {

    if (btnRefresh) {
        btnRefresh.disabled = true;
    }

    try {

        await Promise.all([
            loadDanhSachBenhNhan(),
            loadThongKe()
        ]);

    } finally {

        if (btnRefresh) {
            btnRefresh.disabled = false;
        }
    }
}


/* =====================================================
   RENDER DANH SÁCH BỆNH NHÂN
===================================================== */

function renderDanhSach(list) {

    if (!patientTableBody) {
        return;
    }

    patientTableBody.innerHTML = "";

    if (!list || list.length === 0) {

        if (emptyState) {
            emptyState.classList.remove("hidden");
        }

        if (totalPatients) {
            totalPatients.textContent = "0";
        }

        return;
    }

    if (emptyState) {
        emptyState.classList.add("hidden");
    }

    list.forEach((benhNhan, index) => {

        const row =
            document.createElement("tr");

        const dangKham = benhNhan.trangThai === "DangKham";
        const choCLS = benhNhan.trangThai === "ChoCLS";

        const badgeClass =
            dangKham ? "badge badge-blue" :
            choCLS ? "badge badge-orange" :
            "badge badge-orange";

        const tenTrangThai =
            dangKham ? "Đang khám" :
            choCLS ? "Chờ CLS" :
            "Chờ khám";

        const tenNut =
            dangKham ? "Tiếp tục khám" :
            choCLS ? "Xem hồ sơ" :
            "Bắt đầu khám";

        const hamXuLy =
            (dangKham || choCLS)
                ? `tiepTucKham(${benhNhan.maLichKham})`
                : `batDauKham(${benhNhan.maLichKham})`;
        row.innerHTML = `

            <td>
                ${benhNhan.soThuTu ?? index + 1}
            </td>

            <td>

                <div class="patient-name">

                    <strong>
                        ${escapeHtml(
                            benhNhan.hoTen
                        )}
                    </strong>

                    <span>
                        BN${String(
                            benhNhan.maBenhNhan
                        ).padStart(6, "0")}
                    </span>

                </div>

            </td>

            <td>
                ${formatDate(
                    benhNhan.ngaySinh
                )}
            </td>

            <td>
                ${escapeHtml(
                    benhNhan.gioiTinh
                )}
            </td>

            <td>
                ${formatTime(
                    benhNhan.gioKham
                )}
            </td>

            <td
                class="reason"
                title="${escapeHtml(
                    benhNhan.lyDoKham
                )}"
            >
                ${escapeHtml(
                    benhNhan.lyDoKham
                )}
            </td>

            <td>
                <span class="${badgeClass}">
                    ${tenTrangThai}
                </span>
            </td>

            <td>

                <button
                    type="button"
                    class="action-button"
                    onclick="${hamXuLy}"
                >
                    ${tenNut}
                </button>

            </td>

        `;

        patientTableBody.appendChild(
            row
        );
    });

    if (totalPatients) {

        totalPatients.textContent =
            list.length;
    }
}
/* =====================================================
   TÌM BỆNH NHÂN THEO LỊCH
===================================================== */

function timBenhNhanTheoLich(maLichKham) {

    return danhSachBenhNhan.find(
        item =>
            Number(item.maLichKham) ===
            Number(maLichKham)
    );
}


// =========================================================
// BẮT ĐẦU KHÁM
// =========================================================

async function batDauKham(maLichKham) {

    const patient = timBenhNhanTheoLich(maLichKham);

    if (!patient) {
        showToast(
            "Không tìm thấy",
            "Không tìm thấy thông tin bệnh nhân.",
            true
        );
        return;
    }

    // Đang khám hoặc chờ CLS thì mở lại trang khám
    // Không được gọi API bắt đầu khám lần nữa
    if (
        patient.trangThai === "DangKham" ||
        patient.trangThai === "ChoCLS"
    ) {
        tiepTucKham(maLichKham);
        return;
    }


    const result = await Swal.fire({
        title: "Xác nhận bắt đầu khám",
        text: `Bạn có muốn bắt đầu khám cho bệnh nhân ${patient.hoTen} không?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Bắt đầu khám",
        cancelButtonText: "Hủy",
        confirmButtonColor: "#2563eb",
        cancelButtonColor: "#64748b",
        reverseButtons: true,
        allowOutsideClick: false
    });

if (!result.isConfirmed) {
    return;
}

    try {
        // Bắt đầu khám và tạo hồ sơ bệnh án
        await apiFetch(
            `${API_BASE}/${maLichKham}/bat-dau`,
            {
                method: "POST"
            }
        );

        // Chuyển đến trang khám bệnh riêng
        window.location.href =
            `/auth/bac-si/kham-benh/${maLichKham}`;

    } catch (error) {
        showToast(
            "Không thể bắt đầu khám",
            error.message,
            true
        );
    }
}

// =========================================================
// TIẾP TỤC CA ĐANG KHÁM
// =========================================================

function tiepTucKham(maLichKham) {

    if (!maLichKham) {

        showToast(
            "Không tìm thấy",
            "Không tìm thấy mã lịch khám.",
            true
        );

        return;
    }


    // Chuyển sang trang khám bệnh riêng.

    window.location.href =
        `/auth/bac-si/kham-benh/${maLichKham}`;
}

/* =====================================================
   ĐIỀN THÔNG TIN BỆNH NHÂN
===================================================== */

function dienThongTinBenhNhan(patient) {

    if (modalPatientName) {

        modalPatientName.textContent =
            patient.hoTen || "---";
    }

    if (modalPatientId) {

        modalPatientId.textContent =
            `BN${String(
                patient.maBenhNhan
            ).padStart(6, "0")}`;
    }

    if (modalBirthDate) {

        modalBirthDate.textContent =
            formatDate(
                patient.ngaySinh
            );
    }

    if (modalGender) {

        modalGender.textContent =
            patient.gioiTinh || "---";
    }
}


/* =====================================================
   LOAD HỒ SƠ
===================================================== */

async function loadHoSo(maLichKham) {

    try {

        const data =
            await apiFetch(
                `${API_BASE}/${maLichKham}/ho-so`
            );

        if (trieuChung) {
            trieuChung.value =
                data.trieuChung || "";
        }

        if (chanDoan) {
            chanDoan.value =
                data.chanDoan || "";
        }

        if (ketLuan) {
            ketLuan.value =
                data.ketLuan || "";
        }

        if (huongDieuTri) {
            huongDieuTri.value =
                data.huongDieuTri || "";
        }

        if (ngayTaiKham) {
            ngayTaiKham.value =
                data.ngayTaiKham || "";
        }

        if (ghiChuTaiKham) {
            ghiChuTaiKham.value =
                data.ghiChuTaiKham || "";
        }

        capNhatTrangThaiHoSo(
            data.trangThai
        );

        return data;

    } catch (error) {

        showToast(
            "Không thể tải hồ sơ",
            error.message,
            true
        );

        throw error;
    }
}


/* =====================================================
   TRẠNG THÁI HỒ SƠ
===================================================== */

function capNhatTrangThaiHoSo(trangThai) {

    hoSoDangKhoa =
        trangThai === "HoanTat";

    if (modalStatus) {

        if (hoSoDangKhoa) {

            modalStatus.textContent =
                "Hoàn tất";

            modalStatus.className =
                "badge badge-green";

        } else {

            modalStatus.textContent =
                "Đang khám";

            modalStatus.className =
                "badge badge-blue";
        }
    }

    khoaForm(
        hoSoDangKhoa
    );
}


/* =====================================================
   KHÓA FORM
===================================================== */

function khoaForm(khoa) {

    if (trieuChung) {
        trieuChung.disabled = khoa;
    }

    if (chanDoan) {
        chanDoan.disabled = khoa;
    }

    if (ketLuan) {
        ketLuan.disabled = khoa;
    }

    if (huongDieuTri) {
        huongDieuTri.disabled = khoa;
    }

    if (ngayTaiKham) {
        ngayTaiKham.disabled = khoa;
    }

    if (ghiChuTaiKham) {
        ghiChuTaiKham.disabled = khoa;
    }

    if (dichVuSelect) {
        dichVuSelect.disabled = khoa;
    }

    if (maPhongChiDinh) {
        maPhongChiDinh.disabled = khoa;
    }

    if (btnCreateOrder) {
        btnCreateOrder.disabled = khoa;
    }

    if (btnSaveMedicalRecord) {

        btnSaveMedicalRecord.disabled =
            khoa;

        btnSaveMedicalRecord.style.display =
            khoa
                ? "none"
                : "inline-flex";
    }

    if (btnCompleteExam) {

        btnCompleteExam.disabled =
            khoa;

        btnCompleteExam.style.display =
            khoa
                ? "none"
                : "inline-flex";
    }
}


/* =====================================================
   TẠO BODY HỒ SƠ
===================================================== */

function taoDuLieuHoSo() {

    return {

        trieuChung:
            trieuChung
                ? trieuChung.value.trim()
                : "",

        chanDoan:
            chanDoan
                ? chanDoan.value.trim()
                : "",

        ketLuan:
            ketLuan
                ? ketLuan.value.trim()
                : "",

        huongDieuTri:
            huongDieuTri
                ? huongDieuTri.value.trim()
                : "",

        ngayTaiKham:
            ngayTaiKham
                ? (ngayTaiKham.value || null)
                : null,

        ghiChuTaiKham:
            ghiChuTaiKham
                ? ghiChuTaiKham.value.trim()
                : ""
    };
}


/* =====================================================
   GỬI YÊU CẦU LƯU HỒ SƠ
===================================================== */

async function guiYeuCauLuuHoSo() {

    if (!lichKhamDangChon) {

        throw new Error(
            "Chưa chọn lịch khám."
        );
    }

    const body =
        taoDuLieuHoSo();

    return await apiFetch(
        `${API_BASE}/${lichKhamDangChon}/ho-so`,
        {
            method: "PUT",
            body: JSON.stringify(body)
        }
    );
}


/* =====================================================
   LƯU HỒ SƠ
===================================================== */

async function luuHoSo() {

    if (!lichKhamDangChon) {

        showToast(
            "Lỗi",
            "Chưa chọn lịch khám.",
            true
        );

        return false;
    }

    try {

        await guiYeuCauLuuHoSo();

        showToast(
            "Đã lưu",
            "Cập nhật hồ sơ bệnh án thành công."
        );

        return true;

    } catch (error) {

        showToast(
            "Không thể lưu hồ sơ",
            error.message,
            true
        );

        return false;
    }
}


/* =====================================================
   HOÀN TẤT KHÁM
===================================================== */

async function hoanTatKham() {

    if (!lichKhamDangChon) {

        showToast(
            "Lỗi",
            "Chưa chọn lịch khám.",
            true
        );

        return;
    }

    const dongY =
        confirm(
            "Bạn có chắc muốn hoàn tất khám?\n\n" +
            "Sau khi hoàn tất, hồ sơ bệnh án sẽ không thể chỉnh sửa."
        );

    if (!dongY) {
        return;
    }

    if (btnCompleteExam) {
        btnCompleteExam.disabled = true;
    }

    if (btnSaveMedicalRecord) {
        btnSaveMedicalRecord.disabled = true;
    }

    try {

        await guiYeuCauLuuHoSo();

        await apiFetch(
            `${API_BASE}/${lichKhamDangChon}/hoan-tat`,
            {
                method: "POST"
            }
        );

        capNhatTrangThaiHoSo(
            "HoanTat"
        );

        showToast(
            "Hoàn tất khám",
            "Hoàn tất khám thành công."
        );

        await lamMoiDuLieu();

    } catch (error) {

        showToast(
            "Không thể hoàn tất",
            error.message,
            true
        );

        if (!hoSoDangKhoa) {

            if (btnCompleteExam) {
                btnCompleteExam.disabled = false;
            }

            if (btnSaveMedicalRecord) {
                btnSaveMedicalRecord.disabled = false;
            }
        }
    }
}


/* =====================================================
   CHUYỂN TAB
===================================================== */

function chuyenTab(tab) {

    const laMedical =
        tab === "medical";

    if (tabMedicalInfo) {

        tabMedicalInfo.classList.toggle(
            "active",
            laMedical
        );
    }

    if (tabClinical) {

        tabClinical.classList.toggle(
            "active",
            !laMedical
        );
    }

    if (medicalTabContent) {

        medicalTabContent.classList.toggle(
            "active",
            laMedical
        );
    }

    if (clinicalTabContent) {

        clinicalTabContent.classList.toggle(
            "active",
            !laMedical
        );
    }

    if (
        !laMedical &&
        lichKhamDangChon
    ) {

        loadDanhSachChiDinh(
            lichKhamDangChon
        );
    }
}


/* =====================================================
   CHUẨN BỊ TAB CẬN LÂM SÀNG
===================================================== */

async function chuanBiCanLamSang() {

    await Promise.all([

        loadDanhSachDichVu(),

        loadDanhSachChiDinh(
            lichKhamDangChon
        )

    ]);
}


/* =====================================================
   LOAD DANH SÁCH DỊCH VỤ
===================================================== */

async function loadDanhSachDichVu() {

    if (!dichVuSelect) {
        return;
    }

    try {

        const data =
            await apiFetch(
                `${API_BASE}/dich-vu`
            );

        danhSachDichVu =
            Array.isArray(data)
                ? data
                : [];

        renderDanhSachDichVu();

    } catch (error) {

        danhSachDichVu = [];

        renderDanhSachDichVu();

        showToast(
            "Không thể tải dịch vụ",
            error.message,
            true
        );
    }
}


/* =====================================================
   RENDER DỊCH VỤ
===================================================== */

function renderDanhSachDichVu() {

    if (!dichVuSelect) {
        return;
    }

    const giaTriDangChon =
        dichVuSelect.value;

    dichVuSelect.innerHTML =
        '<option value="">-- Chọn dịch vụ cận lâm sàng --</option>';

    danhSachDichVu.forEach(
        dichVu => {

            const option =
                document.createElement("option");

            option.value =
                dichVu.maDichVu;

            option.textContent =
                `${dichVu.tenDichVu || "Dịch vụ"}${
                    dichVu.gia !== null &&
                    dichVu.gia !== undefined
                        ? ` - ${formatMoney(dichVu.gia)}`
                        : ""
                }`;

            dichVuSelect.appendChild(
                option
            );
        }
    );

    if (
        giaTriDangChon &&
        danhSachDichVu.some(
            item =>
                String(item.maDichVu) ===
                String(giaTriDangChon)
        )
    ) {

        dichVuSelect.value =
            giaTriDangChon;
    }

    capNhatThongTinDichVuDangChon();
}


/* =====================================================
   THÔNG TIN DỊCH VỤ ĐANG CHỌN
===================================================== */

function capNhatThongTinDichVuDangChon() {

    if (
        !dichVuSelect ||
        !selectedServiceInfo
    ) {
        return;
    }

    const maDichVu =
        dichVuSelect.value;

    if (!maDichVu) {

        selectedServiceInfo.classList.add(
            "hidden"
        );

        return;
    }

    const dichVu =
        danhSachDichVu.find(
            item =>
                String(item.maDichVu) ===
                String(maDichVu)
        );

    if (!dichVu) {

        selectedServiceInfo.classList.add(
            "hidden"
        );

        return;
    }

    if (selectedServiceName) {

        selectedServiceName.textContent =
            dichVu.tenDichVu || "---";
    }

    if (selectedServiceType) {

        selectedServiceType.textContent =
            dichVu.loaiDichVu || "---";
    }

    if (selectedServicePrice) {

        selectedServicePrice.textContent =
            formatMoney(
                dichVu.gia
            );
    }

    selectedServiceInfo.classList.remove(
        "hidden"
    );
}
/* =====================================================
   TẠO CHỈ ĐỊNH
===================================================== */

async function taoChiDinh() {

    if (!lichKhamDangChon) {
        showToast(
            "Lỗi",
            "Chưa chọn lịch khám.",
            true
        );
        return;
    }

    if (hoSoDangKhoa) {
        showToast(
            "Không thể tạo chỉ định",
            "Hồ sơ đã hoàn tất.",
            true
        );
        return;
    }

    if (!dichVuSelect) {
        return;
    }

    const maDichVu = Number(dichVuSelect.value);

    if (!maDichVu || Number.isNaN(maDichVu)) {
        showToast(
            "Thiếu thông tin",
            "Vui lòng chọn dịch vụ cận lâm sàng.",
            true
        );
        return;
    }

    let maPhong = null;

    if (
        maPhongChiDinh &&
        maPhongChiDinh.value.trim() !== ""
    ) {
        maPhong = Number(maPhongChiDinh.value);

        if (
            !Number.isInteger(maPhong) ||
            maPhong <= 0
        ) {
            showToast(
                "Mã phòng không hợp lệ",
                "Mã phòng phải là số nguyên lớn hơn 0.",
                true
            );
            return;
        }
    }

    if (btnCreateOrder) {
        btnCreateOrder.disabled = true;
    }

    try {

        const body = {
            maDichVu: maDichVu,
            maPhong: maPhong
        };

        // Gọi API tạo chỉ định
        // Backend sẽ chuyển trạng thái DangKham -> ChoCLS
        await apiFetch(
            `${API_BASE}/${lichKhamDangChon}/chi-dinh`,
            {
                method: "POST",
                body: JSON.stringify(body)
            }
        );

        showToast(
            "Tạo chỉ định",
            "Tạo chỉ định cận lâm sàng thành công."
        );

        // Xóa lựa chọn cũ
        dichVuSelect.value = "";

        if (maPhongChiDinh) {
            maPhongChiDinh.value = "";
        }

        capNhatThongTinDichVuDangChon();

        // Tải lại danh sách chỉ định
        await loadDanhSachChiDinh(lichKhamDangChon);

        // Cập nhật danh sách khám và thống kê
        await lamMoiDuLieu();

    } catch (error) {

        showToast(
            "Không thể tạo chỉ định",
            error.message,
            true
        );

    } finally {

        if (btnCreateOrder && !hoSoDangKhoa) {
            btnCreateOrder.disabled = false;
        }
    }
}

/* =====================================================
   LOAD DANH SÁCH CHỈ ĐỊNH
===================================================== */

async function loadDanhSachChiDinh(
    maLichKham = lichKhamDangChon
) {

    if (
        !maLichKham ||
        !clinicalOrderBody
    ) {
        return;
    }

    if (clinicalOrderLoading) {

        clinicalOrderLoading.classList.remove(
            "hidden"
        );
    }

    if (clinicalOrderEmpty) {

        clinicalOrderEmpty.classList.add(
            "hidden"
        );
    }

    clinicalOrderBody.innerHTML = "";

    try {

        const data =
            await apiFetch(
                `${API_BASE}/${maLichKham}/chi-dinh`
            );

        danhSachChiDinh =
            Array.isArray(data)
                ? data
                : [];

        renderDanhSachChiDinh();

    } catch (error) {

        danhSachChiDinh = [];

        renderDanhSachChiDinh();

        showToast(
            "Không thể tải chỉ định",
            error.message,
            true
        );

    } finally {

        if (clinicalOrderLoading) {

            clinicalOrderLoading.classList.add(
                "hidden"
            );
        }
    }
}


/* =====================================================
   RENDER DANH SÁCH CHỈ ĐỊNH
===================================================== */

function renderDanhSachChiDinh() {

    if (!clinicalOrderBody) {
        return;
    }

    clinicalOrderBody.innerHTML = "";

    if (
        !danhSachChiDinh ||
        danhSachChiDinh.length === 0
    ) {

        if (clinicalOrderEmpty) {

            clinicalOrderEmpty.classList.remove(
                "hidden"
            );
        }

        return;
    }

    if (clinicalOrderEmpty) {

        clinicalOrderEmpty.classList.add(
            "hidden"
        );
    }

    danhSachChiDinh.forEach(
        chiDinh => {

            const row =
                document.createElement("tr");

            const trangThai =
                layThongTinTrangThaiChiDinh(
                    chiDinh.trangThai
                );

            row.innerHTML = `

                <td>

                    <strong>
                        ${escapeHtml(
                            chiDinh.tenDichVu || "---"
                        )}
                    </strong>

                </td>

                <td>
                    ${escapeHtml(
                        chiDinh.loaiDichVu ||
                        chiDinh.loaiChiDinh ||
                        "---"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        formatDateTime(
                            chiDinh.ngayChiDinh
                        )
                    )}
                </td>

                <td>
                    ${
                        chiDinh.maPhong !== null &&
                        chiDinh.maPhong !== undefined
                            ? `P${escapeHtml(
                                chiDinh.maPhong
                            )}`
                            : "---"
                    }
                </td>

                <td>

                    <span class="${trangThai.className}">
                        ${trangThai.text}
                    </span>

                </td>

            `;

            clinicalOrderBody.appendChild(
                row
            );
        }
    );
}


/* =====================================================
   TRẠNG THÁI CHỈ ĐỊNH
===================================================== */

function layThongTinTrangThaiChiDinh(
    trangThai
) {

    switch (trangThai) {

        case "ChoThucHien":

            return {
                text: "Chờ thực hiện",
                className: "badge badge-orange"
            };

        case "DangThucHien":

            return {
                text: "Đang thực hiện",
                className: "badge badge-blue"
            };

        case "DaHoanThanh":

            return {
                text: "Đã hoàn thành",
                className: "badge badge-green"
            };

        default:

            return {
                text: trangThai || "---",
                className: "badge badge-blue"
            };
    }
}


/* =====================================================
   MODAL
===================================================== */

function moModal() {

    if (!examModal) {
        return;
    }

    examModal.classList.remove(
        "hidden"
    );

    document.body.style.overflow =
        "hidden";
}


function dongModal() {

    if (!examModal) {
        return;
    }

    examModal.classList.add(
        "hidden"
    );

    document.body.style.overflow =
        "";

    lichKhamDangChon = null;

    danhSachChiDinh = [];

    chuyenTab("medical");
}


/* =====================================================
   TÌM KIẾM
===================================================== */

function timKiemBenhNhan() {

    if (!patientSearch) {
        return;
    }

    const keyword =
        patientSearch.value
            .trim()
            .toLowerCase();

    if (!keyword) {

        renderDanhSach(
            danhSachBenhNhan
        );

        return;
    }

    const filtered =
        danhSachBenhNhan.filter(
            item => {

                const hoTen =
                    (item.hoTen || "")
                        .toLowerCase();

                const maBenhNhan =
                    String(
                        item.maBenhNhan || ""
                    );

                const lyDoKham =
                    (item.lyDoKham || "")
                        .toLowerCase();

                return (
                    hoTen.includes(keyword) ||
                    maBenhNhan.includes(keyword) ||
                    lyDoKham.includes(keyword)
                );
            }
        );

    renderDanhSach(
        filtered
    );
}


/* =====================================================
   TOAST
===================================================== */

let toastTimer;

function showToast(
    title,
    message,
    error = false
) {

    const toast =
        document.getElementById("toast");

    const toastTitle =
        document.getElementById("toastTitle");

    const toastMessage =
        document.getElementById("toastMessage");

    const toastIcon =
        document.getElementById("toastIcon");

    if (
        !toast ||
        !toastTitle ||
        !toastMessage ||
        !toastIcon
    ) {
        return;
    }

    toastTitle.textContent =
        title;

    toastMessage.textContent =
        message || "";

    toast.classList.remove(
        "hidden",
        "error"
    );

    if (error) {

        toast.classList.add(
            "error"
        );

        toastIcon.innerHTML =
            '<i class="fa-solid fa-xmark"></i>';

    } else {

        toastIcon.innerHTML =
            '<i class="fa-solid fa-check"></i>';
    }

    clearTimeout(
        toastTimer
    );

    toastTimer =
        setTimeout(
            () => {

                toast.classList.add(
                    "hidden"
                );

            },
            3500
        );
}


/* =====================================================
   CHỐNG CHÈN HTML
===================================================== */

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
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


/* =====================================================
   EVENTS - TRANG
===================================================== */

if (btnRefresh) {

    btnRefresh.addEventListener(
        "click",
        lamMoiDuLieu
    );
}


if (patientSearch) {

    patientSearch.addEventListener(
        "input",
        timKiemBenhNhan
    );
}


/* =====================================================
   EVENTS - MODAL
===================================================== */

if (btnCloseModal) {

    btnCloseModal.addEventListener(
        "click",
        dongModal
    );
}


if (btnCancelExam) {

    btnCancelExam.addEventListener(
        "click",
        dongModal
    );
}


if (btnSaveMedicalRecord) {

    btnSaveMedicalRecord.addEventListener(
        "click",
        luuHoSo
    );
}


if (btnCompleteExam) {

    btnCompleteExam.addEventListener(
        "click",
        hoanTatKham
    );
}


/* =====================================================
   EVENTS - TAB
===================================================== */

if (tabMedicalInfo) {

    tabMedicalInfo.addEventListener(
        "click",
        function () {

            chuyenTab(
                "medical"
            );
        }
    );
}


if (tabClinical) {

    tabClinical.addEventListener(
        "click",
        function () {

            chuyenTab(
                "clinical"
            );
        }
    );
}


/* =====================================================
   EVENTS - CẬN LÂM SÀNG
===================================================== */

if (dichVuSelect) {

    dichVuSelect.addEventListener(
        "change",
        capNhatThongTinDichVuDangChon
    );
}



if (btnCreateOrder) {
    btnCreateOrder.addEventListener("click", async function () {

        if (!lichKhamDangChon) {
            showToast("Lỗi", "Chưa chọn lượt khám.", true);
            return;
        }

        if (hoSoDangKhoa) {
            showToast(
                "Không thể tạo chỉ định",
                "Hồ sơ đã hoàn tất.",
                true
            );
            return;
        }

        try {
            // Lưu thông tin khám đang nhập trước khi rời trang
            await guiYeuCauLuuHoSo();

            window.location.href =
                `/auth/bac-si/tao-chi-dinh?maLichKham=${lichKhamDangChon}`;

        } catch (error) {
            showToast("Lỗi", error.message, true);
        }
    });
}



if (btnRefreshOrders) {

    btnRefreshOrders.addEventListener(
        "click",
        function () {

            if (!lichKhamDangChon) {

                showToast(
                    "Lỗi",
                    "Chưa chọn lịch khám.",
                    true
                );

                return;
            }

            loadDanhSachChiDinh(
                lichKhamDangChon
            );
        }
    );
}


/* =====================================================
   CLICK RA NGOÀI MODAL
===================================================== */

if (examModal) {

    examModal.addEventListener(
        "click",
        function (event) {

            if (
                event.target === examModal
            ) {

                dongModal();
            }
        }
    );
}


/* =====================================================
   ESC ĐÓNG MODAL
===================================================== */

document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Escape" &&
            examModal &&
            !examModal.classList.contains(
                "hidden"
            )
        ) {

            dongModal();
        }
    }
);
///* =====================================================
//   THÔNG TIN BÁC SĨ TRÊN HEADER
//===================================================== */
//
//function hienThiThongTinBacSi() {
//
//    const doctorName =
//        document.getElementById("doctorName");
//
//    const doctorAvatar =
//        document.getElementById("doctorAvatar");
//
//    const hoTen =
//        localStorage.getItem("HoTen")
//        || sessionStorage.getItem("HoTen")
//        || "Bác sĩ";
//
//    if (doctorName) {
//        doctorName.textContent = hoTen;
//    }
//
//    if (doctorAvatar) {
//
//        const words =
//            hoTen.trim().split(/\s+/);
//
//        if (words.length > 0) {
//
//            const lastName =
//                words[words.length - 1];
//
//            doctorAvatar.textContent =
//                lastName
//                    .substring(0, 2)
//                    .toUpperCase();
//        }
//    }
//}


/* =====================================================
   ĐĂNG XUẤT
===================================================== */

function dangXuat() {

    const dongY =
        confirm(
            "Bạn có muốn đăng xuất không?"
        );

    if (!dongY) {
        return;
    }

    /* XÓA LOCAL STORAGE */

    localStorage.removeItem("token");
    localStorage.removeItem("Token");
    localStorage.removeItem("HoTen");
    localStorage.removeItem("VaiTro");
    localStorage.removeItem("MaNguoiDung");
    localStorage.removeItem("TenDangNhap");
    localStorage.removeItem("Email");
    localStorage.removeItem("AnhDaiDien");


    /* XÓA SESSION STORAGE */

    sessionStorage.removeItem("token");
    sessionStorage.removeItem("Token");
    sessionStorage.removeItem("HoTen");
    sessionStorage.removeItem("VaiTro");
    sessionStorage.removeItem("MaNguoiDung");
    sessionStorage.removeItem("TenDangNhap");
    sessionStorage.removeItem("Email");
    sessionStorage.removeItem("AnhDaiDien");


    /* VỀ TRANG ĐĂNG NHẬP */

    window.location.href =
        "/auth/login";
}


/* =====================================================
   KHỞI TẠO SIDEBAR
===================================================== */

function khoiTaoMenuKhamBenh() {

    /*
     * HTML mới sử dụng .menu-group.
     * Vẫn hỗ trợ .menu-parent để tránh lỗi
     * nếu còn trang nào đang dùng cấu trúc cũ.
     */

    const menuGroup =
        document.querySelector(
            ".menu-group, .menu-parent"
        );

    if (!menuGroup) {
        return;
    }

    const children =
        Array.from(
            menuGroup.children
        );

    const menuButton =
        children.find(
            element =>
                element.classList.contains(
                    "menu-item"
                )
        );

    const submenu =
        children.find(
            element =>
                element.classList.contains(
                    "submenu"
                )
        );

    if (
        !menuButton ||
        !submenu
    ) {
        return;
    }

    const arrow =
        menuButton.querySelector(
            ".arrow"
        );

    /*
     * Trang khám bệnh nằm trong menu Khám bệnh,
     * vì vậy mặc định submenu được mở.
     */

    let isOpen = true;


    function capNhatMenu() {

        submenu.style.display =
            isOpen
                ? ""
                : "none";

        menuButton.setAttribute(
            "aria-expanded",
            String(isOpen)
        );

        if (arrow) {

            arrow.style.transform =
                isOpen
                    ? "rotate(0deg)"
                    : "rotate(-90deg)";
        }
    }


    function toggleMenu() {

        isOpen = !isOpen;

        capNhatMenu();
    }


    menuButton.style.cursor =
        "pointer";

    menuButton.setAttribute(
        "role",
        "button"
    );

    menuButton.setAttribute(
        "tabindex",
        "0"
    );

    if (arrow) {

        arrow.style.transition =
            "transform 0.2s ease";
    }


    /* CLICK MENU KHÁM BỆNH */

    menuButton.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            toggleMenu();
        }
    );


    /* HỖ TRỢ ENTER / SPACE */

    menuButton.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Enter" ||
                event.key === " "
            ) {

                event.preventDefault();

                toggleMenu();
            }
        }
    );


    capNhatMenu();
}


/* =====================================================
   KHỞI TẠO TRANG
===================================================== */

/* =====================================================
   KHỞI TẠO TRANG
===================================================== */


/* =====================================================
   KHỞI TẠO TRANG DANH SÁCH KHÁM BỆNH
===================================================== */

document.addEventListener("DOMContentLoaded", async function () {

    hienThiNgayHienTai();

    chuyenTab("medical");

    await lamMoiDuLieu();

});
