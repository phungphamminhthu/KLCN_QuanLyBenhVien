document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const $ = id => document.getElementById(id);

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

    // ============================================
    // 1. TOKEN VÀ GỌI API
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
    // 2. HIỂN THỊ VÀ ĐỊNH DẠNG
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
    // 3. TÍNH TUỔI
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
    // 4. HIỂN THỊ THÔNG TIN BỆNH NHÂN
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
    // 5. HIỂN THỊ KẾT QUẢ DỊCH VỤ THÔNG THƯỜNG
    // ============================================

    function renderNormalResult(data) {
        if (labSection) {
            labSection.hidden = true;
        }

        if (normalSection) {
            normalSection.hidden = false;
        }

        renderPatient(data);

        setText(
            "ctkqdService",
            data.tenDichVu
        );

        setText(
            "ctkqdResultCode",
            formatCode("KQ", data.maKetQua)
        );

        setText(
            "ctkqdOrderCode",
            formatCode("CD", data.maChiDinh)
        );

        setText(
            "ctkqdResultDate",
            formatDate(data.ngayCoKetQua, true)
        );

        setText(
            "ctkqdContent",
            data.noiDungKetQua ||
                "Chưa có nội dung kết quả được ghi nhận."
        );

        setText(
            "ctkqdConclusion",
            data.ketLuan ||
                "Chưa có kết luận chuyên môn được ghi nhận."
        );

        renderAttachment(data.fileURL);
    }

    // ============================================
    // 6. KIỂM TRA URL TỆP ĐÍNH KÈM
    // ============================================

    function safeFileUrl(value) {
        if (
            !value ||
            typeof value !== "string" ||
            !value.trim()
        ) {
            return null;
        }

        const raw = value.trim();

        // Chặn ký tự điều khiển trong URL.
        if (/[\u0000-\u001F\u007F]/.test(raw)) {
            return null;
        }

        try {
            let url;

            if (/^https?:\/\//i.test(raw)) {
                url = new URL(raw);
            } else if (
                /^[a-z][a-z0-9+.-]*:/i.test(raw) ||
                raw.startsWith("//")
            ) {
                // Chặn javascript:, data:, file:...
                return null;
            } else {
                url = new URL(
                    raw.startsWith("/") ? raw : `/${raw}`,
                    window.location.origin
                );
            }

            // HTTPS được phép; HTTP chỉ cho phép cùng origin.
            if (
                url.protocol !== "https:" &&
                !(
                    url.protocol === "http:" &&
                    url.origin === window.location.origin
                )
            ) {
                return null;
            }

            return url;
        } catch (_) {
            return null;
        }
    }

    // ============================================
    // 7. HIỂN THỊ TỆP ĐÍNH KÈM
    // ============================================

    function renderAttachment(value) {
        const url = safeFileUrl(value);

        if (fileBox) {
            fileBox.hidden = !url;
        }

        if (noFileBox) {
            noFileBox.hidden = Boolean(url);
        }

        if (!url) return;

        let fileName =
            url.pathname.split("/").filter(Boolean).pop() ||
            "Tệp kết quả";

        try {
            fileName = decodeURIComponent(fileName);
        } catch (_) {
            // Giữ nguyên tên nếu mã hóa không hợp lệ.
        }

        setText("ctkqdFileName", fileName);

        const previewLink = $("ctkqdPreview");
        const downloadLink = $("ctkqdDownload");

        if (previewLink) {
            previewLink.href = url.href;
            previewLink.target = "_blank";
            previewLink.rel = "noopener noreferrer";
        }

        if (downloadLink) {
            downloadLink.href = url.href;

            if (url.origin === window.location.origin) {
                downloadLink.setAttribute(
                    "download",
                    fileName
                );
            } else {
                downloadLink.removeAttribute("download");
                downloadLink.target = "_blank";
                downloadLink.rel = "noopener noreferrer";
            }
        }
    }

    // ============================================
    // 8. HIỂN THỊ TOÀN BỘ PHIẾU XÉT NGHIỆM
    // ============================================

    function renderLabSheet(data) {
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

        // Một phiếu có thể chứa nhiều mã kết quả.
        setText("ctkqdResultCode", "—");

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

                const value = document.createElement("strong");
                value.className = "ctkqd-lab-value";
                value.textContent =
                    String(test.noiDungKetQua || "").trim() || "—";

                row.append(label, value);
                group.appendChild(row);

                const fileUrl = safeFileUrl(test.fileURL);

                if (fileUrl) {
                    const attachment =
                        document.createElement("a");

                    attachment.className =
                        "ctkqd-lab-attachment";

                    attachment.href = fileUrl.href;
                    attachment.target = "_blank";
                    attachment.rel = "noopener noreferrer";
                    attachment.textContent =
                        "Xem tài liệu đính kèm";

                    group.appendChild(attachment);
                }
            }

            labGroups.appendChild(group);
        }
    }

    // ============================================
    // 9. THÔNG BÁO LỖI
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
    // 10. TẢI DỮ LIỆU
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
                // Đảm bảo dữ liệu trả về đúng phiếu.
                if (
                    !data ||
                    String(data.maPhieuChiDinh) !== String(maPhieu)
                ) {
                    throw new Error(
                        "Dữ liệu không khớp mã phiếu xét nghiệm."
                    );
                }

                renderLabSheet(data);
            } else {
                // Đảm bảo dữ liệu đúng chỉ định đang xem.
                if (
                    !data ||
                    Number(data.maChiDinh) !== maChiDinh
                ) {
                    throw new Error(
                        "Dữ liệu không khớp mã chỉ định."
                    );
                }

                renderNormalResult(data);
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

                if (fileBox) {
                    fileBox.hidden = true;
                }

                if (noFileBox) {
                    noFileBox.hidden = false;
                }
            }
        }
    }

    // ============================================
    // 11. KHỞI TẠO
    // ============================================

    loadDetail();
});