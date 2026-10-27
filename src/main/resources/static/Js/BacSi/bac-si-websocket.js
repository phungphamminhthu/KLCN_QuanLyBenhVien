
/* =====================================================
   THONG BAO BAC SI - MYSQL + WEBSOCKET
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    const API = "/api/thong-bao";

    const bell = document.getElementById("notification-button");
    const panel = document.getElementById("notificationPanel");
    const badge = document.getElementById("notificationBadge");
    const countText = document.getElementById("notificationCountText");
    const list = document.getElementById("notificationList");
    const markAll = document.getElementById("markAllReadButton");

    if (!bell || !panel || !badge || !list) {
        console.error("Thiếu thành phần giao diện thông báo.");
        return;
    }

    let notifications = [];
    let unreadCount = 0;
    let requestVersion = 0;

    const types = {
        BENH_NHAN_MOI: {
            icon: "fa-user-plus",
            color: "#2563eb",
            bg: "#dbeafe"
        },
        KET_QUA_DICH_VU_MOI: {
            icon: "fa-flask",
            color: "#16a34a",
            bg: "#dcfce7"
        },
        LICH_KHAM_BI_HUY: {
            icon: "fa-calendar-xmark",
            color: "#dc2626",
            bg: "#fee2e2"
        },
        LICH_KHAM_THAY_DOI: {
            icon: "fa-calendar-days",
            color: "#d97706",
            bg: "#fef3c7"
        }
    };

    /* =====================================
       TOKEN
    ===================================== */

    function layToken() {
        return localStorage.getItem("Token")
            || localStorage.getItem("token")
            || sessionStorage.getItem("Token")
            || sessionStorage.getItem("token");
    }

    /* =====================================
       API CO JWT
    ===================================== */

    async function goiApi(url, options = {}) {
        const token = layToken();

        if (!token) {
            throw new Error("Không tìm thấy token đăng nhập.");
        }

        const response = await fetch(url, {
            ...options,
            headers: {
                "Authorization": `Bearer ${token}`,
                ...(options.headers || {})
            }
        });

        if (!response.ok) {
            throw new Error(
                `API ${response.status}: ${url}`
            );
        }

        if (response.status === 204) {
            return null;
        }

        return response.json();
    }

    /* =====================================
       MO / DONG DROPDOWN
    ===================================== */

    function dongThongBao() {
        panel.hidden = true;
        bell.setAttribute("aria-expanded", "false");
    }

    bell.addEventListener("click", (event) => {
        event.stopPropagation();

        panel.hidden = !panel.hidden;

        bell.setAttribute(
            "aria-expanded",
            String(!panel.hidden)
        );
    });

    document.addEventListener("click", (event) => {
        if (!event.target.closest(".notification-wrapper")) {
            dongThongBao();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            dongThongBao();
        }
    });

    /* =====================================
       CAP NHAT BADGE
    ===================================== */

    function capNhatBadge(count) {
        unreadCount = Math.max(0, Number(count) || 0);

        badge.textContent =
            unreadCount > 99 ? "99+" : String(unreadCount);

        badge.hidden = unreadCount === 0;

        if (countText) {
            countText.textContent =
                `${unreadCount} thông báo mới`;
        }
    }

    /* =====================================
       DINH DANG THOI GIAN
    ===================================== */

    function dinhDangThoiGian(value) {
        if (!value) {
            return "";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
    }

    /* =====================================
       HIEN THI DANH SACH
    ===================================== */

    function hienThiDanhSach() {
        list.replaceChildren();

        if (!notifications.length) {
            const empty = document.createElement("div");
            empty.className = "notification-empty";
            empty.textContent = "Chưa có thông báo nào.";

            list.appendChild(empty);
            return;
        }

        notifications.forEach((tb) => {
            const config = types[tb.type] || {
                icon: "fa-bell",
                color: "#2563eb",
                bg: "#dbeafe"
            };

            const item = document.createElement("button");
            item.type = "button";

            item.className =
                "notification-item" +
                (tb.unread ? " unread" : "");

            item.style.width = "100%";
            item.style.border = "none";
            item.style.textAlign = "left";

            const iconBox = document.createElement("span");
            iconBox.className = "notification-item-icon";
            iconBox.style.background = config.bg;
            iconBox.style.color = config.color;

            const icon = document.createElement("i");
            icon.className = `fa-solid ${config.icon}`;

            iconBox.appendChild(icon);

            const content = document.createElement("div");
            content.className = "notification-item-content";

            const title = document.createElement("div");
            title.className = "notification-item-title";
            title.textContent = tb.title || "Thông báo";

            const message = document.createElement("p");
            message.className = "notification-item-message";
            message.textContent = tb.message || "";

            const time = document.createElement("small");
            time.className = "notification-item-time";
            time.textContent = dinhDangThoiGian(tb.createdAt);

            content.append(title, message, time);
            item.append(iconBox, content);

            if (tb.unread) {
                const dot = document.createElement("span");
                dot.className = "notification-unread-dot";
                item.appendChild(dot);
            }

            // Bấm vào thông báo để đánh dấu đã đọc

        item.addEventListener("click", async () => {

            // Đánh dấu đã đọc nếu thông báo chưa đọc
            if (tb.unread && tb.id) {
                try {
                    await goiApi(
                        `${API}/${tb.id}/da-doc`,
                        { method: "PATCH" }
                    );
                } catch (error) {
                    console.error("Lỗi đánh dấu đã đọc:", error);
                }
            }

            // Chuyển trang theo loại thông báo
            let url = "";

            switch (tb.type) {

                case "BENH_NHAN_MOI":
                    url = "/auth/bac-si/kham-benh";
                    break;

                case "KET_QUA_DICH_VU_MOI":
                    url = "/auth/bac-si/ket-qua-can-lam-sang";
                    break;

                case "LICH_KHAM_BI_HUY":
                case "LICH_KHAM_THAY_DOI":
                    url = "/auth/bac-si/kham-benh";
                    break;

                default:
                    await taiThongBao();
                    return;
            }

            window.location.href = url;
        });


                    list.appendChild(item);
                });
            }

    /* =====================================
       TAI DANH SACH TU MYSQL
    ===================================== */

    async function taiThongBao() {
        const currentVersion = ++requestVersion;

        try {
            const [data, countData] = await Promise.all([
                goiApi(`${API}?limit=20`),
                goiApi(`${API}/chua-doc`)
            ]);

            // Bỏ kết quả cũ nếu có yêu cầu mới hơn
            if (currentVersion !== requestVersion) {
                return;
            }

            notifications = Array.isArray(data) ? data : [];

            capNhatBadge(countData.count);
            hienThiDanhSach();

        } catch (error) {
            console.error("Lỗi tải thông báo:", error);
        }
    }

    /* =====================================
       DANH DAU TAT CA DA DOC
    ===================================== */

    if (markAll) {
        markAll.addEventListener("click", async () => {
            markAll.disabled = true;

            try {
                await goiApi(
                    `${API}/da-doc-tat-ca`,
                    { method: "PATCH" }
                );

                await taiThongBao();

            } catch (error) {
                console.error(
                    "Không thể đánh dấu tất cả đã đọc:",
                    error
                );
            } finally {
                markAll.disabled = false;
            }
        });
    }

    /* =====================================
       WEBSOCKET
    ===================================== */

    function ketNoiWebSocket() {
        const token = layToken();

        if (!token) {
            console.warn("Không có JWT để kết nối WebSocket.");
            return;
        }

        if (typeof StompJs === "undefined") {
            console.error("Chưa tải thư viện STOMP.");
            return;
        }

        if (window.bacSiWebSocketClient?.active) {
            return;
        }

        const protocol =
            location.protocol === "https:" ? "wss:" : "ws:";

        const wsUrl =
            `${protocol}//${location.host}/ws`;

        const client = new StompJs.Client({
            brokerURL: wsUrl,
            reconnectDelay: 5000,

            connectHeaders: {
                Authorization: `Bearer ${token}`
            },

            onConnect: () => {
                console.log("WebSocket bác sĩ đã kết nối.");

                client.subscribe(
                    "/user/queue/thong-bao",
                    async (message) => {
                        try {
                            const data = JSON.parse(message.body);

                            console.log(
                                "Thông báo WebSocket:",
                                data
                            );

                            // Backend đã lưu DB:
                            // tải lại để lấy ID, nội dung,
                            // trạng thái đọc và số chưa đọc.
                            await taiThongBao();

                            if (
                                typeof loadDashboard === "function"
                            ) {
                                loadDashboard();
                            }

                        } catch (error) {
                            console.error(
                                "Lỗi nhận thông báo:",
                                error
                            );
                        }
                    }
                );

                taiThongBao();
            },

            onStompError: (frame) => {
                console.error(
                    "STOMP error:",
                    frame.headers.message
                );
            },

            onWebSocketError: (error) => {
                console.error("WebSocket error:", error);
            }
        });

        client.beforeConnect = () => {
            client.connectHeaders = {
                Authorization: `Bearer ${layToken() || ""}`
            };
        };

        window.bacSiWebSocketClient = client;
        client.activate();
    }

    // Tải từ MySQL ngay khi vào trang
    taiThongBao();

    // Bật WebSocket realtime
    ketNoiWebSocket();

});
