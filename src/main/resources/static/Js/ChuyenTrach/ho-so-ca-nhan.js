document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const $ = id => document.getElementById(id);
    const URL_API = "/api/chuyen-trach/ho-so-ca-nhan";
    const dialog = $("cthsEditDialog");
    const buttonEdit = $("cthsEditButton");
    const buttonSave = $("cthsSaveEdit");
    let profile = null;
    let saving = false;

    function token() {
        return sessionStorage.getItem("Token") || localStorage.getItem("Token");
    }

    async function request(method = "GET", body = null) {
        const jwt = token();
        if (!jwt) throw new Error("Không tìm thấy Token đăng nhập. Hãy đăng nhập lại bằng tài khoản Chuyên trách.");
        const response = await fetch(URL_API, {
            method, cache: "no-store",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${jwt}`,
                ...(body ? { "Content-Type": "application/json" } : {})
            },
            ...(body ? { body: JSON.stringify(body) } : {})
        });
        if (!response.ok) {
            let errorText = `Không tải được hồ sơ (HTTP ${response.status}).`;
            try {
                const error = await response.json();
                errorText = error.detail || error.message || errorText;
            } catch (_) { /* Giữ thông báo HTTP */ }
            if (response.status === 401 || response.status === 403)
                errorText = "Tài khoản chưa đăng nhập hoặc không có quyền CHUYENTRACH.";
            throw new Error(errorText);
        }
        return response.json();
    }

    function showMessage(message, isError = false) {
        const el = $("cthsMessage");
        el.textContent = message;
        el.classList.toggle("error", isError);
        el.hidden = false;
    }

    function setText(id, value) {
        const el = $(id);
        if (el) el.textContent = value == null || String(value).trim() === "" ? "Chưa cập nhật" : String(value);
    }


    function showAvatar(source) {
        const img = $("cthsAvatar");
        const fallback = $("cthsAvatarFallback");

        if (!img || !fallback) return;

        // Mặc định hiển thị icon khi chưa tải được ảnh
        img.hidden = true;
        img.removeAttribute("src");
        fallback.hidden = false;

        if (typeof source !== "string") return;

        const value = source.trim();

        if (
            !value ||
            ["null", "undefined"].includes(value.toLowerCase())
        ) {
            return;
        }

        let imageUrl;

        // Nếu CSDL lưu URL đầy đủ thì sử dụng trực tiếp
        if (/^https?:\/\//i.test(value)) {
            imageUrl = value;
        } else if (value.startsWith("/")) {
            // Nếu CSDL lưu đường dẫn nội bộ
            imageUrl = value;
        } else {
            // Nếu CSDL lưu fileKey của ảnh trên Cloudflare R2
            imageUrl =
                "/api/images/view?fileKey=" +
                encodeURIComponent(value.replace(/^\/+/, ""));
        }

        img.onload = function () {
            img.hidden = false;
            fallback.hidden = true;
        };

        img.onerror = function () {
            img.hidden = true;
            fallback.hidden = false;
            console.error("Không tải được ảnh đại diện:", imageUrl);
        };

        // Gửi JWT để tải ảnh nếu API cần xác thực
        const jwt = token();

        if (!jwt || /^https?:\/\//i.test(value)) {
            img.src = imageUrl;
            return;
        }

        // Dùng fetch để gửi Authorization header
        fetch(imageUrl, {
            method: "GET",
            cache: "no-store",
            headers: {
                Authorization: `Bearer ${jwt}`
            }
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(
                        `Không tải được ảnh (HTTP ${response.status})`
                    );
                }

                return response.blob();
            })
            .then(blob => {
                // Giải phóng URL ảnh cũ nếu có
                if (img.dataset.objectUrl) {
                    URL.revokeObjectURL(img.dataset.objectUrl);
                }

                const objectUrl = URL.createObjectURL(blob);
                img.dataset.objectUrl = objectUrl;
                img.src = objectUrl;
            })
            .catch(error => {
                img.hidden = true;
                fallback.hidden = false;
                console.error("Lỗi tải ảnh đại diện:", error);
            });
    }


    function render(data) {
        profile = data;
        const ma = data.maNguoiDung == null ? "—" : `ND${String(data.maNguoiDung).padStart(6, "0")}`;
        const role = data.vaiTro === "CHUYENTRACH" ? "Nhân viên chuyên trách" : (data.vaiTro || "—");
        setText("cthsName", data.hoTen);
        setText("cthsCode", ma);
        setText("cthsEmail", data.email);
        setText("cthsPhone", data.soDienThoai);
        setText("cthsDepartment", data.boPhanHienThi);
        setText("cthsDetailName", data.hoTen);
        setText("cthsDetailCode", ma);
        setText("cthsDetailEmail", data.email);
        setText("cthsDetailPhone", data.soDienThoai);
        setText("cthsDetailRole", role);
        setText("cthsUsername", data.tenDangNhap);
        setText("cthsDetailDepartment", data.boPhanHienThi);
        const status = $("cthsAccountStatus");
        status.textContent = data.trangThai ? "Đang hoạt động bình thường" : "Tài khoản đã khóa";
        status.classList.toggle("locked", !data.trangThai);
        buttonEdit.disabled = !data.trangThai;
        showAvatar(data.anhDaiDien);
    }

    async function load() {
        try {
            render(await request());
        } catch (error) {
            buttonEdit.disabled = true;
            showMessage(error.message, true);
        }
    }

    buttonEdit.addEventListener("click", () => {
        if (!profile) return;
        $("cthsEditName").value = profile.hoTen || "";
        const phone = $("cthsEditPhone");
        phone.value = profile.soDienThoai || "";
        phone.disabled = !profile.coTheSuaSoDienThoai;
        $("cthsEditHint").hidden = !!profile.coTheSuaSoDienThoai;
        $("cthsEditHint").textContent = "Số điện thoại không nằm trong Entity NguoiDung nên chưa thể chỉnh ở trang này.";
        dialog.showModal();
    });

    function closeDialog() {
        if (!saving && dialog.open) dialog.close();
    }
    $("cthsCloseDialog").addEventListener("click", closeDialog);
    $("cthsCancelEdit").addEventListener("click", closeDialog);
    dialog.addEventListener("cancel", e => { if (saving) e.preventDefault(); });

    $("cthsEditForm").addEventListener("submit", async event => {
        event.preventDefault();
        if (saving || !profile) return;
        const name = $("cthsEditName").value.trim();
        const phone = $("cthsEditPhone").value.trim();
        if (name.length < 2) { showMessage("Họ tên phải có ít nhất 2 ký tự.", true); return; }
        saving = true;
        buttonSave.disabled = true;
        buttonSave.textContent = "Đang lưu...";
        try {
            const data = await request("PUT", {
                hoTen: name,
                soDienThoai: profile.coTheSuaSoDienThoai ? phone : ""
            });
            render(data);
            dialog.close();
            showMessage("Đã cập nhật hồ sơ cá nhân thành công.");
        } catch (error) {
            showMessage(error.message, true);
            dialog.close();
        } finally {
            saving = false;
            buttonSave.disabled = false;
            buttonSave.textContent = "Lưu thay đổi";
        }
    });

    load();
});
