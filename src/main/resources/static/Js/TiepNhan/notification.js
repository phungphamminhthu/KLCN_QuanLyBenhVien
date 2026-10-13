/* =========================================
   THÔNG BÁO - TIẾP NHẬN
   File: static/Js/TiepNhan/notification.js
========================================= */

(function () {
    "use strict";

    let danhSachThongBao = [];
    let daKhoiTao = false;

    const $ = (id) => document.getElementById(id);

    function layPhanTu() {
        return {
            wrapper: $("notification-wrapper"),
            button: $("notification-button"),
            badge: $("notificationBadge"),
            panel: $("notification-panel"),
            closeButton: $("notification-close")
        };
    }

    function demChuaDoc() {
        return danhSachThongBao.filter(item => !item.daDoc).length;
    }

    function capNhatBadge() {
        const { badge, button } = layPhanTu();
        if (!badge) return;

        const soLuong = demChuaDoc();

        badge.textContent = soLuong > 99 ? "99+" : String(soLuong);
        badge.hidden = soLuong === 0;

        if (button) {
            button.setAttribute(
                "aria-label",
                soLuong > 0
                    ? `Thông báo, ${soLuong} thông báo chưa đọc`
                    : "Thông báo"
            );
        }
    }

    function dinhDangThoiGian(value) {
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

    function taoNut(className, text, title) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = className;
        button.textContent = text;

        if (title) button.title = title;

        return button;
    }

    function taoVungNoiDung(panel) {
        let body = panel.querySelector(".notification-panel-body");

        if (!body) {
            body = document.createElement("div");
            body.className = "notification-panel-body";
            panel.appendChild(body);
        }

        return body;
    }

    function taoDanhSach(panel) {
        const body = taoVungNoiDung(panel);
        body.replaceChildren();

        if (danhSachThongBao.length === 0) {
            const empty = document.createElement("div");
            empty.className = "notification-empty";

            const icon = document.createElement("i");
            icon.className = "fa-regular fa-bell-slash";
            icon.setAttribute("aria-hidden", "true");

            const message = document.createElement("p");
            message.textContent = "Bạn chưa có thông báo nào.";

            empty.append(icon, message);
            body.appendChild(empty);
            return;
        }

        const list = document.createElement("ul");
        list.className = "notification-list";

        danhSachThongBao.forEach(item => {
            const li = document.createElement("li");
            li.className = "notification-item";

            if (!item.daDoc) {
                li.classList.add("is-unread");
            }

            li.tabIndex = 0;
            li.setAttribute("role", "button");
            li.setAttribute(
                "aria-label",
                `${item.tieuDe || "Thông báo"}${item.daDoc ? "" : ", chưa đọc"}`
            );

            const icon = document.createElement("span");
            icon.className = "notification-item-icon";

            const iconElement = document.createElement("i");
            iconElement.className = item.icon || "fa-regular fa-bell";
            iconElement.setAttribute("aria-hidden", "true");
            icon.appendChild(iconElement);

            const content = document.createElement("div");
            content.className = "notification-item-content";

            const title = document.createElement("p");
            title.className = "notification-item-title";
            title.textContent = item.tieuDe || "Thông báo";

            const message = document.createElement("p");
            message.className = "notification-item-message";
            message.textContent = item.noiDung || "";

            content.append(title, message);

            if (item.thoiGian) {
                const time = document.createElement("time");
                time.className = "notification-item-time";
                time.textContent = dinhDangThoiGian(item.thoiGian);

                content.appendChild(time);
            }

            li.append(icon, content);

            function danhDauDaDoc() {
                if (item.daDoc) return;

                item.daDoc = true;
                taoDanhSach(panel);
                capNhatBadge();

                document.dispatchEvent(new CustomEvent(
                    "tiepNhanNotificationRead",
                    { detail: { id: item.id } }
                ));
            }

            li.addEventListener("click", danhDauDaDoc);

            li.addEventListener("keydown", event => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    danhDauDaDoc();
                }
            });

            list.appendChild(li);
        });

        body.appendChild(list);
    }

    function taoFooter(panel) {
        let footer = panel.querySelector(".notification-panel-footer");

        if (!footer) {
            footer = document.createElement("div");
            footer.className = "notification-panel-footer";
            panel.appendChild(footer);
        }

        footer.replaceChildren();

        const markAllButton = taoNut(
            "notification-mark-all",
            "Đánh dấu tất cả đã đọc"
        );

        markAllButton.disabled = demChuaDoc() === 0;

        markAllButton.addEventListener("click", () => {
            const coThongBaoChuaDoc = demChuaDoc() > 0;

            danhSachThongBao.forEach(item => {
                item.daDoc = true;
            });

            capNhatBadge();
            taoDanhSach(panel);
            taoFooter(panel);

            if (coThongBaoChuaDoc) {
                document.dispatchEvent(
                    new CustomEvent("tiepNhanNotificationsReadAll")
                );
            }
        });

        footer.appendChild(markAllButton);
    }

    function renderThongBao() {
        const { panel } = layPhanTu();
        if (!panel) return;

        taoDanhSach(panel);
        taoFooter(panel);
        capNhatBadge();
    }

    function moThongBao() {
        const { panel, button } = layPhanTu();
        if (!panel) return;

        panel.hidden = false;

        if (button) {
            button.setAttribute("aria-expanded", "true");
        }
    }

    function dongThongBao() {
        const { panel, button } = layPhanTu();
        if (!panel) return;

        panel.hidden = true;

        if (button) {
            button.setAttribute("aria-expanded", "false");
        }
    }

    function ganSuKien() {
        if (daKhoiTao) return;

        const { wrapper, button, panel, closeButton } = layPhanTu();

        if (!button || !panel) {
            console.warn(
                "[TiepNhan notification] Không tìm thấy notification-button hoặc notification-panel."
            );
            return;
        }

        daKhoiTao = true;

        // Khởi tạo trạng thái đóng nếu chưa được khai báo.
        if (!panel.hasAttribute("hidden")) {
            panel.hidden = true;
        }

        button.setAttribute("aria-controls", "notification-panel");
        button.setAttribute("aria-expanded", "false");

        button.addEventListener("click", event => {
            event.stopPropagation();

            if (panel.hidden) {
                moThongBao();
            } else {
                dongThongBao();
            }
        });

        if (closeButton) {
            closeButton.addEventListener("click", event => {
                event.stopPropagation();
                dongThongBao();
            });
        }

        document.addEventListener("click", event => {
            if (
                !panel.hidden &&
                wrapper &&
                !wrapper.contains(event.target)
            ) {
                dongThongBao();
            }
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape" && !panel.hidden) {
                dongThongBao();
                button.focus();
            }
        });

        renderThongBao();

        console.log("[TiepNhan notification] Đã khởi tạo.");
    }

    /**
     * Nhận danh sách thông báo từ API hoặc module khác.
     *
     * Ví dụ:
     * window.capNhatThongBaoTiepNhan([
     *   {
     *     id: 1,
     *     tieuDe: "Lịch khám mới",
     *     noiDung: "Có lịch khám cần tiếp nhận.",
     *     thoiGian: new Date().toISOString(),
     *     daDoc: false
     *   }
     * ]);
     *
     * Chưa tự gọi API vì chưa xác định endpoint thông báo
     * thực tế của dự án.
     */
    function capNhatThongBaoTiepNhan(danhSach) {
        if (!Array.isArray(danhSach)) {
            console.error(
                "[TiepNhan notification] Dữ liệu phải là một mảng."
            );
            return;
        }

        danhSachThongBao = danhSach.map(item => ({
            id: item.id ?? item.maThongBao ?? null,
            tieuDe: item.tieuDe ?? item.title ?? "Thông báo",
            noiDung: item.noiDung ?? item.message ?? "",
            thoiGian: item.thoiGian ?? item.createdAt ?? null,
            icon: item.icon || "fa-regular fa-bell",
            daDoc: Boolean(item.daDoc ?? item.isRead ?? false)
        }));

        renderThongBao();
    }

    function khoiTao() {
        ganSuKien();
    }

    window.capNhatThongBaoTiepNhan = capNhatThongBaoTiepNhan;
    window.moThongBaoTiepNhan = moThongBao;
    window.dongThongBaoTiepNhan = dongThongBao;
    window.khoiTaoThongBaoTiepNhan = khoiTao;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", khoiTao);
    } else {
        khoiTao();
    }
})();