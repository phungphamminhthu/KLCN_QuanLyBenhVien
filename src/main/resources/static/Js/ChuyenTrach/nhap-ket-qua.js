
document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    // ============================================
    // 1. KHAI BÁO
    // ============================================

    const $ = id => document.getElementById(id);

    const maLich = Number(
        location.pathname.split("/").filter(Boolean).pop()
    );

    const API = `/api/chuyen-trach/ket-qua/${maLich}`;

    const select = $("orderSelect");
    const content = $("resultContent");
    const conclusion = $("resultConclusion");
    const form = $("resultForm");
    const saveBtn = $("saveResultBtn");
    const finishBtn = $("finishClsBtn");
    const notice = $("resultNotice");

    // Một nút quay lại duy nhất
    const backButton = $("ctBackButton");

    // Popup xác nhận
    const modal = $("ctActionModal");
    const modalTitle = $("ctActionTitle");
    const modalMessage = $("ctActionMessage");
    const modalIcon = $("ctActionIcon");
    const cancelBtn = $("ctActionCancel");
    const confirmBtn = $("ctActionConfirm");

    if (!select || !form || !backButton || !modal) {
        console.error(
            "Trang nhập kết quả thiếu phần tử HTML cần thiết."
        );
        return;
    }

    // Đảm bảo popup luôn căn giữa màn hình.
    document.body.appendChild(modal);

    let orders = [];
    let selectedOrderId = "";

    let savedValues = {
        content: "",
        conclusion: ""
    };

    let busy = false;
    let editable = false;
    let allowNavigation = false;
    let modalActive = false;

    // ============================================
    // 2. TOKEN VÀ API
    // ============================================

    function getToken() {
        return sessionStorage.getItem("Token") ||
               localStorage.getItem("Token");
    }

    async function api(path = "", method = "GET", body = null) {
        const token = getToken();

        if (!token) {
            throw new Error("Vui lòng đăng nhập lại.");
        }

        const response = await fetch(API + path, {
            method,
            cache: "no-store",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
                ...(body !== null
                    ? { "Content-Type": "application/json" }
                    : {})
            },
            body: body !== null
                ? JSON.stringify(body)
                : undefined
        });

        if (!response.ok) {
            let message =
                `Yêu cầu thất bại (HTTP ${response.status}).`;

            try {
                const data = await response.json();

                message = data.detail ||
                          data.message ||
                          message;

            } catch (_) {
                // Giữ thông báo HTTP mặc định
            }

            throw new Error(message);
        }

        return response.json();
    }

    // ============================================
    // 3. HIỂN THỊ DỮ LIỆU
    // ============================================

    function setText(id, value) {
        const node = $(id);

        if (node) {
            node.textContent = value ?? "—";
        }
    }

    function formatDate(value) {
        if (!value) return "—";

        const [date, time] = String(value).split("T");
        const [year, month, day] = date.split("-");

        if (!year || !month || !day) {
            return String(value);
        }

        return `${day}/${month}/${year}` +
               (time ? ` ${time.slice(0, 5)}` : "");
    }

    function showNotice(message, error = false) {
        notice.hidden = false;
        notice.textContent = message;
        notice.classList.toggle("error", error);
    }

    function setBusy(value) {
        busy = value;

        select.disabled = value || orders.length === 0;

        saveBtn.disabled =
            value || !editable || orders.length === 0;

        finishBtn.disabled =
            value || !editable || orders.length === 0;
    }

    // ============================================
    // 4. KIỂM TRA THAY ĐỔI CHƯA LƯU
    // ============================================

    function hasUnsavedChanges() {
        if (!editable || orders.length === 0) {
            return false;
        }

        return content.value !== savedValues.content ||
               conclusion.value !== savedValues.conclusion;
    }

    function showOrder() {
        const order = orders.find(
            x => String(x.maChiDinh) === selectedOrderId
        );

        if (!order) return;

        select.value = selectedOrderId;

        setText("serviceName", order.tenDichVu);
        setText(
            "roomName",
            order.maPhong ?? "Chưa phân phòng"
        );
        setText(
            "orderDate",
            formatDate(order.ngayChiDinh)
        );

        content.value = order.noiDungKetQua || "";
        conclusion.value = order.ketLuan || "";

        savedValues = {
            content: content.value,
            conclusion: conclusion.value
        };
    }

    // ============================================
    // 5. POPUP XÁC NHẬN GIỮA MÀN HÌNH
    // ============================================

    function showModal({
        title,
        message,
        confirmText = "Xác nhận",
        warning = false,
        danger = false
    }) {
        return new Promise(resolve => {

            if (
                modalActive ||
                !modal ||
                !cancelBtn ||
                !confirmBtn
            ) {
                resolve(false);
                return;
            }

            modalActive = true;

            const previousFocus = document.activeElement;

            modalTitle.textContent = title;
            modalMessage.textContent = message;
            confirmBtn.textContent = confirmText;

            modalIcon.classList.toggle(
                "warning",
                warning
            );

            confirmBtn.classList.toggle(
                "danger",
                danger
            );

            const icon = modalIcon.querySelector("i");

            if (icon) {
                icon.className = warning
                    ? "fa-solid fa-triangle-exclamation"
                    : "fa-solid fa-circle-question";
            }

            modal.hidden = false;

            let closed = false;

            function close(result) {
                if (closed) return;

                closed = true;
                modal.hidden = true;
                modalActive = false;

                cancelBtn.removeEventListener(
                    "click", onCancel
                );

                confirmBtn.removeEventListener(
                    "click", onConfirm
                );

                modal.removeEventListener(
                    "click", onOverlay
                );

                document.removeEventListener(
                    "keydown", onKeyDown
                );

                if (previousFocus?.isConnected) {
                    previousFocus.focus();
                }

                resolve(result);
            }

            function onCancel() {
                close(false);
            }

            function onConfirm() {
                close(true);
            }

            function onOverlay(event) {
                if (event.target === modal) {
                    close(false);
                }
            }

            function onKeyDown(event) {
                if (event.key === "Escape") {
                    event.preventDefault();
                    close(false);
                }

                if (event.key === "Tab") {
                    if (
                        event.shiftKey &&
                        document.activeElement === cancelBtn
                    ) {
                        event.preventDefault();
                        confirmBtn.focus();

                    } else if (
                        !event.shiftKey &&
                        document.activeElement === confirmBtn
                    ) {
                        event.preventDefault();
                        cancelBtn.focus();
                    }
                }
            }

            cancelBtn.addEventListener(
                "click", onCancel
            );

            confirmBtn.addEventListener(
                "click", onConfirm
            );

            modal.addEventListener(
                "click", onOverlay
            );

            document.addEventListener(
                "keydown", onKeyDown
            );

            cancelBtn.focus();
        });
    }

    // ============================================
    // 6. CẢNH BÁO KHI RỜI TRANG
    // ============================================

    async function requestNavigation(url) {
        if (busy || modalActive) return;

        if (hasUnsavedChanges()) {
            const confirmed = await showModal({
                title: "Kết quả chưa được lưu",

                message:
                    "Bạn đã thay đổi nội dung kết quả " +
                    "hoặc kết luận nhưng chưa lưu. " +
                    "Nếu thoát bây giờ, các thay đổi này sẽ mất.",

                confirmText: "Thoát không lưu",
                warning: true,
                danger: true
            });

            if (!confirmed) return;
        }

        allowNavigation = true;
        window.location.assign(url);
    }

    // ============================================
    // 7. MỘT NÚT QUAY LẠI TỰ THU GỌN
    // ============================================

    function setupCompactBack() {

        /*
         * Tạo một vị trí giữ chỗ cho nút gốc.
         * Đây KHÔNG phải nút thứ hai.
         */

        const slot = document.createElement("span");
        slot.className = "ct-back-slot";

        backButton.before(slot);
        slot.appendChild(backButton);

        let compact = false;
        let framePending = false;

        // Xác định cạnh dưới header
        function headerBottom() {
            const header =
                document.querySelector(".reception-header") ||
                document.querySelector(".reception-main > header");

            return header
                ? header.getBoundingClientRect().bottom
                : 0;
        }

        function update() {
            framePending = false;

            const headerY = headerBottom();

            // Kiểm tra vị trí ban đầu của nút
            const slotRect = slot.getBoundingClientRect();

            // Chỉ thu gọn khi vị trí gốc đã khuất
            const isPast =
                slotRect.bottom <= headerY + 4;

            // ====================================
            // CUỘN XUỐNG: THU GỌN NÚT
            // ====================================

            if (isPast && !compact) {

                // Giữ kích thước vị trí ban đầu
                // để bố cục không bị nhảy.
                slot.style.width =
                    `${slotRect.width}px`;

                slot.style.height =
                    `${slotRect.height}px`;

                /*
                 * Chuyển CHÍNH nút quay lại vào body.
                 * Không clone, không tạo nút mới.
                 *
                 * Nhờ vậy position: fixed sẽ
                 * không bị ảnh hưởng bởi layout.
                 */
                document.body.appendChild(backButton);

                backButton.classList.add(
                    "ct-back-compact"
                );

                compact = true;
            }

            // ====================================
            // CUỘN LÊN: PHỤC HỒI NÚT GỐC
            // ====================================

            else if (!isPast && compact) {

                backButton.classList.remove(
                    "ct-back-compact"
                );

                // Đưa lại đúng vị trí ban đầu.
                slot.appendChild(backButton);

                slot.style.width = "";
                slot.style.height = "";

                compact = false;
            }

            // ====================================
            // TÍNH VỊ TRÍ NÚT NỔI
            // ====================================

            if (compact) {

                const sidebar = document.querySelector(
                    ".reception-sidebar"
                );

                const left = sidebar
                    ? sidebar.getBoundingClientRect().right + 8
                    : 12;

                const top = headerY + 12;

                backButton.style.setProperty(
                    "--ct-back-left",
                    `${Math.max(8, left)}px`
                );

                backButton.style.setProperty(
                    "--ct-back-top",
                    `${Math.max(8, top)}px`
                );
            }
        }

        function scheduleUpdate() {
            if (framePending) return;

            framePending = true;

            requestAnimationFrame(update);
        }

        /*
         * Theo dõi cả thanh cuộn của cửa sổ
         * và thanh cuộn bên trong layout.
         */
        document.addEventListener(
            "scroll",
            scheduleUpdate,
            true
        );

        window.addEventListener(
            "scroll",
            scheduleUpdate,
            { passive: true }
        );

        window.addEventListener(
            "resize",
            scheduleUpdate
        );

        scheduleUpdate();
    }

    // ============================================
    // 8. XỬ LÝ NHẤN QUAY LẠI
    // ============================================

    backButton.addEventListener("click", event => {
        event.preventDefault();

        requestNavigation(backButton.href);
    });

    // Bảo vệ liên kết menu sidebar và header
    document.addEventListener("click", event => {
        const link = event.target.closest("a[href]");

        if (
            !link ||
            link === backButton ||
            event.defaultPrevented
        ) {
            return;
        }

        if (
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey ||
            event.altKey ||
            event.button !== 0 ||
            link.hasAttribute("download") ||
            (
                link.target &&
                link.target !== "_self"
            )
        ) {
            return;
        }

        const url = new URL(link.href, location.href);

        if (
            !["http:", "https:"].includes(url.protocol) ||
            url.origin !== location.origin
        ) {
            return;
        }

        if (
            !hasUnsavedChanges() ||
            allowNavigation
        ) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        requestNavigation(url.href);

    }, true);

    // Refresh, đóng tab hoặc Back trình duyệt
    window.addEventListener("beforeunload", event => {
        if (
            allowNavigation ||
            !hasUnsavedChanges()
        ) {
            return;
        }

        event.preventDefault();
        event.returnValue = "";
    });

    // ============================================
    // 9. THAY ĐỔI CHỈ ĐỊNH
    // ============================================

    select.addEventListener("change", async () => {
        const nextId = select.value;

        if (nextId === selectedOrderId) {
            return;
        }

        if (hasUnsavedChanges()) {
            const confirmed = await showModal({
                title: "Thay đổi chưa được lưu",

                message:
                    "Nếu chuyển sang chỉ định khác, " +
                    "nội dung vừa nhập nhưng chưa lưu sẽ mất.",

                confirmText: "Chuyển chỉ định",
                warning: true
            });

            if (!confirmed) {
                select.value = selectedOrderId;
                return;
            }
        }

        selectedOrderId = nextId;
        showOrder();
    });

    // ============================================
    // 10. TẢI THÔNG TIN THẬT TỪ MYSQL
    // ============================================

    async function load() {
        try {
            const data = await api();

            setText(
                "patientName",
                data.tenBenhNhan
            );

            setText(
                "patientCode",
                `Mã BN: ${data.maBenhNhan}`
            );

            setText(
                "patientInfo",
                [
                    data.gioiTinh,
                    formatDate(data.ngaySinh)
                ].filter(Boolean).join(" · ")
            );

            setText(
                "appointmentCode",
                data.maLichKham
            );

            setText(
                "doctorName",
                data.bacSiPhuTrach
            );

            setText(
                "pageStatus",
                data.trangThai === "DangCLS"
                    ? "Đang khám chuyên trách"
                    : "Chờ bắt đầu CLS"
            );

            editable = data.trangThai === "DangCLS";

            orders = Array.isArray(data.chiDinh)
                ? data.chiDinh
                : [];

            select.replaceChildren();

            // Trường hợp chưa có chỉ định
            if (orders.length === 0) {

                const option =
                    document.createElement("option");

                option.textContent =
                    "Chưa có chỉ định dịch vụ";

                select.appendChild(option);

                selectedOrderId = "";

                content.value = "";
                conclusion.value = "";

                savedValues = {
                    content: "",
                    conclusion: ""
                };

                setText(
                    "serviceName",
                    "Chưa có chỉ định"
                );

                setText("roomName", "—");
                setText("orderDate", "—");

                showNotice(
                    "Lượt khám chưa có chỉ định dịch vụ " +
                    "từ bác sĩ. Không thể lưu hoặc hoàn tất CLS.",
                    true
                );
            }

            // Có chỉ định thật
            else {
                const requestedId = new URLSearchParams(
                    window.location.search
                ).get("maChiDinh");

                const previousId = selectedOrderId || requestedId;

                for (const order of orders) {
                    const option =
                        document.createElement("option");

                    option.value =
                        String(order.maChiDinh);

                    option.textContent =
                        `CD${order.maChiDinh} - ${order.tenDichVu}`;

                    select.appendChild(option);
                }

                selectedOrderId = orders.some(
                    x => String(x.maChiDinh) === previousId
                )
                    ? previousId
                    : String(orders[0].maChiDinh);

                showOrder();
                notice.hidden = true;
            }

            content.disabled =
                !editable || orders.length === 0;

            conclusion.disabled =
                !editable || orders.length === 0;

            setBusy(false);

        } catch (error) {
            editable = false;
            setBusy(false);

            showNotice(error.message, true);
        }
    }

    // ============================================
    // 11. LƯU KẾT QUẢ
    // ============================================

    form.addEventListener("submit", async event => {
        event.preventDefault();

        if (
            busy ||
            !editable ||
            orders.length === 0
        ) {
            return;
        }

        const noiDung = content.value.trim();
        const ketLuan = conclusion.value.trim();

        if (!noiDung || !ketLuan) {
            showNotice(
                "Vui lòng nhập đầy đủ nội dung " +
                "kết quả và kết luận.",
                true
            );
            return;
        }

        setBusy(true);

        try {
            await api(
                `/chi-dinh/${encodeURIComponent(selectedOrderId)}/luu`,
                "POST",
                {
                    noiDungKetQua: noiDung,
                    ketLuan
                }
            );

            // Chỉ ghi nhận đã lưu sau khi API thành công
            savedValues = {
                content: content.value,
                conclusion: conclusion.value
            };

            await load();

            showNotice(
                "Đã lưu kết quả thành công vào MySQL."
            );

        } catch (error) {
            showNotice(error.message, true);

        } finally {
            setBusy(false);
        }
    });

    // ============================================
    // 12. HOÀN TẤT CLS
    // ============================================

    finishBtn.addEventListener("click", async () => {
        if (
            busy ||
            !editable ||
            orders.length === 0
        ) {
            return;
        }

        // Bắt buộc lưu trước khi hoàn tất
        if (hasUnsavedChanges()) {
            await showModal({
                title: "Bạn chưa lưu kết quả",

                message:
                    "Vui lòng bấm Lưu kết quả " +
                    "trước khi hoàn tất CLS.",

                confirmText: "Đã hiểu",
                warning: true
            });

            return;
        }

        const confirmed = await showModal({
            title: "Xác nhận hoàn tất CLS",

            message:
                "Bạn đã lưu đầy đủ các chỉ định " +
                "và muốn chuyển bệnh nhân về trạng thái " +
                "Chờ khám để bác sĩ tiếp tục xử lý?",

            confirmText: "Hoàn tất CLS"
        });

        if (!confirmed) return;

        setBusy(true);

        try {
            await api("/hoan-tat", "POST");

            allowNavigation = true;

            window.location.assign(
                "/ChuyenTrach/dashboard"
            );

        } catch (error) {
            showNotice(error.message, true);
            setBusy(false);
        }
    });

    // ============================================
    // 13. KHỞI TẠO
    // ============================================

    if (
        !Number.isInteger(maLich) ||
        maLich <= 0
    ) {
        showNotice(
            "Mã lịch khám không hợp lệ.",
            true
        );
        return;
    }

    setupCompactBack();
    load();
});
