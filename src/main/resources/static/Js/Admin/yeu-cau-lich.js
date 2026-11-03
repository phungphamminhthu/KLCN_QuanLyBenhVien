(() => {
    "use strict";

    const API_BASE = "/api/admin/yeu-cau-dieu-chinh-lich";

    const $ = (id) => document.getElementById(id);

    let requests = [];
    let currentRequest = null;
    let pendingAction = null;

    // =========================
    // LẤY TOKEN
    // =========================
    function getToken() {
        try {
            // Quét localStorage và sessionStorage để tìm JWT.
            for (const store of [localStorage, sessionStorage]) {
                for (let i = 0; i < store.length; i++) {
                    const key = store.key(i);
                    const value = store.getItem(key);

                    if (!value) continue;

                    const token = value.startsWith("Bearer ")
                        ? value.substring(7)
                        : value;

                    // JWT thường có 3 phần, ngăn cách bằng dấu chấm.
                    if (token.split(".").length === 3) {
                        return token;
                    }
                }
            }
        } catch (error) {
            console.warn("Không đọc được token:", error);
        }

        return null;
    }

    // =========================
    // GỌI API
    // =========================
    async function apiRequest(url, options = {}) {
        const headers = {
            Accept: "application/json",
            ...(options.headers || {})
        };

        const token = getToken();

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        if (options.body) {
            headers["Content-Type"] = "application/json";
        }

        const response = await fetch(url, {
            ...options,
            headers,
            credentials: "same-origin"
        });

        const raw = await response.text();
        let data = null;

        try {
            data = raw ? JSON.parse(raw) : null;
        } catch {
            data = raw;
        }

        if (!response.ok) {
            const message =
                data?.message
                || data?.error
                || (typeof data === "string" ? data : null)
                || `Lỗi HTTP ${response.status}`;

            throw new Error(message);
        }

        return data;
    }

    // =========================
    // HÀM HỖ TRỢ
    // =========================
    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function getRequestId(item) {
        return item.maYeuCau
            ?? item.id
            ?? item.ma_yeu_cau
            ?? "";
    }

    function getDoctorName(item) {
        return item.tenBacSi
            ?? item.bacSi?.hoTen
            ?? item.bacSi?.nguoiDung?.hoTen
            ?? item.bacSi?.nguoiDung?.hoTenNguoiDung
            ?? item.bacSi?.tenBacSi
            ?? "Chưa có thông tin";
    }

    function getSchedule(item) {
        return item.lichLamViec || {};
    }

    function getScheduleDate(item) {
        return item.ngayLamViec
            ?? getSchedule(item).ngayLamViec
            ?? item.ngayLamViecMoi
            ?? "—";
    }

    function getTypeLabel(type) {
        const value = String(type || "").toUpperCase();

        if (value.includes("HUY")) return "Hủy lịch";
        if (value.includes("SUA")) return "Sửa lịch";
        if (value.includes("DIEU_PHOI")) return "Điều phối";

        return type || "Yêu cầu khác";
    }

    function getStatusInfo(status) {
        switch (String(status || "").toUpperCase()) {
            case "CHO_XU_LY":
                return ["status-pending", "Chờ xử lý"];

            case "DA_DUYET":
                return ["status-approved", "Đã duyệt"];

            case "DA_TU_CHOI":
                return ["status-rejected", "Đã từ chối"];

            default:
                return ["status-pending", status || "Không rõ"];
        }
    }

    function formatDate(value) {
        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return date.toLocaleDateString("vi-VN");
    }

    function formatTime(value) {
        if (!value) return "—";
        return String(value).substring(0, 5);
    }

    function showToast(message) {
        const toast = $("requestToast");

        if (!toast) return;

        toast.textContent = message;
        toast.classList.add("show");

        window.setTimeout(() => {
            toast.classList.remove("show");
        }, 3500);
    }

    function setTableMessage(message) {
        $("requestTableBody").innerHTML = `
            <tr>
                <td colspan="8" class="table-message">
                    ${escapeHtml(message)}
                </td>
            </tr>
        `;
    }

    // =========================
    // THỐNG KÊ
    // =========================
    function renderStats() {
        $("countPending").textContent = requests.filter(
            x => String(x.trangThai).toUpperCase() === "CHO_XU_LY"
        ).length;

        $("countApproved").textContent = requests.filter(
            x => String(x.trangThai).toUpperCase() === "DA_DUYET"
        ).length;

        $("countRejected").textContent = requests.filter(
            x => String(x.trangThai).toUpperCase() === "DA_TU_CHOI"
        ).length;
    }

    async function loadCoordinationRooms(
        maBacSi,
        selectedRoomId = null
    ) {
        const select = $("coordinationNewRoom");
        if (!select) return;

        if (!maBacSi) {
            select.innerHTML =
                `<option value="">Vui lòng chọn bác sĩ trước</option>`;
            return;
        }

        select.innerHTML =
            `<option value="">Đang tải danh sách phòng...</option>`;

        try {
            const data = await apiRequest(
                `/api/admin/lich-kham/phong-chuyen-trach?maBacSi=${encodeURIComponent(maBacSi)}`
            );

            console.log("[Điều phối] Dữ liệu API phòng:", data);

            const rooms = Array.isArray(data)
                ? data
                : data?.data || data?.items || data?.content || [];

            select.innerHTML =
                `<option value="">-- Chọn phòng --</option>`;

            if (!rooms.length) {
                select.innerHTML =
                    `<option value="">Bác sĩ chưa có phòng hoạt động</option>`;
                return;
            }

            rooms.forEach(room => {
                const id = room.maPhong
                    ?? room.maPhongChuyenTrach
                    ?? room.id;

                const name = room.tenPhong
                    ?? room.tenPhongChuyenTrach
                    ?? room.tenPhongKham;

                if (id == null || !name) return;

                const option = document.createElement("option");
                option.value = String(id);
                option.textContent = name;

                select.appendChild(option);
            });

            if (selectedRoomId != null) {
                select.value = String(selectedRoomId);
            }

            if (select.options.length <= 1) {
                select.innerHTML =
                    `<option value="">Không đọc được dữ liệu phòng</option>`;
            }
        } catch (error) {
            console.error("[Điều phối] Lỗi tải phòng:", error);

            select.innerHTML =
                `<option value="">Không tải được danh sách phòng</option>`;
        }
    }

    // =========================
    // HIỂN THỊ DANH SÁCH
    // =========================
    function renderTable() {
        const keyword = $("searchRequest").value.trim().toLowerCase();

        const filtered = requests.filter(item => {
            const text = [
                getRequestId(item),
                getDoctorName(item),
                getTypeLabel(item.loaiYeuCau),
                item.lyDo
            ].join(" ").toLowerCase();

            return text.includes(keyword);
        });

        if (!filtered.length) {
            setTableMessage("Không có yêu cầu phù hợp.");
            return;
        }

        $("requestTableBody").innerHTML = filtered.map(item => {
            const [statusClass, statusText] = getStatusInfo(item.trangThai);

            return `
                <tr>
                    <td>#${escapeHtml(getRequestId(item))}</td>
                    <td>${escapeHtml(getDoctorName(item))}</td>
                    <td>${escapeHtml(getTypeLabel(item.loaiYeuCau))}</td>
                    <td>${escapeHtml(formatDate(getScheduleDate(item)))}</td>
                    <td>${escapeHtml(item.lyDo || "—")}</td>
                    <td>${escapeHtml(formatDate(item.ngayTao))}</td>
                    <td>
                        <span class="status-badge ${statusClass}">
                            ${escapeHtml(statusText)}
                        </span>
                    </td>
                    <td>
                        <button
                            type="button"
                            class="btn-view"
                            data-request-id="${escapeHtml(getRequestId(item))}">
                            Xem / xử lý
                        </button>
                    </td>
                </tr>
            `;
        }).join("");

        document.querySelectorAll("[data-request-id]").forEach(button => {
            button.addEventListener("click", () => {
                openRequest(button.dataset.requestId);
            });
        });
    }

    // =========================
    // TẢI DANH SÁCH YÊU CẦU
    // =========================
    async function loadRequests() {
        setTableMessage("Đang tải dữ liệu...");

        const status = $("filterStatus").value;

        const url = status
            ? `${API_BASE}?trangThai=${encodeURIComponent(status)}`
            : API_BASE;

        try {
            const data = await apiRequest(url);

            requests = Array.isArray(data)
                ? data
                : data?.content
                    || data?.data
                    || data?.items
                    || [];

            renderStats();
            renderTable();
        } catch (error) {
            console.error("[Yêu cầu lịch] Lỗi tải dữ liệu:", error);
            setTableMessage(error.message || "Không tải được danh sách yêu cầu.");
        }
    }

    // =========================
    // HIỂN THỊ CHI TIẾT
    // =========================
    function detailItem(label, value, full = false) {
        return `
            <div class="detail-item ${full ? "full" : ""}">
                <span class="detail-label">${escapeHtml(label)}</span>
                <div class="detail-value">${escapeHtml(value || "—")}</div>
            </div>
        `;
    }

    function renderDetail(item) {
        const schedule = getSchedule(item);
        const [, statusText] = getStatusInfo(item.trangThai);

        const isPending =
            String(item.trangThai || "").toUpperCase() === "CHO_XU_LY";

        //const requestType = String(item.loaiYeuCau || "").toUpperCase();
        const requestType = String(item.loaiYeuCau || "")
                    .trim()
                    .toUpperCase();
        const isCancelRequest = requestType.includes("HUY");

        const newScheduleDetails = isCancelRequest
            ? ""
            : `
                ${detailItem(
                    "Ngày làm việc mới",
                    formatDate(item.ngayLamViecMoi)
                )}
                ${detailItem(
                    "Giờ mới",
                    `${formatTime(item.gioBatDauMoi)} - ${formatTime(item.gioKetThucMoi)}`
                )}
                ${detailItem(
                    "Phòng mới",
                    item.phongMoi?.tenPhong
                        || item.phongMoi?.tenPhongChuyenTrach
                        || "—"
                )}
            `;

        $("requestDetail").innerHTML = `
            ${detailItem("Mã yêu cầu", `#${getRequestId(item)}`)}
            ${detailItem("Bác sĩ", getDoctorName(item))}
            ${detailItem("Loại yêu cầu", getTypeLabel(item.loaiYeuCau))}
            ${detailItem("Trạng thái", statusText)}

            ${detailItem(
                "Ngày làm việc",
                formatDate(schedule.ngayLamViec || item.ngayLamViec)
            )}

            ${detailItem(
                "Giờ làm việc",
                `${formatTime(schedule.gioBatDau)} - ${formatTime(schedule.gioKetThuc)}`
            )}

            ${detailItem(
                "Phòng hiện tại",
                schedule.phong?.tenPhong
                    || schedule.phongChuyenTrach?.tenPhong
                    || "—"
            )}

            ${detailItem("Lý do bác sĩ gửi", item.lyDo, true)}
            ${detailItem("Ngày gửi", formatDate(item.ngayTao))}

            ${newScheduleDetails}


            ${detailItem("Ghi chú xử lý", item.ghiChuXuLy, true)}
        `;

        $("adminNote").value = item.ghiChuXuLy || "";
        $("modalError").textContent = "";
        $("modalActions").style.display = isPending ? "flex" : "none";

        const isCoordination = requestType === "DIEU_PHOI";

        const coordinationFields = $("adminCoordinationFields");

        if (coordinationFields) {
            coordinationFields.style.display =
                isPending && isCoordination ? "block" : "none";
        }

        if (isPending && isCoordination) {
            loadCoordinationDoctors();
        }
    }

    // ==================================
    //
    // ==================================
    async function loadCoordinationDoctors() {
        const select = $("adminCoordinationDoctor");
        if (!select) return;

        select.innerHTML = `
            <option value="">Đang tải danh sách bác sĩ...</option>
        `;

        try {
            // Dùng apiRequest có sẵn: tự lấy JWT qua getToken()
            const data = await apiRequest("/api/admin/bac-si");

            const doctors = Array.isArray(data)
                ? data
                : data?.data || data?.items || data?.content || [];

            const currentDoctorId =
                currentRequest?.lichLamViec?.bacSi?.maBacSi;

            const availableDoctors = doctors
                .filter(doctor =>
                    doctor.trangThai === true ||
                    doctor.trangThai === 1 ||
                    doctor.trangThai === "true"
                )
                .filter(doctor => doctor.maBacSi != currentDoctorId);

            select.innerHTML = `
                <option value="">-- Chọn bác sĩ nhận điều phối --</option>
            `;

            if (availableDoctors.length === 0) {
                select.innerHTML = `
                    <option value="">Không có bác sĩ phù hợp</option>
                `;
                return;
            }

            availableDoctors.forEach(doctor => {
                const option = document.createElement("option");
                option.value = doctor.maBacSi;
                option.textContent =
                    `${doctor.hoTen || "Chưa có tên"} - ${doctor.tenKhoa || "Chưa có khoa"}`;

                select.appendChild(option);
            });

        } catch (error) {
            console.error("[Yêu cầu lịch] Lỗi tải bác sĩ điều phối:", error);

            select.innerHTML = `
                <option value="">Không tải được danh sách bác sĩ</option>
            `;
        }
    }

    // =========================
    // MỞ CHI TIẾT YÊU CẦU
    // =========================
    async function openRequest(id) {
        currentRequest = requests.find(
            item => String(getRequestId(item)) === String(id)
        ) || null;

        $("requestModal").classList.add("show");
        $("requestDetail").textContent = "Đang tải thông tin...";
        $("adminNote").value = "";
        $("modalError").textContent = "";

        try {
            const detail = await apiRequest(
                `${API_BASE}/${encodeURIComponent(id)}`
            );

            currentRequest = detail?.data || detail;

            renderDetail(currentRequest);
        } catch (error) {
            // Nếu API chi tiết chưa có, dùng dữ liệu từ danh sách.
            if (currentRequest) {
                renderDetail(currentRequest);
            } else {
                $("requestDetail").textContent = error.message;
            }
        }
    }

    function closeModal() {
        $("requestModal").classList.remove("show");
        currentRequest = null;
    }

    // ==================================================
    // MODAL XÁC NHẬN DUYỆT / TỪ CHỐI RIÊNG
    // ==================================================
    function ensureConfirmModal() {
        if ($("actionConfirmModal")) return;

        const style = document.createElement("style");
        style.id = "action-confirm-style";

        style.textContent = `
            .action-confirm-overlay {
                position: fixed;
                inset: 0;
                z-index: 10000;
                display: none;
                align-items: center;
                justify-content: center;
                padding: 18px;
                background: rgba(15, 23, 42, .58);
            }

            .action-confirm-overlay.show {
                display: flex;
            }

            .action-confirm-box {
                width: min(480px, 100%);
                background: #fff;
                border-radius: 14px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, .25);
                padding: 24px;
                color: #1e293b;
            }

            .action-confirm-title {
                font-size: 20px;
                font-weight: 700;
                margin: 0 0 8px;
            }

            .action-confirm-desc {
                color: #64748b;
                margin: 0 0 16px;
                line-height: 1.5;
            }

            .action-confirm-label {
                display: block;
                font-weight: 600;
                font-size: 14px;
                margin-bottom: 8px;
            }

            .action-confirm-note {
                box-sizing: border-box;
                width: 100%;
                min-height: 110px;
                resize: vertical;
                border: 1px solid #cbd5e1;
                border-radius: 8px;
                padding: 11px 12px;
                font: inherit;
                outline: none;
            }

            .action-confirm-note:focus {
                border-color: #2563eb;
                box-shadow: 0 0 0 3px rgba(37, 99, 235, .12);
            }

            .action-confirm-error {
                color: #dc2626;
                font-size: 13px;
                min-height: 18px;
                margin-top: 7px;
            }

            .action-confirm-actions {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 18px;
            }

            .action-confirm-actions button {
                border: 0;
                border-radius: 8px;
                padding: 10px 16px;
                font-weight: 600;
                cursor: pointer;
            }

            .action-confirm-cancel {
                background: #f1f5f9;
                color: #334155;
            }

            .action-confirm-submit {
                color: #fff;
                background: #2563eb;
            }

            .action-confirm-submit.reject {
                background: #dc2626;
            }

            .action-confirm-submit:disabled {
                opacity: .6;
                cursor: not-allowed;
            }
        `;

        document.head.appendChild(style);

        const overlay = document.createElement("div");
        overlay.id = "actionConfirmModal";
        overlay.className = "action-confirm-overlay";

        overlay.innerHTML = `
            <section
                class="action-confirm-box"
                role="dialog"
                aria-modal="true"
                aria-labelledby="actionConfirmTitle">

                <h3 class="action-confirm-title" id="actionConfirmTitle">
                    Xác nhận xử lý yêu cầu
                </h3>

                <p
                    class="action-confirm-desc"
                    id="actionConfirmDescription">
                </p>

                <div id="coordinationFields" style="display: none; margin-bottom: 16px;">
                    <div class="form-group">
                        <label for="coordinationDoctorSelected">
                            Bác sĩ nhận điều phối
                        </label>
                        <div id="coordinationDoctorSelected" class="form-control">
                            Chưa chọn bác sĩ
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="coordinationNewDate">Ngày làm việc mới</label>
                        <input
                            type="date"
                            id="coordinationNewDate"
                            class="form-control"
                            required
                        >
                    </div>

                    <div class="form-group">
                        <label for="coordinationNewStart">Giờ bắt đầu mới</label>
                        <input
                            type="time"
                            id="coordinationNewStart"
                            class="form-control"
                            required
                        >
                    </div>

                    <div class="form-group">
                        <label for="coordinationNewEnd">Giờ kết thúc mới</label>
                        <input
                            type="time"
                            id="coordinationNewEnd"
                            class="form-control"
                            required
                        >
                    </div>

                    <div class="form-group">
                        <label for="coordinationNewRoom">Phòng mới</label>
                        <select
                            id="coordinationNewRoom"
                            class="form-control"
                            required
                        >
                            <option value="">-- Chọn phòng --</option>
                        </select>
                    </div>
                </div>

                <label class="action-confirm-label" for="actionConfirmNote">
                    Ghi chú xử lý
                </label>

                <textarea
                    id="actionConfirmNote"
                    class="action-confirm-note"
                    placeholder="Nhập ghi chú xử lý hoặc lý do từ chối...">
                </textarea>

                <div
                    id="actionConfirmError"
                    class="action-confirm-error">
                </div>

                <div class="action-confirm-actions">
                    <button
                        type="button"
                        class="action-confirm-cancel"
                        id="actionConfirmCancel">
                        Hủy
                    </button>

                    <button
                        type="button"
                        class="action-confirm-submit"
                        id="actionConfirmSubmit">
                        Xác nhận
                    </button>
                </div>
            </section>
        `;

        document.body.appendChild(overlay);

        $("actionConfirmCancel").addEventListener(
            "click",
            closeConfirmModal
        );

        overlay.addEventListener("click", event => {
            if (event.target === overlay) {
                closeConfirmModal();
            }
        });

        $("actionConfirmSubmit").addEventListener(
            "click",
            submitConfirmedAction
        );
    }

    function closeConfirmModal() {
        const modal = $("actionConfirmModal");

        if (modal) {
            modal.classList.remove("show");
        }

        pendingAction = null;
    }

    // =========================
    // MỞ MODAL XÁC NHẬN
    // =========================
    async function processRequest(action) {
        if (!currentRequest) return;

        ensureConfirmModal();

        pendingAction = action;

        const isApprove = action === "DUYET";
        const actionText = isApprove ? "duyệt" : "từ chối";
        const id = getRequestId(currentRequest);

        $("actionConfirmTitle").textContent = isApprove
            ? "Xác nhận duyệt yêu cầu"
            : "Xác nhận từ chối yêu cầu";

        $("actionConfirmDescription").textContent =
            `Bạn đang ${actionText} yêu cầu #${id} của ${getDoctorName(currentRequest)}. Vui lòng kiểm tra thông tin và nhập ghi chú xử lý.`;

        // Lấy ghi chú từ modal chi tiết nếu Admin đã nhập.
        $("actionConfirmNote").value =
            $("adminNote")?.value?.trim() || "";

        $("actionConfirmNote").placeholder = isApprove
            ? "Nhập ghi chú xử lý (không bắt buộc)..."
            : "Nhập lý do từ chối (bắt buộc)...";

        $("actionConfirmError").textContent = "";

        const requestType = String(
            currentRequest.loaiYeuCau || ""
        ).trim().toUpperCase();

        const isCoordination = requestType === "DIEU_PHOI";

        const coordinationFields = $("coordinationFields");

        if (coordinationFields) {
            coordinationFields.style.display =
                isApprove && isCoordination ? "block" : "none";
        }

        if (isApprove && isCoordination) {
            const doctorSelect = $("adminCoordinationDoctor");
            const selectedDoctorId = doctorSelect?.value;

            const selectedDoctor = doctorSelect?.selectedOptions?.[0];

            const selectedDoctorText =
                selectedDoctorId && selectedDoctor
                    ? selectedDoctor.textContent.trim()
                    : "Chưa chọn bác sĩ";

            const selectedDoctorDisplay = $("coordinationDoctorSelected");

            if (selectedDoctorDisplay) {
                selectedDoctorDisplay.textContent = selectedDoctorText;
            }

            // Tải phòng theo khoa của bác sĩ nhận điều phối
            await loadCoordinationRooms(
                selectedDoctorId,
                currentRequest.maPhongMoi
                    ?? currentRequest.phongMoi?.maPhong
                    ?? null
            );

            const newDate = $("coordinationNewDate");
            const newStart = $("coordinationNewStart");
            const newEnd = $("coordinationNewEnd");

            if (newDate && !newDate.value) {
                newDate.value = currentRequest.ngayLamViecMoi || "";
            }

            if (newStart && !newStart.value) {
                newStart.value = currentRequest.gioBatDauMoi || "";
            }

            if (newEnd && !newEnd.value) {
                newEnd.value = currentRequest.gioKetThucMoi || "";
            }
        }

        const submitButton = $("actionConfirmSubmit");

        submitButton.textContent = isApprove
            ? "Xác nhận duyệt"
            : "Xác nhận từ chối";

        submitButton.classList.toggle("reject", !isApprove);

        $("actionConfirmModal").classList.add("show");
        $("actionConfirmNote").focus();
    }

    // =========================
    // XÁC NHẬN VÀ GỌI API
    // =========================
    async function submitConfirmedAction() {
        if (!currentRequest || !pendingAction) return;

        const action = pendingAction;
        const id = getRequestId(currentRequest);
        const note = $("actionConfirmNote").value.trim();

        const actionText = action === "DUYET"
            ? "duyệt"
            : "từ chối";

        if (action === "TU_CHOI" && !note) {
            $("actionConfirmError").textContent =
                "Vui lòng nhập lý do từ chối.";
            $("actionConfirmNote").focus();
            return;
        }

        const requestType = String(
            currentRequest.loaiYeuCau || ""
        ).trim().toUpperCase();

        let maBacSiMoi = null;
        let ngayLamViecMoi = null;
        let gioBatDauMoi = null;
        let gioKetThucMoi = null;
        let maPhongMoi = null;

        // Lấy thông tin điều phối khi Admin duyệt yêu cầu điều phối
        if (action === "DUYET" && requestType === "DIEU_PHOI") {
            maBacSiMoi = $("adminCoordinationDoctor")?.value;
            ngayLamViecMoi = $("coordinationNewDate")?.value;
            gioBatDauMoi = $("coordinationNewStart")?.value;
            gioKetThucMoi = $("coordinationNewEnd")?.value;
            maPhongMoi = $("coordinationNewRoom")?.value;

            if (!maBacSiMoi) {
                $("actionConfirmError").textContent =
                    "Vui lòng chọn bác sĩ nhận điều phối.";
                $("adminCoordinationDoctor")?.focus();
                return;
            }

            if (
                !ngayLamViecMoi ||
                !gioBatDauMoi ||
                !gioKetThucMoi ||
                !maPhongMoi
            ) {
                $("actionConfirmError").textContent =
                    "Vui lòng nhập ngày, giờ và phòng mới.";

                if (!ngayLamViecMoi) {
                    $("coordinationNewDate")?.focus();
                } else if (!gioBatDauMoi) {
                    $("coordinationNewStart")?.focus();
                } else if (!gioKetThucMoi) {
                    $("coordinationNewEnd")?.focus();
                } else {
                    $("coordinationNewRoom")?.focus();
                }

                return;
            }

            if (gioBatDauMoi >= gioKetThucMoi) {
                $("actionConfirmError").textContent =
                    "Giờ kết thúc phải sau giờ bắt đầu.";
                $("coordinationNewEnd")?.focus();
                return;
            }
        }

        const submitButton = $("actionConfirmSubmit");
        const cancelButton = $("actionConfirmCancel");

        submitButton.disabled = true;
        cancelButton.disabled = true;
        $("actionConfirmError").textContent = "";

        try {
            const payload = {
                thaoTac: action,
                ghiChuXuLy: note,
                maBacSiMoi: maBacSiMoi
                    ? Number(maBacSiMoi)
                    : null,
                ngayLamViecMoi,
                gioBatDauMoi,
                gioKetThucMoi,
                maPhongMoi: maPhongMoi
                    ? Number(maPhongMoi)
                    : null
            };

            console.log("[Điều phối] Payload xử lý yêu cầu:", payload);

            await apiRequest(
                `${API_BASE}/${encodeURIComponent(id)}/xu-ly`,
                {
                    method: "PUT",
                    body: JSON.stringify(payload)
                }
            );

            if ($("adminNote")) {
                $("adminNote").value = note;
            }

            closeConfirmModal();
            closeModal();

            showToast(`Đã ${actionText} yêu cầu thành công.`);

            await loadRequests();

        } catch (error) {
            console.error("[Yêu cầu lịch] Lỗi xử lý:", error);

            $("actionConfirmError").textContent =
                error.message || "Không xử lý được yêu cầu.";

        } finally {
            submitButton.disabled = false;
            cancelButton.disabled = false;
        }
    }

    // =========================
    // GẮN SỰ KIỆN
    // =========================
    function initEvents() {
        $("filterStatus").addEventListener("change", loadRequests);
        $("searchRequest").addEventListener("input", renderTable);
        $("btnRefresh").addEventListener("click", loadRequests);

        $("btnCloseModal").addEventListener("click", closeModal);
        $("btnCloseBottom").addEventListener("click", closeModal);

        $("btnApprove").addEventListener("click", () => {
            processRequest("DUYET");
        });

        $("btnReject").addEventListener("click", () => {
            processRequest("TU_CHOI");
        });

        $("requestModal").addEventListener("click", event => {
            if (event.target === $("requestModal")) {
                closeModal();
            }
        });

        const doctorSelect = $("adminCoordinationDoctor");

        if (doctorSelect) {
            doctorSelect.addEventListener("change", async () => {
                await loadCoordinationRooms(doctorSelect.value);

                const selectedDoctor =
                    doctorSelect.selectedOptions?.[0];

                const selectedDoctorDisplay =
                    $("coordinationDoctorSelected");

                if (selectedDoctorDisplay) {
                    selectedDoctorDisplay.textContent =
                        doctorSelect.value
                            ? selectedDoctor.textContent.trim()
                            : "Chưa chọn bác sĩ";
                }
            });
        }
    }

    // =========================
    // KHỞI TẠO
    // =========================
    document.addEventListener("DOMContentLoaded", () => {
        initEvents();
        loadRequests();
    });
})();