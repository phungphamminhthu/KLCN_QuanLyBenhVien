
const API = "/api/bac-si/ho-so-ca-nhan";

const $ = (id) => document.getElementById(id);

let hoSoGoc = null;

// ==========================================
// TOKEN
// ==========================================

function getToken() {
    return localStorage.getItem("Token")
        || sessionStorage.getItem("Token")
        || localStorage.getItem("token")
        || sessionStorage.getItem("token");
}

// ==========================================
// THÔNG BÁO
// ==========================================

function thongBao(noiDung, loai = "success") {
    const el = $("message");

    if (!el) {
        console.log(noiDung);
        return;
    }

    el.textContent = noiDung;
    el.className = `profile-message ${loai}`;
    el.hidden = false;
}

function anThongBao() {
    if ($("message")) {
        $("message").hidden = true;
    }
}

// ==========================================
// GỌI API
// ==========================================

async function goiAPI(url, options = {}) {
    const token = getToken();

    if (!token) {
        throw new Error(
            "Không tìm thấy token đăng nhập. Vui lòng đăng nhập lại."
        );
    }

    const response = await fetch(url, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    const raw = await response.text();
    let data = null;

    if (raw) {
        try {
            data = JSON.parse(raw);
        } catch {
            data = raw;
        }
    }

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error(
                "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
            );
        }

        if (response.status === 403) {
            throw new Error(
                "Tài khoản không có quyền truy cập chức năng này."
            );
        }

        const message = typeof data === "string"
            ? data
            : data?.message || data?.detail || data?.error;

        throw new Error(
            message || `Yêu cầu thất bại (${response.status})`
        );
    }

    return data;
}

// ==========================================
// AVATAR
// ==========================================


function avatarMacDinh() {
    return "/Images/default-avatar.jpg";
}

function hienThiAvatar(duongDan) {
    const avatar = $("avatar");
    if (!avatar) return;

    avatar.onerror = () => {
        avatar.onerror = null;
        avatar.src = "/Images/default-avatar.jpg";
    };

    if (!duongDan) {
        avatar.src = "/Images/default-avatar.jpg";
        return;
    }

    // Nếu database đã lưu URL đầy đủ
    if (duongDan.startsWith("http://") ||
        duongDan.startsWith("https://")) {
        avatar.src = duongDan;
        return;
    }

    // Lấy ảnh từ Cloudflare R2 thông qua API backend
    const fileKey = duongDan.startsWith("/")
        ? duongDan.substring(1)
        : duongDan;

    avatar.src = "/api/images/view?fileKey=" +
        encodeURIComponent(fileKey);
}


// ==========================================
// HIỂN THỊ HỒ SƠ
// ==========================================

function hienThiHoSo(data) {
    if (!data || typeof data !== "object") {
        throw new Error("Dữ liệu hồ sơ không hợp lệ.");
    }

    hoSoGoc = data;

    // Thông tin cá nhân
    $("hoTen").value = data.hoTen ?? "";
    $("tenDangNhap").value = data.tenDangNhap ?? "";
    $("email").value = data.email ?? "";
    $("soDienThoai").value = data.soDienThoai ?? "";

    // Thông tin chuyên môn
    $("tenKhoa").value = data.tenKhoa ?? "";
    $("chuyenMon").value = data.chuyenMon ?? "";
    $("trinhDo").value = data.trinhDo ?? "";
    $("soChungChiHanhNghe").value =
        data.soChungChiHanhNghe ?? "";

    // Thẻ thông tin phía trên
    $("displayName").textContent =
        data.hoTen || "Bác sĩ";

    $("displaySpecialty").textContent =
        data.chuyenMon || "Bác sĩ";

    $("displayDepartment").textContent =
        data.tenKhoa || "Chưa cập nhật khoa";

    // Header
    if ($("doctorName")) {
        $("doctorName").textContent =
            data.hoTen || "Bác sĩ";
    }

    if ($("doctorAvatar")) {
        $("doctorAvatar").textContent = "BS";
    }

    // Ảnh đại diện
    hienThiAvatar(data.anhDaiDien);
}

// ==========================================
// TẢI HỒ SƠ
// ==========================================

async function taiHoSo() {
    anThongBao();

    try {
        const data = await goiAPI(API);

        console.log("Dữ liệu hồ sơ:", data);

        hienThiHoSo(data);

    } catch (error) {
        console.error("Lỗi tải hồ sơ:", error);

        $("displayName").textContent =
            "Không thể tải hồ sơ";

        thongBao(error.message, "error");
    }
}

// ==========================================
// BẬT / TẮT CHỈNH SỬA
// ==========================================

function batCheDoSua(bat) {
    ["hoTen", "email", "soDienThoai"].forEach(id => {
        $(id).disabled = !bat;
    });

    $("editBtn").hidden = bat;
    $("editActions").hidden = !bat;

    if (bat) {
        $("hoTen").focus();
    }
}

// ==========================================
// CẬP NHẬT HỒ SƠ
// ==========================================

