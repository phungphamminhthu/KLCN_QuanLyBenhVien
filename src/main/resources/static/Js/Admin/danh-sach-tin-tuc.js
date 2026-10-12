document.addEventListener("DOMContentLoaded", function () {

    /* =====================================================
       CONFIG
    ====================================================== */

    const NEWS_API = "/api/tin-tuc";
    const CATEGORY_API = "/api/danh-muc-tin-tuc";
    const PAGE_SIZE = 5;


    /* =====================================================
       STATE
    ====================================================== */

    let allNews = [];
    let filteredNews = [];
    let allCategories = [];
    let currentPage = 1;
    let toastTimer = null;


    /* =====================================================
       DOM
    ====================================================== */

    const addNewsButton =
        document.getElementById("addNewsButton");

    const newsTableBody =
        document.getElementById("newsTableBody");

    const tableResult =
        document.getElementById("tableResult");

    const pagination =
        document.getElementById("pagination");

    const keywordInput =
        document.getElementById("keywordInput");

    const categoryFilter =
        document.getElementById("categoryFilter");

    const statusFilter =
        document.getElementById("statusFilter");

    const searchButton =
        document.getElementById("searchButton");

    const resetButton =
        document.getElementById("resetButton");


    /* =====================================================
       TOKEN
    ====================================================== */

    function getToken() {

        return localStorage.getItem("Token")
            || sessionStorage.getItem("Token")
            || "";

    }


    function getHeaders() {

        const token = getToken();

        const headers = {
            "Content-Type": "application/json"
        };

        if (token) {

            headers.Authorization =
                "Bearer " + token;

        }

        return headers;

    }


    function redirectLogin() {

        window.location.href =
            "/auth/login";

    }


    /* =====================================================
       LOAD CATEGORY
    ====================================================== */

    async function loadCategories() {

        try {

            const response =
                await fetch(
                    CATEGORY_API,
                    {
                        method: "GET",
                        headers: getHeaders()
                    }
                );


            if (
                response.status ===
                401
            ) {

                redirectLogin();

                return;

            }


            if (!response.ok) {

                throw new Error(
                    "Không thể tải danh mục."
                );

            }


            const data =
                await response.json();


            allCategories =
                Array.isArray(data)
                    ? data
                    : data.data
                    || data.content
                    || [];


            renderCategoryFilter();


        }
        catch (error) {

            console.error(
                "Lỗi load category:",
                error
            );


            showToast(
                "Lỗi",
                "Không thể tải danh mục tin tức.",
                "error"
            );

        }

    }


    /* =====================================================
       CATEGORY FILTER
    ====================================================== */

    function renderCategoryFilter() {

        if (!categoryFilter) {

            return;

        }


        categoryFilter.innerHTML = `

            <option value="">
                Tất cả danh mục
            </option>

        `;


        allCategories.forEach(
            function (category) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    category.maDanhMuc;


                option.textContent =
                    category.tenDanhMuc
                    || "";


                categoryFilter.appendChild(
                    option
                );

            }
        );

    }


    /* =====================================================
       GET CATEGORY NAME
    ====================================================== */

    function getCategoryName(
        maDanhMuc
    ) {

        const category =
            allCategories.find(
                function (item) {

                    return String(
                        item.maDanhMuc
                    )
                    ===
                    String(
                        maDanhMuc
                    );

                }
            );


        return category
            ? category.tenDanhMuc
            : "—";

    }


    /* =====================================================
       LOAD NEWS
    ====================================================== */

    async function loadNews() {

        try {

            const response =
                await fetch(
                    NEWS_API,
                    {
                        method: "GET",
                        headers: getHeaders()
                    }
                );


            if (
                response.status ===
                401
            ) {

                redirectLogin();

                return;

            }


            if (!response.ok) {

                throw new Error(
                    "Không thể tải danh sách tin tức."
                );

            }


            const data =
                await response.json();


            allNews =
                Array.isArray(data)
                    ? data
                    : data.data
                    || data.content
                    || [];


            /*
             * Sắp xếp theo mã tin tức
             * tăng dần.
             */

            allNews.sort(
                function (a, b) {

                    return Number(
                        a.maTinTuc
                    )
                    -
                    Number(
                        b.maTinTuc
                    );

                }
            );


            applyFilters();


        }
        catch (error) {

            console.error(
                "Lỗi load news:",
                error
            );


            allNews = [];

            applyFilters();


            showToast(
                "Lỗi",
                "Không thể tải danh sách tin tức.",
                "error"
            );

        }

    }


    /* =====================================================
       FILTER
    ====================================================== */

    function applyFilters() {

        const keyword =
            keywordInput
                ? keywordInput.value
                    .trim()
                    .toLowerCase()
                : "";


        const selectedCategory =
            categoryFilter
                ? categoryFilter.value
                : "";


        const selectedStatus =
            statusFilter
                ? statusFilter.value
                : "";


        filteredNews =
            allNews.filter(
                function (news) {

                    const maTinTuc =
                        String(
                            news.maTinTuc
                            ?? ""
                        )
                        .toLowerCase();


                    const tieuDe =
                        String(
                            news.tieuDe
                            ?? ""
                        )
                        .toLowerCase();


                    const noiDung =
                        stripHtml(
                            news.noiDung
                            ?? ""
                        )
                        .toLowerCase();


                    const tenDanhMuc =
                        String(
                            getCategoryName(
                                news.maDanhMuc
                            )
                        )
                        .toLowerCase();


                    const matchKeyword =
                        !keyword
                        ||
                        maTinTuc.includes(
                            keyword
                        )
                        ||
                        tieuDe.includes(
                            keyword
                        )
                        ||
                        noiDung.includes(
                            keyword
                        )
                        ||
                        tenDanhMuc.includes(
                            keyword
                        );


                    const matchCategory =
                        !selectedCategory
                        ||
                        String(
                            news.maDanhMuc
                        )
                        ===
                        String(
                            selectedCategory
                        );


                    const matchStatus =
                        !selectedStatus
                        ||
                        String(
                            news.trangThai
                            ?? ""
                        )
                        ===
                        String(
                            selectedStatus
                        );


                    return (
                        matchKeyword
                        &&
                        matchCategory
                        &&
                        matchStatus
                    );

                }
            );


        currentPage = 1;


        renderTable();

    }


    /* =====================================================
       RENDER TABLE
    ====================================================== */

    function renderTable() {

        if (!newsTableBody) {

            return;

        }


        newsTableBody.innerHTML = "";


        const total =
            filteredNews.length;


        /*
         * KHÔNG CÓ DỮ LIỆU
         */

        if (total === 0) {

            newsTableBody.innerHTML = `

                <tr>

                    <td
                        colspan="6"
                        style="
                            text-align:center;
                            padding:50px;
                            color:#94a3b8;
                        ">

                        Không có bài viết nào

                    </td>

                </tr>

            `;


            if (tableResult) {

                tableResult.textContent =
                    "Hiển thị 0 - 0 trong tổng số 0 bài viết";

            }


            if (pagination) {

                pagination.innerHTML = "";

            }


            return;

        }


        const totalPages =
            Math.ceil(
                total /
                PAGE_SIZE
            );


        if (
            currentPage >
            totalPages
        ) {

            currentPage =
                totalPages;

        }


        const startIndex =
            (currentPage - 1)
            *
            PAGE_SIZE;


        const endIndex =
            Math.min(
                startIndex
                +
                PAGE_SIZE,
                total
            );


        const pageData =
            filteredNews.slice(
                startIndex,
                endIndex
            );


        /*
         * RENDER ROW
         */

        pageData.forEach(
            function (news, index) {

                const row =
                    document.createElement(
                        "tr"
                    );


                const categoryName =
                    getCategoryName(
                        news.maDanhMuc
                    );


                const stt =
                    startIndex
                    +
                    index
                    +
                    1;


                row.innerHTML = `

                    <td class="col-stt">
                        ${stt}
                    </td>


                    <td>

                        <div
                            class="news-title"
                            title="${escapeHtml(
                                news.tieuDe
                                || ""
                            )}">

                            ${escapeHtml(
                                news.tieuDe
                                || "—"
                            )}

                        </div>

                    </td>


                    <td>

                        ${escapeHtml(
                            categoryName
                            || "—"
                        )}

                    </td>


                    <td>

                        ${formatDate(
                            news.ngayDang
                        )}

                    </td>


                    <td>

                        ${renderStatus(
                            news.trangThai
                        )}

                    </td>


                    <td class="col-action">

                        <div class="action-buttons">

                            <button
                                type="button"
                                class="action-button view"
                                title="Xem"
                                onclick="viewNews(${news.maTinTuc})">

                                👁

                            </button>


                            <button
                                type="button"
                                class="action-button edit"
                                title="Sửa"
                                onclick="editNews(${news.maTinTuc})">

                                ✎

                            </button>


                            <button
                                type="button"
                                class="action-button delete"
                                title="Xóa"
                                onclick="deleteNews(${news.maTinTuc})">

                                🗑

                            </button>

                        </div>

                    </td>

                `;


                newsTableBody.appendChild(
                    row
                );

            }
        );


        if (tableResult) {

            tableResult.textContent =
                `Hiển thị ${startIndex + 1} - ${endIndex} trong tổng số ${total} bài viết`;

        }


        renderPagination(
            totalPages
        );

    }


    /* =====================================================
       PAGINATION
    ====================================================== */

    function renderPagination(
        totalPages
    ) {

        if (!pagination) {

            return;

        }


        pagination.innerHTML = "";


        if (
            totalPages <= 1
        ) {

            return;

        }


        /*
         * PREVIOUS
         */

        const previousButton =
            document.createElement(
                "button"
            );


        previousButton.type =
            "button";


        previousButton.className =
            "page-button";


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

                }

            }
        );


        pagination.appendChild(
            previousButton
        );


        /*
         * PAGE NUMBER
         */

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
                "page-button";


            if (
                page ===
                currentPage
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


            pagination.appendChild(
                pageButton
            );

        }


        /*
         * NEXT
         */

        const nextButton =
            document.createElement(
                "button"
            );


        nextButton.type =
            "button";


        nextButton.className =
            "page-button";


        nextButton.innerHTML =
            "›";


        nextButton.disabled =
            currentPage ===
            totalPages;


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


    /* =====================================================
       SEARCH
    ====================================================== */

    if (searchButton) {

        searchButton.addEventListener(
            "click",
            applyFilters
        );

    }


    if (keywordInput) {

        keywordInput.addEventListener(
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


    if (categoryFilter) {

        categoryFilter.addEventListener(
            "change",
            applyFilters
        );

    }


    if (statusFilter) {

        statusFilter.addEventListener(
            "change",
            applyFilters
        );

    }


    /* =====================================================
       RESET
    ====================================================== */

    if (resetButton) {

        resetButton.addEventListener(
            "click",
            function () {

                if (keywordInput) {

                    keywordInput.value =
                        "";

                }


                if (categoryFilter) {

                    categoryFilter.value =
                        "";

                }


                if (statusFilter) {

                    statusFilter.value =
                        "";

                }


                currentPage = 1;


                applyFilters();

            }
        );

    }


    /* =====================================================
       ADD NEWS
    ====================================================== */

    if (addNewsButton) {

        addNewsButton.addEventListener(
            "click",
            function () {

                window.location.href =
                    "/Admin/them-tin-tuc";

            }
        );

    }


    /* =====================================================
       EDIT NEWS
    ====================================================== */

    window.editNews =
        function (id) {

            window.location.href =
                "/Admin/them-tin-tuc?id="
                +
                encodeURIComponent(id);

        };


    /* =====================================================
       VIEW NEWS
    ====================================================== */

    window.viewNews =
        function (id) {

            const news =
                allNews.find(
                    function (item) {

                        return String(
                            item.maTinTuc
                        )
                        ===
                        String(id);

                    }
                );


            if (!news) {

                showToast(
                    "Lỗi",
                    "Không tìm thấy bài viết.",
                    "error"
                );

                return;

            }


            const categoryName =
                getCategoryName(
                    news.maDanhMuc
                );


            const imageHtml =
                news.imageURL
                    ?
                    `
                        <img
                            src="/api/images/view?fileKey=${encodeURIComponent(
                                news.imageURL
                            )}"
                            alt="Ảnh bài viết"
                            style="
                                width:100%;
                                max-height:350px;
                                object-fit:contain;
                                margin-bottom:24px;
                                border-radius:12px;
                            ">
                    `
                    :
                    "";


            const popup =
                window.open(
                    "",
                    "_blank",
                    "width=900,height=700"
                );


            if (!popup) {

                showToast(
                    "Lỗi",
                    "Trình duyệt đang chặn cửa sổ mới.",
                    "error"
                );

                return;

            }


            popup.document.write(`

                <!DOCTYPE html>

                <html lang="vi">

                <head>

                    <meta charset="UTF-8">

                    <title>
                        ${escapeHtml(
                            news.tieuDe
                            ||
                            "Tin tức"
                        )}
                    </title>

                    <style>

                        body {

                            max-width:
                                900px;

                            margin:
                                0 auto;

                            padding:
                                40px;

                            font-family:
                                Arial,
                                sans-serif;

                            color:
                                #1e293b;

                            line-height:
                                1.7;

                        }

                        h1 {

                            font-size:
                                32px;

                            margin-bottom:
                                10px;

                        }

                        .meta {

                            color:
                                #64748b;

                            margin-bottom:
                                30px;

                        }

                        .content img {

                            max-width:
                                100%;

                            height:
                                auto;

                        }

                        .content a {

                            color:
                                #2563eb;

                        }

                    </style>

                </head>


                <body>

                    <h1>

                        ${escapeHtml(
                            news.tieuDe
                            || ""
                        )}

                    </h1>


                    <div class="meta">

                        ${escapeHtml(
                            categoryName
                            || ""
                        )}

                        ·

                        ${formatDate(
                            news.ngayDang
                        )}

                    </div>


                    ${imageHtml}


                    <div class="content">

                        ${news.noiDung || ""}

                    </div>

                </body>

                </html>

            `);


            popup.document.close();

        };


    /* =====================================================
       DELETE NEWS
       GIỐNG DANH-MUC-TIN-TUC.JS
    ====================================================== */

    window.deleteNews =
        function (id) {

            const news =
                allNews.find(
                    function (item) {

                        return String(
                            item.maTinTuc
                        )
                        ===
                        String(id);

                    }
                );


            if (!news) {

                showToast(
                    "Lỗi",
                    "Không tìm thấy bài viết.",
                    "error"
                );

                return;

            }


            const title =
                news.tieuDe
                ??
                "";


            openDeleteConfirm(
                id,
                title
            );

        };


    /* =====================================================
       DELETE CONFIRM
    ====================================================== */

    function openDeleteConfirm(
        Id,
        Title
    ) {

        const Existing =
            document.getElementById(
                "deleteConfirmModal"
            );


        if (Existing) {

            Existing.remove();

        }


        const Modal =
            document.createElement(
                "div"
            );


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
                    Xóa tin tức?

                </h3>


                <p>

                    Bạn có chắc muốn xóa tin tức
                    <strong>
                        ${escapeHtml(
                            Title
                        )}
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

                        Xóa tin tức

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


        const cancelButton =
            document.getElementById(
                "cancelDeleteButton"
            );


        const confirmButton =
            document.getElementById(
                "confirmDeleteButton"
            );


        /*
         * HỦY
         */

        if (cancelButton) {

            cancelButton.addEventListener(
                "click",
                function () {

                    closeDeleteConfirm(
                        Modal
                    );

                }
            );

        }


        /*
         * XÓA
         */

        if (confirmButton) {

            confirmButton.addEventListener(
                "click",
                async function () {

                    await performDelete(
                        Id,
                        Modal
                    );

                }
            );

        }


        /*
         * CLICK RA NGOÀI
         */

        Modal.addEventListener(
            "click",
            function (Event) {

                if (
                    Event.target ===
                    Modal
                ) {

                    closeDeleteConfirm(
                        Modal
                    );

                }

            }
        );


        /*
         * ESC
         */

        document.addEventListener(
            "keydown",
            handleDeleteEscape
        );

    }


    /* =====================================================
       ESC DELETE MODAL
    ====================================================== */

    function handleDeleteEscape(
        Event
    ) {

        if (
            Event.key !==
            "Escape"
        ) {

            return;

        }


        const Modal =
            document.getElementById(
                "deleteConfirmModal"
            );


        if (Modal) {

            closeDeleteConfirm(
                Modal
            );

        }

    }


    /* =====================================================
       CLOSE DELETE CONFIRM
    ====================================================== */

    function closeDeleteConfirm(
        Modal
    ) {

        if (!Modal) {

            return;

        }


        document.removeEventListener(
            "keydown",
            handleDeleteEscape
        );


        Modal.classList.remove(
            "show"
        );


        setTimeout(
            function () {

                if (
                    Modal.parentNode
                ) {

                    Modal.remove();

                }

            },
            200
        );

    }


    /* =====================================================
       PERFORM DELETE
    ====================================================== */

    async function performDelete(
        Id,
        Modal
    ) {

        const ConfirmButton =
            document.getElementById(
                "confirmDeleteButton"
            );


        if (ConfirmButton) {

            ConfirmButton.disabled =
                true;

            ConfirmButton.textContent =
                "Đang xóa...";

        }


        try {

            const Response =
                await fetch(
                    `${NEWS_API}/${Id}`,
                    {
                        method: "DELETE",
                        headers: getHeaders()
                    }
                );


            /*
             * 401
             */

            if (
                Response.status ===
                401
            ) {

                closeDeleteConfirm(
                    Modal
                );

                redirectLogin();

                return;

            }


            /*
             * 403
             */

            if (
                Response.status ===
                403
            ) {

                closeDeleteConfirm(
                    Modal
                );


                showToast(
                    "Không có quyền",
                    "Bạn không có quyền xóa tin tức.",
                    "error"
                );


                return;

            }


            /*
             * LỖI KHÁC
             */

            if (!Response.ok) {

                let ErrorMessage =
                    "Không thể xóa tin tức.";


                try {

                    const ErrorData =
                        await Response.json();


                    ErrorMessage =
                        ErrorData.message
                        ||
                        ErrorData.error
                        ||
                        ErrorMessage;

                }
                catch (Error) {

                    console.error(
                        "Không đọc được lỗi API:",
                        Error
                    );

                }


                throw new Error(
                    ErrorMessage
                );

            }


            /*
             * THÀNH CÔNG
             */

            closeDeleteConfirm(
                Modal
            );


            await loadNews();


            showToast(
                "Thành công",
                "Tin tức đã được xóa khỏi hệ thống.",
                "success"
            );


        }
        catch (Error) {

            console.error(
                "Lỗi xóa tin tức:",
                Error
            );


            closeDeleteConfirm(
                Modal
            );


            showToast(
                "Lỗi",
                Error.message
                ||
                "Không thể xóa tin tức.",
                "error"
            );

        }

    }


    /* =====================================================
       TOAST
    ====================================================== */

    function ensureToast() {

        let toast =
            document.getElementById(
                "newsToast"
            );


        if (toast) {

            return toast;

        }


        toast =
            document.createElement(
                "div"
            );


        toast.id =
            "newsToast";


        toast.className =
            "news-toast";


        toast.innerHTML = `

            <div
                id="newsToastIcon"
                class="toast-icon">

                ✓

            </div>


            <div class="toast-content">

                <strong
                    id="newsToastTitle">

                    Thành công

                </strong>


                <span
                    id="newsToastMessage">

                </span>

            </div>


            <button
                type="button"
                id="newsToastClose"
                class="toast-close">

                ×

            </button>

        `;


        document.body.appendChild(
            toast
        );


        const closeButton =
            document.getElementById(
                "newsToastClose"
            );


        if (closeButton) {

            closeButton.addEventListener(
                "click",
                function () {

                    toast.classList.remove(
                        "show"
                    );

                }
            );

        }


        return toast;

    }


    function showToast(
        title,
        message,
        type
    ) {

        const toast =
            ensureToast();


        const icon =
            document.getElementById(
                "newsToastIcon"
            );


        const titleElement =
            document.getElementById(
                "newsToastTitle"
            );


        const messageElement =
            document.getElementById(
                "newsToastMessage"
            );


        if (titleElement) {

            titleElement.textContent =
                title
                ||
                "Thông báo";

        }


        if (messageElement) {

            messageElement.textContent =
                message
                ||
                "";

        }


        if (icon) {

            if (
                type ===
                "error"
            ) {

                icon.textContent =
                    "!";

                icon.style.background =
                    "#fee2e2";

                icon.style.color =
                    "#dc2626";

            }
            else {

                icon.textContent =
                    "✓";

                icon.style.background =
                    "#dcfce7";

                icon.style.color =
                    "#16a34a";

            }

        }


        toast.classList.remove(
            "error",
            "success"
        );


        toast.classList.add(
            type === "error"
                ? "error"
                : "success"
        );


        toast.classList.add(
            "show"
        );


        clearTimeout(
            toastTimer
        );


        toastTimer =
            setTimeout(
                function () {

                    toast.classList.remove(
                        "show"
                    );

                },
                3000
            );

    }


    /* =====================================================
       FORMAT DATE
    ====================================================== */

    function formatDate(
        value
    ) {

        if (!value) {

            return "—";

        }


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return String(
                value
            );

        }


        const day =
            String(
                date.getDate()
            )
            .padStart(
                2,
                "0"
            );


        const month =
            String(
                date.getMonth() + 1
            )
            .padStart(
                2,
                "0"
            );


        const year =
            date.getFullYear();


        return (
            `${day}/${month}/${year}`
        );

    }


    /* =====================================================
       STATUS
    ====================================================== */

    function renderStatus(
        status
    ) {

        if (
            status ===
            "Đang hiển thị"
        ) {

            return `

                <span
                    class="status-badge status-visible">

                    Đang hiển thị

                </span>

            `;

        }


        if (
            status ===
            "Ẩn"
        ) {

            return `

                <span
                    class="status-badge status-hidden">

                    Ẩn

                </span>

            `;

        }


        return `

            <span
                class="status-badge status-hidden">

                ${escapeHtml(
                    status
                    ||
                    "Không xác định"
                )}

            </span>

        `;

    }


    /* =====================================================
       STRIP HTML
    ====================================================== */

    function stripHtml(
        html
    ) {

        const temp =
            document.createElement(
                "div"
            );


        temp.innerHTML =
            html
            ||
            "";


        return (
            temp.textContent
            ||
            temp.innerText
            ||
            ""
        );

    }


    /* =====================================================
       ESCAPE HTML
    ====================================================== */

    function escapeHtml(
        value
    ) {

        return String(
            value
            ??
            ""
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




    /* =====================================================
       INITIALIZE
    ====================================================== */

    async function init() {

        await loadCategories();

        await loadNews();

    }


    init();

});