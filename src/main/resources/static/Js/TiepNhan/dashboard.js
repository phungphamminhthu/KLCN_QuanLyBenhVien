"use strict";

let globalQueueData = [];
let currentCallItem = null;
let dashboardLoading = false;
let callingPatient = false;
let confirmingReception = false;
let vienPhiOpen = false;
let dashboardMessageTimer = null;

const STATUS_LABELS = {
    ChoGoi: "Chờ gọi",
    DaGoi: "Đã gọi",
    DaTiepNhan: "Đã tiếp nhận",
    ChoKham: "Chờ khám",
    DangKham: "Đang khám",
    ChoThanhToan: "Chờ thanh toán",
    ChoCLS: "Chờ CLS",
    DangCLS: "Đang CLS",
    ChoLayThuoc: "Chờ lấy thuốc",
    DangLayThuoc: "Đang lấy thuốc",
    HoanTat: "Hoàn tất",
    DaHuy: "Đã hủy",
    KhongDen: "Không đến"
};

const STATUS_PRIORITIES = {
    DaGoi: 0,
    ChoGoi: 1,
    DaTiepNhan: 2,
    ChoKham: 3,
    DangKham: 4,
    ChoThanhToan: 5,
    ChoCLS: 6,
    DangCLS: 7,
    ChoLayThuoc: 8,
    DangLayThuoc: 9,
    HoanTat: 10,
    DaHuy: 11,
    KhongDen: 12
};

const KPI_FIELDS = {
    "kpi-tong-bn": "tongBnHienTai",
    "kpi-lich-hen": "lichHenHomNay",
    "kpi-dang-cho": "bnDangCho",
    "kpi-dang-kham": "dangTrongPhongKham"
};

// =========================================================
// HÀM DÙNG CHUNG
// =========================================================

function $(id) {
    return document.getElementById(id);
}

function setText(id, value) {
    const node = $(id);

    if (node) {
        node.textContent = value ?? "";
    }
}

function escapeHtml(value) {
    return String(value ?? "").replace(
        /[&<>"']/g,
        character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]
    );
}

function positiveId(value) {
    const number = Number(value);

    return Number.isSafeInteger(number) && number > 0
        ? number
        : null;
}

function normalizeSearch(value) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/gi, "d")
        .toLowerCase()
        .trim();
}

function getStatusCode(value) {
    const status = String(value ?? "").trim();

    if (Object.hasOwn(STATUS_LABELS, status)) {
        return status;
    }

    return Object.keys(STATUS_LABELS).find(
        code =>
            normalizeSearch(STATUS_LABELS[code])
            === normalizeSearch(status)
    ) || status;
}

function getStatusLabel(value) {
    return STATUS_LABELS[getStatusCode(value)]
        || String(value || "Chưa xác định");
}