async function capNhatHoSo(event) {
    event.preventDefault();

    anThongBao();

    const hoTen = $("hoTen").value.trim();
    const email = $("email").value.trim();
    const soDienThoai = $("soDienThoai").value.trim();

    if (!hoTen) {
        thongBao("Vui lòng nhập họ tên.", "error");
        return;
    }

    if (soDienThoai && !/^0[0-9]{9}$/.test(soDienThoai)) {
        thongBao(
            "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.",
            "error"
        );
        return;
    }

    const submitBtn = $("profileForm")
        .querySelector('button[type="submit"]');

    submitBtn.disabled = true;

    try {
        const result = await goiAPI(API, {
            method: "PUT",
            body: JSON.stringify({
                hoTen,
                email,
                soDienThoai
            })
        });

        // Tải lại để đảm bảo dữ liệu đúng với Backend
        const data = result && typeof result === "object"
            ? result
            : await goiAPI(API);

        hienThiHoSo(data);
        batCheDoSua(false);

        localStorage.setItem("HoTen", data.hoTen || "");
        sessionStorage.setItem("HoTen", data.hoTen || "");

        thongBao(
            "Cập nhật thông tin cá nhân thành công.",
            "success"
        );

    } catch (error) {
        console.error("Lỗi cập nhật hồ sơ:", error);
        thongBao(error.message, "error");

    } finally {
        submitBtn.disabled = false;
    }
}

// ==========================================
// MODAL ĐỔI MẬT KHẨU
// ==========================================

function moModalMatKhau() {
    const modal = $("passwordModal");

    if (!modal) return;

    anThongBao();

    modal.hidden = false;
    document.body.style.overflow = "hidden";

    $("matKhauCu").focus();
}

function dongModalMatKhau() {
    const modal = $("passwordModal");

    if (!modal) return;

    modal.hidden = true;
    document.body.style.overflow = "";

    $("passwordForm").reset();
}

// ==========================================
// ĐỔI MẬT KHẨU
// ==========================================

async function doiMatKhau(event) {
    event.preventDefault();

    const matKhauCu = $("matKhauCu").value;
    const matKhauMoi = $("matKhauMoi").value;
    const xacNhanMatKhau = $("xacNhanMatKhau").value;

    if (!matKhauCu) {
        alert("Vui lòng nhập mật khẩu hiện tại.");
        return;
    }

    if (matKhauMoi.length < 8) {
        alert("Mật khẩu mới phải có ít nhất 8 ký tự.");
        return;
    }

    if (matKhauMoi !== xacNhanMatKhau) {
        alert("Xác nhận mật khẩu mới không khớp.");
        return;
    }

    if (matKhauCu === matKhauMoi) {
        alert("Mật khẩu mới phải khác mật khẩu hiện tại.");
        return;
    }

    const submitBtn = $("passwordForm")
        .querySelector('button[type="submit"]');

    submitBtn.disabled = true;

    try {
        await goiAPI(API + "/doi-mat-khau", {
            method: "PUT",
            body: JSON.stringify({
                matKhauCu,
                matKhauMoi,
                xacNhanMatKhau
            })
        });

        dongModalMatKhau();

        thongBao(
            "Đổi mật khẩu thành công. Hãy sử dụng mật khẩu mới ở lần đăng nhập tiếp theo.",
            "success"
        );

    } catch (error) {
        console.error("Lỗi đổi mật khẩu:", error);

        // Giữ modal mở để người dùng sửa thông tin
        alert(error.message);

    } finally {
        submitBtn.disabled = false;
    }
}

// ==========================================
// KHỞI TẠO SỰ KIỆN
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    // Tải hồ sơ
    taiHoSo();

    // Chỉnh sửa
    $("editBtn").addEventListener("click", () => {
        batCheDoSua(true);
    });

    // Hủy chỉnh sửa
    $("cancelBtn").addEventListener("click", () => {
        if (hoSoGoc) {
            hienThiHoSo(hoSoGoc);
        }

        batCheDoSua(false);
        anThongBao();
    });

    // Lưu hồ sơ
    $("profileForm").addEventListener(
        "submit",
        capNhatHoSo
    );

    // Mở modal đổi mật khẩu
    $("openPasswordBtn").addEventListener(
        "click",
        moModalMatKhau
    );

    // Đóng modal
    $("closePasswordBtn").addEventListener(
        "click",
        dongModalMatKhau
    );

    $("cancelPasswordBtn").addEventListener(
        "click",
        dongModalMatKhau
    );

    // Nhấn bên ngoài modal để đóng
    $("passwordModal").addEventListener("click", (event) => {
        if (event.target === $("passwordModal")) {
            dongModalMatKhau();
        }
    });

    // Nhấn ESC để đóng
    document.addEventListener("keydown", (event) => {
        if (
            event.key === "Escape"
            && !$("passwordModal").hidden
        ) {
            dongModalMatKhau();
        }
    });

    // Gửi yêu cầu đổi mật khẩu
    $("passwordForm").addEventListener(
        "submit",
        doiMatKhau
    );

    // Đăng xuất được xử lý bởi sidebar.js
});
