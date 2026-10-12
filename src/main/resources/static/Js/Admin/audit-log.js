const API_URL = "/api/audit-logs";

const PAGE_SIZE = 5;

let allLogs = [];
let filteredLogs = [];

let currentPage = 1;


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

    const token = getToken();

    return {
        "Authorization": "Bearer " + token
    };
}


// =====================================================
// LOAD AUDIT LOG
// =====================================================

async function loadAuditLogs() {

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
                "Không thể tải Audit Log"
            );
        }


        allLogs = await response.json();

        filteredLogs = [...allLogs];


        loadUsers();

        renderTable();

    } catch (error) {

        console.error(
            "Audit Log Error:",
            error
        );


        document.getElementById(
            "auditTableBody"
        ).innerHTML = `
            <tr>

                <td
                    colspan="5"
                    style="
                        text-align:center;
                        padding:30px;
                    "
                >
                    Không thể tải dữ liệu Audit Log
                </td>

            </tr>
        `;
    }
}


// =====================================================
// LOAD USER FILTER
// =====================================================

function loadUsers() {

    const userFilter =
        document.getElementById(
            "userFilter"
        );


    const users = [
        ...new Map(
            allLogs.map(log => [
                log.maNguoiDung,
                log.tenNguoiDung
            ])
        ).entries()
    ];


    userFilter.innerHTML = `
        <option value="all">
            Tất cả
        </option>
    `;


    users.forEach(
        ([id, name]) => {

            if (!id || !name) {
                return;
            }


            const option =
                document.createElement(
                    "option"
                );


            option.value = id;

            option.textContent = name;


            userFilter.appendChild(
                option
            );
        }
    );
}


// =====================================================
// FILTER
// =====================================================

function applyFilters() {

    const time =
        document.getElementById(
            "timeFilter"
        ).value;


    const user =
        document.getElementById(
            "userFilter"
        ).value;


    const keyword =
        document.getElementById(
            "searchInput"
        ).value
        .trim()
        .toLowerCase();


    filteredLogs =
        allLogs.filter(log => {


            // -----------------------------
            // USER
            // -----------------------------

            if (
                user !== "all"
                &&
                String(log.maNguoiDung)
                    !== String(user)
            ) {

                return false;
            }


            // -----------------------------
            // SEARCH
            // -----------------------------

            if (keyword) {

                const text = `
                    ${log.hanhDong || ""}
                    ${log.doiTuong || ""}
                    ${log.noiDung || ""}
                    ${log.tenNguoiDung || ""}
                `.toLowerCase();


                if (
                    !text.includes(keyword)
                ) {

                    return false;
                }
            }


            // -----------------------------
            // TIME
            // -----------------------------

            if (time !== "all") {

                const logDate =
                    new Date(log.thoiGian);

                const now =
                    new Date();


                const diff =
                    now - logDate;


                const oneDay =
                    24 * 60 * 60 * 1000;


                if (
                    time === "today"
                    &&
                    logDate.toDateString()
                    !== now.toDateString()
                ) {

                    return false;
                }


                if (
                    time === "7days"
                    &&
                    diff > 7 * oneDay
                ) {

                    return false;
                }


                if (
                    time === "30days"
                    &&
                    diff > 30 * oneDay
                ) {

                    return false;
                }
            }


            return true;
        });


    currentPage = 1;

    renderTable();
}


// =====================================================
// RENDER TABLE
// =====================================================

function renderTable() {

    const tbody =
        document.getElementById(
            "auditTableBody"
        );


    const start =
        (currentPage - 1)
        * PAGE_SIZE;


    const end =
        start + PAGE_SIZE;


    const pageData =
        filteredLogs.slice(
            start,
            end
        );


    if (pageData.length === 0) {

        tbody.innerHTML = `
            <tr>

                <td
                    colspan="5"
                    style="
                        text-align:center;
                        padding:30px;
                        color:#64748b;
                    "
                >
                    Không có dữ liệu
                </td>

            </tr>
        `;


        renderPagination();

        return;
    }


//    tbody.innerHTML =
//        pageData
//            .map(
//                (log, index) => {
//
//                    const stt =
//                        start + index + 1;
//
//
//                    const actionClass =
//                        getActionClass(
//                            log.hanhDong
//                        );
//
//
//                    return `
//                        <tr>
//
//                            <td>
//                                ${stt}
//                            </td>
//
//
//                            <td>
//                                ${formatDate(
//                                    log.thoiGian
//                                )}
//                            </td>
//
//
//                            <td>
//
//                                <span
//                                    class="user-badge"
//                                >
//                                    ${escapeHtml(
//                                        log.tenNguoiDung
//                                        || "-"
//                                    )}
//                                </span>
//
//                            </td>
//
//
//                            <td>
//
//                                <span
//                                    class="action
//                                           ${actionClass}"
//                                >
//                                    ${escapeHtml(
//                                        log.hanhDong
//                                        || "-"
//                                    )}
//                                </span>
//
//                            </td>
//
//
//                            <td>
//                                ${escapeHtml(
//                                    log.doiTuong
//                                    || "-"
//                                )}
//                            </td>
//
//                        </tr>
//                    `;
//                }
//            )
//            .join("");
    tbody.innerHTML = pageData
        .map(
            (log, index) => {

                const stt =
                    start + index + 1;

                const actionInfo =
                    getActionInfo(log.hanhDong);

                return `
                    <tr>

                        <td>
                            ${stt}
                        </td>

                        <td>
                            ${formatDate(log.thoiGian)}
                        </td>

                        <td>
                            <span class="user-badge">
                                ${escapeHtml(
                                    log.tenNguoiDung || "-"
                                )}
                            </span>
                        </td>

                        <td>
                            <span class="action-badge ${actionInfo.className}">
                                <span class="action-icon">
                                    ${actionInfo.icon}
                                </span>
                                ${actionInfo.label}
                            </span>
                        </td>

                        <td>
                            ${escapeHtml(
                                log.doiTuong || "-"
                            )}
                        </td>

                    </tr>
                `;
            }
        )
    .join("");


    renderPagination();
}


