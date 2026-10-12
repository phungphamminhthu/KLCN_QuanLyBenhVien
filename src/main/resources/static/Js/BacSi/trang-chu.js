//const API_BASE = "/api/bac-si/kham-benh";
//
//
///* =====================================================
//   DOM
//===================================================== */
//
//const patientTableBody =
//    document.getElementById("patientTableBody");
//
//const loadingState =
//    document.getElementById("loadingState");
//
//const emptyState =
//    document.getElementById("emptyState");
//
//const waitingCount =
//    document.getElementById("waitingCount");
//
//const examiningCount =
//    document.getElementById("examiningCount");
//
//const completedCount =
//    document.getElementById("completedCount");
//
//const currentDate =
//    document.getElementById("currentDate");
//
//const doctorName =
//    document.getElementById("doctorName");
//
//const welcomeDoctorName =
//    document.getElementById("welcomeDoctorName");
//
//const doctorAvatar =
//    document.getElementById("doctorAvatar");
//
//const btnLogout =
//    document.getElementById("btnLogout");
//
//
///* =====================================================
//   TOKEN
//===================================================== */
//
//function layToken() {
//
//    return localStorage.getItem("token")
//        || localStorage.getItem("Token")
//        || sessionStorage.getItem("token")
//        || sessionStorage.getItem("Token");
//}
//
//
///* =====================================================
//   FETCH CÓ JWT
//===================================================== */
//
//async function apiFetch(
//    url,
//    options = {}
//) {
//
//    const token =
//        layToken();
//
//    const headers = {
//        "Content-Type": "application/json",
//        ...(options.headers || {})
//    };
//
//
//    if (token) {
//
//        headers["Authorization"] =
//            `Bearer ${token}`;
//    }
//
//
//    const response =
//        await fetch(
//            url,
//            {
//                ...options,
//                headers
//            }
//        );
//
//
//    let data = null;
//
//
//    const contentType =
//        response.headers.get(
//            "content-type"
//        );
//
//
//    if (
//        contentType &&
//        contentType.includes(
//            "application/json"
//        )
//    ) {
//
//        data =
//            await response.json();
//
//    } else {
//
//        data = {
//            message:
//                await response.text()
//        };
//    }
//
//
//    if (!response.ok) {
//
//        throw new Error(
//            data?.message ||
//            "Không thể xử lý yêu cầu."
//        );
//    }
//
//
//    return data;
//}
//
//
///* =====================================================
//   NGÀY HIỆN TẠI
//===================================================== */
//
//function hienThiNgay() {
//
//    const today =
//        new Date();
//
//
//    if (currentDate) {
//
//        currentDate.textContent =
//            today.toLocaleDateString(
//                "vi-VN"
//            );
//    }
//}
//
//
///* =====================================================
//   THÔNG TIN BÁC SĨ
//===================================================== */
//
////function hienThiThongTinBacSi() {
////
////    const hoTen =
////        localStorage.getItem("HoTen")
////        || sessionStorage.getItem("HoTen")
////        || "Bác sĩ";
////
////
////    if (doctorName) {
////
////        doctorName.textContent =
////            hoTen;
////    }
////
////
////    if (welcomeDoctorName) {
////
////        welcomeDoctorName.textContent =
////            hoTen;
////    }
////
////
////    /* Tạo chữ viết tắt cho avatar */
////
////    const words =
////        hoTen
////            .trim()
////            .split(/\s+/);
////
////
////    if (
////        doctorAvatar &&
////        words.length > 0
////    ) {
////
////        const lastName =
////            words[
////                words.length - 1
////            ];
////
////
////        doctorAvatar.textContent =
////            lastName
////                .substring(0, 2)
////                .toUpperCase();
////    }
////}
//
//function layThongTinLuu(key) {
//    return localStorage.getItem(key)
//        || sessionStorage.getItem(key)
//        || "";
//}
//
//function hienThiThongTinBacSi() {
//    const hoTen = layThongTinLuu("HoTen") || "Bác sĩ";
//    const email = layThongTinLuu("Email");
//
//    if (doctorName) {
//        doctorName.textContent = hoTen;
//    }
//
//    if (welcomeDoctorName) {
//        welcomeDoctorName.textContent = hoTen;
//    }
//
//    const doctorEmail = document.getElementById("doctorEmail");
//
//    if (doctorEmail) {
//        doctorEmail.textContent = email || "Bác sĩ điều trị";
//    }
//
//    capNhatAvatarBacSi();
//}
//
//function capNhatAvatarBacSi() {
//    const avatar = document.getElementById("doctorAvatar");
//
//    if (!avatar) return;
//
//    const defaultAvatar = "images/2b1261cf-87ab-4b5c-9097-50cd95b2fc24.jpg";
//    const fileKey = layThongTinLuu("AnhDaiDien") || defaultAvatar;
//
//    avatar.onerror = function () {
//        this.onerror = null;
//        this.src = "/Images/default-avatar.png";
//    };
//
//    avatar.src = "/api/images/view?fileKey="
//        + encodeURIComponent(fileKey)
//        + "&t=" + Date.now();
//}
//
//
///* =====================================================
//   LOAD THỐNG KÊ
//===================================================== */
//
//async function loadThongKe() {
//
//    try {
//
//        const data =
//            await apiFetch(
//                `${API_BASE}/thong-ke`
//            );
//
//
//        /* BỆNH NHÂN CHỜ KHÁM */
//
//        if (waitingCount) {
//
//            waitingCount.textContent =
//                data.choKham ?? 0;
//        }
//
//
//        /* ĐANG KHÁM */
//
//        if (examiningCount) {
//
//            examiningCount.textContent =
//                data.dangKham ?? 0;
//        }
//
//
//        /* ĐÃ KHÁM */
//
//        if (completedCount) {
//
//            completedCount.textContent =
//                data.daHoanThanh ?? 0;
//        }
//
//
//    } catch (error) {
//
//        console.error(
//            "Không thể tải thống kê:",
//            error
//        );
//
//
//        if (waitingCount) {
//
//            waitingCount.textContent =
//                "0";
//        }
//
//
//        if (examiningCount) {
//
//            examiningCount.textContent =
//                "0";
//        }
//
//
//        if (completedCount) {
//
//            completedCount.textContent =
//                "0";
//        }
//    }
//}
//
//
///* =====================================================
//   LOAD DANH SÁCH BỆNH NHÂN CHỜ KHÁM
//===================================================== */
//
//async function loadWaitingList() {
//
//    if (loadingState) {
//
//        loadingState.classList.remove(
//            "hidden"
//        );
//    }
//
//
//    if (emptyState) {
//
//        emptyState.classList.add(
//            "hidden"
//        );
//    }
//
//
//    if (patientTableBody) {
//
//        patientTableBody.innerHTML =
//            "";
//    }
//
//
//    try {
//
//        const data =
//            await apiFetch(
//                `${API_BASE}/danh-sach-cho-kham`
//            );
//
//
//        const list =
//            Array.isArray(data)
//                ? data
//                : [];
//
//
//        /*
//         * Trang chủ chỉ hiển thị
//         * tối đa 5 bệnh nhân chờ khám.
//         */
//
//        renderPatients(
//            list.slice(0, 5)
//        );
//
//
////    } catch (error) {
////
////        console.error(
////            "Không thể tải danh sách chờ khám:",
////            error
////        );
////
////
////        if (patientTableBody) {
////
////            patientTableBody.innerHTML =
////                "";
////        }
////
////
////        if (emptyState) {
////
////            emptyState.classList.remove(
////                "hidden"
////            );
////        }
////
////
////        if (!layToken()) {
////
////            console.warn(
////                "Không tìm thấy JWT Token."
////            );
////        }
////
////
////    } finally {
////
////        if (loadingState) {
////
////            loadingState.classList.add(
////                "hidden"
////            );
////        }
////    }
//} catch (error) {
//    console.error(
//        "Không thể tải danh sách chờ khám:",
//        error
//    );
//
//    if (patientTableBody) {
//        patientTableBody.innerHTML = "";
//    }
//
//    if (emptyState) {
//        emptyState.classList.remove("hidden");
//
//        const message = emptyState.querySelector("strong");
//
//        if (message) {
//            message.textContent = !layToken()
//                ? "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại."
//                : "Không tải được danh sách. Hãy kiểm tra API và đăng nhập.";
//        }
//    }
//
//} finally {
//    if (loadingState) {
//        loadingState.classList.add("hidden");
//    }
//}
//}
//
//
///* =====================================================
//   LOAD TOÀN BỘ DỮ LIỆU TRANG CHỦ
//===================================================== */
//
//async function loadDashboard() {
//
//    await Promise.all([
//        loadThongKe(),
//        loadWaitingList()
//    ]);
//}
///* =====================================================
//   RENDER DANH SÁCH BỆNH NHÂN
//===================================================== */
//
//function renderPatients(list) {
//
//    if (!patientTableBody) {
//        return;
//    }
//
//
//    patientTableBody.innerHTML =
//        "";
//
//
//    if (
//        !list ||
//        list.length === 0
//    ) {
//
//        if (emptyState) {
//
//            emptyState.classList.remove(
//                "hidden"
//            );
//        }
//
//        return;
//    }
//
//
//    if (emptyState) {
//
//        emptyState.classList.add(
//            "hidden"
//        );
//    }
//
//
//    list.forEach(
//        (patient, index) => {
//
//            const tr =
//                document.createElement(
//                    "tr"
//                );
//
//
//            tr.innerHTML = `
//
//                <td>
//
//                    ${
//                        patient.soThuTu ??
//                        index + 1
//                    }
//
//                </td>
//
//
//                <td>
//
//                    <div class="patient-name">
//
//                        <strong>
//
//                            ${escapeHtml(
//                                patient.hoTen
//                            )}
//
//                        </strong>
//
//
//                        <span>
//
//                            BN${String(
//                                patient.maBenhNhan
//                            ).padStart(
//                                6,
//                                "0"
//                            )}
//
//                        </span>
//
//                    </div>
//
//                </td>
//
//
//                <td>
//
//                    ${formatTime(
//                        patient.gioKham
//                    )}
//
//                </td>
//
//
//                <td>
//
//                    ${escapeHtml(
//                        patient.lyDoKham
//                    )}
//
//                </td>
//
//
//                <td>
//
//                    <span class="badge">
//                        Chờ khám
//                    </span>
//
//                </td>
//
//
//                <td>
//
//                    <button
//                        type="button"
//                        class="action"
//                        onclick="moTrangKhamBenh()"
//                    >
//
//                        Khám bệnh
//
//                    </button>
//
//                </td>
//
//            `;
//
//
//            patientTableBody.appendChild(
//                tr
//            );
//        }
//    );
//}
//
//
///* =====================================================
//   FORMAT GIỜ
//===================================================== */
//
//function formatTime(time) {
//
//    if (!time) {
//        return "---";
//    }
//
//
//    return String(time)
//        .substring(
//            0,
//            5
//        );
//}
//
//
///* =====================================================
//   CHỐNG CHÈN HTML
//===================================================== */
//
//function escapeHtml(value) {
//
//    if (
//        value === null ||
//        value === undefined
//    ) {
//
//        return "";
//    }
//
//
//    return String(value)
//
//        .replaceAll(
//            "&",
//            "&amp;"
//        )
//
//        .replaceAll(
//            "<",
//            "&lt;"
//        )
//
//        .replaceAll(
//            ">",
//            "&gt;"
//        )
//
//        .replaceAll(
//            '"',
//            "&quot;"
//        )
//
//        .replaceAll(
//            "'",
//            "&#039;"
//        );
//}
//
//
///* =====================================================
//   CHUYỂN SANG TRANG KHÁM BỆNH
//===================================================== */
//
//function moTrangKhamBenh() {
//
//    window.location.href =
//        "/auth/bac-si/kham-benh";
//}
//
//
/////* =====================================================
////   ĐĂNG XUẤT
////===================================================== */
////
////function dangXuat() {
////
////    const dongY =
////        confirm(
////            "Bạn có muốn đăng xuất không?"
////        );
////
////
////    if (!dongY) {
////        return;
////    }
////
////
////    /* =================================================
////       XÓA LOCAL STORAGE
////    ================================================= */
////
////    localStorage.removeItem(
////        "token"
////    );
////
////    localStorage.removeItem(
////        "Token"
////    );
////
////    localStorage.removeItem(
////        "HoTen"
////    );
////
////    localStorage.removeItem(
////        "VaiTro"
////    );
////
////    localStorage.removeItem(
////        "MaNguoiDung"
////    );
////
////    localStorage.removeItem(
////        "TenDangNhap"
////    );
////
////    localStorage.removeItem(
////        "Email"
////    );
////
////    localStorage.removeItem(
////        "AnhDaiDien"
////    );
////
////
////    /* =================================================
////       XÓA SESSION STORAGE
////    ================================================= */
////
////    sessionStorage.removeItem(
////        "token"
////    );
////
////    sessionStorage.removeItem(
////        "Token"
////    );
////
////    sessionStorage.removeItem(
////        "HoTen"
////    );
////
////    sessionStorage.removeItem(
////        "VaiTro"
////    );
////
////    sessionStorage.removeItem(
////        "MaNguoiDung"
////    );
////
////    sessionStorage.removeItem(
////        "TenDangNhap"
////    );
////
////    sessionStorage.removeItem(
////        "Email"
////    );
////
////    sessionStorage.removeItem(
////        "AnhDaiDien"
////    );
////
////
////    /* =================================================
////       VỀ TRANG ĐĂNG NHẬP
////    ================================================= */
////
////    window.location.href =
////        "/auth/login";
////}
////
////
/////* =====================================================
////   SỰ KIỆN ĐĂNG XUẤT
////===================================================== */
////
////if (btnLogout) {
////
////    btnLogout.addEventListener(
////        "click",
////        dangXuat
////    );
////}
///* =====================================================
//   SIDEBAR - ĐÓNG / MỞ MENU KHÁM BỆNH
//===================================================== */
//
//function khoiTaoMenuKhamBenh() {
//
//    const menuGroup =
//        document.querySelector(
//            ".menu-group, .menu-parent"
//        );
//
//
//    if (!menuGroup) {
//        return;
//    }
//
//
//    const children =
//        Array.from(
//            menuGroup.children
//        );
//
//
//    const menuButton =
//        children.find(
//            element =>
//                element.classList.contains(
//                    "menu-item"
//                )
//        );
//
//
//    const submenu =
//        children.find(
//            element =>
//                element.classList.contains(
//                    "submenu"
//                )
//        );
//
//
//    if (
//        !menuButton ||
//        !submenu
//    ) {
//        return;
//    }
//
//
//    const arrow =
//        menuButton.querySelector(
//            ".arrow"
//        );
//
//
//    /*
//     * Menu Khám bệnh mặc định mở.
//     */
//
//    let isOpen = true;
//
//
//    function capNhatMenu() {
//
//        submenu.style.display =
//            isOpen
//                ? ""
//                : "none";
//
//
//        menuButton.setAttribute(
//            "aria-expanded",
//            String(isOpen)
//        );
//
//
//        if (arrow) {
//
//            arrow.style.transform =
//                isOpen
//                    ? "rotate(0deg)"
//                    : "rotate(-90deg)";
//        }
//    }
//
//
//    function toggleMenu() {
//
//        isOpen =
//            !isOpen;
//
//        capNhatMenu();
//    }
//
//
//    /* Cho biết menu có thể bấm */
//
//    menuButton.style.cursor =
//        "pointer";
//
//
//    menuButton.setAttribute(
//        "role",
//        "button"
//    );
//
//
//    menuButton.setAttribute(
//        "tabindex",
//        "0"
//    );
//
//
//    /* Hiệu ứng mũi tên */
//
//    if (arrow) {
//
//        arrow.style.transition =
//            "transform 0.2s ease";
//    }
//
//
//    /* Click chuột */
//
//    menuButton.addEventListener(
//        "click",
//        function (event) {
//
//            event.preventDefault();
//
//            toggleMenu();
//        }
//    );
//
//
//    /* Hỗ trợ bàn phím */
//
//    menuButton.addEventListener(
//        "keydown",
//        function (event) {
//
//            if (
//                event.key === "Enter" ||
//                event.key === " "
//            ) {
//
//                event.preventDefault();
//
//                toggleMenu();
//            }
//        }
//    );
//
//
//    /* Trạng thái ban đầu */
//
//    capNhatMenu();
//}
//
//
///* =====================================================
//   KHỞI TẠO TRANG
//===================================================== */
//
//document.addEventListener(
//    "DOMContentLoaded",
//    function () {
//
//        /* HIỂN THỊ NGÀY */
//
//        hienThiNgay();
//
//
//        /* THÔNG TIN BÁC SĨ */
//
//        hienThiThongTinBacSi();
//
//
//        /* KHỞI TẠO SIDEBAR */
//
//        khoiTaoMenuKhamBenh();
//
//
//        /*
//         * Load đồng thời:
//         *
//         * 1. Thống kê
//         * 2. Danh sách bệnh nhân chờ khám
//         */
//
//        loadDashboard();
//    }
//);
//
///* =====================================================
//   HEADER BÁC SĨ - TOKEN, VAI TRÒ, THÔNG BÁO
//===================================================== */
//
//document.addEventListener("DOMContentLoaded", function () {
//    const token = layThongTinLuu("Token")
//        || layThongTinLuu("token");
//
//    const vaiTro = layThongTinLuu("VaiTro")
//        .normalize("NFD")
//        .replace(/[\u0300-\u036f]/g, "")
//        .replace(/\s+/g, "")
//        .toUpperCase();
//
//    if (!token) {
//        window.location.href = "/auth/login";
//        return;
//    }
//
//    // Điều chỉnh danh sách này nếu hệ thống dùng mã vai trò khác.
//    const laBacSi = ["BACSI", "DOCTOR", "ROLE_BACSI", "ROLE_DOCTOR"]
//        .includes(vaiTro);
//
//    if (!laBacSi) {
//        alert("Bạn không có quyền truy cập trang Bác sĩ.");
//        window.location.href = "/auth/login";
//        return;
//    }
//
//    const button = document.getElementById("doctorNotificationButton");
//    const panel = document.getElementById("doctorNotificationPanel");
//
//    if (button && panel) {
//        button.addEventListener("click", function (event) {
//            event.stopPropagation();
//
//            const dangMo = !panel.hidden;
//            panel.hidden = dangMo;
//            button.setAttribute("aria-expanded", String(!dangMo));
//        });
//
//        panel.addEventListener("click", function (event) {
//            event.stopPropagation();
//        });
//
//        document.addEventListener("click", function () {
//            panel.hidden = true;
//            button.setAttribute("aria-expanded", "false");
//        });
//    }
//
//    // Đồng bộ lại thông tin header khi trang hồ sơ phát sự kiện.
//    window.addEventListener("profileUpdated", function () {
//        hienThiThongTinBacSi();
//    });
//
//    hienThiThongTinBacSi();
//});
//
//
///* =====================================================
//   ĐƯA HÀM ONCLICK RA WINDOW
//===================================================== */
//
//window.moTrangKhamBenh =
//    moTrangKhamBenh;
//

