
document.addEventListener("DOMContentLoaded", () => {

    const API = "/api/thong-bao";

    const list = document.getElementById("allNotificationsList");
    const count = document.getElementById("allNotificationCount");
    const reloadButton = document.getElementById("reloadAllNotifications");
    const markAllButton = document.getElementById("markAllNotificationsRead");

    const icons = {
        BENH_NHAN_MOI: "fa-user-plus",
        KET_QUA_DICH_VU_MOI: "fa-flask",
        LICH_KHAM_BI_HUY: "fa-calendar-xmark",
        LICH_KHAM_THAY_DOI: "fa-calendar-days"
    };

    function layToken() {
        return localStorage.getItem("Token")
            || localStorage.getItem("token")
            || sessionStorage.getItem("Token")
            || sessionStorage.getItem("token");
    }

    async function goiApi(url, method = "GET") {
        const response = await fetch(url, {
            method,
            headers: {
                Authorization: `Bearer ${layToken() || ""}`
            }
        });

        if (!response.ok) {
            throw new Error(`Lỗi API: ${response.status}`);
        }

        if (response.status === 204) {
            return null;
        }

        return response.json();
    }

    function duongDanTheoLoai(type) {
        switch (type) {
            case "BENH_NHAN_MOI":
                return "/auth/bac-si/kham-benh";

            case "KET_QUA_DICH_VU_MOI":
                return "/auth/bac-si/ket-qua-can-lam-sang";

            case "LICH_KHAM_BI_HUY":
            case "LICH_KHAM_THAY_DOI":
                return "/auth/bac-si/kham-benh";

            default:
                return null;
        }
    }

    function render(data) {
        list.replaceChildren();

        count.textContent = `${data.length} thông báo gần nhất`;

        if (!data.length) {
            const empty = document.createElement("div");
            empty.className = "notification-empty";
            empty.textContent = "Chưa có thông báo nào.";
            list.appendChild(empty);
            return;
        }

        data.forEach(tb => {
            const item = document.createElement("button");
            item.type = "button";
            item.className =
                "notification-item" + (tb.unread ? " unread" : "");

            const iconBox = document.createElement("span");
            iconBox.className = "notification-item-icon";

            const icon = document.createElement("i");
            icon.className =
                `fa-solid ${icons[tb.type] || "fa-bell"}`;
            iconBox.appendChild(icon);

            const body = document.createElement("div");
            body.className = "notification-item-content";

            const title = document.createElement("div");
            title.className = "notification-item-title";
            title.textContent = tb.title || "Thông báo";

            const message = document.createElement("p");
            message.className = "notification-item-message";
            message.textContent = tb.message || "";

            const time = document.createElement("small");
            time.className = "notification-item-time";

            if (tb.createdAt) {
                const date = new Date(tb.createdAt);

                time.textContent = Number.isNaN(date.getTime())
                    ? tb.createdAt
                    : date.toLocaleString("vi-VN");
            }

            body.append(title, message, time);
            item.append(iconBox, body);

            if (tb.unread) {
                const dot = document.createElement("span");
                dot.className = "notification-unread-dot";
                item.appendChild(dot);
            }

            item.addEventListener("click", async () => {
                if (item.disabled) return;
                item.disabled = true;

                try {
                    if (tb.unread && tb.id) {
                        await goiApi(
                            `${API}/${tb.id}/da-doc`,
                            "PATCH"
                        );
                    }

                    const url = duongDanTheoLoai(tb.type);

                    if (url) {
                        window.location.href = url;
                    } else {
                        await taiThongBao();
                    }

                } catch (error) {
                    console.error(error);
                    alert("Không thể xử lý thông báo.");
                } finally {
                    item.disabled = false;
                }
            });

            list.appendChild(item);
        });
    }

    async function taiThongBao() {
        try {
            count.textContent = "Đang tải...";

            // API hiện tại giới hạn tối đa 100 bản ghi.
            const data = await goiApi(`${API}?limit=100`);

            render(Array.isArray(data) ? data : []);

        } catch (error) {
            console.error(error);
            count.textContent = "Không thể tải thông báo";
        }
    }

    reloadButton.addEventListener("click", taiThongBao);

    markAllButton.addEventListener("click", async () => {
        markAllButton.disabled = true;

        try {
            await goiApi(
                `${API}/da-doc-tat-ca`,
                "PATCH"
            );

            await taiThongBao();

        } catch (error) {
            console.error(error);
            alert("Không thể đánh dấu đã đọc.");
        } finally {
            markAllButton.disabled = false;
        }
    });

    taiThongBao();
});
