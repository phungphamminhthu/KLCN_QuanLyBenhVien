const API_BASE = "/api/bac-si/kham-benh";


/* =====================================================
   DOM
===================================================== */

const patientTableBody =
    document.getElementById("patientTableBody");

const loadingState =
    document.getElementById("loadingState");

const emptyState =
    document.getElementById("emptyState");

const waitingCount =
    document.getElementById("waitingCount");

const examiningCount =
    document.getElementById("examiningCount");

const completedCount =
    document.getElementById("completedCount");

const currentDate =
    document.getElementById("currentDate");

const doctorName =
    document.getElementById("doctorName");

const welcomeDoctorName =
    document.getElementById("welcomeDoctorName");

const doctorAvatar =
    document.getElementById("doctorAvatar");

const btnLogout =
    document.getElementById("btnLogout");


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

        headers["Authorization"] =
            `Bearer ${token}`;
    }

    const response = await fetch(
        url,
        {
            ...options,
            headers
        }
    );

    let data = null;

    const contentType =
        response.headers.get("content-type");

    if (
        contentType &&
        contentType.includes("application/json")
    ) {

        data = await response.json();

    } else {

        data = {
            message: await response.text()
        };
    }

    if (!response.ok) {

        throw new Error(
            data?.message ||
            "Không thể xử lý yêu cầu."
        );
    }

    return data;
}


/* =====================================================
   NGÀY HIỆN TẠI
===================================================== */

function hienThiNgay() {

    const today = new Date();

    if (currentDate) {

        currentDate.textContent =
            today.toLocaleDateString("vi-VN");
    }
}


/* =====================================================
   THÔNG TIN BÁC SĨ
===================================================== */

function hienThiThongTinBacSi() {

    const hoTen =
        localStorage.getItem("HoTen")
        || sessionStorage.getItem("HoTen")
        || "Bác sĩ";

    if (doctorName) {
        doctorName.textContent = hoTen;
    }

    if (welcomeDoctorName) {
        welcomeDoctorName.textContent = hoTen;
    }


    /* Tạo chữ viết tắt cho avatar */

    const words =
        hoTen.trim().split(/\s+/);

    if (
        doctorAvatar &&
        words.length > 0
    ) {

        const lastName =
            words[words.length - 1];

        doctorAvatar.textContent =
            lastName
                .substring(0, 2)
                .toUpperCase();
    }
}


/* =====================================================
   LOAD THỐNG KÊ
===================================================== */

async function loadThongKe() {

    try {

        const data = await apiFetch(
            `${API_BASE}/thong-ke`
        );


        /* BỆNH NHÂN CHỜ KHÁM */

        if (waitingCount) {

            waitingCount.textContent =
                data.choKham ?? 0;
        }


        /* ĐANG KHÁM */

        if (examiningCount) {

            examiningCount.textContent =
                data.dangKham ?? 0;
        }


        /* ĐÃ KHÁM */

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
   LOAD DANH SÁCH BỆNH NHÂN CHỜ KHÁM
===================================================== */

async function loadWaitingList() {

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

        const data = await apiFetch(
            `${API_BASE}/danh-sach-cho-kham`
        );


        const list =
            Array.isArray(data)
                ? data
                : [];


        /*
            Trang chủ chỉ hiển thị tối đa
            5 bệnh nhân chờ khám.
        */

        renderPatients(
            list.slice(0, 5)
        );


    } catch (error) {

        console.error(
            "Không thể tải danh sách chờ khám:",
            error
        );


        if (patientTableBody) {
            patientTableBody.innerHTML = "";
        }


        if (emptyState) {
            emptyState.classList.remove("hidden");
        }


        if (!layToken()) {

            console.warn(
                "Không tìm thấy JWT Token."
            );
        }

    } finally {

        if (loadingState) {

            loadingState.classList.add(
                "hidden"
            );
        }
    }
}


/* =====================================================
   LOAD TOÀN BỘ DỮ LIỆU TRANG CHỦ
===================================================== */

async function loadDashboard() {

    await Promise.all([
        loadThongKe(),
        loadWaitingList()
    ]);
}


/* =====================================================
   RENDER DANH SÁCH
===================================================== */

function renderPatients(list) {

    if (!patientTableBody) {
        return;
    }

    patientTableBody.innerHTML = "";


    if (!list || list.length === 0) {

        if (emptyState) {

            emptyState.classList.remove(
                "hidden"
            );
        }

        return;
    }


    if (emptyState) {

        emptyState.classList.add(
            "hidden"
        );
    }


    list.forEach((patient, index) => {

        const tr =
            document.createElement("tr");


        tr.innerHTML = `

            <td>
                ${patient.soThuTu ?? index + 1}
            </td>

            <td>

                <div class="patient-name">

                    <strong>
                        ${escapeHtml(patient.hoTen)}
                    </strong>

                    <span>
                        BN${String(
                            patient.maBenhNhan
                        ).padStart(6, "0")}
                    </span>

                </div>

            </td>

            <td>
                ${formatTime(patient.gioKham)}
            </td>

            <td>
                ${escapeHtml(patient.lyDoKham)}
            </td>

            <td>

                <span class="badge">
                    Chờ khám
                </span>

            </td>

            <td>

                <button
                    class="action"
                    onclick="moTrangKhamBenh()">

                    Khám bệnh

                </button>

            </td>

        `;


        patientTableBody.appendChild(tr);
    });
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
   CHUYỂN SANG TRANG KHÁM BỆNH
===================================================== */

function moTrangKhamBenh() {

    window.location.href =
        "/auth/bac-si/kham-benh";
}


/* =====================================================
   LOGOUT
===================================================== */

if (btnLogout) {

    btnLogout.addEventListener(
        "click",
        function () {

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


            /* XÓA SESSION STORAGE */

            sessionStorage.removeItem("token");
            sessionStorage.removeItem("Token");
            sessionStorage.removeItem("HoTen");
            sessionStorage.removeItem("VaiTro");


            /* VỀ TRANG ĐĂNG NHẬP */

            window.location.href =
                "/auth/login";
        }
    );
}


/* =====================================================
   KHỞI TẠO TRANG
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        hienThiNgay();

        hienThiThongTinBacSi();

        /*
            Load đồng thời:
            1. Thống kê
            2. Danh sách bệnh nhân chờ khám
        */

        loadDashboard();
    }
);