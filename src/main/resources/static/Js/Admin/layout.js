document.addEventListener("DOMContentLoaded", function () {

    /* =====================================================
       SIDEBAR MENU
    ===================================================== */

    const menuParents =
        document.querySelectorAll(".menu-parent");

    const submenuLinks =
        document.querySelectorAll(".submenu a");


    menuParents.forEach(function (menuParent) {

        menuParent.addEventListener("click", function () {

            const menuGroup =
                this.closest(".menu-group");

            if (!menuGroup) {
                return;
            }

            menuGroup.classList.toggle("open");

        });

    });


    /* =====================================================
       TỰ ĐỘNG MỞ MENU THEO TRANG HIỆN TẠI
    ===================================================== */

    const currentPath =
        window.location.pathname;


    submenuLinks.forEach(function (link) {

        const linkPath =
            new URL(
                link.href,
                window.location.origin
            ).pathname;


        if (linkPath === currentPath) {

            link.classList.add("active");


            const menuGroup =
                link.closest(".menu-group");


            if (menuGroup) {

                menuGroup.classList.add("open");

            }

        }

    });


    /* =====================================================
       THÔNG TIN ADMIN
    ===================================================== */

    const adminName = document.getElementById("adminName");
    const adminEmail = document.getElementById("adminEmail");
    const adminAvatar = document.getElementById("adminAvatar");

    /* =====================================================
       ẢNH MẶC ĐỊNH
    ===================================================== */

    const DEFAULT_AVATAR = "/Images/default-avatar.jpg";

    /* =====================================================
       LẤY FILE KEY ẢNH ĐẠI DIỆN
    ===================================================== */

    function getAvatarKey() {
        return (
            localStorage.getItem("AnhDaiDien") ||
            sessionStorage.getItem("AnhDaiDien") ||
            ""
        ).trim();
    }

    /* =====================================================
       TẠO URL ẢNH R2
    ===================================================== */

    function getAvatarUrl(fileKey) {
        return (
            "/api/images/view?fileKey=" +
            encodeURIComponent(fileKey) +
            "&t=" +
            Date.now()
        );
    }

    /* =====================================================
       CẬP NHẬT THÔNG TIN HEADER
    ===================================================== */

    function updateHeaderInfo() {
        const hoTen =
            localStorage.getItem("HoTen") ||
            sessionStorage.getItem("HoTen");

        const email =
            localStorage.getItem("Email") ||
            sessionStorage.getItem("Email");

        if (adminName) {
            adminName.textContent = hoTen || "Quản trị viên";
        }

        if (adminEmail) {
            adminEmail.textContent = email || "";
        }
    }

    /* =====================================================
       CẬP NHẬT AVATAR
    ===================================================== */

    function updateHeaderAvatar() {
        if (!adminAvatar) {
            return;
        }

        // Tránh lặp sự kiện lỗi ảnh
        adminAvatar.onerror = null;

        // Lấy file key được lưu sau khi đăng nhập hoặc cập nhật hồ sơ
        const fileKey = getAvatarKey();

        // Không có file key thì sử dụng ảnh mặc định trực tiếp
        if (!fileKey || fileKey.toLowerCase() === "null") {
            adminAvatar.src = DEFAULT_AVATAR;
            return;
        }

        // Có file key thì tải ảnh từ API R2
        adminAvatar.onerror = function () {
            this.onerror = null;
            this.src = DEFAULT_AVATAR;
        };

        adminAvatar.src = getAvatarUrl(fileKey);
    }

    /* =====================================================
       LOAD HEADER BAN ĐẦU
    ===================================================== */

    updateHeaderInfo();
    updateHeaderAvatar();

    /* =====================================================
       ĐỒNG BỘ PROFILE → HEADER
    ===================================================== */

    window.addEventListener("profileUpdated", function () {
        updateHeaderInfo();
        updateHeaderAvatar();
    });

});