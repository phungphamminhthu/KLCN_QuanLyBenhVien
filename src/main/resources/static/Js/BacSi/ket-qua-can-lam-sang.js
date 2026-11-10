    (() => {
        "use strict";

        /* =========================================================
           1. CẤU HÌNH
        ========================================================= */

        const API_BASE = "/api/bac-si/kham-benh";
        const LIST_API = `${API_BASE}/ket-qua-can-lam-sang`;
        const PAGE_SIZE = 5;

        const state = {
            danhSach: [],
            boLoc: "all",
            tuKhoa: "",
            trang: 1,
            modalRequestId: 0,
            imageRequestId: 0,
            blobUrls: new Set(),
            imageAbortController: null
        };

        const $ = (id) => document.getElementById(id);

        function getToken() {
            return localStorage.getItem("Token")
                || sessionStorage.getItem("Token")
                || "";
        }

        function authHeaders(extra = {}) {
            const token = getToken();
            return {
                Accept: "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...extra
            };
        }

        /* =========================================================
           2. HÀM DÙNG CHUNG
        ========================================================= */

        function escapeHtml(value) {
            return String(value ?? "")
                .replaceAll("&", "&amp;")
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;")
                .replaceAll('"', "&quot;")
                .replaceAll("'", "&#039;");
        }

        function normalizeText(value) {
            return String(value ?? "")
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/đ/g, "d")
                .replace(/Đ/g, "D")
                .toLowerCase()
                .trim();
        }

        async function readResponse(response) {
            const contentType = response.headers.get("content-type") || "";

            if (contentType.includes("application/json")) {
                try {
                    return await response.json();
                } catch (_) {
                    return null;
                }
            }

            try {
                return await response.text();
            } catch (_) {
                return null;
            }
        }

        function getErrorMessage(data, status) {
            if (status === 401) {
                return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
            }

            if (status === 403) {
                return "Tài khoản không có quyền thực hiện thao tác này.";
            }

            if (typeof data === "string" && data.trim()) {
                return data;
            }

            return data?.message
                || data?.detail
                || data?.error
                || `Có lỗi xảy ra (HTTP ${status}).`;
        }

        async function apiGet(url, options = {}) {
            const response = await fetch(url, {
                method: "GET",
                cache: "no-store",
                ...options,
                headers: authHeaders(options.headers || {})
            });

            const data = await readResponse(response);

            if (!response.ok) {
                throw new Error(getErrorMessage(data, response.status));
            }

            return data;
        }

        function setText(id, value, fallback = "—") {
            const element = $(id);
            if (element) {
                element.textContent =
                    value === null || value === undefined || value === ""
                        ? fallback
                        : String(value);
            }
        }

        function showTableMessage(message) {
            const tbody = $("resultTableBody");
            if (!tbody) return;

            const tr = document.createElement("tr");
            const td = document.createElement("td");

            td.colSpan = 7;
            td.className = "empty";
            td.textContent = message;

            tr.appendChild(td);
            tbody.replaceChildren(tr);
        }

        function formatDate(value) {
            if (!value) return "—";

            const raw = String(value).trim();

            // LocalDate: yyyy-MM-dd; không chuyển qua Date để tránh lệch ngày.
            const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (dateOnly) {
                return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
            }

            // LocalDateTime hoặc chuỗi có dấu cách.
            const normalized = raw.replace(" ", "T");
            const date = new Date(normalized);

            if (Number.isNaN(date.getTime())) {
                return raw;
            }

            return new Intl.DateTimeFormat("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false
            }).format(date);
        }

        function hasResult(item) {
            if (typeof item?.coKetQua === "boolean") {
                return item.coKetQua;
            }

            return item?.maKetQua !== null
                && item?.maKetQua !== undefined
                && item?.maKetQua !== "";
        }

        function createElement(tag, className, text) {
            const element = document.createElement(tag);

            if (className) element.className = className;
            if (text !== undefined && text !== null) {
                element.textContent = String(text);
            }

            return element;
        }

        /* =========================================================
           3. BLOB URL - GIẢI PHÓNG BỘ NHỚ
        ========================================================= */

        function revokeBlobUrls() {
            for (const url of state.blobUrls) {
                URL.revokeObjectURL(url);
            }
            state.blobUrls.clear();
        }

        function createTrackedBlobUrl(blob) {
            const url = URL.createObjectURL(blob);
            state.blobUrls.add(url);
            return url;
        }

        function cancelImageRequests() {
            if (state.imageAbortController) {
                state.imageAbortController.abort();
                state.imageAbortController = null;
            }
        }

        function clearImageArea() {
            cancelImageRequests();
            revokeBlobUrls();

            const list = $("resultImageList");
            const section = $("imageSection");

            if (list) list.replaceChildren();
            section?.classList.add("hidden");
        }

        /* =========================================================
           4. THỐNG KÊ
        ========================================================= */

        function updateStatistics() {
            const total = state.danhSach.length;
            const completed = state.danhSach.filter(hasResult).length;
            const waiting = total - completed;

            setText("totalCount", total, "0");
            setText("resultCount", completed, "0");
            setText("waitingCount", waiting, "0");
        }

        /* =========================================================
           5. TẢI DANH SÁCH
        ========================================================= */

        async function loadResults() {
            showTableMessage("Đang tải danh sách kết quả cận lâm sàng...");

            const tbody = $("resultTableBody");
            const pagination = $("pagination");

            if (!tbody) {
                console.error("Không tìm thấy #resultTableBody trong HTML.");
                return;
            }

            try {
                const data = await apiGet(LIST_API);

                if (!Array.isArray(data)) {
                    throw new Error("API danh sách trả về dữ liệu không đúng định dạng.");
                }

                state.danhSach = data;
                state.trang = 1;

                updateStatistics();
                renderList();
            } catch (error) {
                console.error("Lỗi tải danh sách kết quả cận lâm sàng:", error);

                state.danhSach = [];
                updateStatistics();

                showTableMessage(error.message || "Không thể tải danh sách kết quả.");

                if (pagination) pagination.replaceChildren();
            }
        }

        /* =========================================================
           6. TÌM KIẾM VÀ LỌC
        ========================================================= */

        function getFilteredList() {
            return state.danhSach.filter((item) => {
                const completed = hasResult(item);

                if (state.boLoc === "done" && !completed) return false;
                if (state.boLoc === "waiting" && completed) return false;

                if (!state.tuKhoa) return true;

                const patient = normalizeText(item.hoTen);
                const service = normalizeText(item.tenDichVu);

                return patient.includes(state.tuKhoa)
                    || service.includes(state.tuKhoa);
            });
        }

        function renderList() {
            const tbody = $("resultTableBody");
            if (!tbody) return;

            const filtered = getFilteredList();
            const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

            if (state.trang > totalPages) state.trang = totalPages;
            if (state.trang < 1) state.trang = 1;

            if (filtered.length === 0) {
                showTableMessage(
                    state.danhSach.length === 0
                        ? "Bác sĩ hiện chưa có chỉ định cận lâm sàng."
                        : "Không tìm thấy dữ liệu phù hợp."
                );
                renderPagination(0, 1);
                return;
            }

            const start = (state.trang - 1) * PAGE_SIZE;
            const pageItems = filtered.slice(start, start + PAGE_SIZE);
            const fragment = document.createDocumentFragment();

            pageItems.forEach((item, index) => {
                const completed = hasResult(item);
                const tr = document.createElement("tr");

                const stt = createElement("td", "", start + index + 1);
                const patient = createElement("td", "", "");
                const patientName = createElement("strong", "", item.hoTen || "—");
                patient.appendChild(patientName);

                const service = createElement("td", "", item.tenDichVu || "—");
                const orderDate = createElement("td", "", formatDate(item.ngayChiDinh));
                const resultDate = createElement(
                    "td",
                    "",
                    completed ? formatDate(item.ngayCoKetQua) : "—"
                );

                const statusCell = document.createElement("td");
                const status = createElement(
                    "span",
                    `status ${completed ? "done" : "waiting"}`,
                    completed ? "Có kết quả" : "Chờ kết quả"
                );
                statusCell.appendChild(status);

                const actionCell = document.createElement("td");
                const viewButton = createElement(
                    "button",
                    "view-btn",
                    completed ? "Xem" : "Chưa có kết quả"
                );

                viewButton.type = "button";
                viewButton.disabled = !completed;
                viewButton.dataset.lich = item.maLichKham ?? "";
                viewButton.dataset.chiDinh = item.maChiDinh ?? "";
                viewButton.setAttribute(
                    "aria-label",
                    completed ? "Xem chi tiết kết quả" : "Chỉ định chưa có kết quả"
                );

                actionCell.appendChild(viewButton);

                tr.append(
                    stt,
                    patient,
                    service,
                    orderDate,
                    resultDate,
                    statusCell,
                    actionCell
                );

                fragment.appendChild(tr);
            });

            tbody.replaceChildren(fragment);
            renderPagination(filtered.length, totalPages);
        }

        /* =========================================================
           7. PHÂN TRANG
        ========================================================= */

        function renderPagination(totalItems, totalPages) {
            const container = $("pagination");
            if (!container) return;

            container.replaceChildren();

            if (totalItems <= PAGE_SIZE) return;

            const info = createElement("div", "pagination-info");
            info.textContent =
                `Hiển thị ${(state.trang - 1) * PAGE_SIZE + 1}` +
                `-${Math.min(state.trang * PAGE_SIZE, totalItems)}` +
                ` trong tổng số ${totalItems} chỉ định`;

            const controls = createElement("div", "pagination-controls");

            const addPageButton = (label, page, disabled, active = false) => {
                const button = createElement(
                    "button",
                    `page-btn${active ? " active" : ""}`,
                    label
                );

                button.type = "button";
                button.disabled = disabled;
                button.dataset.page = String(page);

                if (active) button.setAttribute("aria-current", "page");

                controls.appendChild(button);
            };

            addPageButton("‹", state.trang - 1, state.trang === 1);

            // Hiển thị gọn khi số trang lớn.
            let startPage = Math.max(1, state.trang - 2);
            let endPage = Math.min(totalPages, state.trang + 2);

            if (state.trang <= 3) endPage = Math.min(totalPages, 5);
            if (state.trang >= totalPages - 2) {
                startPage = Math.max(1, totalPages - 4);
            }

            for (let page = startPage; page <= endPage; page++) {
                addPageButton(
                    String(page),
                    page,
                    false,
                    page === state.trang
                );
            }

            addPageButton("›", state.trang + 1, state.trang === totalPages);

            container.append(info, controls);
        }

        /* =========================================================
           8. MỞ / ĐÓNG MODAL
        ========================================================= */

        function openModal() {
            const modal = $("detailModal");
            if (!modal) return;

            modal.classList.remove("hidden");
            document.body.style.overflow = "hidden";
        }

        function closeModal() {
            const modal = $("detailModal");
            modal?.classList.add("hidden");

            document.body.style.overflow = "";

            // Hủy các yêu cầu ảnh còn chạy và giải phóng URL.
            state.imageRequestId++;
            clearImageArea();
        }

        function resetModalContent() {
            setText("detailPatient", "—");
            setText("detailService", "—");
            setText("detailOrderDate", "—");
            setText("detailResultDate", "—");
            setText("detailContent", "—");
            setText("detailConclusion", "—");

            const detailBody = $("detailTableBody");
            if (detailBody) detailBody.replaceChildren();

            clearImageArea();

            const fileSection = $("fileSection");
            const resultFile = $("resultFile");

            fileSection?.classList.add("hidden");

            if (resultFile) {
                resultFile.removeAttribute("href");
                resultFile.removeAttribute("download");
                resultFile.textContent = "Xem tệp kết quả";
            }
        }

        /* =========================================================
           9. XEM CHI TIẾT
        ========================================================= */

        async function viewDetail(maLichKham, maChiDinh) {
            if (!maLichKham || !maChiDinh) {
                alert("Không xác định được mã lịch khám hoặc mã chỉ định.");
                return;
            }

            const requestId = ++state.modalRequestId;

            resetModalContent();
            openModal();

            setText("detailContent", "Đang tải nội dung kết quả...");
            setText("detailConclusion", "Đang tải kết luận...");

            try {
                const url =
                    `${API_BASE}/${encodeURIComponent(maLichKham)}` +
                    `/chi-dinh/${encodeURIComponent(maChiDinh)}/ket-qua`;

                const data = await apiGet(url);

                // Bỏ qua phản hồi cũ nếu người dùng đã mở một kết quả khác.
                if (requestId !== state.modalRequestId) return;

                if (!data || data.coKetQua !== true) {
                    throw new Error(data?.message || "Chỉ định này chưa có kết quả.");
                }

                const item = state.danhSach.find((row) =>
                    String(row.maLichKham) === String(maLichKham)
                    && String(row.maChiDinh) === String(maChiDinh)
                ) || {};

                setText("detailPatient", item.hoTen);
                setText("detailService", item.tenDichVu);
                setText("detailOrderDate", formatDate(item.ngayChiDinh));
                setText("detailResultDate", formatDate(data.ngayCoKetQua));
                setText("detailContent", data.noiDungKetQua);
                setText("detailConclusion", data.ketLuan);

                renderIndicators(data.chiTiet, data.anhKetQua);
                renderResultImages(data.anhKetQua, maLichKham, maChiDinh);

                // FileURL cũ được xử lý riêng, không dùng để thay thế danh sách ảnh mới.
                renderLegacyFile(data.fileURL);
            } catch (error) {
                if (requestId !== state.modalRequestId) return;

                console.error("Lỗi xem chi tiết kết quả:", error);
                setText("detailContent", "Không thể tải nội dung kết quả.");
                setText("detailConclusion", error.message || "Đã xảy ra lỗi.");

                const detailBody = $("detailTableBody");
                if (detailBody) {
                    detailBody.replaceChildren();
                    const row = document.createElement("tr");
                    const cell = createElement("td", "empty", "Không tải được chi tiết chỉ số.");
                    cell.colSpan = 5;
                    row.appendChild(cell);
                    detailBody.appendChild(row);
                }
            }
        }

        /* =========================================================
           10. HIỂN THỊ NHIỀU ẢNH TỪ ANHKETQUADICHVU
        ========================================================= */

        async function renderResultImages(images, maLichKham, maChiDinh) {
            const section = $("imageSection");
            const list = $("resultImageList");

            if (!section || !list) return;

            clearImageArea();

            if (!Array.isArray(images) || images.length === 0) {
                return;
            }

            const requestId = ++state.imageRequestId;
            const controller = new AbortController();
            state.imageAbortController = controller;

            section.classList.remove("hidden");

            const validImages = images.filter((image) =>
                image?.maAnh !== null
                && image?.maAnh !== undefined
                && String(image.maAnh).trim() !== ""
            );

            if (validImages.length === 0) {
                section.classList.add("hidden");
                return;
            }

            const tasks = validImages.map(async (image) => {
                const wrapper = createElement("div", "result-image-item");
                const img = createElement("img", "result-image");
                const link = createElement(
                    "a",
                    "",
                    image.tenFile || "Xem ảnh kết quả"
                );

                img.alt = image.tenFile || "Ảnh kết quả cận lâm sàng";
                img.loading = "lazy";
                img.decoding = "async";

                link.target = "_blank";
                link.rel = "noopener noreferrer";

                const loading = createElement("small", "image-loading", "Đang tải ảnh...");
                wrapper.append(img, loading);
                list.appendChild(wrapper);

                const imageUrl =
                    `${API_BASE}/${encodeURIComponent(maLichKham)}` +
                    `/chi-dinh/${encodeURIComponent(maChiDinh)}` +
                    `/ket-qua/anh/${encodeURIComponent(image.maAnh)}`;

                try {
                    const response = await fetch(imageUrl, {
                        method: "GET",
                        cache: "no-store",
                        headers: authHeaders(),
                        signal: controller.signal
                    });

                    if (!response.ok) {
                        throw new Error(getErrorMessage(null, response.status));
                    }

                    const blob = await response.blob();

                    if (
                        controller.signal.aborted
                        || requestId !== state.imageRequestId
                    ) {
                        return;
                    }

                    if (!blob.type.startsWith("image/")) {
                        throw new Error("Dữ liệu máy chủ trả về không phải định dạng ảnh.");
                    }

                    const blobUrl = createTrackedBlobUrl(blob);

                    img.src = blobUrl;

                    loading.remove();
                } catch (error) {
                    if (error.name === "AbortError") return;

                    console.error("Không tải được ảnh:", image.maAnh, error);
                    wrapper.replaceChildren(
                        createElement(
                            "span",
                            "image-error",
                            `Không tải được ảnh: ${image.tenFile || image.maAnh}`
                        )
                    );
                }
            });

            await Promise.allSettled(tasks);

            if (
                requestId === state.imageRequestId
                && list.querySelector(".result-image-item")
                && !list.querySelector("img[src]")
                && !list.querySelector(".image-error")
            ) {
                section.classList.add("hidden");
            }
        }

        /* =========================================================
           11. FILE KẾT QUẢ CŨ (KetQuaDichVu.FileURL)
        ========================================================= */

        function renderLegacyFile(fileURL) {
            const section = $("fileSection");
            const link = $("resultFile");

            if (!section || !link) return;

            section.classList.add("hidden");
            link.removeAttribute("href");

            if (!fileURL || !String(fileURL).trim()) return;

            const raw = String(fileURL).trim();

            try {
                // FileURL cũ có thể là URL đầy đủ hoặc đường dẫn nội bộ.
                // Không tự ghép R2 object key (ví dụ: images/abc.jpg)
                // thành URL trình duyệt vì endpoint ảnh mới đã có cơ chế JWT riêng.
                const isAbsoluteHttpUrl = /^https?:\/\//i.test(raw);
                const isInternalPath = raw.startsWith("/")
                    && !raw.startsWith("//");

                if (!isAbsoluteHttpUrl && !isInternalPath) {
                    console.warn(
                        "FileURL cũ không phải URL truy cập trực tiếp. " +
                        "Cần endpoint tải file có xác thực nếu đây là object key R2."
                    );
                    return;
                }

                const url = new URL(raw, window.location.origin);

                if (!["http:", "https:"].includes(url.protocol)) {
                    console.warn("Bỏ qua fileURL không an toàn.");
                    return;
                }

                link.href = url.href;
                link.textContent = "Xem tệp kết quả";
                section.classList.remove("hidden");
            } catch (error) {
                console.warn("Không xác định được đường dẫn file kết quả:", error);
            }
        }

        /* =========================================================
           12. CHI TIẾT CHỈ SỐ
        ========================================================= */

        function renderIndicators(items, images) {
            const tbody = $("detailTableBody");
            const table = tbody?.closest("table");

            if (!tbody) return;

            // Kiểm tra kết quả có hình ảnh hay không
            const hasImages = Array.isArray(images)
                && images.length > 0;

            // Lấy section chứa tiêu đề và bảng chỉ số.
            const section = tbody.closest("#indicatorSection");

            // Nếu có hình ảnh thì ẩn toàn bộ khu vực chỉ số.
            if (section) {
                section.classList.toggle("hidden", hasImages);
            }

            // Nếu có hình ảnh thì không tạo nội dung bảng.
            if (hasImages) {
                tbody.replaceChildren();
                return;
            }

            tbody.replaceChildren();

            // Không có dữ liệu chỉ số thì hiển thị thông báo.
            if (!Array.isArray(items) || items.length === 0) {
                const row = document.createElement("tr");
                const cell = createElement(
                    "td",
                    "empty",
                    "Không có chi tiết chỉ số."
                );

                cell.colSpan = 5;
                row.appendChild(cell);
                tbody.appendChild(row);
                return;
            }

            const fragment = document.createDocumentFragment();

            items.forEach((item) => {
                const row = document.createElement("tr");

                row.append(
                    createElement("td", "", item.tenChiSo || "—"),
                    createElement("td", "", item.giaTri ?? "—"),
                    createElement("td", "", item.donVi || "—"),
                    createElement("td", "", item.giaTriThamChieu || "—"),
                    createElement("td", "", item.trangThai || "—")
                );

                fragment.appendChild(row);
            });

            tbody.appendChild(fragment);
        }

        /* =========================================================
           13. GẮN SỰ KIỆN
        ========================================================= */

        function bindEvents() {
            document.querySelectorAll(".filter-btn").forEach((button) => {
                button.addEventListener("click", () => {
                    document.querySelectorAll(".filter-btn").forEach((item) => {
                        item.classList.remove("active");
                    });

                    button.classList.add("active");
                    state.boLoc = button.dataset.filter || "all";
                    state.trang = 1;
                    renderList();
                });
            });

            const searchInput = $("searchInput");
            if (searchInput) {
                searchInput.addEventListener("input", () => {
                    state.tuKhoa = normalizeText(searchInput.value);
                    state.trang = 1;
                    renderList();
                });
            }

            const tbody = $("resultTableBody");
            if (tbody) {
                // Event delegation: không phải gắn lại listener sau mỗi lần render.
                tbody.addEventListener("click", (event) => {
                    const button = event.target.closest(".view-btn");
                    if (!button || button.disabled) return;

                    viewDetail(
                        button.dataset.lich,
                        button.dataset.chiDinh
                    );
                });
            }

            const pagination = $("pagination");
            if (pagination) {
                pagination.addEventListener("click", (event) => {
                    const button = event.target.closest(".page-btn");
                    if (!button || button.disabled) return;

                    const page = Number(button.dataset.page);
                    if (!Number.isInteger(page) || page < 1) return;

                    state.trang = page;
                    renderList();
                });
            }

            $("closeModal")?.addEventListener("click", closeModal);

            $("detailModal")?.addEventListener("click", (event) => {
                if (event.target === $("detailModal")) {
                    closeModal();
                }
            });

            document.addEventListener("keydown", (event) => {
                if (event.key === "Escape" && !$("detailModal")?.classList.contains("hidden")) {
                    closeModal();
                }
            });

            // Hỗ trợ nút làm mới nếu layout có nút này.
            $("refresh-dashboard-button")?.addEventListener("click", loadResults);
        }

        /* =========================================================
           14. KHỞI TẠO
        ========================================================= */

        document.addEventListener("DOMContentLoaded", () => {
            if (!$("resultTableBody")) {
                console.error("Không tìm thấy HTML của trang kết quả cận lâm sàng bác sĩ.");
                return;
            }

            bindEvents();
            loadResults();
        });

        // Dọn URL ảnh khi rời khỏi trang.
        window.addEventListener("beforeunload", () => {
            cancelImageRequests();
            revokeBlobUrls();
        });
    })();
