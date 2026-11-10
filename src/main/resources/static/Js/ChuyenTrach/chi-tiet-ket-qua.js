
document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const $ = id => document.getElementById(id);

    // ============================================
    // 1. XÁC ĐỊNH MÃ CHỈ ĐỊNH / MÃ PHIẾU
    // ============================================

    const segments = window.location.pathname
        .split("/")
        .filter(Boolean);

    const isLabSheet = segments.includes("phieu");
    const idFromUrl = segments[segments.length - 1];

    const maPhieu = isLabSheet
        ? decodeURIComponent(idFromUrl || "")
        : null;

    const maChiDinh = isLabSheet
        ? null
        : Number(idFromUrl);

    const API_BASE =
        "/api/chuyen-trach/ket-qua-da-thuc-hien";

    const errorBox = $("ctkqdError");
    const fileBox = $("ctkqdFileBox");
    const noFileBox = $("ctkqdNoFile");
    const labSection = $("ctkqdLabSection");
    const normalSection = $("ctkqdNormalSection");
    const labGroups = $("ctkqdLabGroups");
    const imageList = $("ctkqdImageList");
    const objectUrls = new Set();

    function revokeObjectUrls() {
        objectUrls.forEach(url => URL.revokeObjectURL(url));
        objectUrls.clear();
    }

    // ============================================
    // 2. TOKEN VÀ GỌI API
    // ============================================

    function getToken() {
        return sessionStorage.getItem("Token") ||
            localStorage.getItem("Token");
    }

    async function apiGet(url) {
        const token = getToken();

        if (!token) {
            throw new Error(
                "Vui lòng đăng nhập tài khoản chuyên trách."
            );
        }

        const response = await fetch(url, {
            method: "GET",
            cache: "no-store",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            let message =
                `Không tải được kết quả (HTTP ${response.status}).`;

            try {
                const data = await response.json();

                message =
                    data.detail ||
                    data.message ||
                    message;
            } catch (_) {
                // Giữ thông báo HTTP mặc định.
            }

            if (
                response.status === 401 ||
                response.status === 403
            ) {
                message =
                    "Phiên đăng nhập không hợp lệ " +
                    "hoặc bạn không có quyền xem kết quả.";
            } else if (response.status === 404) {
                message =
                    "Không tìm thấy kết quả hoặc phiếu xét nghiệm.";
            } else if (response.status === 409) {
                message =
                    "Chỉ định này chưa ở trạng thái hoàn thành.";
            }

            throw new Error(message);
        }

        return response.json();
    }

    // ============================================
    // 3. HIỂN THỊ VÀ ĐỊNH DẠNG
    // ============================================

    function setText(id, value) {
        const element = $(id);

        if (!element) return;

        element.textContent =
            value === null ||
            value === undefined ||
            String(value).trim() === ""
                ? "—"
                : String(value);
    }

    function formatCode(prefix, value) {
        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return "—";
        }

        return prefix + String(value).padStart(6, "0");
    }

    function formatDate(value, withTime = false) {
        if (!value) return "—";

        const normalized = String(value).replace(" ", "T");
        const [date, time] = normalized.split("T");
        const parts = date.split("-");

        if (parts.length !== 3) {
            return String(value);
        }

        let result =
            `${parts[2]}/${parts[1]}/${parts[0]}`;

        if (withTime && time) {
            result += ` ${time.slice(0, 5)}`;
        }

        return result;
    }

    // ============================================
    // 4. TÍNH TUỔI
    // ============================================

    function calculateAge(birthDate) {
        if (!birthDate) return "—";

        const parts = String(birthDate)
            .slice(0, 10)
            .split("-")
            .map(Number);

        if (
            parts.length !== 3 ||
            parts.some(Number.isNaN)
        ) {
            return "—";
        }

        const [year, month, day] = parts;

        const nowParts = new Intl.DateTimeFormat(
            "en-US",
            {
                timeZone: "Asia/Ho_Chi_Minh",
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            }
        ).formatToParts(new Date());

        const getPart = type =>
            Number(
                nowParts.find(p => p.type === type)?.value
            );

        const currentYear = getPart("year");
        const currentMonth = getPart("month");
        const currentDay = getPart("day");

        let age = currentYear - year;

        if (
            currentMonth < month ||
            (
                currentMonth === month &&
                currentDay < day
            )
        ) {
            age--;
        }

        return age >= 0 && age <= 130
            ? `${age} tuổi`
            : "—";
    }

    // ============================================
    // 5. HIỂN THỊ THÔNG TIN BỆNH NHÂN
    // ============================================

    function renderPatient(data) {
        setText(
            "ctkqdPatientName",
            data.tenBenhNhan
        );

        setText(
            "ctkqdPatientCode",
            formatCode("BN", data.maBenhNhan)
        );

        setText(
            "ctkqdGender",
            data.gioiTinh
        );

        setText(
            "ctkqdBirthDate",
            formatDate(data.ngaySinh)
        );

        setText(
            "ctkqdAge",
            calculateAge(data.ngaySinh)
        );

        setText(
            "ctkqdPhone",
            data.soDienThoai
        );

        setText(
            "ctkqdDoctor",
            data.bacSiPhuTrach
        );

        setText(
            "ctkqdRecordCode",
            formatCode("HSBA", data.maHoSoBenhAn)
        );
    }

    // ============================================
    // 6. KIỂM TRA URL TỆP ĐÍNH KÈM
    // ============================================

    function safeFileUrl(value) {
        if (!value || typeof value !== "string") {
            return null;
        }

        const raw = value.trim();

        // Chỉ chấp nhận object key, không chấp nhận URL tùy ý.
        if (
            !raw ||
            raw.startsWith("/") ||
            raw.includes("..") ||
            raw.includes("\\") ||
            /[\u0000-\u001F\u007F]/.test(raw)
        ) {
            return null;
        }

        return new URL(
            `/api/chuyen-trach/anh-ket-qua?key=${encodeURIComponent(raw)}`,
            window.location.origin
        );
    }

    //=====================================
    //
    // ====================================
    async function loadProtectedFile(value) {
        const apiUrl = safeFileUrl(value);

        if (!apiUrl) {
            throw new Error("Đường dẫn tệp không hợp lệ.");
        }

        const token = getToken();

        if (!token) {
            throw new Error("Không tìm thấy token đăng nhập.");
        }

        const response = await fetch(apiUrl.href, {
            method: "GET",
            cache: "no-store",
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "*/*"
            }
        });

        if (!response.ok) {
            throw new Error(
                `Không tải được tệp (HTTP ${response.status}).`
            );
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        objectUrls.add(blobUrl);

        return {
            blobUrl,
            fileName: getFileName(apiUrl),
            blob
        };
    }

    // ============================================
    // 7. KIỂM TRA FILE CÓ PHẢI HÌNH ẢNH
    // ============================================

    function isImageFile(url) {
        if (!url) return false;

        const fileKey = url.searchParams?.get("key");

        if (!fileKey) return false;

        return /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileKey);
    }

    // ============================================
    // 8. LẤY TÊN FILE
    // ============================================

    function getFileName(url, fallback = "Tệp kết quả") {
        if (!url) return fallback;

        const fileKey = url.searchParams?.get("key");

        if (!fileKey) return fallback;

        let fileName = fileKey.split("/").pop() || fallback;

        try {
            fileName = decodeURIComponent(fileName);
        } catch (_) {
            // Giữ nguyên tên file.
        }

        return fileName;
    }

    // ============================================
    // 9. TẠO PHẦN TỬ HIỂN THỊ ẢNH
    // ============================================

