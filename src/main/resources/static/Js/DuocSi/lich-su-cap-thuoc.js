document.addEventListener(
    "DOMContentLoaded",
    function () {

        // =====================================================
        // API
        // =====================================================

        const API_URL =
            "/api/duocsi/lich-su-cap-thuoc";


        // =====================================================
        // STATE
        // =====================================================

        let currentPage = 0;

        // Không cho chọn 5 / 10 / 20 nữa.
        // Cố định 10 kết quả mỗi trang.
        const pageSize = 10;

        let totalPages = 0;

        let totalElements = 0;


        // =====================================================
        // ELEMENTS
        // =====================================================

        const tableBody =
            document.getElementById(
                "historyTableBody"
            );


        const keywordInput =
            document.getElementById(
                "keyword"
            );


        const fromDateInput =
            document.getElementById(
                "fromDate"
            );


        const toDateInput =
            document.getElementById(
                "toDate"
            );


        const statusSelect =
            document.getElementById(
                "status"
            );


        const searchButton =
            document.getElementById(
                "searchButton"
            );


        const resetButton =
            document.getElementById(
                "resetButton"
            );


        const previousPage =
            document.getElementById(
                "previousPage"
            );


        const nextPage =
            document.getElementById(
                "nextPage"
            );


        const pageNumbers =
            document.getElementById(
                "pageNumbers"
            );


        const resultInfo =
            document.getElementById(
                "resultInfo"
            );


        // =====================================================
        // TOKEN
        // =====================================================

        function getToken() {

            return (
                sessionStorage.getItem("Token")
                ||
                localStorage.getItem("Token")
                ||
                ""
            );
        }


        // =====================================================
        // ESCAPE HTML
        // =====================================================

        function escapeHtml(value) {

            if (
                value === null ||
                value === undefined
            ) {
                return "";
            }


            return String(value)
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


        // =====================================================
        // FORMAT DATE
        // =====================================================

        function formatDate(value) {

            if (!value) {
                return "-";
            }


            // Nếu API đã trả dd/MM/yyyy
            if (
                typeof value === "string"
                &&
                /^\d{2}\/\d{2}\/\d{4}$/.test(
                    value
                )
            ) {

                return value;
            }


            const date =
                new Date(value);


            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {

                return String(value);
            }


            return String(
                date.getDate()
            ).padStart(
                2,
                "0"
            )
                +
                "/"
                +
                String(
                    date.getMonth() + 1
                ).padStart(
                    2,
                    "0"
                )
                +
                "/"
                +
                date.getFullYear();
        }


        // =====================================================
        // FORMAT MONEY
        // =====================================================

        function formatMoney(value) {

            if (
                value === null ||
                value === undefined ||
                value === ""
            ) {

                return "-";
            }


            const number =
                Number(value);


            if (
                Number.isNaN(number)
            ) {

                return String(value);
            }


            return new Intl.NumberFormat(
                "vi-VN"
            ).format(
                number
            ) + "đ";
        }


        // =====================================================
        // NORMALIZE STATUS
        // =====================================================

        function normalizeStatus(status) {

            switch (status) {

                case "DaCapThuoc":

                    return {
                        text: "Đã cấp",
                        className: "completed"
                    };


                case "DangCapThuoc":

                    return {
                        text: "Đang cấp",
                        className: "processing"
                    };


                case "DaHuy":

                    return {
                        text: "Đã hủy",
                        className: "cancelled"
                    };


                default:

                    return {

                        text:
                            status
                            ||
                            "Không xác định",

                        className:
                            "processing"
                    };
            }
        }


        // =====================================================
        // SHOW LOADING
        // =====================================================

        function showLoading() {

            if (!tableBody) {
                return;
            }


            tableBody.innerHTML = `

                <tr>

                    <td
                        colspan="10"
                        class="table-loading">

                        Đang tải dữ liệu...

                    </td>

                </tr>

            `;
        }


        // =====================================================
        // SHOW ERROR
        // =====================================================

        function showError(message) {

            if (!tableBody) {
                return;
            }


            tableBody.innerHTML = `

                <tr>

                    <td
                        colspan="10"
                        class="table-error">

                        ${escapeHtml(message)}

                    </td>

                </tr>

            `;


            totalPages = 0;
            totalElements = 0;


            updateResultInfo(
                0,
                0
            );


            renderPagination();
        }


        // =====================================================
        // LẤY ĐIỀU KIỆN TÌM KIẾM
        // =====================================================

        function getSearchFilters() {

            return {

                keyword:
                    keywordInput
                        ? keywordInput.value.trim()
                        : "",

                fromDate:
                    fromDateInput
                        ? fromDateInput.value
                        : "",

                toDate:
                    toDateInput
                        ? toDateInput.value
                        : "",

                status:
                    statusSelect
                        ? statusSelect.value
                        : ""
            };
        }


        // =====================================================
        // KIỂM TRA NGÀY
        // =====================================================

        function validateFilters() {

            const filters =
                getSearchFilters();


            // Không có ngày thì hợp lệ
            if (
                !filters.fromDate
                ||
                !filters.toDate
            ) {

                return true;
            }


            const from =
                new Date(
                    filters.fromDate
                );


            const to =
                new Date(
                    filters.toDate
                );


            if (
                from > to
            ) {

                showError(
                    "Ngày bắt đầu không được lớn hơn ngày kết thúc."
                );

                return false;
            }


            return true;
        }


        // =====================================================
        // LOAD HISTORY
        // =====================================================

        async function loadHistory() {

            if (!validateFilters()) {
                return;
            }


            showLoading();


            const token =
                getToken();


            if (!token) {

                showError(
                    "Vui lòng đăng nhập lại."
                );

                return;
            }


            try {

                // =================================================
                // TẠO QUERY PARAMETER
                // =================================================

                const params =
                    new URLSearchParams();


                const filters =
                    getSearchFilters();


                // =================================================
                // TÌM KIẾM MÃ ĐƠN
                // =================================================

                if (
                    filters.keyword
                ) {

                    params.append(
                        "keyword",
                        filters.keyword
                    );
                }


                // =================================================
                // TỪ NGÀY
                // =================================================

                if (
                    filters.fromDate
                ) {

                    params.append(
                        "fromDate",
                        filters.fromDate
                    );
                }


                // =================================================
                // ĐẾN NGÀY
                // =================================================

                if (
                    filters.toDate
                ) {

                    params.append(
                        "toDate",
                        filters.toDate
                    );
                }


                // =================================================
                // TRẠNG THÁI
                // =================================================

                if (
                    filters.status
                ) {

                    params.append(
                        "status",
                        filters.status
                    );
                }


                // =================================================
                // PHÂN TRANG
                // =================================================

                params.append(
                    "page",
                    currentPage
                );


                params.append(
                    "size",
                    pageSize
                );


                // =================================================
                // URL
                // =================================================

                const queryString =
                    params.toString();


                const requestUrl =
                    API_URL
                    +
                    (
                        queryString
                            ? "?" + queryString
                            : ""
                    );


                console.log(
                    "API lịch sử cấp thuốc:",
                    requestUrl
                );


                // =================================================
                // CALL API
                // =================================================

                const response =
                    await fetch(
                        requestUrl,
                        {
                            method: "GET",

                            headers: {

                                "Authorization":
                                    "Bearer " +
                                    token,

                                "Content-Type":
                                    "application/json"
                            }
                        }
                    );


                console.log(
                    "HTTP Status:",
                    response.status
                );


                // =================================================
                // 401
                // =================================================

                if (
                    response.status === 401
                ) {

                    showError(
                        "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
                    );

                    return;
                }


                // =================================================
                // 403
                // =================================================

                if (
                    response.status === 403
                ) {

                    showError(
                        "Bạn không có quyền xem lịch sử cấp thuốc."
                    );

                    return;
                }


                // =================================================
                // 404
                // =================================================

                if (
                    response.status === 404
                ) {

                    showError(
                        "Không tìm thấy dữ liệu lịch sử cấp thuốc."
                    );

                    return;
                }


                // =================================================
                // OTHER ERROR
                // =================================================

                if (!response.ok) {

                    const errorText =
                        await response.text();

                    console.error(
                        "API Error:",
                        errorText
                    );


                    throw new Error(
                        "HTTP " +
                        response.status
                    );
                }


                // =================================================
                // JSON
                // =================================================

                const data =
                    await response.json();


                console.log(
                    "Dữ liệu lịch sử cấp thuốc:",
                    data
                );


                // =================================================
                // RENDER
                // =================================================

                renderData(
                    data
                );


            } catch (error) {

                console.error(
                    "Lỗi tải lịch sử cấp thuốc:",
                    error
                );


                showError(
                    "Không thể tải dữ liệu lịch sử cấp thuốc."
                );
            }
        }


        // =====================================================
        // RENDER DATA
        // =====================================================

        function renderData(data) {

            let list = [];


            // =================================================
            // SPRING PAGE
            // =================================================

            if (
                data
                &&
                Array.isArray(
                    data.content
                )
            ) {

                list =
                    data.content;


                totalPages =
                    data.totalPages
                    ??
                    0;


                totalElements =
                    data.totalElements
                    ??
                    0;


                currentPage =
                    data.number
                    ??
                    currentPage;
            }


            // =================================================
            // ARRAY
            // =================================================

            else if (
                Array.isArray(data)
            ) {

                list =
                    data;


                totalElements =
                    data.length;


                totalPages =
                    Math.ceil(
                        data.length /
                        pageSize
                    );
            }


            // =================================================
            // DATA KHÔNG HỢP LỆ
            // =================================================

            else {

                showError(
                    "Dữ liệu lịch sử cấp thuốc không hợp lệ."
                );

                return;
            }


            renderTable(
                list
            );


            renderPagination();
        }


        // =====================================================
        // RENDER TABLE
        // =====================================================

        function renderTable(list) {

            if (!tableBody) {

                console.error(
                    "Không tìm thấy historyTableBody."
                );

                return;
            }


            // =================================================
            // KHÔNG CÓ DỮ LIỆU
            // =================================================

            if (
                !Array.isArray(list)
                ||
                list.length === 0
            ) {

                tableBody.innerHTML = `

                    <tr>

                        <td
                            colspan="10"
                            class="table-empty">

                            Không tìm thấy lịch sử cấp thuốc phù hợp.

                        </td>

                    </tr>

                `;


                updateResultInfo(
                    0,
                    0
                );


                return;
            }


            // =================================================
            // RENDER ROW
            // =================================================

            tableBody.innerHTML =
                list
                    .map(
                        function (
                            item,
                            index
                        ) {

                            const stt =
                                currentPage *
                                pageSize +
                                index +
                                1;


                            // =================================
                            // MÃ ĐƠN
                            // =================================

                            const maDon =
                                item.maHienThi
                                ||
                                item.maDonThuoc
                                ||
                                (
                                    item.maDon
                                    ||
                                    "-"
                                );


                            // =================================
                            // BỆNH NHÂN
                            // =================================

                            const benhNhan =
                                item.benhNhan
                                ||
                                item.tenBenhNhan
                                ||
                                "-";


                            // =================================
                            // BÁC SĨ
                            // =================================

                            const bacSi =
                                item.bacSi
                                ||
                                item.tenBacSi
                                ||
                                "-";


                            // =================================
                            // NGÀY KÊ
                            // =================================

                            const ngayKe =
                                formatDate(
                                    item.ngayKe
                                    ||
                                    item.ngayKeThuoc
                                );


                            // =================================
                            // NGÀY CẤP
                            // =================================

                            const ngayCap =
                                formatDate(
                                    item.ngayCap
                                    ||
                                    item.ngayCapThuoc
                                    ||
                                    item.thoiGianCap
                                );


                            // =================================
                            // NGƯỜI CẤP
                            // =================================

                            const nguoiCap =
                                item.nguoiCap
                                ||
                                item.tenNguoiCap
                                ||
                                item.duocSi
                                ||
                                "-";


                            // =================================
                            // TỔNG TIỀN
                            // =================================

                            const tongTien =
                                formatMoney(
                                    item.tongTien
                                );


                            // =================================
                            // TRẠNG THÁI
                            // =================================

                            const status =
                                normalizeStatus(
                                    item.trangThai
                                    ||
                                    item.status
                                );


                            // =================================
                            // ID
                            // =================================

                            const id =
                                item.maDonThuoc
                                ||
                                item.id
                                ||
                                "";


                            return `

                                <tr>

                                    <!-- STT -->

                                    <td>

                                        ${stt}

                                    </td>


                                    <!-- MÃ ĐƠN -->

                                    <td>

                                        <span
                                            class="order-code">

                                            ${escapeHtml(
                                                maDon
                                            )}

                                        </span>

                                    </td>


                                    <!-- BỆNH NHÂN -->

                                    <td>

                                        <span
                                            class="patient-name">

                                            ${escapeHtml(
                                                benhNhan
                                            )}

                                        </span>

                                    </td>


                                    <!-- BÁC SĨ -->

                                    <td>

                                        <span
                                            class="doctor-name">

                                            ${escapeHtml(
                                                bacSi
                                            )}

                                        </span>

                                    </td>


                                    <!-- NGÀY KÊ -->

                                    <td>

                                        <span
                                            class="date-text">

                                            ${escapeHtml(
                                                ngayKe
                                            )}

                                        </span>

                                    </td>


                                    <!-- NGÀY CẤP -->

                                    <td>

                                        <span
                                            class="date-text">

                                            ${escapeHtml(
                                                ngayCap
                                            )}

                                        </span>

                                    </td>


                                    <!-- NGƯỜI CẤP -->

                                    <td>

                                        <span
                                            class="dispenser-name">

                                            ${escapeHtml(
                                                nguoiCap
                                            )}

                                        </span>

                                    </td>


                                    <!-- TỔNG TIỀN -->

                                    <td>

                                        <span
                                            class="total-money">

                                            ${escapeHtml(
                                                tongTien
                                            )}

                                        </span>

                                    </td>


                                    <!-- TRẠNG THÁI -->

                                    <td>

                                        <span
                                            class="
                                                history-status
                                                ${status.className}
                                            ">

                                            ${escapeHtml(
                                                status.text
                                            )}

                                        </span>

                                    </td>


                                    <!-- THAO TÁC -->

                                    <td>

                                        <button
                                            type="button"
                                            class="detail-button"
                                            onclick="viewHistoryDetail(${id})">

                                            Xem chi tiết

                                        </button>

                                    </td>

                                </tr>

                            `;
                        }
                    )
                    .join("");


            // =================================================
            // RESULT INFO
            // =================================================

            const start =
                currentPage *
                pageSize +
                1;


            const end =
                currentPage *
                pageSize +
                list.length;


            updateResultInfo(
                start,
                end
            );
        }


        // =====================================================
        // PAGINATION
        // =====================================================

        function renderPagination() {

            if (!pageNumbers) {
                return;
            }


            pageNumbers.innerHTML =
                "";


            // =================================================
            // KHÔNG CÓ TRANG
            // =================================================

            if (
                totalPages <= 0
            ) {

                if (previousPage) {

                    previousPage.disabled =
                        true;
                }


                if (nextPage) {

                    nextPage.disabled =
                        true;
                }


                return;
            }


            // =================================================
            // PREVIOUS
            // =================================================

            if (previousPage) {

                previousPage.disabled =
                    currentPage <= 0;
            }


            // =================================================
            // NEXT
            // =================================================

            if (nextPage) {

                nextPage.disabled =
                    currentPage >=
                    totalPages - 1;
            }


            // =================================================
            // XÁC ĐỊNH KHOẢNG TRANG
            // =================================================

            let startPage =
                Math.max(
                    0,
                    currentPage - 2
                );


            let endPage =
                Math.min(
                    totalPages - 1,
                    startPage + 4
                );


            if (
                endPage - startPage < 4
            ) {

                startPage =
                    Math.max(
                        0,
                        endPage - 4
                    );
            }


            // =================================================
            // TẠO NÚT TRANG
            // =================================================

            for (
                let i = startPage;
                i <= endPage;
                i++
            ) {

                const button =
                    document.createElement(
                        "button"
                    );


                button.type =
                    "button";


                button.className =
                    "page-number";


                if (
                    i === currentPage
                ) {

                    button.classList.add(
                        "active"
                    );
                }


                button.textContent =
                    i + 1;


                button.addEventListener(
                    "click",
                    function () {

                        if (
                            i === currentPage
                        ) {
                            return;
                        }


                        currentPage =
                            i;


                        loadHistory();
                    }
                );


                pageNumbers.appendChild(
                    button
                );
            }
        }


        // =====================================================
        // RESULT INFO
        // =====================================================

        function updateResultInfo(
            start,
            end
        ) {

            if (!resultInfo) {
                return;
            }


            resultInfo.textContent =
                `Hiển thị ${start} - ${end} trong ${totalElements} kết quả`;
        }


        // =====================================================
        // SEARCH
        // =====================================================

        if (searchButton) {

            searchButton.addEventListener(
                "click",
                function () {

                    // Mỗi lần tìm kiếm
                    // quay về trang đầu tiên
                    currentPage = 0;


                    loadHistory();
                }
            );
        }


        // =====================================================
        // ENTER SEARCH
        // =====================================================

        if (keywordInput) {

            keywordInput.addEventListener(
                "keydown",
                function (event) {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        event.preventDefault();


                        currentPage =
                            0;


                        loadHistory();
                    }
                }
            );
        }


        // =====================================================
        // RESET FILTER
        // =====================================================

        if (resetButton) {

            resetButton.addEventListener(
                "click",
                function () {

                    if (keywordInput) {

                        keywordInput.value =
                            "";
                    }


                    if (fromDateInput) {

                        fromDateInput.value =
                            "";
                    }


                    if (toDateInput) {

                        toDateInput.value =
                            "";
                    }


                    if (statusSelect) {

                        statusSelect.value =
                            "";
                    }


                    currentPage =
                        0;


                    loadHistory();
                }
            );
        }


        // =====================================================
        // PREVIOUS PAGE
        // =====================================================

        if (previousPage) {

            previousPage.addEventListener(
                "click",
                function () {

                    if (
                        currentPage > 0
                    ) {

                        currentPage--;


                        loadHistory();
                    }
                }
            );
        }


        // =====================================================
        // NEXT PAGE
        // =====================================================

        if (nextPage) {

            nextPage.addEventListener(
                "click",
                function () {

                    if (
                        currentPage <
                        totalPages - 1
                    ) {

                        currentPage++;


                        loadHistory();
                    }
                }
            );
        }


        // =====================================================
        // VIEW DETAIL
        // =====================================================

        window.viewHistoryDetail =
            function (id) {

                if (!id) {

                    console.error(
                        "Không có mã đơn thuốc."
                    );

                    return;
                }


                window.location.href =
                    "/DuocSi/lich-su-cap-thuoc/" +
                    encodeURIComponent(id);
            };


        // =====================================================
        // INIT
        // =====================================================

        loadHistory();

    }
);