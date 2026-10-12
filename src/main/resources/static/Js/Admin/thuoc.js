const API_URL = "/api/medicines";
const PAGE_SIZE = 5;

let allThuoc = [];
let filteredThuoc = [];
let currentPage = 1;

let deleteThuocId = null;


/* =========================
   DOM
========================= */

const keywordInput = document.getElementById("keywordInput");
const statusFilter = document.getElementById("statusFilter");

const searchButton = document.getElementById("searchButton");
const resetButton = document.getElementById("resetButton");

const addThuocButton = document.getElementById("addThuocButton");

const thuocTableBody = document.getElementById("thuocTableBody");
const emptyThuoc = document.getElementById("emptyThuoc");

const tableResult = document.getElementById("tableResult");
const pagination = document.getElementById("pagination");


/* =========================
   MODAL
========================= */

const thuocModal = document.getElementById("thuocModal");
const thuocModalTitle = document.getElementById("thuocModalTitle");
const thuocModalSubtitle = document.getElementById("thuocModalSubtitle");

const closeThuocModal = document.getElementById("closeThuocModal");
const cancelThuocModal = document.getElementById("cancelThuocModal");
const saveThuocButton = document.getElementById("saveThuocButton");


const maThuoc = document.getElementById("maThuoc");
const tenThuoc = document.getElementById("tenThuoc");
const donViTinh = document.getElementById("donViTinh");
const nhaSanXuat = document.getElementById("nhaSanXuat");
const gia = document.getElementById("gia");
const moTa = document.getElementById("moTa");
const trangThai = document.getElementById("trangThai");


/* =========================
   DELETE
========================= */

const deleteConfirmModal =
    document.getElementById("deleteConfirmModal");

const deleteThuocName =
    document.getElementById("deleteThuocName");

const cancelDeleteButton =
    document.getElementById("cancelDeleteButton");

const confirmDeleteButton =
    document.getElementById("confirmDeleteButton");


/* =========================
   TOAST
========================= */

const thuocToast =
    document.getElementById("thuocToast");

const thuocToastTitle =
    document.getElementById("thuocToastTitle");

const thuocToastMessage =
    document.getElementById("thuocToastMessage");

const closeThuocToast =
    document.getElementById("closeThuocToast");

let toastTimer = null;


/* =========================
   TOKEN
========================= */

function getToken() {

    return localStorage.getItem("Token")
        || sessionStorage.getItem("Token");

}


function getHeaders() {

    const token = getToken();

    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };

}


/* =========================
   LOAD
========================= */

async function loadThuoc() {

    try {

        const response = await fetch(API_URL, {
            method: "GET",
            headers: getHeaders()
        });

        if (!response.ok) {

            throw new Error(
                "Không thể tải danh sách thuốc."
            );

        }

        allThuoc = await response.json();

        /*
         * MaThuoc là AUTO_INCREMENT.
         * Sắp xếp ASC để thuốc mới được
         * thêm xuống cuối danh sách.
         */
        allThuoc.sort(function (a, b) {

            return Number(a.maThuoc)
                - Number(b.maThuoc);

        });

        applyFilters();

    } catch (error) {

        console.error(error);

        showToast(
            "Lỗi",
            error.message,
            "error"
        );

    }

}


/* =========================
   FILTER
========================= */

function applyFilters() {

    const keyword =
        keywordInput.value.trim().toLowerCase();

    const status =
        statusFilter.value;


    filteredThuoc = allThuoc.filter(function (thuoc) {

        const ma =
            String(thuoc.maThuoc || "")
                .toLowerCase();

        const ten =
            String(thuoc.tenThuoc || "")
                .toLowerCase();

        const nhaSanXuatValue =
            String(thuoc.nhaSanXuat || "")
                .toLowerCase();

        const donVi =
            String(thuoc.donViTinh || "")
                .toLowerCase();


        const matchKeyword =
            !keyword
            || ma.includes(keyword)
            || ten.includes(keyword)
            || nhaSanXuatValue.includes(keyword)
            || donVi.includes(keyword);


        const matchStatus =
            status === ""
            || String(
                thuoc.trangThai ? 1 : 0
            ) === status;


        return matchKeyword && matchStatus;

    });


    currentPage = 1;

    renderTable();

}


