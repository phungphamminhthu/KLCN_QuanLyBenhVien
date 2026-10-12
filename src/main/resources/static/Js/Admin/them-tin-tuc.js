document.addEventListener("DOMContentLoaded", function () {

    // =====================================================
    // CONFIG
    // =====================================================

    const NEWS_API = "/api/tin-tuc";
    const CATEGORY_API = "/api/danh-muc-tin-tuc";
    const IMAGE_API = "/api/images/upload";


    // =====================================================
    // DOM - PAGE
    // =====================================================

    const pageTitle =
        document.getElementById("pageTitle");

    const editorTitle =
        document.getElementById("editorTitle");

    const breadcrumbTitle =
        document.getElementById("breadcrumbTitle");

    const cancelNewsButton =
        document.getElementById("cancelNewsButton");

    const saveNewsButton =
        document.getElementById("saveNewsButton");


    // =====================================================
    // DOM - FORM
    // =====================================================

    const newsTitle =
        document.getElementById("newsTitle");

    const newsTitleError =
        document.getElementById("newsTitleError");

    const newsCategory =
        document.getElementById("newsCategory");

    const newsCategoryError =
        document.getElementById("newsCategoryError");

    const newsStatus =
        document.getElementById("newsStatus");

    const newsContent =
        document.getElementById("newsContent");

    const newsContentError =
        document.getElementById("newsContentError");


    // =====================================================
    // DOM - IMAGE
    // =====================================================

    const newsImageInput =
        document.getElementById("newsImageInput");

    const imageUploadBox =
        document.getElementById("imageUploadBox");

    const imageUploadPlaceholder =
        document.getElementById(
            "imageUploadPlaceholder"
        );

    const imagePreviewWrapper =
        document.getElementById(
            "imagePreviewWrapper"
        );

    const newsImagePreview =
        document.getElementById(
            "newsImagePreview"
        );

    const removeNewsImage =
        document.getElementById(
            "removeNewsImage"
        );


    // =====================================================
    // DOM - LINK
    // =====================================================

    const linkModal =
        document.getElementById("linkModal");

    const linkUrl =
        document.getElementById("linkUrl");

    const linkUrlError =
        document.getElementById("linkUrlError");

    const closeLinkModal =
        document.getElementById(
            "closeLinkModal"
        );

    const cancelLinkButton =
        document.getElementById(
            "cancelLinkButton"
        );

    const insertLinkButton =
        document.getElementById(
            "insertLinkButton"
        );


    // =====================================================
    // DOM - TOAST
    // =====================================================

    const newsToast =
        document.getElementById("newsToast");

    const newsToastTitle =
        document.getElementById(
            "newsToastTitle"
        );

    const newsToastMessage =
        document.getElementById(
            "newsToastMessage"
        );

    const newsToastIcon =
        document.getElementById(
            "newsToastIcon"
        );

    const closeNewsToast =
        document.getElementById(
            "closeNewsToast"
        );


    // =====================================================
    // STATE
    // =====================================================

    let allCategories = [];

    let editingNewsId = null;

    let currentImageFileKey = null;

    let savedEditorRange = null;

    let savedLinkRange = null;

    let normalizeTimer = null;


    // =====================================================
    // TOKEN
    // =====================================================

    function getToken() {

        return (
            localStorage.getItem("Token")
            ||
            sessionStorage.getItem("Token")
            ||
            ""
        );

    }


    // =====================================================
    // REQUEST HEADERS
    // =====================================================

    function getHeaders() {

        const token =
            getToken();


        const headers = {
            "Content-Type": "application/json"
        };


        if (token) {

            headers["Authorization"] =
                "Bearer " + token;

        }


        return headers;

    }


    // =====================================================
    // REDIRECT LOGIN
    // =====================================================

    function redirectLogin() {

        window.location.href =
            "/auth/login";

    }


    // =====================================================
    // LOAD CATEGORY
    // =====================================================

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


            if (response.status === 401) {

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
                    : (
                        data.data
                        ||
                        data.content
                        ||
                        []
                    );


            renderCategories();


        } catch (error) {

            console.error(
                "Lỗi tải danh mục:",
                error
            );


            showToast(
                "Lỗi",
                "Không thể tải danh mục tin tức.",
                "error"
            );

        }

    }


    // =====================================================
    // RENDER CATEGORY
    // =====================================================

    function renderCategories() {

        if (!newsCategory) {
            return;
        }


        newsCategory.innerHTML = `
            <option value="">
                Chọn danh mục
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
                    category.tenDanhMuc || "";


                newsCategory.appendChild(
                    option
                );

            }
        );

    }


    // =====================================================
    // GET NEWS ID
    // =====================================================

    function getNewsIdFromUrl() {

        const params =
            new URLSearchParams(
                window.location.search
            );


        const id =
            params.get("id");


        if (!id) {
            return null;
        }


        const numberId =
            Number(id);


        if (
            !Number.isInteger(
                numberId
            )
        ) {

            return null;

        }


        return numberId;

    }


    // =====================================================
    // LOAD NEWS DETAIL
    // =====================================================

    async function loadNewsDetail(id) {

        try {

            const response =
                await fetch(
                    `${NEWS_API}/${id}`,
                    {
                        method: "GET",
                        headers: getHeaders()
                    }
                );


            if (response.status === 401) {

                redirectLogin();

                return;

            }


            if (!response.ok) {

                throw new Error(
                    "Không thể tải thông tin tin tức."
                );

            }


            const news =
                await response.json();


            fillNewsForm(
                news
            );


        } catch (error) {

            console.error(
                "Lỗi tải tin tức:",
                error
            );


            showToast(
                "Lỗi",
                "Không thể tải thông tin bài viết.",
                "error"
            );

        }

    }


    // =====================================================
    // FILL NEWS FORM
    // =====================================================

    function fillNewsForm(news) {

        if (!news) {
            return;
        }


        // -------------------------------------------------
        // TITLE
        // -------------------------------------------------

        if (newsTitle) {

            newsTitle.value =
                news.tieuDe || "";

        }


        // -------------------------------------------------
        // CATEGORY
        // -------------------------------------------------

        if (newsCategory) {

            newsCategory.value =
                news.maDanhMuc || "";

        }


        // -------------------------------------------------
        // STATUS
        // -------------------------------------------------

        if (newsStatus) {

            newsStatus.value =
                news.trangThai
                ||
                "Đang hiển thị";

        }


        // -------------------------------------------------
        // CONTENT
        // -------------------------------------------------

        if (newsContent) {

            newsContent.innerHTML =
                news.noiDung || "";


            /*
             * Sau khi load bài cũ,
             * tính lại số thứ tự.
             */

            normalizeOrderedListNumbers();

        }


        // -------------------------------------------------
        // IMAGE
        // -------------------------------------------------

        currentImageFileKey =
            news.imageURL || null;


        if (
            currentImageFileKey
            &&
            newsImagePreview
            &&
            imagePreviewWrapper
            &&
            imageUploadPlaceholder
        ) {

            newsImagePreview.src =
                "/api/images/view?fileKey="
                +
                encodeURIComponent(
                    currentImageFileKey
                );


            imagePreviewWrapper.hidden =
                false;


            imageUploadPlaceholder.hidden =
                true;

        }


        // -------------------------------------------------
        // PAGE TITLE
        // -------------------------------------------------

        if (pageTitle) {

            pageTitle.textContent =
                "Sửa tin tức";

        }


        if (editorTitle) {

            editorTitle.textContent =
                "Sửa tin tức";

        }


        if (breadcrumbTitle) {

            breadcrumbTitle.textContent =
                "Sửa tin tức";

        }

    }


    // =====================================================
    // IMAGE UPLOAD BOX
    // =====================================================

    if (imageUploadBox) {

        imageUploadBox.addEventListener(
            "click",
            function (event) {

                if (
                    event.target.closest(
                        "#removeNewsImage"
                    )
                ) {

                    return;

                }


                if (newsImageInput) {

                    newsImageInput.click();

                }

            }
        );

    }


    // =====================================================
    // IMAGE SELECT
    // =====================================================

    if (newsImageInput) {

        newsImageInput.addEventListener(
            "change",
            async function () {

                const file =
                    this.files[0];


                if (!file) {
                    return;
                }


                // -------------------------------------------------
                // TYPE
                // -------------------------------------------------

                const allowedTypes = [
                    "image/jpeg",
                    "image/png",
                    "image/webp"
                ];


                if (
                    !allowedTypes.includes(
                        file.type
                    )
                ) {

                    showToast(
                        "Lỗi",
                        "Chỉ hỗ trợ JPG, PNG và WEBP.",
                        "error"
                    );


                    this.value = "";

                    return;

                }


                // -------------------------------------------------
                // SIZE
                // -------------------------------------------------

                if (
                    file.size >
                    5 * 1024 * 1024
                ) {

                    showToast(
                        "Lỗi",
                        "Kích thước ảnh tối đa là 5MB.",
                        "error"
                    );


                    this.value = "";

                    return;

                }


                await uploadNewsImage(
                    file
                );

            }
        );

    }


    // =====================================================
    // UPLOAD IMAGE TO R2
    // =====================================================

    async function uploadNewsImage(file) {

        try {

            const token =
                getToken();


            const formData =
                new FormData();


            formData.append(
                "file",
                file
            );


            const headers = {};


            if (token) {

                headers["Authorization"] =
                    "Bearer " + token;

            }


            const response =
                await fetch(
                    IMAGE_API,
                    {
                        method: "POST",
                        headers: headers,
                        body: formData
                    }
                );


            if (response.status === 401) {

                redirectLogin();

                return;

            }


            if (!response.ok) {

                throw new Error(
                    "Upload ảnh thất bại."
                );

            }


            const data =
                await response.json();


            currentImageFileKey =
                data.fileKey
                ||
                data.objectKey
                ||
                data.key;


            if (!currentImageFileKey) {

                throw new Error(
                    "Không nhận được fileKey từ server."
                );

            }


            if (newsImagePreview) {

                newsImagePreview.src =
                    "/api/images/view?fileKey="
                    +
                    encodeURIComponent(
                        currentImageFileKey
                    );

            }


            if (imageUploadPlaceholder) {

                imageUploadPlaceholder.hidden =
                    true;

            }


            if (imagePreviewWrapper) {

                imagePreviewWrapper.hidden =
                    false;

            }


            showToast(
                "Thành công",
                "Đã tải ảnh lên.",
                "success"
            );


        } catch (error) {

            console.error(
                "Lỗi upload ảnh:",
                error
            );


            showToast(
                "Lỗi",
                "Không thể tải hình ảnh lên.",
                "error"
            );


            if (newsImageInput) {

                newsImageInput.value =
                    "";

            }

        }

    }


    // =====================================================
    // REMOVE IMAGE
    // =====================================================

    if (removeNewsImage) {

        removeNewsImage.addEventListener(
            "click",
            function (event) {

                event.stopPropagation();


                currentImageFileKey =
                    null;


                if (newsImageInput) {

                    newsImageInput.value =
                        "";

                }


                if (newsImagePreview) {

                    newsImagePreview.src =
                        "";

                }


                if (imagePreviewWrapper) {

                    imagePreviewWrapper.hidden =
                        true;

                }


                if (imageUploadPlaceholder) {

                    imageUploadPlaceholder.hidden =
                        false;

                }

            }
        );

    }


    // =====================================================
    // EDITOR SELECTION
    // =====================================================

    function saveEditorSelection() {

        if (!newsContent) {
            return;
        }


        const selection =
            window.getSelection();


        if (
            !selection
            ||
            !selection.rangeCount
        ) {

            return;

        }


        const range =
            selection.getRangeAt(0);


        if (
            newsContent.contains(
                range.commonAncestorContainer
            )
            ||
            range.commonAncestorContainer ===
            newsContent
        ) {

            savedEditorRange =
                range.cloneRange();

        }

    }


    // =====================================================
    // RESTORE EDITOR SELECTION
    // =====================================================

    function restoreEditorSelection() {

        if (!newsContent) {
            return;
        }


        newsContent.focus();


        if (!savedEditorRange) {
            return;
        }


        const selection =
            window.getSelection();


        selection.removeAllRanges();


        selection.addRange(
            savedEditorRange
        );

    }


    // =====================================================
    // TOOLBAR BUTTON
    // =====================================================

    document
        .querySelectorAll(
            ".editor-toolbar button"
        )
        .forEach(function (button) {

            button.addEventListener(
                "mousedown",
                function (event) {

                    event.preventDefault();

                    saveEditorSelection();

                }
            );


            button.addEventListener(
                "click",
                function () {

                    const command =
                        this.dataset.command;


                    // ==========================================
                    // LINK
                    // ==========================================

                    if (
                        command ===
                        "createLink"
                    ) {

                        openLinkModal();

                        return;

                    }


                    // ==========================================
                    // RESTORE SELECTION
                    // ==========================================

                    restoreEditorSelection();


                    // ==========================================
                    // EXECUTE COMMAND
                    // ==========================================

                    document.execCommand(
                        command,
                        false,
                        null
                    );


                    newsContent.focus();


                    // ==========================================
                    // NUMBERING
                    // ==========================================

                    if (
                        command ===
                        "insertOrderedList"
                    ) {

                        setTimeout(
                            function () {

                                normalizeOrderedListNumbers();

                            },
                            10
                        );

                    }


                    // ==========================================
                    // BULLET
                    // ==========================================

                    if (
                        command ===
                        "insertUnorderedList"
                    ) {

                        setTimeout(
                            function () {

                                normalizeOrderedListNumbers();

                            },
                            10
                        );

                    }


                    saveEditorSelection();

                }
            );

        });


    // =====================================================
    // FONT FAMILY
    // =====================================================

    const fontNameSelect =
        document.getElementById(
            "fontNameSelect"
        );


    if (fontNameSelect) {

        fontNameSelect.addEventListener(
            "mousedown",
            function () {

                saveEditorSelection();

            }
        );


        fontNameSelect.addEventListener(
            "change",
            function () {

                restoreEditorSelection();


                document.execCommand(
                    "fontName",
                    false,
                    this.value
                );


                newsContent.focus();

            }
        );

    }


    // =====================================================
    // FONT SIZE
    // =====================================================

    const fontSizeSelect =
        document.getElementById(
            "fontSizeSelect"
        );


    if (fontSizeSelect) {

        fontSizeSelect.addEventListener(
            "mousedown",
            function () {

                saveEditorSelection();

            }
        );


        fontSizeSelect.addEventListener(
            "change",
            function () {

                const size =
                    this.value;


                restoreEditorSelection();


                /*
                 * execCommand fontSize
                 * dùng giá trị 1 - 7.
                 *
                 * Dùng 7 làm trung gian,
                 * sau đó đổi sang px.
                 */

                document.execCommand(
                    "fontSize",
                    false,
                    "7"
                );


                const fonts =
                    newsContent.querySelectorAll(
                        'font[size="7"]'
                    );


                fonts.forEach(
                    function (font) {

                        const span =
                            document.createElement(
                                "span"
                            );


                        span.style.fontSize =
                            size + "px";


                        span.innerHTML =
                            font.innerHTML;


                        font.replaceWith(
                            span
                        );

                    }
                );


                newsContent.focus();

            }
        );

    }


    // =====================================================
    // TEXT COLOR
    // =====================================================

    const textColorPicker =
        document.getElementById(
            "textColorPicker"
        );


    if (textColorPicker) {

        textColorPicker.addEventListener(
            "mousedown",
            function () {

                saveEditorSelection();

            }
        );


        textColorPicker.addEventListener(
            "change",
            function () {

                restoreEditorSelection();


                document.execCommand(
                    "foreColor",
                    false,
                    this.value
                );


                newsContent.focus();

            }
        );

    }


    // =====================================================
    // HIGHLIGHT
    // =====================================================

    const highlightColorPicker =
        document.getElementById(
            "highlightColorPicker"
        );


    if (highlightColorPicker) {

        highlightColorPicker.addEventListener(
            "mousedown",
            function () {

                saveEditorSelection();

            }
        );


        highlightColorPicker.addEventListener(
            "change",
            function () {

                restoreEditorSelection();


                const result =
                    document.execCommand(
                        "hiliteColor",
                        false,
                        this.value
                    );


                if (!result) {

                    document.execCommand(
                        "backColor",
                        false,
                        this.value
                    );

                }


                newsContent.focus();

            }
        );

    }


    // =====================================================
    // TAB / SHIFT + TAB
    // =====================================================

    if (newsContent) {

        newsContent.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key !==
                    "Tab"
                ) {

                    return;

                }


                event.preventDefault();


                if (event.shiftKey) {

                    document.execCommand(
                        "outdent",
                        false,
                        null
                    );

                } else {

                    document.execCommand(
                        "indent",
                        false,
                        null
                    );

                }


                newsContent.focus();


                scheduleNormalizeOrderedLists();

            }
        );

    }


    // =====================================================
    // ⭐⭐⭐ ORDERED LIST NUMBERING ⭐⭐⭐
    // =====================================================

    /*
     * Đây là phần quan trọng nhất.
     *
     * KHÔNG gộp các OL lại.
     *
     * KHÔNG xóa đoạn văn ở giữa.
     *
     * Chỉ tính lại START của từng OL.
     *
     *
     * Ví dụ:
     *
     * OL 1:
     * 1. A
     *
     * Đoạn văn
     *
     * OL 2:
     * 1. B
     * 2. C
     *
     * sẽ thành:
     *
     * OL 1:
     * 1. A
     *
     * Đoạn văn
     *
     * OL 2:
     * 2. B
     * 3. C
     *
     *
     * Nếu xóa A:
     *
     * OL 2 sẽ tự thành:
     *
     * 1. B
     * 2. C
     */


    function getDirectListItems(ol) {

        return Array.from(
            ol.children
        ).filter(
            function (element) {

                return (
                    element.tagName ===
                    "LI"
                );

            }
        );

    }


    // =====================================================
    // ⭐ WORD-LIKE NUMBERING
    // =====================================================
    //
    // Quy tắc:
    //
    // 1. A
    // 2. B
    //
    // Đoạn văn bình thường
    //
    // 3. C
    // 4. D
    //
    // Nếu xóa A:
    //
    // 1. B
    //
    // Đoạn văn
    //
    // 2. C
    // 3. D
    //
    // Tất cả OL cấp ngoài trong editor
    // sẽ được xem là MỘT chuỗi đánh số liên tục.
    //
    // Không gộp OL.
    // Không xóa đoạn văn.
    // Chỉ điều chỉnh số.
    // =====================================================

    let normalizeNumberTimer = null;


    /**
     * Lấy các <ol> cấp ngoài.
     *
     * Không lấy <ol> nằm bên trong <li>.
     *
     * Ví dụ:
     *
     * <ol>
     *   <li>
     *      A
     *      <ol>
     *          <li>Nested</li>
     *      </ol>
     *   </li>
     * </ol>
     *
     * OL nested không được tính vào
     * số thứ tự chính.
     */
    function getMainOrderedLists() {

        if (!newsContent) {
            return [];
        }


        return Array.from(
            newsContent.querySelectorAll("ol")
        ).filter(function (ol) {

            /*
             * Nếu OL nằm trong LI
             * thì đó là danh sách con.
             */
            return !ol.parentElement.closest("li");

        });

    }


    /**
     * Lấy LI trực tiếp của OL.
     */
    function getDirectListItems(ol) {

        return Array.from(
            ol.children
        ).filter(function (element) {

            return element.tagName === "LI";

        });

    }


    /**
     * Tính lại toàn bộ số thứ tự.
     *
     * Đây là hàm QUAN TRỌNG NHẤT.
     */
    function normalizeOrderedListNumbers() {

        if (!newsContent) {
            return;
        }


        const orderedLists =
            getMainOrderedLists();


        let nextNumber = 1;


        orderedLists.forEach(function (ol) {

            const items =
                getDirectListItems(ol);


            /*
             * OL không có LI
             * thì bỏ qua.
             */
            if (items.length === 0) {

                return;

            }


            // ==========================================
            // SET START CHO OL
            // ==========================================

            ol.setAttribute(
                "start",
                String(nextNumber)
            );


            /*
             * ÉP SỐ TRỰC TIẾP CHO TỪNG LI.
             *
             * Đây là phần trước mình thiếu.
             *
             * Browser sẽ hiển thị đúng:
             *
             * 1
             * 2
             * 3
             * ...
             */
            items.forEach(function (li, index) {

                const number =
                    nextNumber + index;


                /*
                 * HTMLLIElement.value
                 *
                 * Ví dụ:
                 *
                 * <li value="3">
                 */
                li.value =
                    number;


                /*
                 * Giữ khoảng cách giữa
                 * các dòng.
                 */
                li.style.marginBottom =
                    "14px";

            });


            /*
             * Danh sách tiếp theo
             * bắt đầu sau danh sách hiện tại.
             */
            nextNumber +=
                items.length;

        });

    }


    /**
     * Chạy lại numbering sau khi browser
     * đã hoàn thành thao tác contenteditable.
     */
    function scheduleNormalizeOrderedLists(
        delay = 20
    ) {

        clearTimeout(
            normalizeNumberTimer
        );


        normalizeNumberTimer =
            setTimeout(
                function () {

                    normalizeOrderedListNumbers();

                },
                delay
            );

    }


    /**
     * Theo dõi thay đổi DOM.
     *
     * Khi browser tự tạo:
     *
     * <ol>
     * <li>...</li>
     * </ol>
     *
     * hoặc tách thành OL mới,
     * hàm này sẽ tự chạy.
     */
    let numberingObserver = null;


    if (newsContent) {

        numberingObserver =
            new MutationObserver(
                function (mutations) {

                    let hasStructureChange =
                        false;


                    mutations.forEach(
                        function (mutation) {

                            /*
                             * Chỉ quan tâm:
                             *
                             * thêm/xóa node
                             *
                             * Không theo dõi attributes
                             * vì normalize sẽ tự thay
                             * li.value và ol.start.
                             */

                            if (
                                mutation.type ===
                                "childList"
                            ) {

                                hasStructureChange =
                                    true;

                            }

                        }
                    );


                    if (
                        hasStructureChange
                    ) {

                        scheduleNormalizeOrderedLists(
                            30
                        );

                    }

                }
            );


        numberingObserver.observe(
            newsContent,
            {
                childList: true,
                subtree: true
            }
        );

    }


    /**
     * Người dùng gõ/xóa/paste.
     */
    if (newsContent) {

        // ==============================================
        // INPUT
        // ==============================================

        newsContent.addEventListener(
            "input",
            function () {

                scheduleNormalizeOrderedLists(
                    20
                );

            }
        );


        // ==============================================
        // ENTER
        // ==============================================

        newsContent.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Enter"
                ) {

                    /*
                     * Để browser xử lý Enter trước.
                     */
                    setTimeout(
                        function () {

                            normalizeOrderedListNumbers();

                        },
                        0
                    );

                }


                // ==========================================
                // BACKSPACE
                // ==========================================

                if (
                    event.key === "Backspace"
                ) {

                    setTimeout(
                        function () {

                            normalizeOrderedListNumbers();

                        },
                        0
                    );

                }


                // ==========================================
                // DELETE
                // ==========================================

                if (
                    event.key === "Delete"
                ) {

                    setTimeout(
                        function () {

                            normalizeOrderedListNumbers();

                        },
                        0
                    );

                }

            }
        );


        // ==============================================
        // PASTE
        // ==============================================

        newsContent.addEventListener(
            "paste",
            function () {

                setTimeout(
                    function () {

                        normalizeOrderedListNumbers();

                    },
                    50
                );

            }
        );

    }


    // =====================================================
    // NORMALIZE AFTER USER INPUT
    // =====================================================

    function scheduleNormalizeOrderedLists() {

        clearTimeout(
            normalizeTimer
        );


        normalizeTimer =
            setTimeout(
                function () {

                    normalizeOrderedListNumbers();

                },
                30
            );

    }


    // =====================================================
    // EDITOR INPUT
    // =====================================================

    if (newsContent) {

        newsContent.addEventListener(
            "input",
            function () {

                scheduleNormalizeOrderedLists();

            }
        );


        // -------------------------------------------------
        // KEYDOWN
        // -------------------------------------------------

        newsContent.addEventListener(
            "keydown",
            function (event) {

                // ==========================================
                // ENTER
                // ==========================================

                if (
                    event.key ===
                    "Enter"
                ) {

                    setTimeout(
                        function () {

                            normalizeOrderedListNumbers();

                        },
                        0
                    );

                }


                // ==========================================
                // BACKSPACE
                // ==========================================

                if (
                    event.key ===
                    "Backspace"
                ) {

                    setTimeout(
                        function () {

                            normalizeOrderedListNumbers();

                        },
                        0
                    );

                }


                // ==========================================
                // DELETE
                // ==========================================

                if (
                    event.key ===
                    "Delete"
                ) {

                    setTimeout(
                        function () {

                            normalizeOrderedListNumbers();

                        },
                        0
                    );

                }

            }
        );


        // -------------------------------------------------
        // PASTE
        // -------------------------------------------------

        newsContent.addEventListener(
            "paste",
            function () {

                setTimeout(
                    function () {

                        normalizeOrderedListNumbers();

                    },
                    50
                );

            }
        );

    }


    // =====================================================
    // LINK MODAL
    // =====================================================

    function openLinkModal() {

        if (
            !linkModal
            ||
            !linkUrl
        ) {

            return;

        }


        const selection =
            window.getSelection();


        if (
            selection
            &&
            selection.rangeCount
        ) {

            const range =
                selection.getRangeAt(0);


            if (
                newsContent.contains(
                    range.commonAncestorContainer
                )
            ) {

                savedLinkRange =
                    range.cloneRange();

            }

        }


        linkUrl.value =
            "";


        clearLinkError();


        linkModal.hidden =
            false;


        setTimeout(
            function () {

                linkUrl.focus();

            },
            100
        );

    }


    // =====================================================
    // CLOSE LINK MODAL
    // =====================================================

    function closeLink() {

        if (!linkModal) {
            return;
        }


        linkModal.hidden =
            true;


        if (linkUrl) {

            linkUrl.value =
                "";

        }


        clearLinkError();


        savedLinkRange =
            null;

    }


    if (closeLinkModal) {

        closeLinkModal.addEventListener(
            "click",
            closeLink
        );

    }


    if (cancelLinkButton) {

        cancelLinkButton.addEventListener(
            "click",
            closeLink
        );

    }


    // =====================================================
    // INSERT LINK
    // =====================================================

    if (insertLinkButton) {

        insertLinkButton.addEventListener(
            "click",
            insertLink
        );

    }


    function insertLink() {

        if (!linkUrl) {
            return;
        }


        const url =
            linkUrl.value.trim();


        // -------------------------------------------------
        // EMPTY
        // -------------------------------------------------

        if (!url) {

            showLinkError(
                "Vui lòng nhập đường dẫn."
            );

            return;

        }


        // -------------------------------------------------
        // URL
        // -------------------------------------------------

        let validUrl;


        try {

            validUrl =
                new URL(url);

        } catch (error) {

            showLinkError(
                "Đường dẫn không hợp lệ. Ví dụ: https://example.com"
            );

            return;

        }


        // -------------------------------------------------
        // PROTOCOL
        // -------------------------------------------------

        if (
            validUrl.protocol !==
                "http:"
            &&
            validUrl.protocol !==
                "https:"
        ) {

            showLinkError(
                "Chỉ hỗ trợ đường dẫn HTTP hoặc HTTPS."
            );

            return;

        }


        clearLinkError();


        newsContent.focus();

        const selection = window.getSelection();

        selection.removeAllRanges();

        if (savedLinkRange) {
            selection.addRange(savedLinkRange);
        }

        /* ==========================================
           TẠO LINK
        ========================================== */

        document.execCommand(
            "createLink",
            false,
            validUrl.href
        );


        /* ==========================================
           CẤU HÌNH LINK
        ========================================== */

        const links = newsContent.querySelectorAll("a");

        links.forEach(function (link) {

            /*
             * Mở link ở tab mới
             */
            link.target = "_blank";

            /*
             * Bảo mật khi mở tab mới
             */
            link.rel = "noopener noreferrer";

        });


        closeLink();

    }


    // =====================================================
    // LINK ERROR
    // =====================================================

    function showLinkError(
        message
    ) {

        if (linkUrlError) {

            linkUrlError.textContent =
                message;

        }


        if (linkUrl) {

            linkUrl.classList.add(
                "input-error"
            );


            linkUrl.focus();

        }

    }


    function clearLinkError() {

        if (linkUrlError) {

            linkUrlError.textContent =
                "";

        }


        if (linkUrl) {

            linkUrl.classList.remove(
                "input-error"
            );

        }

    }


    if (linkUrl) {

        linkUrl.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key ===
                    "Enter"
                ) {

                    event.preventDefault();

                    insertLink();

                }


                if (
                    event.key ===
                    "Escape"
                ) {

                    event.preventDefault();

                    closeLink();

                }

            }
        );


        linkUrl.addEventListener(
            "input",
            clearLinkError
        );

    }


    // =====================================================
    // CANCEL NEWS
    // =====================================================

    if (cancelNewsButton) {

        cancelNewsButton.addEventListener(
            "click",
            function () {

                window.location.href =
                    "/Admin/danh-sach-tin-tuc";

            }
        );

    }


    // =====================================================
    // SAVE NEWS
    // =====================================================

    if (saveNewsButton) {

        saveNewsButton.addEventListener(
            "click",
            saveNews
        );

    }


    async function saveNews() {

        clearErrors();


        // -------------------------------------------------
        // TITLE
        // -------------------------------------------------

        const title =
            newsTitle.value.trim();


        // -------------------------------------------------
        // CATEGORY
        // -------------------------------------------------

        const categoryId =
            newsCategory.value;


        // -------------------------------------------------
        // STATUS
        // -------------------------------------------------

        const status =
            newsStatus.value;


        // -------------------------------------------------
        // NORMALIZE NUMBER
        // -------------------------------------------------

        normalizeOrderedListNumbers();


        // -------------------------------------------------
        // CONTENT
        // -------------------------------------------------

        const content =
            newsContent.innerHTML.trim();


        let valid = true;


        // -------------------------------------------------
        // VALIDATE TITLE
        // -------------------------------------------------

        if (!title) {

            showError(
                newsTitleError,
                "Vui lòng nhập tiêu đề."
            );


            valid = false;

        }


        // -------------------------------------------------
        // VALIDATE CATEGORY
        // -------------------------------------------------

        if (!categoryId) {

            showError(
                newsCategoryError,
                "Vui lòng chọn danh mục."
            );


            valid = false;

        }


        // -------------------------------------------------
        // VALIDATE CONTENT
        // -------------------------------------------------

        const plainContent =
            stripHtml(
                content
            ).trim();


        if (!plainContent) {

            showError(
                newsContentError,
                "Vui lòng nhập nội dung bài viết."
            );


            valid = false;

        }


        if (!valid) {

            return;

        }


        // =================================================
        // PAYLOAD
        // =================================================

        const payload = {

            maDanhMuc:
                Number(categoryId),

            tieuDe:
                title,

            noiDung:
                content,

            imageURL:
                currentImageFileKey,

            trangThai:
                status

        };


        console.log(
            "Payload tin tức:",
            payload
        );


        try {

            setSavingState(
                true
            );


            const token =
                getToken();


            // -------------------------------------------------
            // URL
            // -------------------------------------------------

            const url =
                editingNewsId
                    ?
                    `${NEWS_API}/${editingNewsId}`
                    :
                    NEWS_API;


            // -------------------------------------------------
            // METHOD
            // -------------------------------------------------

            const method =
                editingNewsId
                    ?
                    "PUT"
                    :
                    "POST";


            // -------------------------------------------------
            // REQUEST
            // -------------------------------------------------

            const response =
                await fetch(
                    url,
                    {
                        method: method,

                        headers: {
                            "Content-Type":
                                "application/json",

                            "Authorization":
                                "Bearer " + token
                        },

                        body:
                            JSON.stringify(
                                payload
                            )
                    }
                );


            // -------------------------------------------------
            // 401
            // -------------------------------------------------

            if (
                response.status ===
                401
            ) {

                redirectLogin();

                return;

            }


            // -------------------------------------------------
            // ERROR
            // -------------------------------------------------

            if (!response.ok) {

                let message =
                    "Không thể lưu tin tức.";


                try {

                    const errorData =
                        await response.json();


                    message =
                        errorData.message
                        ||
                        errorData.error
                        ||
                        message;

                } catch (error) {

                    console.error(
                        "Không đọc được error JSON:",
                        error
                    );

                }


                throw new Error(
                    message
                );

            }


            // -------------------------------------------------
            // SUCCESS
            // -------------------------------------------------

            showToast(
                "Thành công",

                editingNewsId
                    ?
                    "Đã cập nhật tin tức."
                    :
                    "Đã thêm tin tức.",

                "success"
            );


            setTimeout(
                function () {

                    window.location.href =
                        "/Admin/danh-sach-tin-tuc";

                },
                800
            );


        } catch (error) {

            console.error(
                "Lỗi lưu tin tức:",
                error
            );


            showToast(
                "Lỗi",
                error.message
                ||
                "Không thể lưu tin tức.",
                "error"
            );


        } finally {

            setSavingState(
                false
            );

        }

    }


    // =====================================================
    // SAVING STATE
    // =====================================================

    function setSavingState(
        saving
    ) {

        if (!saveNewsButton) {
            return;
        }


        saveNewsButton.disabled =
            saving;


        if (saving) {

            saveNewsButton.innerHTML =
                `
                    <span>...</span>
                    Đang lưu...
                `;

        } else {

            saveNewsButton.innerHTML =
                `
                    <span>✓</span>
                    Lưu tin tức
                `;

        }

    }


    // =====================================================
    // ERROR
    // =====================================================

    function showError(
        element,
        message
    ) {

        if (!element) {
            return;
        }


        element.textContent =
            message;

    }


    function clearErrors() {

        if (newsTitleError) {

            newsTitleError.textContent =
                "";

        }


        if (newsCategoryError) {

            newsCategoryError.textContent =
                "";

        }


        if (newsContentError) {

            newsContentError.textContent =
                "";

        }

    }


    // =====================================================
    // TOAST
    // =====================================================

    function showToast(
        title,
        message,
        type
    ) {

        if (!newsToast) {

            console.log(
                title,
                message
            );

            return;

        }


        if (newsToastTitle) {

            newsToastTitle.textContent =
                title;

        }


        if (newsToastMessage) {

            newsToastMessage.textContent =
                message;

        }


        if (newsToastIcon) {

            if (
                type === "success"
            ) {

                newsToastIcon.textContent =
                    "✓";

                newsToastIcon.style.background =
                    "#dcfce7";

                newsToastIcon.style.color =
                    "#16a34a";

            } else {

                newsToastIcon.textContent =
                    "×";

                newsToastIcon.style.background =
                    "#fee2e2";

                newsToastIcon.style.color =
                    "#dc2626";

            }

        }


        newsToast.classList.add(
            "show"
        );


        setTimeout(
            function () {

                newsToast.classList.remove(
                    "show"
                );

            },
            3000
        );

    }


    // =====================================================
    // CLOSE TOAST
    // =====================================================

    if (closeNewsToast) {

        closeNewsToast.addEventListener(
            "click",
            function () {

                if (newsToast) {

                    newsToast.classList.remove(
                        "show"
                    );

                }

            }
        );

    }


    // =====================================================
    // STRIP HTML
    // =====================================================

    function stripHtml(html) {

        const temp =
            document.createElement(
                "div"
            );


        temp.innerHTML =
            html || "";


        return (
            temp.textContent
            ||
            temp.innerText
            ||
            ""
        );

    }


    // =====================================================
    // INIT
    // =====================================================

    async function init() {

        // -------------------------------------------------
        // LOAD CATEGORY
        // -------------------------------------------------

        await loadCategories();


        // -------------------------------------------------
        // GET ID
        // -------------------------------------------------

        editingNewsId =
            getNewsIdFromUrl();


        // -------------------------------------------------
        // EDIT
        // -------------------------------------------------

        if (editingNewsId) {

            await loadNewsDetail(
                editingNewsId
            );

        }


        // -------------------------------------------------
        // ADD
        // -------------------------------------------------

        else {

            if (pageTitle) {

                pageTitle.textContent =
                    "Thêm tin tức";

            }


            if (editorTitle) {

                editorTitle.textContent =
                    "Thêm tin tức";

            }


            if (breadcrumbTitle) {

                breadcrumbTitle.textContent =
                    "Thêm tin tức";

            }


            if (newsStatus) {

                newsStatus.value =
                    "Đang hiển thị";

            }

        }

    }


    // =====================================================
    // START
    // =====================================================

    init();

});