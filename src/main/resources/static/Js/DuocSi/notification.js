document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    // =====================================================
    // CẤU HÌNH
    // =====================================================

    const API_BASE = "/api/thong-bao";

    const notificationButton =
        document.getElementById("notificationButton");

    const notificationPanel =
        document.getElementById("notificationPanel");

    const notificationBadge =
        document.getElementById("notificationBadge");

    const notificationList =
        document.getElementById("notificationList");

    const notificationCountText =
        document.getElementById("notificationCountText");

    const markAllReadButton =
        document.getElementById("markAllReadButton");

    // Kiểm tra HTML
    if (
        !notificationButton ||
        !notificationPanel ||
        !notificationBadge ||
        !notificationList ||
        !notificationCountText ||
        !markAllReadButton
    ) {
        console.error(
            "Không tìm thấy đầy đủ HTML của khu vực thông báo."
        );
        return;
    }

    let notifications = [];
    let isLoading = false;
    let isPanelOpen = false;
    let lastUnreadCount = 0;
    let notificationSocket = null;

    // =====================================================
    // LẤY JWT
    // Token hiện tại được lưu trong sessionStorage
    // với key là "Token".
    // =====================================================

    function getJwtToken() {
        const possibleKeys = [
            "Token",
            "token",
            "JwtToken",
            "jwtToken",
            "accessToken",
            "access_token"
        ];

        for (const key of possibleKeys) {
            const token =
                sessionStorage.getItem(key) ||
                localStorage.getItem(key);

            if (token && token.trim()) {
                return token
                    .trim()
                    .replace(/^Bearer\s+/i, "");
            }
        }

        return null;
    }

    // =====================================================
    // GỌI API
    // =====================================================

    async function apiRequest(url, options = {}) {
        const token = getJwtToken();

        const headers = {
            Accept: "application/json",
            ...(options.headers || {})
        };

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            ...options,
            credentials: "same-origin",
            headers
        });

        if (response.status === 204) {
            return null;
        }

        const responseText = await response.text();

        if (!response.ok) {
            console.error("Lỗi API thông báo:", {
                url,
                status: response.status,
                response: responseText,
                hasToken: Boolean(token)
            });

            if (response.status === 401) {
                throw new Error(
                    "Chưa đăng nhập hoặc JWT đã hết hạn."
                );
            }

            if (response.status === 403) {
                throw new Error(
                    "403 Forbidden: kiểm tra JWT và quyền truy cập API."
                );
            }

            throw new Error(
                `API lỗi HTTP ${response.status}: ${responseText}`
            );
        }

        if (!responseText) {
            return null;
        }

        try {
            return JSON.parse(responseText);
        } catch {
            throw new Error(
                `API không trả về JSON hợp lệ: ${url}`
            );
        }
    }

    // =====================================================
    // ĐỊNH DẠNG THỜI GIAN
    // =====================================================

    function formatTime(value) {
        if (!value) return "";

        // Backend trả LocalDateTime dạng yyyy-MM-ddTHH:mm:ss
        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        const seconds = Math.max(
            0,
            Math.floor((Date.now() - date.getTime()) / 1000)
        );

        if (seconds < 60) {
            return "Vừa xong";
        }

        if (seconds < 3600) {
            return `${Math.floor(seconds / 60)} phút trước`;
        }

        if (seconds < 86400) {
            return `${Math.floor(seconds / 3600)} giờ trước`;
        }

        if (seconds < 604800) {
            return `${Math.floor(seconds / 86400)} ngày trước`;
        }

        return new Intl.DateTimeFormat("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(date);
    }

    // =====================================================
    // ICON THÔNG BÁO
    // =====================================================

    function getIcon(type) {
        const icons = {
            medicine: "💊",
            thuoc: "💊",
            stock: "📦",
            category: "🗂️",
            danhmuc: "🗂️",
            add: "➕",
            edit: "✏️",
            delete: "🗑️",
            password: "🔐",
            ketqua: "🧪",
            ketquadichvu: "🧪",
            lichkham: "📅",
            chidinh: "📋",
            donthuoc: "💊",
            general: "🔔"
        };

        const normalizedType = String(type || "").toLowerCase();

        return icons[normalizedType] || "🔔";
    }

    // =====================================================
    // CẬP NHẬT BADGE TRÊN CHUÔNG
    // =====================================================

    function updateBadge(count) {
        const unreadCount = Math.max(
            0,
            Number(count) || 0
        );

        lastUnreadCount = unreadCount;

        if (unreadCount > 0) {
            notificationBadge.textContent =
                unreadCount > 99
                    ? "99+"
                    : String(unreadCount);

            notificationBadge.classList.remove("hidden");
        } else {
            notificationBadge.textContent = "0";
            notificationBadge.classList.add("hidden");
        }

        notificationCountText.textContent =
            `${unreadCount} thông báo mới`;

        markAllReadButton.disabled = unreadCount === 0;
    }

    // =====================================================
    // HIỂN THỊ THÔNG BÁO TRỐNG / LỖI
    // =====================================================

    function showMessage(message) {
        notificationList.replaceChildren();

        const element = document.createElement("div");
        element.className = "notification-empty";
        element.textContent = message;

        notificationList.appendChild(element);
    }

    // =====================================================
    // HIỂN THỊ DANH SÁCH THÔNG BÁO
    // =====================================================

    function renderNotifications() {
        notificationList.replaceChildren();

        if (notifications.length === 0) {
            showMessage("Không có thông báo.");
            return;
        }

        notifications.forEach(notification => {
            const item = document.createElement("button");

            item.type = "button";
            item.className =
                "notification-item" +
                (notification.unread ? " unread" : "");

            item.dataset.id = String(notification.id);

            const icon = document.createElement("div");
            icon.className = "notification-item-icon";
            icon.textContent = getIcon(notification.type);

            const content = document.createElement("div");
            content.className = "notification-item-content";

            const title = document.createElement("div");
            title.className = "notification-item-title";
            title.textContent = notification.title || "Thông báo";

            const message = document.createElement("div");
            message.className = "notification-item-message";
            message.textContent = notification.message || "";

            const time = document.createElement("div");
            time.className = "notification-item-time";
            time.textContent = formatTime(notification.createdAt);

            content.append(title, message, time);
            item.append(icon, content);

            if (notification.unread) {
                const dot = document.createElement("span");
                dot.className = "notification-unread-dot";
                item.appendChild(dot);
            }

            item.addEventListener("click", async () => {
                await markOneAsRead(notification);
            });

            notificationList.appendChild(item);
        });
    }

    // =====================================================
    // TẢI DANH SÁCH THÔNG BÁO
    // Chỉ gọi khi người dùng mở bảng thông báo.
    // =====================================================

    async function loadNotifications() {
        if (isLoading) return;

        isLoading = true;

        try {
            const [listResult, countResult] = await Promise.all([
                apiRequest(`${API_BASE}?limit=20`),
                apiRequest(`${API_BASE}/chua-doc`)
            ]);

            if (!Array.isArray(listResult)) {
                throw new Error(
                    "API danh sách thông báo không trả về mảng."
                );
            }

            notifications = listResult.map(item => ({
                id: item.id,
                title: item.title || "Thông báo",
                message: item.message || "",
                type: item.type || "general",
                createdAt: item.createdAt || "",
                unread: Boolean(item.unread),
                status: item.status || ""
            }));

            updateBadge(countResult?.count ?? 0);

            renderNotifications();

        } catch (error) {
            console.error("Lỗi tải thông báo:", error);

            if (notifications.length === 0) {
                showMessage(
                    "Không tải được thông báo. " +
                    "Vui lòng kiểm tra JWT/API."
                );
            }
        } finally {
            isLoading = false;
        }
    }

    // =====================================================
    // ĐÁNH DẤU MỘT THÔNG BÁO ĐÃ ĐỌC
    // =====================================================

    async function markOneAsRead(notification) {
        if (!notification.unread) return;

        try {
            await apiRequest(
                `${API_BASE}/${encodeURIComponent(notification.id)}/da-doc`,
                { method: "PATCH" }
            );

            notification.unread = false;

            // Cập nhật trạng thái trên giao diện.
            renderNotifications();

            // Lấy lại số lượng chưa đọc thực tế từ backend.
            const result = await apiRequest(
                `${API_BASE}/chua-doc`
            );

            updateBadge(result?.count ?? 0);

        } catch (error) {
            console.error(
                "Lỗi đánh dấu thông báo đã đọc:",
                error
            );
        }
    }

    // =====================================================
    // ĐÁNH DẤU TẤT CẢ THÔNG BÁO ĐÃ ĐỌC
    // =====================================================

    markAllReadButton.addEventListener("click", async event => {
        event.preventDefault();
        event.stopPropagation();

        if (lastUnreadCount === 0) return;

        markAllReadButton.disabled = true;

        try {
            await apiRequest(
                `${API_BASE}/da-doc-tat-ca`,
                { method: "PATCH" }
            );

            notifications.forEach(item => {
                item.unread = false;
            });

            updateBadge(0);
            renderNotifications();

        } catch (error) {
            console.error(
                "Lỗi đánh dấu tất cả đã đọc:",
                error
            );
        } finally {
            markAllReadButton.disabled =
                lastUnreadCount === 0;
        }
    });

    // =====================================================
    // MỞ / ĐÓNG BẢNG THÔNG BÁO
    // =====================================================

    notificationButton.addEventListener("click", async event => {
        event.preventDefault();
        event.stopPropagation();

        const isOpening =
            !notificationPanel.classList.contains("show");

        if (isOpening) {

            // Mở bảng ngay lập tức
            notificationPanel.classList.add("show");
            isPanelOpen = true;

            // Sau đó mới tải dữ liệu
            await loadNotifications();

        } else {

            notificationPanel.classList.remove("show");
            isPanelOpen = false;

        }
    });


    // =====================================================
    // CLICK BÊN TRONG PANEL
    // Không cho sự kiện lan ra document
    // =====================================================

    notificationPanel.addEventListener("click", event => {
        event.stopPropagation();
    });


    // =====================================================
    // CLICK RA NGOÀI → ĐÓNG PANEL
    // =====================================================

    document.addEventListener("click", event => {

        if (
            !notificationPanel.contains(event.target) &&
            !notificationButton.contains(event.target)
        ) {
            notificationPanel.classList.remove("show");
            isPanelOpen = false;
        }

    });


    // =====================================================
    // WEBSOCKET
    // =====================================================

    function connectNotificationWebSocket() {

        const token = getJwtToken();

        if (!token) {
            console.error(
                "Không tìm thấy JWT để kết nối WebSocket."
            );
            return;
        }

        if (!window.StompJs) {
            console.error(
                "Không tìm thấy thư viện STOMP."
            );
            return;
        }

        const protocol =
            location.protocol === "https:"
                ? "wss:"
                : "ws:";

        notificationSocket = new StompJs.Client({

            brokerURL:
                `${protocol}//${location.host}/ws`,

            connectHeaders: {
                Authorization: `Bearer ${token}`
            },

            reconnectDelay: 3000,

            onConnect: () => {

                console.log(
                    "WebSocket thông báo đã kết nối."
                );

                notificationSocket.subscribe(
                    "/user/queue/thong-bao",
                    message => {

                        try {

                            const data =
                                JSON.parse(message.body);

                            console.log(
                                "Nhận thông báo realtime:",
                                data
                            );

                            // Chỉ cập nhật số badge
                            updateBadge(
                                data.count ?? 0
                            );

                            // Nếu panel đang mở
                            // thì tải lại danh sách
                            if (isPanelOpen) {
                                loadNotifications();
                            }

                        } catch (error) {

                            console.error(
                                "Không đọc được thông báo WebSocket:",
                                error
                            );

                        }

                    }
                );

                // Lấy số thông báo chưa đọc ban đầu
                apiRequest(
                    `${API_BASE}/chua-doc`
                )
                    .then(result => {
                        updateBadge(
                            result?.count ?? 0
                        );
                    })
                    .catch(error => {
                        console.error(
                            "Không lấy được số thông báo:",
                            error
                        );
                    });

            },

            onStompError: frame => {

                console.error(
                    "Lỗi STOMP:",
                    frame.headers?.message
                );

            },

            onWebSocketError: error => {

                console.error(
                    "Lỗi WebSocket:",
                    error
                );

            }

        });

        notificationSocket.activate();
    }


    // =====================================================
    // KHỞI ĐỘNG WEBSOCKET
    // =====================================================

    connectNotificationWebSocket();

});