function getSequenceNumber(value) {
    const match = String(value ?? "")
        .trim()
        .match(/(?:^#?|-[ ]*)(\d+)$/);

    const number = match ? Number(match[1]) : NaN;

    return Number.isSafeInteger(number) && number > 0
        ? number
        : null;
}

function isBusy() {
    return dashboardLoading
        || callingPatient
        || confirmingReception
        || vienPhiOpen;
}

function getToken() {
    return (
        sessionStorage.getItem("Token")
        || localStorage.getItem("Token")
        || sessionStorage.getItem("token")
        || localStorage.getItem("token")
        || ""
    ).trim();
}

// =========================================================
// GỌI API
// =========================================================

async function requestApi(url, options = {}) {
    const token = getToken();

    if (!token) {
        throw new Error(
            "Bạn cần đăng nhập để sử dụng Dashboard."
        );
    }

    const headers = new Headers(options.headers || {});

    headers.set(
        "Authorization",
        /^Bearer\s/i.test(token) ? token : `Bearer ${token}`
    );

    headers.set("Accept", "application/json");

    const controller = new AbortController();

    const timeout = window.setTimeout(
        () => controller.abort(),
        20000
    );

    try {
        const response = await fetch(url, {
            ...options,
            headers,
            cache: "no-store",
            credentials: "same-origin",
            signal: controller.signal
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            const fallback = response.status === 401
                ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
                : response.status === 403
                    ? "Tài khoản không có quyền sử dụng chức năng này."
                    : `Không thể xử lý yêu cầu (HTTP ${response.status}).`;

            const error = new Error(data?.message || fallback);

            error.status = response.status;

            error.lyDo = Array.isArray(data?.lyDo)
                ? data.lyDo.filter(
                    reason =>
                        typeof reason === "string"
                        && reason.trim()
                )
                : [];

            throw error;
        }

        if (!data || typeof data !== "object") {
            throw new Error(
                "Máy chủ trả về dữ liệu không hợp lệ."
            );
        }

        return data;
    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error(
                "Chưa nhận được phản hồi. Hãy tải lại thông tin "
                + "để kiểm tra kết quả trước khi thực hiện lại."
            );
        }

        throw error;
    } finally {
        window.clearTimeout(timeout);
    }
}

function postJson(url, body) {
    return requestApi(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });
}

// =========================================================
// THÔNG BÁO DASHBOARD
// Cả thông báo xanh và đỏ tự ẩn sau 7 giây.
// =========================================================

function showDashboardMessage(
    message = "",
    isError = false,
    reasons = []
) {
    window.clearTimeout(dashboardMessageTimer);
    dashboardMessageTimer = null;

    const box = $("dashboard-message");

    if (!box) {
        if (message) {
            console.warn(message);
        }
        return;
    }

    box.replaceChildren();

    box.className =
        `alert ${isError ? "alert-danger" : "alert-info"} py-2`;

    box.hidden = !message;

    if (!message) return;

    box.append(
        document.createTextNode(message)
    );

    if (Array.isArray(reasons) && reasons.length) {
        const list = document.createElement("ul");
        list.className = "mb-0 mt-1";

        for (const reason of reasons) {
            if (typeof reason !== "string") continue;

            const li = document.createElement("li");
            const strong = document.createElement("strong");

            strong.className = "fw-bold";
            strong.textContent = reason;

            li.append(strong);
            list.append(li);
        }

        box.append(list);
    }

    dashboardMessageTimer = window.setTimeout(() => {
        box.hidden = true;
        box.replaceChildren();
        dashboardMessageTimer = null;
    }, 7000);
}

// =========================================================
// NGÀY TRÊN HEADER
// =========================================================

function updateCurrentHeaderDate() {
    const now = new Date();
    const timeZone = "Asia/Ho_Chi_Minh";

    const weekday = new Intl.DateTimeFormat("vi-VN", {
        weekday: "long",
        timeZone
    }).format(now);

    const date = new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone
    }).format(now);

    setText(
        "header-date-display",
        `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${date}`
    );
}

function statusClass(value) {
    switch (getStatusCode(value)) {
        case "DangKham":
        case "HoanTat":
            return "bg-success-subtle text-success";

        case "DaGoi":
        case "DangCLS":
        case "DangLayThuoc":
            return "bg-info-subtle text-info-emphasis";

        case "DaTiepNhan":
            return "bg-primary-subtle text-primary";

        case "DaHuy":
        case "KhongDen":
            return "bg-danger-subtle text-danger";

        default:
            return "bg-warning-subtle text-warning-emphasis";
    }
}

// =========================================================
// ĐIỀU KIỆN THAO TÁC
// =========================================================

function hasValidPatientProfileIds(item) {
    return positiveId(item?.maBenhNhan) !== null
        && positiveId(item?.maLichKham) !== null;
}

function canCallPatient(item) {
    const room = String(item?.phong ?? "").trim();

    return ["ChoGoi", "DaGoi"].includes(
        getStatusCode(item?.trangThai)
    )
        && positiveId(item?.maLichKham) !== null
        && Boolean(room)
        && !["Chưa phân công", "—", "--"].includes(room);
}

function canConfirmReception(item) {
    return getStatusCode(item?.trangThai) === "DaGoi"
        && positiveId(item?.maLichKham) !== null;
}

