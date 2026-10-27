
document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    // =====================================================
    // 1. KHAI BÁO
    // =====================================================

    const $ = id => document.getElementById(id);

    const API =
        "/api/chuyen-trach/ket-qua-da-thuc-hien/chi-tiet";

    const maChiDinh = Number(
        window.location.pathname
            .split("/")
            .filter(Boolean)
            .pop()
    );

    const errorBox = $("ctkqdError");
    const fileBox = $("ctkqdFileBox");
    const noFileBox = $("ctkqdNoFile");

    // =====================================================
    // 2. TOKEN
    // =====================================================

    function getToken() {
        return (
            sessionStorage.getItem("Token") ||
            localStorage.getItem("Token")
        );
    }

    // =====================================================
    // 3. GỌI API
    // =====================================================

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
            }

            if (response.status === 404) {
                message =
                    "Chỉ định chưa có kết quả được lưu trong MySQL.";
            }

            if (response.status === 409) {
                message =
                    "Chỉ định này chưa ở trạng thái hoàn thành.";
            }

            throw new Error(message);
        }

        return response.json();
    }

    // =====================================================
    // 4. HIỂN THỊ TEXT AN TOÀN
    // =====================================================

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

    // =====================================================
    // 5. ĐỊNH DẠNG MÃ VÀ NGÀY
    // =====================================================

    function formatCode(prefix, value) {
        if (
            value === null ||
            value === undefined
        ) {
            return "—";
        }

        return (
            prefix +
            String(value).padStart(6, "0")
        );
    }

    function formatDate(value, withTime = false) {
        if (!value) return "—";

        const normalized = String(value)
            .replace(" ", "T");

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

    // =====================================================
    // 6. TÍNH TUỔI
    // =====================================================

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

        const getPart = type => Number(
            nowParts.find(
                p => p.type === type
            )?.value
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

        if (age < 0 || age > 130) {
            return "—";
        }

        return `${age} tuổi`;
    }

    // =====================================================
    // 7. HIỂN THỊ 3 THẺ THÔNG TIN
    // =====================================================

    function renderSummary(data) {

        // Bệnh nhân
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

        // Chỉ định
        setText(
            "ctkqdService",
            data.tenDichVu
        );

        setText(
            "ctkqdDoctor",
            data.bacSiPhuTrach
        );

        // Mã tra cứu
        setText(
            "ctkqdResultCode",
            formatCode("KQ", data.maKetQua)
        );

        setText(
            "ctkqdOrderCode",
            formatCode("CD", data.maChiDinh)
        );

        setText(
            "ctkqdRecordCode",
            formatCode("HSBA", data.maHoSoBenhAn)
        );

        setText(
            "ctkqdResultDate",
            formatDate(data.ngayCoKetQua, true)
        );
    }

    // =====================================================
    // 8. HIỂN THỊ NỘI DUNG VÀ KẾT LUẬN
    // =====================================================

    function renderResult(data) {
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
    }

    // =====================================================
    // 9. KIỂM TRA URL TỆP ĐÍNH KÈM
    // =====================================================

    function safeFileUrl(value) {
        if (
            !value ||
            typeof value !== "string" ||
            !value.trim()
        ) {
            return null;
        }

        const raw = value.trim();

        // Không chấp nhận ký tự điều khiển trong URL.
        if (/[\u0000-\u001F\u007F]/.test(raw)) {
            return null;
        }

        try {
            let url;

            // URL đầy đủ HTTPS.
            if (/^https?:\/\//i.test(raw)) {
                url = new URL(raw);

            } else if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) {
                // Chặn javascript:, data:, file:...
                return null;

            } else if (raw.startsWith("//")) {
                return null;

            } else {
                // Đường dẫn tương đối từ máy chủ.
                url = new URL(
                    raw.startsWith("/") ? raw : "/" + raw,
                    window.location.origin
                );
            }

            // HTTPS được phép. HTTP chỉ cho phép
            // cùng origin của ứng dụng nội bộ.
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

    // =====================================================
    // 10. HIỂN THỊ TỆP ĐÍNH KÈM THẬT
    // =====================================================

    function renderAttachment(data) {
        const fileUrl = safeFileUrl(data.fileURL);

        fileBox.hidden = !fileUrl;
        noFileBox.hidden = Boolean(fileUrl);

        if (!fileUrl) {
            return;
        }

        let fileName = fileUrl.pathname
            .split("/")
            .filter(Boolean)
            .pop() || "Tệp kết quả";

        try {
            fileName = decodeURIComponent(fileName);
        } catch (_) {
            // Giữ nguyên nếu tên tệp mã hóa không hợp lệ.
        }

        setText(
            "ctkqdFileName",
            fileName
        );

        const previewLink = $("ctkqdPreview");
        const downloadLink = $("ctkqdDownload");

        previewLink.href = fileUrl.href;
        downloadLink.href = fileUrl.href;

        // Browser chỉ đảm bảo download đối với
        // tài nguyên cùng origin hỗ trợ tải xuống.
        if (fileUrl.origin === location.origin) {
            downloadLink.setAttribute(
                "download",
                fileName
            );
        } else {
            downloadLink.removeAttribute("download");
        }
    }

    // =====================================================
    // 11. THÔNG BÁO LỖI
    // =====================================================

    function showError(message) {
        console.error(
            "Chi tiết kết quả CLS:",
            message
        );

        if (!errorBox) return;

        errorBox.textContent = message;
        errorBox.hidden = false;
    }

    // =====================================================
    // 12. TẢI DỮ LIỆU
    // =====================================================

    async function loadDetail() {
        if (
            !Number.isInteger(maChiDinh) ||
            maChiDinh <= 0
        ) {
            showError(
                "Mã chỉ định không hợp lệ."
            );
            return;
        }

        try {
            const data = await apiGet(
                `${API}/${encodeURIComponent(maChiDinh)}`
            );

            if (
                !data ||
                Number(data.maChiDinh) !== maChiDinh
            ) {
                throw new Error(
                    "Dữ liệu kết quả không khớp mã chỉ định."
                );
            }

            renderSummary(data);
            renderResult(data);
            renderAttachment(data);

            if (errorBox) {
                errorBox.hidden = true;
            }

        } catch (error) {
            showError(error.message);

            setText(
                "ctkqdPatientName",
                "Không thể tải dữ liệu"
            );

            setText(
                "ctkqdContent",
                "Không có dữ liệu để hiển thị."
            );

            setText(
                "ctkqdConclusion",
                "Không có dữ liệu để hiển thị."
            );

            fileBox.hidden = true;
            noFileBox.hidden = false;
        }
    }

    // =====================================================
    // 13. KHỞI TẠO
    // =====================================================

    loadDetail();
});
