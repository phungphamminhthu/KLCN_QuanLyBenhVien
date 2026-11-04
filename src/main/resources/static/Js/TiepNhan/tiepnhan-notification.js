/**
 * TIEP NHAN - NOTIFICATION
 * Chức năng:
 * - Bấm chuông mở/đóng popup
 * - Bấm ngoài popup hoặc Escape để đóng
 * - Tải danh sách thông báo từ REST API
 * - Hiển thị số thông báo chưa đọc
 * - Đánh dấu một thông báo đã đọc
 * - Đánh dấu tất cả đã đọc
 * - Nhận thông báo realtime qua STOMP WebSocket
 * - Gửi JWT trong STOMP CONNECT từ localStorage/sessionStorage
 */

(function () {
    "use strict";

    const API_BASE = "/api/thong-bao";
    const WS_ENDPOINT = "/ws";
    const WS_DESTINATION = "/user/queue/thong-bao";

    const SELECTORS = {
        wrapper: "#notification-wrapper",
        button: "#notification-button",
        badge: "#notificationBadge",
        panel: "#notification-panel",
        countText: "#notificationCountText",
        markAllButton: "#markAllReadButton",
        list: "#notificationList",
        body: ".notification-panel-body"
    };

    let elements = {};
    let notifications = [];
    let unreadCount = 0;
    let stompClient = null;
    let reconnectTimer = null;
    let isConnecting = false;
    let initialized = false;

    document.addEventListener("DOMContentLoaded", init);

    function init() {
        if (initialized) return;
        initialized = true;

        elements.wrapper = document.querySelector(SELECTORS.wrapper);
        elements.button = document.querySelector(SELECTORS.button);
        elements.badge = document.querySelector(SELECTORS.badge);
        elements.panel = document.querySelector(SELECTORS.panel);
        elements.countText = document.querySelector(SELECTORS.countText);
        elements.markAllButton = document.querySelector(SELECTORS.markAllButton);
        elements.list = document.querySelector(SELECTORS.list);
        elements.body = document.querySelector(SELECTORS.body);

        if (!elements.wrapper || !elements.button || !elements.panel) {
            console.error(
                "[TiepNhan Notification] Không tìm thấy wrapper, button hoặc panel.",
                {
                    wrapper: elements.wrapper,
                    button: elements.button,
                    panel: elements.panel
                }
            );
            return;
        }

        setupPanel();
        bindEvents();
        refreshNotifications();
        connectWebSocket();

        console.log("[TiepNhan Notification] Đã khởi tạo.");
    }

    // =========================================================
    // POPUP
    // =========================================================

    function setupPanel() {
        elements.button.setAttribute("type", "button");
        elements.button.setAttribute("aria-haspopup", "true");
        elements.button.setAttribute("aria-expanded", "false");

        elements.panel.hidden = true;
        elements.panel.style.display = "none";
        elements.panel.setAttribute("aria-hidden", "true");

        elements.wrapper.style.position =
            elements.wrapper.style.position || "relative";
        elements.wrapper.style.zIndex = "10000";
    }

    function isPanelOpen() {
        return !elements.panel.hidden &&
            window.getComputedStyle(elements.panel).display !== "none";
    }

    function openPanel() {
        elements.panel.hidden = false;
        elements.panel.classList.add("show");
        elements.panel.style.display = "block";
        elements.panel.setAttribute("aria-hidden", "false");

        elements.button.setAttribute("aria-expanded", "true");

        console.log("[TiepNhan Notification] Đã mở popup.");

        refreshNotifications();
    }

    function closePanel() {
        elements.panel.classList.remove("show");
        elements.panel.hidden = true;
        elements.panel.style.display = "none";
        elements.panel.setAttribute("aria-hidden", "true");

        elements.button.setAttribute("aria-expanded", "false");
    }

    function togglePanel() {
        if (isPanelOpen()) {
            closePanel();
        } else {
            openPanel();
        }
    }

    // =========================================================
    // EVENTS
    // =========================================================

    function bindEvents() {
        elements.button.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            togglePanel();
        });

        elements.panel.addEventListener("click", function (event) {
            event.stopPropagation();
        });

        elements.wrapper.addEventListener("click", function (event) {
            event.stopPropagation();
        });

        document.addEventListener("click", function (event) {
            if (!elements.wrapper.contains(event.target)) {
                closePanel();
            }
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                closePanel();
            }
        });

        if (elements.markAllButton) {
            elements.markAllButton.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();
                markAllAsRead();
            });
        }

        if (elements.list) {
            elements.list.addEventListener("click", function (event) {
                const item = event.target.closest("[data-notification-id]");
                if (!item) return;

                const notificationId = item.dataset.notificationId;
                if (!notificationId) return;

                markAsRead(notificationId);
            });
        }
    }

    // =========================================================
    // JWT
    // LOGIN.JS LƯU TOKEN VỚI KEY "Token"
    // =========================================================

    function getJwtToken() {
        return (
            localStorage.getItem("Token") ||
            sessionStorage.getItem("Token") ||
            ""
        );
    }

    // =========================================================
    // API
    // =========================================================

    async function apiRequest(url, options = {}) {
        const token = getJwtToken();

        const headers = {
            "Accept": "application/json",
            ...(options.headers || {})
        };

        // Gửi JWT cho REST API nếu token tồn tại.
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            method: options.method || "GET",
            credentials: "same-origin",
            headers: headers
        };

        if (config.body && !config.headers["Content-Type"]) {
            config.headers["Content-Type"] = "application/json";
        }

        const response = await fetch(url, config);

        if (!response.ok) {
            const errorText = await response.text().catch(() => "");

            throw new Error(
                `HTTP ${response.status} - ${errorText || response.statusText}`
            );
        }

        if (response.status === 204) {
            return null;
        }

        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            return response.json();
        }

        return null;
    }

    async function refreshNotifications() {
        try {
            const [allResult, unreadResult] = await Promise.all([
                apiRequest(API_BASE),
                apiRequest(`${API_BASE}/chua-doc`)
            ]);

            notifications = normalizeList(allResult);
            unreadCount = normalizeUnreadCount(
                unreadResult,
                notifications
            );

            renderNotifications();
            renderUnreadCount();
        } catch (error) {
            console.error(
                "[TiepNhan Notification] Lỗi tải thông báo:",
                error
            );

            if (elements.list && notifications.length === 0) {
                renderError(
                    "Không tải được thông báo. Vui lòng thử lại."
                );
            }
        }
    }

    function normalizeList(result) {
        if (Array.isArray(result)) {
            return result;
        }

        if (result && Array.isArray(result.data)) {
            return result.data;
        }

        if (result && Array.isArray(result.content)) {
            return result.content;
        }

        if (result && Array.isArray(result.thongBao)) {
            return result.thongBao;
        }

        return [];
    }

    function normalizeUnreadCount(result, allNotifications) {
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
            const candidates = [
                result.count,
                result.soLuong,
                result.total,
                result.tongSo,
                result.unreadCount,
                result.soThongBaoChuaDoc
            ];

            for (const value of candidates) {
                if (typeof value === "number") {
                    return value;
                }

                if (
                    typeof value === "string" &&
                    !Number.isNaN(Number(value))
                ) {
                    return Number(value);
                }
            }

            if (Array.isArray(result.data)) {
                return result.data.length;
            }
        }

        return allNotifications.filter(isUnread).length;
    }

    // =========================================================
    // RENDER
    // =========================================================

    function renderNotifications() {
        if (!elements.list) return;

        if (!notifications.length) {
            elements.list.innerHTML = `
                <div class="notification-empty">
                    <span>🔔</span>
                    <p>Không có thông báo</p>
                </div>
            `;
            return;
        }

        elements.list.innerHTML = notifications.map(function (notification) {
            const id = getNotificationId(notification);

            const title = escapeHtml(
                notification.tieuDe ||
                notification.title ||
                "Thông báo"
            );

            const content = escapeHtml(
                notification.noiDung ||
                notification.content ||
                notification.message ||
                ""
            );

            const createdAt = formatDate(
                notification.ngayTao ||
                notification.createdAt ||
                notification.thoiGian
            );

            const unread = isUnread(notification);

            return `
                <div class="notification-item ${unread ? "unread" : "read"}"
                     data-notification-id="${escapeHtml(String(id ?? ""))}"
                     role="button"
                     tabindex="0">
                    <div class="notification-item-content">
                        <div class="notification-item-title">
                            ${title}
                            ${unread
                                ? '<span class="notification-unread-dot"></span>'
                                : ""}
                        </div>

                        <div class="notification-item-message">
                            ${content}
                        </div>

                        <div class="notification-item-time">
                            ${escapeHtml(createdAt)}
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    }

    function renderError(message) {
        if (!elements.list) return;

        elements.list.innerHTML = `
            <div class="notification-error">
                ${escapeHtml(message)}
            </div>
        `;
    }

    function renderUnreadCount() {
        const count = Math.max(0, Number(unreadCount) || 0);

        if (elements.badge) {
            elements.badge.textContent =
                count > 99 ? "99+" : String(count);

            elements.badge.hidden = count === 0;
            elements.badge.style.display =
                count === 0 ? "none" : "inline-flex";
        }

        if (elements.countText) {
            elements.countText.textContent =
                count === 0
                    ? "Không có thông báo chưa đọc"
                    : `${count} thông báo chưa đọc`;
        }

        if (elements.markAllButton) {
            elements.markAllButton.disabled = count === 0;
        }
    }

    // =========================================================
    // MARK AS READ
    // =========================================================

    async function markAsRead(id) {
        try {
            await apiRequest(
                `${API_BASE}/${encodeURIComponent(id)}/da-doc`,
                {
                    method: "PATCH"
                }
            );

            notifications = notifications.map(function (item) {
                return String(getNotificationId(item)) === String(id)
                    ? {
                        ...item,
                        daDoc: true,
                        trangThai: "DA_DOC",
                        isRead: true
                    }
                    : item;
            });

            unreadCount = notifications.filter(isUnread).length;

            renderNotifications();
            renderUnreadCount();
        } catch (error) {
            console.error(
                "[TiepNhan Notification] Lỗi đánh dấu đã đọc:",
                error
            );
        }
    }

    async function markAllAsRead() {
        if (
            !elements.markAllButton ||
            elements.markAllButton.disabled
        ) {
            return;
        }

        try {
            elements.markAllButton.disabled = true;

            await apiRequest(`${API_BASE}/da-doc-tat-ca`, {
                method: "PATCH"
            });

            notifications = notifications.map(function (item) {
                return {
                    ...item,
                    daDoc: true,
                    trangThai: "DA_DOC",
                    isRead: true
                };
            });

            unreadCount = 0;

            renderNotifications();
            renderUnreadCount();
        } catch (error) {
            console.error(
                "[TiepNhan Notification] Lỗi đánh dấu tất cả đã đọc:",
                error
            );
        } finally {
            if (elements.markAllButton) {
                elements.markAllButton.disabled = unreadCount === 0;
            }
        }
    }

    // =========================================================
    // WEBSOCKET / STOMP
    // =========================================================

    function connectWebSocket() {
        if (isConnecting || (stompClient && stompClient.connected)) {
            return;
        }

        if (!window.StompJs || !window.StompJs.Client) {
            console.warn(
                "[TiepNhan Notification] STOMP chưa được tải. Kiểm tra script CDN."
            );
            scheduleReconnect();
            return;
        }

        const token = getJwtToken();

        if (!token) {
            console.warn(
                "[TiepNhan Notification] Không tìm thấy JWT trong localStorage/sessionStorage."
            );
            scheduleReconnect();
            return;
        }

        isConnecting = true;

        try {
            stompClient = new window.StompJs.Client({
                brokerURL: getWebSocketUrl(),

                // Gửi JWT trong STOMP CONNECT frame.
                connectHeaders: {
                    Authorization: `Bearer ${token}`
                },

                reconnectDelay: 5000,
                heartbeatIncoming: 10000,
                heartbeatOutgoing: 10000,

                debug: function (message) {
                    console.debug("[STOMP]", message);
                }
            });

            stompClient.onConnect = function () {
                isConnecting = false;

                console.log(
                    "[TiepNhan Notification] WebSocket connected."
                );

                stompClient.subscribe(
                    WS_DESTINATION,
                    function (message) {
                        handleRealtimeMessage(message);
                    }
                );
            };

            stompClient.onStompError = function (frame) {
                isConnecting = false;

                console.error(
                    "[TiepNhan Notification] STOMP error:",
                    frame.headers && frame.headers.message,
                    frame.body
                );
            };

            stompClient.onWebSocketClose = function () {
                isConnecting = false;

                console.warn(
                    "[TiepNhan Notification] WebSocket closed."
                );
            };

            stompClient.onWebSocketError = function (error) {
                isConnecting = false;

                console.error(
                    "[TiepNhan Notification] WebSocket error:",
                    error
                );
            };

            stompClient.activate();
        } catch (error) {
            isConnecting = false;

            console.error(
                "[TiepNhan Notification] Không thể khởi tạo WebSocket:",
                error
            );

            scheduleReconnect();
        }
    }

    function getWebSocketUrl() {
        const protocol =
            window.location.protocol === "https:" ? "wss:" : "ws:";

        return `${protocol}//${window.location.host}${WS_ENDPOINT}`;
    }

    function scheduleReconnect() {
        if (reconnectTimer) return;

        reconnectTimer = window.setTimeout(function () {
            reconnectTimer = null;
            connectWebSocket();
        }, 5000);
    }

    function handleRealtimeMessage(message) {
        try {
            const payload = JSON.parse(message.body);

            console.log(
                "[TiepNhan Notification] Nhận realtime:",
                payload
            );

            refreshNotifications();
        } catch (error) {
            console.error(
                "[TiepNhan Notification] Lỗi đọc realtime message:",
                error,
                message.body
            );
        }
    }

    // =========================================================
    // HELPERS
    // =========================================================

    function getNotificationId(notification) {
        return notification.maThongBao ??
            notification.id ??
            notification.notificationId ??
            notification.MaThongBao;
    }

    function isUnread(notification) {
        if (
            notification.daDoc === true ||
            notification.isRead === true
        ) {
            return false;
        }

        if (
            notification.daDoc === false ||
            notification.isRead === false
        ) {
            return true;
        }

        const status = String(
            notification.trangThai ||
            notification.status ||
            ""
        ).toUpperCase();

        if (
            status.includes("DA_DOC") ||
            status.includes("READ")
        ) {
            return false;
        }

        if (
            status.includes("CHUA_DOC") ||
            status.includes("UNREAD")
        ) {
            return true;
        }

        return notification.ngayDoc == null &&
            notification.readAt == null;
    }

    function formatDate(value) {
        if (!value) return "";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

})();