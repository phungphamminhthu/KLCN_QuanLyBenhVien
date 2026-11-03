
/* MedCare - Thong bao Dashboard va xac nhan tiep nhan */
(() => {
    "use strict";

    const PRIMARY = "var(--primary, #6236ff)";
    const TOAST_DURATION = 5000;
    let receptionOpen = false;
    let toastTimer = null;

    // =====================================================
    // 1. CSS THONG BAO - DONG BO MAU MEDCARE
    // =====================================================

    document.getElementById("medcare-reception-style")?.remove();

    const style = document.createElement("style");
    style.id = "medcare-reception-style";

    style.textContent = `
        #dashboard-message {
            display: none !important;
        }

        #mc-dashboard-toast {
            position: fixed;
            z-index: 21000;
            top: 16px;
            left: 50%;
            transform: translateX(-50%);
            max-width: min(600px, 92vw);
            padding: 13px 18px;
            border-radius: 11px;
            background: #eef4ff;
            border: 1px solid #cddfff;
            color: #23418a;
            font-size: 13px;
            font-weight: 600;
            line-height: 1.6;
            box-shadow: 0 12px 30px rgba(33, 40, 80, .16);
        }

        #mc-dashboard-toast.mc-error {
            background: #fff3f3;
            border-color: #ffcaca;
            color: #a32222;
        }

        #mc-dashboard-toast[hidden] {
            display: none !important;
        }

        #mc-reception-overlay {
            position: fixed;
            z-index: 22000;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 18px;
            background: rgba(24, 25, 51, .52);
        }

        #mc-reception-overlay .mc-reception-card {
            width: 100%;
            max-width: 510px;
            max-height: calc(100vh - 36px);
            display: flex;
            flex-direction: column;
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 24px 64px rgba(28, 30, 66, .24);
            color: #2b3047;
        }

        .mc-reception-head {
            display: flex;
            align-items: center;
            gap: 11px;
            padding: 20px 23px;
            border-bottom: 1px solid #e8ecf5;
        }

        .mc-reception-head-icon {
            width: 40px;
            height: 40px;
            border-radius: 11px;
            display: grid;
            place-items: center;
            background: #f0edff;
            color: ${PRIMARY};
            font-size: 19px;
        }

        .mc-reception-heading {
            flex: 1;
            margin: 0;
            font-size: 17px;
            font-weight: 750;
            line-height: 1.4;
            color: #292f47;
        }

        .mc-reception-x {
            width: 30px;
            height: 30px;
            padding: 0;
            border: 0;
            background: none;
            color: #8190a7;
            cursor: pointer;
            font-size: 24px;
            line-height: 1;
        }

        .mc-reception-x:disabled {
            opacity: .35;
            cursor: wait;
        }

        .mc-reception-body {
            padding: 22px 24px;
            overflow-y: auto;
            font-size: 14px;
            line-height: 1.75;
        }

        .mc-reception-message {
            margin: 0;
        }

        .mc-reception-details {
            margin-top: 15px;
            padding: 15px 17px;
            border-radius: 11px;
            background: #f2f5ff;
            border: 1px solid #dfe6ff;
            color: #34466b;
        }

        .mc-reception-details.mc-error {
            background: #fff4f4;
            border-color: #ffcaca;
            color: #9b2525;
        }

        .mc-reception-details[hidden] {
            display: none !important;
        }

        .mc-reception-details ul {
            margin: 9px 0 0;
            padding-left: 21px;
        }

        .mc-reception-details li + li {
            margin-top: 5px;
        }

        .mc-reception-room {
            display: block;
            color: ${PRIMARY};
            font-size: 21px;
            font-weight: 800;
            margin: 3px 0 8px;
        }

        .mc-reception-foot {
            display: flex;
            justify-content: flex-end;
            gap: 9px;
            padding: 15px 24px 20px;
            border-top: 1px solid #e8ecf5;
        }

        .mc-reception-btn {
            padding: 9px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 700;
            border: 1px solid #d7ddeb;
            background: #fff;
            color: #687388;
            cursor: pointer;
        }

        .mc-reception-btn.mc-primary {
            background: ${PRIMARY};
            border-color: ${PRIMARY};
            color: white;
        }

        .mc-reception-btn:disabled {
            opacity: .6;
            cursor: not-allowed;
        }

        .mc-reception-btn[hidden] {
            display: none !important;
        }

        @media (max-width: 575px) {
            .mc-reception-head,
            .mc-reception-body {
                padding: 17px;
            }

            .mc-reception-foot {
                padding: 13px 17px 17px;
            }
        }
    `;

    document.head.appendChild(style);

    // =====================================================
    // 2. THONG BAO THONG THUONG - TU DONG AN 5 GIAY
    // =====================================================

    function hideLegacyMessage() {
        const old = document.getElementById("dashboard-message");

        if (old) {
            old.textContent = "";
            old.hidden = true;
        }
    }

    function hideToast() {
        window.clearTimeout(toastTimer);

        const toast = document.getElementById(
            "mc-dashboard-toast"
        );

        if (toast) {
            toast.hidden = true;
        }
    }

    function showToast(message, type = "info") {
        hideToast();

        if (!message || receptionOpen) {
            return;
        }

        let toast = document.getElementById(
            "mc-dashboard-toast"
        );

        if (!toast) {
            toast = document.createElement("div");
            toast.id = "mc-dashboard-toast";
            toast.setAttribute("role", "status");
            document.body.appendChild(toast);
        }

        toast.textContent = String(message);

        toast.className =
            type === "error" ? "mc-error" : "";

        toast.hidden = false;

        toastTimer = window.setTimeout(
            hideToast,
            TOAST_DURATION
        );
    }

    // Giu thong bao chung, khong lap lai khi goi benh nhan.
    window.showDashboardMessage = function (
        message = "",
        isError = false
    ) {
        hideLegacyMessage();

        const text = String(message || "").trim();

        if (!text) {
            hideToast();
            return;
        }

        if (!isError && (
            text.startsWith("Đang gọi bệnh nhân") ||
            text.startsWith("Đã gọi bệnh nhân")
        )) {
            return;
        }

        showToast(
            text,
            isError ? "error" : "info"
        );
    };

    // =====================================================
    // 3. XAC NHAN TIEP NHAN
    // Hoi xac nhan -> Kiem tra -> Thanh cong / That bai
    // =====================================================

    window.handleConfirmReception = async function (
        maLichKham
    ) {
        if (receptionOpen || isBusy()) {
            return;
        }

        const id = positiveId(maLichKham);

        const item = globalQueueData.find(
            row => positiveId(row.maLichKham) === id
        );

        if (!id || !item || !canConfirmReception(item)) {
            return;
        }

        receptionOpen = true;
        confirmingReception = true;

        hideLegacyMessage();
        hideToast();

        updateBusyControls();
        renderDashboardTables();

        const oldFocus = document.activeElement;

        const overlay = document.createElement("div");
        overlay.id = "mc-reception-overlay";

        overlay.innerHTML = `
            <section class="mc-reception-card"
                     role="dialog"
                     aria-modal="true"
                     aria-labelledby="mc-reception-title"
                     aria-describedby="mc-reception-message">

                <div class="mc-reception-head">
                    <span class="mc-reception-head-icon"
                          aria-hidden="true">
                        <i class="fa-solid fa-clipboard-check"
                           data-part="icon"></i>
                    </span>

                    <h2 class="mc-reception-heading"
                        id="mc-reception-title"></h2>

                    <button class="mc-reception-x"
                            type="button"
                            data-action="close"
                            aria-label="Đóng">×</button>
                </div>

                <div class="mc-reception-body">
                    <p class="mc-reception-message"
                       id="mc-reception-message"></p>

                    <div class="mc-reception-details"
                         data-part="details"
                         hidden></div>

                    <p data-part="note"
                       style="
                           font-size:12px;
                           color:#a06b24;
                           margin:12px 0 0;
                       "
                       hidden></p>
                </div>

                <div class="mc-reception-foot">
                    <button class="mc-reception-btn"
                            type="button"
                            data-action="cancel">
                        Hủy
                    </button>

                    <button class="mc-reception-btn mc-primary"
                            type="button"
                            data-action="confirm">
                        Xác nhận tiếp nhận
                    </button>

                    <button class="mc-reception-btn"
                            type="button"
                            data-action="done"
                            hidden>
                        Đóng
                    </button>
                </div>
            </section>
        `;

        const pick = selector =>
            overlay.querySelector(selector);

        const heading = pick("#mc-reception-title");
        const message = pick("#mc-reception-message");
        const details = pick('[data-part="details"]');
        const note = pick('[data-part="note"]');
        const icon = pick('[data-part="icon"]');

        const closeButton = pick('[data-action="close"]');
        const cancelButton = pick('[data-action="cancel"]');
        const confirmButton = pick('[data-action="confirm"]');
        const doneButton = pick('[data-action="done"]');

        const patient = String(
            item.tenBenhNhan || "bệnh nhân"
        );

        let processing = false;
        let closed = false;

        // =================================================
        // 4. DONG POPUP
        // =================================================

        function close() {
            if (processing || closed) {
                return;
            }

            closed = true;

            document.removeEventListener(
                "keydown",
                onKeyDown,
                true
            );

            overlay.remove();

            receptionOpen = false;
            confirmingReception = false;

            updateBusyControls();
            renderDashboardTables();

            if (
                oldFocus?.isConnected &&
                !oldFocus.disabled
            ) {
                oldFocus.focus({
                    preventScroll: true
                });
            }
        }

        function onKeyDown(event) {
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();

                if (!processing) {
                    close();
                }
            }
        }

        function finishPhase() {
            cancelButton.hidden = true;
            confirmButton.hidden = true;
            doneButton.hidden = false;

            closeButton.disabled = false;
            doneButton.focus();
        }

        // =================================================
        // 5. HIEN THI XAC NHAN KHONG THANH CONG
        // =================================================

        function showFailure(reasons, fallback) {
            heading.textContent =
                "Xác nhận không thành công";

            icon.className =
                "fa-solid fa-circle-exclamation";

            icon.style.color = "#d52e36";

            message.textContent =
                `Không thể xác nhận tiếp nhận bệnh nhân ${patient}.`;

            details.replaceChildren();
            details.hidden = false;
            details.classList.add("mc-error");

            const label = document.createElement("strong");

            label.textContent =
                "Lý do không thể tiếp nhận";

            const list = document.createElement("ul");

            const unique = [
                ...new Set(
                    (Array.isArray(reasons) ? reasons : [])
                        .filter(
                            reason =>
                                typeof reason === "string" &&
                                reason.trim()
                        )
                )
            ];

            const messages = unique.length
                ? unique
                : [
                    fallback ||
                    "Không xác định được nguyên nhân."
                ];

            messages.forEach(reason => {
                const li = document.createElement("li");
                li.textContent = reason;
                list.appendChild(li);
            });

            details.append(label, list);

            note.hidden = true;

            finishPhase();
        }

        // =================================================
        // 6. HIEN THI TIEP NHAN THANH CONG
        // KHONG TU DONG DONG POPUP
        // =================================================

        function showSuccess(refreshed) {
            heading.textContent = "Tiếp nhận thành công";

            icon.className =
                "fa-solid fa-circle-check";

            icon.style.color = "#16803d";

            message.textContent =
                `Đã tiếp nhận bệnh nhân ${patient} thành công.`;

            details.replaceChildren();
            details.classList.remove("mc-error");
            details.hidden = false;

            const label = document.createElement("div");
            label.textContent = "Phòng khám";

            const room = document.createElement("strong");
            room.className = "mc-reception-room";

            const newest = globalQueueData.find(
                row => positiveId(row.maLichKham) === id
            );

            room.textContent = String(
                newest?.phong || item.phong || ""
            ).trim() || "Chưa cập nhật phòng khám";

            const guide = document.createElement("div");

            guide.textContent =
                "Hướng dẫn bệnh nhân đến khu vực chờ trước "
                + "phòng khám trên để đợi bác sĩ gọi vào khám.";

            details.append(label, room, guide);

            note.hidden = !!refreshed;

            note.textContent = refreshed
                ? ""
                : "Đã tiếp nhận, nhưng chưa làm mới được danh sách. "
                  + "Vui lòng nhấn Làm mới dữ liệu sau khi đóng thông báo.";

            finishPhase();
        }

        // =================================================
        // 7. SU KIEN POPUP
        // =================================================

        closeButton.addEventListener("click", close);
        cancelButton.addEventListener("click", close);
        doneButton.addEventListener("click", close);

        document.addEventListener(
            "keydown",
            onKeyDown,
            true
        );

        document.body.appendChild(overlay);

        // Ban dau CHI hoi xac nhan.
        heading.textContent =
            "Xác nhận tiếp nhận bệnh nhân";

        message.textContent =
            `Bạn có chắc chắn muốn tiếp nhận bệnh nhân ${patient}?`;

        confirmButton.focus();

        // =================================================
        // 8. CHI KIEM TRA KHI NHAN VIEN BAM XAC NHAN
        // =================================================

        confirmButton.addEventListener("click", async () => {
            if (processing || closed) {
                return;
            }

            processing = true;

            closeButton.disabled = true;
            cancelButton.disabled = true;
            confirmButton.disabled = true;

            heading.textContent =
                "Đang kiểm tra tiếp nhận";

            message.textContent =
                "Hệ thống đang kiểm tra điều kiện "
                + "và xác nhận tiếp nhận...";

            let reasons = [];
            let sentPost = false;
            let confirmedOnServer = false;

            try {
                // -----------------------------------------
                // 8.1. KIEM TRA CAC DIEU KIEN TIEP NHAN
                // -----------------------------------------

                const check = await requestApi(
                    `/api/tiepnhan/kiem-tra-tiep-nhan/${id}`
                );

                if (
                    positiveId(check.maLichKham) !== id ||
                    typeof check.duDieuKien !== "boolean"
                ) {
                    throw new Error(
                        "Dữ liệu kiểm tra tiếp nhận không hợp lệ."
                    );
                }

                reasons = Array.isArray(check.lyDo)
                    ? check.lyDo
                    : [];

                if (!check.duDieuKien) {
                    showFailure(
                        reasons,
                        "Lịch khám chưa đủ điều kiện tiếp nhận."
                    );
                    return;
                }

                // -----------------------------------------
                // 8.2. GOI API XAC NHAN TIEP NHAN
                // -----------------------------------------

                sentPost = true;

                const result = await postJson(
                    "/api/tiepnhan/confirm-reception",
                    {
                        maLichKham: id
                    }
                );

                if (result.success !== true) {
                    throw new Error(
                        result.message ||
                        "Máy chủ chưa xác nhận tiếp nhận."
                    );
                }

                confirmedOnServer = true;

                item.trangThai =
                    STATUS_LABELS.DaTiepNhan;

                // -----------------------------------------
                // 8.3. LAM MOI DASHBOARD
                // -----------------------------------------

                const refreshed =
                    await loadDashboardRealData(
                        true,
                        true
                    );

                showSuccess(refreshed);

            } catch (error) {

                // Neu backend da xac nhan thanh cong,
                // khong bao that bai vi loi tai lai bang.
                if (confirmedOnServer) {
                    showSuccess(false);
                    return;
                }

                // Neu POST co the da xu ly thanh cong
                // nhung phan hoi bi gian doan,
                // kiem tra lai trang thai truoc khi bao loi.
                if (sentPost) {
                    const refreshed =
                        await loadDashboardRealData(
                            true,
                            true
                        );

                    const latest = globalQueueData.find(
                        row =>
                            positiveId(row.maLichKham) === id
                    );

                    if (
                        refreshed &&
                        getStatusCode(
                            latest?.trangThai
                        ) === "DaTiepNhan"
                    ) {
                        showSuccess(true);
                        return;
                    }

                    // Lay ly do moi neu trang thai
                    // da thay doi trong luc xac nhan.
                    try {
                        const currentCheck =
                            await requestApi(
                                `/api/tiepnhan/kiem-tra-tiep-nhan/${id}`
                            );

                        if (
                            Array.isArray(currentCheck.lyDo) &&
                            currentCheck.lyDo.length
                        ) {
                            reasons = currentCheck.lyDo;
                        }
                    } catch (checkError) {
                        console.warn(
                            "Không lấy được lý do mới:",
                            checkError
                        );
                    }
                }

                // -----------------------------------------
                // 8.4. HIEN THI LOI TRONG POPUP
                // -----------------------------------------

                showFailure(
                    reasons,
                    error.message
                );

            } finally {
                processing = false;
            }
        });
    };

    // =====================================================
    // 9. KIEM TRA PHIEN BAN SCRIPT
    // =====================================================

    window.MedCareDashboardNotice = Object.freeze({
        version: "2.0",
        toast: showToast,
        hideToast
    });

})();