/* =========================
   RENDER TABLE
========================= */

function renderTable() {

    thuocTableBody.innerHTML = "";

    const total =
        filteredThuoc.length;


    if (total === 0) {

        emptyThuoc.hidden = false;

        tableResult.textContent =
            "Hiển thị 0 - 0 trên 0 kết quả";

        pagination.innerHTML = "";

        return;

    }


    emptyThuoc.hidden = true;


    const totalPages =
        Math.ceil(total / PAGE_SIZE);


    if (currentPage > totalPages) {
        currentPage = totalPages;
    }


    const startIndex =
        (currentPage - 1) * PAGE_SIZE;

    const endIndex =
        Math.min(
            startIndex + PAGE_SIZE,
            total
        );


    const pageData =
        filteredThuoc.slice(
            startIndex,
            endIndex
        );


    pageData.forEach(function (thuoc, index) {

        const row =
            document.createElement("tr");


        const ma =
            Number(thuoc.maThuoc);


        /*
         * Hiển thị mã dạng T001, T002...
         * Đây chỉ là cách hiển thị UI.
         * DB vẫn lưu MaThuoc = 1, 2, 3...
         */
        const maHienThi =
            "T" + String(ma).padStart(3, "0");


        const giaHienThi =
            formatCurrency(thuoc.gia);


        const trangThaiHtml =
            thuoc.trangThai

                ? `
                    <span class="status-badge status-active">
                        Đang sử dụng
                    </span>
                  `

                : `
                    <span class="status-badge status-inactive">
                        Ngừng sử dụng
                    </span>
                  `;


        row.innerHTML = `

            <td class="col-stt">
                ${startIndex + index + 1}
            </td>

            <td>
                <span class="thuoc-code">
                    ${escapeHtml(maHienThi)}
                </span>
            </td>

            <td>
                <span class="thuoc-name">
                    ${escapeHtml(
                        thuoc.tenThuoc || "—"
                    )}
                </span>
            </td>

            <td>
                ${escapeHtml(
                    thuoc.donViTinh || "—"
                )}
            </td>

            <td>
                ${escapeHtml(
                    thuoc.nhaSanXuat || "—"
                )}
            </td>

            <td>
                <span class="thuoc-price">
                    ${giaHienThi}
                </span>
            </td>

            <td>
                <div class="thuoc-description"
                     title="${escapeHtml(
                         thuoc.moTa || ""
                     )}">
                    ${escapeHtml(
                        thuoc.moTa || "—"
                    )}
                </div>
            </td>

            <td>
                ${trangThaiHtml}
            </td>

            <td>

                <div class="action-buttons">

                    <button
                        type="button"
                        class="action-button action-view"
                        title="Xem"
                        onclick="viewThuoc(${ma})">
                        👁
                    </button>

                    <button
                        type="button"
                        class="action-button action-edit"
                        title="Sửa"
                        onclick="editThuoc(${ma})">
                        ✎
                    </button>

                    <button
                        type="button"
                        class="action-button action-delete"
                        title="Xóa"
                        onclick="openDeleteThuoc(
                            ${ma},
                            '${escapeJs(
                                thuoc.tenThuoc || ""
                            )}'
                        )">
                        🗑
                    </button>

                </div>

            </td>
        `;


        thuocTableBody.appendChild(row);

    });


    tableResult.textContent =
        `Hiển thị ${startIndex + 1} - ${endIndex} trên ${total} kết quả`;


    renderPagination(totalPages);

}


/* =========================
   PAGINATION
========================= */

function renderPagination(totalPages) {

    pagination.innerHTML = "";


    if (totalPages <= 1) {
        return;
    }


    const previous =
        document.createElement("button");

    previous.type = "button";
    previous.className = "page-button";
    previous.textContent = "‹";

    previous.disabled =
        currentPage === 1;


    previous.addEventListener(
        "click",
        function () {

            if (currentPage > 1) {

                currentPage--;

                renderTable();

            }

        }
    );


    pagination.appendChild(previous);


    for (
        let page = 1;
        page <= totalPages;
        page++
    ) {

        const button =
            document.createElement("button");

        button.type = "button";
        button.className =
            "page-button"
            + (
                page === currentPage
                    ? " active"
                    : ""
            );

        button.textContent = page;


        button.addEventListener(
            "click",
            function () {

                currentPage = page;

                renderTable();

            }
        );


        pagination.appendChild(button);

    }


    const next =
        document.createElement("button");

    next.type = "button";
    next.className = "page-button";
    next.textContent = "›";

    next.disabled =
        currentPage === totalPages;


    next.addEventListener(
        "click",
        function () {

            if (
                currentPage < totalPages
            ) {

                currentPage++;

                renderTable();

            }

        }
    );


    pagination.appendChild(next);

}


