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

    const adminName =
        document.getElementById("adminName");

    const adminEmail =
        document.getElementById("adminEmail");

    const adminAvatar =
        document.getElementById("adminAvatar");


    /* =====================================================
       LẤY TOKEN LOGIN
    ===================================================== */

    const token =
        localStorage.getItem("Token") ||
        sessionStorage.getItem("Token");


    /* =====================================================
       LẤY VAI TRÒ
    ===================================================== */

    const vaiTro =
        localStorage.getItem("VaiTro") ||
        sessionStorage.getItem("VaiTro");


    /* =====================================================
       KIỂM TRA ĐĂNG NHẬP
    ===================================================== */

    if (!token) {

        alert("Vui lòng đăng nhập.");

        window.location.href =
            "/auth/login";

        return;
    }


    /* =====================================================
       KIỂM TRA ROLE ADMIN
    ===================================================== */

    if (
        !vaiTro ||
        vaiTro.toUpperCase() !== "ADMIN"
    ) {

        alert(
            "Bạn không có quyền truy cập trang Quản trị viên."
        );

        window.location.href =
            "/auth/login";

        return;
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

            adminName.textContent =
                hoTen || "Quản trị viên";

        }


        if (adminEmail) {

            adminEmail.textContent =
                email || "";

        }

    }


    /* =====================================================
       AVATAR CLOUDFLARE R2
    ===================================================== */

    const defaultAvatar =
        "images/2b1261cf-87ab-4b5c-9097-50cd95b2fc24.jpg";


    function getAvatarUrl(fileKey) {

        return (
            "/api/images/view?fileKey=" +
            encodeURIComponent(fileKey) +
            "&t=" +
            Date.now()
        );

    }


    /* =====================================================
       CẬP NHẬT AVATAR
    ===================================================== */

    function updateHeaderAvatar() {

        if (!adminAvatar) {
            return;
        }


        const anhDaiDien =
            localStorage.getItem("AnhDaiDien") ||
            sessionStorage.getItem("AnhDaiDien");


        const fileKey =
            anhDaiDien || defaultAvatar;


        adminAvatar.src =
            getAvatarUrl(fileKey);


        /* ================================================
           NẾU ẢNH LỖI → DÙNG ẢNH DEFAULT
        ================================================= */

        adminAvatar.onerror =
            function () {

                this.onerror = null;

                this.src =
                    getAvatarUrl(defaultAvatar);

            };

    }


    /* =====================================================
       LOAD HEADER BAN ĐẦU
    ===================================================== */

    updateHeaderInfo();

    updateHeaderAvatar();


    /* =====================================================
       ĐỒNG BỘ PROFILE → HEADER
    ===================================================== */

    window.addEventListener(
        "profileUpdated",
        function () {

            updateHeaderInfo();

            updateHeaderAvatar();

        }
    );

});