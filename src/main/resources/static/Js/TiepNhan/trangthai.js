(() => {
    "use strict";

    // =====================================================
    // DANH SÁCH CỐ ĐỊNH 12 TRẠNG THÁI
    // =====================================================

    const danhSach = Object.freeze([
        { ma: "ChoGoi", ten: "Chờ gọi" },
        { ma: "DaGoi", ten: "Đã gọi" },
        { ma: "DaTiepNhan", ten: "Đã tiếp nhận" },
        { ma: "ChoKham", ten: "Chờ khám" },
        { ma: "DangKham", ten: "Đang khám" },
        { ma: "ChoThanhToan", ten: "Chờ thanh toán" },
        { ma: "ChoCLS", ten: "Chờ CLS" },
        { ma: "DangCLS", ten: "Đang CLS" },
        { ma: "ChoLayThuoc", ten: "Chờ lấy thuốc" },
        { ma: "DangLayThuoc", ten: "Đang lấy thuốc" },
        { ma: "HoanTat", ten: "Hoàn tất" },
        { ma: "DaHuy", ten: "Đã hủy" }
    ].map(item => Object.freeze(item)));

    // =====================================================
    // CHUẨN HÓA MÃ VÀ TÊN TIẾNG VIỆT
    // =====================================================

    function chuanHoa(value) {
        return String(value ?? "")
            .trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[đĐ]/g, "d")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");
    }

    const bangTra = new Map();

    danhSach.forEach(item => {
        bangTra.set(chuanHoa(item.ma), item);
        bangTra.set(chuanHoa(item.ten), item);
    });

    // Nhận "DaGoi" hoặc "Đã gọi", trả về "DaGoi".
    function layMa(value) {
        return bangTra.get(chuanHoa(value))?.ma || "";
    }

    // Nhận mã hoặc tên, trả về tên hiển thị thống nhất.
    function layTen(value) {
        const item = bangTra.get(chuanHoa(value));

        if (item) {
            return item.ten;
        }

        // Giữ nguyên dữ liệu lạ để nhận biết,
        // không tự chuyển sang một trạng thái khác.
        return String(value ?? "").trim() || "Chưa xác định";
    }

    // =====================================================
    // GÁN NHÃN TRẠNG THÁI VÀ MÀU DÙNG CHUNG
    // =====================================================

    function ganNhan(element, value) {
        if (!(element instanceof HTMLElement)) {
            throw new Error(
                "Không tìm thấy phần tử hiển thị trạng thái."
            );
        }

        // Bỏ các class màu cũ của nhãn.
        element.className = "tn-status";

        // Bỏ màu được gán trực tiếp bằng JavaScript trước đây.
        [
            "background",
            "background-color",
            "color",
            "border-color"
        ].forEach(property => {
            element.style.removeProperty(property);
        });

        const ma = layMa(value);

        if (ma) {
            element.dataset.status = ma;
        } else {
            delete element.dataset.status;
        }

        element.textContent = layTen(value);

        return element;
    }

    function taoNhan(value) {
        const element = document.createElement("span");

        return ganNhan(element, value);
    }

    // =====================================================
    // TẠO BỘ LỌC ĐỦ 12 TRẠNG THÁI
    // =====================================================

    function taoBoLoc(select, kieuGiaTri = "ma") {
        if (!(select instanceof HTMLSelectElement)) {
            throw new Error(
                "Không tìm thấy ô lọc trạng thái."
            );
        }

        if (!["ma", "ten"].includes(kieuGiaTri)) {
            throw new Error(
                "Kiểu giá trị bộ lọc phải là ma hoặc ten."
            );
        }

        // Giữ lựa chọn hiện tại nếu vẫn hợp lệ.
        const maCu = layMa(select.value);

        select.replaceChildren(
            new Option("Tất cả trạng thái", "")
        );

        danhSach.forEach(item => {
            select.add(
                new Option(
                    item.ten,
                    item[kieuGiaTri]
                )
            );
        });

        const luaChonCu = danhSach.find(
            item => item.ma === maCu
        );

        select.value = luaChonCu
            ? luaChonCu[kieuGiaTri]
            : "";

        // Trang sử dụng tự xử lý sự kiện change
        // để lọc hoặc tải lại dữ liệu.
    }

    // =====================================================
    // CÁC TRANG CÙNG SỬ DỤNG
    // =====================================================

    window.TiepNhanTrangThai = Object.freeze({
        danhSach,
        layMa,
        layTen,
        ganNhan,
        taoNhan,
        taoBoLoc
    });
})();