// =========================================================
// SẮP XẾP DANH SÁCH
// =========================================================

function compareQueueAppointments(a, b) {
    const priority =
        (STATUS_PRIORITIES[getStatusCode(a.trangThai)] ?? 99)
        - (STATUS_PRIORITIES[getStatusCode(b.trangThai)] ?? 99);

    if (priority) return priority;

    const time = item =>
        /^\d{2}:\d{2}$/.test(item.gioHen || "")
            ? item.gioHen
            : "99:99";

    return time(a).localeCompare(time(b))
        || (getSequenceNumber(a.stt) ?? Number.MAX_SAFE_INTEGER)
        - (getSequenceNumber(b.stt) ?? Number.MAX_SAFE_INTEGER)
        || Number(a.maLichKham || 0)
        - Number(b.maLichKham || 0);
}

// =========================================================
// TẢI DASHBOARD
// =========================================================

function renderDashboardTables() {
    applyFiltersAndRender();
    renderUpcomingAppointments();
}

function updateBusyControls() {
    const button = $("refresh-dashboard-button");

    if (button) {
        button.disabled = isBusy();
    }
}

async function loadDashboardRealData(
    silent = false,
    fromAction = false
) {
    if (dashboardLoading || (!fromAction && isBusy())) {
        return false;
    }

    dashboardLoading = true;
    updateBusyControls();
    updateCurrentHeaderDate();
    renderDashboardTables();

    try {
        const data = await requestApi(
            "/api/tiepnhan/dashboard-data"
        );

        if (!Array.isArray(data.hangDoiKham)) {
            throw new Error(
                "Danh sách lịch khám không hợp lệ."
            );
        }

        Object.entries(KPI_FIELDS).forEach(([id, field]) => {
            setText(id, data[field] ?? 0);
        });

        globalQueueData = data.hangDoiKham.map(item => ({
            ...item,
            trangThai: getStatusLabel(item.trangThai)
        }));

        updateFilterOptions();

        if (!silent) {
            showDashboardMessage();
        }

        return true;
    } catch (error) {
        if (!silent) {
            showDashboardMessage(
                `${error.message} Dữ liệu chưa được cập nhật.`,
                true,
                error.lyDo
            );
        }

        return false;
    } finally {
        dashboardLoading = false;
        updateBusyControls();
        renderDashboardTables();
    }
}

function refreshDashboardWhenIdle() {
    if (
        !document.hidden
        && !isBusy()
        && !document.querySelector(".modal.show")
    ) {
        void loadDashboardRealData(true);
    }
}

// =========================================================
// BỘ LỌC
// =========================================================

function populateSelect(select, values, allLabel) {
    if (!select) return;

    const previous = select.value;

    select.replaceChildren(
        new Option(allLabel, "")
    );

    [...new Set(values.filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "vi"))
        .forEach(value => {
            select.add(new Option(value, value));
        });

    if (
        previous
        && ![...select.options].some(
            option => option.value === previous
        )
    ) {
        select.add(new Option(previous, previous));
    }

    select.value = previous;
}

function updateFilterOptions() {
    populateSelect(
        $("room-filter"),
        globalQueueData.map(item => item.phong),
        "Tất cả phòng"
    );

    populateSelect(
        $("doctor-filter"),
        globalQueueData.map(item => item.bacSi),
        "Tất cả bác sĩ"
    );

    populateSelect(
        $("department-filter"),
        globalQueueData.map(item => item.khoa),
        "Tất cả khoa"
    );

    populateSelect(
        $("status-filter"),
        Object.values(STATUS_LABELS),
        "Tất cả trạng thái"
    );
}

