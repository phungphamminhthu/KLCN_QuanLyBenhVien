
/* =========================================================
   MEDCARE - CHUÔNG THÔNG BÁO NHÂN VIÊN TIẾP NHẬN
   - Lấy thông báo từ MySQL qua REST API
   - Nhận realtime qua WebSocket STOMP
   - Đếm thông báo chưa đọc
   - Đánh dấu đã đọc / tất cả đã đọc
   - Hiển thị tối đa 100 thông báo
========================================================= */

(() => {
    "use strict";

    if (window.TiepNhanBell) return;

    const API = "/api/thong-bao";
    const CHANNEL = "/user/queue/thong-bao";

    let pageSize = 5;
    let client = null;
    let loading = false;
    let pendingRefresh = false;
    let refreshTimer = null;

    const $ = id => document.getElementById(id);

    const badge = $("notificationBadge");
    const panel = $("notification-panel");
    const countText = $("notificationCountText");

    const body = panel?.querySelector(
        ".notification-panel-body"
    );

    const footer = panel?.querySelector(
        ".notification-panel-footer"
    );

    if (!badge || !panel || !body || !countText) {
        console.warn(
            "[TiepNhan] Không tìm thấy giao diện chuông."
        );
        return;
    }

    // =====================================================
    // 1. CSS BỔ SUNG
    // =====================================================

    const style = document.createElement("style");

    style.textContent = `
        .notification-panel-body {
            max-height: 390px;
            overflow-y: auto;
        }

        .tn-notification-item {
            display: flex;
            align-items: flex-start;
            gap: 11px;
            width: 100%;
            padding: 13px 15px;
            background: #fff;
            border: 0;
            border-bottom: 1px solid #edf0f7;
            text-align: left;
            cursor: pointer;
            font: inherit;
            color: #293149;
        }

        .tn-notification-item:hover {
            background: #f5f7ff;
        }

        .tn-notification-item.is-unread {
            background: #f3f5ff;
        }

        .tn-notification-item.is-unread:hover {
            background: #eaf0ff;
        }

        .tn-notification-icon {
            width: 37px;
            height: 37px;
            flex: 0 0 37px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 10px;
            color: #6236ff;
            background: #efebff;
            font-size: 15px;
        }

        .tn-notification-content {
            flex: 1;
            min-width: 0;
        }

        .tn-notification-title {
            display: block;
            font-size: 13px;
            font-weight: 700;
            line-height: 1.5;
        }

        .tn-notification-message {
            margin: 4px 0;
            font-size: 12px;
            color: #68748e;
            line-height: 1.6;
            overflow-wrap: anywhere;
        }

        .tn-notification-time {
            font-size: 11px;
            color: #8994aa;
        }

        .tn-notification-dot {
            width: 7px;
            height: 7px;
            flex: 0 0 7px;
            margin-top: 7px;
            border-radius: 50%;
            background: #6236ff;
        }

        .tn-notification-empty {
            padding: 35px 15px;
            text-align: center;
            color: #8490a5;
            font-size: 13px;
            line-height: 1.7;
        }

        .tn-notification-empty i {
            display: block;
            font-size: 27px;
            color: #6236ff;
            margin-bottom: 11px;
        }

        .tn-mark-all {
            border: 0;
            background: transparent;
            color: #6236ff;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            padding: 6px;
        }

        .tn-mark-all:disabled {
            opacity: .45;
            cursor: not-allowed;
        }

        .notification-panel-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;
        }
    `;

    document.head.appendChild(style);

    // =====================================================
    // 2. TOKEN VÀ GỌI API
    // =====================================================

    function getToken() {
        return (
            sessionStorage.getItem("Token")
            || localStorage.getItem("Token")
            || sessionStorage.getItem("token")
            || localStorage.getItem("token")
            || ""
        ).trim();
    }

    function bearerToken() {
        const token = getToken();

        return /^Bearer\s/i.test(token)
            ? token
            : `Bearer ${token}`;
    }

    async function request(url, options = {}) {
        if (!getToken()) {
            throw new Error("Phiên đăng nhập không hợp lệ.");
        }

        const headers = new Headers(options.headers || {});

        headers.set("Accept", "application/json");
        headers.set("Authorization", bearerToken());

        const response = await fetch(url, {
            ...options,
            headers,
            credentials: "same-origin",
            cache: "no-store"
        });

        if (!response.ok) {
            const data = await response.json()
                .catch(() => null);

            throw new Error(
                data?.message
                || `Không thể tải thông báo (HTTP ${response.status}).`
            );
        }

        if (response.status === 204) {
            return null;
        }

        return response.json();
    }

    // =====================================================
    // 3. HIỂN THỊ SỐ THÔNG BÁO CHƯA ĐỌC
    // =====================================================

    function updateCount(count) {
        const value = Math.max(0, Number(count) || 0);

        badge.textContent =
            value > 99 ? "99+" : String(value);

        badge.hidden = value === 0;

        countText.textContent =
            `${value} thông báo chưa đọc`;

        if (markAllButton) {
            markAllButton.disabled = value === 0;
        }
    }

    // =====================================================
    // 4. THỜI GIAN THÔNG BÁO
    // =====================================================

    function formatTime(value) {
        if (!value) return "";

        // Java LocalDateTime không có múi giờ.
        // Dữ liệu server MedCare dùng giờ Việt Nam.
        let text = String(value).trim().replace(" ", "T");

        if (!/(Z|[+-]\d{2}:\d{2})$/i.test(text)) {
            text += "+07:00";
        }

        const date = new Date(text);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        const minutes = Math.max(
            0,
            Math.floor((Date.now() - date.getTime()) / 60000)
        );

        if (minutes < 1) return "Vừa xong";
        if (minutes < 60) return `${minutes} phút trước`;

        if (minutes < 1440) {
            return `${Math.floor(minutes / 60)} giờ trước`;
        }

        return date.toLocaleString("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    // =====================================================
    // 5. ICON TỪNG LOẠI THÔNG BÁO
    // =====================================================

    function getIcon(type) {
        const icons = {
            LICH_KHAM_MOI: "fa-calendar-plus",
            THANH_TOAN_THANH_CONG: "fa-circle-check",
            LICH_KHAM_BI_HUY: "fa-calendar-xmark",
            LICH_KHAM_THAY_DOI: "fa-calendar-days",
            THANH_TOAN_CAN_KIEM_TRA: "fa-triangle-exclamation",
            BENH_NHAN_DEN_KHAM: "fa-user-check"
        };

        return icons[String(type || "").toUpperCase()]
            || "fa-bell";
    }

    // =====================================================
    // 6. HIỂN THỊ DANH SÁCH THÔNG BÁO
    // =====================================================

    function renderNotifications(items) {
        body.replaceChildren();

        if (!Array.isArray(items) || items.length === 0) {
            const empty = document.createElement("div");

            empty.className = "tn-notification-empty";

            const icon = document.createElement("i");
            icon.className = "fa-regular fa-bell";

            const message = document.createElement("div");
            message.textContent =
                "Chưa có thông báo để hiển thị.";

            empty.append(icon, message);
            body.appendChild(empty);
            return;
        }

        const fragment = document.createDocumentFragment();

        items.forEach(item => {
            const button = document.createElement("button");

            button.type = "button";
            button.className = "tn-notification-item";

            if (item.unread === true) {
                button.classList.add("is-unread");
            }

            const iconBox = document.createElement("div");
            iconBox.className = "tn-notification-icon";

            const icon = document.createElement("i");
            icon.className =
                `fa-solid ${getIcon(item.type)}`;

            iconBox.appendChild(icon);

            const content = document.createElement("div");
            content.className = "tn-notification-content";

            const title = document.createElement("strong");
            title.className = "tn-notification-title";
            title.textContent =
                item.title || "Thông báo MedCare";

            const message = document.createElement("p");
            message.className = "tn-notification-message";
            message.textContent = item.message || "";

            const time = document.createElement("span");
            time.className = "tn-notification-time";
            time.textContent = formatTime(item.createdAt);

            content.append(title, message, time);

            button.append(iconBox, content);

            if (item.unread === true) {
                const dot = document.createElement("span");
                dot.className = "tn-notification-dot";
                button.appendChild(dot);
            }

            // Đánh dấu đã đọc khi bấm vào thông báo.
            button.addEventListener("click", async () => {
                if (item.unread !== true) return;

                button.disabled = true;

                try {
                    await request(
                        `${API}/${encodeURIComponent(item.id)}/da-doc`,
                        { method: "PATCH" }
                    );

                    await refresh();
                } catch (error) {
                    console.error(
                        "[TiepNhan] Không đánh dấu được:",
                        error
                    );

                    button.disabled = false;
                }
            });

            fragment.appendChild(button);
        });

        body.appendChild(fragment);
    }

    // =====================================================
    // 7. ĐỌC DANH SÁCH TỪ MYSQL
    // =====================================================

    async function refresh() {
        if (loading) {
            pendingRefresh = true;
            return;
        }

        loading = true;

        try {
            const [items, counter] = await Promise.all([
                request(`${API}?limit=${pageSize}`),
                request(`${API}/chua-doc`)
            ]);

            renderNotifications(items);
            updateCount(counter.count);

        } catch (error) {
            console.error(
                "[TiepNhan] Lỗi tải thông báo:",
                error
            );

            if (!body.children.length) {
                const empty = document.createElement("div");
                empty.className = "tn-notification-empty";
                empty.textContent =
                    "Không tải được thông báo. Vui lòng thử lại.";
                body.appendChild(empty);
            }

            countText.textContent =
                "Chưa cập nhật được thông báo";
        } finally {
            loading = false;

            if (pendingRefresh) {
                pendingRefresh = false;
                void refresh();
            }
        }
    }

    function scheduleRefresh() {
        clearTimeout(refreshTimer);

        refreshTimer = setTimeout(
            () => void refresh(),
            150
        );
    }

    // =====================================================
    // 8. ĐÁNH DẤU TẤT CẢ ĐÃ ĐỌC
    // =====================================================

    const markAllButton = document.createElement("button");

    markAllButton.type = "button";
    markAllButton.className = "tn-mark-all";
    markAllButton.textContent = "Đánh dấu tất cả đã đọc";
    markAllButton.disabled = true;

    if (footer) {
        footer.prepend(markAllButton);
    }

    markAllButton.addEventListener("click", async () => {
        markAllButton.disabled = true;

        try {
            await request(`${API}/da-doc-tat-ca`, {
                method: "PATCH"
            });

            await refresh();
        } catch (error) {
            console.error(
                "[TiepNhan] Lỗi đánh dấu tất cả:",
                error
            );
        }
    });

    // Dùng nút Xem tất cả hiện có để mở rộng danh sách.
    // Chưa cần xây thêm một trang riêng.
    const viewAllLink = footer?.querySelector("a");

    if (viewAllLink) {
        viewAllLink.textContent = "Xem thêm";

        viewAllLink.addEventListener("click", event => {
            event.preventDefault();

            pageSize = pageSize === 5 ? 100 : 5;

            viewAllLink.textContent =
                pageSize === 5 ? "Xem thêm" : "Thu gọn";

            void refresh();
        });
    }

    // =====================================================
    // 9. KẾT NỐI WEBSOCKET STOMP REALTIME
    // =====================================================

    function connectWebSocket() {
        if (!window.StompJs?.Client) {
            console.error(
                "[TiepNhan] Chưa tải thư viện STOMP."
            );
            return;
        }

        const protocol =
            window.location.protocol === "https:"
                ? "wss:"
                : "ws:";

        const url =
            `${protocol}//${window.location.host}/ws`;

        client = new StompJs.Client({
            brokerURL: url,
            reconnectDelay: 5000,
            heartbeatIncoming: 10000,
            heartbeatOutgoing: 10000,
            debug: () => {}
        });

        // Cập nhật JWT trước mỗi lần kết nối / kết nối lại.
        client.beforeConnect = async () => {
            client.connectHeaders = {
                Authorization: bearerToken()
            };
        };

        client.onConnect = () => {
            console.log(
                "[TiepNhan] WebSocket đã kết nối."
            );

            // Đúng kênh cá nhân trong WebSocketConfig.java.
            client.subscribe(CHANNEL, () => {
                scheduleRefresh();
            });

            // Đồng bộ khi vừa kết nối hoặc kết nối lại.
            scheduleRefresh();
        };

        client.onStompError = frame => {
            console.error(
                "[TiepNhan] STOMP lỗi:",
                frame.headers?.message || frame.body
            );
        };

        client.onWebSocketClose = () => {
            console.warn(
                "[TiepNhan] WebSocket ngắt kết nối; "
                + "đang chờ kết nối lại."
            );
        };

        client.activate();
    }

    // =====================================================
    // 10. KHỞI TẠO
    // =====================================================

    window.TiepNhanBell = {
        refresh,
        get connected() {
            return Boolean(client?.connected);
        }
    };

    void refresh();

    if (getToken()) {
        connectWebSocket();
    }

    // Đồng bộ thêm khi quay lại tab.
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
            scheduleRefresh();
        }
    });
})();
