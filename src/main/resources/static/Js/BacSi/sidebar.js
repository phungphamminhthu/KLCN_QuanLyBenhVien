document.addEventListener("DOMContentLoaded", function () {

    const menuGroups = document.querySelectorAll(".menu-group");

    menuGroups.forEach(function (group) {

        const menuItem = group.querySelector(":scope > .menu-item");
        const submenu = group.querySelector(":scope > .submenu");

        if (!menuItem || !submenu) {
            return;
        }

        // Mặc định luôn đóng
        submenu.classList.remove("open");
        menuItem.classList.remove("open");

        // Bấm Khám bệnh -> mở / đóng
        menuItem.addEventListener("click", function () {

            submenu.classList.toggle("open");
            menuItem.classList.toggle("open");

        });

    });

});