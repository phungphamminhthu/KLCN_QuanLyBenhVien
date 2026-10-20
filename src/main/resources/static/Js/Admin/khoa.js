document.addEventListener(
    "DOMContentLoaded",
    function () {

        /* =====================================================
           CONFIG
        ===================================================== */

        const KHOA_API = "/api/khoa";

        const PAGE_SIZE = 5;


        /* =====================================================
           DOM
        ===================================================== */

        const addKhoaButton =
            document.getElementById("addKhoaButton");

        const khoaModal =
            document.getElementById("khoaModal");

        const closeKhoaModal =
            document.getElementById("closeKhoaModal");

        const cancelKhoaModal =
            document.getElementById("cancelKhoaModal");

        const saveKhoaButton =
            document.getElementById("saveKhoaButton");

        const saveButtonText =
            document.getElementById("saveButtonText");

        const tenKhoa =
            document.getElementById("tenKhoa");

        const moTa =
            document.getElementById("moTa");

        const giaKham = document.getElementById("giaKham");
        const giaKhamError = document.getElementById("giaKhamError");

        const tenKhoaError =
            document.getElementById("tenKhoaError");

        const moTaError =
            document.getElementById("moTaError");

        const moTaCount =
            document.getElementById("moTaCount");

        const modalTitle =
            document.getElementById("modalTitle");

        const modalDescription =
            document.getElementById("modalDescription");

        const keywordInput =
            document.getElementById("keywordInput");

        const searchButton =
            document.getElementById("searchButton");

        const resetButton =
            document.getElementById("resetButton");

        const khoaTableBody =
            document.getElementById("khoaTableBody");

        const emptyKhoa =
            document.getElementById("emptyKhoa");

        const tableResult =
            document.getElementById("tableResult");

        const pagination =
            document.getElementById("pagination");


        /* =====================================================
           TOAST
        ===================================================== */

        const khoaToast =
            document.getElementById("khoaToast");

        const khoaToastIcon =
            document.getElementById("khoaToastIcon");

        const khoaToastTitle =
            document.getElementById("khoaToastTitle");

        const khoaToastMessage =
            document.getElementById("khoaToastMessage");

        const closeKhoaToast =
            document.getElementById("closeKhoaToast");


        /* =====================================================
           DELETE MODAL
        ===================================================== */

        const deleteConfirmModal =
            document.getElementById("deleteConfirmModal");

        const deleteKhoaName =
            document.getElementById("deleteKhoaName");

        const cancelDeleteButton =
            document.getElementById("cancelDeleteButton");

        const confirmDeleteButton =
            document.getElementById("confirmDeleteButton");


        /* =====================================================
           STATE
        ===================================================== */

        let AllKhoa = [];

        let FilteredKhoa = [];

        let CurrentPage = 1;

        let EditingKhoaId = null;

        let IsViewMode = false;

        let DeleteKhoaId = null;

        let ToastTimer = null;


        /* =====================================================
           TOKEN
        ===================================================== */

        function getToken() {

            return (
                localStorage.getItem("Token")
                ||
                sessionStorage.getItem("Token")
                ||
                ""
            );

        }


        function getHeaders() {

            const Token =
                getToken();


            return {

                "Content-Type":
                    "application/json",

                ...(Token
                    ? {
                        "Authorization":
                            "Bearer " + Token
                    }
                    : {})

            };

        }


        /* =====================================================
           LOGIN
        ===================================================== */

        function redirectLogin() {

            window.location.href =
                "/auth/login";

        }


        /* =====================================================
           LOAD KHOA
        ===================================================== */

        async function loadKhoa() {

            try {

                const Response =
                    await fetch(
                        KHOA_API,
                        {
                            method: "GET",
                            headers: getHeaders()
                        }
                    );


                if (
                    Response.status === 401
                ) {

                    redirectLogin();

                    return;

                }


                if (
                    Response.status === 403
                ) {

                    showToast(
                        "Bạn không có quyền xem danh sách khoa.",
                        "error",
                        "Không có quyền"
                    );

                    return;

                }


                if (!Response.ok) {

                    throw new Error(
                        "Không thể tải danh sách khoa."
                    );

                }


                const Data =
                    await Response.json();


                AllKhoa =
                    Array.isArray(Data)
                        ? Data
                        : (
                            Data.data
                            ||
                            Data.content
                            ||
                            []
                        );


                applySearch(false);

            }
            catch (Error) {

                console.error(
                    "Lỗi tải khoa:",
                    Error
                );


                showToast(
                    Error.message
                    ||
                    "Không thể tải danh sách khoa.",
                    "error",
                    "Lỗi tải dữ liệu"
                );

            }

        }


        /* =====================================================
           SEARCH
        ===================================================== */

        function applySearch(
            resetPage = true
        ) {

            const Keyword =
                keywordInput.value
                    .trim()
                    .toLowerCase();


            FilteredKhoa =
                AllKhoa.filter(
                    function (Khoa) {

                        const MaKhoa =
                            String(
                                Khoa.maKhoa
                                ??
                                Khoa.MaKhoa
                                ??
                                ""
                            ).toLowerCase();


                        const TenKhoa =
                            String(
                                Khoa.tenKhoa
                                ??
                                Khoa.TenKhoa
                                ??
                                ""
                            ).toLowerCase();


                        const MoTa =
                            String(
                                Khoa.moTa
                                ??
                                Khoa.MoTa
                                ??
                                ""
                            ).toLowerCase();


                        return (
                            !Keyword
                            ||
                            MaKhoa.includes(Keyword)
                            ||
                            TenKhoa.includes(Keyword)
                            ||
                            MoTa.includes(Keyword)
                        );

                    }
                );


            if (resetPage) {

                CurrentPage = 1;

            }


            renderTable();

        }


        /* =====================================================
           RENDER TABLE
        ===================================================== */

        function renderTable() {

            khoaTableBody.innerHTML =
                "";


            const Total =
                FilteredKhoa.length;


            const TotalPages =
                Math.ceil(
                    Total / PAGE_SIZE
                );


            if (
                CurrentPage > TotalPages
                &&
                TotalPages > 0
            ) {

                CurrentPage =
                    TotalPages;

            }


            /* =================================================
               EMPTY
            ================================================= */

            if (Total === 0) {

                emptyKhoa.hidden =
                    false;


                tableResult.textContent =
                    "Hiển thị 0 trong tổng số 0 khoa";


                pagination.innerHTML =
                    "";

                return;

            }


            emptyKhoa.hidden =
                true;


            /* =================================================
               DATA RANGE
            ================================================= */

            const StartIndex =
                (
                    CurrentPage - 1
                )
                *
                PAGE_SIZE;


            const EndIndex =
                Math.min(
                    StartIndex + PAGE_SIZE,
                    Total
                );


            const PageData =
                FilteredKhoa.slice(
                    StartIndex,
                    EndIndex
                );


            /* =================================================
               ROW
            ================================================= */

            PageData.forEach(
                function (
                    Khoa,
                    Index
                ) {

                    const MaKhoa =
                        Khoa.maKhoa
                        ??
                        Khoa.MaKhoa;


                    const TenKhoa =
                        Khoa.tenKhoa
                        ??
                        Khoa.TenKhoa
                        ??
                        "";


                    const MoTa =
                        Khoa.moTa
                        ??
                        Khoa.MoTa
                        ??
                        "";

                    const GiaKham = Number(
                        Khoa.giaKham ?? Khoa.GiaKham ?? 0
                    );

                    const STT =
                        StartIndex
                        +
                        Index
                        +
                        1;


                    const Row =
                        document.createElement("tr");


                    Row.innerHTML = `

                        <td class="col-stt">

                            ${STT}

                        </td>


                        <td>

                            <span class="khoa-code">

                                ${escapeHtml(MaKhoa)}

                            </span>

                        </td>


                        <td>

                            <span class="khoa-name">

                                ${escapeHtml(TenKhoa)}

                            </span>

                        </td>


                        <td>

                            <span
                                    class="khoa-description"
                                    title="${escapeHtml(MoTa)}">

                                ${
                                    MoTa
                                        ? escapeHtml(MoTa)
                                        : "—"
                                }

                            </span>

                        </td>

                        <td class="col-price">
                            <span class="khoa-price">
                                ${GiaKham.toLocaleString("vi-VN")} đ
                            </span>
                        </td>


                        <td class="col-action">

                            <div class="action-buttons">


                                <!-- XEM -->

                                <button
                                        type="button"
                                        class="action-button view"
                                        data-action="view"
                                        data-id="${MaKhoa}"
                                        title="Xem">

                                    👁

                                </button>


                                <!-- SỬA -->

                                <button
                                        type="button"
                                        class="action-button edit"
                                        data-action="edit"
                                        data-id="${MaKhoa}"
                                        title="Sửa">

                                    ✎

                                </button>


                                <!-- XÓA -->

                                <button
                                        type="button"
                                        class="action-button delete"
                                        data-action="delete"
                                        data-id="${MaKhoa}"
                                        title="Xóa">

                                    🗑

                                </button>


                            </div>

                        </td>

                    `;


                    khoaTableBody.appendChild(
                        Row
                    );

                }
            );


            /* =================================================
               RESULT
            ================================================= */

            tableResult.textContent =
                `Hiển thị ${StartIndex + 1} - ${EndIndex} trong tổng số ${Total} khoa`;


            renderPagination(
                TotalPages
            );

        }


        /* =====================================================
           PAGINATION
        ===================================================== */

        function renderPagination(
            TotalPages
        ) {

            pagination.innerHTML =
                "";


            if (
                TotalPages <= 1
            ) {

                return;

            }


            /* PREVIOUS */

            const PreviousButton =
                document.createElement("button");


            PreviousButton.type =
                "button";


            PreviousButton.className =
                "pagination-button";


            PreviousButton.textContent =
                "‹";


            PreviousButton.disabled =
                CurrentPage === 1;


            PreviousButton.addEventListener(
                "click",
                function () {

                    if (
                        CurrentPage > 1
                    ) {

                        CurrentPage--;

                        renderTable();

                    }

                }
            );


            pagination.appendChild(
                PreviousButton
            );


            /* PAGE NUMBERS */

            for (
                let Page = 1;
                Page <= TotalPages;
                Page++
            ) {

                const PageButton =
                    document.createElement("button");


                PageButton.type =
                    "button";


                PageButton.className =
                    "pagination-button";


                if (
                    Page === CurrentPage
                ) {

                    PageButton.classList.add(
                        "active"
                    );

                }


                PageButton.textContent =
                    Page;


                PageButton.addEventListener(
                    "click",
                    function () {

                        CurrentPage =
                            Page;

                        renderTable();

                    }
                );


                pagination.appendChild(
                    PageButton
                );

            }


            /* NEXT */

            const NextButton =
                document.createElement("button");


            NextButton.type =
                "button";


            NextButton.className =
                "pagination-button";


            NextButton.textContent =
                "›";


            NextButton.disabled =
                CurrentPage === TotalPages;


            NextButton.addEventListener(
                "click",
                function () {

                    if (
                        CurrentPage <
                        TotalPages
                    ) {

                        CurrentPage++;

                        renderTable();

                    }

                }
            );


            pagination.appendChild(
                NextButton
            );

        }


        /* =====================================================
           ACTION XEM / SỬA / XÓA
        ===================================================== */

        khoaTableBody.addEventListener(
            "click",
            function (Event) {

                const ActionButton =
                    Event.target.closest(
                        "[data-action]"
                    );


                if (!ActionButton) {

                    return;

                }


                const Action =
                    ActionButton.dataset.action;


                const Id =
                    ActionButton.dataset.id;


                if (
                    Action === "view"
                ) {

                    openViewKhoa(Id);

                    return;

                }


                if (
                    Action === "edit"
                ) {

                    openEditKhoa(Id);

                    return;

                }


                if (
                    Action === "delete"
                ) {

                    openDeleteConfirm(Id);

                }

            }
        );


        /* =====================================================
           FIND KHOA
        ===================================================== */

        function findKhoa(Id) {

            return AllKhoa.find(
                function (Khoa) {

                    const KhoaId =
                        Khoa.maKhoa
                        ??
                        Khoa.MaKhoa;


                    return (
                        String(KhoaId)
                        ===
                        String(Id)
                    );

                }
            );

        }


        /* =====================================================
           THÊM KHOA
        ===================================================== */

        addKhoaButton.addEventListener(
            "click",
            function () {

                EditingKhoaId =
                    null;

                IsViewMode =
                    false;


                modalTitle.textContent =
                    "Thêm khoa";


                modalDescription.textContent =
                    "Nhập thông tin khoa";


                saveButtonText.textContent =
                    "Lưu khoa";


                resetForm();


                khoaModal.hidden =
                    false;


                setTimeout(
                    function () {

                        tenKhoa.focus();

                    },
                    100
                );

            }
        );


        /* =====================================================
           SỬA KHOA
        ===================================================== */

        function openEditKhoa(Id) {

            const Khoa =
                findKhoa(Id);


            if (!Khoa) {

                return;

            }


            EditingKhoaId =
                Id;


            IsViewMode =
                false;


            modalTitle.textContent =
                "Sửa khoa";


            modalDescription.textContent =
                "Cập nhật thông tin khoa";


            tenKhoa.value =
                Khoa.tenKhoa
                ??
                Khoa.TenKhoa
                ??
                "";


            moTa.value =
                Khoa.moTa
                ??
                Khoa.MoTa
                ??
                "";
            giaKham.value = Khoa.giaKham ?? Khoa.GiaKham ?? 0;
            giaKham.disabled = false;


            tenKhoa.disabled =
                false;


            moTa.disabled =
                false;


            saveKhoaButton.style.display =
                "inline-flex";


            saveButtonText.textContent =
                "Lưu thay đổi";


            clearErrors();

            updateDescriptionCount();


            khoaModal.hidden =
                false;


            setTimeout(
                function () {

                    tenKhoa.focus();

                },
                100
            );

        }


        /* =====================================================
           XEM KHOA
        ===================================================== */

        function openViewKhoa(Id) {

            const Khoa =
                findKhoa(Id);


            if (!Khoa) {

                return;

            }


            EditingKhoaId =
                null;


            IsViewMode =
                true;


            modalTitle.textContent =
                "Thông tin khoa";


            modalDescription.textContent =
                "Xem thông tin chi tiết của khoa";


            tenKhoa.value =
                Khoa.tenKhoa
                ??
                Khoa.TenKhoa
                ??
                "";


            moTa.value =
                Khoa.moTa
                ??
                Khoa.MoTa
                ??
                "";

            giaKham.value = Khoa.giaKham ?? Khoa.GiaKham ?? 0;
            giaKham.disabled = true;


            tenKhoa.disabled =
                true;


            moTa.disabled =
                true;


            saveKhoaButton.style.display =
                "none";


            clearErrors();

            updateDescriptionCount();


            khoaModal.hidden =
                false;

        }


        /* =====================================================
           CLOSE KHOA MODAL
        ===================================================== */

        closeKhoaModal.addEventListener(
            "click",
            closeKhoaModalBox
        );


        cancelKhoaModal.addEventListener(
            "click",
            closeKhoaModalBox
        );


        khoaModal.addEventListener(
            "click",
            function (Event) {

                if (
                    Event.target === khoaModal
                ) {

                    closeKhoaModalBox();

                }

            }
        );


        function closeKhoaModalBox() {

            khoaModal.hidden =
                true;


            EditingKhoaId =
                null;


            IsViewMode =
                false;


            resetForm();

        }


        /* =====================================================
           SAVE
        ===================================================== */

        saveKhoaButton.addEventListener(
            "click",
            saveKhoa
        );


        async function saveKhoa() {

            if (IsViewMode) {

                return;

            }


            clearErrors();


            const Ten =
                tenKhoa.value.trim();


            const MoTa =
                moTa.value.trim();

            const GiaKhamText = giaKham.value.trim();
            const GiaKham = Number(GiaKhamText);


            let IsValid =
                true;


            /* TÊN KHOA */

            if (!Ten) {

                tenKhoaError.textContent =
                    "Vui lòng nhập tên khoa.";

                IsValid =
                    false;

            }
            else if (
                Ten.length > 100
            ) {

                tenKhoaError.textContent =
                    "Tên khoa không được vượt quá 100 ký tự.";

                IsValid =
                    false;

            }


            /* MÔ TẢ */

            if (
                MoTa.length > 255
            ) {

                moTaError.textContent =
                    "Mô tả không được vượt quá 255 ký tự.";

                IsValid =
                    false;

            }

            /* Giá Khám*/
            if (GiaKhamText === "") {
                giaKhamError.textContent = "Vui lòng nhập giá khám.";
                IsValid = false;
            } else if (
                !Number.isFinite(GiaKham) ||
                GiaKham < 0 ||
                GiaKham > 9999999999.99
            ) {
                giaKhamError.textContent =
                    "Giá khám phải từ 0 đến 9.999.999.999,99 VNĐ.";
                IsValid = false;
            }

            if (!IsValid) {

                return;

            }


            const Payload = {

                tenKhoa:
                    Ten,

                moTa:
                    MoTa
                        ? MoTa
                        : null,

                giaKham: GiaKham
            };


            const IsEdit =
                EditingKhoaId !== null;


            saveKhoaButton.disabled =
                true;


            saveButtonText.textContent =
                IsEdit
                    ? "Đang lưu..."
                    : "Đang thêm...";


            try {

                const Response =
                    await fetch(

                        IsEdit
                            ? `${KHOA_API}/${EditingKhoaId}`
                            : KHOA_API,

                        {

                            method:
                                IsEdit
                                    ? "PUT"
                                    : "POST",

                            headers:
                                getHeaders(),

                            body:
                                JSON.stringify(
                                    Payload
                                )

                        }
                    );


                if (
                    Response.status === 401
                ) {

                    redirectLogin();

                    return;

                }


                if (
                    Response.status === 403
                ) {

                    showToast(
                        "Bạn không có quyền thực hiện thao tác này.",
                        "error",
                        "Không có quyền"
                    );

                    return;

                }


                const ResponseText =
                    await Response.text();


                if (!Response.ok) {

                    let Message =
                        ResponseText
                        ||
                        "Không thể lưu khoa.";


                    try {

                        const ErrorData =
                            JSON.parse(
                                ResponseText
                            );


                        if (
                            ErrorData.message
                        ) {

                            Message =
                                ErrorData.message;

                        }

                    }
                    catch (Error) {

                        // Không phải JSON

                    }


                    throw new Error(
                        Message
                    );

                }


                closeKhoaModalBox();


                await loadKhoa();


                showToast(
                    IsEdit
                        ? "Đã cập nhật khoa."
                        : "Đã thêm khoa.",
                    "success",
                    IsEdit
                        ? "Cập nhật thành công"
                        : "Thêm thành công"
                );

            }
            catch (Error) {

                console.error(
                    "Lỗi lưu khoa:",
                    Error
                );


                showToast(
                    Error.message
                    ||
                    "Không thể lưu khoa.",
                    "error",
                    "Lưu thất bại"
                );

            }
            finally {

                saveKhoaButton.disabled =
                    false;


                saveButtonText.textContent =
                    IsEdit
                        ? "Lưu thay đổi"
                        : "Lưu khoa";

            }

        }


        /* =====================================================
           OPEN DELETE CONFIRM
        ===================================================== */

        function openDeleteConfirm(Id) {

            const Khoa =
                findKhoa(Id);


            if (!Khoa) {

                return;

            }


            DeleteKhoaId =
                Id;


            const TenKhoa =
                Khoa.tenKhoa
                ??
                Khoa.TenKhoa
                ??
                "";


            deleteKhoaName.textContent =
                TenKhoa;


            deleteConfirmModal.hidden =
                false;

        }


        /* =====================================================
           CLOSE DELETE CONFIRM
        ===================================================== */

        function closeDeleteConfirm() {

            deleteConfirmModal.hidden =
                true;


            DeleteKhoaId =
                null;

        }


        cancelDeleteButton.addEventListener(
            "click",
            closeDeleteConfirm
        );


        deleteConfirmModal.addEventListener(
            "click",
            function (Event) {

                if (
                    Event.target ===
                    deleteConfirmModal
                ) {

                    closeDeleteConfirm();

                }

            }
        );


        /* =====================================================
           CONFIRM DELETE
        ===================================================== */

        confirmDeleteButton.addEventListener(
            "click",
            async function () {

                if (
                    DeleteKhoaId === null
                ) {

                    return;

                }


                const Id =
                    DeleteKhoaId;


                confirmDeleteButton.disabled =
                    true;


                confirmDeleteButton.textContent =
                    "Đang xóa...";


                try {

                    const Response =
                        await fetch(
                            `${KHOA_API}/${Id}`,
                            {
                                method: "DELETE",
                                headers: getHeaders()
                            }
                        );


                    if (
                        Response.status === 401
                    ) {

                        redirectLogin();

                        return;

                    }


                    if (
                        Response.status === 403
                    ) {

                        showToast(
                            "Bạn không có quyền xóa khoa.",
                            "error",
                            "Không có quyền"
                        );

                        return;

                    }


                    const ResponseText =
                        await Response.text();


                    if (!Response.ok) {

                        let Message =
                            ResponseText
                            ||
                            "Không thể xóa khoa.";


                        try {

                            const ErrorData =
                                JSON.parse(
                                    ResponseText
                                );


                            if (
                                ErrorData.message
                            ) {

                                Message =
                                    ErrorData.message;

                            }

                        }
                        catch (Error) {

                            // Không phải JSON

                        }


                        throw new Error(
                            Message
                        );

                    }


                    closeDeleteConfirm();


                    await loadKhoa();


                    showToast(
                        "Đã xóa khoa khỏi cơ sở dữ liệu.",
                        "success",
                        "Xóa thành công"
                    );

                }
                catch (Error) {

                    console.error(
                        "Lỗi xóa khoa:",
                        Error
                    );


                    showToast(
                        Error.message
                        ||
                        "Không thể xóa khoa. Có thể khoa đang được sử dụng.",
                        "error",
                        "Xóa thất bại"
                    );

                }
                finally {

                    confirmDeleteButton.disabled =
                        false;


                    confirmDeleteButton.textContent =
                        "Xóa khoa";

                }

            }
        );


        /* =====================================================
           TOAST
        ===================================================== */

        function showToast(
            Message,
            Type = "success",
            Title = ""
        ) {

            if (!khoaToast) {

                return;

            }


            khoaToast.classList.remove(
                "success",
                "error",
                "warning"
            );


            khoaToast.classList.add(
                Type
            );


            if (!Title) {

                if (
                    Type === "success"
                ) {

                    Title =
                        "Thành công";

                }
                else if (
                    Type === "error"
                ) {

                    Title =
                        "Có lỗi xảy ra";

                }
                else {

                    Title =
                        "Cảnh báo";

                }

            }


            khoaToastTitle.textContent =
                Title;


            khoaToastMessage.textContent =
                Message;


            khoaToastIcon.textContent =
                Type === "success"
                    ? "✓"
                    : "!";


            khoaToast.classList.add(
                "show"
            );


            if (ToastTimer) {

                clearTimeout(
                    ToastTimer
                );

            }


            ToastTimer =
                setTimeout(
                    function () {

                        khoaToast.classList.remove(
                            "show"
                        );

                    },
                    3500
                );

        }


        /* =====================================================
           CLOSE TOAST
        ===================================================== */

        closeKhoaToast.addEventListener(
            "click",
            function () {

                khoaToast.classList.remove(
                    "show"
                );


                if (ToastTimer) {

                    clearTimeout(
                        ToastTimer
                    );

                }

            }
        );


        /* =====================================================
           SEARCH BUTTON
        ===================================================== */

        searchButton.addEventListener(
            "click",
            function () {

                applySearch(true);

            }
        );


        /* =====================================================
           ENTER SEARCH
        ===================================================== */

        keywordInput.addEventListener(
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


        /* =====================================================
           RESET SEARCH
        ===================================================== */

        resetButton.addEventListener(
            "click",
            function () {

                keywordInput.value =
                    "";

                applySearch(true);

                keywordInput.focus();

            }
        );


        /* =====================================================
           CHARACTER COUNT
        ===================================================== */

        moTa.addEventListener(
            "input",
            updateDescriptionCount
        );


        function updateDescriptionCount() {

            moTaCount.textContent =
                moTa.value.length;

        }


        /* =====================================================
           CLEAR ERRORS
        ===================================================== */

        function clearErrors() {

            tenKhoaError.textContent =
                "";

            moTaError.textContent =
                "";

            giaKhamError.textContent = "";
        }


        /* =====================================================
           RESET FORM
        ===================================================== */

        function resetForm() {

            tenKhoa.value =
                "";

            moTa.value =
                "";

            giaKham.value = "";
            giaKham.disabled = false;


            tenKhoa.disabled =
                false;

            moTa.disabled =
                false;


            saveKhoaButton.style.display =
                "inline-flex";


            saveKhoaButton.disabled =
                false;


            saveButtonText.textContent =
                "Lưu khoa";


            clearErrors();


            updateDescriptionCount();

        }


        /* =====================================================
           ESCAPE HTML
        ===================================================== */

        function escapeHtml(
            Value
        ) {

            return String(
                Value ?? ""
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
           ESCAPE KEY
        ===================================================== */

        document.addEventListener(
            "keydown",
            function (Event) {

                if (
                    Event.key === "Escape"
                ) {

                    if (
                        !khoaModal.hidden
                    ) {

                        closeKhoaModalBox();

                    }


                    if (
                        !deleteConfirmModal.hidden
                    ) {

                        closeDeleteConfirm();

                    }

                }

            }
        );


        /* =====================================================
           INIT
        ===================================================== */

        if (!getToken()) {

            redirectLogin();

            return;

        }


        loadKhoa();

    }
);