async function createImageItem(imageData) {
    if (!imageData || !imageData.fileURL) {
        return null;
    }

    const apiUrl = safeFileUrl(imageData.fileURL);

    if (!apiUrl || !isImageFile(apiUrl)) {
        return null;
    }

    const item = document.createElement("div");
    item.className = "ctkqd-image-item";

    const img = document.createElement("img");
    img.className = "ctkqd-image";
    img.alt = "Ảnh kết quả CLS";
    img.loading = "lazy";

    try {
        const file = await loadProtectedFile(imageData.fileURL);

        img.src = file.blobUrl;

    } catch (error) {
        console.error(
            "Không thể tải ảnh:",
            imageData.fileURL,
            error
        );

        item.classList.add("ctkqd-image-error");
        img.alt = "Không thể tải hình ảnh";

        return item;
    }

    // Chỉ hiển thị ảnh, không tạo link mở tab mới.
    item.appendChild(img);

    return item;
}

    // ============================================
    // 10. HIỂN THỊ NHIỀU ẢNH TỪ ANHKETQUADICHVU
    // ============================================

    async function renderImageList(images) {
        console.log("[DEBUG] Bắt đầu renderImageList:", images);

        if (!imageList) {
            console.error("[DEBUG] Không tìm thấy ctkqdImageList");
            return 0;
        }

        imageList.replaceChildren();

        if (!Array.isArray(images) || images.length === 0) {
            imageList.hidden = true;
            return 0;
        }

        const heading = document.createElement("h3");
        heading.className = "ctkqd-image-heading";
        heading.textContent = "Ảnh đính kèm kết quả";

        const grid = document.createElement("div");
        grid.className = "ctkqd-image-grid";

        // Phải đợi createImageItem hoàn thành.
        const items = await Promise.all(
            images.map(async (image) => {
                console.log("[DEBUG] Đang tạo ảnh:", image);

                const item = await createImageItem(image);

                console.log("[DEBUG] Kết quả createImageItem:", item);

                return item;
            })
        );

        let count = 0;

        for (const item of items) {
            if (!item) {
                console.warn("[DEBUG] Bỏ qua ảnh vì item null");
                continue;
            }

            if (!(item instanceof Node)) {
                console.error("[DEBUG] Item không phải Node:", item);
                continue;
            }

            grid.appendChild(item);
            count++;
        }

        if (count > 0) {
            imageList.appendChild(heading);
            imageList.appendChild(grid);
            imageList.hidden = false;
        } else {
            imageList.hidden = true;
        }

        console.log("[DEBUG] Tổng ảnh đã thêm:", count);

        return count;
    }

    // ============================================
    // 11. HIỂN THỊ TỆP CHÍNH
    // ============================================
    async function renderMainFile(value) {
        const apiUrl = safeFileUrl(value);

        const previewLink = $("ctkqdPreview");
        const downloadLink = $("ctkqdDownload");
        const fileNameElement = $("ctkqdFileName");
        const actions = $("ctkqdMainFileActions");

        if (!apiUrl) {
            if (previewLink) {
                previewLink.hidden = true;
                previewLink.removeAttribute("href");
            }

            if (downloadLink) {
                downloadLink.hidden = true;
                downloadLink.removeAttribute("href");
            }

            if (actions) actions.hidden = true;

            setText("ctkqdFileName", "—");
            return false;
        }

        const fileName = getFileName(apiUrl);

        try {
            const token = getToken();

            if (!token) {
                throw new Error("Không tìm thấy token đăng nhập.");
            }

            const response = await fetch(apiUrl.href, {
                method: "GET",
                cache: "no-store",
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "*/*"
                }
            });

            if (!response.ok) {
                throw new Error(`Không tải được tệp (HTTP ${response.status}).`);
            }

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            // Lưu URL để giải phóng khi không còn sử dụng.
            objectUrls.add(blobUrl);

            setText("ctkqdFileName", fileName);

            if (previewLink) {
                previewLink.href = blobUrl;
                previewLink.target = "_blank";
                previewLink.rel = "noopener noreferrer";
                previewLink.hidden = false;
            }

            if (downloadLink) {
                downloadLink.href = blobUrl;
                downloadLink.download = fileName;
                downloadLink.hidden = false;
            }

            if (actions) actions.hidden = false;

            return true;

        } catch (error) {
            console.error("Lỗi tải tệp kết quả:", error);

            setText("ctkqdFileName", "Không thể tải tệp");

            if (previewLink) previewLink.hidden = true;
            if (downloadLink) downloadLink.hidden = true;
            if (actions) actions.hidden = true;

            return false;
        }
    }

    // ============================================
    // 12. HIỂN THỊ TOÀN BỘ TỆP ĐÍNH KÈM
    // ============================================

    async function renderAttachments(danhSachAnh) {
        console.log("[DEBUG] renderAttachments được gọi");
        console.log("[DEBUG] danhSachAnh:", danhSachAnh);
        console.log("[DEBUG] Số lượng ảnh:", danhSachAnh?.length);

        const imageCount = await renderImageList(danhSachAnh);

        console.log("[DEBUG] imageCount:", imageCount);
        console.log("[DEBUG] imageList HTML:", imageList?.innerHTML);
        console.log("[DEBUG] imageList hidden:", imageList?.hidden);

        if (fileBox) {
            fileBox.hidden = imageCount === 0;
        }

        if (noFileBox) {
            noFileBox.hidden = imageCount > 0;
        }

        setText(
            "ctkqdFileName",
            imageCount > 0 ? `${imageCount} ảnh đính kèm` : "—"
        );

        const mainActions = $("ctkqdMainFileActions");

        if (mainActions) {
            mainActions.hidden = true;
        }

        return imageCount;
    }

    // ============================================
    // 13. HIỂN THỊ KẾT QUẢ DỊCH VỤ THÔNG THƯỜNG
    // ============================================

    async function renderNormalResult(data) {
        if (labSection) labSection.hidden = true;
        if (normalSection) normalSection.hidden = false;

        renderPatient(data);

        setText("ctkqdService", data.tenDichVu);
        setText("ctkqdResultCode", formatCode("KQ", data.maKetQua));
        setText("ctkqdOrderCode", formatCode("CD", data.maChiDinh));
        setText("ctkqdResultDate", formatDate(data.ngayCoKetQua, true));

        setText(
            "ctkqdContent",
            data.noiDungKetQua || "Chưa có nội dung kết quả được ghi nhận."
        );

        setText(
            "ctkqdConclusion",
            data.ketLuan || "Chưa có kết luận chuyên môn được ghi nhận."
        );

        // LẤY DANH SÁCH ẢNH TỪ CSDL
       await renderAttachments(data.danhSachAnh);
    }

    // ============================================
    // 14. HIỂN THỊ ẢNH ĐÍNH KÈM TRONG XÉT NGHIỆM
    // ============================================

    async function renderLabAttachments(test, group) {
        const images = Array.isArray(test.danhSachAnh)
            ? test.danhSachAnh
            : [];

        const hasMainFile = Boolean(safeFileUrl(test.fileURL));
        const hasImages = images.length > 0;

        if (!hasMainFile && !hasImages) {
            return;
        }

        const attachmentBox = document.createElement("div");
        attachmentBox.className = "ctkqd-lab-attachments";

        // File chính của kết quả xét nghiệm.
        if (hasMainFile) {
            const mainLink = document.createElement("a");

            mainLink.className = "ctkqd-lab-attachment";
            mainLink.textContent = "Đang tải tệp kết quả...";
            mainLink.href = "#";

            try {
                const file = await loadProtectedFile(test.fileURL);

                mainLink.href = file.blobUrl;
                mainLink.target = "_blank";
                mainLink.rel = "noopener noreferrer";
                mainLink.textContent = `Xem tệp kết quả (${file.fileName})`;
            } catch (error) {
                console.error("Lỗi tải tệp xét nghiệm:", error);

                mainLink.textContent = "Không thể tải tệp kết quả";
                mainLink.classList.add("ctkqd-image-error");
                mainLink.removeAttribute("href");
            }

            attachmentBox.appendChild(mainLink);
        }

        // Danh sách ảnh đính kèm.
        for (const image of images) {
            const item = await createImageItem(image);

            if (item) {
                attachmentBox.appendChild(item);
            }
        }

        if (attachmentBox.childElementCount > 0) {
            group.appendChild(attachmentBox);
        }
    }
    // ============================================
    // 15. HIỂN THỊ TOÀN BỘ PHIẾU XÉT NGHIỆM
    // ============================================

    async function renderLabSheet(data) {
        if (labSection) {
            labSection.hidden = false;
        }

        if (normalSection) {
            normalSection.hidden = true;
        }

        const tests = Array.isArray(data.danhSachXetNghiem)
            ? data.danhSachXetNghiem
            : [];

        renderPatient(data);

        setText(
            "ctkqdService",
            `Xét nghiệm (${tests.length} mục)`
        );

        const resultCodes = tests
            .map(test => formatCode("KQ", test.maKetQua))
            .filter(code => code !== "—");

        setText(
            "ctkqdResultCode",
            resultCodes.length > 0
                ? resultCodes.join(", ")
                : "—"
        );

        setText(
            "ctkqdOrderCode",
            data.maPhieuChiDinh
        );

        const dates = tests
            .map(test => test.ngayCoKetQua)
            .filter(Boolean)
            .sort();

        setText(
            "ctkqdResultDate",
            dates.length
                ? formatDate(dates[dates.length - 1], true)
                : "—"
        );

        setText(
            "ctkqdLabCount",
            `${tests.length} xét nghiệm`
        );

        if (!labGroups) return;

        labGroups.replaceChildren();

        // Gom xét nghiệm theo nhóm danh mục.
        const groups = new Map();

        for (const test of tests) {
            const groupName =
                String(test.nhomXetNghiem || "").trim() ||
                "CÁC XÉT NGHIỆM KHÁC";

            if (!groups.has(groupName)) {
                groups.set(groupName, []);
            }

            groups.get(groupName).push(test);
        }

        // Hiển thị từng nhóm xét nghiệm.
        for (const [groupName, items] of groups) {
            const group = document.createElement("section");
            group.className = "ctkqd-lab-group";

            const heading = document.createElement("h3");
            heading.textContent = groupName.toUpperCase();

            group.appendChild(heading);

            for (const test of items) {
                const row = document.createElement("div");
                row.className = "ctkqd-lab-row";

                const label = document.createElement("div");
                label.className = "ctkqd-lab-name";

                const icon = document.createElement("i");
                icon.className = "fa-solid fa-check";
                icon.setAttribute("aria-hidden", "true");

                const name = document.createElement("span");
                name.textContent = test.tenDichVu || "—";

                label.append(icon, name);

                const resultInfo = document.createElement("div");
                resultInfo.className = "ctkqd-lab-result-info";

                const value = document.createElement("strong");
                value.className = "ctkqd-lab-value";
                value.textContent =
                    String(test.noiDungKetQua || "").trim() || "—";

                resultInfo.append(value);

                row.append(label, resultInfo);
                group.appendChild(row);

                // Hiển thị tệp và nhiều ảnh của từng xét nghiệm.
                await renderLabAttachments(test, group);
            }

            labGroups.appendChild(group);
        }
    }

    // ============================================
    // 16. THÔNG BÁO LỖI
    // ============================================

    function showError(message) {
        console.error(
            "Chi tiết kết quả CLS:",
            message
        );

        if (!errorBox) return;

        errorBox.textContent = message;
        errorBox.hidden = false;
    }

    // ============================================
    // 17. RESET GIAO DIỆN KHI LỖI
    // ============================================

    function resetAttachment() {
        if (fileBox) {
            fileBox.hidden = true;
        }

        if (noFileBox) {
            noFileBox.hidden = false;
        }

        if (imageList) {
            imageList.replaceChildren();
            imageList.hidden = true;
        }

        const preview = $("ctkqdPreview");
        const download = $("ctkqdDownload");

        if (preview) {
            preview.hidden = true;
            preview.removeAttribute("href");
        }

        if (download) {
            download.hidden = true;
            download.removeAttribute("href");
        }
    }

    // ============================================
    // 18. TẢI DỮ LIỆU
    // ============================================

    async function loadDetail() {
        if (
            !isLabSheet &&
            (!Number.isInteger(maChiDinh) || maChiDinh <= 0)
        ) {
            showError("Mã chỉ định không hợp lệ.");
            return;
        }

        if (isLabSheet && !maPhieu) {
            showError("Mã phiếu xét nghiệm không hợp lệ.");
            return;
        }

        try {
            const url = isLabSheet
                ? `${API_BASE}/phieu/${encodeURIComponent(maPhieu)}`
                : `${API_BASE}/chi-tiet/${encodeURIComponent(maChiDinh)}`;

            const data = await apiGet(url);

            if (isLabSheet) {
                if (
                    !data ||
                    String(data.maPhieuChiDinh) !== String(maPhieu)
                ) {
                    throw new Error(
                        "Dữ liệu không khớp mã phiếu xét nghiệm."
                    );
                }

                await renderLabSheet(data);

            } else {
                if (
                    !data ||
                    Number(data.maChiDinh) !== maChiDinh
                ) {
                    throw new Error(
                        "Dữ liệu không khớp mã chỉ định."
                    );
                }

                await renderNormalResult(data);
            }

            if (errorBox) {
                errorBox.hidden = true;
            }

        } catch (error) {
            showError(
                error?.message ||
                "Đã xảy ra lỗi khi tải kết quả."
            );

            setText(
                "ctkqdPatientName",
                "Không thể tải dữ liệu"
            );

            if (isLabSheet) {
                if (labSection) {
                    labSection.hidden = true;
                }

                if (normalSection) {
                    normalSection.hidden = true;
                }

            } else {
                setText(
                    "ctkqdContent",
                    "Không có dữ liệu để hiển thị."
                );

                setText(
                    "ctkqdConclusion",
                    "Không có dữ liệu để hiển thị."
                );

                resetAttachment();
            }
        }
    }

    // ============================================
    // 19. KHỞI TẠO
    // ============================================

    loadDetail();
});
