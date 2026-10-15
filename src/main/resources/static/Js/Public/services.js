
// =============================================
// MEDCARE HOSPITAL - TRANG DỊCH VỤ Y TẾ
// =============================================

document.addEventListener("DOMContentLoaded", function () {

    // =========================================
    // 1. LẤY CÁC THÀNH PHẦN GIAO DIỆN
    // =========================================

    const categoryButtons = Array.from(
        document.querySelectorAll(".category-button")
    );

    const serviceButtons = Array.from(
        document.querySelectorAll(".service-list-item")
    );

    const searchInput = document.getElementById("serviceSearch");

    const clearSearchButton =
        document.getElementById("clearServiceSearch");

    const serviceCount =
        document.getElementById("serviceCount");

    const serviceNotFound =
        document.getElementById("serviceNotFound");

    const detailPlaceholder =
        document.getElementById("detailPlaceholder");

    const serviceDetail =
        document.getElementById("serviceDetail");

    const detailCategory =
        document.getElementById("detailCategory");

    const detailName =
        document.getElementById("detailName");

    const detailDescription =
        document.getElementById("detailDescription");

    const detailPrice =
        document.getElementById("detailPrice");

    // Nếu trang không có dữ liệu dịch vụ thì kết thúc
    if (!searchInput || serviceButtons.length === 0) {
        return;
    }

    // =========================================
    // 2. TRẠNG THÁI HIỆN TẠI
    // =========================================

    let selectedCategory = "all";
    let selectedServiceId = null;
    let selectedServiceButton = null;

    // =========================================
    // 3. CHUẨN HÓA CHUỖI TÌM KIẾM
    // =========================================

    function normalizeText(text) {
        return String(text || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d")
            .replace(/Đ/g, "D")
            .toLowerCase()
            .trim();
    }

    // =========================================
    // 4. HIỂN THỊ CHI TIẾT DỊCH VỤ
    // =========================================

    function showServiceDetail(button) {

        if (!button) {
            serviceDetail.hidden = true;
            detailPlaceholder.hidden = false;

            selectedServiceId = null;
            selectedServiceButton = null;

            serviceButtons.forEach(item => {
                item.classList.remove("active");
                item.setAttribute("aria-pressed", "false");
            });

            return;
        }

        const service = button.dataset;

        selectedServiceId = service.id;
        selectedServiceButton = button;

        // Tên, loại, mô tả và giá lấy từ MySQL
        detailCategory.textContent =
            service.category || "Dịch vụ y tế";

        detailName.textContent =
            service.name || "Chưa có tên dịch vụ";

        detailDescription.textContent =
            service.description ||
            "Chưa có mô tả cho dịch vụ này.";

        detailPrice.textContent =
            service.price || "Liên hệ";

        // Ẩn hướng dẫn, hiện chi tiết
        detailPlaceholder.hidden = true;
        serviceDetail.hidden = false;

        // Đánh dấu dịch vụ được chọn
        serviceButtons.forEach(item => {

            const isActive = item === button;

            item.classList.toggle("active", isActive);

            item.setAttribute(
                "aria-pressed",
                String(isActive)
            );

        });

    }

    // =========================================
    // 5. LỌC DANH SÁCH DỊCH VỤ
    // =========================================

    function filterServices() {

        const keyword = normalizeText(searchInput.value);

        let visibleCount = 0;
        const visibleServices = [];

        serviceButtons.forEach(button => {

            const serviceCategory =
                button.dataset.category || "";

            const serviceName =
                button.dataset.name || "";

            const serviceDescription =
                button.dataset.description || "";

            // Kiểm tra danh mục
            const matchCategory =
                selectedCategory === "all" ||
                serviceCategory === selectedCategory;

            // Tìm theo tên, nhóm và mô tả
            const searchContent = normalizeText(
                serviceName + " " +
                serviceCategory + " " +
                serviceDescription
            );

            const matchKeyword =
                keyword === "" ||
                searchContent.includes(keyword);

            const isVisible =
                matchCategory && matchKeyword;

            button.hidden = !isVisible;

            if (isVisible) {
                visibleCount++;
                visibleServices.push(button);
            }

        });

        // Cập nhật số lượng
        serviceCount.textContent =
            visibleCount + " dịch vụ";

        // Hiện thông báo nếu không tìm thấy
        serviceNotFound.hidden = visibleCount !== 0;

        // Hiển thị / ẩn nút xóa từ khóa
        clearSearchButton.hidden =
            searchInput.value.length === 0;

        // Giữ lựa chọn nếu vẫn thuộc kết quả lọc.
        // Nếu không, tự chọn dịch vụ đầu tiên.
        const currentStillVisible =
            selectedServiceButton &&
            visibleServices.includes(selectedServiceButton);

        if (!currentStillVisible) {

            if (visibleServices.length > 0) {
                showServiceDetail(visibleServices[0]);
            } else {
                showServiceDetail(null);
            }

        }

    }

    // =========================================
    // 6. CHỌN NHÓM DỊCH VỤ
    // =========================================

    categoryButtons.forEach(button => {

        button.addEventListener("click", function () {

            selectedCategory =
                button.dataset.category || "all";

            // Cập nhật nút danh mục
            categoryButtons.forEach(item => {

                const isActive = item === button;

                item.classList.toggle(
                    "active",
                    isActive
                );

                item.setAttribute(
                    "aria-pressed",
                    String(isActive)
                );

            });

            // Lọc lại dịch vụ
            filterServices();

        });

    });

    // =========================================
    // 7. CHỌN DỊCH VỤ
    // =========================================

    serviceButtons.forEach(button => {

        button.setAttribute("aria-pressed", "false");

        button.addEventListener("click", function () {

            showServiceDetail(button);

            // Trên điện thoại, cuộn đến bảng chi tiết
            if (window.innerWidth <= 850) {

                const detailColumn = document.querySelector(
                    ".service-detail-column"
                );

                if (detailColumn) {
                    detailColumn.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                }

            }

        });

    });

    // =========================================
    // 8. TÌM KIẾM DỊCH VỤ
    // =========================================

    searchInput.addEventListener(
        "input",
        filterServices
    );

    // =========================================
    // 9. XÓA TÌM KIẾM
    // =========================================

    clearSearchButton.addEventListener(
        "click",
        function () {

            searchInput.value = "";

            filterServices();

            searchInput.focus();

        }
    );

    // =========================================
    // 10. KHỞI TẠO GIAO DIỆN
    // =========================================

    filterServices();

});
