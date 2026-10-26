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

    function showAvatar(url) {
        const img = $("cthsAvatar");
        const fallback = $("cthsAvatarFallback");
        img.hidden = true;
        fallback.hidden = false;
        if (typeof url !== "string" || !url.trim()) return;
        try {
            const value = new URL(url, window.location.origin);
            if (value.protocol !== "https:" && value.origin !== window.location.origin) return;
            img.onload = () => { img.hidden = false; fallback.hidden = true; };
            img.onerror = () => { img.hidden = true; fallback.hidden = false; };
            img.src = value.href;
        } catch (_) { /* Hiện icon mặc định */ }
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
