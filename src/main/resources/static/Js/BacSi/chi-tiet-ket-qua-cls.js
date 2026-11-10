/* =========================================
   CHI TIẾT KẾT QUẢ CẬN LÂM SÀNG
   BÁC SĨ - CHỈ XEM KẾT QUẢ
========================================= */

(() => {
    "use strict";

    const el = id => document.getElementById(id);

    const API_BASE = "/api/bac-si/kham-benh";

    // Quản lý ảnh kết quả tải từ Cloudflare R2.
    const imageState = {
        controller: null,
        blobUrls: new Set(),
        lightbox: null
    };

    // Lấy mã lịch khám và mã chỉ định từ URL
    const match = location.pathname.match(
        /\/auth\/bac-si\/kham-benh\/(\d+)\/can-lam-sang\/(\d+)\/ket-qua\/?$/
    );

    const maLichKham = match
        ? Number(match[1])
        : null;

    const maChiDinh = match
        ? Number(match[2])
        : null;

    const pageCLS = () =>
        `/auth/bac-si/kham-benh/${maLichKham}/can-lam-sang`;

    const pageExam = () =>
        `/auth/bac-si/kham-benh/${maLichKham}`;

    /* LẤY GIÁ TRỊ */

    function pick(obj, ...keys) {
        for (const key of keys) {
            const value = obj?.[key];

            if (value !== undefined && value !== null) {
                return value;
            }
        }

        return null;
    }

    function show(value) {
        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return "---";
        }

        return String(value);
    }

    function set(id, value) {
        const element = el(id);

        if (element) {
            element.textContent = show(value);
        }
    }

    /* ĐỊNH DẠNG NGÀY */

    function dateText(value) {
        if (!value) return "---";

        const str = String(value);

        const match = str.match(
            /^(\d{4})-(\d{2})-(\d{2})/
        );

        if (!match) return str;

        const time = str.match(
            /[T ](\d{2}):(\d{2})/
        );

        const date =
            `${match[3]}/${match[2]}/${match[1]}`;

        return time
            ? `${date} ${time[1]}:${time[2]}`
            : date;
    }

    /* TOKEN */

    function getToken() {
        return localStorage.getItem("Token")
            || localStorage.getItem("token")
            || sessionStorage.getItem("Token")
            || sessionStorage.getItem("token");
    }

    /* API */

    async function api(url) {
        const headers = {};

        const token = getToken();

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            headers,
            cache: "no-store"
        });

        const body = await response.text();

        let data = null;

        if (body) {
            try {
                data = JSON.parse(body);
            } catch {
                data = body;
            }
        }

        if (!response.ok) {
            throw new Error(
                data?.message
                || data?.thongBao
                || `Lỗi HTTP ${response.status}`
            );
        }

        return data;
    }

    /* THÔNG BÁO LỖI */

    function showError(message) {
        const alert = el("clsAlert");

        if (!alert) return;

        alert.textContent = message;
        alert.hidden = false;
    }

    /* TRẠNG THÁI */

    function updateStatus(status, hasResult) {
        const badge = el("clsStatus");

        if (!badge) return;

        const names = {
            ChoThucHien: "Chờ thực hiện",
            DangThucHien: "Đang thực hiện",
            DaHoanThanh: "Đã hoàn thành"
        };

        badge.textContent = hasResult
            ? "Đã có kết quả"
            : names[status] || status || "Chưa có kết quả";

        badge.className =
            "cls-pill " +
            (
                hasResult
                    ? "cls-success"
                    : status === "DangThucHien"
                        ? "cls-progress"
                        : "cls-pending"
            );
    }

    /* THÔNG TIN BỆNH NHÂN */

    function fillPatient(data) {
        set(
            "clsPatientName",
            pick(data, "hoTen", "HoTen")
        );

        const id = pick(
            data,
            "maBenhNhan",
            "MaBenhNhan"
        );

        set(
            "clsPatientCode",
            id == null
                ? "---"
                : `BN${String(id).padStart(6, "0")}`
        );

        set(
            "clsPatientBirth",
            dateText(
                pick(data, "ngaySinh", "NgaySinh")
            )
        );

        set(
            "clsPatientGender",
            pick(data, "gioiTinh", "GioiTinh")
        );
    }

    /* THÔNG TIN CHỈ ĐỊNH */

    function fillOrder(order, services) {
        const serviceId = pick(
            order,
            "maDichVu",
            "MaDichVu"
        );

        const service = services.find(item =>
            String(
                pick(item, "maDichVu", "MaDichVu")
            ) === String(serviceId)
        );

        const serviceName =
            pick(order, "tenDichVu", "TenDichVu")
            || pick(service, "tenDichVu", "TenDichVu")
            || `Dịch vụ ${serviceId ?? ""}`;

        set("clsService", serviceName);

        set(
            "clsOrderCode",
            pick(order, "maChiDinh", "MaChiDinh")
        );

        set(
            "clsOrderType",
            pick(order, "loaiChiDinh", "LoaiChiDinh")
            || pick(service, "loaiDichVu", "LoaiDichVu")
        );

        const room = pick(
            order,
            "maPhong",
            "MaPhong"
        );

        set(
            "clsRoom",
            room == null ? "---" : `Phòng ${room}`
        );

        set(
            "clsOrderDate",
            dateText(
                pick(order, "ngayChiDinh", "NgayChiDinh")
            )
        );

        return pick(
            order,
            "trangThai",
            "TrangThai"
        );
    }

    /* KIỂM TRA URL FILE */

    function safeLink(value) {
        if (!value || typeof value !== "string") {
            return null;
        }

        try {
            const url = new URL(
                value,
                location.origin
            );

            if (
                url.protocol !== "http:" &&
                url.protocol !== "https:"
            ) {
                return null;
            }

            return url.href;

        } catch {
            return null;
        }
    }

    /* =========================================================
       ẢNH KẾT QUẢ CẬN LÂM SÀNG - CLOUDFLARE R2
    ========================================================= */

    function revokeImageUrls() {
        imageState.blobUrls.forEach(url => {
            URL.revokeObjectURL(url);
        });

        imageState.blobUrls.clear();
    }

    function clearResultImages() {
        if (imageState.controller) {
            imageState.controller.abort();
            imageState.controller = null;
        }

        revokeImageUrls();

        const list = el("clsImagesList");
        const panel = el("clsImagesPanel");

        if (list) {
            list.replaceChildren();
        }

        if (panel) {
            panel.hidden = true;
        }
    }

    function getImageHeaders() {
        const token = getToken();

        return token
            ? {
                Authorization: `Bearer ${token}`,
                Accept: "image/*"
            }
            : {
                Accept: "image/*"
            };
    }

    /* LIGHTBOX XEM ẢNH PHÓNG TO */

    function ensureImageLightbox() {
        if (imageState.lightbox) {
            return imageState.lightbox;
        }

        const overlay = document.createElement("div");

        overlay.className = "cls-image-lightbox";

        overlay.innerHTML = `
            <button
                type="button"
                class="cls-image-lightbox-close"
                aria-label="Đóng">
                &times;
            </button>

            <img alt="Ảnh kết quả cận lâm sàng phóng to">
        `;

        overlay.style.cssText = [
            "position:fixed",
            "inset:0",
            "z-index:99999",
            "display:none",
            "align-items:center",
            "justify-content:center",
            "padding:24px",
            "background:rgba(15,23,42,.92)"
        ].join(";");

        const image = overlay.querySelector("img");

        image.style.cssText =
            "max-width:95vw;" +
            "max-height:90vh;" +
            "object-fit:contain;" +
            "border-radius:8px;" +
            "box-shadow:0 10px 40px rgba(0,0,0,.35)";

        const close = () => {
            overlay.style.display = "none";
            image.removeAttribute("src");
        };

        const closeButton = overlay.querySelector("button");

        closeButton.style.cssText = [
            "position:absolute",
            "top:18px",
            "right:24px",
            "width:42px",
            "height:42px",
            "border:0",
            "border-radius:50%",
            "font-size:30px",
            "line-height:1",
            "cursor:pointer",
            "color:#fff",
            "background:rgba(255,255,255,.18)"
        ].join(";");

        closeButton.addEventListener("click", close);

        overlay.addEventListener("click", event => {
            if (event.target === overlay) {
                close();
            }
        });

        document.body.appendChild(overlay);

        imageState.lightbox = overlay;

        return overlay;
    }

    function openImageLightbox(src, alt) {
        const overlay = ensureImageLightbox();

        const image = overlay.querySelector("img");

        image.src = src;

        image.alt =
            alt || "Ảnh kết quả cận lâm sàng";

        overlay.style.display = "flex";
    }

    /* TẢI VÀ HIỂN THỊ NHIỀU ẢNH */

    async function renderResultImages(images) {
        clearResultImages();

        const panel = el("clsImagesPanel");
        const list = el("clsImagesList");

        if (!panel || !list) return;

        const validImages = Array.isArray(images)
            ? images.filter(item =>
                item && item.maAnh != null
            )
            : [];

        if (validImages.length === 0) {
            return;
        }

        panel.hidden = false;

        imageState.controller = new AbortController();

        const controller = imageState.controller;

        const tasks = validImages.map(async (item, index) => {
            const card = document.createElement("div");

            card.className = "cls-image-card";

            const button = document.createElement("button");

            button.type = "button";
            button.className = "cls-image-preview-button";
            button.disabled = true;
            button.textContent = "Đang tải ảnh...";

            button.setAttribute(
                "aria-label",
                "Đang tải ảnh kết quả " + (index + 1)
            );

            const caption = document.createElement("div");

            caption.className = "cls-image-caption";

            caption.textContent =
                item.tenFile || `Ảnh kết quả ${index + 1}`;

            card.append(button, caption);

            list.appendChild(card);

            const imageUrl =
                `${API_BASE}/${encodeURIComponent(maLichKham)}` +
                `/chi-dinh/${encodeURIComponent(maChiDinh)}` +
                `/ket-qua/anh/${encodeURIComponent(item.maAnh)}`;

            try {
                const response = await fetch(imageUrl, {
                    method: "GET",
                    cache: "no-store",
                    headers: getImageHeaders(),
                    signal: controller.signal
                });

                if (!response.ok) {
                    throw new Error(
                        response.status === 403
                            ? "Bạn không có quyền xem ảnh này."
                            : response.status === 404
                                ? "Không tìm thấy ảnh trên máy chủ."
                                : `Không tải được ảnh (HTTP ${response.status}).`
                    );
                }

                const blob = await response.blob();

                if (controller.signal.aborted) {
                    return;
                }

                if (!blob.type.startsWith("image/")) {
                    throw new Error(
                        "Máy chủ không trả về dữ liệu hình ảnh."
                    );
                }

                const blobUrl = URL.createObjectURL(blob);

                imageState.blobUrls.add(blobUrl);

                const image = document.createElement("img");

                image.src = blobUrl;

                image.alt =
                    item.tenFile || `Ảnh kết quả ${index + 1}`;

                image.loading = "lazy";

                image.style.cssText =
                    "display:block;" +
                    "width:100%;" +
                    "height:220px;" +
                    "object-fit:contain;" +
                    "background:#f8fafc;" +
                    "border-radius:10px";

                button.replaceChildren(image);

                button.disabled = false;

                button.addEventListener("click", () => {
                    openImageLightbox(blobUrl, image.alt);
                });

            } catch (error) {
                if (error.name === "AbortError") {
                    return;
                }

                console.error(
                    "Lỗi tải ảnh CLS:",
                    item.maAnh,
                    error
                );

                button.disabled = true;

                button.textContent =
                    error.message || "Không thể tải ảnh.";

                button.classList.add("cls-image-error");
            }
        });

        await Promise.allSettled(tasks);
    }

    /* HIỂN THỊ KẾT QUẢ */

    function fillResult(data) {
        set(
            "clsResultDate",
            dateText(
                pick(data, "ngayCoKetQua", "NgayCoKetQua")
            )
        );

        set(
            "clsResultText",
            pick(
                data,
                "noiDungKetQua",
                "NoiDungKetQua"
            )
        );

        set(
            "clsConclusion",
            pick(data, "ketLuan", "KetLuan")
        );

        // Tải danh sách ảnh theo maAnh qua API có JWT.
        renderResultImages(
            pick(data, "anhKetQua", "AnhKetQua")
        );

        /* CHỈ SỐ XÉT NGHIỆM */

        const rows = pick(
            data,
            "chiTiet",
            "ChiTiet"
        );

        const tbody = el("clsIndexesBody");

        if (tbody) {
            tbody.replaceChildren();
        }

        if (Array.isArray(rows) && rows.length > 0) {
            rows.forEach(row => {
                const tr = document.createElement("tr");

                const values = [
                    pick(row, "tenChiSo", "TenChiSo"),
                    pick(row, "giaTri", "GiaTri"),
                    pick(row, "donVi", "DonVi"),
                    pick(
                        row,
                        "giaTriThamChieu",
                        "GiaTriThamChieu"
                    ),
                    pick(row, "trangThai", "TrangThai")
                ];

                values.forEach(value => {
                    const td = document.createElement("td");

                    td.textContent = show(value);

                    tr.appendChild(td);
                });

                tbody?.appendChild(tr);
            });

            if (el("clsIndexesPanel")) {
                el("clsIndexesPanel").hidden = false;
            }

        } else {
            if (el("clsIndexesPanel")) {
                el("clsIndexesPanel").hidden = true;
            }
        }

        /* FILE ĐÍNH KÈM CŨ */

        const fileUrl = safeLink(
            pick(data, "fileURL", "FileURL")
        );

        if (el("clsFilePanel")) {
            el("clsFilePanel").hidden = !fileUrl;
        }

        if (fileUrl && el("clsFileLink")) {
            el("clsFileLink").href = fileUrl;
        }
    }

    /* TẢI TOÀN BỘ DỮ LIỆU */

    async function loadData() {
        clearResultImages();

        el("clsAlert").hidden = true;
        el("clsLoading").hidden = false;

        el("clsResultContent").hidden = true;
        el("clsFinished").hidden = true;
        el("clsNoResult").hidden = true;

        try {
            if (!maLichKham || !maChiDinh) {
                throw new Error(
                    "Đường dẫn không có mã lịch khám hoặc mã chỉ định."
                );
            }

            /* GỌI 3 API */

            const [patient, orders, services] =
                await Promise.all([
                    api(
                        `${API_BASE}/${maLichKham}/ho-so`
                    ),

                    api(
                        `${API_BASE}/${maLichKham}/chi-dinh`
                    ),

                    api(
                        `${API_BASE}/dich-vu`
                    )
                ]);

            if (!Array.isArray(orders)) {
                throw new Error(
                    "Danh sách chỉ định không hợp lệ."
                );
            }

            /* TÌM CHỈ ĐỊNH CẦN XEM */

            const order = orders.find(item =>
                Number(
                    pick(
                        item,
                        "maChiDinh",
                        "MaChiDinh"
                    )
                ) === maChiDinh
            );

            if (!order) {
                throw new Error(
                    "Không tìm thấy chỉ định trong lượt khám này."
                );
            }

            fillPatient(patient);

            const status = fillOrder(
                order,
                Array.isArray(services) ? services : []
            );

            let result = null;

            /* CHỈ TẢI KẾT QUẢ KHI HOÀN TẤT */

            if (status === "DaHoanThanh") {
                result = await api(
                    `${API_BASE}/${maLichKham}/chi-dinh/${maChiDinh}/ket-qua`
                );
            }

            const ready =
                status === "DaHoanThanh"
                && result?.coKetQua === true
                && pick(
                    result,
                    "trangThai",
                    "TrangThai"
                ) === "DaHoanThanh";

            updateStatus(status, ready);

            if (ready) {
                fillResult(result);

                el("clsFinished").hidden = false;

            } else {
                el("clsNoResult").hidden = false;
            }

            el("clsResultContent").hidden = false;

        } catch (error) {
            console.error(error);

            showError(
                error.message || "Không thể tải kết quả."
            );

        } finally {
            el("clsLoading").hidden = true;
        }
    }

    /* GẮN SỰ KIỆN */

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            el("clsBack")?.addEventListener(
                "click",
                () => location.assign(pageCLS())
            );

            el("clsBackBottom")?.addEventListener(
                "click",
                () => location.assign(pageCLS())
            );

            el("clsGoExam")?.addEventListener(
                "click",
                () => location.assign(pageExam())
            );

            el("clsReload")?.addEventListener(
                "click",
                loadData
            );

            loadData();
        }
    );

    /* DỌN DẸP KHI RỜI TRANG */

    window.addEventListener("beforeunload", () => {
        clearResultImages();

        imageState.lightbox?.remove();
    });

    /* PHÍM ESC ĐÓNG LIGHTBOX */

    document.addEventListener("keydown", event => {
        if (
            event.key === "Escape" &&
            imageState.lightbox
        ) {
            imageState.lightbox.style.display = "none";
        }
    });

})();