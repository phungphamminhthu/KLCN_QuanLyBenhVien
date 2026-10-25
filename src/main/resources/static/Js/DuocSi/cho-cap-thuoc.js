document.addEventListener("DOMContentLoaded", function () {

    // =====================================================
    // API
    // =====================================================

    const API_URL = "/api/duocsi/cho-cap-thuoc";


    // =====================================================
    // STATE
    // =====================================================

    let currentPage = 0;

    const pageSize = 6;

    let totalPages = 0;

    let totalElements = 0;


    // =====================================================
    // ELEMENTS
    // =====================================================

    const table =
        document.getElementById("prescriptionTable");

    const orderKeyword =
        document.getElementById("orderKeyword");

    const patientKeyword =
        document.getElementById("patientKeyword");

    const prescriptionDate =
        document.getElementById("prescriptionDate");

    const doctorFilter =
        document.getElementById("doctorFilter");

    const searchButton =
        document.getElementById("searchButton");

    const resetButton =
        document.getElementById("resetButton");

    const previousPage =
        document.getElementById("previousPage");

    const nextPage =
        document.getElementById("nextPage");

    const pageNumbers =
        document.getElementById("pageNumbers");

    const resultInfo =
        document.getElementById("resultInfo");


    // =====================================================
    // TOKEN
    // =====================================================

    function getToken() {

        return (
            sessionStorage.getItem("Token") ||
            localStorage.getItem("Token") ||
            ""
        );
    }


    // =====================================================
    // LOAD DATA
    // =====================================================

    async function loadPrescriptions() {

        showLoading();

        const token = getToken();

        if (!token) {

            showError("Vui lòng đăng nhập lại.");

            return;
        }


        try {

            const params = new URLSearchParams();


            // =================================================
            // PHÂN TRANG
            // =================================================

            params.append("page", currentPage);

            params.append("size", pageSize);


            // =================================================
            // TÌM THEO MÃ ĐƠN
            // =================================================

            const orderValue =
                orderKeyword.value.trim();

            if (orderValue !== "") {

                params.append(
                    "keyword",
                    orderValue
                );
            }


            // =================================================
            // TÌM THEO BỆNH NHÂN
            // =================================================

            const patientValue =
                patientKeyword.value.trim();

            if (patientValue !== "") {

                params.append(
                    "patient",
                    patientValue
                );
            }


            // =================================================
            // LỌC NGÀY KÊ
            // =================================================

            const dateValue =
                prescriptionDate.value;

            if (dateValue !== "") {

                params.append(
                    "date",
                    dateValue
                );
            }


            // =================================================
            // LỌC BÁC SĨ
            // =================================================

            const doctorValue =
                doctorFilter.value;

            if (doctorValue !== "") {

                params.append(
                    "doctorId",
                    doctorValue
                );
            }


            // =================================================
            // DEBUG
            // =================================================

            console.log(
                "URL tìm kiếm:",
                API_URL + "?" + params.toString()
            );


            // =================================================
            // CALL API
            // =================================================

            const response =
                await fetch(
                    API_URL +
                    "?" +
                    params.toString(),
                    {
                        method: "GET",

                        headers: {

                            "Authorization":
                                "Bearer " + token,

                            "Content-Type":
                                "application/json"
                        }
                    }
                );


            // =================================================
            // UNAUTHORIZED
            // =================================================

            if (
                response.status === 401 ||
                response.status === 403
            ) {

                showError(
                    "Phiên đăng nhập đã hết hạn hoặc bạn không có quyền truy cập."
                );

                return;
            }


            // =================================================
            // HTTP ERROR
            // =================================================

            if (!response.ok) {

                const errorText =
                    await response.text();

                console.error(
                    "API ERROR:",
                    errorText
                );

                throw new Error(
                    "HTTP " + response.status
                );
            }


            // =================================================
            // JSON
            // =================================================

            const data =
                await response.json();


            console.log(
                "Đơn thuốc chờ cấp:",
                data
            );


            // =================================================
            // RENDER
            // =================================================

            renderData(data);

        }
        catch (error) {

            console.error(
                "Lỗi tải đơn thuốc:",
                error
            );

            showError(
                "Không thể tải dữ liệu đơn thuốc."
            );
        }
    }


    // =====================================================
    // RENDER DATA
    // =====================================================

    function renderData(data) {

        let list = [];

        /*
         * Spring Page:
         *
         * {
         *   content: [],
         *   totalPages: 2,
         *   totalElements: 10,
         *   number: 0
         * }
         */

        if (Array.isArray(data.content)) {

            list = data.content;

            totalPages =
                data.totalPages || 0;

            totalElements =
                data.totalElements || 0;

            currentPage =
                data.number ?? currentPage;
        }

        /*
         * Trường hợp backend trả trực tiếp Array
         */

        else if (Array.isArray(data)) {

            list = data;

            totalElements =
                data.length;

            totalPages =
                Math.ceil(
                    totalElements / pageSize
                );
        }


        renderTable(list);

        renderPagination();
    }


    // =====================================================
    // RENDER TABLE
    // =====================================================

    function renderTable(list) {

        if (!table) {
            return;
        }


        // =================================================
        // KHÔNG CÓ DỮ LIỆU
        // =================================================

        if (!list || list.length === 0) {

            table.innerHTML = `

                <tr>

                    <td
                        colspan="8"
                        class="table-message">

                        Không tìm thấy đơn thuốc phù hợp

                    </td>

                </tr>

            `;

            updateResultInfo(0, 0);

            return;
        }


        // =================================================
        // CÓ DỮ LIỆU
        // =================================================

        table.innerHTML =
            list
                .map(function (item) {

                    // -------------------------------------
                    // TRẠNG THÁI
                    // -------------------------------------

                    const status =
                        normalizeStatus(
                            item.trangThai
                        );


                    // -------------------------------------
                    // MÃ ĐƠN
                    // -------------------------------------

                    const maDon =
                        item.maHienThi ||
                        (
                            "DP" +
                            String(
                                item.maDonThuoc || ""
                            ).padStart(
                                5,
                                "0"
                            )
                        );


                    // -------------------------------------
                    // MÃ BỆNH NHÂN
                    // -------------------------------------

                    const patientCode =
                        item.maBenhNhanHienThi ||
                        (
                            "BN" +
                            String(
                                item.maBenhNhan || ""
                            ).padStart(
                                5,
                                "0"
                            )
                        );


                    // -------------------------------------
                    // SỐ LOẠI THUỐC
                    // -------------------------------------

                    const medicineCount =
                        Number(
                            item.soLoaiThuoc || 0
                        );


                    // -------------------------------------
                    // HTML
                    // -------------------------------------

                    return `

                        <tr>

                            <!-- MÃ ĐƠN -->

                            <td>

                                <span
                                    class="order-code">

                                    ${escapeHtml(maDon)}

                                </span>

                            </td>


                            <!-- BỆNH NHÂN -->

                            <td>

                                <span
                                    class="patient-name">

                                    ${escapeHtml(
                                        item.benhNhan || "-"
                                    )}

                                </span>

                            </td>


                            <!-- MÃ BỆNH NHÂN -->

                            <td>

                                <span
                                    class="patient-code">

                                    ${escapeHtml(
                                        patientCode
                                    )}

                                </span>

                            </td>


                            <!-- BÁC SĨ -->

                            <td>

                                <span
                                    class="doctor-name">

                                    ${escapeHtml(
                                        item.bacSi || "-"
                                    )}

                                </span>

                            </td>


                            <!-- NGÀY KÊ -->

                            <td>

                                <span
                                    class="prescription-date">

                                    ${escapeHtml(
                                        item.ngayKe || "-"
                                    )}

                                </span>

                            </td>


                            <!-- SỐ LOẠI THUỐC -->

                            <td>

                                <span
                                    class="medicine-count">

                                    ${medicineCount}

                                </span>

                            </td>


                            <!-- TRẠNG THÁI -->

                            <td>

                                <span
                                    class="
                                        prescription-status
                                        ${status.className}
                                    ">

                                    ${escapeHtml(
                                        status.text
                                    )}

                                </span>

                            </td>


                            <!-- THAO TÁC -->

                            <td>

                                <div
                                    class="action-buttons">


                                    <!-- XEM -->

                                    <button
                                        type="button"
                                        class="view-button"
                                        onclick="viewPrescription(${item.maDonThuoc})">

                                        <svg
                                            width="15"
                                            height="15"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            stroke-width="2"
                                            stroke-linecap="round"
                                            stroke-linejoin="round">

                                            <path
                                                d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z">
                                            </path>

                                            <circle
                                                cx="12"
                                                cy="12"
                                                r="2.5">
                                            </circle>

                                        </svg>

                                        Xem

                                    </button>



                                    <!-- CẤP THUỐC / TIẾP TỤC -->

                                    <button
                                        type="button"
                                        class="dispense-button"
                                        onclick="dispensePrescription(${item.maDonThuoc})">

                                        ${item.trangThai === "DangLayThuoc"
                                            ? "Tiếp tục"
                                            : "Cấp thuốc"}

                                    </button>



                                </div>

                            </td>

                        </tr>

                    `;

                })
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
    // STATUS
    // =====================================================


    function normalizeStatus(status) {
        switch (status) {
            case "ChoLayThuoc":
                return {
                    text: "Chờ cấp thuốc",
                    className: "waiting"
                };

            case "DangLayThuoc":
                return {
                    text: "Đang lấy thuốc",
                    className: "processing"
                };

            case "HoanTat":
                return {
                    text: "Hoàn tất",
                    className: "completed"
                };

            case "DaHuy":
                return {
                    text: "Đã hủy",
                    className: "cancelled"
                };

            default:
                return {
                    text: status || "Không xác định",
                    className: "processing"
                };
        }
    }



    // =====================================================
    // XEM CHI TIẾT
    // =====================================================

    window.viewPrescription =
        function (id) {

            if (!id) {
                return;
            }

            window.location.href =
                "/DuocSi/cho-cap-thuoc/" +
                id;
        };


    // =====================================================
    // CẤP THUỐC
    // =====================================================

    window.dispensePrescription = async function (id) {
        if (!id) {
            alert("Không tìm thấy mã đơn thuốc.");
            return;
        }

        // Đơn đã bắt đầu lấy thuốc thì mở tiếp,
        // không gọi API bắt đầu lần nữa.
        const row = Array.from(table.querySelectorAll("tr"))
            .find(tr => tr.querySelector(".dispense-button")
                ?.getAttribute("onclick")
                ?.includes(`(${id})`));

        const statusText = row
            ?.querySelector(".prescription-status")
            ?.textContent.trim();

        if (statusText === "Đang lấy thuốc") {
            window.location.href = `/DuocSi/cho-cap-thuoc/${id}`;
            return;
        }

        const token =
            sessionStorage.getItem("Token") ||
            localStorage.getItem("Token") ||
            "";

        if (!token) {
            alert("Vui lòng đăng nhập lại.");
            return;
        }

        try {
            const response = await fetch(
                `/api/duocsi/cho-cap-thuoc/${id}/bat-dau`,
                {
                    method: "POST",
                    headers: {
                        "Authorization": "Bearer " + token,
                        "Content-Type": "application/json"
                    }
                }
            );

            if (!response.ok) {
                const message = await response.text();
                throw new Error(message || "Không thể bắt đầu lấy thuốc.");
            }

            window.location.href = `/DuocSi/cho-cap-thuoc/${id}`;
        } catch (error) {
            console.error("Lỗi bắt đầu lấy thuốc:", error);
            alert(error.message || "Có lỗi xảy ra khi bắt đầu lấy thuốc.");
        }
    };




    // =====================================================
    // PAGINATION
    // =====================================================

    function renderPagination() {

        if (!pageNumbers) {
            return;
        }

        pageNumbers.innerHTML = "";


        previousPage.disabled =
            currentPage <= 0;


        nextPage.disabled =
            currentPage >=
            totalPages - 1;


        if (totalPages <= 0) {
            return;
        }


        let start =
            Math.max(
                0,
                currentPage - 2
            );


        let end =
            Math.min(
                totalPages - 1,
                start + 4
            );


        if (
            end - start < 4
        ) {

            start =
                Math.max(
                    0,
                    end - 4
                );
        }


        for (
            let i = start;
            i <= end;
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


            button.textContent =
                i + 1;


            if (
                i === currentPage
            ) {

                button.classList.add(
                    "active"
                );
            }


            button.addEventListener(
                "click",
                function () {

                    currentPage = i;

                    loadPrescriptions();
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

        resultInfo.textContent =
            `Hiển thị ${start} - ${end} trong ${totalElements} kết quả`;
    }


    // =====================================================
    // LOADING
    // =====================================================

    function showLoading() {

        table.innerHTML = `

            <tr>

                <td
                    colspan="8"
                    class="table-message">

                    Đang tải dữ liệu...

                </td>

            </tr>

        `;
    }


    // =====================================================
    // ERROR
    // =====================================================

    function showError(message) {

        table.innerHTML = `

            <tr>

                <td
                    colspan="8"
                    class="table-message">

                    ${escapeHtml(message)}

                </td>

            </tr>

        `;
    }


    // =====================================================
    // SEARCH
    // =====================================================

    searchButton.addEventListener(
        "click",
        function () {

            currentPage = 0;

            loadPrescriptions();
        }
    );


    // =====================================================
    // ENTER SEARCH
    // =====================================================

    [
        orderKeyword,
        patientKeyword
    ].forEach(
        function (input) {

            input.addEventListener(
                "keydown",
                function (event) {

                    if (
                        event.key === "Enter"
                    ) {

                        event.preventDefault();

                        currentPage = 0;

                        loadPrescriptions();
                    }
                }
            );
        }
    );


    // =====================================================
    // RESET
    // =====================================================

    resetButton.addEventListener(
        "click",
        function () {

            orderKeyword.value = "";

            patientKeyword.value = "";

            prescriptionDate.value = "";

            doctorFilter.value = "";

            currentPage = 0;

            loadPrescriptions();
        }
    );


    // =====================================================
    // PREVIOUS
    // =====================================================

    previousPage.addEventListener(
        "click",
        function () {

            if (currentPage > 0) {

                currentPage--;

                loadPrescriptions();
            }
        }
    );


    // =====================================================
    // NEXT
    // =====================================================

    nextPage.addEventListener(
        "click",
        function () {

            if (
                currentPage <
                totalPages - 1
            ) {

                currentPage++;

                loadPrescriptions();
            }
        }
    );


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
    // INIT
    // =====================================================

    loadPrescriptions();

});