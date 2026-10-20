document.addEventListener("DOMContentLoaded", function () {

    const API_URL = "/api/phong";
    const KHOA_API_URL = "/api/khoa";

    const PAGE_SIZE = 5;

    let allPhong = [];
    let filteredPhong = [];

    let khoaList = [];

    let currentPage = 1;

    let editingId = null;
    let viewing = false;

    let deletingId = null;



    const LOAI_PHONG_LABELS = {
        KHAM_BENH: "Phòng khám bệnh",
        XET_NGHIEM: "Phòng xét nghiệm",
        CHAN_DOAN_HINH_ANH: "Chẩn đoán hình ảnh",
        THAM_DO_CHUC_NANG: "Thăm dò chức năng",
        NOI_SOI: "Phòng nội soi",
        HOI_SUC_CAP_CUU: "Hồi sức - cấp cứu"
    };

    function getLoaiPhongLabel(loaiPhong) {
        if (!loaiPhong) {
            return "Chưa phân loại";
        }

        return LOAI_PHONG_LABELS[loaiPhong] || loaiPhong;
    }



    /* =========================
       ELEMENTS
    ========================= */

    const keywordInput =
        document.getElementById("keywordInput");

    const khoaFilter =
        document.getElementById("khoaFilter");

    const statusFilter =
        document.getElementById("statusFilter");

    const searchButton =
        document.getElementById("searchButton");

    const resetButton =
        document.getElementById("resetButton");

    const addPhongButton =
        document.getElementById("addPhongButton");

    const phongTableBody =
        document.getElementById("phongTableBody");

    const emptyPhong =
        document.getElementById("emptyPhong");

    const tableResult =
        document.getElementById("tableResult");

    const pagination =
        document.getElementById("pagination");


    /* MODAL */

    const phongModal =
        document.getElementById("phongModal");

    const modalTitle =
        document.getElementById("modalTitle");

    const modalDescription =
        document.getElementById("modalDescription");

    const closePhongModal =
        document.getElementById("closePhongModal");

    const cancelPhongModal =
        document.getElementById("cancelPhongModal");

    const savePhongButton =
        document.getElementById("savePhongButton");

    const saveButtonText =
        document.getElementById("saveButtonText");


    /* FORM */

    const maKhoa =
        document.getElementById("maKhoa");

    const tenPhong =
        document.getElementById("tenPhong");

    const loaiPhong =
        document.getElementById("loaiPhong");

    const viTri =
        document.getElementById("viTri");

    const trangThai =
        document.getElementById("trangThai");

    const viTriCount =
        document.getElementById("viTriCount");


    /* TOAST */

    const phongToast =
        document.getElementById("phongToast");

    const phongToastIcon =
        document.getElementById("phongToastIcon");

    const phongToastTitle =
        document.getElementById("phongToastTitle");

    const phongToastMessage =
        document.getElementById("phongToastMessage");

    const closePhongToast =
        document.getElementById("closePhongToast");


    /* DELETE */

    const deleteConfirmModal =
        document.getElementById("deleteConfirmModal");

    const deletePhongName =
        document.getElementById("deletePhongName");

    const cancelDeleteButton =
        document.getElementById("cancelDeleteButton");

    const confirmDeleteButton =
        document.getElementById("confirmDeleteButton");


    /* =========================
       TOKEN
    ========================= */

    function getToken() {

        return (
            localStorage.getItem("Token") ||
            sessionStorage.getItem("Token")
        );

    }


    function getHeaders(includeJson = false) {

        const headers = {};

        const token = getToken();

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


    /* =========================
       LOAD KHOA
    ========================= */

    async function loadKhoa() {

        try {

            const response = await fetch(
                KHOA_API_URL,
                {
                    method: "GET",
                    headers: getHeaders()
                }
            );


            if (!response.ok) {

                throw new Error(
                    "Không thể tải danh sách khoa."
                );

            }


            khoaList = await response.json();


            renderKhoaOptions();


        } catch (error) {

            console.error(error);

            showToast(
                "error",
                "Lỗi",
                "Không thể tải danh sách khoa."
            );

        }

    }


    function renderKhoaOptions() {

        const currentValue =
            maKhoa.value;

        const currentFilter =
            khoaFilter.value;


        khoaFilter.innerHTML = `
            <option value="">
                Tất cả khoa
            </option>
        `;


        maKhoa.innerHTML = `
            <option value="">
                Chọn khoa
            </option>
        `;


        khoaList.forEach(function (khoa) {

            const optionFilter =
                document.createElement("option");

            optionFilter.value =
                khoa.maKhoa;

            optionFilter.textContent =
                khoa.tenKhoa;

            khoaFilter.appendChild(
                optionFilter
            );


            const optionForm =
                document.createElement("option");

            optionForm.value =
                khoa.maKhoa;

            optionForm.textContent =
                khoa.tenKhoa;

            maKhoa.appendChild(
                optionForm
            );

        });


        khoaFilter.value =
            currentFilter;

        maKhoa.value =
            currentValue;

    }


    /* =========================
       LOAD PHONG
    ========================= */

    async function loadPhong() {

        try {

            const response = await fetch(
                API_URL,
                {
                    method: "GET",
                    headers: getHeaders()
                }
            );


            if (!response.ok) {

                throw new Error(
                    "Không thể tải danh sách phòng."
                );

            }


            allPhong =
                await response.json();


            applyFilters();


        } catch (error) {

            console.error(error);

            allPhong = [];

            applyFilters();

            showToast(
                "error",
                "Lỗi",
                "Không thể tải danh sách phòng."
            );

        }

    }


    /* =========================
       FILTER
    ========================= */

    function applyFilters() {

        const keyword =
            keywordInput.value
                .trim()
                .toLowerCase();

        const selectedKhoa =
            khoaFilter.value;

        const selectedStatus =
            statusFilter.value;


        filteredPhong =
            allPhong.filter(function (phong) {

                const maPhongText =
                    String(
                        phong.maPhong ?? ""
                    ).toLowerCase();

                const tenPhongText =
                    String(
                        phong.tenPhong ?? ""
                    ).toLowerCase();

                const loaiPhongText =
                    String(
                        phong.loaiPhong ?? ""
                    ).toLowerCase();

                const viTriText =
                    String(
                        phong.viTri ?? ""
                    ).toLowerCase();

                const tenKhoaText =
                    String(
                        phong.tenKhoa ?? ""
                    ).toLowerCase();


                const matchesKeyword =
                    !keyword ||
                    maPhongText.includes(keyword) ||
                    tenPhongText.includes(keyword) ||
                    loaiPhongText.includes(keyword) ||
                    viTriText.includes(keyword) ||
                    tenKhoaText.includes(keyword);


                const matchesKhoa =
                    !selectedKhoa ||
                    String(
                        phong.maKhoa
                    ) === String(selectedKhoa);


                const matchesStatus =
                    selectedStatus === "" ||
                    String(
                        phong.trangThai
                    ) === selectedStatus;


                return (
                    matchesKeyword &&
                    matchesKhoa &&
                    matchesStatus
                );

            });


        currentPage = 1;

        renderTable();

    }


    /* =========================
       RENDER TABLE
    ========================= */

    function renderTable() {

        phongTableBody.innerHTML = "";


        const total =
            filteredPhong.length;


        if (total === 0) {

            emptyPhong.hidden = false;

            tableResult.textContent =
                "Hiển thị 0 trong tổng số 0 phòng";

            pagination.innerHTML = "";

            return;

        }


        emptyPhong.hidden = true;


        const totalPages =
            Math.ceil(total / PAGE_SIZE);


        if (currentPage > totalPages) {

            currentPage =
                totalPages;

        }


        const startIndex =
            (currentPage - 1) *
            PAGE_SIZE;

        const endIndex =
            Math.min(
                startIndex + PAGE_SIZE,
                total
            );


        const pageData =
            filteredPhong.slice(
                startIndex,
                endIndex
            );


        pageData.forEach(
            function (phong, index) {

                const row =
                    document.createElement("tr");


                const stt =
                    startIndex + index + 1;


                row.innerHTML = `

                    <td class="col-stt">
                        ${stt}
                    </td>

                    <td>
                        <span class="phong-code">
                            ${escapeHtml(
                                phong.maPhong
                            )}
                        </span>
                    </td>

                    <td>
                        <span class="phong-name">
                            ${escapeHtml(
                                phong.tenPhong
                            )}
                        </span>
                    </td>

                    <td>
                        <span class="phong-khoa">
                            ${escapeHtml(
                                phong.tenKhoa || "—"
                            )}
                        </span>
                    </td>

                    <td>
                        ${getLoaiPhongLabel(phong.loaiPhong)}
                    </td>


                    <td>
                        <span class="phong-description">
                            ${escapeHtml(
                                phong.viTri || "—"
                            )}
                        </span>
                    </td>

                    <td>
                        ${renderStatus(
                            phong.trangThai
                        )}
                    </td>

                    <td class="col-action">

                        <div class="action-buttons">

                            <button
                                type="button"
                                class="action-button view"
                                title="Xem"
                                data-action="view"
                                data-id="${phong.maPhong}">

                                👁

                            </button>

                            <button
                                type="button"
                                class="action-button edit"
                                title="Sửa"
                                data-action="edit"
                                data-id="${phong.maPhong}">

                                ✎

                            </button>

                            <button
                                type="button"
                                class="action-button delete"
                                title="Xóa"
                                data-action="delete"
                                data-id="${phong.maPhong}">

                                🗑

                            </button>

                        </div>

                    </td>

                `;


                phongTableBody.appendChild(row);

            }
        );


        tableResult.textContent =
            `Hiển thị ${startIndex + 1}-${endIndex} trong tổng số ${total} phòng`;


        renderPagination(totalPages);

    }


    /* =========================
       STATUS
    ========================= */

    function renderStatus(status) {

        if (
            status === true ||
            status === 1 ||
            status === "1"
        ) {

            return `
                <span class="status-badge status-active">
                    Đang hoạt động
                </span>
            `;

        }


        return `
            <span class="status-badge status-inactive">
                Ngừng hoạt động
            </span>
        `;

    }


    /* =========================
       PAGINATION
    ========================= */

    function renderPagination(totalPages) {

        pagination.innerHTML = "";


        if (totalPages <= 1) {

            return;

        }


        const previousButton =
            createPaginationButton(
                "‹",
                currentPage === 1
            );


        previousButton.addEventListener(
            "click",
            function () {

                if (currentPage > 1) {

                    currentPage--;

                    renderTable();

                }

            }
        );


        pagination.appendChild(
            previousButton
        );


        for (
            let page = 1;
            page <= totalPages;
            page++
        ) {

            const button =
                createPaginationButton(
                    page,
                    false,
                    page === currentPage
                );


            button.addEventListener(
                "click",
                function () {

                    currentPage =
                        page;

                    renderTable();

                }
            );


            pagination.appendChild(button);

        }


        const nextButton =
            createPaginationButton(
                "›",
                currentPage === totalPages
            );


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


        pagination.appendChild(
            nextButton
        );

    }


    function createPaginationButton(
        text,
        disabled = false,
        active = false
    ) {

        const button =
            document.createElement("button");

        button.type = "button";

        button.className =
            "pagination-button";

        if (active) {

            button.classList.add(
                "active"
            );

        }

        button.textContent = text;

        button.disabled =
            disabled;

        return button;

    }


    /* =========================
       OPEN ADD
    ========================= */

    function openAddModal() {

        editingId = null;

        viewing = false;


        modalTitle.textContent =
            "Thêm phòng";

        modalDescription.textContent =
            "Nhập thông tin phòng chuyên trách";


        saveButtonText.textContent =
            "Lưu phòng";

        savePhongButton.style.display =
            "inline-flex";


        resetForm();

        setFormDisabled(false);


        phongModal.hidden = false;

        setTimeout(
            function () {
                tenPhong.focus();
            },
            50
        );

    }


    /* =========================
       OPEN VIEW
    ========================= */

    async function openViewModal(id) {

        try {

            const phong =
                await getPhongById(id);


            if (!phong) {

                return;

            }


            editingId = id;

            viewing = true;


            modalTitle.textContent =
                "Xem thông tin phòng";

            modalDescription.textContent =
                "Thông tin chi tiết phòng chuyên trách";


            fillForm(phong);

            setFormDisabled(true);


            savePhongButton.style.display =
                "none";


            phongModal.hidden = false;


        } catch (error) {

            showToast(
                "error",
                "Lỗi",
                error.message
            );

        }

    }


    /* =========================
       OPEN EDIT
    ========================= */

    async function openEditModal(id) {

        try {

            const phong =
                await getPhongById(id);


            if (!phong) {

                return;

            }


            editingId = id;

            viewing = false;


            modalTitle.textContent =
                "Sửa thông tin phòng";

            modalDescription.textContent =
                "Cập nhật thông tin phòng chuyên trách";


            saveButtonText.textContent =
                "Lưu thay đổi";


            fillForm(phong);

            setFormDisabled(false);


            savePhongButton.style.display =
                "inline-flex";


            phongModal.hidden = false;


        } catch (error) {

            showToast(
                "error",
                "Lỗi",
                error.message
            );

        }

    }


    /* =========================
       GET BY ID
    ========================= */

    async function getPhongById(id) {

        const response =
            await fetch(
                `${API_URL}/${id}`,
                {
                    method: "GET",
                    headers: getHeaders()
                }
            );


        if (!response.ok) {

            throw new Error(
                "Không thể tải thông tin phòng."
            );

        }


        return await response.json();

    }


    /* =========================
       FORM
    ========================= */

    function resetForm() {

        maKhoa.value = "";

        tenPhong.value = "";

        loaiPhong.value = "";

        viTri.value = "";

        trangThai.value = "1";


        clearErrors();

        updateViTriCount();

    }


    function fillForm(phong) {

        maKhoa.value =
            phong.maKhoa ?? "";

        tenPhong.value =
            phong.tenPhong ?? "";

        loaiPhong.value =
            phong.loaiPhong ?? "";

        viTri.value =
            phong.viTri ?? "";

        trangThai.value =
            (
                phong.trangThai === true ||
                phong.trangThai === 1 ||
                phong.trangThai === "1"
            )
                ? "1"
                : "0";


        clearErrors();

        updateViTriCount();

    }


    function setFormDisabled(disabled) {

        maKhoa.disabled =
            disabled;

        tenPhong.disabled =
            disabled;

        loaiPhong.disabled =
            disabled;

        viTri.disabled =
            disabled;

        trangThai.disabled =
            disabled;

    }


    function closePhongModalBox() {

        phongModal.hidden = true;

        editingId = null;

        viewing = false;

        setFormDisabled(false);

        savePhongButton.style.display =
            "inline-flex";

    }


    /* =========================
       VALIDATION
    ========================= */

    function validateForm() {

        let valid = true;


        clearErrors();


        if (!maKhoa.value) {

            setError(
                "maKhoaError",
                "Vui lòng chọn khoa."
            );

            valid = false;

        }


        if (!tenPhong.value.trim()) {

            setError(
                "tenPhongError",
                "Vui lòng nhập tên phòng."
            );

            valid = false;

        } else if (
            tenPhong.value.trim().length > 100
        ) {

            setError(
                "tenPhongError",
                "Tên phòng không được vượt quá 100 ký tự."
            );

            valid = false;

        }
        const loaiPhongHopLe = Object.keys(LOAI_PHONG_LABELS);

        if (!loaiPhong.value || !loaiPhongHopLe.includes(loaiPhong.value)) {
            loaiPhongError.textContent = "Vui lòng chọn loại phòng hợp lệ.";
            isValid = false;
        } else {
            loaiPhongError.textContent = "";
        }



        if (
            viTri.value.trim().length > 255
        ) {

            setError(
                "viTriError",
                "Vị trí không được vượt quá 255 ký tự."
            );

            valid = false;

        }


        return valid;

    }


    function setError(id, message) {

        const element =
            document.getElementById(id);

        if (element) {

            element.textContent =
                message;

        }

    }


    function clearErrors() {

        document
            .querySelectorAll(".field-error")
            .forEach(
                function (element) {

                    element.textContent = "";

                }
            );

    }


    /* =========================
       SAVE
    ========================= */

    async function savePhong() {

        if (!validateForm()) {

            return;

        }


        const payload = {

            maKhoa:
                Number(maKhoa.value),

            tenPhong:
                tenPhong.value.trim(),
            loaiPhong: loaiPhong.value,
            viTri:
                viTri.value.trim() ||
                null,

            trangThai:
                trangThai.value === "1"

        };


        const isEdit =
            editingId !== null;


        savePhongButton.disabled =
            true;


        try {

            const response =
                await fetch(
                    isEdit
                        ? `${API_URL}/${editingId}`
                        : API_URL,
                    {
                        method:
                            isEdit
                                ? "PUT"
                                : "POST",

                        headers:
                            getHeaders(true),

                        body:
                            JSON.stringify(
                                payload
                            )
                    }
                );


            const data =
                await response.json()
                    .catch(
                        () => null
                    );


            if (!response.ok) {

                throw new Error(
                    data?.message ||
                    data?.error ||
                    "Không thể lưu thông tin phòng."
                );

            }


            closePhongModalBox();


            await loadPhong();


            showToast(
                "success",
                "Thành công",
                isEdit
                    ? "Cập nhật phòng thành công."
                    : "Thêm phòng thành công."
            );


        } catch (error) {

            console.error(error);

            showToast(
                "error",
                "Lỗi",
                error.message
            );

        } finally {

            savePhongButton.disabled =
                false;

        }

    }


    /* =========================
       DELETE
    ========================= */

    function openDeleteConfirm(id) {

        const phong =
            allPhong.find(
                function (item) {

                    return String(
                        item.maPhong
                    ) === String(id);

                }
            );


        if (!phong) {

            return;

        }


        deletingId =
            id;


        deletePhongName.textContent =
            phong.tenPhong;


        deleteConfirmModal.hidden =
            false;

    }


    function closeDeleteConfirm() {

        deleteConfirmModal.hidden =
            true;

        deletingId = null;

    }


    async function deletePhong() {

        if (deletingId === null) {

            return;

        }


        confirmDeleteButton.disabled =
            true;


        try {

            const response =
                await fetch(
                    `${API_URL}/${deletingId}`,
                    {
                        method: "DELETE",
                        headers: getHeaders()
                    }
                );


            const data =
                await response.json()
                    .catch(
                        () => null
                    );


            if (!response.ok) {

                throw new Error(
                    data?.message ||
                    data?.error ||
                    "Không thể xóa phòng."
                );

            }


            closeDeleteConfirm();


            await loadPhong();


            showToast(
                "success",
                "Đã xóa",
                "Xóa phòng thành công."
            );


        } catch (error) {

            console.error(error);

            showToast(
                "error",
                "Không thể xóa",
                error.message
            );

        } finally {

            confirmDeleteButton.disabled =
                false;

        }

    }


    /* =========================
       TOAST
    ========================= */

    function showToast(
        type,
        title,
        message
    ) {

        phongToast.classList.remove(
            "error"
        );


        if (type === "error") {

            phongToast.classList.add(
                "error"
            );

            phongToastIcon.textContent =
                "!";

        } else {

            phongToastIcon.textContent =
                "✓";

        }


        phongToastTitle.textContent =
            title;

        phongToastMessage.textContent =
            message;


        phongToast.classList.add(
            "show"
        );


        clearTimeout(
            window.phongToastTimer
        );


        window.phongToastTimer =
            setTimeout(
                function () {

                    phongToast.classList.remove(
                        "show"
                    );

                },
                3500
            );

    }


    /* =========================
       UTILITY
    ========================= */

    function escapeHtml(value) {

        if (value === null ||
            value === undefined) {

            return "";

        }


        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    }


    function updateViTriCount() {

        viTriCount.textContent =
            viTri.value.length;

    }


    /* =========================
       EVENTS
    ========================= */

    addPhongButton.addEventListener(
        "click",
        openAddModal
    );


    searchButton.addEventListener(
        "click",
        applyFilters
    );


    keywordInput.addEventListener(
        "keydown",
        function (event) {

            if (event.key === "Enter") {

                applyFilters();

            }

        }
    );


    resetButton.addEventListener(
        "click",
        function () {

            keywordInput.value = "";

            khoaFilter.value = "";

            statusFilter.value = "";

            applyFilters();

        }
    );


    khoaFilter.addEventListener(
        "change",
        applyFilters
    );


    statusFilter.addEventListener(
        "change",
        applyFilters
    );


    viTri.addEventListener(
        "input",
        updateViTriCount
    );


    closePhongModal.addEventListener(
        "click",
        closePhongModalBox
    );


    cancelPhongModal.addEventListener(
        "click",
        closePhongModalBox
    );


    savePhongButton.addEventListener(
        "click",
        savePhong
    );


    closePhongToast.addEventListener(
        "click",
        function () {

            phongToast.classList.remove(
                "show"
            );

        }
    );


    cancelDeleteButton.addEventListener(
        "click",
        closeDeleteConfirm
    );


    confirmDeleteButton.addEventListener(
        "click",
        deletePhong
    );


    /* TABLE ACTION */

    phongTableBody.addEventListener(
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


            if (action === "view") {

                openViewModal(id);

            }

            if (action === "edit") {

                openEditModal(id);

            }

            if (action === "delete") {

                openDeleteConfirm(id);

            }

        }
    );


    /* ESC */

    document.addEventListener(
        "keydown",
        function (event) {

            if (event.key !== "Escape") {

                return;

            }


            if (!phongModal.hidden) {

                closePhongModalBox();

            }


            if (!deleteConfirmModal.hidden) {

                closeDeleteConfirm();

            }

        }
    );


    /* =========================
       INITIAL LOAD
    ========================= */

    async function init() {

        await loadKhoa();

        await loadPhong();

    }


    init();

});