function applyFiltersAndRender() {
    const room = $("room-filter")?.value || "";
    const doctor = $("doctor-filter")?.value || "";
    const department = $("department-filter")?.value || "";

    const status = getStatusCode(
        $("status-filter")?.value || ""
    );

    const search = normalizeSearch(
        $("queue-search")?.value
    );

    const list = globalQueueData.filter(item => {
        const text = [
            item.tenBenhNhan,
            item.maBn,
            item.maBenhNhan,
            item.maLichKham,
            item.stt,
            item.khoa,
            item.bacSi,
            item.phong
        ].map(normalizeSearch).join(" ");

        return (!room || item.phong === room)
            && (!doctor || item.bacSi === doctor)
            && (!department || item.khoa === department)
            && (
                !status
                || getStatusCode(item.trangThai) === status
            )
            && (!search || text.includes(search));
    });

    renderQueueTable(
        list.sort(compareQueueAppointments)
    );
}

// =========================================================
// CÁC NÚT THAO TÁC
// =========================================================

function iconButton(
    className,
    iconName,
    label,
    disabled,
    action
) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = className;
    button.title = label;
    button.setAttribute("aria-label", label);
    button.disabled = disabled;

    const icon = document.createElement("i");
    icon.className = `fa-solid ${iconName}`;
    icon.setAttribute("aria-hidden", "true");

    button.append(icon);

    button.addEventListener("click", () => {
        if (!button.disabled) action();
    });

    return button;
}

function createPatientCallButton(item, extraClass = "") {
    const allowed = canCallPatient(item);

    const label = allowed
        ? `${
            getStatusCode(item.trangThai) === "DaGoi"
                ? "Gọi lại"
                : "Gọi"
        } bệnh nhân ${item.tenBenhNhan || ""}`
        : "Chưa có phòng hợp lệ hoặc trạng thái "
            + "không cho phép gọi tiếp nhận";

    return iconButton(
        `btn-action-call-compact ${extraClass}`.trim(),
        "fa-volume-high",
        label,
        isBusy() || !allowed,
        () => void handleCallPatient(item.maLichKham)
    );
}

function openPatientProfile(item) {
    if (isBusy() || !hasValidPatientProfileIds(item)) {
        return;
    }

    const params = new URLSearchParams({
        maLichKham: String(positiveId(item.maLichKham)),
        from: "dashboard"
    });

    window.location.assign(
        `/TiepNhan/ho-so-benh-nhan/${
            positiveId(item.maBenhNhan)
        }?${params}`
    );
}

function createWorkflowButton(item) {
    const button = document.createElement("button");

    button.type = "button";
    button.className =
        "btn btn-sm text-nowrap btn-workflow btn-outline-success";

    button.textContent = "Đã tiếp nhận";

    button.title = canConfirmReception(item)
        ? "Kiểm tra phí khám và xác nhận tiếp nhận "
            + "sau khi đã lưu đủ số đo"
        : "Cần gọi bệnh nhân và lưu số đo "
            + "trước khi xác nhận tiếp nhận";

    button.setAttribute(
        "aria-label",
        `Đã tiếp nhận: ${item.tenBenhNhan || "Bệnh nhân"}`
    );

    Object.assign(button.style, {
        width: "100%",
        minWidth: "0",
        minHeight: "30px",
        padding: "4px 5px",
        fontSize: "11px",
        flexShrink: "0"
    });

    button.disabled =
        isBusy() || !canConfirmReception(item);

    button.addEventListener("click", () => {
        if (!button.disabled) {
            void handleConfirmReception(item.maLichKham);
        }
    });

    return button;
}

function createVienPhiButton(item) {
    const button = document.createElement("button");

    button.type = "button";
    button.className =
        "btn btn-sm btn-outline-primary btn-vienphi";

    button.title =
        `Xem hóa đơn và lịch sử thanh toán của ${
            item.tenBenhNhan || "bệnh nhân"
        }`;

    button.disabled =
        isBusy() || !positiveId(item.maLichKham);

    const icon = document.createElement("i");
    icon.className = "fa-solid fa-file-invoice-dollar";
    icon.setAttribute("aria-hidden", "true");

    const text = document.createElement("span");
    text.textContent = "Viện phí";

    button.append(icon, text);

    button.addEventListener("click", event => {
        event.stopPropagation();

        if (!button.disabled) {
            void openVienPhi(item);
        }
    });

    return button;
}

