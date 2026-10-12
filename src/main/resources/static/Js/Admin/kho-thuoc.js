const KHO_API = "/api/kho-thuoc";
const THUOC_API = "/api/medicines";

const PAGE_SIZE = 5;


/* =========================================================
   STATE
========================================================= */

let allKhoThuoc = [];

let filteredKhoThuoc = [];

let currentPage = 1;

let editingId = null;

let deleteId = null;

let toastTimer = null;


/* =========================================================
   DOM
========================================================= */

const tableBody =
    document.getElementById("khoThuocTableBody");

const emptyBox =
    document.getElementById("emptyKhoThuoc");

const pagination =
    document.getElementById("pagination");

const tableResult =
    document.getElementById("tableResult");

const modal =
    document.getElementById("khoThuocModal");

const form =
    document.getElementById("khoThuocForm");

const maThuoc =
    document.getElementById("maThuoc");

const soLuongTon =
    document.getElementById("soLuongTon");

const soLuongToiThieu =
    document.getElementById("soLuongToiThieu");

const soLo =
    document.getElementById("soLo");

const hanSuDung =
    document.getElementById("hanSuDung");


/* =========================================================
   TOKEN
   Đồng bộ với thuoc.js / khoa.js / phong.js
========================================================= */

function getToken() {

    return (
        localStorage.getItem("Token")
        ||
        sessionStorage.getItem("Token")
        ||
        ""
    );

}


