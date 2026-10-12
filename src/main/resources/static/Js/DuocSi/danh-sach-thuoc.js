document.addEventListener("DOMContentLoaded", function () {

    /* =====================================================
       API
    ===================================================== */

    const API_URL = "/api/medicines";
    const KHO_THUOC_API_URL = "/api/kho-thuoc";


    /* =====================================================
       DOM - TABLE + FILTER
    ===================================================== */

    const tableBody =
        document.getElementById("medicineTableBody");

    const keywordInput =
        document.getElementById("keyword");

    const nhaSanXuatInput =
        document.getElementById("nhaSanXuat");

    const donViTinhSelect =
        document.getElementById("donViTinh");

    const trangThaiSelect =
        document.getElementById("trangThai");

    const searchButton =
        document.getElementById("searchButton");

    const resetButton =
        document.getElementById("resetButton");

    const resultCount =
        document.getElementById("resultCount");

    const pageNumbers =
        document.getElementById("pageNumbers");


    /* =====================================================
       MODAL - ADD / EDIT
    ===================================================== */

    const medicineFormModal =
        document.getElementById("medicineFormModal");

    const medicineForm =
        document.getElementById("medicineForm");

    const medicineFormTitle =
        document.getElementById("medicineFormTitle");

    const addMedicineButton =
        document.getElementById("addMedicineButton");

    const closeMedicineForm =
        document.getElementById("closeMedicineForm");

    const cancelMedicineForm =
        document.getElementById("cancelMedicineForm");

    const saveMedicineButton =
        document.getElementById("saveMedicineButton");


    /* =====================================================
       MODAL - NHẬP KHO
    ===================================================== */

    const stockModal =
        document.getElementById("stockModal");

    const stockForm =
        document.getElementById("stockForm");

    const closeStockModal =
        document.getElementById("closeStockModal");

    const cancelStockModal =
        document.getElementById("cancelStockModal");

    const saveStockButton =
        document.getElementById("saveStockButton");


    /* =====================================================
       MODAL - VIEW
    ===================================================== */

    const medicineViewModal =
        document.getElementById("medicineViewModal");

    const closeMedicineView =
        document.getElementById("closeMedicineView");

    const closeViewButton =
        document.getElementById("closeViewButton");


    /* =====================================================
       MODAL - DELETE
    ===================================================== */

    const deleteModal =
        document.getElementById("deleteModal");

    const deleteMedicineName =
        document.getElementById("deleteMedicineName");

    const cancelDelete =
        document.getElementById("cancelDelete");

    const confirmDelete =
        document.getElementById("confirmDelete");


    /* =====================================================
       TOAST
    ===================================================== */

    const thuocToast =
        document.getElementById("thuocToast");

    const thuocToastIcon =
        document.getElementById("thuocToastIcon");

    const thuocToastTitle =
        document.getElementById("thuocToastTitle");

    const thuocToastMessage =
        document.getElementById("thuocToastMessage");


    /* =====================================================
       STATE
    ===================================================== */

    let danhSachThuoc = [];

    let danhSachLoc = [];

    let currentPage = 1;

    const pageSize = 5;

    let totalPages = 0;

    let selectedDeleteId = null;

    let editingMedicineId = null;

    let toastTimer = null;


    /* =====================================================
       TOKEN
       HỖ TRỢ NHIỀU KEY
    ===================================================== */

    function getToken() {

        const possibleKeys = [
            "Token",
            "token",
            "JwtToken",
            "jwtToken",
            "accessToken",
            "access_token"
        ];

        for (const key of possibleKeys) {

            const sessionToken =
                sessionStorage.getItem(key);

            if (
                sessionToken &&
                sessionToken.trim()
            ) {

                return sessionToken
                    .trim()
                    .replace(/^Bearer\s+/i, "");
            }


            const localToken =
                localStorage.getItem(key);

            if (
                localToken &&
                localToken.trim()
            ) {

                return localToken
                    .trim()
                    .replace(/^Bearer\s+/i, "");
            }
        }

        return "";
    }


    /* =====================================================
       HEADERS
    ===================================================== */

    function getHeaders(includeJson = false) {

        const headers = {
            "Accept": "application/json"
        };

        const token = getToken();

        if (token) {

            headers["Authorization"] =
                "Bearer " + token;
        }

        if (includeJson) {

            headers["Content-Type"] =
                "application/json";
        }

        return headers;
    }


    /* =====================================================
       API FETCH
    ===================================================== */

    async function apiFetch(url, options = {}) {

        const hasBody =
            options.body !== undefined;

        const token =
            getToken();


        console.log(
            "[API]",
            options.method || "GET",
            url,
            "JWT:",
            token
                ? "CÓ TOKEN"
                : "KHÔNG CÓ TOKEN"
        );


        const headers = {

            ...getHeaders(hasBody),

            ...(options.headers || {})
        };


        return fetch(url, {

            ...options,

            credentials: "same-origin",

            headers
        });
    }


    /* =====================================================
       ESCAPE HTML
    ===================================================== */

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


    /* =====================================================
       FORMAT MONEY
    ===================================================== */

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

        return new Intl.NumberFormat("vi-VN")
            .format(number);
    }


    /* =====================================================
       FORMAT DATE
    ===================================================== */

    function formatDate(value) {

        if (!value) {

            return "-";
        }

        if (
            typeof value === "string" &&
            /^\d{2}\/\d{2}\/\d{4}$/.test(value)
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

        return (

            String(
                date.getDate()
            ).padStart(2, "0")

            +

            "/"

            +

            String(
                date.getMonth() + 1
            ).padStart(2, "0")

            +

            "/"

            +

            date.getFullYear()
        );
    }


    /* =====================================================
       EXPIRY CLASS
    ===================================================== */

    function getExpiryClass(value) {

        if (!value) {

            return "";
        }

        const date =
            new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "";
        }

        const today =
            new Date();

        today.setHours(
            0,
            0,
            0,
            0
        );

        const difference =
            date.getTime() -
            today.getTime();

        const days =
            Math.ceil(
                difference /
                (1000 * 60 * 60 * 24)
            );


        if (days < 0) {

            return "danger";
        }

        if (days <= 90) {

            return "warning";
        }

        return "";
    }


    /* =====================================================
       MEDICINE STATUS
    ===================================================== */

    function getMedicineStatus(item) {

        if (
            item.trangThai === false ||
            item.trangThai === 0
        ) {

            return {

                text: "Ngừng sử dụng",

                className: "inactive"
            };
        }


        const stock =
            Number(
                item.soLuongTon || 0
            );

        const minimum =
            Number(
                item.soLuongToiThieu || 0
            );


        const expiry =
            item.hanSuDung
                ? new Date(item.hanSuDung)
                : null;


        if (
            expiry &&
            !Number.isNaN(
                expiry.getTime()
            )
        ) {

            const today =
                new Date();

            today.setHours(
                0,
                0,
                0,
                0
            );

            const days =
                Math.ceil(
                    (
                        expiry.getTime() -
                        today.getTime()
                    ) /
                    (1000 * 60 * 60 * 24)
                );


            if (days < 0) {

                return {

                    text: "Hết hạn",

                    className: "danger"
                };
            }


            if (days <= 90) {

                return {

                    text: "Sắp hết hạn",

                    className: "warning"
                };
            }
        }


        if (stock <= 0) {

            return {

                text: "Hết hàng",

                className: "danger"
            };
        }


        if (
            minimum > 0 &&
            stock <= minimum
        ) {

            return {

                text: "Sắp hết",

                className: "warning"
            };
        }


        return {

            text: "Còn hàng",

            className: "active"
        };
    }


    /* =====================================================
       LOADING
    ===================================================== */

    function showLoading() {

        if (!tableBody) {

            return;
        }

        tableBody.innerHTML = `

            <tr>

                <td
                    colspan="12"
                    class="table-loading"
                >

                    Đang tải dữ liệu...

                </td>

            </tr>

        `;
    }


    /* =====================================================
       EMPTY
    ===================================================== */

    function showEmpty() {

        if (!tableBody) {

            return;
        }

        tableBody.innerHTML = `

            <tr>

                <td
                    colspan="12"
                    class="table-empty"
                >

                    Không tìm thấy thuốc phù hợp.

                </td>

            </tr>

        `;


        if (resultCount) {

            resultCount.textContent =
                "Hiển thị 0 trong tổng số 0 kết quả";
        }

        totalPages = 0;

        renderPagination();
    }


    /* =====================================================
       ERROR
    ===================================================== */

    function showError(message) {

        if (!tableBody) {

            return;
        }

        tableBody.innerHTML = `

            <tr>

                <td
                    colspan="12"
                    class="table-error"
                >

                    ${escapeHtml(message)}

                </td>

            </tr>

        `;


        if (resultCount) {

            resultCount.textContent =
                "Không thể tải dữ liệu";
        }

        totalPages = 0;

        renderPagination();
    }


    /* =====================================================
       LOAD MEDICINES
    ===================================================== */

    async function loadDanhSachThuoc() {

        showLoading();


        const token =
            getToken();


        console.log(
            "JWT danh sách thuốc:",
            token
                ? "CÓ TOKEN"
                : "KHÔNG CÓ TOKEN"
        );


        if (!token) {

            showError(
                "Không tìm thấy JWT. Vui lòng đăng nhập lại."
            );

            return;
        }


        try {

            const response =
                await apiFetch(
                    API_URL,
                    {
                        method: "GET"
                    }
                );


            if (
                response.status === 401
            ) {

                showError(
                    "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
                );

                return;
            }


            if (
                response.status === 403
            ) {

                showError(
                    "Bạn không có quyền xem danh sách thuốc."
                );

                return;
            }


            if (!response.ok) {

                const text =
                    await response.text();

                throw new Error(
                    text ||
                    "Không thể tải danh sách thuốc."
                );
            }


            const data =
                await response.json();


            if (
                Array.isArray(data)
            ) {

                danhSachThuoc =
                    data;

            } else if (
                Array.isArray(
                    data.data
                )
            ) {

                danhSachThuoc =
                    data.data;

            } else if (
                Array.isArray(
                    data.content
                )
            ) {

                danhSachThuoc =
                    data.content;

            } else {

                danhSachThuoc = [];
            }


            danhSachLoc = [
                ...danhSachThuoc
            ];

            currentPage = 1;

            renderTable();


        } catch (error) {

            console.error(
                "Lỗi tải danh sách thuốc:",
                error
            );

            showError(
                error.message ||
                "Không thể tải danh sách thuốc."
            );
        }
    }


    /* =====================================================
       FILTER
       CHỈ CHẠY KHI BẤM TÌM KIẾM
    ===================================================== */

    function applyFilters(
        resetPage = true
    ) {

        if (resetPage) {

            currentPage = 1;
        }


        const keyword =
            keywordInput
                ? keywordInput.value
                    .trim()
                    .toLowerCase()
                : "";


        const nhaSanXuat =
            nhaSanXuatInput
                ? nhaSanXuatInput.value
                    .trim()
                    .toLowerCase()
                : "";


        const donVi =
            donViTinhSelect
                ? donViTinhSelect.value
                : "";


        const trangThai =
            trangThaiSelect
                ? trangThaiSelect.value
                : "";


        danhSachLoc =
            danhSachThuoc.filter(
                function (item) {

                    const tenThuoc =
                        String(
                            item.tenThuoc || ""
                        ).toLowerCase();


                    const nhaSanXuatItem =
                        String(
                            item.nhaSanXuat || ""
                        ).toLowerCase();


                    const donViItem =
                        String(
                            item.donViTinh || ""
                        );


                    const status =
                        getMedicineStatus(item);


                    const matchKeyword =
                        !keyword ||
                        tenThuoc.includes(
                            keyword
                        );


                    const matchNhaSanXuat =
                        !nhaSanXuat ||
                        nhaSanXuatItem.includes(
                            nhaSanXuat
                        );


                    const matchDonVi =
                        !donVi ||
                        donViItem === donVi;


                    let matchStatus =
                        true;


                    if (trangThai) {

                        switch (
                            trangThai
                        ) {

                            case "CON_HANG":

                                matchStatus =
                                    status.text ===
                                    "Còn hàng";

                                break;


                            case "SAP_HET":

                                matchStatus =
                                    status.text ===
                                    "Sắp hết";

                                break;


                            case "SAP_HET_HAN":

                                matchStatus =
                                    status.text ===
                                    "Sắp hết hạn";

                                break;


                            case "HET_HANG":

                                matchStatus =
                                    status.text ===
                                    "Hết hàng" ||

                                    status.text ===
                                    "Hết hạn";

                                break;


                            case "NGUNG":

                                matchStatus =
                                    status.className ===
                                    "inactive";

                                break;
                        }
                    }


                    return (

                        matchKeyword &&

                        matchNhaSanXuat &&

                        matchDonVi &&

                        matchStatus
                    );
                }
            );


        renderTable();
    }


    /* =====================================================
       RENDER TABLE
    ===================================================== */

    function renderTable() {

        if (!tableBody) {

            return;
        }


        tableBody.innerHTML = "";


        const total =
            danhSachLoc.length;


        if (total === 0) {

            showEmpty();

            return;
        }


        totalPages =
            Math.ceil(
                total / pageSize
            );


        if (
            currentPage >
            totalPages
        ) {

            currentPage =
                totalPages;
        }


        const startIndex =
            (currentPage - 1) *
            pageSize;


        const endIndex =
            Math.min(
                startIndex + pageSize,
                total
            );


        const pageData =
            danhSachLoc.slice(
                startIndex,
                endIndex
            );


        pageData.forEach(
            function (item, index) {

                const stt =
                    startIndex +
                    index +
                    1;


                const status =
                    getMedicineStatus(item);


                const expiryClass =
                    getExpiryClass(
                        item.hanSuDung
                    );


                const stock =
                    Number(
                        item.soLuongTon || 0
                    );


                const minimum =
                    Number(
                        item.soLuongToiThieu || 0
                    );


                const row =
                    document.createElement(
                        "tr"
                    );


                row.innerHTML = `

                    <td class="col-stt">
                        ${stt}
                    </td>


                    <td class="col-code">

                        <span class="medicine-code">

                            ${escapeHtml(
                                "TH" +
                                String(
                                    item.maThuoc || ""
                                ).padStart(
                                    3,
                                    "0"
                                )
                            )}

                        </span>

                    </td>


                    <td class="col-name">

                        <span class="medicine-name">

                            ${escapeHtml(
                                item.tenThuoc || "-"
                            )}

                        </span>

                    </td>


                    <td class="col-manufacturer">

                        <span class="medicine-manufacturer">

                            ${escapeHtml(
                                item.nhaSanXuat || "-"
                            )}

                        </span>

                    </td>


                    <td class="col-batch">

                        <span class="medicine-batch">

                            ${escapeHtml(
                                item.soLo || "-"
                            )}

                        </span>

                    </td>


                    <td class="col-unit">

                        ${escapeHtml(
                            item.donViTinh || "-"
                        )}

                    </td>


                    <td class="col-price">

                        <span class="medicine-price">

                            ${escapeHtml(
                                formatMoney(
                                    item.gia
                                )
                            )}

                        </span>

                    </td>


                    <td class="col-stock">

                        <span
                            class="
                                stock-number
                                ${
                                    stock <= 0
                                        ? "empty"
                                        :
                                        (
                                            minimum > 0 &&
                                            stock <= minimum
                                                ? "low"
                                                : ""
                                        )
                                }
                            "
                        >

                            ${stock}

                        </span>

                    </td>


                    <td class="col-min">

                        <span class="minimum-stock">

                            ${minimum}

                        </span>

                    </td>


                    <td class="col-expiry">

                        <span
                            class="
                                expiry-date
                                ${expiryClass}
                            "
                        >

                            ${escapeHtml(
                                formatDate(
                                    item.hanSuDung
                                )
                            )}

                        </span>

                    </td>


                    <td class="col-status">

                        <span
                            class="
                                medicine-status
                                ${status.className}
                            "
                        >

                            ${escapeHtml(
                                status.text
                            )}

                        </span>

                    </td>


                    <td class="col-action">

                        <div class="action-buttons">

                            <button
                                type="button"
                                class="action-button view"
                                title="Xem thông tin thuốc"
                                data-action="view"
                                data-id="${item.maThuoc}"
                            >
                                👁
                            </button>


                            <button
                                type="button"
                                class="action-button stock"
                                title="Nhập kho"
                                data-action="stock"
                                data-id="${item.maThuoc}"
                            >
                                📦
                            </button>


                            <button
                                type="button"
                                class="action-button edit"
                                title="Sửa thuốc"
                                data-action="edit"
                                data-id="${item.maThuoc}"
                            >
                                ✎
                            </button>


                            <button
                                type="button"
                                class="action-button delete"
                                title="Xóa thuốc"
                                data-action="delete"
                                data-id="${item.maThuoc}"
                            >
                                🗑
                            </button>

                        </div>

                    </td>

                `;


                tableBody.appendChild(row);
            }
        );


        const from =
            startIndex + 1;


        const to =
            Math.min(
                endIndex,
                total
            );


        if (resultCount) {

            resultCount.textContent =
                `Hiển thị ${from} - ${to} trong ${total} kết quả`;
        }


        renderPagination();
    }


    /* =====================================================
       PAGINATION
    ===================================================== */

    function renderPagination() {

        if (!pageNumbers) {

            return;
        }


        pageNumbers.innerHTML = "";


        if (totalPages <= 1) {

            return;
        }


        const previousButton =
            document.createElement(
                "button"
            );


        previousButton.type =
            "button";

        previousButton.className =
            "pagination-button pagination-arrow";

        previousButton.innerHTML =
            "‹";

        previousButton.title =
            "Trang trước";

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
                }
            }
        );


        pageNumbers.appendChild(
            previousButton
        );


        for (
            let page = 1;
            page <= totalPages;
            page++
        ) {

            const pageButton =
                document.createElement(
                    "button"
                );


            pageButton.type =
                "button";

            pageButton.className =
                "pagination-button";


            if (
                page === currentPage
            ) {

                pageButton.classList.add(
                    "active"
                );
            }


            pageButton.textContent =
                page;


            pageButton.addEventListener(
                "click",
                function () {

                    currentPage =
                        page;

                    renderTable();
                }
            );


            pageNumbers.appendChild(
                pageButton
            );
        }


        const nextButton =
            document.createElement(
                "button"
            );


        nextButton.type =
            "button";

        nextButton.className =
            "pagination-button pagination-arrow";

        nextButton.innerHTML =
            "›";

        nextButton.title =
            "Trang sau";

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
                }
            }
        );


        pageNumbers.appendChild(
            nextButton
        );
    }


    /* =====================================================
       ADD MEDICINE
    ===================================================== */

    function openAddThuoc() {

        editingMedicineId = null;


        if (medicineFormTitle) {

            medicineFormTitle.textContent =
                "Thêm thuốc";
        }


        if (medicineForm) {

            medicineForm.reset();
        }


        const formTrangThai =
            document.getElementById(
                "formTrangThai"
            );


        if (formTrangThai) {

            formTrangThai.value =
                "true";
        }


        if (medicineFormModal) {

            medicineFormModal.style.display =
                "flex";
        }
    }


    /* =====================================================
       EDIT MEDICINE
    ===================================================== */

    function openEditThuoc(id) {

        const item =
            danhSachThuoc.find(
                function (medicine) {

                    return Number(
                        medicine.maThuoc
                    ) === Number(id);
                }
            );


        if (!item) {

            showToast(
                "Lỗi",
                "Không tìm thấy thông tin thuốc.",
                "error"
            );

            return;
        }


        editingMedicineId =
            item.maThuoc;


        if (medicineFormTitle) {

            medicineFormTitle.textContent =
                "Sửa thông tin thuốc";
        }


        const formTenThuoc =
            document.getElementById(
                "formTenThuoc"
            );

        const formDonViTinh =
            document.getElementById(
                "formDonViTinh"
            );

        const formGia =
            document.getElementById(
                "formGia"
            );

        const formNhaSanXuat =
            document.getElementById(
                "formNhaSanXuat"
            );

        const formMoTa =
            document.getElementById(
                "formMoTa"
            );

        const formTrangThai =
            document.getElementById(
                "formTrangThai"
            );


        if (formTenThuoc) {

            formTenThuoc.value =
                item.tenThuoc || "";
        }


        if (formDonViTinh) {

            formDonViTinh.value =
                item.donViTinh || "";
        }


        if (formGia) {

            formGia.value =
                item.gia ?? "";
        }


        if (formNhaSanXuat) {

            formNhaSanXuat.value =
                item.nhaSanXuat || "";
        }


        if (formMoTa) {

            formMoTa.value =
                item.moTa || "";
        }


        if (formTrangThai) {

            formTrangThai.value =
                (
                    item.trangThai === false ||
                    item.trangThai === 0
                )
                    ? "false"
                    : "true";
        }


        if (medicineFormModal) {

            medicineFormModal.style.display =
                "flex";
        }
    }


    /* =====================================================
       CLOSE MEDICINE FORM
    ===================================================== */

    function closeMedicineFormModal() {

        if (medicineFormModal) {

            medicineFormModal.style.display =
                "none";
        }

        editingMedicineId = null;
    }


    /* =====================================================
       SAVE MEDICINE
    ===================================================== */

    async function saveMedicine(event) {

        event.preventDefault();


        const formTenThuoc =
            document.getElementById(
                "formTenThuoc"
            );

        const formDonViTinh =
            document.getElementById(
                "formDonViTinh"
            );

        const formGia =
            document.getElementById(
                "formGia"
            );

        const formNhaSanXuat =
            document.getElementById(
                "formNhaSanXuat"
            );

        const formMoTa =
            document.getElementById(
                "formMoTa"
            );

        const formTrangThai =
            document.getElementById(
                "formTrangThai"
            );


        const tenThuoc =
            formTenThuoc
                ? formTenThuoc.value.trim()
                : "";


        const donViTinh =
            formDonViTinh
                ? formDonViTinh.value.trim()
                : "";


        const gia =
            formGia
                ? formGia.value
                : "";


        const nhaSanXuat =
            formNhaSanXuat
                ? formNhaSanXuat.value.trim()
                : "";


        const moTa =
            formMoTa
                ? formMoTa.value.trim()
                : "";


        const trangThai =
            formTrangThai
                ? formTrangThai.value === "true"
                : true;


        if (!tenThuoc) {

            showToast(
                "Thiếu dữ liệu",
                "Tên thuốc không được để trống.",
                "error"
            );

            return;
        }


        if (
            gia === "" ||
            Number(gia) < 0
        ) {

            showToast(
                "Thiếu dữ liệu",
                "Giá thuốc không hợp lệ.",
                "error"
            );

            return;
        }


        const payload = {

            tenThuoc:
                tenThuoc,

            donViTinh:
                donViTinh || null,

            nhaSanXuat:
                nhaSanXuat || null,

            gia:
                Number(gia),

            moTa:
                moTa || null,

            trangThai:
                trangThai
        };


        const isEdit =
            editingMedicineId !== null;


        const url =
            isEdit
                ? `${API_URL}/${editingMedicineId}`
                : API_URL;


        const method =
            isEdit
                ? "PUT"
                : "POST";


        try {

            if (saveMedicineButton) {

                saveMedicineButton.disabled =
                    true;

                saveMedicineButton.textContent =
                    isEdit
                        ? "Đang lưu..."
                        : "Đang thêm...";
            }


            const response =
                await apiFetch(
                    url,
                    {
                        method: method,
                        body: JSON.stringify(
                            payload
                        )
                    }
                );


            if (
                response.status === 401
            ) {

                showToast(
                    "Lỗi",
                    "Phiên đăng nhập đã hết hạn.",
                    "error"
                );

                return;
            }


            if (
                response.status === 403
            ) {

                showToast(
                    "Không có quyền",
                    "Bạn không có quyền thực hiện thao tác này.",
                    "error"
                );

                return;
            }


            const responseText =
                await response.text();


            if (!response.ok) {

                throw new Error(
                    responseText ||
                    "Không thể lưu thuốc."
                );
            }


            closeMedicineFormModal();


            showToast(
                isEdit
                    ? "Cập nhật thành công"
                    : "Thêm thuốc thành công",

                isEdit
                    ? "Thông tin thuốc đã được cập nhật."
                    : "Thuốc đã được thêm vào danh sách.",

                "success"
            );


            await loadDanhSachThuoc();


        } catch (error) {

            console.error(
                "Lỗi lưu thuốc:",
                error
            );


            showToast(
                "Lỗi",
                error.message ||
                "Không thể lưu thuốc.",
                "error"
            );


        } finally {

            if (saveMedicineButton) {

                saveMedicineButton.disabled =
                    false;

                saveMedicineButton.textContent =
                    "Lưu";
            }
        }
    }


    /* =====================================================
       VIEW MEDICINE
    ===================================================== */

    function viewThuoc(id) {

        console.log("========== XEM THUỐC ==========");
        console.log("MaThuoc:", id);

        const item = danhSachThuoc.find(function (medicine) {
            return Number(medicine.maThuoc) === Number(id);
        });

        if (!item) {
            console.error("Không tìm thấy thuốc:", id);

            showToast(
                "Lỗi",
                "Không tìm thấy thông tin thuốc.",
                "error"
            );

            return;
        }

        console.log("Thông tin thuốc:", item);

        const status = getMedicineStatus(item);


        // ==============================
        // MÃ THUỐC
        // ==============================
        const viewMaThuoc =
            document.getElementById("viewMaThuoc");

        if (viewMaThuoc) {
            viewMaThuoc.value =
                "TH" +
                String(item.maThuoc ?? "").padStart(3, "0");
        }


        // ==============================
        // TÊN THUỐC
        // ==============================
        const viewTenThuoc =
            document.getElementById("viewTenThuoc");

        if (viewTenThuoc) {
            viewTenThuoc.value =
                item.tenThuoc ?? "";
        }


        // ==============================
        // ĐƠN VỊ
        // ==============================
        const viewDonViTinh =
            document.getElementById("viewDonViTinh");

        if (viewDonViTinh) {
            viewDonViTinh.value =
                item.donViTinh ?? "";
        }


        // ==============================
        // GIÁ
        // ==============================
        const viewGia =
            document.getElementById("viewGia");

        if (viewGia) {
            viewGia.value =
                formatMoney(item.gia);
        }


        // ==============================
        // NHÀ SẢN XUẤT
        // ==============================
        const viewNhaSanXuat =
            document.getElementById("viewNhaSanXuat");

        if (viewNhaSanXuat) {
            viewNhaSanXuat.value =
                item.nhaSanXuat ?? "";
        }


        // ==============================
        // SỐ LÔ
        // ==============================
        const viewSoLo =
            document.getElementById("viewSoLo");

        if (viewSoLo) {
            viewSoLo.value =
                item.soLo ?? "Chưa nhập kho";
        }


        // ==============================
        // TỒN KHO
        // ==============================
        const viewSoLuongTon =
            document.getElementById("viewSoLuongTon");

        if (viewSoLuongTon) {
            viewSoLuongTon.value =
                item.soLuongTon !== null &&
                item.soLuongTon !== undefined
                    ? item.soLuongTon
                    : "0";
        }


        // ==============================
        // TỒN TỐI THIỂU
        // ==============================
        const viewSoLuongToiThieu =
            document.getElementById("viewSoLuongToiThieu");

        if (viewSoLuongToiThieu) {
            viewSoLuongToiThieu.value =
                item.soLuongToiThieu !== null &&
                item.soLuongToiThieu !== undefined
                    ? item.soLuongToiThieu
                    : "0";
        }


        // ==============================
        // HẠN SỬ DỤNG
        // ==============================
        const viewHanSuDung =
            document.getElementById("viewHanSuDung");

        if (viewHanSuDung) {
            viewHanSuDung.value =
                formatDate(item.hanSuDung);
        }


        // ==============================
        // MÔ TẢ
        // ==============================
        const viewMoTa =
            document.getElementById("viewMoTa");

        if (viewMoTa) {
            viewMoTa.value =
                item.moTa ?? "";
        }


        // ==============================
        // TRẠNG THÁI
        // ==============================
        const viewTrangThai =
            document.getElementById("viewTrangThai");

        if (viewTrangThai) {
            viewTrangThai.value =
                status?.text ||
                (
                    item.trangThai === false ||
                    item.trangThai === 0
                        ? "Ngừng sử dụng"
                        : "Đang sử dụng"
                );
        }


        // ==============================
        // MỞ MODAL
        // ==============================
        if (medicineViewModal) {
            medicineViewModal.style.display = "flex";
        }

        console.log("========== ĐÃ MỞ MODAL XEM ==========");
    }


    /* =====================================================
       CLOSE VIEW
    ===================================================== */

    function closeMedicineViewModal() {

        if (medicineViewModal) {

            medicineViewModal.style.display =
                "none";
        }
    }


    /* =====================================================
       DELETE MEDICINE
    ===================================================== */

    function openDeleteThuoc(id) {

        const item =
            danhSachThuoc.find(
                function (medicine) {

                    return Number(
                        medicine.maThuoc
                    ) === Number(id);
                }
            );


        if (!item) {

            showToast(
                "Lỗi",
                "Không tìm thấy thông tin thuốc.",
                "error"
            );

            return;
        }


        selectedDeleteId =
            item.maThuoc;


        if (deleteMedicineName) {

            deleteMedicineName.textContent =
                item.tenThuoc || "";
        }


        if (deleteModal) {

            deleteModal.style.display =
                "flex";
        }
    }


    /* =====================================================
       CLOSE DELETE
    ===================================================== */

    function closeDeleteThuoc() {

        if (deleteModal) {

            deleteModal.style.display =
                "none";
        }

        selectedDeleteId = null;
    }


    /* =====================================================
       CONFIRM DELETE
    ===================================================== */

    async function confirmDeleteThuoc() {

        if (!selectedDeleteId) {

            return;
        }


        const id =
            selectedDeleteId;


        try {

            if (confirmDelete) {

                confirmDelete.disabled =
                    true;

                confirmDelete.textContent =
                    "Đang xử lý...";
            }


            const response =
                await apiFetch(
                    `${API_URL}/${id}`,
                    {
                        method: "DELETE"
                    }
                );


            if (
                response.status === 401
            ) {

                showToast(
                    "Lỗi",
                    "Phiên đăng nhập đã hết hạn.",
                    "error"
                );

                return;
            }


            if (
                response.status === 403
            ) {

                showToast(
                    "Không có quyền",
                    "Bạn không có quyền xóa thuốc.",
                    "error"
                );

                return;
            }


            const responseText =
                await response.text();


            if (!response.ok) {

                throw new Error(
                    responseText ||
                    "Không thể xóa thuốc."
                );
            }


            closeDeleteThuoc();


            showToast(
                "Thành công",
                responseText ||
                "Đã xử lý thuốc thành công.",
                "success"
            );


            await loadDanhSachThuoc();


        } catch (error) {

            console.error(
                "Lỗi xóa thuốc:",
                error
            );


            showToast(
                "Lỗi",
                error.message ||
                "Không thể xóa thuốc.",
                "error"
            );


        } finally {

            if (confirmDelete) {

                confirmDelete.disabled =
                    false;

                confirmDelete.textContent =
                    "Xác nhận";
            }
        }
    }


    /* =====================================================
       TOAST
    ===================================================== */

    function showToast(
        title,
        message,
        type = "success"
    ) {

        if (!thuocToast) {

            return;
        }


        if (toastTimer) {

            clearTimeout(
                toastTimer
            );
        }


        if (thuocToastTitle) {

            thuocToastTitle.textContent =
                title;
        }


        if (thuocToastMessage) {

            thuocToastMessage.textContent =
                message;
        }


        if (thuocToastIcon) {

            thuocToastIcon.textContent =
                type === "success"
                    ? "✓"
                    : "!";
        }


        thuocToast.classList.remove(
            "success",
            "error"
        );


        thuocToast.classList.add(
            type
        );


        thuocToast.classList.add(
            "show"
        );


        toastTimer =
            setTimeout(
                function () {

                    thuocToast.classList.remove(
                        "show"
                    );

                },
                3500
            );
    }


    /* =====================================================
       NHẬP KHO - OPEN
    ===================================================== */

    function openKhoThuoc(id) {

        const item =
            danhSachThuoc.find(
                function (medicine) {

                    return Number(
                        medicine.maThuoc
                    ) === Number(id);
                }
            );


        if (!item) {

            showToast(
                "Lỗi",
                "Không tìm thấy thông tin thuốc.",
                "error"
            );

            return;
        }


        if (
            item.trangThai === false ||
            item.trangThai === 0
        ) {

            showToast(
                "Không thể nhập kho",
                "Thuốc này đang ngừng sử dụng.",
                "error"
            );

            return;
        }


        const stockMaThuoc =
            document.getElementById(
                "stockMaThuoc"
            );

        const stockTenThuoc =
            document.getElementById(
                "stockTenThuoc"
            );

        const stockSoLo =
            document.getElementById(
                "stockSoLo"
            );

        const stockSoLuong =
            document.getElementById(
                "stockSoLuong"
            );

        const stockSoLuongToiThieu =
            document.getElementById(
                "stockSoLuongToiThieu"
            );

        const stockHanSuDung =
            document.getElementById(
                "stockHanSuDung"
            );


        if (stockMaThuoc) {

            stockMaThuoc.value =
                item.maThuoc;
        }


        if (stockTenThuoc) {

            stockTenThuoc.value =
                item.tenThuoc || "";
        }


        if (stockSoLo) {

            stockSoLo.value =
                "";
        }


        if (stockSoLuong) {

            stockSoLuong.value =
                "";
        }


        if (stockSoLuongToiThieu) {

            stockSoLuongToiThieu.value =
                item.soLuongToiThieu || 0;
        }


        if (stockHanSuDung) {

            stockHanSuDung.value =
                "";
        }


        if (stockModal) {

            stockModal.style.display =
                "flex";
        }
    }


    /* =====================================================
       NHẬP KHO - CLOSE
    ===================================================== */

    function closeKhoThuoc() {

        if (stockModal) {

            stockModal.style.display =
                "none";
        }


        if (stockForm) {

            stockForm.reset();
        }
    }


    /* =====================================================
       NHẬP KHO - SAVE
    ===================================================== */

    async function saveKhoThuoc(event) {

        event.preventDefault();


        const stockMaThuoc =
            document.getElementById(
                "stockMaThuoc"
            );

        const stockSoLo =
            document.getElementById(
                "stockSoLo"
            );

        const stockSoLuong =
            document.getElementById(
                "stockSoLuong"
            );

        const stockSoLuongToiThieu =
            document.getElementById(
                "stockSoLuongToiThieu"
            );

        const stockHanSuDung =
            document.getElementById(
                "stockHanSuDung"
            );


        const maThuoc =
            stockMaThuoc
                ? Number(
                    stockMaThuoc.value
                )
                : null;


        const soLo =
            stockSoLo
                ? stockSoLo.value.trim()
                : "";


        const soLuong =
            stockSoLuong
                ? Number(
                    stockSoLuong.value
                )
                : 0;


        const soLuongToiThieu =
            stockSoLuongToiThieu
                ? Number(
                    stockSoLuongToiThieu.value
                )
                : 0;


        const hanSuDung =
            stockHanSuDung
                ? stockHanSuDung.value
                : "";


        /* =================================================
           VALIDATE
        ================================================= */

        if (!maThuoc) {

            showToast(
                "Thiếu dữ liệu",
                "Không xác định được thuốc cần nhập kho.",
                "error"
            );

            return;
        }


        if (!soLo) {

            showToast(
                "Thiếu dữ liệu",
                "Vui lòng nhập số lô.",
                "error"
            );

            return;
        }


        if (soLo.length > 100) {

            showToast(
                "Dữ liệu không hợp lệ",
                "Số lô không được vượt quá 100 ký tự.",
                "error"
            );

            return;
        }


        if (soLuong <= 0) {

            showToast(
                "Dữ liệu không hợp lệ",
                "Số lượng nhập phải lớn hơn 0.",
                "error"
            );

            return;
        }


        if (soLuongToiThieu < 0) {

            showToast(
                "Dữ liệu không hợp lệ",
                "Số lượng tối thiểu không được nhỏ hơn 0.",
                "error"
            );

            return;
        }


        if (!hanSuDung) {

            showToast(
                "Thiếu dữ liệu",
                "Vui lòng chọn hạn sử dụng.",
                "error"
            );

            return;
        }


        const today =
            new Date();

        today.setHours(
            0,
            0,
            0,
            0
        );


        const expiryDate =
            new Date(
                hanSuDung +
                "T00:00:00"
            );


        if (
            Number.isNaN(
                expiryDate.getTime()
            )
        ) {

            showToast(
                "Dữ liệu không hợp lệ",
                "Hạn sử dụng không hợp lệ.",
                "error"
            );

            return;
        }


        if (
            expiryDate <= today
        ) {

            showToast(
                "Dữ liệu không hợp lệ",
                "Hạn sử dụng phải lớn hơn ngày hiện tại.",
                "error"
            );

            return;
        }


        /* =================================================
           PAYLOAD
        ================================================= */

        const payload = {

            maThuoc:
                maThuoc,

            soLuongTon:
                soLuong,

            soLo:
                soLo,

            hanSuDung:
                hanSuDung,

            soLuongToiThieu:
                soLuongToiThieu
        };


        console.log(
            "========== NHẬP KHO =========="
        );

        console.log(
            "JWT:",
            getToken()
                ? "CÓ TOKEN"
                : "KHÔNG CÓ TOKEN"
        );

        console.log(
            "Authorization:",
            getToken()
                ? "Bearer " +
                  getToken().substring(0, 20) +
                  "..."
                : "NULL"
        );

        console.log(
            "Payload:",
            payload
        );

        console.log(
            "=============================="
        );


        try {

            if (saveStockButton) {

                saveStockButton.disabled =
                    true;

                saveStockButton.textContent =
                    "Đang nhập kho...";
            }


            const response =
                await apiFetch(
                    KHO_THUOC_API_URL,
                    {
                        method: "POST",

                        body:
                            JSON.stringify(
                                payload
                            )
                    }
                );


            if (
                response.status === 401
            ) {

                showToast(
                    "Lỗi",
                    "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
                    "error"
                );

                return;
            }


            if (
                response.status === 403
            ) {

                showToast(
                    "Không có quyền",
                    "Chỉ Dược sĩ mới có quyền nhập kho thuốc.",
                    "error"
                );

                return;
            }


            const responseText =
                await response.text();


            if (!response.ok) {

                throw new Error(
                    responseText ||
                    "Không thể nhập kho thuốc."
                );
            }


            closeKhoThuoc();


            showToast(
                "Nhập kho thành công",
                "Thuốc đã được nhập vào kho.",
                "success"
            );


            await loadDanhSachThuoc();


        } catch (error) {

            console.error(
                "Lỗi nhập kho thuốc:",
                error
            );


            showToast(
                "Lỗi",
                error.message ||
                "Không thể nhập kho thuốc.",
                "error"
            );


        } finally {

            if (saveStockButton) {

                saveStockButton.disabled =
                    false;

                saveStockButton.textContent =
                    "Nhập kho";
            }
        }
    }


    /* =====================================================
       SEARCH
    ===================================================== */

    if (searchButton) {

        searchButton.addEventListener(
            "click",
            function () {

                currentPage = 1;

                applyFilters(true);
            }
        );
    }


    /* =====================================================
       RESET
    ===================================================== */

    if (resetButton) {

        resetButton.addEventListener(
            "click",
            function () {

                if (keywordInput) {

                    keywordInput.value =
                        "";
                }


                if (nhaSanXuatInput) {

                    nhaSanXuatInput.value =
                        "";
                }


                if (donViTinhSelect) {

                    donViTinhSelect.value =
                        "";
                }


                if (trangThaiSelect) {

                    trangThaiSelect.value =
                        "";
                }


                currentPage = 1;


                danhSachLoc = [
                    ...danhSachThuoc
                ];


                renderTable();
            }
        );
    }


    /* =====================================================
       ADD
    ===================================================== */

    if (addMedicineButton) {

        addMedicineButton.addEventListener(
            "click",
            openAddThuoc
        );
    }


    /* =====================================================
       FORM MEDICINE
    ===================================================== */

    if (medicineForm) {

        medicineForm.addEventListener(
            "submit",
            saveMedicine
        );
    }


    /* =====================================================
       CLOSE ADD / EDIT
    ===================================================== */

    if (closeMedicineForm) {

        closeMedicineForm.addEventListener(
            "click",
            closeMedicineFormModal
        );
    }


    if (cancelMedicineForm) {

        cancelMedicineForm.addEventListener(
            "click",
            closeMedicineFormModal
        );
    }


    /* =====================================================
       CLOSE VIEW
    ===================================================== */

    if (closeMedicineView) {

        closeMedicineView.addEventListener(
            "click",
            closeMedicineViewModal
        );
    }


    if (closeViewButton) {

        closeViewButton.addEventListener(
            "click",
            closeMedicineViewModal
        );
    }


    /* =====================================================
       DELETE
    ===================================================== */

    if (cancelDelete) {

        cancelDelete.addEventListener(
            "click",
            closeDeleteThuoc
        );
    }


    if (confirmDelete) {

        confirmDelete.addEventListener(
            "click",
            confirmDeleteThuoc
        );
    }


    /* =====================================================
       STOCK FORM
    ===================================================== */

    if (stockForm) {

        stockForm.addEventListener(
            "submit",
            saveKhoThuoc
        );
    }


    /* =====================================================
       CLOSE STOCK
    ===================================================== */

    if (closeStockModal) {

        closeStockModal.addEventListener(
            "click",
            closeKhoThuoc
        );
    }


    if (cancelStockModal) {

        cancelStockModal.addEventListener(
            "click",
            closeKhoThuoc
        );
    }


    /* =====================================================
       TABLE ACTION
    ===================================================== */

    if (tableBody) {

        tableBody.addEventListener(
            "click",
            function (event) {

                const button =
                    event.target.closest(
                        "[data-action]"
                    );


                if (!button) {

                    return;
                }


                const action =
                    button.dataset.action;


                const id =
                    button.dataset.id;


                if (!id) {

                    return;
                }


                if (
                    action === "view"
                ) {

                    viewThuoc(id);

                } else if (
                    action === "stock"
                ) {

                    openKhoThuoc(id);

                } else if (
                    action === "edit"
                ) {

                    openEditThuoc(id);

                } else if (
                    action === "delete"
                ) {

                    openDeleteThuoc(id);
                }
            }
        );
    }


    /* =====================================================
       CLICK OUTSIDE MODALS
    ===================================================== */

    if (medicineFormModal) {

        medicineFormModal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    medicineFormModal
                ) {

                    closeMedicineFormModal();
                }
            }
        );
    }


    if (medicineViewModal) {

        medicineViewModal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    medicineViewModal
                ) {

                    closeMedicineViewModal();
                }
            }
        );
    }


    if (deleteModal) {

        deleteModal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    deleteModal
                ) {

                    closeDeleteThuoc();
                }
            }
        );
    }


    if (stockModal) {

        stockModal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    stockModal
                ) {

                    closeKhoThuoc();
                }
            }
        );
    }


    /* =====================================================
       ESC
    ===================================================== */

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key !==
                "Escape"
            ) {

                return;
            }


            if (
                medicineFormModal &&
                medicineFormModal.style.display ===
                "flex"
            ) {

                closeMedicineFormModal();
            }


            if (
                medicineViewModal &&
                medicineViewModal.style.display ===
                "flex"
            ) {

                closeMedicineViewModal();
            }


            if (
                deleteModal &&
                deleteModal.style.display ===
                "flex"
            ) {

                closeDeleteThuoc();
            }


            if (
                stockModal &&
                stockModal.style.display ===
                "flex"
            ) {

                closeKhoThuoc();
            }
        }
    );


    /* =====================================================
       GLOBAL FUNCTIONS
    ===================================================== */

    window.openAddThuoc =
        openAddThuoc;

    window.viewThuoc =
        viewThuoc;

    window.editThuoc =
        openEditThuoc;

    window.openEditThuoc =
        openEditThuoc;

    window.openDeleteThuoc =
        openDeleteThuoc;

    window.closeDeleteThuoc =
        closeDeleteThuoc;

    window.confirmDeleteThuoc =
        confirmDeleteThuoc;

    window.openKhoThuoc =
        openKhoThuoc;

    window.closeKhoThuoc =
        closeKhoThuoc;

    window.saveKhoThuoc =
        saveKhoThuoc;


    /* =====================================================
       INIT
    ===================================================== */

    loadDanhSachThuoc();

});