async function openVienPhi(item) {
    if (isBusy()) return;

    const id = positiveId(item?.maLichKham);

    if (!id) {
        showDashboardMessage(
            "Mã lịch khám không hợp lệ.",
            true
        );
        return;
    }

    if (typeof window.VienPhi?.mo !== "function") {
        showDashboardMessage(
            "Không mở được viện phí. Kiểm tra file "
            + "vienphi.js và fragment vienphi.html.",
            true
        );
        return;
    }

    await window.VienPhi.mo(
        id,
        document.activeElement
    );
}

// =========================================================
// DANH SÁCH LỊCH KHÁM
// =========================================================

function renderQueueTable(list) {
    const tbody = $("hang-doi-table-body");

    if (!tbody) return;

    tbody.replaceChildren();

    if (!list.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 8;
        cell.className = "text-center text-muted py-4";

        cell.textContent = dashboardLoading
            ? "Đang tải danh sách lịch khám..."
            : "Không có lịch khám phù hợp.";

        row.append(cell);
        tbody.append(row);
    }

    for (const item of list) {
        const row = document.createElement("tr");
        const name = String(
            item.tenBenhNhan || "Bệnh nhân"
        );

        row.innerHTML = `
            <td>
                <span class="badge-stt-purple">
                    ${escapeHtml(item.stt)}
                </span>
            </td>

            <td class="fw-bold text-primary">
                ${escapeHtml(item.maBn)}
            </td>

            <td>
                <div class="d-flex align-items-center">
                    <span class="avatar-initial">
                        ${escapeHtml(name.charAt(0))}
                    </span>

                    <div style="min-width:0;flex:1">
                        <div class="patient-name-container fw-bold">
                            ${escapeHtml(name)}
                        </div>

                        <div class="text-muted">
                            ${escapeHtml(item.thongTinPhu)}
                        </div>
                    </div>
                </div>
            </td>

            <td>
                <div class="fw-semibold">
                    ${escapeHtml(item.khoa)}
                </div>

                <div class="text-muted">
                    ${escapeHtml(item.bacSi)}
                </div>
            </td>

            <td class="text-center">
                ${escapeHtml(item.phong)}
            </td>

            <td>
                ${escapeHtml(item.gioHen)}
            </td>

            <td class="text-center">
                <span class="status-pill ${
                    statusClass(item.trangThai)
                }">
                    ${escapeHtml(getStatusLabel(item.trangThai))}
                </span>
            </td>

            <td class="text-center">
                <div class="queue-actions"></div>
            </td>
        `;

        const actions = row.querySelector(".queue-actions");
        actions.classList.add("dashboard-fee-actions");

        actions.append(
            createPatientCallButton(item),
            createWorkflowButton(item),
            createVienPhiButton(item)
        );

        actions.addEventListener("click", event => {
            event.stopPropagation();
        });

        if (hasValidPatientProfileIds(item)) {
            row.classList.add("patient-row-clickable");
            row.style.cursor = "pointer";
            row.tabIndex = 0;

            row.title =
                "Bấm vào dòng hoặc nhấn Enter "
                + "để xem hồ sơ bệnh nhân";

            row.setAttribute(
                "aria-label",
                `Xem hồ sơ bệnh nhân ${name}, `
                + `số thứ tự ${item.stt || ""}`
            );

            row.addEventListener("click", event => {
                if (
                    event.target instanceof Element
                    && event.target.closest(
                        "button, a, input, select, textarea, "
                        + "label, [role='button']"
                    )
                ) {
                    return;
                }

                openPatientProfile(item);
            });

            row.addEventListener("keydown", event => {
                if (
                    event.target === row
                    && event.key === "Enter"
                ) {
                    event.preventDefault();
                    openPatientProfile(item);
                }
            });
        }

        tbody.append(row);
    }

    setText(
        "table-record-count",
        `Hiển thị ${list.length}/${globalQueueData.length} `
        + "lịch khám hôm nay"
    );
}

// =========================================================
// LỊCH KHÁM CHỜ GỌI
// =========================================================

