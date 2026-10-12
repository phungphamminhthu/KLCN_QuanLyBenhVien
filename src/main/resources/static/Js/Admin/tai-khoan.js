document.addEventListener("DOMContentLoaded", function () {

    /* ==================================================
       DATA
    ================================================== */

    let Accounts = [];
    let FilteredAccounts = [];
    let CurrentPage = 1;

    const PageSize = 5;


    /* ==================================================
       DOM
    ================================================== */

    const AccountTableBody =
        document.getElementById("accountTableBody");

    const KeywordInput =
        document.getElementById("keywordInput");

    const RoleFilter =
        document.getElementById("roleFilter");

    const StatusFilter =
        document.getElementById("statusFilter");

    const SearchButton =
        document.getElementById("searchButton");

    const ResetButton =
        document.getElementById("resetButton");

    const TableResult =
        document.getElementById("tableResult");

    const Pagination =
        document.getElementById("pagination");


    if (!AccountTableBody) {
        return;
    }


    /* ==================================================
       TOKEN
    ================================================== */

    function getToken() {

        return (
            localStorage.getItem("Token")
            ||
            sessionStorage.getItem("Token")
        );
    }


    /* ==================================================
       ACCOUNT ID
    ================================================== */

    function getAccountId(Account) {

        return (
            Account.maNguoiDung
            ??
            Account.MaNguoiDung
            ??
            Account.id
            ??
            Account.ID
        );
    }


    /* ==================================================
       FULL NAME
    ================================================== */

    function getFullName(Account) {

        return (
            Account.hoTen
            ??
            Account.HoTen
            ??
            "Chưa cập nhật"
        );
    }


    /* ==================================================
       USERNAME
    ================================================== */

    function getUsername(Account) {

        return (
            Account.tenDangNhap
            ??
            Account.TenDangNhap
            ??
            Account.username
            ??
            ""
        );
    }


    /* ==================================================
       EMAIL
    ================================================== */

    function getEmail(Account) {

        return (
            Account.email
            ??
            Account.Email
            ??
            ""
        );
    }


    /* ==================================================
       PHONE
    ================================================== */

    function getPhone(Account) {

        return (
            Account.soDienThoai
            ??
            Account.SoDienThoai
            ??
            ""
        );
    }


    /* ==================================================
       AVATAR
    ================================================== */

    function getAvatar(Account) {

        return (
            Account.anhDaiDien
            ??
            Account.AnhDaiDien
            ??
            ""
        );
    }


    /* ==================================================
       ROLE ID
    ================================================== */

    function getRoleId(Account) {

        if (Account.maVaiTro != null) {

            return Number(
                Account.maVaiTro
            );
        }


        if (Account.MaVaiTro != null) {

            return Number(
                Account.MaVaiTro
            );
        }


        if (
            Account.vaiTro
            &&
            typeof Account.vaiTro === "object"
        ) {

            return Number(
                Account.vaiTro.maVaiTro
                ??
                Account.vaiTro.MaVaiTro
            );
        }


        return null;
    }


    /* ==================================================
       ROLE NAME
    ================================================== */

    function getRoleName(Account) {

        if (
            Account.vaiTro
            &&
            typeof Account.vaiTro === "object"
        ) {

            return (
                Account.vaiTro.tenVaiTro
                ||
                Account.vaiTro.TenVaiTro
                ||
                "Chưa xác định"
            );
        }


        if (
            typeof Account.vaiTro === "string"
        ) {

            return Account.vaiTro;
        }


        if (Account.tenVaiTro) {

            return Account.tenVaiTro;
        }


        const RoleMap = {

            1: "Quản trị viên",

            2: "Bác sĩ",

            3: "Nhân viên tiếp nhận",

            4: "Dược sĩ",

            5: "Nhân viên chuyên trách",

            6: "Bệnh nhân"
        };


        return (
            RoleMap[getRoleId(Account)]
            ||
            "Chưa xác định"
        );
    }


    /* ==================================================
       STATUS
    ================================================== */

    function getStatus(Account) {

        const Status =
            Account.trangThai
            ??
            Account.TrangThai;


        return (
            Status === true
            ||
            Status === "Đang hoạt động"
            ||
            Status === "Hoạt động"
        )
            ? "Đang hoạt động"
            : "Tạm khóa";
    }


    /* ==================================================
       INITIALS
    ================================================== */

    function getInitials(Name) {

        if (!Name) {
            return "?";
        }


        const Words =
            Name
                .trim()
                .split(/\s+/);


        if (Words.length === 1) {

            return Words[0]
                .substring(0, 2)
                .toUpperCase();
        }


        return (
            Words[0].charAt(0)
            +
            Words[Words.length - 1].charAt(0)
        ).toUpperCase();
    }


    /* ==================================================
       ESCAPE HTML
    ================================================== */

    function escapeHtml(Value) {

        return String(Value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    /* ==================================================
       ROLE CLASS
    ================================================== */

    function getRoleClass(Role) {

        const Classes = {

            "Quản trị viên":
                "role-admin",

            "Bác sĩ":
                "role-doctor",

            "Nhân viên tiếp nhận":
                "role-reception",

            "Dược sĩ":
                "role-pharmacist",

            "Nhân viên chuyên trách":
                "role-specialist",

            "Bệnh nhân":
                "role-patient"
        };


        return (
            Classes[Role]
            ||
            "role-patient"
        );
    }


    /* ==================================================
       MODAL DOM
    ================================================== */

    const AccountStatusModal =
        document.getElementById(
            "accountStatusModal"
        );

    const AccountStatusTitle =
        document.getElementById(
            "accountStatusTitle"
        );

    const AccountStatusMessage =
        document.getElementById(
            "accountStatusMessage"
        );

    const AccountStatusIcon =
        document.getElementById(
            "accountStatusIcon"
        );

    const AccountStatusCancel =
        document.getElementById(
            "accountStatusCancel"
        );

    const AccountStatusConfirm =
        document.getElementById(
            "accountStatusConfirm"
        );


    let PendingAccountId = null;

    let PendingAccountStatus = null;


    /* ==================================================
       TOAST DOM
    ================================================== */

    const AccountToast =
        document.getElementById(
            "accountToast"
        );

    const AccountToastIcon =
        document.getElementById(
            "accountToastIcon"
        );

    const AccountToastTitle =
        document.getElementById(
            "accountToastTitle"
        );

    const AccountToastMessage =
        document.getElementById(
            "accountToastMessage"
        );

    const AccountToastClose =
        document.getElementById(
            "accountToastClose"
        );


    let AccountToastTimer = null;


    /* ==================================================
       TOAST
    ================================================== */

    function showAccountToast(
        Message,
        Type = "success"
    ) {

        if (!AccountToast) {
            return;
        }


        AccountToast.classList.remove(
            "success",
            "error",
            "warning"
        );


        AccountToast.classList.add(
            Type
        );


        if (Type === "success") {

            if (AccountToastIcon) {
                AccountToastIcon.textContent =
                    "✓";
            }

            if (AccountToastTitle) {
                AccountToastTitle.textContent =
                    "Thành công";
            }

        } else if (Type === "error") {

            if (AccountToastIcon) {
                AccountToastIcon.textContent =
                    "!";
            }

            if (AccountToastTitle) {
                AccountToastTitle.textContent =
                    "Có lỗi xảy ra";
            }

        } else {

            if (AccountToastIcon) {
                AccountToastIcon.textContent =
                    "!";
            }

            if (AccountToastTitle) {
                AccountToastTitle.textContent =
                    "Cảnh báo";
            }
        }


        if (AccountToastMessage) {

            AccountToastMessage.textContent =
                Message;
        }


        AccountToast.classList.add(
            "show"
        );


        if (AccountToastTimer) {

            clearTimeout(
                AccountToastTimer
            );
        }


        AccountToastTimer =
            setTimeout(
                function () {

                    AccountToast.classList.remove(
                        "show"
                    );

                },
                3500
            );
    }


    /* ==================================================
       CLOSE TOAST
    ================================================== */

    AccountToastClose?.addEventListener(
        "click",
        function () {

            AccountToast?.classList.remove(
                "show"
            );

        }
    );


    /* ==================================================
       OPEN STATUS MODAL
    ================================================== */

    function openStatusConfirmModal(
        Id,
        TrangThai,
        Username
    ) {

        if (!AccountStatusModal) {
            return;
        }


        PendingAccountId = Id;

        PendingAccountStatus =
            TrangThai;


        const IsLock =
            TrangThai === false;


        if (IsLock) {

            if (AccountStatusIcon) {

                AccountStatusIcon.textContent =
                    "⚠️";
            }


            if (AccountStatusTitle) {

                AccountStatusTitle.textContent =
                    "Xác nhận khóa tài khoản";
            }


            if (AccountStatusMessage) {

                AccountStatusMessage.innerHTML =
                    `Bạn có chắc chắn muốn khóa tài khoản
                     <strong>"${escapeHtml(Username)}"</strong>
                     không?`;
            }


            if (AccountStatusConfirm) {

                AccountStatusConfirm.textContent =
                    "Khóa tài khoản";

                AccountStatusConfirm.classList.remove(
                    "unlock"
                );
            }

        } else {

            if (AccountStatusIcon) {

                AccountStatusIcon.textContent =
                    "🔓";
            }


            if (AccountStatusTitle) {

                AccountStatusTitle.textContent =
                    "Xác nhận mở khóa tài khoản";
            }


            if (AccountStatusMessage) {

                AccountStatusMessage.innerHTML =
                    `Bạn có muốn mở khóa tài khoản
                     <strong>"${escapeHtml(Username)}"</strong>
                     không?`;
            }


            if (AccountStatusConfirm) {

                AccountStatusConfirm.textContent =
                    "Mở khóa tài khoản";

                AccountStatusConfirm.classList.add(
                    "unlock"
                );
            }
        }


        AccountStatusModal.classList.add(
            "show"
        );
    }


    /* ==================================================
       CLOSE STATUS MODAL
    ================================================== */

    function closeStatusConfirmModal() {

        if (AccountStatusModal) {

            AccountStatusModal.classList.remove(
                "show"
            );
        }


        PendingAccountId = null;

        PendingAccountStatus = null;
    }


    /* ==================================================
       CANCEL STATUS MODAL
    ================================================== */

    AccountStatusCancel?.addEventListener(
        "click",
        function () {

            closeStatusConfirmModal();

        }
    );


    /* ==================================================
       CONFIRM STATUS MODAL
    ================================================== */

    AccountStatusConfirm?.addEventListener(
        "click",
        async function () {

            if (
                PendingAccountId === null
                ||
                PendingAccountStatus === null
            ) {

                return;
            }


            const Id =
                PendingAccountId;

            const TrangThai =
                PendingAccountStatus;


            closeStatusConfirmModal();


            await updateAccountStatus(
                Id,
                TrangThai
            );
        }
    );


    /* ==================================================
       CLICK OUTSIDE MODAL
    ================================================== */

    AccountStatusModal?.addEventListener(
        "click",
        function (Event) {

            if (
                Event.target ===
                AccountStatusModal
            ) {

                closeStatusConfirmModal();
            }
        }
    );


    /* ==================================================
       ESC KEY CLOSE MODAL
    ================================================== */

    document.addEventListener(
        "keydown",
        function (Event) {

            if (
                Event.key === "Escape"
                &&
                AccountStatusModal?.classList.contains(
                    "show"
                )
            ) {

                closeStatusConfirmModal();
            }
        }
    );


    /* ==================================================
       RENDER TABLE
    ================================================== */

    function renderTable() {

        AccountTableBody.innerHTML = "";


        const Start =
            (CurrentPage - 1) * PageSize;


        const PageAccounts =
            FilteredAccounts.slice(
                Start,
                Start + PageSize
            );


        if (PageAccounts.length === 0) {

            AccountTableBody.innerHTML = `
                <tr>
                    <td
                        colspan="7"
                        class="empty-table">
                        Không tìm thấy tài khoản phù hợp.
                    </td>
                </tr>
            `;


            renderPagination();

            updateResult();

            return;
        }


        PageAccounts.forEach(
            Account => {

                const Id =
                    getAccountId(Account);

                const HoTen =
                    getFullName(Account);

                const Username =
                    getUsername(Account);

                const Email =
                    getEmail(Account);

                const Phone =
                    getPhone(Account);

                const VaiTro =
                    getRoleName(Account);

                const TrangThai =
                    getStatus(Account);

                const Initials =
                    getInitials(HoTen);


                const Row =
                    document.createElement("tr");


                Row.innerHTML = `

                    <td>

                        <div class="user-cell">

                            <div class="
                                user-avatar
                                ${Account.avatarClass || "avatar-blue"}
                            ">

                                ${escapeHtml(Initials)}

                            </div>


                            <div class="user-info">

                                <span class="user-name">

                                    ${escapeHtml(HoTen)}

                                </span>


                                <span class="user-department">

                                    ${escapeHtml(
                                        Account.phongBan
                                        ||
                                        "Hệ thống"
                                    )}

                                </span>

                            </div>

                        </div>

                    </td>


                    <td>

                        <span class="username">

                            ${escapeHtml(Username)}

                        </span>

                    </td>


                    <td>

                        <span class="email">

                            ${escapeHtml(Email)}

                        </span>

                    </td>


                    <td>

                        <span class="phone">

                            ${escapeHtml(Phone)}

                        </span>

                    </td>


                    <td>

                        <span class="
                            role-badge
                            ${getRoleClass(VaiTro)}
                        ">

                            ${escapeHtml(VaiTro)}

                        </span>

                    </td>


                    <td>

                        <span class="
                            status-badge
                            ${
                                TrangThai ===
                                "Đang hoạt động"
                                    ? "status-active"
                                    : "status-locked"
                            }
                        ">

                            ${TrangThai}

                        </span>

                    </td>


                    <td>

                        <div class="action-buttons">

                            <button
                                type="button"
                                class="action-button"
                                title="Xem"
                                data-action="view"
                                data-id="${Id}">
                                👁
                            </button>


                            <button
                                type="button"
                                class="action-button"
                                title="Chỉnh sửa"
                                data-action="edit"
                                data-id="${Id}">
                                ✎
                            </button>


                            <button
                                type="button"
                                class="action-button"
                                title="${
                                    TrangThai ===
                                    "Đang hoạt động"
                                        ? "Khóa tài khoản"
                                        : "Mở khóa tài khoản"
                                }"
                                data-action="lock"
                                data-id="${Id}">

                                ${
                                    TrangThai ===
                                    "Đang hoạt động"
                                        ? "♧"
                                        : "♙"
                                }

                            </button>

                        </div>

                    </td>
                `;


                AccountTableBody.appendChild(
                    Row
                );
            }
        );


        renderPagination();

        updateResult();
    }


    /* ==================================================
       PAGINATION
    ================================================== */

    function renderPagination() {

        Pagination.innerHTML = "";


        const TotalPages =
            Math.ceil(
                FilteredAccounts.length /
                PageSize
            );


        if (TotalPages <= 1) {
            return;
        }


        const Previous =
            document.createElement(
                "button"
            );


        Previous.className =
            "page-button";

        Previous.textContent =
            "<";

        Previous.disabled =
            CurrentPage === 1;


        Previous.onclick =
            function () {

                if (CurrentPage > 1) {

                    CurrentPage--;

                    renderTable();
                }
            };


        Pagination.appendChild(
            Previous
        );


        for (
            let Page = 1;
            Page <= TotalPages;
            Page++
        ) {

            const Button =
                document.createElement(
                    "button"
                );


            Button.className =
                "page-button"
                +
                (
                    Page === CurrentPage
                        ? " active"
                        : ""
                );


            Button.textContent =
                Page;


            Button.onclick =
                function () {

                    CurrentPage =
                        Page;

                    renderTable();
                };


            Pagination.appendChild(
                Button
            );
        }


        const Next =
            document.createElement(
                "button"
            );


        Next.className =
            "page-button";

        Next.textContent =
            ">";

        Next.disabled =
            CurrentPage === TotalPages;


        Next.onclick =
            function () {

                if (
                    CurrentPage <
                    TotalPages
                ) {

                    CurrentPage++;

                    renderTable();
                }
            };


        Pagination.appendChild(
            Next
        );
    }


    /* ==================================================
       UPDATE RESULT
    ================================================== */

    function updateResult() {

        const Total =
            FilteredAccounts.length;


        if (Total === 0) {

            TableResult.textContent =
                "Hiển thị 0 trong tổng số 0 tài khoản";

            return;
        }


        const Start =
            (CurrentPage - 1) *
            PageSize +
            1;


        const End =
            Math.min(
                CurrentPage * PageSize,
                Total
            );


        TableResult.textContent =
            `Hiển thị ${Start} đến ${End} trong tổng số ${Total} tài khoản`;
    }


    /* ==================================================
       FILTER
    ================================================== */

    function applyFilter() {

        const Keyword =
            KeywordInput.value
                .trim()
                .toLowerCase();


        const SelectedRole =
            RoleFilter.value;


        const SelectedStatus =
            StatusFilter.value;


        FilteredAccounts =
            Accounts.filter(
                Account => {

                    const MatchKeyword =
                        !Keyword
                        ||
                        getFullName(Account)
                            .toLowerCase()
                            .includes(Keyword)
                        ||
                        getUsername(Account)
                            .toLowerCase()
                            .includes(Keyword)
                        ||
                        getEmail(Account)
                            .toLowerCase()
                            .includes(Keyword)
                        ||
                        getPhone(Account)
                            .toLowerCase()
                            .includes(Keyword);


                    const MatchRole =
                        !SelectedRole
                        ||
                        getRoleId(Account) ===
                        Number(SelectedRole);


                    const MatchStatus =
                        !SelectedStatus
                        ||
                        getStatus(Account) ===
                        SelectedStatus;


                    return (
                        MatchKeyword
                        &&
                        MatchRole
                        &&
                        MatchStatus
                    );
                }
            );


        CurrentPage = 1;

        renderTable();
    }


    /* ==================================================
       LOAD ACCOUNTS
    ================================================== */

    async function loadAccounts() {

        try {

            const Token =
                getToken();


            if (!Token) {

                window.location.href =
                    "/auth/login";

                return;
            }


            const Response =
                await fetch(
                    "/api/users",
                    {
                        method: "GET",

                        headers: {
                            Authorization:
                                `Bearer ${Token}`,

                            "Content-Type":
                                "application/json"
                        }
                    }
                );


            if (
                Response.status === 401
                ||
                Response.status === 403
            ) {

                window.location.href =
                    "/auth/login";

                return;
            }


            if (!Response.ok) {

                throw new Error(
                    "Không thể lấy danh sách tài khoản."
                );
            }


            const Data =
                await Response.json();


            Accounts =
                Array.isArray(Data)
                    ? Data
                    : Data?.data
                        ||
                        Data?.content
                        ||
                        [];


            FilteredAccounts =
                [...Accounts];


            CurrentPage = 1;


            renderTable();

        }

        catch (Error) {

            console.error(
                "Lỗi loadAccounts:",
                Error
            );


            AccountTableBody.innerHTML = `
                <tr>
                    <td
                        colspan="7"
                        class="empty-table">
                        Không thể tải danh sách tài khoản.
                    </td>
                </tr>
            `;


            TableResult.textContent =
                "Không thể tải dữ liệu tài khoản.";
        }
    }


    /* ==================================================
       GLOBAL LOAD
    ================================================== */

    window.loadAccounts =
        loadAccounts;


    /* ==================================================
       SEARCH
    ================================================== */

    SearchButton?.addEventListener(
        "click",
        applyFilter
    );


    KeywordInput?.addEventListener(
        "keydown",
        function (Event) {

            if (Event.key === "Enter") {

                applyFilter();
            }
        }
    );


    /* ==================================================
       RESET
    ================================================== */

    ResetButton?.addEventListener(
        "click",
        function () {

            KeywordInput.value = "";

            RoleFilter.value = "";

            StatusFilter.value = "";


            FilteredAccounts =
                [...Accounts];


            CurrentPage = 1;


            renderTable();
        }
    );


    /* ==================================================
       TABLE ACTIONS
    ================================================== */

    AccountTableBody.addEventListener(
        "click",
        async function (Event) {

            const Button =
                Event.target.closest(
                    ".action-button"
                );


            if (!Button) {
                return;
            }


            const Action =
                Button.dataset.action;


            const Id =
                Number(
                    Button.dataset.id
                );


            const Account =
                Accounts.find(
                    Item =>
                        Number(
                            getAccountId(Item)
                        ) === Id
                );


            if (!Account) {
                return;
            }


            const AccountData = {

                id:
                    getAccountId(Account),

                hoTen:
                    getFullName(Account),

                tenDangNhap:
                    getUsername(Account),

                email:
                    getEmail(Account),

                soDienThoai:
                    getPhone(Account),

                vaiTro:
                    getRoleName(Account),

                maVaiTro:
                    getRoleId(Account),

                trangThai:
                    getStatus(Account),

                anhDaiDien:
                    getAvatar(Account)
            };


            /* XEM */

            if (Action === "view") {

                window.openViewAccountModal(
                    AccountData
                );

                return;
            }


            /* CHỈNH SỬA */

            if (Action === "edit") {

                window.openEditAccountModal(
                    AccountData
                );

                return;
            }


            /* KHÓA / MỞ KHÓA */

            if (Action === "lock") {

                const IsActive =
                    getStatus(Account) ===
                    "Đang hoạt động";


                openStatusConfirmModal(
                    Id,
                    !IsActive,
                    getUsername(Account)
                );


                return;
            }
        }
    );


    /* ==================================================
       UPDATE ACCOUNT STATUS
    ================================================== */

    async function updateAccountStatus(
        Id,
        TrangThai
    ) {

        try {

            const Token =
                getToken();


            const Account =
                Accounts.find(
                    Item =>
                        Number(
                            getAccountId(Item)
                        )
                        ===
                        Number(Id)
                );


            if (!Token || !Account) {
                return;
            }


            const MaVaiTro =
                getRoleId(Account);


            if (!MaVaiTro) {

                showAccountToast(
                    "Không xác định được vai trò tài khoản.",
                    "error"
                );

                return;
            }


            const Response =
                await fetch(
                    `/api/users/${Id}`,
                    {
                        method: "PUT",

                        headers: {

                            Authorization:
                                `Bearer ${Token}`,

                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({

                                tenDangNhap:
                                    getUsername(Account),

                                hoTen:
                                    getFullName(Account),

                                email:
                                    getEmail(Account),

                                soDienThoai:
                                    getPhone(Account)
                                    ||
                                    null,

                                maVaiTro:
                                    MaVaiTro,

                                anhDaiDien:
                                    getAvatar(Account)
                                    ||
                                    null,

                                trangThai:
                                    TrangThai
                            })
                    }
                );


            /* 401 / 403 */

            if (
                Response.status === 401
                ||
                Response.status === 403
            ) {

                showAccountToast(
                    "Bạn không có quyền thực hiện thao tác này.",
                    "error"
                );

                return;
            }


            /* OTHER ERROR */

            if (!Response.ok) {

                const ErrorText =
                    await Response.text();


                throw new Error(
                    ErrorText
                    ||
                    "Không thể cập nhật trạng thái."
                );
            }


            /* SUCCESS */

            showAccountToast(
                TrangThai
                    ? "Đã mở khóa tài khoản."
                    : "Đã khóa tài khoản.",
                "success"
            );


            await loadAccounts();

        }

        catch (Error) {

            console.error(
                "Lỗi updateAccountStatus:",
                Error
            );


            showAccountToast(
                Error.message
                ||
                "Không thể cập nhật trạng thái tài khoản.",
                "error"
            );
        }
    }


    /* ==================================================
       INITIAL LOAD
    ================================================== */

    loadAccounts();

});