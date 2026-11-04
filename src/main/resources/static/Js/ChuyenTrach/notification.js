/**
 * NOTIFICATION - HEADER
 * Dùng cho nhân viên tiếp nhận / chuyên trách.
 */

(function () {
    "use strict";

    // =====================================================
    // CẤU HÌNH
    // =====================================================

    const API_BASE = "/api/thong-bao";
    const WS_ENDPOINT = "/ws";
    const WS_DESTINATION = "/user/queue/thong-bao";

    const wrapper = document.getElementById("notificationWrapper");
    const button = document.getElementById("notificationButton");
    const badge = document.getElementById("notificationBadge");
    const dropdown = document.getElementById("notificationDropdown");
    const list = document.getElementById("notificationList");
    const countText = document.getElementById("notificationCountText");
    const markAllButton = document.getElementById("markAllReadButton");

    // =====================================================
    // KIỂM TRA HTML
    // =====================================================

    if (!wrapper || !button || !badge || !dropdown || !list) {
        console.error("[Notification] Không tìm thấy HTML thông báo.");
        return;
    }

    // Ngăn khởi tạo listener nhiều lần
    if (button.dataset.notificationInitialized === "true") {
        console.warn("[Notification] Đã khởi tạo, bỏ qua lần chạy trùng.");
        return;
    }

    button.dataset.notificationInitialized = "true";

    let notifications = [];
    let isLoading = false;
    let isPanelOpen = false;
    let stompClient = null;
    let lastUnreadCount = 0;

    console.log("[Notification] JS initialized.");

    // =====================================================
    // LẤY JWT
    // =====================================================

    function getJwtToken() {
        const keys = [
            "Token",
            "token",
            "JwtToken",
            "jwtToken",
            "accessToken",
            "access_token"
        ];

        for (const key of keys) {
            const token =
                sessionStorage.getItem(key) ||
                localStorage.getItem(key);

            if (token && token.trim()) {
                return token.trim().replace(/^Bearer\s+/i, "");
            }
        }

        console.warn("[Notification] Không tìm thấy JWT trong storage.");
        return null;
    }

    // =====================================================
    // GỌI API
    // =====================================================

    async function apiRequest(url, options = {}) {
        const token = getJwtToken();

        const headers = new Headers(options.headers || {});
        headers.set("Accept", "application/json");

        if (token) {
            headers.set("Authorization", "Bearer " + token);
        } else {
            console.error("[Notification] Không tìm thấy JWT.");
            throw new Error("Không tìm thấy JWT");
        }

        if (options.body && !headers.has("Content-Type")) {
            headers.set("Content-Type", "application/json");
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
            const response = await fetch(url, {
                ...options,
                headers,
                credentials: "same-origin",
                signal: controller.signal
            });

            if (!response.ok) {
                const body = await response.text();
                throw new Error("HTTP " + response.status + ": " + body);
            }

            if (response.status === 204) {
                return null;
            }

            const text = await response.text();
            return text ? JSON.parse(text) : null;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    // =====================================================
    // LẤY ID THÔNG BÁO
    // =====================================================

    function getId(item) {
        return item?.id
            ?? item?.maThongBao
            ?? item?.notificationId
            ?? item?.MaThongBao;
    }

    // =====================================================
    // KIỂM TRA TRẠNG THÁI CHƯA ĐỌC
    // =====================================================

    function isUnread(item) {
        if (typeof item?.unread === "boolean") {
            return item.unread;
        }

        if (typeof item?.daDoc === "boolean") {
            return !item.daDoc;
        }

        if (typeof item?.isRead === "boolean") {
            return !item.isRead;
        }

        const status = String(
            item?.status || item?.trangThai || ""
        ).toUpperCase();

        if (status.includes("DA_DOC") || status.includes("READ")) {
            return false;
        }

        if (status.includes("CHUA_DOC") || status.includes("UNREAD")) {
            return true;
        }

        return item?.ngayDoc == null && item?.readAt == null;
    }

    // =====================================================
    // CHUẨN HÓA SỐ LƯỢNG CHƯA ĐỌC
    // =====================================================

    function normalizeUnreadCount(result, items) {
        if (typeof result === "number") {
            return result;
        }

        if (
            typeof result === "string" &&
            !Number.isNaN(Number(result))
        ) {
            return Number(result);
        }

        if (result && typeof result === "object") {
            const count =
                result.count ??
                result.soLuong ??
                result.total ??
                result.unreadCount ??
                result.soThongBaoChuaDoc;

            if (
                count !== undefined &&
                !Number.isNaN(Number(count))
            ) {
                return Number(count);
            }
        }

        return items.filter(isUnread).length;
    }

    // =====================================================
    // FORMAT THỜI GIAN
    // =====================================================

    function formatDate(value) {
        if (!value) return "";

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
            return Math.floor(seconds / 60) + " phút trước";
        }

        if (seconds < 86400) {
            return Math.floor(seconds / 3600) + " giờ trước";
        }

        if (seconds < 604800) {
            return Math.floor(seconds / 86400) + " ngày trước";
        }

        return date.toLocaleString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
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
            don_thuoc: "💊",
            general: "🔔"
        };

        const normalizedType = String(type || "").toLowerCase();
        return icons[normalizedType] || "🔔";
    }

    // =====================================================
    // HIỂN THỊ BADGE
    // =====================================================

    function renderBadge(count) {
        const unreadCount = Math.max(0, Number(count) || 0);

        lastUnreadCount = unreadCount;

        badge.textContent =
            unreadCount > 99 ? "99+" : String(unreadCount);

        badge.hidden = unreadCount === 0;

        if (countText) {
            countText.textContent =
                unreadCount === 0
                    ? "Không có thông báo chưa đọc"
                    : unreadCount + " thông báo chưa đọc";
        }

        if (markAllButton) {
            markAllButton.disabled = unreadCount === 0;
        }
    }

    // =====================================================
    // HIỂN THỊ TRẠNG THÁI
    // =====================================================

    function showMessage(
        message,
        className = "notification-empty"
    ) {
        list.replaceChildren();

        const element = document.createElement("div");
        element.className = className;
        element.textContent = message;

        list.appendChild(element);
    }

    // =====================================================
    // RENDER DANH SÁCH THÔNG BÁO
    // =====================================================

    function renderNotifications() {
        list.replaceChildren();

        if (notifications.length === 0) {
            showMessage("Không có thông báo.");
            return;
        }

        notifications.forEach(notification => {
            const id = getId(notification);
            const unread = isUnread(notification);

            const item = document.createElement("button");
            item.type = "button";
            item.className =
                "notification-item" +
                (unread ? " unread" : " read");

            item.dataset.notificationId = String(id ?? "");

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
            time.textContent = formatDate(notification.createdAt);

            content.append(title, message, time);
            item.append(icon, content);

            if (unread) {
                const dot = document.createElement("span");
                dot.className = "notification-unread-dot";
                item.appendChild(dot);
            }

            list.appendChild(item);
        });
    }

    // =====================================================
    // TẢI DANH SÁCH THÔNG BÁO
    // =====================================================

    async function loadNotifications() {
        if (isLoading) return;

        isLoading = true;
        showMessage("Đang tải thông báo...", "notification-loading");

        try {
            const result = await apiRequest(API_BASE + "?limit=20");

            if (!Array.isArray(result)) {
                throw new Error(
                    "API danh sách thông báo không trả về mảng."
                );
            }

            notifications = result.map(item => ({
                id: item.id ?? item.maThongBao,
                title: item.title || item.tieuDe || "Thông báo",
                message: item.message || item.noiDung || "",
                type: item.type || item.loaiThongBao || "general",
                createdAt: item.createdAt || item.ngayTao || "",
                unread: item.unread === true,
                status: item.status || item.trangThai || ""
            }));

            const unreadCount = notifications.filter(
                item => item.unread
            ).length;

            renderNotifications();
            renderBadge(unreadCount);

            console.log("[Notification] Render thành công:", {
                total: notifications.length,
                unreadCount: unreadCount
            });
        } catch (error) {
            console.error("[Notification] Lỗi tải thông báo:", error);

            showMessage(
                "Không tải được thông báo. Vui lòng thử lại.",
                "notification-error"
            );
        } finally {
            isLoading = false;
        }
    }

    // =====================================================
    // MỞ / ĐÓNG DROPDOWN
    // =====================================================

    function openDropdown() {
        dropdown.hidden = false;
        button.setAttribute("aria-expanded", "true");
        isPanelOpen = true;

        loadNotifications();
    }

    function closeDropdown() {
        dropdown.hidden = true;
        button.setAttribute("aria-expanded", "false");
        isPanelOpen = false;
    }

    button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();

        if (dropdown.hidden) {
            openDropdown();
        } else {
            closeDropdown();
        }
    });

    dropdown.addEventListener("click", event => {
        event.stopPropagation();
    });

    document.addEventListener("click", event => {
        if (!wrapper.contains(event.target)) {
            closeDropdown();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeDropdown();
        }
    });

    // =====================================================
    // ĐÁNH DẤU MỘT THÔNG BÁO ĐÃ ĐỌC
    // =====================================================

    list.addEventListener("click", async event => {
        const itemElement = event.target.closest(
            "[data-notification-id]"
        );

        if (!itemElement) return;

        const id = itemElement.dataset.notificationId;
        if (!id) return;

        const notification = notifications.find(
            item => String(getId(item)) === String(id)
        );

        if (!notification || !isUnread(notification)) {
            return;
        }

        itemElement.disabled = true;

        try {
            await apiRequest(
                API_BASE + "/" + encodeURIComponent(id) + "/da-doc",
                { method: "PATCH" }
            );

            notification.unread = false;
            renderNotifications();

            const countResult = await apiRequest(
                API_BASE + "/chua-doc"
            );

            renderBadge(
                normalizeUnreadCount(countResult, notifications)
            );
        } catch (error) {
            console.error(
                "[Notification] Lỗi đánh dấu đã đọc:",
                error
            );
        }
    });

    // =====================================================
    // ĐÁNH DẤU TẤT CẢ ĐÃ ĐỌC
    // =====================================================

    if (markAllButton) {
        markAllButton.addEventListener("click", async event => {
            event.preventDefault();
            event.stopPropagation();

            if (lastUnreadCount === 0) return;

            markAllButton.disabled = true;

            try {
                await apiRequest(
                    API_BASE + "/da-doc-tat-ca",
                    { method: "PATCH" }
                );

                notifications.forEach(item => {
                    item.unread = false;
                });

                renderNotifications();
                renderBadge(0);
            } catch (error) {
                console.error(
                    "[Notification] Lỗi đánh dấu tất cả đã đọc:",
                    error
                );
            } finally {
                markAllButton.disabled =
                    notifications.filter(isUnread).length === 0;
            }
        });
    }

    // =====================================================
    // WEBSOCKET REALTIME
    // =====================================================

    function connectWebSocket() {
        if (!window.StompJs?.Client) {
            console.warn(
                "[Notification] Chưa có STOMP; vẫn dùng API để tải thông báo."
            );
            return;
        }

        const token = getJwtToken();

        if (!token) {
            console.warn(
                "[Notification] Không tìm thấy JWT cho WebSocket."
            );
            return;
        }

        const protocol =
            location.protocol === "https:" ? "wss:" : "ws:";

        stompClient = new StompJs.Client({
            brokerURL:
                protocol + "//" + location.host + WS_ENDPOINT,

            connectHeaders: {
                Authorization: "Bearer " + token
            },

            reconnectDelay: 5000,

            onConnect: () => {
                console.log(
                    "[Notification] WebSocket đã kết nối."
                );

                stompClient.subscribe(
                    WS_DESTINATION,
                    message => {
                        try {
                            const data = JSON.parse(message.body);

                            console.log(
                                "[Notification] Realtime:",
                                data
                            );

                            if (data.count !== undefined) {
                                renderBadge(data.count);
                            }

                            if (isPanelOpen) {
                                loadNotifications();
                            }
                        } catch (error) {
                            console.error(
                                "[Notification] Lỗi đọc WebSocket:",
                                error
                            );
                        }
                    }
                );

                // Đồng bộ badge ban đầu
                apiRequest(API_BASE + "/chua-doc")
                    .then(result => {
                        renderBadge(
                            normalizeUnreadCount(
                                result,
                                notifications
                            )
                        );
                    })
                    .catch(error => {
                        console.error(
                            "[Notification] Không lấy được badge:",
                            error
                        );
                    });
            },

            onStompError: frame => {
                console.error(
                    "[Notification] STOMP error:",
                    frame.headers?.message
                );
            },

            onWebSocketError: error => {
                console.error(
                    "[Notification] WebSocket error:",
                    error
                );
            }
        });

        stompClient.activate();
    }

    // =====================================================
    // KHỞI TẠO
    // =====================================================

    // Đồng bộ badge ban đầu, danh sách chỉ tải khi mở dropdown
    apiRequest(API_BASE + "/chua-doc")
        .then(result => {
            renderBadge(
                normalizeUnreadCount(result, notifications)
            );
        })
        .catch(error => {
            console.error(
                "[Notification] Lỗi tải số thông báo ban đầu:",
                error
            );
        });

    connectWebSocket();

})();