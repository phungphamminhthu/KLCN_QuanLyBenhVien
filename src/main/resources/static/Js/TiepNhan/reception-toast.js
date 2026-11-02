
(() => {
    "use strict";

    if (window.MedCareReceptionToast) return;

    const DURATION = 5000;

    const style = document.createElement("style");
    style.id = "medcare-reception-toast-style";

    style.textContent = `
        #medcare-reception-toast {
            position: fixed;
            z-index: 20000;
            left: 50%;
            top: 18px;
            transform: translate(-50%, -35px);
            opacity: 0;
            pointer-events: none;

            max-width: min(92vw, 760px);
            width: max-content;
            padding: 14px 20px;

            border: 1px solid #fecaca;
            border-radius: 12px;
            background: #fef2f2;
            color: #991b1b;

            font-size: 14px;
            font-weight: 600;
            line-height: 1.5;

            box-shadow:
                0 14px 35px rgba(15, 23, 42, .18);

            transition:
                transform .3s ease,
                opacity .3s ease;
        }

        #medcare-reception-toast[hidden] {
            display: none !important;
        }

        #medcare-reception-toast.visible {
            opacity: 1;
            transform: translate(-50%, 0);
        }

        #medcare-reception-toast.success {
            border-color: #86efac;
            background: #f0fdf4;
            color: #166534;
        }

        #medcare-reception-toast.warning {
            border-color: #fde68a;
            background: #fffbeb;
            color: #92400e;
        }

        @media (prefers-reduced-motion: reduce) {
            #medcare-reception-toast {
                transition: none;
            }
        }
    `;

    document.head.append(style);

    const toast = document.createElement("div");

    toast.id = "medcare-reception-toast";
    toast.hidden = true;

    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");

    document.body.append(toast);

    let closeTimer = null;
    let fadeTimer = null;

    // =====================================================
    // 1. ẨN THÔNG BÁO
    // =====================================================

    function hide() {
        clearTimeout(closeTimer);
        clearTimeout(fadeTimer);

        toast.classList.remove("visible");

        fadeTimer = setTimeout(() => {
            if (!toast.classList.contains("visible")) {
                toast.hidden = true;
                toast.textContent = "";
            }
        }, 320);
    }

    // =====================================================
    // 2. HIỂN THỊ TOAST TRONG 5 GIÂY
    // =====================================================

    function show(message, type = "error") {
        const text = String(message || "").trim();

        if (!text) return;

        clearTimeout(closeTimer);
        clearTimeout(fadeTimer);

        toast.className =
            type === "success"
                ? "success"
                : type === "warning"
                    ? "warning"
                    : "";

        toast.textContent = text;
        toast.hidden = false;

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                toast.classList.add("visible");
            });
        });

        closeTimer = setTimeout(
            hide,
            DURATION
        );
    }

    // =====================================================
    // 3. NHẬN DIỆN THANH THÔNG BÁO CŨ
    // =====================================================

    const selectors = [
        "#page-message",
        "#dashboard-message",
        ".page-content > .alert",
        "main > .alert",
        ".main-content > .alert"
    ].join(",");

    let scheduled = false;

    let registrationToastWasVisible = false;
    let registrationToastTimer = null;

    // =====================================================
    // 4. GIỚI HẠN TOAST ĐĂNG KÝ KHÁM VỀ 5 GIÂY
    // =====================================================

    function limitRegistrationToast() {
        const existing = document.getElementById(
            "registration-error-toast"
        );

        const visible =
            !!existing
            && !existing.hidden
            && existing.classList.contains("is-visible");

        if (visible && !registrationToastWasVisible) {
            clearTimeout(registrationToastTimer);

            registrationToastTimer = setTimeout(() => {
                existing.classList.remove("is-visible");
                existing.hidden = true;
            }, DURATION);
        }

        if (!visible) {
            clearTimeout(registrationToastTimer);
        }

        registrationToastWasVisible = visible;
    }

    // =====================================================
    // 5. CHUYỂN THÔNG BÁO CŨ THÀNH TOAST
    // =====================================================

    function scan() {
        scheduled = false;

        limitRegistrationToast();

        document.querySelectorAll(selectors).forEach(
            node => {
                // Không làm thay đổi thông báo
                // riêng bên trong popup.
                if (node.closest(".modal")) return;

                if (node.hidden) return;

                const text = String(
                    node.textContent || ""
                ).trim();

                if (!text) return;

                const type =
                    node.classList.contains("alert-success")
                        ? "success"
                        : node.classList.contains("alert-warning")
                            ? "warning"
                            : "error";

                // Ẩn thanh thông báo cũ.
                node.hidden = true;

                // Hiển thị nội dung giống hệt
                // dưới dạng toast.
                show(text, type);
            }
        );
    }

    // =====================================================
    // 6. THEO DÕI THÔNG BÁO MỚI
    // =====================================================

    const observer = new MutationObserver(() => {
        if (!scheduled) {
            scheduled = true;

            requestAnimationFrame(scan);
        }
    });

    observer.observe(document.body, {
        subtree: true,
        attributes: true,
        attributeFilter: ["hidden", "class"],
        childList: true,
        characterData: true
    });

    scan();

    // Cho các chức năng khác gọi trực tiếp.
    window.MedCareReceptionToast = Object.freeze({
        show,
        hide
    });
})();