/* =========================
   OPEN ADD
========================= */

function openAddThuoc() {

    thuocModalTitle.textContent =
        "Thêm thuốc";

    thuocModalSubtitle.textContent =
        "Nhập thông tin thuốc";


    maThuoc.value = "";

    tenThuoc.value = "";
    donViTinh.value = "";
    nhaSanXuat.value = "";
    gia.value = "";
    moTa.value = "";
    trangThai.value = "1";


    clearErrors();


    setFormDisabled(false);


    thuocModal.hidden = false;

    setTimeout(function () {

        tenThuoc.focus();

    }, 50);

}


/* =========================
   VIEW
========================= */

async function viewThuoc(id) {

    try {

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
                "Không thể tải thông tin thuốc."
            );

        }


        const thuoc =
            await response.json();


        fillThuocForm(thuoc);


        thuocModalTitle.textContent =
            "Xem thuốc";

        thuocModalSubtitle.textContent =
            "Thông tin chi tiết thuốc";


        setFormDisabled(true);


        thuocModal.hidden = false;


    } catch (error) {

        console.error(error);

        showToast(
            "Lỗi",
            error.message,
            "error"
        );

    }

}


/* =========================
   EDIT
========================= */

async function editThuoc(id) {

    try {

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
                "Không thể tải thông tin thuốc."
            );

        }


        const thuoc =
            await response.json();


        fillThuocForm(thuoc);


        thuocModalTitle.textContent =
            "Sửa thuốc";

        thuocModalSubtitle.textContent =
            "Cập nhật thông tin thuốc";


        setFormDisabled(false);


        thuocModal.hidden = false;


    } catch (error) {

        console.error(error);

        showToast(
            "Lỗi",
            error.message,
            "error"
        );

    }

}


/* =========================
   FILL FORM
========================= */

function fillThuocForm(thuoc) {

    maThuoc.value =
        thuoc.maThuoc ?? "";

    tenThuoc.value =
        thuoc.tenThuoc ?? "";

    donViTinh.value =
        thuoc.donViTinh ?? "";

    nhaSanXuat.value =
        thuoc.nhaSanXuat ?? "";

    gia.value =
        thuoc.gia ?? "";

    moTa.value =
        thuoc.moTa ?? "";

    trangThai.value =
        thuoc.trangThai ? "1" : "0";


    clearErrors();

}


/* =========================
   SAVE
========================= */

async function saveThuoc() {

    clearErrors();


    const ten =
        tenThuoc.value.trim();

    const donVi =
        donViTinh.value.trim();

    const nhaMay =
        nhaSanXuat.value.trim();

    const giaValue =
        gia.value;

    const moTaValue =
        moTa.value.trim();


    let valid = true;


    if (!ten) {

        showFieldError(
            "tenThuocError",
            "Vui lòng nhập tên thuốc."
        );

        valid = false;

    }


    if (!giaValue || Number(giaValue) < 0) {

        showFieldError(
            "giaError",
            "Vui lòng nhập giá hợp lệ."
        );

        valid = false;

    }


    if (!valid) {
        return;
    }


    const data = {

        tenThuoc: ten,

        donViTinh:
            donVi || null,

        nhaSanXuat:
            nhaMay || null,

        gia:
            Number(giaValue),

        moTa:
            moTaValue || null,

        trangThai:
            trangThai.value === "1"

    };


    const id =
        maThuoc.value;


    const isEdit =
        Boolean(id);


    try {

        saveThuocButton.disabled = true;


        const response =
            await fetch(
                isEdit
                    ? `${API_URL}/${id}`
                    : API_URL,
                {
                    method:
                        isEdit
                            ? "PUT"
                            : "POST",

                    headers:
                        getHeaders(),

                    body:
                        JSON.stringify(data)
                }
            );


        if (!response.ok) {

            const message =
                await getErrorMessage(
                    response
                );

            throw new Error(message);

        }


        closeThuocModalBox();


        await loadThuoc();


        showToast(
            "Thành công",
            isEdit
                ? "Cập nhật thuốc thành công."
                : "Thêm thuốc thành công."
        );


    } catch (error) {

        console.error(error);

        showToast(
            "Lỗi",
            error.message,
            "error"
        );

    } finally {

        saveThuocButton.disabled = false;

    }

}