function renderUpcomingAppointments() {
    const container = $("lich-kham-sap-toi-container");

    if (!container) return;

    const list = globalQueueData
        .filter(
            item => getStatusCode(item.trangThai) === "ChoGoi"
        )
        .sort(compareQueueAppointments)
        .slice(0, 5);

    container.replaceChildren();

    if (!list.length) {
        container.textContent = dashboardLoading
            ? "Đang tải lịch chờ gọi..."
            : "Không còn lịch chờ gọi tiếp nhận trong ngày.";
        return;
    }

    for (const item of list) {
        const node = document.createElement("div");
        node.className = "schedule-item";

        node.innerHTML = `
            <div class="schedule-stt-box">
                <div class="fw-bold">
                    ${escapeHtml(item.stt)}
                </div>
            </div>

            <div class="schedule-patient-info">
                <div class="patient-name-container fw-bold">
                    ${escapeHtml(item.tenBenhNhan || "Bệnh nhân")}
                </div>

                <div class="text-muted mt-1">
                    ${escapeHtml(item.gioHen)}
                    • ${escapeHtml(item.bacSi)}
                </div>

                <div class="text-muted">
                    ${escapeHtml(item.khoa)}
                    • ${escapeHtml(item.phong)}
                </div>
            </div>
        `;

        node.append(
            createPatientCallButton(
                item,
                "schedule-call-button"
            )
        );

        container.append(node);
    }
}

// =========================================================
// GỌI BỆNH NHÂN
// =========================================================

async function handleCallPatient(maLichKham) {
    if (isBusy()) return;

    const id = positiveId(maLichKham);

    const item = globalQueueData.find(
        row => positiveId(row.maLichKham) === id
    );

    if (!id || !item || !canCallPatient(item)) {
        return;
    }

    callingPatient = true;
    updateBusyControls();
    renderDashboardTables();

    showDashboardMessage("Đang gọi bệnh nhân...");

    try {
        const result = await postJson(
            "/api/tiepnhan/call-patient",
            { maLichKham: id }
        );

        if (result.success !== true) {
            throw new Error(
                result.message || "Không thể gọi bệnh nhân."
            );
        }

        item.trangThai = STATUS_LABELS.DaGoi;

        currentCallItem = {
            maLichKham: id,
            stt: result.soThuTu ?? item.stt,
            ten: result.tenBenhNhan ?? item.tenBenhNhan,
            phong: result.phong ?? item.phong,
            khoa: result.khoa ?? item.khoa
        };

        setText(
            "modal-stt",
            `STT ${item.stt || result.soThuTu || "—"}`
        );

        setText("modal-ten", currentCallItem.ten);

        setText(
            "modal-phong",
            `Mời đến khu vực chờ trước ${currentCallItem.phong}`
        );

        try {
            const modalElement = $("modalGoiKham");

            if (modalElement && window.bootstrap?.Modal) {
                window.bootstrap.Modal
                    .getOrCreateInstance(modalElement)
                    .show();
            }

            speakAnnouncement(currentCallItem);
        } catch (error) {
            console.error(error);

            setText(
                "voice-status",
                "Đã ghi nhận gọi. Không phát được loa, "
                + "vui lòng gọi trực tiếp."
            );
        }

        const refreshed = await loadDashboardRealData(
            true,
            true
        );

        showDashboardMessage(
            refreshed
                ? "Đã gọi bệnh nhân. Mở hồ sơ để nhập và lưu số đo."
                : "Đã ghi nhận gọi nhưng chưa tải lại được dữ liệu. "
                    + "Hãy làm mới dữ liệu.",
            !refreshed
        );
    } catch (error) {
        await loadDashboardRealData(true, true);

        showDashboardMessage(
            error.message,
            true,
            error.lyDo
        );
    } finally {
        callingPatient = false;
        updateBusyControls();
        renderDashboardTables();
    }
}

// =========================================================
// XÁC NHẬN TIẾP NHẬN
// =========================================================

