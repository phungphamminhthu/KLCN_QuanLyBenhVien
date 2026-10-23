
/* =====================================================
   WEBSOCKET THÔNG BÁO BÁC SĨ
===================================================== */

document.addEventListener("DOMContentLoaded", function () {

    // Lấy JWT từ phiên đăng nhập
    function layTokenWebSocket() {
        return localStorage.getItem("Token")
            || sessionStorage.getItem("Token");
    }

    const token = layTokenWebSocket();

    // Chưa đăng nhập hoặc chưa tải thư viện
    if (!token) {
        return;
    }

    if (typeof StompJs === "undefined") {
        console.error("Chưa tải được thư viện STOMP.");
        return;
    }

    // Tránh tạo kết nối trùng trên cùng trang
    if (window.bacSiWebSocketClient?.active) {
        return;
    }

    // Tự chọn ws hoặc wss theo giao thức trang web
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

        onConnect: function () {

            console.log("WebSocket bác sĩ đã kết nối.");

            client.subscribe(
                "/user/queue/thong-bao",
                function (message) {

                    try {
                        const data = JSON.parse(message.body);

                        console.log("Đã nhận sự kiện thông báo.");

                        // Cập nhật số thông báo chưa đọc
                        if (data.count !== undefined) {
                            capNhatSoThongBao(data.count);
                        }

                        // Hiển thị nội dung thông báo mới
                        if (data.title || data.message) {
                            hienThiThongBaoRealtime(
                                data.title || "Thông báo mới",
                                data.message || ""
                            );
                        }

                        // Làm mới số liệu trên trang chủ
                        if (
                            typeof loadDashboard === "function"
                        ) {
                            loadDashboard();
                        }

                    } catch (error) {
                        console.error(
                            "Lỗi xử lý thông báo WebSocket:",
                            error
                        );
                    }
                }
            );
        },

        onStompError: function (frame) {
            console.error(
                "Lỗi STOMP:",
                frame.headers.message
            );
        },

        onWebSocketError: function (error) {
            console.error("Lỗi kết nối WebSocket:", error);
        }
    });

    // Cập nhật token nếu client kết nối lại
    client.beforeConnect = function () {
        const tokenMoi = layTokenWebSocket();

        client.connectHeaders = {
            Authorization: `Bearer ${tokenMoi || ""}`
        };
    };

    window.bacSiWebSocketClient = client;

    client.activate();
});


/* =====================================================
   CẬP NHẬT HUY HIỆU SỐ THÔNG BÁO TRÊN CHUÔNG
===================================================== */

function capNhatSoThongBao(count) {

    const bell =
        document.getElementById("doctorNotificationButton")
        || document.querySelector("header .notification");

    if (!bell) {
        return;
    }

    let badge =
        document.getElementById("bacSiRealtimeCount");

    if (!badge) {
        badge = document.createElement("span");
        badge.id = "bacSiRealtimeCount";

        bell.style.position = "relative";

        badge.style.cssText = `
            position: absolute;
            top: -5px;
            right: -8px;
            min-width: 18px;
            height: 18px;
            padding: 0 4px;
            border-radius: 20px;
            background: #ef4444;
            color: white;
            font-size: 11px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        bell.appendChild(badge);
    }

    const soLuong = Number(count) || 0;

    badge.textContent =
        soLuong > 99 ? "99+" : String(soLuong);

    badge.style.display =
        soLuong > 0 ? "flex" : "none";
}


/* =====================================================
   HIỂN THỊ THÔNG BÁO REALTIME
===================================================== */

function hienThiThongBaoRealtime(tieuDe, noiDung) {

    const box = document.createElement("div");

    box.style.cssText = `
        position: fixed;
        top: 85px;
        right: 25px;
        width: 340px;
        max-width: calc(100vw - 40px);
        padding: 18px;
        background: white;
        border-left: 5px solid #2563eb;
        border-radius: 12px;
        box-shadow: 0 5px 25px rgba(0,0,0,0.15);
        z-index: 9999;
    `;

    const title = document.createElement("strong");
    title.textContent = "🔔 " + tieuDe;

    const message = document.createElement("p");
    message.textContent = noiDung;
    message.style.margin = "10px 0";

    const closeButton = document.createElement("button");
    closeButton.textContent = "×";
    closeButton.setAttribute("aria-label", "Đóng thông báo");

    closeButton.style.cssText = `
        position: absolute;
        top: 8px;
        right: 12px;
        border: none;
        background: transparent;
        cursor: pointer;
        font-size: 22px;
    `;

    closeButton.onclick = () => box.remove();

    box.append(closeButton, title, message);

    document.body.appendChild(box);

    setTimeout(() => box.remove(), 8000);
}
