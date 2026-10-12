document.addEventListener("DOMContentLoaded", function () {

    const KHO_API_URL = "/api/kho-thuoc";
    const THUOC_API_URL = "/api/medicines";

    const ITEMS_PER_PAGE = 5;
    const DEFAULT_DAYS = 30;

    let danhSachKho = [];
    let danhSachThuocGoc = [];
    let danhSachSapHetHan = [];
    let danhSachLoc = [];

    let currentPage = 1;


    // =========================================================
    // DOM
    // =========================================================

    const expiryTableBody =
        document.getElementById("expiryTableBody");

    const expiryKeyword =
        document.getElementById("expiryKeyword");

    const expiryDays =
        document.getElementById("expiryDays");

    const expiryUnit =
        document.getElementById("expiryUnit");

    const expirySearchButton =
        document.getElementById("expirySearchButton");

    const expiryResetButton =
        document.getElementById("expiryResetButton");

    const expiryWarningCount =
        document.getElementById("expiryWarningCount");

    const expiryWarningDays =
        document.getElementById("expiryWarningDays");

    const expiryResultInfo =
        document.getElementById("expiryResultInfo");

    const expiryPagination =
        document.getElementById("expiryPagination");

    const exportExpiryButton =
        document.getElementById("exportExpiryButton");

    const expiryDetailModal =
        document.getElementById("expiryDetailModal");

    const closeExpiryDetail =
        document.getElementById("closeExpiryDetail");

    const closeExpiryDetailButton =
        document.getElementById("closeExpiryDetailButton");


    // =========================================================
    // JWT
    // =========================================================

    function getToken() {

        const possibleKeys = [
            "Token",
            "token",
            "JwtToken",
            "jwtToken",
            "accessToken",
            "access_token",
            "jwt"
        ];

        for (const key of possibleKeys) {

            const sessionToken =
                sessionStorage.getItem(key);

            if (sessionToken) {
                return sessionToken.replace(
                    /^Bearer\s+/i,
                    ""
                );
            }


            const localToken =
                localStorage.getItem(key);

            if (localToken) {
                return localToken.replace(
                    /^Bearer\s+/i,
                    ""
                );
            }
        }

        return "";
    }


    function getHeaders() {

        const token = getToken();

        const headers = {
            "Accept": "application/json"
        };

        if (token) {
            headers["Authorization"] =
                "Bearer " + token;
        }

        return headers;
    }


    // =========================================================
    // ESCAPE HTML
    // =========================================================

    function escapeHtml(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    // =========================================================
    // GET DATA
    // =========================================================

    function getMaThuoc(item) {

        if (!item) return "";

        return (
            item.maThuoc ??
            item.MaThuoc ??
            item.thuoc?.maThuoc ??
            item.Thuoc?.maThuoc ??
            item.thuoc?.MaThuoc ??
            item.Thuoc?.MaThuoc ??
            ""
        );
    }


    function getTenThuoc(item) {

        if (!item) return "";

        return (
            item.tenThuoc ??
            item.TenThuoc ??
            item.thuoc?.tenThuoc ??
            item.Thuoc?.TenThuoc ??
            item.thuoc?.TenThuoc ??
            item.Thuoc?.tenThuoc ??
            ""
        );
    }


    function getDonViTinh(item) {

        if (!item) return "";

        return (
            item.donViTinh ??
            item.DonViTinh ??
            item.thuoc?.donViTinh ??
            item.Thuoc?.DonViTinh ??
            item.thuoc?.DonViTinh ??
            item.Thuoc?.donViTinh ??
            ""
        );
    }


    function getSoLo(item) {

        if (!item) return "";

        return (
            item.soLo ??
            item.SoLo ??
            ""
        );
    }


    function getSoLuongTon(item) {

        if (!item) return 0;

        const value =
            item.soLuongTon ??
            item.SoLuongTon ??
            item.tonKho ??
            item.TonKho ??
            0;

        const number = Number(value);

        return Number.isFinite(number)
            ? number
            : 0;
    }


    function getHanSuDung(item) {

        if (!item) return null;

        return (
            item.hanSuDung ??
            item.HanSuDung ??
            null
        );
    }


    function getMaKhoThuoc(item) {

        if (!item) return "";

        return (
            item.maKhoThuoc ??
            item.MaKhoThuoc ??
            ""
        );
    }


    // =========================================================
    // FORMAT
    // =========================================================

    function formatMedicineCode(value) {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return "-";
        }

        const text = String(value);

        if (
            text.toUpperCase().startsWith("TH")
        ) {
            return text;
        }

        return (
            "TH" +
            text.padStart(3, "0")
        );
    }


    function parseDate(value) {

        if (!value) return null;

        let date;

        if (
            typeof value === "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(value)
        ) {

            const parts =
                value.split("-");

            date = new Date(
                Number(parts[0]),
                Number(parts[1]) - 1,
                Number(parts[2])
            );

        } else {

            date = new Date(value);
        }

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return null;
        }

        date.setHours(
            0,
            0,
            0,
            0
        );

        return date;
    }


    function formatDate(value) {

        const date =
            parseDate(value);

        if (!date) return "-";

        const day =
            String(
                date.getDate()
            ).padStart(2, "0");

        const month =
            String(
                date.getMonth() + 1
            ).padStart(2, "0");

        const year =
            date.getFullYear();

        return (
            day +
            "/" +
            month +
            "/" +
            year
        );
    }


    function getRemainingDays(value) {

        const expiryDate =
            parseDate(value);

        if (!expiryDate) {
            return null;
        }

        const today =
            new Date();

        today.setHours(
            0,
            0,
            0,
            0
        );

        const diff =
            expiryDate.getTime() -
            today.getTime();

        return Math.ceil(
            diff /
            (1000 * 60 * 60 * 24)
        );
    }


    // =========================================================
    // WARNING
    // =========================================================

    function getWarning(days) {

        if (days === null) {

            return {
                text: "Không xác định",
                className: "normal"
            };
        }

        if (days <= 7) {

            return {
                text: "Nguy hiểm",
                className: "danger"
            };
        }

        return {
            text: "Cảnh báo",
            className: "warning"
        };
    }


    // =========================================================
    // LOAD KHO
    // =========================================================

    async function loadKhoThuoc() {

        const response =
            await fetch(
                KHO_API_URL,
                {
                    method: "GET",
                    headers: getHeaders(),
                    credentials: "same-origin"
                }
            );

        if (
            response.status === 401 ||
            response.status === 403
        ) {

            throw new Error(
                "Không có quyền truy cập kho thuốc."
            );
        }

        if (!response.ok) {

            throw new Error(
                "Không thể tải kho thuốc."
            );
        }

        const data =
            await response.json();

        danhSachKho =
            Array.isArray(data)
                ? data
                : [];
    }


    // =========================================================
    // LOAD THUỐC
    // =========================================================

    async function loadThuoc() {

        const response =
            await fetch(
                THUOC_API_URL,
                {
                    method: "GET",
                    headers: getHeaders(),
                    credentials: "same-origin"
                }
            );

        if (
            response.status === 401 ||
            response.status === 403
        ) {

            throw new Error(
                "Không có quyền truy cập danh sách thuốc."
            );
        }

        if (!response.ok) {

            throw new Error(
                "Không thể tải danh sách thuốc."
            );
        }

        const data =
            await response.json();

        danhSachThuocGoc =
            Array.isArray(data)
                ? data
                : [];
    }


    // =========================================================
    // BUILD DANH SÁCH THUỐC SẮP HẾT HẠN
    // =========================================================

    function buildExpiryList() {

        danhSachSapHetHan = [];

        danhSachKho.forEach(function (kho) {

            const maThuoc =
                getMaThuoc(kho);

            let thuoc =
                kho.thuoc ??
                kho.Thuoc ??
                null;


            if (!thuoc) {

                thuoc =
                    danhSachThuocGoc.find(
                        function (item) {

                            return (
                                String(
                                    getMaThuoc(item)
                                ) ===
                                String(maThuoc)
                            );
                        }
                    );
            }


            if (!thuoc) {
                return;
            }


            const merged = {
                ...thuoc,
                ...kho
            };


            merged.maThuoc =
                maThuoc ||
                getMaThuoc(thuoc);


            merged.tenThuoc =
                getTenThuoc(thuoc) ||
                getTenThuoc(kho);


            merged.donViTinh =
                getDonViTinh(thuoc) ||
                getDonViTinh(kho);


            merged.soLo =
                getSoLo(kho);


            merged.soLuongTon =
                getSoLuongTon(kho);


            merged.hanSuDung =
                getHanSuDung(kho);


            const days =
                getRemainingDays(
                    merged.hanSuDung
                );


            // Không còn hàng
            if (
                merged.soLuongTon <= 0
            ) {
                return;
            }


            // Không có HSD
            if (days === null) {
                return;
            }


            // Đã hết hạn
            if (days < 0) {
                return;
            }


            // Trong 30 ngày
            if (
                days <= DEFAULT_DAYS
            ) {

                danhSachSapHetHan.push(
                    merged
                );
            }
        });


        danhSachSapHetHan.sort(
            function (a, b) {

                const daysA =
                    getRemainingDays(
                        getHanSuDung(a)
                    );

                const daysB =
                    getRemainingDays(
                        getHanSuDung(b)
                    );

                return (
                    (daysA ?? 999999) -
                    (daysB ?? 999999)
                );
            }
        );
    }


    // =========================================================
    // LOAD DATA
    // =========================================================

    async function loadData() {

        if (expiryTableBody) {

            expiryTableBody.innerHTML = `
                <tr>
                    <td
                        colspan="9"
                        class="expiry-table-loading"
                    >
                        Đang tải dữ liệu...
                    </td>
                </tr>
            `;
        }


        try {

            await Promise.all([
                loadKhoThuoc(),
                loadThuoc()
            ]);


            buildExpiryList();

            fillUnitFilter();

            applyFilters();

        } catch (error) {

            console.error(
                "LỖI LOAD DATA:",
                error
            );


            if (expiryTableBody) {

                expiryTableBody.innerHTML = `
                    <tr>
                        <td
                            colspan="9"
                            class="expiry-table-loading"
                        >
                            Không thể tải dữ liệu thuốc sắp hết hạn.
                        </td>
                    </tr>
                `;
            }


            updateResultInfo(0);

            updateWarning();
        }
    }


    // =========================================================
    // ĐƠN VỊ
    // =========================================================

    function fillUnitFilter() {

        if (!expiryUnit) {
            return;
        }


        const units = [
            ...new Set(
                danhSachSapHetHan
                    .map(function (item) {

                        return getDonViTinh(
                            item
                        );
                    })
                    .filter(function (unit) {

                        return (
                            unit &&
                            unit !== "-"
                        );
                    })
            )
        ];


        units.sort();


        expiryUnit.innerHTML =
            `<option value="">Tất cả</option>`;


        units.forEach(
            function (unit) {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value = unit;

                option.textContent = unit;

                expiryUnit.appendChild(
                    option
                );
            }
        );
    }


    // =========================================================
    // FILTER
    // =========================================================

    function applyFilters() {

        const keyword =
            expiryKeyword
                ? expiryKeyword.value
                    .trim()
                    .toLowerCase()
                : "";


        const maxDays =
            expiryDays &&
            expiryDays.value
                ? Number(
                    expiryDays.value
                )
                : null;


        const selectedUnit =
            expiryUnit
                ? expiryUnit.value
                : "";


        danhSachLoc =
            danhSachSapHetHan.filter(
                function (item) {

                    const maThuoc =
                        String(
                            getMaThuoc(item)
                        ).toLowerCase();


                    const tenThuoc =
                        String(
                            getTenThuoc(item)
                        ).toLowerCase();


                    const unit =
                        getDonViTinh(item);


                    const days =
                        getRemainingDays(
                            getHanSuDung(item)
                        );


                    const matchKeyword =
                        !keyword ||
                        maThuoc.includes(
                            keyword
                        ) ||
                        tenThuoc.includes(
                            keyword
                        );


                    const matchUnit =
                        !selectedUnit ||
                        unit === selectedUnit;


                    const matchDays =
                        maxDays === null ||
                        (
                            days !== null &&
                            days >= 0 &&
                            days <= maxDays
                        );


                    return (
                        matchKeyword &&
                        matchUnit &&
                        matchDays
                    );
                }
            );


        currentPage = 1;


        updateWarning();

        renderTable();

        renderPagination();

        updateResultInfo(
            danhSachLoc.length
        );
    }


    // =========================================================
    // WARNING COUNT
    // =========================================================

    function updateWarning() {

        if (!expiryWarningCount) {
            return;
        }


        const maThuocSet =
            new Set();


        danhSachLoc.forEach(
            function (item) {

                const maThuoc =
                    getMaThuoc(item);


                if (
                    maThuoc !== null &&
                    maThuoc !== undefined &&
                    maThuoc !== ""
                ) {

                    maThuocSet.add(
                        String(maThuoc)
                    );
                }
            }
        );


        // Nếu không có mã thuốc thì dùng tên thuốc
        if (
            maThuocSet.size === 0 &&
            danhSachLoc.length > 0
        ) {

            danhSachLoc.forEach(
                function (item) {

                    const tenThuoc =
                        getTenThuoc(item)
                            .trim()
                            .toLowerCase();


                    if (tenThuoc) {

                        maThuocSet.add(
                            "TEN:" +
                            tenThuoc
                        );
                    }
                }
            );
        }


        expiryWarningCount.textContent =
            maThuocSet.size;


        if (expiryWarningDays) {

            const selectedValue =
                expiryDays
                    ? expiryDays.value
                    : String(
                        DEFAULT_DAYS
                    );


            expiryWarningDays.textContent =
                selectedValue === ""
                    ? "thời gian đã chọn"
                    : selectedValue +
                      " ngày tới";
        }
    }


    // =========================================================
    // RESULT INFO
    // =========================================================

    function updateResultInfo(count) {
        if (!expiryResultInfo) {
            return;
        }

        const total = count ?? danhSachLoc.length;

        const start = total === 0
            ? 0
            : (currentPage - 1) * ITEMS_PER_PAGE + 1;

        const end = Math.min(
            currentPage * ITEMS_PER_PAGE,
            total
        );

        expiryResultInfo.textContent =
            `Hiển thị ${start} - ${end} trong ${total} kết quả`;
    }


    // =========================================================
    // TABLE
    // =========================================================

    function renderTable() {

        if (!expiryTableBody) {
            return;
        }


        if (
            danhSachLoc.length === 0
        ) {

            expiryTableBody.innerHTML = `
                <tr>
                    <td
                        colspan="9"
                        class="expiry-table-loading"
                    >
                        Không có thuốc sắp hết hạn.
                    </td>
                </tr>
            `;

            return;
        }


        const start =
            (currentPage - 1) *
            ITEMS_PER_PAGE;


        const end =
            start +
            ITEMS_PER_PAGE;


        const pageData =
            danhSachLoc.slice(
                start,
                end
            );


        expiryTableBody.innerHTML =
            pageData
                .map(
                    function (item, index) {

                        return createRow(
                            item,
                            start + index
                        );
                    }
                )
                .join("");
    }


    function createRow(
        item,
        index
    ) {

        const maThuoc =
            getMaThuoc(item);

        const tenThuoc =
            getTenThuoc(item);

        const donVi =
            getDonViTinh(item);

        const soLuongTon =
            getSoLuongTon(item);

        const hanSuDung =
            getHanSuDung(item);

        const days =
            getRemainingDays(
                hanSuDung
            );


        const warning =
            getWarning(days);


        let remainingClass = "";


        if (
            days !== null &&
            days <= 7
        ) {

            remainingClass =
                "danger";

        } else if (
            days !== null &&
            days <= 30
        ) {

            remainingClass =
                "warning";
        }


        let remainingHtml = "-";


        if (days !== null) {

            remainingHtml = `
                <div
                    class="expiry-remaining ${remainingClass}"
                >
                    <strong>
                        ${days}
                    </strong>

                    <span>
                        ngày
                    </span>
                </div>
            `;
        }


        let expiryClass = "";


        if (
            days !== null &&
            days <= 7
        ) {

            expiryClass =
                "danger";

        } else if (
            days !== null &&
            days <= 30
        ) {

            expiryClass =
                "warning";
        }


        return `
            <tr>

                <td>
                    ${index + 1}
                </td>


                <td>
                    <span
                        class="expiry-medicine-code"
                    >
                        ${escapeHtml(
                            formatMedicineCode(
                                maThuoc
                            )
                        )}
                    </span>
                </td>


                <td>
                    <div
                        class="expiry-medicine-name"
                    >
                        ${escapeHtml(
                            tenThuoc
                        )}
                    </div>
                </td>


                <td>
                    <span
                        class="expiry-unit"
                    >
                        ${escapeHtml(
                            donVi
                        )}
                    </span>
                </td>


                <td>
                    <span
                        class="expiry-stock"
                    >
                        ${soLuongTon}
                    </span>
                </td>


                <td>
                    <span
                        class="expiry-date ${expiryClass}"
                    >
                        ${formatDate(
                            hanSuDung
                        )}
                    </span>
                </td>


                <td>
                    ${remainingHtml}
                </td>


                <td>
                    <span
                        class="expiry-warning-badge ${warning.className}"
                    >
                        ${warning.text}
                    </span>
                </td>


                <td>

                    <button
                        type="button"
                        class="expiry-detail-button"
                        data-id="${escapeHtml(
                            getMaKhoThuoc(item)
                        )}"
                    >
                        Xem chi tiết
                    </button>

                </td>

            </tr>
        `;
    }


    // =========================================================
    // PAGINATION
    // =========================================================

    function renderPagination() {

        if (!expiryPagination) {
            return;
        }


        expiryPagination.innerHTML = "";


        const totalPages =
            Math.ceil(
                danhSachLoc.length /
                ITEMS_PER_PAGE
            );


        if (totalPages <= 1) {
            return;
        }


        // Previous
        const previousButton =
            document.createElement(
                "button"
            );


        previousButton.type =
            "button";


        previousButton.innerHTML =
            "‹";


        previousButton.disabled =
            currentPage === 1;


        previousButton.addEventListener(
            "click",
            function () {

                if (
                    currentPage > 1
                ) {

                    currentPage--;

                    renderTable();

                    renderPagination();
                }
            }
        );


        expiryPagination.appendChild(
            previousButton
        );


        // Pages
        for (
            let page = 1;
            page <= totalPages;
            page++
        ) {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.textContent =
                page;


            if (
                page === currentPage
            ) {

                button.classList.add(
                    "active"
                );
            }


            button.addEventListener(
                "click",
                function () {

                    currentPage =
                        page;

                    renderTable();

                    renderPagination();
                }
            );


            expiryPagination.appendChild(
                button
            );
        }


        // Next
        const nextButton =
            document.createElement(
                "button"
            );


        nextButton.type =
            "button";


        nextButton.innerHTML =
            "›";


        nextButton.disabled =
            currentPage === totalPages;


        nextButton.addEventListener(
            "click",
            function () {

                if (
                    currentPage <
                    totalPages
                ) {

                    currentPage++;

                    renderTable();

                    renderPagination();
                }
            }
        );


        expiryPagination.appendChild(
            nextButton
        );
    }


    // =========================================================
    // SEARCH
    // =========================================================

    if (expiryKeyword) {

        expiryKeyword.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Enter"
                ) {

                    event.preventDefault();

                    applyFilters();
                }
            }
        );
    }


    if (expirySearchButton) {

        expirySearchButton.addEventListener(
            "click",
            applyFilters
        );
    }


    if (expiryDays) {

        expiryDays.addEventListener(
            "change",
            applyFilters
        );
    }


    if (expiryUnit) {

        expiryUnit.addEventListener(
            "change",
            applyFilters
        );
    }


    // =========================================================
    // RESET
    // =========================================================

    if (expiryResetButton) {

        expiryResetButton.addEventListener(
            "click",
            function () {

                if (expiryKeyword) {
                    expiryKeyword.value = "";
                }


                if (expiryDays) {

                    expiryDays.value =
                        String(
                            DEFAULT_DAYS
                        );
                }


                if (expiryUnit) {

                    expiryUnit.value =
                        "";
                }


                currentPage = 1;

                applyFilters();
            }
        );
    }


    // =========================================================
    // DETAIL BUTTON
    // =========================================================

    if (expiryTableBody) {

        expiryTableBody.addEventListener(
            "click",
            function (event) {

                const button =
                    event.target.closest(
                        ".expiry-detail-button"
                    );


                if (!button) {
                    return;
                }


                const id =
                    button.dataset.id;


                const item =
                    danhSachSapHetHan.find(
                        function (medicine) {

                            return (
                                String(
                                    getMaKhoThuoc(
                                        medicine
                                    )
                                ) ===
                                String(id)
                            );
                        }
                    );


                if (!item) {
                    return;
                }


                openDetailModal(item);
            }
        );
    }


    // =========================================================
    // DETAIL MODAL
    // =========================================================

    function openDetailModal(item) {

        if (!expiryDetailModal) {
            return;
        }


        const days =
            getRemainingDays(
                getHanSuDung(item)
            );


        const warning =
            getWarning(days);


        const maThuocElement =
            document.getElementById(
                "expiryDetailMaThuoc"
            );


        const tenThuocElement =
            document.getElementById(
                "expiryDetailTenThuoc"
            );


        const donViElement =
            document.getElementById(
                "expiryDetailDonVi"
            );


        const soLuongTonElement =
            document.getElementById(
                "expiryDetailSoLuongTon"
            );


        const soLoElement =
            document.getElementById(
                "expiryDetailSoLo"
            );


        const hanSuDungElement =
            document.getElementById(
                "expiryDetailHanSuDung"
            );


        const conLaiElement =
            document.getElementById(
                "expiryDetailConLai"
            );


        const canhBaoElement =
            document.getElementById(
                "expiryDetailCanhBao"
            );


        if (maThuocElement) {

            maThuocElement.textContent =
                formatMedicineCode(
                    getMaThuoc(item)
                );
        }


        if (tenThuocElement) {

            tenThuocElement.textContent =
                getTenThuoc(item);
        }


        if (donViElement) {

            donViElement.textContent =
                getDonViTinh(item);
        }


        if (soLuongTonElement) {

            soLuongTonElement.textContent =
                getSoLuongTon(item);
        }


        if (soLoElement) {

            soLoElement.textContent =
                getSoLo(item);
        }


        if (hanSuDungElement) {

            hanSuDungElement.textContent =
                formatDate(
                    getHanSuDung(item)
                );
        }


        if (conLaiElement) {

            conLaiElement.textContent =
                days === null
                    ? "-"
                    : days + " ngày";
        }


        if (canhBaoElement) {

            canhBaoElement.textContent =
                warning.text;
        }


        expiryDetailModal.style.display =
            "flex";
    }


    function closeDetailModal() {

        if (expiryDetailModal) {

            expiryDetailModal.style.display =
                "none";
        }
    }


    if (closeExpiryDetail) {

        closeExpiryDetail.addEventListener(
            "click",
            closeDetailModal
        );
    }


    if (closeExpiryDetailButton) {

        closeExpiryDetailButton.addEventListener(
            "click",
            closeDetailModal
        );
    }


    if (expiryDetailModal) {

        expiryDetailModal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    expiryDetailModal
                ) {

                    closeDetailModal();
                }
            }
        );
    }


    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Escape"
            ) {

                closeDetailModal();
            }
        }
    );


    // =========================================================
    // GỬI THÔNG BÁO SAU KHI XUẤT FILE
    // =========================================================

    async function thongBaoXuatFileSapHetHan() {

        const token =
            getToken();


        if (!token) {

            console.error(
                "Không tìm thấy JWT token."
            );

            return;
        }


        try {

            const response =
                await fetch(
                    "/api/kho-thuoc/thong-bao-xuat-file-sap-het-han",
                    {
                        method: "POST",

                        headers: {
                            "Accept":
                                "application/json",

                            "Authorization":
                                "Bearer " + token
                        },

                        credentials:
                            "same-origin"
                    }
                );


            if (
                response.status === 401 ||
                response.status === 403
            ) {

                console.error(
                    "Không có quyền gửi thông báo xuất file."
                );

                return;
            }


            if (!response.ok) {

                const message =
                    await response.text()
                        .catch(
                            () => ""
                        );


                console.error(
                    "Không thể tạo thông báo xuất file.",
                    message
                );

                return;
            }


            console.log(
                "Đã gửi thông báo xuất file thuốc sắp hết hạn."
            );

        } catch (error) {

            console.error(
                "Lỗi gửi thông báo xuất file:",
                error
            );
        }
    }


    // =========================================================
    // EXPORT CSV
    // =========================================================

    async function exportCSV() {

        if (
            danhSachLoc.length === 0
        ) {

            alert(
                "Không có dữ liệu để xuất."
            );

            return;
        }


        const rows = [];


        rows.push([
            "STT",
            "Mã thuốc",
            "Tên thuốc",
            "Đơn vị",
            "Số lượng tồn",
            "Hạn sử dụng",
            "Còn lại",
            "Mức độ cảnh báo"
        ]);


        danhSachLoc.forEach(
            function (item, index) {

                const days =
                    getRemainingDays(
                        getHanSuDung(item)
                    );


                const warning =
                    getWarning(days);


                rows.push([
                    index + 1,

                    formatMedicineCode(
                        getMaThuoc(item)
                    ),

                    getTenThuoc(item),

                    getDonViTinh(item),

                    getSoLuongTon(item),

                    formatDate(
                        getHanSuDung(item)
                    ),

                    days === null
                        ? ""
                        : days + " ngày",

                    warning.text
                ]);
            }
        );


        const csvContent =
            "\uFEFF" +
            rows
                .map(
                    function (row) {

                        return row
                            .map(
                                function (value) {

                                    return (
                                        '"' +
                                        String(
                                            value ??
                                            ""
                                        )
                                        .replace(
                                            /"/g,
                                            '""'
                                        ) +
                                        '"'
                                    );
                                }
                            )
                            .join(",");
                    }
                )
                .join("\n");


        const blob =
            new Blob(
                [csvContent],
                {
                    type:
                        "text/csv;charset=utf-8;"
                }
            );


        const url =
            URL.createObjectURL(blob);


        const link =
            document.createElement(
                "a"
            );


        link.href = url;

        link.download =
            "thuoc-sap-het-han.csv";


        document.body.appendChild(
            link
        );


        link.click();


        document.body.removeChild(
            link
        );


        URL.revokeObjectURL(
            url
        );


        // =====================================================
        // GỌI BACKEND ĐỂ LƯU THÔNG BÁO + GỬI WEBSOCKET
        // =====================================================

        await thongBaoXuatFileSapHetHan();
    }


    // =========================================================
    // EXPORT BUTTON
    // =========================================================

    if (exportExpiryButton) {

        exportExpiryButton.addEventListener(
            "click",
            exportCSV
        );
    }


    // =========================================================
    // START
    // =========================================================

    loadData();

});