// =====================================================
// ACTION CLASS
// =====================================================

//function getActionClass(action) {
//
//    if (action === "Thêm") {
//        return "action-add";
//    }
//
//
//    if (action === "Sửa") {
//        return "action-edit";
//    }
//
//
//    if (action === "Xóa") {
//        return "action-delete";
//    }
//
//
//    return "";
//}
function getActionInfo(action) {

    switch (action) {

        case "Thêm":
            return {
                className: "action-created",
                icon: "⚑",
                label: "Thêm"
            };

        case "Sửa":
            return {
                className: "action-updated",
                icon: "●",
                label: "Sửa"
            };

        case "Xóa":
            return {
                className: "action-deleted",
                icon: "!",
                label: "Xóa"
            };

        default:
            return {
                className: "action-default",
                icon: "•",
                label: action || "-"
            };
    }
}


// =====================================================
// FORMAT DATE
// =====================================================

function formatDate(value) {

    if (!value) {
        return "-";
    }


    const date =
        new Date(value);


    const day =
        String(date.getDate())
            .padStart(2, "0");


    const month =
        String(date.getMonth() + 1)
            .padStart(2, "0");


    const year =
        date.getFullYear();


    const hours =
        String(date.getHours())
            .padStart(2, "0");


    const minutes =
        String(date.getMinutes())
            .padStart(2, "0");


    return `
        ${day}/${month}/${year}
        ${hours}:${minutes}
    `;
}


// =====================================================
// PAGINATION
// =====================================================

function renderPagination() {

    const totalPages =
        Math.ceil(
            filteredLogs.length
            / PAGE_SIZE
        );


    const pageNumbers =
        document.getElementById(
            "pageNumbers"
        );


    pageNumbers.innerHTML = "";


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

        button.textContent = i;


        if (i === currentPage) {

            button.classList.add(
                "active"
            );
        }


        button.onclick = () => {

            currentPage = i;

            renderTable();
        };


        pageNumbers.appendChild(
            button
        );
    }


    document.getElementById(
        "prevPage"
    ).disabled =
        currentPage === 1;


    document.getElementById(
        "nextPage"
    ).disabled =
        currentPage === totalPages
        || totalPages === 0;
}


// =====================================================
// EVENTS
// =====================================================


// SEARCH BUTTON

document
    .getElementById("searchButton")
    .addEventListener(
        "click",
        applyFilters
    );


// ENTER SEARCH

document
    .getElementById("searchInput")
    .addEventListener(
        "keydown",
        function (event) {

            if (event.key === "Enter") {

                event.preventDefault();

                applyFilters();

            }

        }
    );


// RESET

document
    .getElementById("resetButton")
    .addEventListener(
        "click",
        function () {

            document.getElementById(
                "searchInput"
            ).value = "";

            document.getElementById(
                "timeFilter"
            ).value = "all";

            document.getElementById(
                "userFilter"
            ).value = "all";

            currentPage = 1;

            applyFilters();

        }
    );


// PREVIOUS PAGE

document
    .getElementById("prevPage")
    .addEventListener(
        "click",
        () => {

            if (currentPage > 1) {

                currentPage--;

                renderTable();

            }

        }
    );


// NEXT PAGE

document
    .getElementById("nextPage")
    .addEventListener(
        "click",
        () => {

            const totalPages =
                Math.ceil(
                    filteredLogs.length / PAGE_SIZE
                );

            if (
                currentPage < totalPages
            ) {

                currentPage++;

                renderTable();

            }

        }
    );

// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// =====================================================
// INIT
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    loadAuditLogs
);