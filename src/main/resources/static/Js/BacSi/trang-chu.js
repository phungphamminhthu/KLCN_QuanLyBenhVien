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

        // =====================================================
        // HIỆN THÔNG BÁO SAU KHI BÁC SĨ ĐĂNG NHẬP
        // =====================================================

        const vuaDangNhap =
            sessionStorage.getItem(
                "thongBaoChoKhamSauDangNhap"
            ) === "1";

        if (vuaDangNhap) {

            const soBenhNhan = Number(data.choKham) || 0;

            if (soBenhNhan > 0) {
                thongBaoBenhNhanChoKham(soBenhNhan);
            }

            // Xóa cờ để khi F5 không hiện lại
            sessionStorage.removeItem(
                "thongBaoChoKhamSauDangNhap"
            );
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
   THÔNG BÁO BỆNH NHÂN CHỜ KHÁM SAU ĐĂNG NHẬP
===================================================== */

function thongBaoBenhNhanChoKham(soBenhNhan) {

    if (soBenhNhan <= 0) {
        return;
    }

    // Không tạo thông báo trùng
    document.getElementById("thongBaoChoKham")
        ?.remove();

    const thongBao = document.createElement("div");

    thongBao.id = "thongBaoChoKham";

    thongBao.style.cssText = `
        position: fixed;
        top: 85px;
        right: 25px;
        z-index: 9999;
        width: 340px;
        max-width: calc(100vw - 40px);
        padding: 18px;
        background: white;
        border-left: 5px solid #f59e0b;
        border-radius: 12px;
        box-shadow: 0 5px 25px rgba(0,0,0,0.15);
        font-family: Arial, sans-serif;
    `;

    const tieuDe = document.createElement("strong");
    tieuDe.textContent = "🔔 Bệnh nhân đang chờ khám";

    const noiDung = document.createElement("p");
    noiDung.textContent =
        `Hiện có ${soBenhNhan} bệnh nhân đang chờ khám.`;

    noiDung.style.cssText = `
        margin: 10px 0;
        color: #555;
        font-size: 14px;
    `;

    const nutXem = document.createElement("a");
    nutXem.href = "/auth/bac-si/kham-benh";
    nutXem.textContent = "Xem danh sách khám";

    nutXem.style.cssText = `
        color: #2563eb;
        font-size: 14px;
        font-weight: bold;
        text-decoration: none;
    `;

    const nutDong = document.createElement("button");
    nutDong.textContent = "×";
    nutDong.setAttribute("aria-label", "Đóng thông báo");

    nutDong.style.cssText = `
        position: absolute;
        top: 8px;
        right: 12px;
        border: none;
        background: transparent;
        font-size: 24px;
        cursor: pointer;
    `;

    nutDong.onclick = () => thongBao.remove();

    thongBao.append(
        nutDong,
        tieuDe,
        noiDung,
        nutXem
    );

    document.body.appendChild(thongBao);

    // Tự đóng sau 8 giây
    setTimeout(() => {
        thongBao.remove();
    }, 8000);
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