/* =====================================================
   TRANG CHỦ BÁC SĨ
   THỐNG KÊ + DANH SÁCH BỆNH NHÂN CHỜ KHÁM

   Yêu cầu: layout.js được nạp trước file này.
   ===================================================== */

const API_BASE = "/api/bac-si/kham-benh";

/* ==================== DOM ==================== */

const patientTableBody = document.getElementById(
    "patientTableBody"
);

const loadingState = document.getElementById(
    "loadingState"
);

const emptyState = document.getElementById(
    "emptyState"
);

const waitingCount = document.getElementById(
    "waitingCount"
);

const examiningCount = document.getElementById(
    "examiningCount"
);

const completedCount = document.getElementById(
    "completedCount"
);

const currentDate = document.getElementById(
    "currentDate"
);

/* ==================== HIỂN THỊ NGÀY HIỆN TẠI ==================== */

function hienThiNgay() {
    if (currentDate) {
        currentDate.textContent =
            new Date().toLocaleDateString("vi-VN");
    }
}

/* ==================== TẢI THỐNG KÊ ==================== */

async function loadThongKe() {
    try {
        const data = await apiFetch(
            `${API_BASE}/thong-ke`
        );

        // Số bệnh nhân chờ khám.
        if (waitingCount) {
            waitingCount.textContent = data.choKham ?? 0;
        }

        // Số bệnh nhân đang khám.
        if (examiningCount) {
            examiningCount.textContent = data.dangKham ?? 0;
        }

        // Số bệnh nhân đã khám xong.
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

/* ==================== TẢI DANH SÁCH CHỜ KHÁM ==================== */

async function loadWaitingList() {
    // Hiện trạng thái đang tải.
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

        const list = Array.isArray(data)
            ? data
            : [];

        // Trang chủ chỉ hiển thị tối đa 5 bệnh nhân.
        renderPatients(list.slice(0, 5));

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

            const message = emptyState.querySelector("strong");

            if (message) {
                message.textContent = !layToken()
                    ? "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại."
                    : "Không tải được danh sách. Hãy kiểm tra API và đăng nhập.";
            }
        }

    } finally {
        // Ẩn trạng thái đang tải.
        if (loadingState) {
            loadingState.classList.add("hidden");
        }
    }
}

