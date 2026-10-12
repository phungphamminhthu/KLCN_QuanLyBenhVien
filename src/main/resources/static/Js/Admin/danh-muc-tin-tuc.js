document.addEventListener("DOMContentLoaded", function () {

    // =====================================================
    // API
    // =====================================================

    const API_URL = "/api/danh-muc-tin-tuc";


    // =====================================================
    // DOM
    // =====================================================

    const CategoryTableBody =
        document.getElementById("categoryTableBody");

    const EmptyCategory =
        document.getElementById("emptyCategory");

    const CategoryCount =
        document.getElementById("categoryCount");

    const Pagination =
        document.getElementById("pagination");


    const SearchCategory =
        document.getElementById("searchCategory");

    const SearchButton =
        document.getElementById("searchButton");

    const ResetButton =
        document.getElementById("resetButton");


    const AddCategoryButton =
        document.getElementById("addCategoryButton");


    const CategoryModal =
        document.getElementById("categoryModal");

    const CloseModalButton =
        document.getElementById("closeModalButton");

    const CancelModalButton =
        document.getElementById("cancelModalButton");


    const ModalTitle =
        document.getElementById("modalTitle");

    const ModalDescription =
        document.getElementById("modalDescription");


    const CategoryName =
        document.getElementById("categoryName");

    const CategoryDescription =
        document.getElementById("categoryDescription");

    const CategoryNameError =
        document.getElementById("categoryNameError");

    const DescriptionCount =
        document.getElementById("descriptionCount");


    const SaveCategoryButton =
        document.getElementById("saveCategoryButton");

    const SaveButtonText =
        document.getElementById("saveButtonText");


    const CategoryNameRequired =
        document.getElementById("categoryNameRequired");


    // =====================================================
    // TOAST
    // =====================================================

    const CategoryToast =
        document.getElementById("categoryToast");

    const CategoryToastTitle =
        document.getElementById("categoryToastTitle");

    const CategoryToastMessage =
        document.getElementById("categoryToastMessage");

    const CategoryToastIcon =
        document.getElementById("categoryToastIcon");

    const CloseCategoryToast =
        document.getElementById("closeCategoryToast");


    // =====================================================
    // BIẾN
    // =====================================================

    let Categories = [];

    let FilteredCategories = [];

    let CurrentPage = 1;

    const ItemsPerPage = 5;

    let EditingId = null;

    let CurrentMode = "add";


    // =====================================================
    // TOKEN
    // =====================================================

    function getToken() {

        return localStorage.getItem("Token")
            || sessionStorage.getItem("Token")
            || "";

    }


    // =====================================================
    // HEADERS
    // =====================================================

    function getHeaders() {

        const Token = getToken();

        return {
            "Content-Type": "application/json",
            ...(Token
                ? {
                    "Authorization": "Bearer " + Token
                }
                : {})
        };

    }


    // =====================================================
    // LOAD DATA
    // =====================================================

    async function loadCategories() {

        try {

            const Response = await fetch(
                API_URL,
                {
                    method: "GET",
                    headers: getHeaders()
                }
            );


            if (Response.status === 401) {

                showToast(
                    "error",
                    "Phiên đăng nhập",
                    "Phiên đăng nhập đã hết hạn."
                );

                return;

            }


            if (!Response.ok) {

                throw new Error(
                    "Không thể tải danh sách danh mục."
                );

            }


            const Data = await Response.json();


            /*
             * Hỗ trợ:
             *
             * [
             *   {...},
             *   {...}
             * ]
             *
             * hoặc
             *
             * {
             *   data: [...]
             * }
             */

            if (Array.isArray(Data)) {

                Categories = Data;

            } else if (Array.isArray(Data.data)) {

                Categories = Data.data;

            } else if (Array.isArray(Data.content)) {

                Categories = Data.content;

            } else {

                Categories = [];

            }


            applySearch(false);

        } catch (Error) {

            console.error(
                "Lỗi load danh mục:",
                Error
            );

            Categories = [];

            FilteredCategories = [];

            renderTable();

            showToast(
                "error",
                "Lỗi",
                "Không thể tải danh sách danh mục."
            );

        }

    }


    // =====================================================
    // TÌM KIẾM
    // =====================================================

    function applySearch(resetPage = true) {

        const Keyword =
            SearchCategory.value
                .trim()
                .toLowerCase();


        if (Keyword === "") {

            FilteredCategories = [...Categories];

        } else {

            FilteredCategories =
                Categories.filter(function (Category) {

                    const Name =
                        (
                            Category.tenDanhMuc
                            || Category.TenDanhMuc
                            || ""
                        )
                        .toLowerCase();


                    const Description =
                        (
                            Category.moTa
                            || Category.MoTa
                            || ""
                        )
                        .toLowerCase();


                    return (
                        Name.includes(Keyword)
                        || Description.includes(Keyword)
                    );

                });

        }


        if (resetPage) {

            CurrentPage = 1;

        }


        renderTable();

    }


    // =====================================================
    // RENDER TABLE
    // =====================================================

    function renderTable() {

        CategoryTableBody.innerHTML = "";


        const Total =
            FilteredCategories.length;


        if (Total === 0) {

            EmptyCategory.hidden = false;

            CategoryTableBody.innerHTML = "";

            CategoryCount.textContent =
                "Hiển thị 0 trong tổng số 0 danh mục";

            Pagination.innerHTML = "";

            return;

        }


        EmptyCategory.hidden = true;


        const TotalPages =
            Math.ceil(
                Total / ItemsPerPage
            );


        if (CurrentPage > TotalPages) {

            CurrentPage = TotalPages;

        }


        const StartIndex =
            (CurrentPage - 1)
            * ItemsPerPage;


        const EndIndex =
            StartIndex + ItemsPerPage;


        const PageData =
            FilteredCategories.slice(
                StartIndex,
                EndIndex
            );


        PageData.forEach(
            function (Category, Index) {

                const Id =
                    Category.maDanhMuc
                    ?? Category.MaDanhMuc;


                const Name =
                    Category.tenDanhMuc
                    ?? Category.TenDanhMuc
                    ?? "";


                const Description =
                    Category.moTa
                    ?? Category.MoTa
                    ?? "";


                const STT =
                    StartIndex + Index + 1;


                const Row =
                    document.createElement("tr");


                Row.innerHTML = `

                    <td class="col-stt">
                        ${STT}
                    </td>


                    <td>
                        <strong class="category-name">
                            ${escapeHtml(Name)}
                        </strong>
                    </td>


                    <td>
                        <span class="category-description">
                            ${escapeHtml(
                                Description || "—"
                            )}
                        </span>
                    </td>


                    <td class="col-action">

                        <div class="action-buttons">

                            <button
                                type="button"
                                class="action-button view"
                                title="Xem"
                                data-action="view"
                                data-id="${Id}">

                                👁

                            </button>


                            <button
                                type="button"
                                class="action-button edit"
                                title="Sửa"
                                data-action="edit"
                                data-id="${Id}">

                                ✎

                            </button>


                            <button
                                type="button"
                                class="action-button delete"
                                title="Xóa"
                                data-action="delete"
                                data-id="${Id}">

                                🗑

                            </button>

                        </div>

                    </td>

                `;


                CategoryTableBody.appendChild(Row);

            }
        );


        const From =
            StartIndex + 1;

        const To =
            Math.min(
                EndIndex,
                Total
            );


        CategoryCount.textContent =
            `Hiển thị ${From} - ${To} trong tổng số ${Total} danh mục`;


        renderPagination(TotalPages);

    }


    // =====================================================
    // PAGINATION
    // =====================================================

    function renderPagination(TotalPages) {

        Pagination.innerHTML = "";


        if (TotalPages <= 1) {

            return;

        }


        // PREVIOUS

        const PreviousButton =
            document.createElement("button");

        PreviousButton.type = "button";

        PreviousButton.className =
            "pagination-button";

        PreviousButton.innerHTML = "‹";

        PreviousButton.disabled =
            CurrentPage === 1;


        PreviousButton.addEventListener(
            "click",
            function () {

                if (CurrentPage > 1) {

                    CurrentPage--;

                    renderTable();

                }

            }
        );


        Pagination.appendChild(
            PreviousButton
        );


        // PAGE NUMBER

        for (
            let Page = 1;
            Page <= TotalPages;
            Page++
        ) {

            const PageButton =
                document.createElement("button");

            PageButton.type = "button";

            PageButton.className =
                "pagination-button";


            if (Page === CurrentPage) {

                PageButton.classList.add("active");

            }


            PageButton.textContent =
                Page;


            PageButton.addEventListener(
                "click",
                function () {

                    CurrentPage = Page;

                    renderTable();

                }
            );


            Pagination.appendChild(
                PageButton
            );

        }


        // NEXT

        const NextButton =
            document.createElement("button");

        NextButton.type = "button";

        NextButton.className =
            "pagination-button";

        NextButton.innerHTML = "›";

        NextButton.disabled =
            CurrentPage === TotalPages;


        NextButton.addEventListener(
            "click",
            function () {

                if (
                    CurrentPage < TotalPages
                ) {

                    CurrentPage++;

                    renderTable();

                }

            }
        );


        Pagination.appendChild(
            NextButton
        );

    }


    // =====================================================
    // OPEN ADD
    // =====================================================

    function openAddModal() {

        CurrentMode = "add";

        EditingId = null;


        ModalTitle.textContent =
            "Thêm danh mục";


        ModalDescription.textContent =
            "Nhập thông tin danh mục tin tức";


        SaveButtonText.textContent =
            "Lưu danh mục";


        SaveCategoryButton.hidden =
            false;


        CategoryNameRequired.hidden =
            false;


        CategoryName.disabled =
            false;

        CategoryDescription.disabled =
            false;


        CategoryName.value = "";

        CategoryDescription.value = "";


        CategoryNameError.textContent = "";

        CategoryName.classList.remove(
            "input-error"
        );


        updateDescriptionCount();


        openModal();

    }


    // =====================================================
    // OPEN VIEW
    // =====================================================

    function openViewModal(Category) {

        CurrentMode = "view";

        EditingId =
            Category.maDanhMuc
            ?? Category.MaDanhMuc;


        ModalTitle.textContent =
            "Xem danh mục";


        ModalDescription.textContent =
            "Thông tin chi tiết danh mục tin tức";


        CategoryName.value =
            Category.tenDanhMuc
            ?? Category.TenDanhMuc
            ?? "";


        CategoryDescription.value =
            Category.moTa
            ?? Category.MoTa
            ?? "";


        CategoryName.disabled =
            true;

        CategoryDescription.disabled =
            true;


        SaveCategoryButton.hidden =
            true;


        CategoryNameRequired.hidden =
            true;


        CategoryNameError.textContent = "";


        updateDescriptionCount();


        openModal();

    }


    // =====================================================
    // OPEN EDIT
    // =====================================================

    function openEditModal(Category) {

        CurrentMode = "edit";

        EditingId =
            Category.maDanhMuc
            ?? Category.MaDanhMuc;


        ModalTitle.textContent =
            "Sửa danh mục";


        ModalDescription.textContent =
            "Cập nhật thông tin danh mục tin tức";


        SaveButtonText.textContent =
            "Lưu thay đổi";


        SaveCategoryButton.hidden =
            false;


        CategoryNameRequired.hidden =
            false;


        CategoryName.disabled =
            false;

        CategoryDescription.disabled =
            false;


        CategoryName.value =
            Category.tenDanhMuc
            ?? Category.TenDanhMuc
            ?? "";


        CategoryDescription.value =
            Category.moTa
            ?? Category.MoTa
            ?? "";


        CategoryNameError.textContent = "";

        CategoryName.classList.remove(
            "input-error"
        );


        updateDescriptionCount();


        openModal();

    }


    // =====================================================
    // OPEN MODAL
    // =====================================================

    function openModal() {

        CategoryModal.hidden = false;

        requestAnimationFrame(
            function () {

                CategoryModal.classList.add(
                    "show"
                );

            }
        );

    }


    // =====================================================
    // CLOSE MODAL
    // =====================================================

    function closeModal() {

        CategoryModal.classList.remove(
            "show"
        );


        setTimeout(
            function () {

                CategoryModal.hidden = true;

            },
            200
        );


        EditingId = null;

        CurrentMode = "add";


        CategoryName.disabled = false;

        CategoryDescription.disabled = false;

        SaveCategoryButton.hidden = false;

        CategoryNameRequired.hidden = false;

    }


    // =====================================================
    // SAVE
    // =====================================================

    async function saveCategory() {

        const Name =
            CategoryName.value.trim();


        const Description =
            CategoryDescription.value.trim();


        // VALIDATE

        if (Name === "") {

            CategoryNameError.textContent =
                "Tên danh mục không được để trống.";


            CategoryName.classList.add(
                "input-error"
            );


            CategoryName.focus();

            return;

        }


        if (Name.length > 100) {

            CategoryNameError.textContent =
                "Tên danh mục không được vượt quá 100 ký tự.";


            CategoryName.classList.add(
                "input-error"
            );


            return;

        }


        CategoryNameError.textContent = "";

        CategoryName.classList.remove(
            "input-error"
        );


        const Payload = {

            tenDanhMuc: Name,

            moTa:
                Description === ""
                    ? null
                    : Description

        };


        try {

            let Url = API_URL;

            let Method = "POST";


            if (CurrentMode === "edit") {

                Url =
                    `${API_URL}/${EditingId}`;

                Method = "PUT";

            }


            const Response =
                await fetch(
                    Url,
                    {
                        method: Method,
                        headers: getHeaders(),
                        body: JSON.stringify(
                            Payload
                        )
                    }
                );


            if (Response.status === 401) {

                showToast(
                    "error",
                    "Phiên đăng nhập",
                    "Phiên đăng nhập đã hết hạn."
                );

                return;

            }


            if (Response.status === 409) {

                showToast(
                    "error",
                    "Không thể lưu",
                    "Tên danh mục đã tồn tại."
                );

                return;

            }


            if (!Response.ok) {

                const ErrorText =
                    await Response.text();

                console.error(
                    ErrorText
                );

                throw new Error(
                    "Không thể lưu danh mục."
                );

            }


            closeModal();


            await loadCategories();


            if (Method === "POST") {

                showToast(
                    "success",
                    "Thêm thành công",
                    "Danh mục đã được thêm vào hệ thống."
                );

            } else {

                showToast(
                    "success",
                    "Cập nhật thành công",
                    "Thông tin danh mục đã được cập nhật."
                );

            }


        } catch (Error) {

            console.error(
                "Lỗi save:",
                Error
            );


            showToast(
                "error",
                "Lỗi",
                Error.message
            );

        }

    }


    // =====================================================
    // DELETE
    // =====================================================

    async function deleteCategory(Id) {

        const Category =
            Categories.find(
                function (Item) {

                    return (
                        (
                            Item.maDanhMuc
                            ?? Item.MaDanhMuc
                        ) == Id
                    );

                }
            );


        if (!Category) {

            return;

        }


        const Name =
            Category.tenDanhMuc
            ?? Category.TenDanhMuc
            ?? "";


        /*
         * KHÔNG DÙNG alert().
         *
         * Hiện confirm dạng giao diện riêng.
         */

        openDeleteConfirm(
            Id,
            Name
        );

    }


    // =====================================================
    // DELETE CONFIRM
    // =====================================================

    function openDeleteConfirm(Id, Name) {

        const Existing =
            document.getElementById(
                "deleteConfirmModal"
            );


        if (Existing) {

            Existing.remove();

        }


        const Modal =
            document.createElement("div");

        Modal.id =
            "deleteConfirmModal";

        Modal.className =
            "delete-confirm-modal";


        Modal.innerHTML = `

            <div class="delete-confirm-content">

                <div class="delete-confirm-icon">
                    !
                </div>

                <h3>
                    Xóa danh mục?
                </h3>

                <p>
                    Bạn có chắc muốn xóa danh mục
                    <strong>
                        ${escapeHtml(Name)}
                    </strong>
                    không?
                </p>

                <p class="delete-warning">
                    Thao tác này không thể hoàn tác.
                </p>

                <div class="delete-confirm-actions">

                    <button
                        type="button"
                        class="btn-cancel"
                        id="cancelDeleteButton">

                        Hủy

                    </button>

                    <button
                        type="button"
                        class="btn-delete-confirm"
                        id="confirmDeleteButton">

                        Xóa danh mục

                    </button>

                </div>

            </div>

        `;


        document.body.appendChild(
            Modal
        );


        requestAnimationFrame(
            function () {

                Modal.classList.add(
                    "show"
                );

            }
        );


        document
            .getElementById(
                "cancelDeleteButton"
            )
            .addEventListener(
                "click",
                function () {

                    closeDeleteConfirm(
                        Modal
                    );

                }
            );


        document
            .getElementById(
                "confirmDeleteButton"
            )
            .addEventListener(
                "click",
                async function () {

                    await performDelete(
                        Id,
                        Modal
                    );

                }
            );


        Modal.addEventListener(
            "click",
            function (Event) {

                if (
                    Event.target === Modal
                ) {

                    closeDeleteConfirm(
                        Modal
                    );

                }

            }
        );

    }


    // =====================================================
    // PERFORM DELETE
    // =====================================================

    async function performDelete(
        Id,
        Modal
    ) {

        const ConfirmButton =
            document.getElementById(
                "confirmDeleteButton"
            );


        ConfirmButton.disabled = true;

        ConfirmButton.textContent =
            "Đang xóa...";


        try {

            const Response =
                await fetch(
                    `${API_URL}/${Id}`,
                    {
                        method: "DELETE",
                        headers: getHeaders()
                    }
                );


            if (Response.status === 401) {

                closeDeleteConfirm(
                    Modal
                );

                showToast(
                    "error",
                    "Phiên đăng nhập",
                    "Phiên đăng nhập đã hết hạn."
                );

                return;

            }


            if (Response.status === 409) {

                closeDeleteConfirm(
                    Modal
                );

                showToast(
                    "error",
                    "Không thể xóa",
                    "Danh mục đang được sử dụng bởi tin tức."
                );

                return;

            }


            if (!Response.ok) {

                throw new Error(
                    "Không thể xóa danh mục."
                );

            }


            closeDeleteConfirm(
                Modal
            );


            await loadCategories();


            showToast(
                "success",
                "Xóa thành công",
                "Danh mục đã được xóa khỏi hệ thống."
            );


        } catch (Error) {

            console.error(
                "Lỗi xóa:",
                Error
            );


            closeDeleteConfirm(
                Modal
            );


            showToast(
                "error",
                "Không thể xóa",
                Error.message
            );

        }

    }


    // =====================================================
    // CLOSE DELETE
    // =====================================================

    function closeDeleteConfirm(Modal) {

        if (!Modal) {

            return;

        }


        Modal.classList.remove(
            "show"
        );


        setTimeout(
            function () {

                Modal.remove();

            },
            200
        );

    }


    // =====================================================
    // TOAST
    // =====================================================

    function showToast(
        Type,
        Title,
        Message
    ) {

        CategoryToast.classList.remove(
            "success",
            "error"
        );


        CategoryToast.classList.add(
            Type
        );


        CategoryToastTitle.textContent =
            Title;


        CategoryToastMessage.textContent =
            Message;


        if (Type === "success") {

            CategoryToastIcon.textContent =
                "✓";

        } else {

            CategoryToastIcon.textContent =
                "!";

        }


        CategoryToast.classList.add(
            "show"
        );


        setTimeout(
            function () {

                CategoryToast.classList.remove(
                    "show"
                );

            },
            3500
        );

    }


    // =====================================================
    // ESCAPE HTML
    // =====================================================

    function escapeHtml(Value) {

        return String(Value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    }


    // =====================================================
    // CHARACTER COUNT
    // =====================================================

    function updateDescriptionCount() {

        DescriptionCount.textContent =
            CategoryDescription.value.length;

    }


    // =====================================================
    // EVENT - ADD
    // =====================================================

    AddCategoryButton.addEventListener(
        "click",
        openAddModal
    );


    // =====================================================
    // EVENT - SEARCH
    // =====================================================

    SearchButton.addEventListener(
        "click",
        function () {

            applySearch(true);

        }
    );


    // ENTER SEARCH

    SearchCategory.addEventListener(
        "keydown",
        function (Event) {

            if (
                Event.key === "Enter"
            ) {

                Event.preventDefault();

                applySearch(true);

            }

        }
    );


    // =====================================================
    // EVENT - RESET
    // =====================================================

    ResetButton.addEventListener(
        "click",
        function () {

            SearchCategory.value = "";

            CurrentPage = 1;

            applySearch(false);

        }
    );


    // =====================================================
    // EVENT - MODAL
    // =====================================================

    CloseModalButton.addEventListener(
        "click",
        closeModal
    );


    CancelModalButton.addEventListener(
        "click",
        closeModal
    );


    // CLICK OUTSIDE MODAL

    CategoryModal.addEventListener(
        "click",
        function (Event) {

            if (
                Event.target === CategoryModal
            ) {

                closeModal();

            }

        }
    );


    // ESC

    document.addEventListener(
        "keydown",
        function (Event) {

            if (
                Event.key === "Escape"
            ) {

                if (
                    !CategoryModal.hidden
                ) {

                    closeModal();

                }

            }

        }
    );


    // =====================================================
    // EVENT - SAVE
    // =====================================================

    SaveCategoryButton.addEventListener(
        "click",
        saveCategory
    );


    // =====================================================
    // EVENT - DESCRIPTION
    // =====================================================

    CategoryDescription.addEventListener(
        "input",
        updateDescriptionCount
    );


    // =====================================================
    // EVENT - TABLE ACTION
    // =====================================================

    CategoryTableBody.addEventListener(
        "click",
        function (Event) {

            const Button =
                Event.target.closest(
                    "[data-action]"
                );


            if (!Button) {

                return;

            }


            const Action =
                Button.dataset.action;


            const Id =
                Button.dataset.id;


            const Category =
                Categories.find(
                    function (Item) {

                        return (
                            (
                                Item.maDanhMuc
                                ?? Item.MaDanhMuc
                            ) == Id
                        );

                    }
                );


            if (!Category) {

                return;

            }


            if (Action === "view") {

                openViewModal(
                    Category
                );

            }


            if (Action === "edit") {

                openEditModal(
                    Category
                );

            }


            if (Action === "delete") {

                deleteCategory(
                    Id
                );

            }

        }
    );


    // =====================================================
    // CLOSE TOAST
    // =====================================================

    CloseCategoryToast.addEventListener(
        "click",
        function () {

            CategoryToast.classList.remove(
                "show"
            );

        }
    );


    // =====================================================
    // LOAD
    // =====================================================

    loadCategories();

});