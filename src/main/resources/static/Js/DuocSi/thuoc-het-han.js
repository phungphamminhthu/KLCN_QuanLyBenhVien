document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    // =====================================================
    // CẤU HÌNH
    // =====================================================
    const KHO_API_URL = "/api/kho-thuoc";
    const THUOC_API_URL = "/api/medicines";
    const EXPORT_NOTIFICATION_URL =
        "/api/kho-thuoc/thong-bao-xuat-file-het-han";

    const ITEMS_PER_PAGE = 5;

    let danhSachKho = [];
    let danhSachThuoc = [];
    let danhSachHetHan = [];
    let danhSachLoc = [];
    let currentPage = 1;

    // =====================================================
    // DOM
    // =====================================================
    const $ = (id) => document.getElementById(id);

    const expiredTableBody = $("expiredTableBody");
    const expiredKeyword = $("expiredKeyword");
    const expiredBatch = $("expiredBatch");
    const expiredSearchButton = $("expiredSearchButton");
    const expiredResetButton = $("expiredResetButton");
    const expiredWarningCount = $("expiredWarningCount");
    const expiredResultInfo = $("expiredResultInfo");
    const expiredPagination = $("expiredPagination");
    const exportExpiredButton = $("exportExpiredButton");

    function getDetailModal() {
        return $("expiredDetailModal");
    }

    // =====================================================
    // TOKEN VÀ API
    // =====================================================
    function getToken() {
        const keys = [
            "Token",
            "token",
            "JwtToken",
            "jwtToken",
            "accessToken",
            "access_token",
            "jwt"
        ];

        for (const key of keys) {
            const token =
                sessionStorage.getItem(key) ||
                localStorage.getItem(key);

            if (token) {
                return token.replace(/^Bearer\s+/i, "");
            }
        }

        return "";
    }

    function getHeaders() {
        const headers = {
            Accept: "application/json"
        };

        const token = getToken();

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        return headers;
    }

    async function fetchArray(url) {
        const response = await fetch(url, {
            method: "GET",
            headers: getHeaders(),
            credentials: "same-origin"
        });

        if (response.status === 401 || response.status === 403) {
            throw new Error(
                "Phiên đăng nhập hết hạn hoặc bạn không có quyền truy cập."
            );
        }

        if (!response.ok) {
            throw new Error(
                `Không thể tải dữ liệu (${response.status}).`
            );
        }

        const result = await response.json();

        if (Array.isArray(result)) return result;
        if (Array.isArray(result.data)) return result.data;
        if (Array.isArray(result.items)) return result.items;
        if (Array.isArray(result.result)) return result.result;

        return [];
    }

    // =====================================================
    // HÀM ĐỌC DỮ LIỆU
    // Hỗ trợ camelCase và PascalCase
    // =====================================================
    function valueOf(obj, ...keys) {
        if (!obj) return undefined;

        for (const key of keys) {
            if (obj[key] !== undefined && obj[key] !== null) {
                return obj[key];
            }
        }

        return undefined;
    }

    function getMedicine(item) {
        return item?.thuoc || item?.Thuoc || null;
    }

    function getMaThuoc(item) {
        return valueOf(item, "maThuoc", "MaThuoc") ??
            valueOf(getMedicine(item), "maThuoc", "MaThuoc") ??
            "";
    }

    function getTenThuoc(item) {
        return valueOf(item, "tenThuoc", "TenThuoc") ??
            valueOf(getMedicine(item), "tenThuoc", "TenThuoc") ??
            "";
    }

    function getDonViTinh(item) {
        return valueOf(item, "donViTinh", "DonViTinh") ??
            valueOf(getMedicine(item), "donViTinh", "DonViTinh") ??
            "";
    }

    function getHoatChat(item) {
        return valueOf(
            item,
            "hoatChat",
            "HoatChat",
            "hoatChatChinh",
            "HoatChatChinh"
        ) ?? valueOf(
            getMedicine(item),
            "hoatChat",
            "HoatChat",
            "hoatChatChinh",
            "HoatChatChinh"
        ) ?? "";
    }

    function getSoLo(item) {
        return valueOf(item, "soLo", "SoLo") ?? "";
    }

    function getSoLuongTon(item) {
        const value = valueOf(
            item,
            "soLuongTon",
            "SoLuongTon",
            "tonKho",
            "TonKho"
        );

        const number = Number(value ?? 0);

        return Number.isFinite(number) ? number : 0;
    }

    function getHanSuDung(item) {
        return valueOf(item, "hanSuDung", "HanSuDung") ?? null;
    }

    function getNgayPhatHien(item) {
        return valueOf(
            item,
            "ngayPhatHien",
            "NgayPhatHien",
            "thoiGianCapNhatCuoi",
            "ThoiGianCapNhatCuoi"
        ) ?? null;
    }

    // =====================================================
    // FORMAT VÀ AN TOÀN HTML
    // =====================================================
    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[char]);
    }

    function displayValue(value) {
        return value === null || value === undefined || value === ""
            ? "-"
            : String(value);
    }

    function parseDate(value) {
        if (!value) return null;

        const text = String(value);
        const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

        let date;

        if (match) {
            date = new Date(
                Number(match[1]),
                Number(match[2]) - 1,
                Number(match[3])
            );

            if (
                date.getFullYear() !== Number(match[1]) ||
                date.getMonth() !== Number(match[2]) - 1 ||
                date.getDate() !== Number(match[3])
            ) {
                return null;
            }
        } else {
            date = new Date(value);
        }

        if (Number.isNaN(date.getTime())) return null;

        date.setHours(0, 0, 0, 0);

        return date;
    }

    function formatDate(value) {
        const date = parseDate(value);

        if (!date) return "-";

        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");

        return `${day}/${month}/${date.getFullYear()}`;
    }

    function formatDateTime(value) {
        if (!value) return "-";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return formatDate(value);
        }

        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");

        return `${day}/${month}/${date.getFullYear()}`;
    }

    function getExpiredDays(value) {
        const expiryDate = parseDate(value);

        if (!expiryDate) return null;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return Math.floor(
            (today.getTime() - expiryDate.getTime()) /
            (24 * 60 * 60 * 1000)
        );
    }

    // =====================================================
    // GHÉP DỮ LIỆU KHO THUỐC VÀ THUỐC
    // =====================================================
    function buildExpiredList() {
        danhSachHetHan = danhSachKho
            .map((kho) => {
                const maThuoc = getMaThuoc(kho);
                let medicine = getMedicine(kho);

                if (!medicine) {
                    medicine = danhSachThuoc.find((thuoc) =>
                        String(getMaThuoc(thuoc)) === String(maThuoc)
                    ) || null;
                }

                const item = {
                    ...(medicine || {}),
                    ...kho,
                    thuoc: medicine || getMedicine(kho)
                };

                item.maThuoc = maThuoc || getMaThuoc(medicine);
                item.tenThuoc = getTenThuoc(medicine) || getTenThuoc(kho);
                item.donViTinh = getDonViTinh(medicine) || getDonViTinh(kho);
                item.hoatChat = getHoatChat(medicine) || getHoatChat(kho);
                item.soLo = getSoLo(kho);
                item.soLuongTon = getSoLuongTon(kho);
                item.hanSuDung = getHanSuDung(kho);
                item.ngayPhatHien = getNgayPhatHien(kho);

                return item;
            })
            .filter((item) => {
                const days = getExpiredDays(getHanSuDung(item));
                return days !== null && days > 0;
            })
            .sort((a, b) =>
                (getExpiredDays(getHanSuDung(b)) ?? -999999) -
                (getExpiredDays(getHanSuDung(a)) ?? -999999)
            );
    }

    // =====================================================
    // TÌM KIẾM VÀ LỌC
    // =====================================================
    function applyFilters() {
        const keyword = (expiredKeyword?.value || "")
            .trim()
            .toLocaleLowerCase("vi");

        const batch = (expiredBatch?.value || "")
            .trim()
            .toLocaleLowerCase("vi");

        danhSachLoc = danhSachHetHan.filter((item) => {
            const medicineText = [
                getTenThuoc(item),
                getMaThuoc(item)
            ].join(" ").toLocaleLowerCase("vi");

            const batchText = String(getSoLo(item))
                .toLocaleLowerCase("vi");

            return medicineText.includes(keyword) &&
                batchText.includes(batch);
        });

        currentPage = 1;

        renderTable();
        renderPagination();
        updateResultInfo();
        updateWarning();
    }

    function resetFilters() {
        if (expiredKeyword) expiredKeyword.value = "";
        if (expiredBatch) expiredBatch.value = "";

        applyFilters();
    }

    // =====================================================
    // HIỂN THỊ BẢNG
    // =====================================================
    function createRow(item, index) {
        const maThuoc = displayValue(getMaThuoc(item));
        const tenThuoc = displayValue(getTenThuoc(item));
        const soLo = displayValue(getSoLo(item));
        const hanSuDung = getHanSuDung(item);
        const soLuongTon = getSoLuongTon(item);
        const ngayPhatHien = getNgayPhatHien(item);

        return `
            <tr>
                <td class="text-center">${index + 1}</td>

                <td>
                    <span class="expired-medicine-code">
                        ${escapeHtml(maThuoc)}
                    </span>
                </td>

                <td>
                    <div class="expired-medicine-name">
                        ${escapeHtml(tenThuoc)}
                    </div>
                </td>

                <td>
                    <span class="expired-batch">
                        ${escapeHtml(soLo)}
                    </span>
                </td>

                <td>
                    <span class="expired-date">
                        ${escapeHtml(formatDate(hanSuDung))}
                    </span>
                </td>

                <td class="text-center">
                    <span class="expired-stock">
                        ${escapeHtml(soLuongTon)}
                    </span>
                </td>

                <td>
                    <span class="expired-date">
                        ${escapeHtml(formatDateTime(ngayPhatHien))}
                    </span>
                </td>

                <td class="text-center">
                    <span class="expired-status-badge expired">
                        Đã hết hạn
                    </span>
                </td>

                <td class="text-center">
                    <button
                        type="button"
                        class="expired-detail-button"
                        data-index="${index}">
                        Xem chi tiết
                    </button>
                </td>
            </tr>
        `;
    }

    function renderTable() {
        if (!expiredTableBody) return;

        if (danhSachLoc.length === 0) {
            expiredTableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="expired-table-loading">
                        Không có thuốc hết hạn phù hợp.
                    </td>
                </tr>
            `;

            return;
        }

        const start = (currentPage - 1) * ITEMS_PER_PAGE;

        const pageData = danhSachLoc.slice(
            start,
            start + ITEMS_PER_PAGE
        );

        expiredTableBody.innerHTML = pageData
            .map((item, index) => createRow(item, start + index))
            .join("");
    }

    // =====================================================
    // PHÂN TRANG
    // =====================================================
    function renderPagination() {
        if (!expiredPagination) return;

        const totalPages = Math.ceil(
            danhSachLoc.length / ITEMS_PER_PAGE
        );

        if (totalPages <= 1) {
            expiredPagination.innerHTML = "";
            return;
        }

        let html = `
            <button
                type="button"
                class="page-button"
                data-page="${currentPage - 1}"
                aria-label="Trang trước"
                ${currentPage === 1 ? "disabled" : ""}>
                &lsaquo;
            </button>
        `;

        for (let page = 1; page <= totalPages; page++) {
            html += `
                <button
                    type="button"
                    class="page-button ${page === currentPage ? "active" : ""}"
                    data-page="${page}"
                    aria-label="Trang ${page}"
                    ${page === currentPage ? 'aria-current="page"' : ""}>
                    ${page}
                </button>
            `;
        }

        html += `
            <button
                type="button"
                class="page-button"
                data-page="${currentPage + 1}"
                aria-label="Trang sau"
                ${currentPage === totalPages ? "disabled" : ""}>
                &rsaquo;
            </button>
        `;

        expiredPagination.innerHTML = html;
    }

    function updateResultInfo() {
        if (!expiredResultInfo) return;

        const total = danhSachLoc.length;

        const start = total === 0
            ? 0
            : (currentPage - 1) * ITEMS_PER_PAGE + 1;

        const end = Math.min(
            currentPage * ITEMS_PER_PAGE,
            total
        );

        expiredResultInfo.textContent =
            `Hiển thị ${start} - ${end} trong ${total} kết quả`;
    }

    function updateWarning() {
        if (expiredWarningCount) {
            expiredWarningCount.textContent = danhSachHetHan.length;
        }
    }

    // =====================================================
    // MODAL XEM CHI TIẾT THUỐC HẾT HẠN
    // =====================================================
    function setExpiredDetailText(id, value) {
        const element = $(id);

        if (element) {
            element.textContent = displayValue(value);
        }
    }

    function openDetailModal(item) {
        if (!item) {
            console.error("Không tìm thấy thông tin thuốc.");
            return;
        }

        const modal = getDetailModal();

        if (!modal) {
            console.error(
                "Không tìm thấy #expiredDetailModal. " +
                "Kiểm tra modal trong thuoc-het-han.html."
            );
            return;
        }

        setExpiredDetailText("expiredDetailMaThuoc", getMaThuoc(item));
        setExpiredDetailText("expiredDetailTenThuoc", getTenThuoc(item));
        setExpiredDetailText("expiredDetailDonVi", getDonViTinh(item));
        setExpiredDetailText("expiredDetailSoLuongTon", getSoLuongTon(item));
        setExpiredDetailText("expiredDetailSoLo", getSoLo(item));
        setExpiredDetailText(
            "expiredDetailHanSuDung",
            formatDate(getHanSuDung(item))
        );

        const days = getExpiredDays(getHanSuDung(item));

        setExpiredDetailText(
            "expiredDetailDaHetHan",
            days === null
                ? "Không xác định"
                : days === 0
                    ? "Hết hạn hôm nay"
                    : days > 0
                        ? `Đã hết hạn ${days} ngày`
                        : `Còn ${Math.abs(days)} ngày`
        );

        setExpiredDetailText(
            "expiredDetailTrangThai",
            days !== null && days > 0
                ? "Đã hết hạn"
                : "Chưa hết hạn"
        );

        modal.style.display = "flex";
        modal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";

        $("closeExpiredDetail")?.focus();
    }

    function closeDetailModal() {
        const modal = getDetailModal();

        if (!modal) return;

        modal.style.display = "none";
        modal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
    }

    // =====================================================
    // XUẤT CSV
    // =====================================================
    async function exportCSV() {
        if (danhSachLoc.length === 0) {
            alert("Không có dữ liệu để xuất.");
            return;
        }

        const headers = [
            "STT",
            "Mã thuốc",
            "Tên thuốc",
            "Đơn vị",
            "Hoạt chất",
            "Mã lô",
            "Ngày hết hạn",
            "Số lượng còn",
            "Ngày phát hiện",
            "Trạng thái"
        ];

        const rows = danhSachLoc.map((item, index) => [
            index + 1,
            getMaThuoc(item),
            getTenThuoc(item),
            getDonViTinh(item),
            getHoatChat(item),
            getSoLo(item),
            formatDate(getHanSuDung(item)),
            getSoLuongTon(item),
            formatDateTime(getNgayPhatHien(item)),
            "Đã hết hạn"
        ]);

        const csvContent = "\uFEFF" + [headers, ...rows]
            .map((row) =>
                row.map((value) =>
                    `"${String(value ?? "").replace(/"/g, '""')}"`
                ).join(",")
            ).join("\r\n");

        const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;"
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "danh-sach-thuoc-het-han.csv";

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);

        await notifyExportSuccess();
    }

    async function notifyExportSuccess() {
        try {
            const response = await fetch(EXPORT_NOTIFICATION_URL, {
                method: "POST",
                headers: {
                    ...getHeaders(),
                    "Content-Type": "application/json"
                },
                credentials: "same-origin"
            });

            if (!response.ok) {
                const message = await response.text();

                throw new Error(
                    `HTTP ${response.status}: ${message}`
                );
            }

            console.log(
                "Đã gửi yêu cầu tạo thông báo xuất file thuốc hết hạn."
            );
        } catch (error) {
            console.error("Lỗi tạo thông báo xuất file:", error);
        }
    }

    // =====================================================
    // GẮN SỰ KIỆN
    // =====================================================
    expiredSearchButton?.addEventListener("click", applyFilters);
    expiredResetButton?.addEventListener("click", resetFilters);
    exportExpiredButton?.addEventListener("click", exportCSV);

    [expiredKeyword, expiredBatch]
        .filter(Boolean)
        .forEach((input) => {
            input.addEventListener("keydown", (event) => {
                if (event.key === "Enter") {
                    applyFilters();
                }
            });
        });

    // Phân trang
    expiredPagination?.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-page]");

        if (!button || button.disabled) return;

        const page = Number(button.dataset.page);
        const totalPages = Math.ceil(
            danhSachLoc.length / ITEMS_PER_PAGE
        );

        if (page < 1 || page > totalPages) return;

        currentPage = page;

        renderTable();
        renderPagination();
        updateResultInfo();
    });

    // Xem chi tiết: dùng index trong danhSachLoc.
    expiredTableBody?.addEventListener("click", (event) => {
        const button = event.target.closest(".expired-detail-button");

        if (!button) return;

        event.preventDefault();

        const index = Number(button.dataset.index);

        if (
            !Number.isInteger(index) ||
            index < 0 ||
            index >= danhSachLoc.length
        ) {
            console.error("Index thuốc không hợp lệ:", button.dataset.index);
            return;
        }

        openDetailModal(danhSachLoc[index]);
    });

    // Nút X
    document.addEventListener("click", (event) => {
        if (event.target.closest("#closeExpiredDetail")) {
            closeDetailModal();
        }
    });

    // Nút Hủy
    document.addEventListener("click", (event) => {
        if (event.target.closest("#closeExpiredDetailButton")) {
            closeDetailModal();
        }
    });

    // Bấm bên ngoài hộp modal để đóng
    document.addEventListener("click", (event) => {
        const modal = getDetailModal();

        if (modal && event.target === modal) {
            closeDetailModal();
        }
    });

    // Nhấn ESC để đóng
    document.addEventListener("keydown", (event) => {
        const modal = getDetailModal();

        if (
            event.key === "Escape" &&
            modal &&
            modal.style.display === "flex"
        ) {
            closeDetailModal();
        }
    });

    // =====================================================
    // KHỞI TẠO
    // =====================================================
    async function init() {
        if (expiredTableBody) {
            expiredTableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="expired-table-loading">
                        Đang tải dữ liệu...
                    </td>
                </tr>
            `;
        }

        try {
            const [kho, thuoc] = await Promise.all([
                fetchArray(KHO_API_URL),
                fetchArray(THUOC_API_URL)
            ]);

            danhSachKho = kho;
            danhSachThuoc = thuoc;

            buildExpiredList();
            applyFilters();
        } catch (error) {
            console.error("Lỗi tải danh sách thuốc hết hạn:", error);

            if (expiredTableBody) {
                expiredTableBody.innerHTML = `
                    <tr>
                        <td colspan="9" class="expired-table-loading">
                            ${escapeHtml(
                                error.message ||
                                "Không thể tải dữ liệu."
                            )}
                        </td>
                    </tr>
                `;
            }

            if (expiredWarningCount) {
                expiredWarningCount.textContent = "0";
            }

            if (expiredResultInfo) {
                expiredResultInfo.textContent = "Không thể tải dữ liệu.";
            }

            if (expiredPagination) {
                expiredPagination.innerHTML = "";
            }
        }
    }

    init();
});