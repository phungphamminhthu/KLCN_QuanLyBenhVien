/* =====================================================
   CẤU HÌNH API
===================================================== */

const API_BASE = "/api/bac-si/kham-benh";


/* =====================================================
   BIẾN TOÀN CỤC
===================================================== */

let danhSachBenhNhan = [];
let lichKhamDangChon = null;


/* =====================================================
   DOM
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
   MODAL
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
   THÔNG TIN BỆNH NHÂN
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
   FORM
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

    const parts = dateString.split("-");

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

    return time.substring(0, 5);
}


/* =====================================================
   LOAD THỐNG KÊ
===================================================== */

async function loadThongKe() {

    try {

        const data = await apiFetch(
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
   LOAD DANH SÁCH CHỜ KHÁM
===================================================== */

async function loadDanhSachChoKham() {

    loadingState.classList.remove("hidden");
    emptyState.classList.add("hidden");
    patientTableBody.innerHTML = "";

    try {

        const data = await apiFetch(
            `${API_BASE}/danh-sach-cho-kham`
        );

        danhSachBenhNhan =
            Array.isArray(data)
                ? data
                : [];

        renderDanhSach(
            danhSachBenhNhan
        );

        totalPatients.textContent =
            danhSachBenhNhan.length;

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

        loadingState.classList.add("hidden");
    }
}


/* =====================================================
   LÀM MỚI TOÀN BỘ DỮ LIỆU TRANG
===================================================== */

async function lamMoiDuLieu() {

    if (btnRefresh) {
        btnRefresh.disabled = true;
    }

    try {

        await Promise.all([
            loadDanhSachChoKham(),
            loadThongKe()
        ]);

    } finally {

        if (btnRefresh) {
            btnRefresh.disabled = false;
        }
    }
}


/* =====================================================
   RENDER DANH SÁCH
===================================================== */

function renderDanhSach(list) {

    patientTableBody.innerHTML = "";

    if (!list || list.length === 0) {

        emptyState.classList.remove("hidden");

        totalPatients.textContent = "0";

        return;
    }

    emptyState.classList.add("hidden");

    list.forEach((benhNhan, index) => {

        const row =
            document.createElement("tr");

        row.innerHTML = `

            <td>
                ${benhNhan.soThuTu ?? index + 1}
            </td>

            <td>

                <div class="patient-name">

                    <strong>
                        ${escapeHtml(benhNhan.hoTen)}
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

            <td class="reason"
                title="${escapeHtml(
                    benhNhan.lyDoKham
                )}">

                ${escapeHtml(
                    benhNhan.lyDoKham
                )}

            </td>

            <td>

                <span class="badge badge-orange">
                    Chờ khám
                </span>

            </td>

            <td>

                <button
                    class="action-button"
                    onclick="batDauKham(${benhNhan.maLichKham})">

                    Bắt đầu khám

                </button>

            </td>

        `;

        patientTableBody.appendChild(row);
    });

    totalPatients.textContent =
        list.length;
}


/* =====================================================
   BẮT ĐẦU KHÁM
===================================================== */

async function batDauKham(maLichKham) {

    const patient =
        danhSachBenhNhan.find(
            item =>
                item.maLichKham === maLichKham
        );

    if (!patient) {

        showToast(
            "Không tìm thấy",
            "Không tìm thấy thông tin bệnh nhân.",
            true
        );

        return;
    }

    const dongY = confirm(
        `Bắt đầu khám cho bệnh nhân ${patient.hoTen}?`
    );

    if (!dongY) {
        return;
    }

    try {

        await apiFetch(
            `${API_BASE}/${maLichKham}/bat-dau`,
            {
                method: "POST"
            }
        );

        lichKhamDangChon =
            maLichKham;

        dienThongTinBenhNhan(
            patient
        );

        await loadHoSo(
            maLichKham
        );

        moModal();

        showToast(
            "Bắt đầu khám",
            "Bắt đầu khám thành công."
        );

        /*
            Sau khi bắt đầu:
            ChoKham -> DangKham

            Vì vậy:
            Chờ khám giảm
            Đang khám tăng
        */
        await lamMoiDuLieu();

    } catch (error) {

        showToast(
            "Không thể bắt đầu khám",
            error.message,
            true
        );
    }
}


/* =====================================================
   ĐIỀN THÔNG TIN BỆNH NHÂN
===================================================== */

function dienThongTinBenhNhan(patient) {

    modalPatientName.textContent =
        patient.hoTen || "---";

    modalPatientId.textContent =
        `BN${String(
            patient.maBenhNhan
        ).padStart(6, "0")}`;

    modalBirthDate.textContent =
        formatDate(
            patient.ngaySinh
        );

    modalGender.textContent =
        patient.gioiTinh || "---";
}


/* =====================================================
   LOAD HỒ SƠ
===================================================== */

async function loadHoSo(maLichKham) {

    try {

        const data = await apiFetch(
            `${API_BASE}/${maLichKham}/ho-so`
        );

        trieuChung.value =
            data.trieuChung || "";

        chanDoan.value =
            data.chanDoan || "";

        ketLuan.value =
            data.ketLuan || "";

        huongDieuTri.value =
            data.huongDieuTri || "";

        ngayTaiKham.value =
            data.ngayTaiKham || "";

        ghiChuTaiKham.value =
            data.ghiChuTaiKham || "";

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

    if (trangThai === "HoanTat") {

        modalStatus.textContent =
            "Hoàn tất";

        modalStatus.className =
            "badge badge-green";

        khoaForm(true);

    } else {

        modalStatus.textContent =
            "Đang khám";

        modalStatus.className =
            "badge badge-blue";

        khoaForm(false);
    }
}


/* =====================================================
   KHÓA FORM
===================================================== */

function khoaForm(khoa) {

    trieuChung.disabled = khoa;
    chanDoan.disabled = khoa;
    ketLuan.disabled = khoa;
    huongDieuTri.disabled = khoa;
    ngayTaiKham.disabled = khoa;
    ghiChuTaiKham.disabled = khoa;

    btnSaveMedicalRecord.disabled =
        khoa;

    btnCompleteExam.disabled =
        khoa;

    if (khoa) {

        btnSaveMedicalRecord.style.display =
            "none";

        btnCompleteExam.style.display =
            "none";

    } else {

        btnSaveMedicalRecord.style.display =
            "inline-flex";

        btnCompleteExam.style.display =
            "inline-flex";
    }
}


/* =====================================================
   TẠO BODY HỒ SƠ
===================================================== */

function taoDuLieuHoSo() {

    return {

        trieuChung:
            trieuChung.value.trim(),

        chanDoan:
            chanDoan.value.trim(),

        ketLuan:
            ketLuan.value.trim(),

        huongDieuTri:
            huongDieuTri.value.trim(),

        ngayTaiKham:
            ngayTaiKham.value || null,

        ghiChuTaiKham:
            ghiChuTaiKham.value.trim()
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

    const dongY = confirm(
        "Bạn có chắc muốn hoàn tất khám?\n\n" +
        "Sau khi hoàn tất, hồ sơ bệnh án sẽ không thể chỉnh sửa."
    );

    if (!dongY) {
        return;
    }

    /*
        Khóa nút tạm thời để tránh
        người dùng bấm nhiều lần.
    */
    btnCompleteExam.disabled = true;
    btnSaveMedicalRecord.disabled = true;

    try {

        /*
            QUAN TRỌNG:
            Phải lưu hồ sơ thành công trước.
            Nếu PUT lỗi thì throw và KHÔNG gọi hoàn tất.
        */
        await guiYeuCauLuuHoSo();

        /*
            Sau khi lưu thành công
            mới chuyển trạng thái sang hoàn tất.
        */
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

        /*
            DangKham -> DaKham

            Vì vậy:
            Đang khám giảm
            Đã hoàn thành tăng
        */
        await lamMoiDuLieu();

    } catch (error) {

        showToast(
            "Không thể hoàn tất",
            error.message,
            true
        );

        /*
            Nếu lỗi thì cho phép thao tác lại.
        */
        btnCompleteExam.disabled = false;
        btnSaveMedicalRecord.disabled = false;
    }
}


/* =====================================================
   MODAL
===================================================== */

function moModal() {

    examModal.classList.remove(
        "hidden"
    );

    document.body.style.overflow =
        "hidden";
}


function dongModal() {

    examModal.classList.add(
        "hidden"
    );

    document.body.style.overflow =
        "";

    /*
        Không xóa lichKhamDangChon ở đây.

        Vì bệnh nhân đã chuyển sang DangKham
        sẽ không còn nằm trong danh sách ChoKham.

        Khi có màn hình "Đang khám" riêng
        mới xử lý mở lại ca khám đó.
    */
}


/* =====================================================
   TÌM KIẾM
===================================================== */

function timKiemBenhNhan() {

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

                return (
                    hoTen.includes(keyword) ||
                    maBenhNhan.includes(keyword)
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
        setTimeout(() => {

            toast.classList.add(
                "hidden"
            );

        }, 3500);
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
   EVENTS
===================================================== */

/*
    Làm mới:
    tải cả danh sách + thống kê.
*/
btnRefresh.addEventListener(
    "click",
    lamMoiDuLieu
);


patientSearch.addEventListener(
    "input",
    timKiemBenhNhan
);


btnCloseModal.addEventListener(
    "click",
    dongModal
);


btnCancelExam.addEventListener(
    "click",
    dongModal
);


btnSaveMedicalRecord.addEventListener(
    "click",
    luuHoSo
);


btnCompleteExam.addEventListener(
    "click",
    hoanTatKham
);


/*
    Click ra ngoài modal
*/
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


/*
    ESC đóng modal
*/
document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Escape" &&
            !examModal.classList.contains(
                "hidden"
            )
        ) {
            dongModal();
        }
    }
);


/* =====================================================
   KHỞI TẠO TRANG
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        hienThiNgayHienTai();

        /*
            Khi vừa mở trang:
            - tải danh sách chờ
            - tải 3 số thống kê
        */
        lamMoiDuLieu();
    }
);