function getHeaders(includeJson = false) {

    const headers = {};

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


/* =========================================================
   LOGIN
========================================================= */

function redirectLogin() {

    window.location.href = "/auth/login";

}


/* =========================================================
   LOAD DANH SÁCH THUỐC
========================================================= */

async function loadThuocOptions() {

    try {

        const response =
            await fetch(
                THUOC_API,
                {
                    method: "GET",
                    headers: getHeaders()
                }
            );


        /* =========================
           CHƯA ĐĂNG NHẬP
        ========================= */

        if (response.status === 401) {

            redirectLogin();

            return;

        }


        /* =========================
           KHÔNG CÓ QUYỀN
        ========================= */

        if (response.status === 403) {

            throw new Error(
                "Bạn không có quyền xem danh sách thuốc."
            );

        }


        /* =========================
           API ERROR
        ========================= */

        if (!response.ok) {

            const errorText =
                await response.text();

            console.error(
                "API medicines:",
                response.status,
                errorText
            );

            throw new Error(
                "Không thể tải danh sách thuốc."
            );

        }


        /* =========================
           DATA
        ========================= */

        const data =
            await response.json();


        /*
         * API hiện tại của ThuocController
         * trả về List<ThuocResponse>.
         *
         * Nhưng vẫn hỗ trợ trường hợp
         * backend trả về { data: [...] }
         * hoặc { content: [...] }.
         */

        const thuocList =
            Array.isArray(data)
                ? data
                : (
                    data.data
                    ||
                    data.content
                    ||
                    []
                );


        /* =========================
           RESET SELECT
        ========================= */

        maThuoc.innerHTML = `
            <option value="">
                -- Chọn thuốc --
            </option>
        `;


        /* =========================
           RENDER OPTIONS
        ========================= */

        thuocList.forEach(
            function (thuoc) {

                const option =
                    document.createElement("option");


                option.value =
                    thuoc.maThuoc;


                option.textContent =
                    `T${String(
                        thuoc.maThuoc
                    ).padStart(3, "0")} - ${
                        thuoc.tenThuoc || ""
                    }`;


                maThuoc.appendChild(option);

            }
        );


    } catch (error) {

        console.error(
            "Lỗi tải danh sách thuốc:",
            error
        );


        showToast(
            "Lỗi",
            error.message
                ||
                "Không thể tải danh sách thuốc.",
            "error"
        );

    }

}


/* =========================================================
   LOAD KHO THUỐC
========================================================= */

async function loadKhoThuoc() {

    try {

        const response =
            await fetch(
                KHO_API,
                {
                    method: "GET",
                    headers: getHeaders()
                }
            );


        /* =========================
           401
        ========================= */

        if (response.status === 401) {

            redirectLogin();

            return;

        }


        /* =========================
           403
        ========================= */

        if (response.status === 403) {

            throw new Error(
                "Bạn không có quyền xem kho thuốc."
            );

        }


        /* =========================
           ERROR
        ========================= */

        if (!response.ok) {

            const errorText =
                await response.text();

            console.error(
                "API kho thuốc:",
                response.status,
                errorText
            );

            throw new Error(
                "Không thể tải dữ liệu kho thuốc."
            );

        }


        /* =========================
           DATA
        ========================= */

        const data =
            await response.json();


        allKhoThuoc =
            Array.isArray(data)
                ? data
                : (
                    data.data
                    ||
                    data.content
                    ||
                    []
                );


        /*
         * MaKhoThuoc AUTO_INCREMENT
         * nên sắp xếp tăng dần.
         */
        allKhoThuoc.sort(
            function (a, b) {

                return Number(
                    a.maKhoThuoc
                )
                -
                Number(
                    b.maKhoThuoc
                );

            }
        );


        applyFilters();


    } catch (error) {

        console.error(
            "Lỗi tải kho thuốc:",
            error
        );


        showToast(
            "Lỗi",
            error.message
                ||
                "Không thể tải dữ liệu kho thuốc.",
            "error"
        );

    }

}


/* =========================================================
   FILTER
========================================================= */

function applyFilters() {

    const searchElement =
        document.getElementById(
            "searchKhoThuoc"
        );

    const statusElement =
        document.getElementById(
            "filterTrangThai"
        );


    const keyword =
        searchElement
            ? searchElement.value
                .trim()
                .toLowerCase()
            : "";


    const status =
        statusElement
            ? statusElement.value
            : "";


    filteredKhoThuoc =
        allKhoThuoc.filter(
            function (item) {

                const searchText = [

                    item.tenThuoc,

                    item.soLo,

                    item.maKhoThuoc,

                    item.maThuoc

                ]
                    .join(" ")
                    .toLowerCase();


                const matchKeyword =
                    !keyword
                    ||
                    searchText.includes(
                        keyword
                    );


                const matchStatus =
                    !status
                    ||
                    item.trangThai === status;


                return (
                    matchKeyword
                    &&
                    matchStatus
                );

            }
        );


    currentPage = 1;


    renderTable();

    renderPagination();

}


/* =========================================================
   RENDER TABLE
========================================================= */

function renderTable() {

    tableBody.innerHTML = "";


    const total =
        filteredKhoThuoc.length;


    /* =========================
       EMPTY
    ========================= */

    if (total === 0) {

        emptyBox.hidden = false;

        tableResult.textContent =
            "Hiển thị 0 - 0 trên 0 kết quả";

        pagination.innerHTML = "";

        return;

    }


    emptyBox.hidden = true;


    const totalPages =
        Math.ceil(
            total / PAGE_SIZE
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
        filteredKhoThuoc.slice(
            startIndex,
            endIndex
        );


    pageData.forEach(
        function (item, index) {

            const tr =
                document.createElement(
                    "tr"
                );


            const stt =
                startIndex
                +
                index
                +
                1;


            const maKho =
                `K${String(
                    item.maKhoThuoc
                ).padStart(3, "0")}`;


            const maThuocText =
                `T${String(
                    item.maThuoc
                ).padStart(3, "0")}`;


            const statusClass =
                getStatusClass(
                    item.trangThai
                );


            tr.innerHTML = `

                <td class="col-stt">
                    ${stt}
                </td>


                <td>
                    <span class="kho-code">
                        ${maKho}
                    </span>
                </td>


                <td>

                    <div class="medicine-name">

                        <span class="medicine-code">
                            ${maThuocText}
                        </span>

                        ${escapeHtml(
                            item.tenThuoc || ""
                        )}

                    </div>

                </td>


                <td>

                    <span class="quantity-value">
                        ${item.soLuongTon ?? 0}
                    </span>

                </td>


                <td>
                    ${escapeHtml(
                        item.soLo || ""
                    )}
                </td>


                <td>
                    ${formatDate(
                        item.hanSuDung
                    )}
                </td>


                <td>
                    ${item.soLuongToiThieu ?? 0}
                </td>


                <td>

                    <span
                        class="status-badge ${statusClass}">

                        ${escapeHtml(
                            item.trangThai || ""
                        )}

                    </span>

                </td>


                <td class="col-action">

                    <div class="action-buttons">

                        <button
                            type="button"
                            class="action-button"
                            title="Xem"
                            onclick="viewKhoThuoc(
                                ${item.maKhoThuoc}
                            )">

                            👁

                        </button>


                        <button
                            type="button"
                            class="action-button"
                            title="Sửa"
                            onclick="editKhoThuoc(
                                ${item.maKhoThuoc}
                            )">

                            ✎

                        </button>


                        <button
                            type="button"
                            class="action-button"
                            title="Xóa"
                            onclick="openDeleteModal(
                                ${item.maKhoThuoc}
                            )">

                            🗑

                        </button>

                    </div>

                </td>

            `;


            tableBody.appendChild(tr);

        }
    );


    tableResult.textContent =
        `Hiển thị ${
            startIndex + 1
        } - ${
            endIndex
        } trên ${
            total
        } kết quả`;

}


/* =========================================================
   STATUS CLASS
========================================================= */

function getStatusClass(status) {

    switch (status) {

        case "Đủ hàng":

            return "status-good";


        case "Sắp hết":

            return "status-warning";


        case "Hết hàng":

            return "status-danger";


        case "Hết hạn":

            return "status-expired";


        default:

            return "";

    }

}


/* =========================================================
   PAGINATION
========================================================= */

function renderPagination() {

    pagination.innerHTML = "";


    const totalPages =
        Math.ceil(
            filteredKhoThuoc.length
            /
            PAGE_SIZE
        );


    if (totalPages <= 1) {

        return;

    }


    /* =========================
       PREVIOUS
    ========================= */

    const prev =
        document.createElement(
            "button"
        );


    prev.type = "button";

    prev.className =
        "page-button";

    prev.textContent = "‹";

    prev.disabled =
        currentPage === 1;


    prev.onclick =
        function () {

            if (
                currentPage > 1
            ) {

                currentPage--;

                renderTable();

                renderPagination();

            }

        };


    pagination.appendChild(prev);


    /* =========================
       PAGE NUMBERS
    ========================= */

    for (
        let i = 1;
        i <= totalPages;
        i++
    ) {

        const button =
            document.createElement(
                "button"
            );


        button.type = "button";

        button.className =
            "page-button"
            +
            (
                i === currentPage
                    ? " active"
                    : ""
            );


        button.textContent =
            i;


        button.onclick =
            function () {

                currentPage = i;

                renderTable();

                renderPagination();

            };


        pagination.appendChild(
            button
        );

    }


    /* =========================
       NEXT
    ========================= */

    const next =
        document.createElement(
            "button"
        );


    next.type = "button";

    next.className =
        "page-button";

    next.textContent = "›";

    next.disabled =
        currentPage === totalPages;


    next.onclick =
        function () {

            if (
                currentPage <
                totalPages
            ) {

                currentPage++;

                renderTable();

                renderPagination();

            }

        };


    pagination.appendChild(next);

}


/* =========================================================
   OPEN ADD MODAL
========================================================= */

function openAddModal() {

    editingId = null;


    form.reset();


    document.getElementById(
        "khoModalTitle"
    ).textContent =
        "Nhập thuốc vào kho";


    document.getElementById(
        "khoModalSubtitle"
    ).textContent =
        "Thêm thông tin lô thuốc";


    clearErrors();


    setFormDisabled(false);


    modal.hidden = false;

}


/* =========================================================
   VIEW
========================================================= */

function viewKhoThuoc(id) {

    const item =
        allKhoThuoc.find(
            function (x) {

                return Number(
                    x.maKhoThuoc
                )
                ===
                Number(id);

            }
        );


    if (!item) {

        return;

    }


    editingId = null;


    maThuoc.value =
        item.maThuoc ?? "";


    soLuongTon.value =
        item.soLuongTon ?? 0;


    soLuongToiThieu.value =
        item.soLuongToiThieu ?? 0;


    soLo.value =
        item.soLo ?? "";


    hanSuDung.value =
        item.hanSuDung ?? "";


    document.getElementById(
        "khoModalTitle"
    ).textContent =
        "Chi tiết kho thuốc";


    document.getElementById(
        "khoModalSubtitle"
    ).textContent =
        `Mã kho: K${String(
            item.maKhoThuoc
        ).padStart(3, "0")}`;


    clearErrors();


    setFormDisabled(true);


    modal.hidden = false;

}


/* =========================================================
   EDIT
========================================================= */

function editKhoThuoc(id) {

    const item =
        allKhoThuoc.find(
            function (x) {

                return Number(
                    x.maKhoThuoc
                )
                ===
                Number(id);

            }
        );


    if (!item) {

        return;

    }


    editingId = id;


    maThuoc.value =
        item.maThuoc ?? "";


    soLuongTon.value =
        item.soLuongTon ?? 0;


    soLuongToiThieu.value =
        item.soLuongToiThieu ?? 0;


    soLo.value =
        item.soLo ?? "";


    hanSuDung.value =
        item.hanSuDung ?? "";


    document.getElementById(
        "khoModalTitle"
    ).textContent =
        "Chỉnh sửa kho thuốc";


    document.getElementById(
        "khoModalSubtitle"
    ).textContent =
        "Cập nhật thông tin lô thuốc";


    clearErrors();


    setFormDisabled(false);


    modal.hidden = false;

}


/* =========================================================
   FORM DISABLED
========================================================= */

function setFormDisabled(
    disabled
) {

    maThuoc.disabled =
        disabled;

    soLuongTon.disabled =
        disabled;

    soLuongToiThieu.disabled =
        disabled;

    soLo.disabled =
        disabled;

    hanSuDung.disabled =
        disabled;


    const saveButton =
        document.getElementById(
            "btnSaveKho"
        );


    saveButton.style.display =
        disabled
            ? "none"
            : "inline-flex";

}


/* =========================================================
   SAVE
========================================================= */

async function saveKhoThuoc() {

    clearErrors();


    const data = {

        maThuoc:
            Number(
                maThuoc.value
            ),

        soLuongTon:
            Number(
                soLuongTon.value
            ),

        soLuongToiThieu:
            Number(
                soLuongToiThieu.value
            ),

        soLo:
            soLo.value.trim(),

        hanSuDung:
            hanSuDung.value

    };


    /* =========================
       VALIDATE THUỐC
    ========================= */

    if (
        !data.maThuoc
    ) {

        showFieldError(
            "maThuocError",
            "Vui lòng chọn thuốc."
        );

        return;

    }


    /* =========================
       VALIDATE TỒN
    ========================= */

    if (
        isNaN(data.soLuongTon)
        ||
        data.soLuongTon < 0
    ) {

        showFieldError(
            "soLuongTonError",
            "Số lượng tồn phải lớn hơn hoặc bằng 0."
        );

        return;

    }


    /* =========================
       VALIDATE TỐI THIỂU
    ========================= */

    if (
        isNaN(
            data.soLuongToiThieu
        )
        ||
        data.soLuongToiThieu < 0
    ) {

        showFieldError(
            "soLuongToiThieuError",
            "Số lượng tối thiểu phải lớn hơn hoặc bằng 0."
        );

        return;

    }


    /* =========================
       VALIDATE SỐ LÔ
    ========================= */

    if (
        !data.soLo
    ) {

        showFieldError(
            "soLoError",
            "Vui lòng nhập số lô."
        );

        return;

    }


    if (
        data.soLo.length > 100
    ) {

        showFieldError(
            "soLoError",
            "Số lô không được vượt quá 100 ký tự."
        );

        return;

    }


    /* =========================
       VALIDATE HẠN SỬ DỤNG
    ========================= */

    if (
        !data.hanSuDung
    ) {

        showFieldError(
            "hanSuDungError",
            "Vui lòng chọn hạn sử dụng."
        );

        return;

    }


    try {

        const url =
            editingId
                ? `${KHO_API}/${editingId}`
                : KHO_API;


        const method =
            editingId
                ? "PUT"
                : "POST";


        const saveButton =
            document.getElementById(
                "btnSaveKho"
            );


        saveButton.disabled = true;


        const response =
            await fetch(
                url,
                {
                    method: method,

                    headers:
                        getHeaders(true),

                    body:
                        JSON.stringify(data)
                }
            );


        /* =========================
           401
        ========================= */

        if (
            response.status === 401
        ) {

            redirectLogin();

            return;

        }


        /* =========================
           ERROR
        ========================= */

        if (
            !response.ok
        ) {

            const errorText =
                await response.text();


            console.error(
                "Save KhoThuoc:",
                response.status,
                errorText
            );


            throw new Error(
                errorText
                ||
                "Không thể lưu dữ liệu kho thuốc."
            );

        }


        /* =========================
           CLOSE + RELOAD
        ========================= */

        closeModal();


        await loadKhoThuoc();


        showToast(
            "Thành công",
            editingId
                ? "Cập nhật kho thuốc thành công."
                : "Nhập thuốc vào kho thành công.",
            "success"
        );


    } catch (error) {

        console.error(
            "Lỗi lưu kho thuốc:",
            error
        );


        showToast(
            "Lỗi",
            error.message
                ||
                "Không thể lưu kho thuốc.",
            "error"
        );


    } finally {

        const saveButton =
            document.getElementById(
                "btnSaveKho"
            );


        saveButton.disabled =
            false;

    }

}


/* =========================================================
   DELETE
========================================================= */

function openDeleteModal(id) {

    deleteId = id;


    document.getElementById(
        "deleteKhoModal"
    ).hidden = false;

}


async function confirmDelete() {

    if (!deleteId) {

        return;

    }


    try {

        const response =
            await fetch(
                `${KHO_API}/${deleteId}`,
                {
                    method: "DELETE",
                    headers: getHeaders()
                }
            );


        /* =========================
           401
        ========================= */

        if (
            response.status === 401
        ) {

            redirectLogin();

            return;

        }


        /* =========================
           ERROR
        ========================= */

        if (
            !response.ok
        ) {

            const errorText =
                await response.text();


            console.error(
                "Delete KhoThuoc:",
                response.status,
                errorText
            );


            throw new Error(
                errorText
                ||
                "Không thể xóa kho thuốc."
            );

        }


        closeDeleteModal();


        await loadKhoThuoc();


        showToast(
            "Thành công",
            "Xóa kho thuốc thành công.",
            "success"
        );


    } catch (error) {

        console.error(
            "Lỗi xóa kho thuốc:",
            error
        );


        showToast(
            "Lỗi",
            error.message
                ||
                "Không thể xóa kho thuốc.",
            "error"
        );

    }

}


/* =========================================================
   CLOSE DELETE MODAL
========================================================= */

function closeDeleteModal() {

    deleteId = null;


    document.getElementById(
        "deleteKhoModal"
    ).hidden = true;

}


/* =========================================================
   CLOSE MAIN MODAL
========================================================= */

function closeModal() {

    modal.hidden = true;


    editingId = null;


    form.reset();


    setFormDisabled(false);


    clearErrors();

}


/* =========================================================
   TOAST
========================================================= */

function showToast(
    title,
    message,
    type = "success"
) {

    const toast =
        document.getElementById(
            "khoToast"
        );


    const toastTitle =
        document.getElementById(
            "toastTitle"
        );


    const toastMessage =
        document.getElementById(
            "toastMessage"
        );


    const toastIcon =
        toast.querySelector(
            ".toast-icon"
        );


    if (!toast) {

        return;

    }


    toast.classList.remove(
        "success",
        "error",
        "warning"
    );


    toast.classList.add(
        type
    );


    toastTitle.textContent =
        title;


    toastMessage.textContent =
        message;


    if (toastIcon) {

        toastIcon.textContent =
            type === "success"
                ? "✓"
                : "!";

    }


    toast.classList.add(
        "show"
    );


    if (toastTimer) {

        clearTimeout(
            toastTimer
        );

    }


    toastTimer =
        setTimeout(
            function () {

                toast.classList.remove(
                    "show"
                );

            },
            3500
        );

}


/* =========================================================
   ERROR
========================================================= */

function showFieldError(
    id,
    message
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.textContent =
            message;

    }

}


function clearErrors() {

    document
        .querySelectorAll(
            ".field-error"
        )
        .forEach(
            function (element) {

                element.textContent =
                    "";

            }
        );

}


/* =========================================================
   DATE
========================================================= */

function formatDate(date) {

    if (!date) {

        return "—";

    }


    const parts =
        String(date).split("-");


    if (
        parts.length !== 3
    ) {

        return date;

    }


    return (
        `${parts[2]}/${parts[1]}/${parts[0]}`
    );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {

    return String(value)

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


/* =========================================================
   EVENTS
========================================================= */

document
    .getElementById(
        "btnAddKhoThuoc"
    )
    .addEventListener(
        "click",
        openAddModal
    );


document
    .getElementById(
        "btnSaveKho"
    )
    .addEventListener(
        "click",
        saveKhoThuoc
    );


document
    .getElementById(
        "btnCloseKhoModal"
    )
    .addEventListener(
        "click",
        closeModal
    );


document
    .getElementById(
        "btnCancelKho"
    )
    .addEventListener(
        "click",
        closeModal
    );


document
    .getElementById(
        "btnConfirmDelete"
    )
    .addEventListener(
        "click",
        confirmDelete
    );


document
    .getElementById(
        "btnCancelDelete"
    )
    .addEventListener(
        "click",
        closeDeleteModal
    );


//document
//    .getElementById(
//        "searchKhoThuoc"
//    )
//    .addEventListener(
//        "input",
//        applyFilters
//    );


document
    .getElementById(
        "filterTrangThai"
    )
    .addEventListener(
        "change",
        applyFilters
    );


document
    .getElementById(
        "btnSearch"
    )
    .addEventListener(
        "click",
        applyFilters
    );

document
    .getElementById("searchKhoThuoc")
    .addEventListener(
        "keydown",
        function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                applyFilters();
            }
        }
    );


document
    .getElementById(
        "btnReset"
    )
    .addEventListener(
        "click",
        function () {

            document.getElementById(
                "searchKhoThuoc"
            ).value = "";


            document.getElementById(
                "filterTrangThai"
            ).value = "";


            applyFilters();

        }
    );


document
    .getElementById(
        "toastClose"
    )
    .addEventListener(
        "click",
        function () {

            document
                .getElementById(
                    "khoToast"
                )
                .classList.remove(
                    "show"
                );

        }
    );


const modalOverlay =
    document.querySelector(
        "[data-close-modal]"
    );


if (modalOverlay) {

    modalOverlay.addEventListener(
        "click",
        closeModal
    );

}


/* =========================================================
   INIT
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        /*
         * Kiểm tra token trước.
         */
        const token =
            getToken();


        if (!token) {

            redirectLogin();

            return;

        }


        /*
         * Quan trọng:
         * Phải tải danh sách thuốc trước
         * để dropdown MaThuoc có dữ liệu.
         */

        await loadThuocOptions();


        /*
         * Sau đó mới tải dữ liệu kho thuốc.
         */

        await loadKhoThuoc();

    }
);