/* ==================== TẢI TOÀN BỘ TRANG CHỦ ==================== */

async function loadDashboard() {
    await Promise.all([
        loadThongKe(),
        loadWaitingList()
    ]);
}

/* ==================== HIỂN THỊ DANH SÁCH BỆNH NHÂN ==================== */

function renderPatients(list) {
    if (!patientTableBody) {
        return;
    }

    patientTableBody.innerHTML = "";

    // Không có bệnh nhân chờ khám.
    if (!list || list.length === 0) {
        if (emptyState) {
            emptyState.classList.remove("hidden");
        }

        return;
    }

    if (emptyState) {
        emptyState.classList.add("hidden");
    }

    list.forEach((patient, index) => {
        const tr = document.createElement("tr");

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
                            patient.maBenhNhan ?? ""
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
                    type="button"
                    class="action"
                    onclick="moTrangKhamBenh()"
                >
                    Khám bệnh
                </button>
            </td>
        `;

        patientTableBody.appendChild(tr);
    });
}

/* ==================== ĐỊNH DẠNG GIỜ KHÁM ==================== */

function formatTime(time) {
    if (!time) {
        return "---";
    }

    return String(time).substring(0, 5);
}

/* ==================== CHỐNG CHÈN HTML ==================== */

function escapeHtml(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

/* ==================== CHUYỂN SANG TRANG KHÁM BỆNH ==================== */

function moTrangKhamBenh() {
    window.location.href = "/auth/bac-si/kham-benh";
}

// Cho phép nút HTML gọi hàm bằng onclick.
window.moTrangKhamBenh = moTrangKhamBenh;

/* ==================== KHỞI TẠO TRANG CHỦ ==================== */

document.addEventListener("DOMContentLoaded", function () {
    hienThiNgay();
    loadDashboard();
});
