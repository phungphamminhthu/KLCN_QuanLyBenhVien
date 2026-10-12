document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       CONFIG
    ===================================================== */

    const API_URL = "/api/thuoc-tuong-duong";
    const MEDICINE_API_URL = "/api/medicines";

    const PAGE_SIZE = 5;


    /* =====================================================
       DATA
    ===================================================== */

    let allEquivalent = [];
    let filteredEquivalent = [];
    let allMedicines = [];

    // Map: MaThuoc -> TenThuoc
    let medicineMap = new Map();


    /* =====================================================
       PAGINATION
    ===================================================== */

    let currentPage = 1;


    /* =====================================================
       EDIT / DELETE
    ===================================================== */

    let editingId = null;
    let deleteEquivalentId = null;
    let currentMode = "add";


    /* =====================================================
       DOM
    ===================================================== */

    const addEquivalentButton =
        document.getElementById("addEquivalentButton");

    const searchButton =
        document.getElementById("searchButton");

    const resetButton =
        document.getElementById("resetButton");

    const keywordInput =
        document.getElementById("keywordInput");

    const statusFilter =
        document.getElementById("statusFilter");

    const equivalentTableBody =
        document.getElementById("equivalentTableBody");

    const paginationInfo =
        document.getElementById("paginationInfo");

    const pagination =
        document.getElementById("pagination");


    /* =====================================================
       MODAL
    ===================================================== */

    const equivalentModal =
        document.getElementById("equivalentModal");

    const equivalentModalTitle =
        document.getElementById("equivalentModalTitle");

    const equivalentModalSubtitle =
        document.getElementById("equivalentModalSubtitle");

    const closeEquivalentModal =
        document.getElementById("closeEquivalentModal");

    const cancelEquivalentModal =
        document.getElementById("cancelEquivalentModal");

    const saveEquivalentButton =
        document.getElementById("saveEquivalentButton");

    const equivalentForm =
        document.getElementById("equivalentForm");


    /* =====================================================
       FORM
    ===================================================== */

    const maThuocTuongDuong =
        document.getElementById("maThuocTuongDuong");

    const maThuoc =
        document.getElementById("maThuoc");

    const maThuocThayThe =
        document.getElementById("maThuocThayThe");

    const ghiChu =
        document.getElementById("ghiChu");

    const trangThai =
        document.getElementById("trangThai");


    /* =====================================================
       DELETE
    ===================================================== */

    const deleteConfirmModal =
        document.getElementById("deleteConfirmModal");

    const deleteEquivalentName =
        document.getElementById("deleteEquivalentName");

    const cancelDeleteButton =
        document.getElementById("cancelDeleteButton");

    const confirmDeleteButton =
        document.getElementById("confirmDeleteButton");


    /* =====================================================
       TOAST
    ===================================================== */

    const equivalentToast =
        document.getElementById("equivalentToast");

    const toastIcon =
        document.getElementById("toastIcon");

    const toastTitle =
        document.getElementById("toastTitle");

    const toastMessage =
        document.getElementById("toastMessage");

    const closeToast =
        document.getElementById("closeToast");

    let toastTimer = null;


    /* =====================================================
       INIT
    ===================================================== */

    init();


    async function init() {

        await loadMedicines();

        await loadEquivalent();

        bindEvents();
    }


    /* =====================================================
       EVENTS
    ===================================================== */

    function bindEvents() {

        addEquivalentButton?.addEventListener(
            "click",
            openAddModal
        );


        searchButton?.addEventListener(
            "click",
            () => {

                currentPage = 1;

                applyFilters();
            }
        );


        resetButton?.addEventListener(
            "click",
            resetFilters
        );


        keywordInput?.addEventListener(
            "keydown",
            event => {

                if (event.key === "Enter") {

                    currentPage = 1;

                    applyFilters();
                }
            }
        );


        statusFilter?.addEventListener(
            "change",
            () => {

                currentPage = 1;

                applyFilters();
            }
        );


        closeEquivalentModal?.addEventListener(
            "click",
            closeModal
        );


        cancelEquivalentModal?.addEventListener(
            "click",
            closeModal
        );


        saveEquivalentButton?.addEventListener(
            "click",
            saveEquivalent
        );


        cancelDeleteButton?.addEventListener(
            "click",
            closeDeleteModal
        );


        confirmDeleteButton?.addEventListener(
            "click",
            confirmDelete
        );


        closeToast?.addEventListener(
            "click",
            hideToast
        );


        equivalentModal?.addEventListener(
            "click",
            event => {

                if (event.target === equivalentModal) {

                    closeModal();
                }
            }
        );


        deleteConfirmModal?.addEventListener(
            "click",
            event => {

                if (event.target === deleteConfirmModal) {

                    closeDeleteModal();
                }
            }
        );


        maThuoc?.addEventListener(
            "change",
            () => {

                updateReplacementOptions();
            }
        );
    }


    /* =====================================================
       TOKEN
    ===================================================== */

    function getToken() {

        return (
            sessionStorage.getItem("Token")
            ||
            localStorage.getItem("Token")
            ||
            localStorage.getItem("token")
            ||
            localStorage.getItem("accessToken")
            ||
            ""
        );
    }


    function getHeaders(includeJson = false) {

        const token = getToken();

        const headers = {};

        if (token) {

            headers["Authorization"] =
                `Bearer ${token}`;
        }


        if (includeJson) {

            headers["Content-Type"] =
                "application/json";
        }


        return headers;
    }


    /* =====================================================
       LOAD THUỐC
    ===================================================== */

    async function loadMedicines() {

        try {

            const response =
                await fetch(
                    MEDICINE_API_URL,
                    {
                        method: "GET",
                        headers: getHeaders()
                    }
                );


            if (response.status === 401) {

                throw new Error(
                    "Phiên đăng nhập đã hết hạn."
                );
            }


            if (response.status === 403) {

                throw new Error(
                    "Bạn không có quyền xem danh sách thuốc."
                );
            }


            if (!response.ok) {

                throw new Error(
                    `Không thể tải danh sách thuốc. HTTP ${response.status}`
                );
            }


            const result =
                await response.json();


            allMedicines =
                unwrapMedicineArray(result);


            console.log(
                "Danh sách thuốc:",
                allMedicines
            );


            /* =================================================
               TẠO MAP MÃ THUỐC -> TÊN THUỐC
            ================================================= */

            medicineMap.clear();


            allMedicines.forEach(
                medicine => {

                    const id =
                        getMedicineId(medicine);


                    const name =
                        getMedicineNameFromObject(
                            medicine
                        );


                    if (
                        id !== null &&
                        id !== undefined &&
                        id !== ""
                    ) {

                        medicineMap.set(
                            String(id),
                            name
                        );
                    }
                }
            );


            console.log(
                "Medicine Map:",
                medicineMap
            );


            /* =================================================
               SORT
            ================================================= */

            allMedicines.sort(
                (a, b) => {

                    return (
                        getNumber(
                            getMedicineId(a)
                        )
                        -
                        getNumber(
                            getMedicineId(b)
                        )
                    );
                }
            );


            /* =================================================
               ĐỔ DỮ LIỆU VÀO SELECT
            ================================================= */

            populateMedicineSelects();


        } catch (error) {

            console.error(
                "Lỗi loadMedicines:",
                error
            );


            allMedicines = [];

            medicineMap.clear();


            showToast(
                "Lỗi",
                error.message ||
                "Không thể tải danh sách thuốc.",
                true
            );
        }
    }


    /* =====================================================
       UNWRAP MEDICINE ARRAY
    ===================================================== */

    function unwrapMedicineArray(result) {

        if (Array.isArray(result)) {

            return result;
        }


        if (!result || typeof result !== "object") {

            return [];
        }


        if (Array.isArray(result.data)) {

            return result.data;
        }


        if (Array.isArray(result.content)) {

            return result.content;
        }


        if (Array.isArray(result.items)) {

            return result.items;
        }


        if (
            result.data &&
            typeof result.data === "object"
        ) {

            if (Array.isArray(result.data.content)) {

                return result.data.content;
            }


            if (Array.isArray(result.data.items)) {

                return result.data.items;
            }


            if (Array.isArray(result.data.data)) {

                return result.data.data;
            }
        }


        return [];
    }


    /* =====================================================
       GET MEDICINE ID
    ===================================================== */

    function getMedicineId(medicine) {

        if (!medicine) {

            return null;
        }


        return (
            medicine.maThuoc
            ??
            medicine.MaThuoc
            ??
            medicine.id
            ??
            medicine.Id
        );
    }


    /* =====================================================
       GET MEDICINE NAME
    ===================================================== */

    function getMedicineNameFromObject(medicine) {

        if (!medicine) {

            return "Không xác định";
        }


        return String(
            medicine.tenThuoc
            ??
            medicine.TenThuoc
            ??
            medicine.name
            ??
            medicine.Name
            ??
            ""
        ).trim()
        ||
        "Không xác định";
    }


    /* =====================================================
       LOAD THUỐC TƯƠNG ĐƯƠNG
    ===================================================== */

    async function loadEquivalent() {

        try {

            showTableLoading();


            const response =
                await fetch(
                    API_URL,
                    {
                        method: "GET",
                        headers: getHeaders()
                    }
                );


            if (response.status === 401) {

                throw new Error(
                    "Phiên đăng nhập đã hết hạn."
                );
            }


            if (response.status === 403) {

                throw new Error(
                    "Bạn không có quyền truy cập danh sách thuốc tương đương."
                );
            }


            if (!response.ok) {

                throw new Error(
                    `Không thể tải dữ liệu. HTTP ${response.status}`
                );
            }


            const result =
                await response.json();


            console.log(
                "Thuốc tương đương:",
                result
            );


            allEquivalent =
                unwrapArray(result);


            filteredEquivalent =
                [...allEquivalent];


            currentPage = 1;


            applyFilters();


        } catch (error) {

            console.error(
                "Lỗi loadEquivalent:",
                error
            );


            allEquivalent = [];

            filteredEquivalent = [];


            renderTable();


            showToast(
                "Lỗi",
                error.message ||
                "Không thể tải dữ liệu thuốc tương đương.",
                true
            );
        }
    }


    /* =====================================================
       UNWRAP ARRAY
    ===================================================== */

    function unwrapArray(result) {

        if (Array.isArray(result)) {

            return result;
        }


        if (!result || typeof result !== "object") {

            return [];
        }


        if (Array.isArray(result.data)) {

            return result.data;
        }


        if (Array.isArray(result.content)) {

            return result.content;
        }


        if (Array.isArray(result.items)) {

            return result.items;
        }


        if (
            result.data &&
            typeof result.data === "object"
        ) {

            if (Array.isArray(result.data.content)) {

                return result.data.content;
            }


            if (Array.isArray(result.data.items)) {

                return result.data.items;
            }


            if (Array.isArray(result.data.data)) {

                return result.data.data;
            }
        }


        return [];
    }


    /* =====================================================
       POPULATE MEDICINE SELECT
       HIỂN THỊ TÊN THUỐC, KHÔNG HIỆN MÃ
    ===================================================== */

    function populateMedicineSelects(
        selectedOriginal = "",
        selectedReplacement = ""
    ) {

        if (!maThuoc || !maThuocThayThe) {

            return;
        }


        maThuoc.innerHTML = `
            <option value="">
                -- Chọn thuốc gốc --
            </option>
        `;


        maThuocThayThe.innerHTML = `
            <option value="">
                -- Chọn thuốc thay thế --
            </option>
        `;


        allMedicines.forEach(
            medicine => {

                const id =
                    getMedicineId(medicine);


                const name =
                    getMedicineNameFromObject(
                        medicine
                    );


                if (
                    id === null ||
                    id === undefined ||
                    id === ""
                ) {

                    return;
                }


                /* =================================================
                   THUỐC GỐC
                   value = mã
                   text = tên
                ================================================= */

                const originalOption =
                    document.createElement(
                        "option"
                    );


                originalOption.value =
                    String(id);


                originalOption.textContent =
                    name;


                maThuoc.appendChild(
                    originalOption
                );


                /* =================================================
                   THUỐC THAY THẾ
                   value = mã
                   text = tên
                ================================================= */

                const replacementOption =
                    document.createElement(
                        "option"
                    );


                replacementOption.value =
                    String(id);


                replacementOption.textContent =
                    name;


                maThuocThayThe.appendChild(
                    replacementOption
                );
            }
        );


        if (selectedOriginal !== "") {

            maThuoc.value =
                String(selectedOriginal);
        }


        updateReplacementOptions(
            selectedReplacement
        );
    }


    /* =====================================================
       REPLACEMENT OPTIONS
    ===================================================== */

    function updateReplacementOptions(
        selectedReplacement = ""
    ) {

        const originalId =
            String(
                maThuoc?.value || ""
            );


        if (!maThuocThayThe) {

            return;
        }


        Array.from(
            maThuocThayThe.options
        ).forEach(
            option => {

                if (!option.value) {

                    return;
                }


                option.disabled =
                    option.value === originalId;
            }
        );


        if (
            selectedReplacement !== ""
            &&
            String(selectedReplacement) !== originalId
        ) {

            maThuocThayThe.value =
                String(selectedReplacement);
        }
        else {

            if (
                maThuocThayThe.value === originalId
            ) {

                maThuocThayThe.value = "";
            }
        }
    }


    /* =====================================================
       FILTER
    ===================================================== */

    function applyFilters() {

        const keyword =
            String(
                keywordInput?.value || ""
            )
            .trim()
            .toLowerCase();


        const status =
            String(
                statusFilter?.value || ""
            )
            .trim();


        filteredEquivalent =
            allEquivalent.filter(
                item => {

                    const id =
                        String(
                            item.maThuocTuongDuong
                            ??
                            item.MaThuocTuongDuong
                            ??
                            ""
                        );


                    const originalId =
                        String(
                            item.maThuoc
                            ??
                            item.MaThuoc
                            ??
                            ""
                        );


                    const replacementId =
                        String(
                            item.maThuocThayThe
                            ??
                            item.MaThuocThayThe
                            ??
                            ""
                        );


                    const note =
                        String(
                            item.ghiChu
                            ??
                            item.GhiChu
                            ??
                            ""
                        );


                    const originalName =
                        item.tenThuoc
                        ??
                        item.TenThuoc
                        ??
                        item.tenThuocGoc
                        ??
                        item.TenThuocGoc
                        ??
                        getMedicineName(
                            originalId
                        );


                    const replacementName =
                        item.tenThuocThayThe
                        ??
                        item.TenThuocThayThe
                        ??
                        item.tenThuocThayThe
                        ??
                        item.TenThuocThayThe
                        ??
                        getMedicineName(
                            replacementId
                        );


                    const searchText =
                        `
                        ${id}
                        ${originalName}
                        ${replacementName}
                        ${note}
                        `
                        .toLowerCase();


                    const rawStatus =
                        String(
                            item.trangThai
                            ??
                            item.TrangThai
                            ??
                            ""
                        ).trim();


                    const matchKeyword =
                        keyword === ""
                        ||
                        searchText.includes(
                            keyword
                        );


                    const matchStatus =
                        status === ""
                        ||
                        rawStatus === status;


                    return (
                        matchKeyword &&
                        matchStatus
                    );
                }
            );


        renderTable();
    }


    /* =====================================================
       RESET
    ===================================================== */

    function resetFilters() {

        if (keywordInput) {

            keywordInput.value = "";
        }


        if (statusFilter) {

            statusFilter.value = "";
        }


        currentPage = 1;


        filteredEquivalent =
            [...allEquivalent];


        renderTable();
    }


    /* =====================================================
       RENDER TABLE
    ===================================================== */

    function renderTable() {

        if (!equivalentTableBody) {

            return;
        }


        const total =
            filteredEquivalent.length;


        if (total === 0) {

            equivalentTableBody.innerHTML = `
                <tr>
                    <td
                        colspan="7"
                        class="empty-row">

                        Không có dữ liệu phù hợp.

                    </td>
                </tr>
            `;


            if (paginationInfo) {

                paginationInfo.textContent =
                    "Hiển thị 0 - 0 trong tổng số 0 bản ghi";
            }


            if (pagination) {

                pagination.innerHTML = "";
            }


            return;
        }


        const totalPages =
            Math.ceil(
                total / PAGE_SIZE
            );


        if (currentPage > totalPages) {

            currentPage =
                totalPages;
        }


        const start =
            (currentPage - 1)
            *
            PAGE_SIZE;


        const end =
            Math.min(
                start + PAGE_SIZE,
                total
            );


        const pageItems =
            filteredEquivalent.slice(
                start,
                end
            );


        equivalentTableBody.innerHTML =
            pageItems
                .map(
                    (item, index) =>
                        renderRow(
                            item,
                            start + index + 1
                        )
                )
                .join("");


        if (paginationInfo) {

            paginationInfo.textContent =
                `Hiển thị ${start + 1} - ${end} trong tổng số ${total} bản ghi`;
        }


        renderPagination(totalPages);
    }


    /* =====================================================
       RENDER ROW
       CHỈ HIỂN THỊ TÊN THUỐC
    ===================================================== */

    function renderRow(
        item,
        stt
    ) {

        const id =
            item.maThuocTuongDuong
            ??
            item.MaThuocTuongDuong
            ??
            "";


        const originalId =
            item.maThuoc
            ??
            item.MaThuoc
            ??
            "";


        const replacementId =
            item.maThuocThayThe
            ??
            item.MaThuocThayThe
            ??
            "";


        const note =
            item.ghiChu
            ??
            item.GhiChu
            ??
            "";


        const rawStatus =
            String(
                item.trangThai
                ??
                item.TrangThai
                ??
                ""
            ).trim();


        /* =================================================
           LẤY TÊN THUỐC
        ================================================= */

        const originalName =
            item.tenThuoc
            ??
            item.TenThuoc
            ??
            item.tenThuocGoc
            ??
            item.TenThuocGoc
            ??
            getMedicineName(
                originalId
            );


        const replacementName =
            item.tenThuocThayThe
            ??
            item.TenThuocThayThe
            ??
            item.tenThuocThayThe
            ??
            item.TenThuocThayThe
            ??
            getMedicineName(
                replacementId
            );


        const isActive =
            rawStatus === "Đang áp dụng";


        const statusHtml =
            isActive

                ?

                `
                    <span class="status-badge status-active">
                        Đang áp dụng
                    </span>
                `

                :

                `
                    <span class="status-badge status-inactive">
                        ${escapeHtml(
                            rawStatus ||
                            "Không xác định"
                        )}
                    </span>
                `;


        return `
            <tr>

                <!-- STT -->

                <td>
                    ${stt}
                </td>


                <!-- MÃ THUỐC TƯƠNG ĐƯƠNG -->

                <td>
                    <strong>
                        TT${escapeHtml(
                            String(id)
                        )}
                    </strong>
                </td>


                <!-- THUỐC GỐC -->
                <!-- CHỈ HIỂN THỊ TÊN -->

                <td>
                    <strong>
                        ${escapeHtml(
                            String(
                                originalName ||
                                "Không xác định"
                            )
                        )}
                    </strong>
                </td>


                <!-- THUỐC THAY THẾ -->
                <!-- CHỈ HIỂN THỊ TÊN -->

                <td>
                    <strong>
                        ${escapeHtml(
                            String(
                                replacementName ||
                                "Không xác định"
                            )
                        )}
                    </strong>
                </td>


                <!-- GHI CHÚ -->

                <td>
                    ${escapeHtml(
                        note || "-"
                    )}
                </td>


                <!-- TRẠNG THÁI -->

                <td>
                    ${statusHtml}
                </td>


                <!-- THAO TÁC -->

                <td>

                    <div class="action-buttons">

                        <button
                            type="button"
                            class="action-btn action-view"
                            title="Xem"
                            onclick="viewEquivalent(${id})">

                            👁

                        </button>


                        <button
                            type="button"
                            class="action-btn action-edit"
                            title="Sửa"
                            onclick="editEquivalent(${id})">

                            ✎

                        </button>


                        <button
                            type="button"
                            class="action-btn action-delete"
                            title="Xóa"
                            onclick="deleteEquivalent(${id})">

                            🗑

                        </button>

                    </div>

                </td>

            </tr>
        `;
    }


    /* =====================================================
       GET MEDICINE NAME
    ===================================================== */

    function getMedicineName(
        medicineId
    ) {

        if (
            medicineId === null ||
            medicineId === undefined ||
            medicineId === ""
        ) {

            return "Không xác định";
        }


        const key =
            String(medicineId);


        /* =================================================
           CÁCH 1: MAP
        ================================================= */

        if (medicineMap.has(key)) {

            return medicineMap.get(key);
        }


        /* =================================================
           CÁCH 2: TÌM TRỰC TIẾP
        ================================================= */

        const medicine =
            allMedicines.find(
                item => {

                    return (
                        String(
                            getMedicineId(item)
                        )
                        ===
                        key
                    );
                }
            );


        if (medicine) {

            return getMedicineNameFromObject(
                medicine
            );
        }


        return "Không xác định";
    }


    /* =====================================================
       PAGINATION
    ===================================================== */

    function renderPagination(
        totalPages
    ) {

        if (!pagination) {

            return;
        }


        pagination.innerHTML = "";


        if (totalPages <= 1) {

            return;
        }


        const previous =
            document.createElement("button");


        previous.type = "button";

        previous.innerHTML = "‹";

        previous.disabled =
            currentPage === 1;


        previous.addEventListener(
            "click",
            () => {

                if (currentPage > 1) {

                    currentPage--;

                    renderTable();
                }
            }
        );


        pagination.appendChild(
            previous
        );


        for (
            let page = 1;
            page <= totalPages;
            page++
        ) {

            const button =
                document.createElement("button");


            button.type = "button";

            button.textContent =
                page;


            if (page === currentPage) {

                button.classList.add(
                    "active"
                );
            }


            button.addEventListener(
                "click",
                () => {

                    currentPage = page;

                    renderTable();
                }
            );


            pagination.appendChild(
                button
            );
        }


        const next =
            document.createElement("button");


        next.type = "button";

        next.innerHTML = "›";

        next.disabled =
            currentPage === totalPages;


        next.addEventListener(
            "click",
            () => {

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


    /* =====================================================
       ADD
    ===================================================== */

    function openAddModal() {

        currentMode = "add";

        editingId = null;


        equivalentForm.reset();


        maThuocTuongDuong.value = "";


        trangThai.value =
            "Đang áp dụng";


        populateMedicineSelects();


        equivalentModalTitle.textContent =
            "Thêm thuốc tương đương";


        equivalentModalSubtitle.textContent =
            "Nhập thông tin thuốc tương đương";


        saveEquivalentButton.style.display =
            "inline-flex";


        setFormDisabled(false);


        equivalentModal.classList.add(
            "show"
        );
    }


    /* =====================================================
       VIEW
    ===================================================== */

    window.viewEquivalent =
        function(id) {

            const item =
                findEquivalent(id);


            if (!item) {

                showToast(
                    "Lỗi",
                    "Không tìm thấy dữ liệu.",
                    true
                );

                return;
            }


            currentMode = "view";

            editingId = id;


            fillForm(item);


            equivalentModalTitle.textContent =
                "Xem thuốc tương đương";


            equivalentModalSubtitle.textContent =
                "Thông tin chi tiết thuốc tương đương";


            saveEquivalentButton.style.display =
                "none";


            setFormDisabled(true);


            equivalentModal.classList.add(
                "show"
            );
        };


    /* =====================================================
       EDIT
    ===================================================== */

    window.editEquivalent =
        function(id) {

            const item =
                findEquivalent(id);


            if (!item) {

                showToast(
                    "Lỗi",
                    "Không tìm thấy dữ liệu.",
                    true
                );

                return;
            }


            currentMode = "edit";

            editingId = id;


            fillForm(item);


            equivalentModalTitle.textContent =
                "Chỉnh sửa thuốc tương đương";


            equivalentModalSubtitle.textContent =
                "Cập nhật thông tin thuốc tương đương";


            saveEquivalentButton.style.display =
                "inline-flex";


            setFormDisabled(false);


            equivalentModal.classList.add(
                "show"
            );
        };


    /* =====================================================
       FILL FORM
    ===================================================== */

    function fillForm(item) {

        const id =
            item.maThuocTuongDuong
            ??
            item.MaThuocTuongDuong
            ??
            "";


        const originalId =
            item.maThuoc
            ??
            item.MaThuoc
            ??
            "";


        const replacementId =
            item.maThuocThayThe
            ??
            item.MaThuocThayThe
            ??
            "";


        const note =
            item.ghiChu
            ??
            item.GhiChu
            ??
            "";


        const status =
            String(
                item.trangThai
                ??
                item.TrangThai
                ??
                "Đang áp dụng"
            ).trim();


        maThuocTuongDuong.value =
            id;


        ghiChu.value =
            note;


        trangThai.value =
            status;


        populateMedicineSelects(
            originalId,
            replacementId
        );
    }


    /* =====================================================
       DISABLE FORM
    ===================================================== */

    function setFormDisabled(
        disabled
    ) {

        maThuoc.disabled =
            disabled;

        maThuocThayThe.disabled =
            disabled;

        ghiChu.disabled =
            disabled;

        trangThai.disabled =
            disabled;
    }


    /* =====================================================
       SAVE
    ===================================================== */

    async function saveEquivalent() {

        const originalId =
            maThuoc.value;


        const replacementId =
            maThuocThayThe.value;


        const note =
            ghiChu.value.trim();


        const status =
            trangThai.value;


        /* =================================================
           VALIDATE
        ================================================= */

        if (!originalId) {

            showToast(
                "Cảnh báo",
                "Vui lòng chọn thuốc gốc.",
                true
            );

            return;
        }


        if (!replacementId) {

            showToast(
                "Cảnh báo",
                "Vui lòng chọn thuốc thay thế.",
                true
            );

            return;
        }


        if (
            String(originalId) ===
            String(replacementId)
        ) {

            showToast(
                "Cảnh báo",
                "Thuốc gốc và thuốc thay thế không được giống nhau.",
                true
            );

            return;
        }


        const payload = {

            maThuoc:
                Number(originalId),

            maThuocThayThe:
                Number(replacementId),

            ghiChu:
                note,

            trangThai:
                status
        };


        try {

            saveEquivalentButton.disabled =
                true;


            saveEquivalentButton.textContent =
                "Đang lưu...";


            let url =
                API_URL;


            let method =
                "POST";


            if (
                currentMode === "edit" &&
                editingId !== null
            ) {

                url =
                    `${API_URL}/${editingId}`;

                method =
                    "PUT";
            }


            const response =
                await fetch(
                    url,
                    {
                        method: method,

                        headers:
                            getHeaders(true),

                        body:
                            JSON.stringify(
                                payload
                            )
                    }
                );


            if (!response.ok) {

                const errorText =
                    await response.text();


                throw new Error(
                    parseErrorMessage(
                        errorText
                    )
                );
            }


            closeModal();


            showToast(
                "Thành công",
                currentMode === "edit"
                    ? "Đã cập nhật thuốc tương đương."
                    : "Đã thêm thuốc tương đương."
            );


            await loadEquivalent();


        } catch (error) {

            console.error(
                "Lỗi saveEquivalent:",
                error
            );


            showToast(
                "Lỗi",
                parseErrorMessage(error),
                true
            );


        } finally {

            saveEquivalentButton.disabled =
                false;


            saveEquivalentButton.textContent =
                "Lưu";
        }
    }


    /* =====================================================
       DELETE
    ===================================================== */

    window.deleteEquivalent =
        function(id) {

            const item =
                findEquivalent(id);


            if (!item) {

                showToast(
                    "Lỗi",
                    "Không tìm thấy dữ liệu.",
                    true
                );

                return;
            }


            deleteEquivalentId =
                id;


            const originalId =
                item.maThuoc
                ??
                item.MaThuoc
                ??
                "";


            const replacementId =
                item.maThuocThayThe
                ??
                item.MaThuocThayThe
                ??
                "";


            const originalName =
                item.tenThuoc
                ??
                item.TenThuoc
                ??
                item.tenThuocGoc
                ??
                item.TenThuocGoc
                ??
                getMedicineName(
                    originalId
                );


            const replacementName =
                item.tenThuocThayThe
                ??
                item.TenThuocThayThe
                ??
                item.tenThuocThayThe
                ??
                item.TenThuocThayThe
                ??
                getMedicineName(
                    replacementId
                );


            if (deleteEquivalentName) {

                deleteEquivalentName.textContent =
                    `${originalName} → ${replacementName}`;
            }


            deleteConfirmModal.classList.add(
                "show"
            );
        };


    /* =====================================================
       CONFIRM DELETE
    ===================================================== */

    async function confirmDelete() {

        if (
            deleteEquivalentId ===
            null
        ) {

            return;
        }


        try {

            confirmDeleteButton.disabled =
                true;


            confirmDeleteButton.textContent =
                "Đang xóa...";


            const response =
                await fetch(
                    `${API_URL}/${deleteEquivalentId}`,
                    {
                        method: "DELETE",
                        headers:
                            getHeaders()
                    }
                );


            if (!response.ok) {

                const errorText =
                    await response.text();


                throw new Error(
                    parseErrorMessage(
                        errorText
                    )
                );
            }


            closeDeleteModal();


            showToast(
                "Thành công",
                "Đã xóa thuốc tương đương."
            );


            await loadEquivalent();


        } catch (error) {

            console.error(
                "Lỗi deleteEquivalent:",
                error
            );


            showToast(
                "Lỗi",
                parseErrorMessage(error),
                true
            );


        } finally {

            confirmDeleteButton.disabled =
                false;


            confirmDeleteButton.textContent =
                "Xóa";


            deleteEquivalentId =
                null;
        }
    }


    /* =====================================================
       CLOSE MODAL
    ===================================================== */

    function closeModal() {

        equivalentModal.classList.remove(
            "show"
        );


        equivalentForm.reset();


        editingId = null;

        currentMode = "add";


        setFormDisabled(false);


        saveEquivalentButton.style.display =
            "inline-flex";


        saveEquivalentButton.disabled =
            false;


        saveEquivalentButton.textContent =
            "Lưu";


        trangThai.value =
            "Đang áp dụng";
    }


    /* =====================================================
       CLOSE DELETE
    ===================================================== */

    function closeDeleteModal() {

        deleteConfirmModal.classList.remove(
            "show"
        );


        deleteEquivalentId =
            null;
    }


    /* =====================================================
       FIND
    ===================================================== */

    function findEquivalent(id) {

        return allEquivalent.find(
            item => {

                const itemId =
                    item.maThuocTuongDuong
                    ??
                    item.MaThuocTuongDuong;


                return (
                    String(itemId) ===
                    String(id)
                );
            }
        );
    }


    /* =====================================================
       NUMBER
    ===================================================== */

    function getNumber(value) {

        const number =
            Number(value);


        return Number.isFinite(number)
            ? number
            : 0;
    }


    /* =====================================================
       ESCAPE HTML
    ===================================================== */

    function escapeHtml(value) {

        return String(
            value ?? ""
        )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
    }


    /* =====================================================
       PARSE ERROR
    ===================================================== */

    function parseErrorMessage(error) {

        if (!error) {

            return "Có lỗi xảy ra.";
        }


        if (
            typeof error === "string"
        ) {

            try {

                const parsed =
                    JSON.parse(error);


                return (
                    parsed.message
                    ??
                    parsed.error
                    ??
                    error
                );

            } catch {

                return error;
            }
        }


        let message =
            error.message
            ??
            "Có lỗi xảy ra.";


        try {

            const parsed =
                JSON.parse(message);


            return (
                parsed.message
                ??
                parsed.error
                ??
                message
            );

        } catch {

            return message;
        }
    }


    /* =====================================================
       LOADING
    ===================================================== */

    function showTableLoading() {

        if (!equivalentTableBody) {

            return;
        }


        equivalentTableBody.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="empty-row">

                    Đang tải dữ liệu...

                </td>
            </tr>
        `;
    }


    /* =====================================================
       TOAST
    ===================================================== */

    function showToast(
        title,
        message,
        isError = false
    ) {

        if (!equivalentToast) {

            return;
        }


        if (toastTimer) {

            clearTimeout(
                toastTimer
            );
        }


        if (toastTitle) {

            toastTitle.textContent =
                title;
        }


        if (toastMessage) {

            toastMessage.textContent =
                message;
        }


        if (toastIcon) {

            toastIcon.textContent =
                isError
                    ? "!"
                    : "✓";
        }


        equivalentToast.classList.toggle(
            "error",
            isError
        );


        equivalentToast.classList.add(
            "show"
        );


        toastTimer =
            setTimeout(
                hideToast,
                4000
            );
    }


    function hideToast() {

        if (!equivalentToast) {

            return;
        }


        equivalentToast.classList.remove(
            "show"
        );
    }

});