/* =========================
   DELETE
========================= */

function openDeleteThuoc(id, name) {

    deleteThuocId = id;

    deleteThuocName.textContent =
        name || "thuốc này";

    deleteConfirmModal.hidden = false;

}


//async function confirmDeleteThuoc() {
//
//    if (!deleteThuocId) {
//        return;
//    }
//
//
//    try {
//
//        confirmDeleteButton.disabled = true;
//
//
//        const response =
//            await fetch(
//                `${API_URL}/${deleteThuocId}`,
//                {
//                    method: "DELETE",
//                    headers: getHeaders()
//                }
//            );
//
//
//        if (!response.ok) {
//
//            const message =
//                await getErrorMessage(
//                    response
//                );
//
//            throw new Error(message);
//
//        }
//
//
//        closeDeleteModal();
//
//
//        await loadThuoc();
//
//
//        showToast(
//            "Thành công",
//            "Xóa thuốc thành công."
//        );
//
//
//    } catch (error) {
//
//        console.error(error);
//
//        showToast(
//            "Lỗi",
//            error.message,
//            "error"
//        );
//
//    } finally {
//
//        confirmDeleteButton.disabled = false;
//
//    }
//
//}
async function confirmDeleteThuoc() {

    if (!deleteThuocId) {
        return;
    }

    try {

        confirmDeleteButton.disabled = true;

        const response = await fetch(
            `${API_URL}/${deleteThuocId}`,
            {
                method: "DELETE",
                headers: getHeaders()
            }
        );

        // Backend trả về String
        const message = await response.text();

        if (!response.ok) {
            throw new Error(
                message || "Không thể xóa thuốc."
            );
        }

        // Đóng modal
        closeDeleteModal();

        // =====================================================
        // PHÂN BIỆT:
        // 1. Xóa thật
        // 2. Chuyển sang Ngừng sử dụng
        // =====================================================

        if (
            message.includes("Ngừng sử dụng") ||
            message.includes("ngừng sử dụng")
        ) {

            showToast(
                "Thuốc đã ngừng sử dụng",
                message,
                "warning"
            );

        } else {

            showToast(
                "Xóa thành công",
                message,
                "success"
            );
        }

        // Load lại danh sách
        await loadThuoc();

    } catch (error) {

        console.error(
            "Lỗi xóa thuốc:",
            error
        );

        showToast(
            "Lỗi",
            error.message ||
                "Có lỗi xảy ra khi xóa thuốc.",
            "error"
        );

    } finally {

        confirmDeleteButton.disabled = false;

        deleteThuocId = null;
    }
}

/* =========================
   CLOSE MODAL
========================= */

function closeThuocModalBox() {

    thuocModal.hidden = true;

    clearErrors();

    setFormDisabled(false);

}


function closeDeleteModal() {

    deleteConfirmModal.hidden = true;

    deleteThuocId = null;

}


/* =========================
   FORM DISABLED
========================= */

function setFormDisabled(disabled) {

    tenThuoc.disabled = disabled;
    donViTinh.disabled = disabled;
    nhaSanXuat.disabled = disabled;
    gia.disabled = disabled;
    moTa.disabled = disabled;
    trangThai.disabled = disabled;


    saveThuocButton.style.display =
        disabled
            ? "none"
            : "inline-flex";

}


/* =========================
   ERROR
========================= */

function clearErrors() {

    document
        .querySelectorAll(".field-error")
        .forEach(function (element) {

            element.textContent = "";

        });

}


function showFieldError(id, message) {

    const element =
        document.getElementById(id);

    if (element) {
        element.textContent = message;
    }

}


