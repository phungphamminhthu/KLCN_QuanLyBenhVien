document.addEventListener("DOMContentLoaded", function () {

    /*
    ==================================================
    QUẢN LÝ MENU SIDEBAR
    ==================================================
    */

    const MenuParents =
        document.querySelectorAll(".menu-parent");


    MenuParents.forEach(function (MenuParent) {

        MenuParent.addEventListener("click", function () {

            const MenuGroup =
                this.closest(".menu-group");

            if (!MenuGroup) {
                return;
            }

            /*
            Đóng/mở menu hiện tại
            */
            MenuGroup.classList.toggle("open");

        });

    });


    /*
    ==================================================
    THÔNG TIN ADMIN
    ==================================================
    */

    const AdminName =
        document.getElementById("adminName");

    const AdminEmail =
        document.getElementById("adminEmail");

    const AdminAvatar =
        document.getElementById("adminAvatar");


    /*
    ==================================================
    LẤY THÔNG TIN ĐĂNG NHẬP
    ==================================================
    */

    const Token =
        localStorage.getItem("Token")
        || sessionStorage.getItem("Token");


    const HoTen =
        localStorage.getItem("HoTen")
        || sessionStorage.getItem("HoTen");


    const Email =
        localStorage.getItem("Email")
        || sessionStorage.getItem("Email");


    const VaiTro =
        localStorage.getItem("VaiTro")
        || sessionStorage.getItem("VaiTro");


    const AnhDaiDien =
        localStorage.getItem("AnhDaiDien")
        || sessionStorage.getItem("AnhDaiDien");


    /*
    ==================================================
    KIỂM TRA ĐĂNG NHẬP
    ==================================================
    */

    if (!Token) {

        alert("Vui lòng đăng nhập.");

        window.location.href =
            "/auth/login";

        return;
    }


    /*
    ==================================================
    KIỂM TRA QUYỀN ADMIN
    ==================================================
    */

    if (VaiTro !== "ADMIN") {

        alert(
            "Bạn không có quyền truy cập trang quản trị."
        );

        window.location.href =
            "/auth/login";

        return;
    }


    /*
    ==================================================
    HIỂN THỊ THÔNG TIN ADMIN
    ==================================================
    */

    if (HoTen && AdminName) {

        AdminName.textContent =
            HoTen;

    }


    if (Email && AdminEmail) {

        AdminEmail.textContent =
            Email;

    }


    /*
    ==================================================
    HIỂN THỊ AVATAR TỪ CLOUDFLARE R2
    ==================================================
    */

    if (AnhDaiDien && AdminAvatar) {

        AdminAvatar.src =
            "http://localhost:8080/api/images/view?fileKey="
            + encodeURIComponent(AnhDaiDien);

    } else if (AdminAvatar) {

        AdminAvatar.src =
            "/Images/default-avatar.jpg";

    }


    /*
    ==================================================
    XỬ LÝ LỖI AVATAR
    ==================================================
    */

    if (AdminAvatar) {

        AdminAvatar.addEventListener(
            "error",
            function () {

                this.src =
                    "/Images/default-avatar.jpg";

            }
        );

    }

});