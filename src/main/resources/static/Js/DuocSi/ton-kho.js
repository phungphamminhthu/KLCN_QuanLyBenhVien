/* =====================================================
   TỒN KHO THUỐC - DƯỢC SĨ
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log("===== TON KHO JS DA CHAY =====");


        /* =================================================
           CONFIG
        ================================================= */

        const KHO_API_URL = "/api/kho-thuoc";
        const THUOC_API_URL = "/api/medicines";

        // MỖI TRANG 5 SẢN PHẨM
        const ITEMS_PER_PAGE = 5;


        /* =================================================
           STATE
        ================================================= */

        let danhSachKho = [];

        let danhSachThuocGoc = [];

        let danhSachThuoc = [];

        let danhSachLoc = [];

        let currentPage = 1;


        /* =================================================
           DOM
        ================================================= */

        const stockTableBody =
            document.getElementById("stockTableBody");

        const stockKeyword =
            document.getElementById("stockKeyword");

        const stockUnit =
            document.getElementById("stockUnit");

        const stockStatus =
            document.getElementById("stockStatus");

        const stockSearchButton =
            document.getElementById("stockSearchButton");

        /*
         * HTML hiện tại của bạn dùng resetButton
         */
        const stockResetButton =
            document.getElementById("resetButton") ||
            document.getElementById("stockResetButton");

        const resultInfo =
            document.getElementById("resultInfo");

        const pagination =
            document.getElementById("pagination");

        const totalMedicineCount =
            document.getElementById("totalMedicineCount");

        const enoughMedicineCount =
            document.getElementById("enoughMedicineCount");

        const lowMedicineCount =
            document.getElementById("lowMedicineCount");

        const emptyMedicineCount =
            document.getElementById("emptyMedicineCount") ||
            document.getElementById("outMedicineCount");

        const exportStockButton =
            document.getElementById("exportStockButton");


        /* =================================================
           MODAL
        ================================================= */

        const stockDetailModal =
            document.getElementById("stockDetailModal");

        const closeStockDetail =
            document.getElementById("closeStockDetail");

        const closeStockDetailButton =
            document.getElementById("closeStockDetailButton");


        /* =================================================
           KIỂM TRA DOM
        ================================================= */

        console.log(
            "stockTableBody:",
            Boolean(stockTableBody)
        );

        console.log(
            "stockKeyword:",
            Boolean(stockKeyword)
        );

        console.log(
            "stockUnit:",
            Boolean(stockUnit)
        );

        console.log(
            "stockStatus:",
            Boolean(stockStatus)
        );

        console.log(
            "stockSearchButton:",
            Boolean(stockSearchButton)
        );

        console.log(
            "stockResetButton:",
            Boolean(stockResetButton)
        );


        /* =================================================
           JWT
        ================================================= */

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


            for (
                const key of possibleKeys
            ) {

                /*
                 * SESSION STORAGE
                 */

                const sessionToken =
                    sessionStorage.getItem(key);


                if (
                    sessionToken &&
                    sessionToken.trim() !== ""
                ) {

                    return sessionToken
                        .trim()
                        .replace(
                            /^Bearer\s+/i,
                            ""
                        );
                }


                /*
                 * LOCAL STORAGE
                 */

                const localToken =
                    localStorage.getItem(key);


                if (
                    localToken &&
                    localToken.trim() !== ""
                ) {

                    return localToken
                        .trim()
                        .replace(
                            /^Bearer\s+/i,
                            ""
                        );
                }
            }


            return "";
        }


        /* =================================================
           HEADERS
        ================================================= */

        function getHeaders() {

            const headers = {
                "Accept": "application/json",
                "Content-Type": "application/json"
            };


            const token =
                getToken();


            if (token) {

                headers["Authorization"] =
                    "Bearer " + token;
            }


            return headers;
        }


        /* =================================================
           API GET
        ================================================= */

        async function apiGet(url) {

            const token =
                getToken();


            console.log(
                "[API GET]",
                url,
                "JWT:",
                token
                    ? "CÓ TOKEN"
                    : "KHÔNG CÓ TOKEN"
            );


            const response =
                await fetch(
                    url,
                    {
                        method: "GET",
                        headers: getHeaders(),
                        credentials: "same-origin"
                    }
                );


            console.log(
                "[API STATUS]",
                url,
                response.status
            );


            if (
                response.status === 401
            ) {

                throw new Error(
                    "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
                );
            }


            if (
                response.status === 403
            ) {

                throw new Error(
                    "Bạn không có quyền xem tồn kho thuốc."
                );
            }


            if (
                !response.ok
            ) {

                throw new Error(
                    "Không thể tải dữ liệu từ " + url
                );
            }


            return await response.json();
        }


        /* =================================================
           EXTRACT ARRAY
        ================================================= */

        function extractArray(data) {

            if (
                Array.isArray(data)
            ) {

                return data;
            }


            if (
                data &&
                Array.isArray(data.content)
            ) {

                return data.content;
            }


            if (
                data &&
                Array.isArray(data.data)
            ) {

                return data.data;
            }


            if (
                data &&
                Array.isArray(data.items)
            ) {

                return data.items;
            }


            return [];
        }


        /* =================================================
           LOAD TỒN KHO
        ================================================= */

        async function loadTonKho() {

            if (
                !stockTableBody
            ) {

                console.error(
                    "Không tìm thấy #stockTableBody"
                );

                return;
            }


            showLoading();


            try {

                console.log(
                    "===================================="
                );

                console.log(
                    "LOAD TỒN KHO"
                );


                const token =
                    getToken();


                console.log(
                    "TOKEN:",
                    token
                        ? "Có JWT"
                        : "Không có JWT"
                );


                if (!token) {

                    throw new Error(
                        "Không tìm thấy JWT. Vui lòng đăng nhập lại."
                    );
                }


                /* =========================================
                   1. LẤY DỮ LIỆU KHO
                ========================================== */

                const khoData =
                    await apiGet(
                        KHO_API_URL
                    );


                console.log(
                    "DỮ LIỆU /api/kho-thuoc:",
                    khoData
                );


                danhSachKho =
                    extractArray(
                        khoData
                    );


                console.log(
                    "Số record KhoThuoc:",
                    danhSachKho.length
                );


                /* =========================================
                   2. LẤY DANH SÁCH THUỐC

                   Dùng để lấy:
                   - Tên thuốc
                   - Đơn vị tính
                ========================================== */

                try {

                    const thuocData =
                        await apiGet(
                            THUOC_API_URL
                        );


                    console.log(
                        "DỮ LIỆU /api/medicines:",
                        thuocData
                    );


                    danhSachThuocGoc =
                        extractArray(
                            thuocData
                        );


                    console.log(
                        "Số thuốc:",
                        danhSachThuocGoc.length
                    );

                } catch (error) {

                    console.warn(
                        "Không lấy được /api/medicines:",
                        error
                    );


                    danhSachThuocGoc = [];
                }


                /* =========================================
                   3. TẠO MAP THUỐC
                ========================================== */

                const medicineMap =
                    new Map();


                danhSachThuocGoc.forEach(
                    function (medicine) {

                        if (!medicine) {
                            return;
                        }


                        const maThuoc =
                            Number(
                                medicine.maThuoc ??
                                medicine.MaThuoc ??
                                0
                            );


                        if (!maThuoc) {
                            return;
                        }


                        medicineMap.set(
                            maThuoc,
                            medicine
                        );
                    }
                );


                /* =========================================
                   4. GOM TỒN KHO
                ========================================== */

                danhSachThuoc =
                    buildMedicineStockList(
                        danhSachKho,
                        medicineMap
                    );


                console.log(
                    "DANH SÁCH TỒN KHO:",
                    danhSachThuoc
                );


                danhSachLoc =
                    [
                        ...danhSachThuoc
                    ];


                currentPage = 1;


                /* =========================================
                   5. BUILD ĐƠN VỊ
                ========================================== */

                buildUnitOptions();


                /* =========================================
                   6. THỐNG KÊ
                ========================================== */

                updateStatistics();


                /* =========================================
                   7. HIỂN THỊ
                ========================================== */

                renderTable();


                console.log(
                    "ĐÃ LOAD TỒN KHO THÀNH CÔNG"
                );

                console.log(
                    "===================================="
                );

            } catch (error) {

                console.error(
                    "LỖI LOAD TỒN KHO:",
                    error
                );


                showError(
                    error.message ||
                    "Không thể tải dữ liệu tồn kho."
                );
            }
        }


        /* =================================================
           BUILD MEDICINE STOCK LIST
        ================================================= */

        function buildMedicineStockList(
            list,
            medicineMap
        ) {

            const map =
                new Map();


            if (
                !Array.isArray(list)
            ) {

                return [];
            }


            list.forEach(
                function (item) {

                    if (!item) {
                        return;
                    }


                    const thuoc =
                        item.thuoc ||
                        item.Thuoc ||
                        {};


                    /* =====================================
                       MÃ THUỐC
                    ====================================== */

                    const maThuoc =
                        Number(
                            item.maThuoc ??
                            item.MaThuoc ??
                            thuoc.maThuoc ??
                            thuoc.MaThuoc ??
                            0
                        );


                    if (!maThuoc) {

                        console.warn(
                            "Không có MaThuoc:",
                            item
                        );

                        return;
                    }


                    /*
                     * Lấy thông tin thuốc từ API medicines
                     */

                    const medicine =
                        medicineMap?.get(
                            maThuoc
                        ) ||
                        {};


                    /* =====================================
                       TÊN THUỐC
                    ====================================== */

                    const tenThuoc =
                        item.tenThuoc ??
                        item.TenThuoc ??
                        thuoc.tenThuoc ??
                        thuoc.TenThuoc ??
                        medicine.tenThuoc ??
                        medicine.TenThuoc ??
                        "-";


                    /* =====================================
                       ĐƠN VỊ
                    ====================================== */

                    const donViTinh =
                        item.donViTinh ??
                        item.DonViTinh ??
                        thuoc.donViTinh ??
                        thuoc.DonViTinh ??
                        medicine.donViTinh ??
                        medicine.DonViTinh ??
                        "-";


                    /* =====================================
                       TỒN KHO
                    ====================================== */

                    const soLuongTon =
                        Number(
                            item.soLuongTon ??
                            item.SoLuongTon ??
                            item.tonKho ??
                            item.TonKho ??
                            0
                        );


                    /* =====================================
                       TỒN TỐI THIỂU
                    ====================================== */

                    const soLuongToiThieu =
                        Number(
                            item.soLuongToiThieu ??
                            item.SoLuongToiThieu ??
                            item.tonKhoToiThieu ??
                            item.TonKhoToiThieu ??
                            0
                        );


                    /* =====================================
                       SỐ LÔ
                    ====================================== */

                    const soLo =
                        item.soLo ??
                        item.SoLo ??
                        "";


                    /* =====================================
                       HẠN SỬ DỤNG
                    ====================================== */

                    const hanSuDung =
                        item.hanSuDung ??
                        item.HanSuDung ??
                        null;


                    /* =====================================
                       TẠO OBJECT THUỐC
                    ====================================== */

                    if (
                        !map.has(maThuoc)
                    ) {

                        map.set(
                            maThuoc,
                            {

                                maThuoc:
                                    maThuoc,

                                tenThuoc:
                                    tenThuoc,

                                donViTinh:
                                    donViTinh,

                                soLuongTon:
                                    0,

                                soLuongToiThieu:
                                    0,

                                soLo:
                                    "",

                                hanSuDung:
                                    null,

                                soLoGanNhat:
                                    "",

                                hanSuDungGanNhat:
                                    null,

                                loList:
                                    []

                            }
                        );
                    }


                    const medicineItem =
                        map.get(
                            maThuoc
                        );


                    /* =====================================
                       CỘNG TỒN
                    ====================================== */

                    medicineItem.soLuongTon +=
                        Math.max(
                            0,
                            soLuongTon
                        );


                    /* =====================================
                       CỘNG TỒN TỐI THIỂU
                    ====================================== */

                    medicineItem.soLuongToiThieu +=
                        Math.max(
                            0,
                            soLuongToiThieu
                        );


                    /* =====================================
                       LƯU LÔ
                    ====================================== */

                    medicineItem.loList.push({

                        soLo:
                            soLo,

                        soLuongTon:
                            soLuongTon,

                        soLuongToiThieu:
                            soLuongToiThieu,

                        hanSuDung:
                            hanSuDung

                    });


                    /* =====================================
                       TÌM HẠN SỬ DỤNG GẦN NHẤT
                    ====================================== */

                    if (
                        hanSuDung
                    ) {

                        const expiryDate =
                            new Date(
                                hanSuDung
                            );


                        if (
                            !Number.isNaN(
                                expiryDate.getTime()
                            )
                        ) {

                            if (
                                !medicineItem.hanSuDungGanNhat ||
                                expiryDate <
                                new Date(
                                    medicineItem.hanSuDungGanNhat
                                )
                            ) {

                                medicineItem.hanSuDungGanNhat =
                                    hanSuDung;

                                medicineItem.hanSuDung =
                                    hanSuDung;

                                medicineItem.soLoGanNhat =
                                    soLo;

                                medicineItem.soLo =
                                    soLo;
                            }
                        }
                    }

                }
            );


            return Array.from(
                map.values()
            );
        }


        /* =================================================
           TRẠNG THÁI TỒN KHO
        ================================================= */

        function getStockStatus(
            item
        ) {

            const ton =
                Number(
                    item?.soLuongTon ??
                    item?.tonKho ??
                    0
                );


            const toiThieu =
                Number(
                    item?.soLuongToiThieu ??
                    item?.tonKhoToiThieu ??
                    0
                );


            /*
             * HẾT HÀNG
             */

            if (
                ton <= 0
            ) {

                return {

                    code:
                        "HET_HANG",

                    text:
                        "Hết hàng",

                    className:
                        "danger"

                };
            }


            /*
             * SẮP HẾT
             */

            if (
                toiThieu > 0 &&
                ton <= toiThieu
            ) {

                return {

                    code:
                        "SAP_HET",

                    text:
                        "Sắp hết",

                    className:
                        "warning"

                };
            }


            /*
             * ĐỦ HÀNG
             */

            return {

                code:
                    "DU_HANG",

                text:
                    "Đủ hàng",

                className:
                    "active"

            };
        }


        /* =================================================
           BUILD UNIT OPTIONS
        ================================================= */

        function buildUnitOptions() {

            if (
                !stockUnit
            ) {

                return;
            }


            const units =
                [
                    ...new Set(

                        danhSachThuoc
                            .map(
                                function (item) {

                                    return (
                                        item.donViTinh ||
                                        ""
                                    )
                                    .trim();
                                }
                            )
                            .filter(
                                function (unit) {

                                    return (
                                        unit &&
                                        unit !== "-"
                                    );
                                }
                            )

                    )
                ]
                .sort(
                    function (
                        a,
                        b
                    ) {

                        return String(a)
                            .localeCompare(
                                String(b),
                                "vi"
                            );
                    }
                );


            stockUnit.innerHTML = `
                <option value="">
                    Tất cả
                </option>
            `;


            units.forEach(
                function (unit) {

                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        unit;


                    option.textContent =
                        unit;


                    stockUnit.appendChild(
                        option
                    );
                }
            );
        }


        /* =================================================
           UPDATE STATISTICS
        ================================================= */

        function updateStatistics() {

            let enough = 0;

            let low = 0;

            let empty = 0;


            danhSachThuoc.forEach(
                function (item) {

                    const status =
                        getStockStatus(
                            item
                        );


                    if (
                        status.code ===
                        "DU_HANG"
                    ) {

                        enough++;

                    } else if (
                        status.code ===
                        "SAP_HET"
                    ) {

                        low++;

                    } else {

                        empty++;
                    }
                }
            );


            if (
                totalMedicineCount
            ) {

                totalMedicineCount.textContent =
                    formatNumber(
                        danhSachThuoc.length
                    );
            }


            if (
                enoughMedicineCount
            ) {

                enoughMedicineCount.textContent =
                    formatNumber(
                        enough
                    );
            }


            if (
                lowMedicineCount
            ) {

                lowMedicineCount.textContent =
                    formatNumber(
                        low
                    );
            }


            if (
                emptyMedicineCount
            ) {

                emptyMedicineCount.textContent =
                    formatNumber(
                        empty
                    );
            }
        }


        /* =================================================
           APPLY FILTERS

           Chỉ được gọi khi:
           - Bấm Tìm kiếm
           - Nhấn Enter
           - Chọn Đơn vị
           - Chọn Trạng thái
           - Reset
        ================================================= */

        function applyFilters() {

            const keyword =
                (
                    stockKeyword?.value ||
                    ""
                )
                .trim()
                .toLowerCase();


            const unit =
                (
                    stockUnit?.value ||
                    ""
                )
                .trim()
                .toLowerCase();


            const status =
                (
                    stockStatus?.value ||
                    ""
                )
                .trim();


            console.log(
                "APPLY FILTERS:",
                {
                    keyword,
                    unit,
                    status
                }
            );


            danhSachLoc =
                danhSachThuoc.filter(
                    function (item) {

                        /* =================================
                           TÌM KIẾM
                        ================================== */

                        if (
                            keyword
                        ) {

                            const maThuoc =
                                String(
                                    item.maThuoc ??
                                    ""
                                )
                                .toLowerCase();


                            const maHienThi =
                                (
                                    "th" +
                                    String(
                                        item.maThuoc ??
                                        ""
                                    )
                                    .padStart(
                                        3,
                                        "0"
                                    )
                                )
                                .toLowerCase();


                            const tenThuoc =
                                String(
                                    item.tenThuoc ??
                                    ""
                                )
                                .toLowerCase();


                            const donVi =
                                String(
                                    item.donViTinh ??
                                    ""
                                )
                                .toLowerCase();


                            const match =
                                maThuoc.includes(
                                    keyword
                                ) ||
                                maHienThi.includes(
                                    keyword
                                ) ||
                                tenThuoc.includes(
                                    keyword
                                ) ||
                                donVi.includes(
                                    keyword
                                );


                            if (
                                !match
                            ) {

                                return false;
                            }
                        }


                        /* =================================
                           ĐƠN VỊ
                        ================================== */

                        if (
                            unit
                        ) {

                            const itemUnit =
                                String(
                                    item.donViTinh ??
                                    ""
                                )
                                .trim()
                                .toLowerCase();


                            if (
                                itemUnit !==
                                unit
                            ) {

                                return false;
                            }
                        }


                        /* =================================
                           TRẠNG THÁI
                        ================================== */

                        if (
                            status
                        ) {

                            const itemStatus =
                                getStockStatus(
                                    item
                                );


                            if (
                                itemStatus.code !==
                                status
                            ) {

                                return false;
                            }
                        }


                        return true;
                    }
                );


            currentPage = 1;


            renderTable();
        }


        /* =================================================
           RENDER TABLE
        ================================================= */

        function renderTable() {

            if (
                !stockTableBody
            ) {

                return;
            }


            const total =
                danhSachLoc.length;


            const totalPages =
                Math.max(
                    1,
                    Math.ceil(
                        total /
                        ITEMS_PER_PAGE
                    )
                );


            if (
                currentPage >
                totalPages
            ) {

                currentPage =
                    totalPages;
            }


            const start =
                (
                    currentPage -
                    1
                ) *
                ITEMS_PER_PAGE;


            const end =
                start +
                ITEMS_PER_PAGE;


            const pageItems =
                danhSachLoc.slice(
                    start,
                    end
                );


            if (
                pageItems.length === 0
            ) {

                stockTableBody.innerHTML = `
                    <tr>
                        <td
                            colspan="8"
                            class="table-empty">

                            Không tìm thấy thuốc phù hợp.

                        </td>
                    </tr>
                `;

            } else {

                stockTableBody.innerHTML =
                    pageItems
                        .map(
                            function (
                                item,
                                index
                            ) {

                                return renderRow(
                                    item,
                                    start + index
                                );
                            }
                        )
                        .join("");
            }


            updateResultInfo(
                total
            );


            renderPagination(
                totalPages
            );
        }


        /* =================================================
           RENDER ROW
        ================================================= */

        function renderRow(
            item,
            index
        ) {

            const status =
                getStockStatus(
                    item
                );


            const ton =
                Number(
                    item.soLuongTon ??
                    0
                );


            const toiThieu =
                Number(
                    item.soLuongToiThieu ??
                    0
                );


            const maHienThi =
                "TH" +
                String(
                    item.maThuoc ??
                    ""
                )
                .padStart(
                    3,
                    "0"
                );


            let stockClass =
                "stock-current";


            if (
                ton <= 0
            ) {

                stockClass +=
                    " empty";

            } else if (
                toiThieu > 0 &&
                ton <= toiThieu
            ) {

                stockClass +=
                    " low";
            }


            return `
                <tr>

                    <td>
                        ${index + 1}
                    </td>


                    <td>
                        <span class="medicine-code">
                            ${escapeHtml(
                                maHienThi
                            )}
                        </span>
                    </td>


                    <td>

                        <span
                            class="medicine-name"
                            title="${escapeHtml(
                                item.tenThuoc ||
                                "-"
                            )}">

                            ${escapeHtml(
                                item.tenThuoc ||
                                "-"
                            )}

                        </span>

                    </td>


                    <td>

                        <span class="medicine-unit">

                            ${escapeHtml(
                                item.donViTinh ||
                                "-"
                            )}

                        </span>

                    </td>


                    <td>

                        <span
                            class="${stockClass}">

                            ${formatNumber(
                                ton
                            )}

                        </span>

                    </td>


                    <td>

                        <span class="stock-minimum">

                            ${formatNumber(
                                toiThieu
                            )}

                        </span>

                    </td>


                    <td>

                        <span
                            class="
                                medicine-status
                                ${status.className}
                            ">

                            ${status.text}

                        </span>

                    </td>


                    <td>

                        <button
                            type="button"
                            class="
                                action-button
                                stock-detail-button
                            "
                            data-id="${item.maThuoc}">

                            Xem chi tiết

                        </button>

                    </td>

                </tr>
            `;
        }


        /* =================================================
           RESULT INFO
        ================================================= */

        function updateResultInfo(total) {

            if (!resultInfo) {
                return;
            }

            // Không có kết quả
            if (total === 0) {

                resultInfo.textContent =
                    "Hiển thị 0 - 0 trong 0 kết quả";

                return;
            }

            const start =
                (currentPage - 1) * ITEMS_PER_PAGE + 1;

            const end =
                Math.min(
                    currentPage * ITEMS_PER_PAGE,
                    total
                );

            resultInfo.textContent =
                `Hiển thị ${start} - ${end} trong ${total} kết quả`;
        }

        /* =================================================
           PAGINATION
        ================================================= */

        function renderPagination(
            totalPages
        ) {

            if (
                !pagination
            ) {

                return;
            }


            pagination.innerHTML =
                "";


            if (
                totalPages <= 1
            ) {

                return;
            }


            /* =============================================
               PREVIOUS
            ============================================== */

            const previous =
                document.createElement(
                    "button"
                );


            previous.type =
                "button";


            previous.className =
                "page-button";


            previous.innerHTML =
                "‹";


            previous.disabled =
                currentPage <= 1;


            previous.addEventListener(
                "click",
                function () {

                    if (
                        currentPage > 1
                    ) {

                        currentPage--;

                        renderTable();
                    }
                }
            );


            pagination.appendChild(
                previous
            );


            /* =============================================
               PAGE NUMBER
            ============================================== */

            const pages =
                getPageNumbers(
                    currentPage,
                    totalPages
                );


            pages.forEach(
                function (page) {

                    if (
                        page === "..."
                    ) {

                        const dots =
                            document.createElement(
                                "span"
                            );


                        dots.className =
                            "pagination-dots";


                        dots.textContent =
                            "...";


                        pagination.appendChild(
                            dots
                        );


                        return;
                    }


                    const button =
                        document.createElement(
                            "button"
                        );


                    button.type =
                        "button";


                    button.className =
                        "page-button";


                    button.textContent =
                        page;


                    if (
                        page ===
                        currentPage
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
                        }
                    );


                    pagination.appendChild(
                        button
                    );
                }
            );


            /* =============================================
               NEXT
            ============================================== */

            const next =
                document.createElement(
                    "button"
                );


            next.type =
                "button";


            next.className =
                "page-button";


            next.innerHTML =
                "›";


            next.disabled =
                currentPage >=
                totalPages;


            next.addEventListener(
                "click",
                function () {

                    if (
                        currentPage <
                        totalPages
                    ) {

                        currentPage++;

                        renderTable();
                    }
                }
            );


            pagination.appendChild(
                next
            );
        }


        /* =================================================
           PAGE NUMBERS
        ================================================= */

        function getPageNumbers(
            current,
            total
        ) {

            if (
                total <= 7
            ) {

                return Array.from(
                    {
                        length:
                            total
                    },
                    function (
                        _,
                        index
                    ) {

                        return index + 1;
                    }
                );
            }


            const pages = [];


            pages.push(1);


            if (
                current > 4
            ) {

                pages.push("...");
            }


            const start =
                Math.max(
                    2,
                    current - 1
                );


            const end =
                Math.min(
                    total - 1,
                    current + 1
                );


            for (
                let page = start;
                page <= end;
                page++
            ) {

                pages.push(page);
            }


            if (
                current < total - 3
            ) {

                pages.push("...");
            }


            pages.push(total);


            return pages;
        }


        /* =================================================
           VIEW DETAIL
        ================================================= */

        function viewStockDetail(
            id
        ) {

            const item =
                danhSachThuoc.find(
                    function (medicine) {

                        return (
                            Number(
                                medicine.maThuoc
                            ) ===
                            Number(id)
                        );
                    }
                );


            if (!item) {

                console.error(
                    "Không tìm thấy thuốc:",
                    id
                );

                return;
            }


            const stock =
                Number(
                    item.soLuongTon ??
                    0
                );


            const minimum =
                Number(
                    item.soLuongToiThieu ??
                    0
                );


            const status =
                getStockStatus(
                    item
                );


            setText(
                "detailMaThuoc",
                "TH" +
                String(
                    item.maThuoc ??
                    ""
                )
                .padStart(
                    3,
                    "0"
                )
            );


            setText(
                "detailTenThuoc",
                item.tenThuoc ||
                "-"
            );


            setText(
                "detailDonVi",
                item.donViTinh ||
                "-"
            );


            setText(
                "detailTonKho",
                formatNumber(
                    stock
                )
            );


            setText(
                "detailTonToiThieu",
                formatNumber(
                    minimum
                )
            );


            setText(
                "detailSoLo",
                item.soLoGanNhat ||
                item.soLo ||
                "-"
            );


            setText(
                "detailHanSuDung",
                formatDate(
                    item.hanSuDungGanNhat ||
                    item.hanSuDung
                )
            );


            setText(
                "detailTrangThai",
                status.text
            );


            if (
                stockDetailModal
            ) {

                stockDetailModal.style.display =
                    "flex";
            }
        }


        /* =================================================
           SET TEXT
        ================================================= */

        function setText(
            id,
            value
        ) {

            const element =
                document.getElementById(
                    id
                );


            if (
                element
            ) {

                element.textContent =
                    value ??
                    "-";
            }
        }


        /* =================================================
           CLOSE MODAL
        ================================================= */

        function closeDetailModal() {

            if (
                stockDetailModal
            ) {

                stockDetailModal.style.display =
                    "none";
            }
        }


        /* =================================================
           LOADING
        ================================================= */

        function showLoading() {

            if (
                !stockTableBody
            ) {

                return;
            }


            stockTableBody.innerHTML = `
                <tr>
                    <td
                        colspan="8"
                        class="table-loading">

                        Đang tải dữ liệu...

                    </td>
                </tr>
            `;
        }


        /* =================================================
           ERROR
        ================================================= */

        function showError(
            message
        ) {

            if (
                !stockTableBody
            ) {

                return;
            }


            stockTableBody.innerHTML = `
                <tr>
                    <td
                        colspan="8"
                        class="table-error">

                        ${escapeHtml(
                            message
                        )}

                    </td>
                </tr>
            `;


            if (
                resultInfo
            ) {

                resultInfo.textContent =
                    "Không thể tải dữ liệu";
            }


            if (
                pagination
            ) {

                pagination.innerHTML =
                    "";
            }
        }


        /* =================================================
           FORMAT NUMBER
        ================================================= */

        function formatNumber(
            value
        ) {

            const number =
                Number(value);


            if (
                Number.isNaN(number)
            ) {

                return "0";
            }


            return number.toLocaleString(
                "vi-VN"
            );
        }


        /* =================================================
           FORMAT DATE
        ================================================= */

        function formatDate(
            value
        ) {

            if (!value) {

                return "-";
            }


            const text =
                String(value);


            const match =
                text.match(
                    /^(\d{4})-(\d{2})-(\d{2})/
                );


            if (match) {

                return (
                    match[3] +
                    "/" +
                    match[2] +
                    "/" +
                    match[1]
                );
            }


            return text;
        }


        /* =================================================
           ESCAPE HTML
        ================================================= */

        function escapeHtml(
            value
        ) {

            return String(
                value ?? ""
            )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );
        }


        /* =================================================
           CLICK XEM CHI TIẾT
        ================================================= */

        if (
            stockTableBody
        ) {

            stockTableBody.addEventListener(
                "click",
                function (event) {

                    const button =
                        event.target.closest(
                            ".stock-detail-button"
                        );


                    if (!button) {

                        return;
                    }


                    viewStockDetail(
                        button.dataset.id
                    );
                }
            );
        }


        /* =================================================
           TÌM KIẾM

           QUAN TRỌNG:
           Không dùng event "input".

           Gõ chữ:
           -> KHÔNG tìm

           Bấm nút:
           -> TÌM

           Nhấn Enter:
           -> TÌM
        ================================================= */

        if (
            stockKeyword
        ) {

            stockKeyword.addEventListener(
                "keydown",
                function (event) {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        event.preventDefault();

                        applyFilters();
                    }
                }
            );
        }


        /* =================================================
           NÚT TÌM KIẾM
        ================================================= */

        if (
            stockSearchButton
        ) {

            stockSearchButton.addEventListener(
                "click",
                function () {

                    applyFilters();
                }
            );
        }


        /* =================================================
           ĐƠN VỊ

           Chọn đơn vị -> lọc ngay
        ================================================= */

        if (
            stockUnit
        ) {

            stockUnit.addEventListener(
                "change",
                function () {

                    applyFilters();
                }
            );
        }


        /* =================================================
           TRẠNG THÁI

           Chọn trạng thái -> lọc ngay
        ================================================= */

        if (
            stockStatus
        ) {

            stockStatus.addEventListener(
                "change",
                function () {

                    applyFilters();
                }
            );
        }


        /* =================================================
           RESET
        ================================================= */

        if (
            stockResetButton
        ) {

            stockResetButton.addEventListener(
                "click",
                function () {

                    if (
                        stockKeyword
                    ) {

                        stockKeyword.value =
                            "";
                    }


                    if (
                        stockUnit
                    ) {

                        stockUnit.value =
                            "";
                    }


                    if (
                        stockStatus
                    ) {

                        stockStatus.value =
                            "";
                    }


                    danhSachLoc =
                        [
                            ...danhSachThuoc
                        ];


                    currentPage = 1;


                    renderTable();
                }
            );
        }


        /* =================================================
           CLOSE MODAL
        ================================================= */

        if (
            closeStockDetail
        ) {

            closeStockDetail.addEventListener(
                "click",
                closeDetailModal
            );
        }


        if (
            closeStockDetailButton
        ) {

            closeStockDetailButton.addEventListener(
                "click",
                closeDetailModal
            );
        }


        if (
            stockDetailModal
        ) {

            stockDetailModal.addEventListener(
                "click",
                function (event) {

                    if (
                        event.target ===
                        stockDetailModal
                    ) {

                        closeDetailModal();
                    }
                }
            );
        }


        /* =================================================
           ESC ĐÓNG MODAL
        ================================================= */

        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key ===
                    "Escape"
                ) {

                    closeDetailModal();
                }
            }
        );


        /* =================================================
           EXPORT CSV
        ================================================= */

        if (
            exportStockButton
        ) {

            exportStockButton.addEventListener(
                "click",
                exportCSV
            );
        }


        /* =================================================
           XUẤT FILE CSV
        ================================================= */

        async function exportCSV() {

            /* ---------------------------------------------
               1. KIỂM TRA DỮ LIỆU
            --------------------------------------------- */

            if (
                danhSachLoc.length === 0
            ) {

                alert(
                    "Không có dữ liệu để xuất."
                );

                return;
            }


            try {

                /* -----------------------------------------
                   2. TẠO DỮ LIỆU CSV
                ----------------------------------------- */

                const rows = [];


                rows.push([
                    "STT",
                    "Mã thuốc",
                    "Tên thuốc",
                    "Đơn vị",
                    "Tồn kho hiện tại",
                    "Tồn kho tối thiểu",
                    "Trạng thái"
                ]);


                danhSachLoc.forEach(
                    function (
                        item,
                        index
                    ) {

                        const status =
                            getStockStatus(
                                item
                            );


                        rows.push([

                            index + 1,

                            "TH" +
                            String(
                                item.maThuoc ??
                                ""
                            )
                            .padStart(
                                3,
                                "0"
                            ),

                            item.tenThuoc ||
                            "",

                            item.donViTinh ||
                            "",

                            item.soLuongTon ??
                            0,

                            item.soLuongToiThieu ??
                            0,

                            status.text

                        ]);
                    }
                );


                /* -----------------------------------------
                   3. CHUYỂN SANG CSV
                ----------------------------------------- */

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


                /* -----------------------------------------
                   4. TẠO FILE
                ----------------------------------------- */

                const blob =
                    new Blob(
                        [
                            csvContent
                        ],
                        {
                            type:
                                "text/csv;charset=utf-8;"
                        }
                    );


                const url =
                    URL.createObjectURL(
                        blob
                    );


                const link =
                    document.createElement(
                        "a"
                    );


                link.href =
                    url;


                link.download =
                    "ton-kho-thuoc.csv";


                document.body.appendChild(
                    link
                );


                /* -----------------------------------------
                   5. TẢI FILE
                ----------------------------------------- */

                link.click();


                document.body.removeChild(
                    link
                );


                URL.revokeObjectURL(
                    url
                );


                /* -----------------------------------------
                   6. THÔNG BÁO CHO CHÍNH DƯỢC SĨ
                ----------------------------------------- */

                try {

                    const response =
                        await fetch(
                            "/api/kho-thuoc/thong-bao-xuat-file",
                            {
                                method: "POST",

                                headers:
                                    getHeaders(),

                                credentials:
                                    "same-origin"
                            }
                        );


                    console.log(
                        "[THÔNG BÁO XUẤT FILE] Status:",
                        response.status
                    );


                    if (
                        response.status === 401
                    ) {

                        console.warn(
                            "Phiên đăng nhập đã hết hạn."
                        );

                        return;
                    }


                    if (
                        response.status === 403
                    ) {

                        console.warn(
                            "Không có quyền tạo thông báo xuất file."
                        );

                        return;
                    }


                    if (
                        !response.ok
                    ) {

                        console.warn(
                            "Không thể tạo thông báo xuất file."
                        );

                        return;
                    }


                    console.log(
                        "ĐÃ GỬI THÔNG BÁO XUẤT FILE"
                    );


                } catch (notificationError) {

                    /*
                     * File đã tải thành công.
                     * Nếu API thông báo lỗi thì không làm
                     * ảnh hưởng việc tải file.
                     */

                    console.warn(
                        "Lỗi gửi thông báo xuất file:",
                        notificationError
                    );
                }


            } catch (error) {

                console.error(
                    "LỖI XUẤT FILE:",
                    error
                );


                alert(
                    "Không thể xuất file tồn kho."
                );
            }
        }


        /* =================================================
           START
        ================================================= */

        loadTonKho();

    }
);