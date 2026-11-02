
(() => {
    "use strict";

    // =====================================================
    // MEDCARE DASHBOARD - THÔNG BÁO & TIẾP NHẬN
    // =====================================================

    const PRIMARY = "#4f6ef7";
    const DURATION = 5000;

    let toastTimer = null;
    let modalActive = false;
    let receiving = false;

    // =====================================================
    // 1. CSS - MÀU TÍM CHỦ ĐẠO MEDCARE
    // =====================================================

    const style = document.createElement("style");

    style.id = "dashboard-notification-fix-style";

    style.textContent = `
        :root {
            --medcare-primary: ${PRIMARY};
            --medcare-primary-light: #eef4ff;
            --medcare-primary-border: #cfe0ff;
        }

        #dashboard-message {
            display: none !important;
        }

        #mc-dashboard-toast {
            position: fixed;
            top: 18px;
            left: 50%;
            z-index: 20050;

            width: max-content;
            max-width: min(92vw, 650px);

            padding: 14px 19px;
            border-radius: 12px;

            background: #eef4ff;
            border: 1px solid #cfe0ff;
            color: #23408e;

            box-shadow:
                0 15px 35px rgba(40, 72, 160, .16);

            font-size: 14px;
            font-weight: 600;
            line-height: 1.5;

            transform: translate(-50%, -40px);
            opacity: 0;
            pointer-events: none;

            transition:
                transform .3s ease,
                opacity .3s ease;
        }

        #mc-dashboard-toast[hidden] {
            display: none !important;
        }

        #mc-dashboard-toast.mc-show {
            transform: translate(-50%, 0);
            opacity: 1;
        }

        #mc-dashboard-toast.mc-success {
            background: #eefbf3;
            border-color: #bde8cc;
            color: #1f7a45;
        }

        #mc-dashboard-toast.mc-error {
            background: #fff4f4;
            border-color: #f3c4c4;
            color: #b42318;
        }

        #mc-dashboard-overlay {
            position: fixed;
            inset: 0;
            z-index: 20500;

            background: rgba(20, 18, 45, .48);

            display: flex;
            align-items: center;
            justify-content: center;

            padding: 20px;
            overflow-y: auto;
        }

        #mc-dashboard-overlay[hidden] {
            display: none !important;
        }

        .mc-dialog {
            width: 100%;
            max-width: 510px;

            padding: 0;
            border-radius: 16px;

            background: #fff;
            color: #252840;

            box-shadow:
                0 20px 70px rgba(24, 17, 73, .2);

            overflow: hidden;
            animation: mc-dialog-in .22s ease-out;
        }

        @keyframes mc-dialog-in {
            from {
                opacity: 0;
                transform: translateY(15px) scale(.98);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        .mc-dialog-header {
            display: flex;
            align-items: center;
            gap: 13px;

            padding: 21px 23px;
            border-bottom: 1px solid #e5edf9;
        }

        .mc-dialog-icon {
            display: flex;
            align-items: center;
            justify-content: center;

            width: 45px;
            height: 45px;
            flex: 0 0 45px;

            border-radius: 12px;
            background: var(--medcare-primary-light);
            color: var(--medcare-primary);

            font-size: 22px;
        }

        .mc-dialog-title {
            flex: 1;
            margin: 0;

            color: #1f2a44;
            font-size: 18px;
            font-weight: 750;
            line-height: 1.4;
        }

        .mc-dialog-close {
            border: 0;
            background: transparent;
            color: #7e8aa8;

            font-size: 25px;
            cursor: pointer;
        }

        .mc-dialog-body {
            padding: 21px 24px;
            font-size: 14px;
            line-height: 1.7;
        }

        .mc-dialog-message {
            margin: 0 0 13px;
            font-weight: 600;
            color: #2f3f67;
        }

        .mc-dialog-reasons {
            margin: 0;
            padding: 14px 16px 14px 33px;

            border: 1px solid #d7e6ff;
            border-radius: 10px;

            background: #f5f9ff;
            color: #355189;
        }

        .mc-dialog-reasons li {
            padding-left: 3px;
            margin: 5px 0;
        }

        .mc-dialog-reasons li::marker {
            color: var(--medcare-primary);
        }

        .mc-dialog-hint {
            margin: 15px 0 0;
            padding-top: 13px;
            border-top: 1px solid #e9eef8;

            color: #6c7895;
            font-size: 13px;
        }

        .mc-dialog-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;

            padding: 0 24px 23px;
        }

        .mc-dialog-btn {
            border: 1px solid #d9e3f5;
            border-radius: 9px;
            padding: 10px 17px;

            font-size: 13px;
            font-weight: 700;
            cursor: pointer;

            background: #f7faff;
            color: #39507f;
        }

        .mc-dialog-btn.primary {
            background: var(--medcare-primary);
            border-color: var(--medcare-primary);
            color: #fff;
        }

        .mc-dialog-btn:hover {
            filter: brightness(.96);
        }

        @media (max-width: 575px) {
            .mc-dialog-header {
                padding: 17px;
            }

            .mc-dialog-title {
                font-size: 16px;
            }

            .mc-dialog-body {
                padding: 18px;
            }

            .mc-dialog-actions {
                padding: 0 18px 18px;
                flex-wrap: wrap;
            }
        }

        @media (prefers-reduced-motion: reduce) {
            #mc-dashboard-toast,
            .mc-dialog {
                animation: none;
                transition: none;
            }
        }
    `;

    document.head.appendChild(style);

    // =====================================================
    // 2. TOAST 5 GIÂY
    // =====================================================

    function getToast() {
        let node = document.getElementById(
            "mc-dashboard-toast"
        );

        if (!node) {
            node = document.createElement("div");

            node.id = "mc-dashboard-toast";
            node.hidden = true;

            node.setAttribute("role", "status");
            node.setAttribute("aria-live", "polite");

            document.body.appendChild(node);
        }

        return node;
    }

    function hideToast() {
        clearTimeout(toastTimer);

        const toast = document.getElementById(
            "mc-dashboard-toast"
        );

        if (!toast) return;

        toast.classList.remove("mc-show");

        setTimeout(() => {
            if (!toast.classList.contains("mc-show")) {
                toast.hidden = true;
            }
        }, 310);
    }

    function showToast(message, type = "info") {
        if (!message) return;

        const toast = getToast();

        clearTimeout(toastTimer);

        toast.textContent = String(message);
        toast.className = `mc-${type}`;
        toast.hidden = false;

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                toast.classList.add("mc-show");
            });
        });

        toastTimer = setTimeout(
            hideToast,
            DURATION
        );
    }

    // =====================================================
    // 3. POPUP GIỮA MÀN HÌNH
    // =====================================================

    function showModal({
        title = "Thông báo MedCare",
        message = "",
        reasons = [],
        icon = "fa-clipboard-check",
        confirmText = null,
        closeText = "Đóng",
        autoClose = 0
    } = {}) {

        return new Promise(resolve => {
            if (modalActive) {
                resolve(false);
                return;
            }

            modalActive = true;

            const oldFocus = document.activeElement;

            const overlay =
                document.createElement("div");

            overlay.id = "mc-dashboard-overlay";

            const dialog =
                document.createElement("section");

            dialog.className = "mc-dialog";
            dialog.setAttribute("role", "dialog");
            dialog.setAttribute("aria-modal", "true");
            dialog.setAttribute(
                "aria-labelledby",
                "mc-dialog-title"
            );

            const header =
                document.createElement("div");

            header.className = "mc-dialog-header";

            const iconBox =
                document.createElement("div");

            iconBox.className = "mc-dialog-icon";

            const iconNode =
                document.createElement("i");

            iconNode.className = `fa-solid ${icon}`;

            iconBox.appendChild(iconNode);

            const heading =
                document.createElement("h3");

            heading.className = "mc-dialog-title";
            heading.id = "mc-dialog-title";
            heading.textContent = title;

            const x =
                document.createElement("button");

            x.type = "button";
            x.className = "mc-dialog-close";
            x.textContent = "×";
            x.setAttribute(
                "aria-label",
                "Đóng thông báo"
            );

            header.append(iconBox, heading, x);

            const body =
                document.createElement("div");

            body.className = "mc-dialog-body";

            if (message) {
                const text =
                    document.createElement("p");

                text.className = "mc-dialog-message";
                text.textContent = message;

                body.appendChild(text);
            }

            if (Array.isArray(reasons) && reasons.length) {
                const list =
                    document.createElement("ul");

                list.className = "mc-dialog-reasons";

                for (const reason of reasons) {
                    const li =
                        document.createElement("li");

                    li.textContent = String(reason);
                    list.appendChild(li);
                }

                body.appendChild(list);

                const hint =
                    document.createElement("p");

                hint.className = "mc-dialog-hint";
                hint.textContent =
                    "Vui lòng hoàn tất các điều kiện trên "
                    + "trước khi tiếp nhận.";

                body.appendChild(hint);
            }

            const actions =
                document.createElement("div");

            actions.className = "mc-dialog-actions";

            const close =
                document.createElement("button");

            close.type = "button";
            close.className = "mc-dialog-btn";
            close.textContent = closeText;

            actions.appendChild(close);

            let confirm = null;

            if (confirmText) {
                confirm = document.createElement("button");

                confirm.type = "button";
                confirm.className =
                    "mc-dialog-btn primary";

                confirm.textContent = confirmText;
                actions.appendChild(confirm);
            }

            dialog.append(header, body, actions);
            overlay.appendChild(dialog);

            document.body.appendChild(overlay);

            let finished = false;
            let timer = null;

            function finish(accepted = false) {
                if (finished) return;

                finished = true;
                modalActive = false;

                clearTimeout(timer);

                document.removeEventListener(
                    "keydown",
                    onKeyDown,
                    true
                );

                overlay.remove();

                if (oldFocus?.isConnected) {
                    oldFocus.focus({
                        preventScroll: true
                    });
                }

                resolve(accepted);
            }

            function onKeyDown(event) {
                if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    finish(false);
                }
            }

            x.addEventListener(
                "click",
                () => finish(false)
            );

            close.addEventListener(
                "click",
                () => finish(false)
            );

            confirm?.addEventListener(
                "click",
                () => finish(true)
            );

            document.addEventListener(
                "keydown",
                onKeyDown,
                true
            );

            (confirm || close).focus();

            if (autoClose > 0) {
                timer = setTimeout(
                    () => finish(false),
                    autoClose
                );
            }
        });
    }

    // =====================================================
    // 4. KHÔNG HIỆN THÔNG BÁO TRÙNG KHI GỌI BỆNH NHÂN
    // =====================================================

    window.showDashboardMessage = function (
        message = "",
        isError = false
    ) {
        const old = document.getElementById(
            "dashboard-message"
        );

        if (old) {
            old.hidden = true;
            old.textContent = "";
        }

        const text = String(message || "").trim();

        if (!text) return;

        // Đã có popup Gọi bệnh nhân ở giữa.
        // Không hiện thông báo trùng trên đầu trang.
        if (
            !isError
            && (
                text.startsWith("Đang gọi bệnh nhân")
                || text.startsWith("Đã gọi bệnh nhân")
            )
        ) {
            return;
        }

        // Gọi thất bại: thông báo giữa màn hình.
        if (
            isError
            && typeof callingPatient !== "undefined"
            && callingPatient
        ) {
            void showModal({
                title: "Không thể gọi bệnh nhân",
                message: text,
                icon: "fa-triangle-exclamation"
            });

            return;
        }

        // Xác nhận tiếp nhận thành công:
        // thông báo giữa màn hình trong 5 giây.
        if (
            !isError
            && text.startsWith("Đã tiếp nhận bệnh nhân")
        ) {
            void showModal({
                title: "Tiếp nhận thành công",
                message: text,
                icon: "fa-circle-check",
                autoClose: DURATION
            });

            return;
        }

        // Các thông báo khác trượt từ trên xuống.
        showToast(
            text,
            isError ? "error" : "info"
        );
    };

    // =====================================================
    // 5. XÁC NHẬN TIẾP NHẬN THEO ĐÚNG ĐIỀU KIỆN
    // =====================================================

    window.handleConfirmReception =
        async function (maLichKham) {

        if (receiving || isBusy()) return;

        const id = positiveId(maLichKham);

        const item = globalQueueData.find(
            row =>
                positiveId(row.maLichKham) === id
        );

        if (
            !id
            || !item
            || !canConfirmReception(item)
        ) {
            return;
        }

        receiving = true;
        confirmingReception = true;

        updateBusyControls();
        renderDashboardTables();

        let nextPage = null;

        try {
            // API chỉ kiểm tra điều kiện.
            // Không chuyển trạng thái bệnh nhân.
            const validation = await requestApi(
                `/api/tiepnhan/kiem-tra-tiep-nhan/${id}`
            );

            const reasons = Array.isArray(validation.lyDo)
                ? validation.lyDo
                : [];

            // Có lỗi thì hiển thị đúng các mục còn thiếu.
            if (
                validation.duDieuKien !== true
            ) {
                const goToProfile = await showModal({
                    title: "Chưa đủ điều kiện tiếp nhận",
                    message:
                        `Chưa thể xác nhận tiếp nhận bệnh nhân `
                        + `${item.tenBenhNhan || ""}.`,
                    reasons: reasons.length
                        ? reasons
                        : [
                            "Hệ thống chưa xác nhận "
                            + "đủ điều kiện tiếp nhận."
                        ],
                    icon: "fa-clipboard-list",
                    confirmText: "Đi đến hồ sơ"
                });

                if (goToProfile) {
                    const patientId =
                        positiveId(item.maBenhNhan);

                    if (patientId) {
                        const params =
                            new URLSearchParams({
                                maLichKham: String(id),
                                from: "dashboard"
                            });

                        nextPage =
                            `/TiepNhan/ho-so-benh-nhan/`
                            + patientId
                            + `?${params}`;
                    }
                }

                return;
            }

            // Đã đủ điều kiện:
            // hiển thị hộp thoại tím MedCare.
            const accepted = await showModal({
                title: "Xác nhận tiếp nhận bệnh nhân",
                message:
                    `Xác nhận đã tiếp nhận bệnh nhân `
                    + `${item.tenBenhNhan || ""}?`,
                icon: "fa-clipboard-check",
                confirmText: "Xác nhận tiếp nhận",
                closeText: "Hủy"
            });

            if (!accepted) return;

            // Backend mới là nơi quyết định chuyển
            // TrangThai thành DaTiepNhan.
            const result = await postJson(
                "/api/tiepnhan/confirm-reception",
                {
                    maLichKham: id
                }
            );

            if (result.success !== true) {
                throw new Error(
                    result.message
                    || "Không thể xác nhận tiếp nhận."
                );
            }

            item.trangThai = "Đã tiếp nhận";

            const refreshed =
                await loadDashboardRealData(
                    true,
                    true
                );

            await showModal({
                title: "Tiếp nhận thành công",
                message:
                    refreshed
                        ? `Đã tiếp nhận bệnh nhân `
                          + `${item.tenBenhNhan || ""}. `
                          + `Bệnh nhân chờ bác sĩ bắt đầu khám.`
                        : "Đã tiếp nhận thành công, "
                          + "nhưng chưa tải lại được Dashboard.",
                icon: "fa-circle-check",
                autoClose: DURATION
            });

        } catch (error) {
            // Lỗi thay đổi trạng thái hoặc lỗi mạng:
            // không được tự sửa TrangThai.
            await loadDashboardRealData(true, true);

            await showModal({
                title: "Không thể xác nhận tiếp nhận",
                message:
                    error.message
                    || "Không thể xác nhận tiếp nhận.",
                icon: "fa-triangle-exclamation"
            });

        } finally {
            receiving = false;
            confirmingReception = false;

            updateBusyControls();
            renderDashboardTables();

            if (nextPage) {
                window.location.assign(nextPage);
            }
        }
    };

    // =====================================================
    // 6. API DÙNG CHUNG CHO GIAO DIỆN
    // =====================================================

    window.MedCareDashboardNotice = Object.freeze({
        toast: showToast,
        modal: showModal,
        hideToast
    });

})();
