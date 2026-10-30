document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const $ = id => document.getElementById(id);
    const URL_API = "/api/chuyen-trach/ho-so-ca-nhan";

    const dialog = $("cthsEditDialog");
    const buttonEdit = $("cthsEditButton");
    const buttonSave = $("cthsSaveEdit");

    let profile = null;
    let saving = false;

    // ============================================
    // 1. TOKEN VÀ GỌI API
    // ============================================

    function token() {
        return sessionStorage.getItem("Token") ||
            localStorage.getItem("Token");
    }

    async function request(method = "GET", body = null) {
        const jwt = token();

        if (!jwt) {
            throw new Error(
                "Không tìm thấy Token đăng nhập. Hãy đăng nhập lại bằng tài khoản Chuyên trách."
            );
        }

        const response = await fetch(URL_API, {
            method,
            cache: "no-store",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${jwt}`,
                ...(body
                    ? { "Content-Type": "application/json" }
                    : {})
            },
            ...(body
                ? { body: JSON.stringify(body) }
                : {})
        });

        if (!response.ok) {
            let errorText =
                `Không tải được hồ sơ (HTTP ${response.status}).`;

            try {
                const error = await response.json();
                errorText =
                    error.detail ||
                    error.message ||
                    errorText;
            } catch (_) {
                // Giữ thông báo HTTP mặc định.
            }

            if (
                response.status === 401 ||
                response.status === 403
            ) {
                errorText =
                    "Tài khoản chưa đăng nhập hoặc không có quyền CHUYENTRACH.";
            }

            throw new Error(errorText);
        }

        return response.json();
    }

    // ============================================
    // 2. HIỂN THỊ THÔNG BÁO
    // ============================================

    function showMessage(message, isError = false) {
        const el = $("cthsMessage");

        if (!el) return;

        el.textContent = message;
        el.classList.toggle("error", isError);
        el.hidden = false;
    }

    function setText(id, value) {
        const el = $(id);

        if (!el) return;

        el.textContent =
            value == null || String(value).trim() === ""
                ? "Chưa cập nhật"
                : String(value);
    }

    // ============================================
    // 3. HIỂN THỊ ẢNH ĐẠI DIỆN
    // Hỗ trợ URL, đường dẫn nội bộ và fileKey R2
    // ============================================

    function showAvatar(source) {
        const img = $("cthsAvatar");
        const fallback = $("cthsAvatarFallback");

        if (!img || !fallback) return;

        // Mặc định hiển thị icon khi chưa tải được ảnh.
        img.hidden = true;
        img.removeAttribute("src");
        fallback.hidden = false;

        // Thu hồi URL ảnh tạm cũ nếu có.
        if (img.dataset.objectUrl) {
            URL.revokeObjectURL(img.dataset.objectUrl);
            delete img.dataset.objectUrl;
        }

        if (typeof source !== "string") return;

        const value = source.trim();

        if (
            !value ||
            ["null", "undefined"].includes(value.toLowerCase())
        ) {
            return;
        }

        let imageUrl;
        let isExternalUrl = false;

        // Trường hợp CSDL lưu URL đầy đủ.
        if (/^https?:\/\//i.test(value)) {
            try {
                const parsedUrl = new URL(value);

                if (
                    parsedUrl.protocol !== "https:" &&
                    !(
                        parsedUrl.protocol === "http:" &&
                        parsedUrl.origin === window.location.origin
                    )
                ) {
                    return;
                }

                imageUrl = parsedUrl.href;
                isExternalUrl =
                    parsedUrl.origin !== window.location.origin;
            } catch (_) {
                return;
            }
        } else if (value.startsWith("/")) {
            // Trường hợp CSDL lưu đường dẫn nội bộ.
            imageUrl = value;
        } else {
            // Trường hợp CSDL lưu fileKey của Cloudflare R2.
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

            console.error(
                "Không tải được ảnh đại diện:",
                imageUrl
            );
        };

        const jwt = token();

        // URL bên ngoài được tải trực tiếp.
        // URL nội bộ có thể cần JWT.
        if (!jwt || isExternalUrl) {
            img.src = imageUrl;
            return;
        }

        // Gửi JWT trong header khi tải ảnh nội bộ.
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
                if (!blob || blob.size === 0) {
                    throw new Error("Tệp ảnh rỗng.");
                }

                // Giải phóng URL ảnh tạm trước đó.
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

                console.error(
                    "Lỗi tải ảnh đại diện:",
                    error
                );
            });
    }

    // ============================================
    // 4. HIỂN THỊ HỒ SƠ CÁ NHÂN
    // ============================================

    function render(data) {
        profile = data;

        const ma = data.maNguoiDung == null
            ? "—"
            : `ND${String(data.maNguoiDung).padStart(6, "0")}`;

        const role = data.vaiTro === "CHUYENTRACH"
            ? "Nhân viên chuyên trách"
            : (data.vaiTro || "—");

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

        if (status) {
            status.textContent = data.trangThai
                ? "Đang hoạt động bình thường"
                : "Tài khoản đã khóa";

            status.classList.toggle(
                "locked",
                !data.trangThai
            );
        }

        if (buttonEdit) {
            buttonEdit.disabled = !data.trangThai;
        }

        showAvatar(data.anhDaiDien);
    }

    // ============================================
    // 5. TẢI HỒ SƠ
    // ============================================

    async function load() {
        try {
            const data = await request();
            render(data);
        } catch (error) {
            if (buttonEdit) {
                buttonEdit.disabled = true;
            }

            showMessage(error.message, true);
        }
    }

    // ============================================
    // 6. MỞ FORM CHỈNH SỬA
    // ============================================

    if (buttonEdit) {
        buttonEdit.addEventListener("click", () => {
            if (!profile || !dialog) return;

            $("cthsEditName").value =
                profile.hoTen || "";

            const phone = $("cthsEditPhone");

            phone.value = profile.soDienThoai || "";
            phone.disabled = !profile.coTheSuaSoDienThoai;

            const hint = $("cthsEditHint");

            if (hint) {
                hint.hidden = !!profile.coTheSuaSoDienThoai;

                hint.textContent =
                    "Số điện thoại không nằm trong Entity NguoiDung nên chưa thể chỉnh ở trang này.";
            }

            dialog.showModal();
        });
    }

    // ============================================
    // 7. ĐÓNG FORM
    // ============================================

    function closeDialog() {
        if (!saving && dialog && dialog.open) {
            dialog.close();
        }
    }

    const closeButton = $("cthsCloseDialog");
    const cancelButton = $("cthsCancelEdit");

    if (closeButton) {
        closeButton.addEventListener("click", closeDialog);
    }

    if (cancelButton) {
        cancelButton.addEventListener("click", closeDialog);
    }

    if (dialog) {
        dialog.addEventListener("cancel", event => {
            if (saving) {
                event.preventDefault();
            }
        });
    }

    // ============================================
    // 8. LƯU THAY ĐỔI
    // ============================================

    const editForm = $("cthsEditForm");

    if (editForm) {
        editForm.addEventListener("submit", async event => {
            event.preventDefault();

            if (saving || !profile) return;

            const name = $("cthsEditName").value.trim();
            const phone = $("cthsEditPhone").value.trim();

            if (name.length < 2) {
                showMessage(
                    "Họ tên phải có ít nhất 2 ký tự.",
                    true
                );
                return;
            }

            saving = true;

            if (buttonSave) {
                buttonSave.disabled = true;
                buttonSave.textContent = "Đang lưu...";
            }

            try {
                const data = await request("PUT", {
                    hoTen: name,
                    soDienThoai: profile.coTheSuaSoDienThoai
                        ? phone
                        : ""
                });

                render(data);

                if (dialog && dialog.open) {
                    dialog.close();
                }

                showMessage(
                    "Đã cập nhật hồ sơ cá nhân thành công."
                );
            } catch (error) {
                showMessage(error.message, true);
            } finally {
                saving = false;

                if (buttonSave) {
                    buttonSave.disabled = false;
                    buttonSave.textContent = "Lưu thay đổi";
                }
            }
        });
    }

    // ============================================
    // 9. KHỞI TẠO
    // ============================================

    load();
});