/* =========================
   TOAST
========================= */

//function showToast(
//    title,
//    message,
//    type = "success"
//) {
//
//    clearTimeout(toastTimer);
//
//
//    thuocToastTitle.textContent =
//        title;
//
//    thuocToastMessage.textContent =
//        message;
//
//
//    if (type === "error") {
//
//        thuocToastIcon.textContent = "!";
//
//        thuocToastIcon.style.background =
//            "#fee2e2";
//
//        thuocToastIcon.style.color =
//            "#dc2626";
//
//    } else {
//
//        thuocToastIcon.textContent = "✓";
//
//        thuocToastIcon.style.background =
//            "#dcfce7";
//
//        thuocToastIcon.style.color =
//            "#16a34a";
//
//    }
//
//
//    thuocToast.classList.add("show");
//
//
//    toastTimer =
//        setTimeout(function () {
//
//            thuocToast.classList.remove(
//                "show"
//            );
//
//        }, 3500);
//
//}
function showToast(
    title,
    message,
    type = "success"
) {

    clearTimeout(toastTimer);

    thuocToastTitle.textContent = title;
    thuocToastMessage.textContent = message;

    // =====================================================
    // ERROR
    // =====================================================

    if (type === "error") {

        thuocToastIcon.textContent = "!";

        thuocToastIcon.style.background =
            "#fee2e2";

        thuocToastIcon.style.color =
            "#dc2626";
    }

    // =====================================================
    // WARNING
    // =====================================================

    else if (type === "warning") {

        thuocToastIcon.textContent = "!";

        thuocToastIcon.style.background =
            "#fef3c7";

        thuocToastIcon.style.color =
            "#d97706";
    }

    // =====================================================
    // SUCCESS
    // =====================================================

    else {

        thuocToastIcon.textContent = "✓";

        thuocToastIcon.style.background =
            "#dcfce7";

        thuocToastIcon.style.color =
            "#16a34a";
    }

    thuocToast.classList.add("show");

    toastTimer = setTimeout(function () {

        thuocToast.classList.remove("show");

    }, 3500);
}

/* =========================
   ERROR RESPONSE
========================= */

async function getErrorMessage(response) {

    try {

        const data =
            await response.json();

        if (data.message) {
            return data.message;
        }

        if (data.error) {
            return data.error;
        }

    } catch (error) {
        // Không có JSON
    }


    return "Có lỗi xảy ra. Vui lòng thử lại.";

}


/* =========================
   FORMAT MONEY
========================= */

function formatCurrency(value) {

    const number =
        Number(value || 0);

    return number.toLocaleString(
        "vi-VN"
    ) + "đ";

}


/* =========================
   HTML ESCAPE
========================= */

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function escapeJs(value) {

    return String(value ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "");

}


/* =========================
   EVENTS
========================= */

addThuocButton.addEventListener(
    "click",
    openAddThuoc
);


searchButton.addEventListener(
    "click",
    applyFilters
);


resetButton.addEventListener(
    "click",
    function () {

        keywordInput.value = "";
        statusFilter.value = "";

        applyFilters();

    }
);


keywordInput.addEventListener(
    "keydown",
    function (event) {

        if (event.key === "Enter") {

            applyFilters();

        }

    }
);


closeThuocModal.addEventListener(
    "click",
    closeThuocModalBox
);


cancelThuocModal.addEventListener(
    "click",
    closeThuocModalBox
);


saveThuocButton.addEventListener(
    "click",
    saveThuoc
);


cancelDeleteButton.addEventListener(
    "click",
    closeDeleteModal
);


confirmDeleteButton.addEventListener(
    "click",
    confirmDeleteThuoc
);


closeThuocToast.addEventListener(
    "click",
    function () {

        thuocToast.classList.remove(
            "show"
        );

    }
);


/* =========================
   ESC
========================= */

document.addEventListener(
    "keydown",
    function (event) {

        if (event.key !== "Escape") {
            return;
        }


        if (!thuocModal.hidden) {

            closeThuocModalBox();

        }


        if (!deleteConfirmModal.hidden) {

            closeDeleteModal();

        }

    }
);


/* =========================
   INIT
========================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadThuoc();

    }
);