function requestReceptionConfirmation(patientName) {
    return new Promise(resolve => {
        const previousFocus = document.activeElement;

        const notice = document.createElement("section");
        notice.className = "dashboard-reception-toast";

        notice.setAttribute("role", "alertdialog");

        notice.setAttribute(
            "aria-labelledby",
            "reception-confirm-title"
        );

        notice.setAttribute(
            "aria-describedby",
            "reception-confirm-text"
        );

        const title = document.createElement("strong");
        title.id = "reception-confirm-title";
        title.textContent = "Xác nhận tiếp nhận bệnh nhân";

        const text = document.createElement("p");
        text.id = "reception-confirm-text";

        text.textContent =
            `Xác nhận đã tiếp nhận ${patientName || "bệnh nhân"}?\n`
            + "Hãy bảo đảm đã kiểm tra thông tin và lưu đủ cân nặng, "
            + "chiều cao, huyết áp tâm thu và tâm trương.";

        const actions = document.createElement("div");
        actions.className =
            "dashboard-reception-toast-actions";

        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "reception-toast-cancel";
        cancel.textContent = "Hủy";

        const accept = document.createElement("button");
        accept.type = "button";
        accept.className = "reception-toast-accept";
        accept.textContent = "Xác nhận tiếp nhận";

        actions.append(cancel, accept);
        notice.append(title, text, actions);
        document.body.append(notice);

        let finished = false;

        function finish(accepted) {
            if (finished) return;
            finished = true;

            document.removeEventListener(
                "keydown",
                onKeyDown,
                true
            );

            window.removeEventListener(
                "pagehide",
                onPageHide
            );

            notice.remove();

            if (
                previousFocus?.isConnected
                && !previousFocus.disabled
            ) {
                previousFocus.focus({
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

        function onPageHide() {
            finish(false);
        }

        cancel.addEventListener("click", () => {
            finish(false);
        });

        accept.addEventListener("click", () => {
            finish(true);
        });

        document.addEventListener(
            "keydown",
            onKeyDown,
            true
        );

        window.addEventListener(
            "pagehide",
            onPageHide
        );

        requestAnimationFrame(() => {
            if (finished) return;

            notice.classList.add("is-visible");

            cancel.focus({
                preventScroll: true
            });
        });
    });
}

async function handleConfirmReception(maLichKham) {
    if (isBusy()) return;

    const id = positiveId(maLichKham);

    const item = globalQueueData.find(
        row => positiveId(row.maLichKham) === id
    );

    if (!id || !item || !canConfirmReception(item)) {
        return;
    }

    confirmingReception = true;
    updateBusyControls();
    renderDashboardTables();

    try {
        const confirmed = await requestReceptionConfirmation(
            item.tenBenhNhan
        );

        if (!confirmed) return;

        /*
         * API sẽ kiểm tra phí khám, số đo, trạng thái
         * và ca trực; trả danh sách lý do nếu còn thiếu.
         */
        const result = await postJson(
            "/api/tiepnhan/confirm-reception",
            { maLichKham: id }
        );

        if (result.success !== true) {
            const error = new Error(
                result.message || "Không thể xác nhận tiếp nhận."
            );

            error.lyDo = Array.isArray(result.lyDo)
                ? result.lyDo
                : [];

            throw error;
        }

        item.trangThai = STATUS_LABELS.DaTiepNhan;

        const refreshed = await loadDashboardRealData(
            true,
            true
        );

        showDashboardMessage(
            refreshed
                ? "Đã tiếp nhận bệnh nhân. Chờ bác sĩ bắt đầu khám."
                : "Đã tiếp nhận nhưng chưa tải lại được dữ liệu. "
                    + "Hãy làm mới dữ liệu.",
            !refreshed
        );
    } catch (error) {
        await loadDashboardRealData(true, true);

        showDashboardMessage(
            error.message,
            true,
            error.lyDo
        );
    } finally {
        confirmingReception = false;
        updateBusyControls();
        renderDashboardTables();
    }
}

// =========================================================
// PHÁT LOA
// =========================================================

function replayVoice() {
    if (currentCallItem && !isBusy()) {
        void handleCallPatient(currentCallItem.maLichKham);
    }
}

function speakAnnouncement(item) {
    if (!("speechSynthesis" in window)) {
        setText(
            "voice-status",
            "Trình duyệt không hỗ trợ đọc thông báo. "
            + "Vui lòng gọi trực tiếp."
        );
        return;
    }

    const number = getSequenceNumber(item.stt);
    const khoa = String(item.khoa || "").trim();

    const department = /^khoa\s/i.test(khoa)
        ? khoa
        : khoa
            ? `khoa ${khoa}`
            : "";

    const announcement = new SpeechSynthesisUtterance(
        `Xin mời bệnh nhân ${item.ten}${
            number ? `, số thứ tự ${number}` : ""
        }, `
        + `đến khu vực chờ trước ${item.phong}${
            department ? `, ${department}` : ""
        }, `
        + "để nhân viên tiếp nhận kiểm tra thông tin "
        + "và lấy số đo trước khám."
    );

    announcement.lang = "vi-VN";
    announcement.rate = 0.9;

    const voice = window.speechSynthesis
        .getVoices()
        .find(
            value => value.lang.toLowerCase().startsWith("vi")
        );

    if (voice) {
        announcement.voice = voice;
    }

    announcement.onstart = () => {
        setText(
            "voice-status",
            "Đang phát thông báo gọi bệnh nhân..."
        );
    };

    announcement.onend = () => {
        setText(
            "voice-status",
            "Đã phát xong thông báo."
        );
    };

    announcement.onerror = () => {
        setText(
            "voice-status",
            "Không phát được thông báo. "
            + "Kiểm tra âm thanh hoặc gọi trực tiếp."
        );
    };

    window.speechSynthesis.cancel();

    setText(
        "voice-status",
        "Đang chuẩn bị phát thông báo..."
    );

    window.speechSynthesis.speak(announcement);
}

// =========================================================
// THÔNG BÁO TRÊN HEADER
// =========================================================

function setupDashboardNotifications() {
    const wrapper = $("notification-wrapper");
    const button = $("notification-button");
    const panel = $("notification-panel");

    if (!wrapper || !button || !panel) return;

    const close = () => {
        panel.hidden = true;
        button.setAttribute("aria-expanded", "false");
    };

    button.addEventListener("click", () => {
        panel.hidden = !panel.hidden;

        button.setAttribute(
            "aria-expanded",
            String(!panel.hidden)
        );
    });

    $("notification-close")?.addEventListener(
        "click",
        close
    );

    document.addEventListener("click", event => {
        if (!wrapper.contains(event.target)) {
            close();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !panel.hidden) {
            close();
            button.focus();
        }
    });
}

// =========================================================
// KHỞI TẠO
// =========================================================

function initDashboard() {
    $("refresh-dashboard-button")?.addEventListener(
        "click",
        () => void loadDashboardRealData()
    );

    [
        "room-filter",
        "doctor-filter",
        "department-filter",
        "status-filter"
    ].forEach(id => {
        $(id)?.addEventListener(
            "change",
            applyFiltersAndRender
        );
    });

    $("queue-search")?.addEventListener(
        "input",
        applyFiltersAndRender
    );

    $("replay-voice-button")?.addEventListener(
        "click",
        replayVoice
    );

    const feeModal = $("vien-phi-modal");

    feeModal?.addEventListener("show.bs.modal", () => {
        vienPhiOpen = true;
        updateBusyControls();
    });

    feeModal?.addEventListener("hidden.bs.modal", () => {
        vienPhiOpen = false;
        updateBusyControls();
        renderDashboardTables();
        refreshDashboardWhenIdle();
    });

    setupDashboardNotifications();
    updateCurrentHeaderDate();
    updateFilterOptions();

    void loadDashboardRealData();

    window.setInterval(
        refreshDashboardWhenIdle,
        15000
    );

    document.addEventListener(
        "visibilitychange",
        refreshDashboardWhenIdle
    );

    window.addEventListener(
        "focus",
        refreshDashboardWhenIdle
    );
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initDashboard
    );
} else {
    initDashboard();
}