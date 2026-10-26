
document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    // =====================================================
    // 1. CẤU HÌNH
    // =====================================================

    const $ = id => document.getElementById(id);

    const API_CHI_TIET =
        "/api/chuyen-trach/danh-sach-chi-dinh";

    const API_LUOT_KHAM =
        "/api/chuyen-trach/luot-kham";

    const URL_NHAP_KET_QUA =
        "/ChuyenTrach/nhap-ket-qua/";

    const maChiDinh = Number(
        window.location.pathname
            .split("/")
            .filter(Boolean)
            .pop()
    );

    const errorBox = $("ctciError");
    const resultLink = $("ctciResultLink");
    const startClsButton = $("ctciStartCls");
    const statusElement = $("ctciClsStatus");

    let currentDetail = null;
    let isStartingCls = false;

    // =====================================================
    // 2. KIỂM TRA TOKEN
    // =====================================================

    function getToken() {
        return (
            sessionStorage.getItem("Token") ||
            localStorage.getItem("Token")
        );
    }

    function getHeaders() {
        const token = getToken();

        if (!token) {
            throw new Error(
                "Không tìm thấy phiên đăng nhập. " +
                "Vui lòng đăng nhập lại."
            );
        }

        return {
            "Accept": "application/json",
            "Authorization": `Bearer ${token}`
        };
    }

    // =====================================================
    // 3. GỌI API
    // =====================================================

    async function apiRequest(url, method = "GET") {
        const response = await fetch(url, {
            method: method,
            cache: "no-store",
            headers: getHeaders()
        });

        if (!response.ok) {
            let message =
                `Yêu cầu thất bại (HTTP ${response.status}).`;

            try {
                const errorData = await response.json();

                message =
                    errorData.detail ||
                    errorData.message ||
                    message;

            } catch (_) {
                // Giữ thông báo mặc định.
            }

            if (
                response.status === 401 ||
                response.status === 403
            ) {
                message =
                    "Phiên đăng nhập không hợp lệ " +
                    "hoặc bạn không có quyền thực hiện.";
            }

            if (response.status === 404) {
                message =
                    "Không tìm thấy chỉ định hoặc lượt khám.";
            }

            if (response.status === 409) {
                message =
                    "Trạng thái lượt khám đã thay đổi. " +
                    "Vui lòng tải lại dữ liệu.";
            }

            throw new Error(message);
        }

        // POST chuyển trạng thái thường trả JSON;
        // xử lý cả trường hợp response không có body.
        const text = await response.text();

        if (!text) {
            return {};
        }

        try {
            return JSON.parse(text);
        } catch (_) {
            return {};
        }
    }

    // =====================================================
    // 4. HÀM HIỂN THỊ DỮ LIỆU
    // =====================================================

    function setText(id, value) {
        const element = $(id);

        if (!element) {
            return;
        }

        element.textContent =
            value === null ||
            value === undefined ||
            value === ""
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

        return prefix +
            String(value).padStart(6, "0");
    }

    function formatDate(
        value,
        includeTime = false
    ) {
        if (!value) {
            return "—";
        }

        const raw = String(value);

        const normalized = raw.replace(" ", "T");
        const [date, time] = normalized.split("T");

        const parts = date.split("-");

        if (parts.length !== 3) {
            return raw;
        }

        let result =
            `${parts[2]}/${parts[1]}/${parts[0]}`;

        if (includeTime && time) {
            result += " " + time.slice(0, 5);
        }

        return result;
    }

    function formatTime(value) {
        if (!value) {
            return "—";
        }

        return String(value).slice(0, 5);
    }

    // =====================================================
    // 5. TÍNH TUỔI
    // =====================================================

    function calculateAge(birthDate) {
        if (!birthDate) {
            return "—";
        }

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

        const current = type => Number(
            nowParts.find(
                part => part.type === type
            )?.value
        );

        const currentYear = current("year");
        const currentMonth = current("month");
        const currentDay = current("day");

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
    // 6. THÔNG BÁO LỖI
    // =====================================================

    function showError(message) {
        console.error(
            "Chi tiết chỉ định CLS:",
            message
        );

        if (!errorBox) {
            return;
        }

        errorBox.textContent = message;
        errorBox.hidden = false;
    }

    function clearError() {
        if (!errorBox) {
            return;
        }

        errorBox.textContent = "";
        errorBox.hidden = true;
    }

    // =====================================================
    // 7. TRẠNG THÁI CHỈ ĐỊNH VÀ LƯỢT KHÁM
    // =====================================================

    function getClsStatus(data) {
        const trangThaiLuotKham =
            data.trangThaiLuotKham;

        const trangThaiChiDinh =
            data.trangThaiChiDinh;

        // Chỉ định đã hoàn thành được ưu tiên
        // khi hiển thị trạng thái của chỉ định này.
        if (trangThaiChiDinh === "DaHoanThanh") {
            return {
                label: "Đã hoàn thành",
                className: "done"
            };
        }

        if (trangThaiLuotKham === "ChoCLS") {
            return {
                label: "Chờ thực hiện",
                className: "waiting"
            };
        }

        if (trangThaiLuotKham === "DangCLS") {
            return {
                label: "Đang thực hiện",
                className: "doing"
            };
        }

        if (trangThaiLuotKham === "ChoKham") {
            return {
                label: "Chờ bác sĩ",
                className: "other"
            };
        }

        return {
            label:
                trangThaiLuotKham ||
                trangThaiChiDinh ||
                "Chưa xác định",
            className: "other"
        };
    }

    function getResultUrl(data) {
        const params = new URLSearchParams({
            maChiDinh: String(data.maChiDinh)
        });

        return (
            URL_NHAP_KET_QUA +
            encodeURIComponent(data.maLichKham) +
            "?" +
            params.toString()
        );
    }

    // =====================================================
    // 8. HIỂN THỊ THẺ TRẠNG THÁI VÀ CÁC NÚT
    // =====================================================

    function updateClsActions(data) {
        const status = getClsStatus(data);

        // Thẻ trạng thái phía trên ghi chú bác sĩ.
        if (statusElement) {
            statusElement.textContent = status.label;

            statusElement.className =
                "ctci-cls-status " +
                status.className;
        }

        const isCompleted =
            data.trangThaiChiDinh === "DaHoanThanh";

        // Chỉ hiện nút bắt đầu CLS khi lượt khám
        // đang ChoCLS và chỉ định chưa hoàn thành.
        const canStart =
            data.trangThaiLuotKham === "ChoCLS" &&
            !isCompleted;

        if (startClsButton) {
            startClsButton.hidden = !canStart;
            startClsButton.disabled =
                isStartingCls || !canStart;
        }

        // DangCLS: cho phép tiếp tục nhập kết quả
        // của chỉ định chưa hoàn thành.
        const canEnterResult =
            data.trangThaiLuotKham === "DangCLS" &&
            !isCompleted;

        if (resultLink) {
            resultLink.hidden = !canEnterResult;

            if (canEnterResult) {
                resultLink.href = getResultUrl(data);
            } else {
                resultLink.removeAttribute("href");
            }
        }
    }

    // =====================================================
    // 9. HIỂN THỊ THÔNG TIN BỆNH NHÂN
    // =====================================================

    function renderPatient(data) {
        setText(
            "ctciPatientName",
            data.tenBenhNhan
        );

        setText(
            "ctciPatientCode",
            formatCode("BN", data.maBenhNhan)
        );

        setText(
            "ctciPatientCodeDetail",
            formatCode("BN", data.maBenhNhan)
        );

        setText(
            "ctciPatientNameDetail",
            data.tenBenhNhan
        );

        setText(
            "ctciGender",
            data.gioiTinh
        );

        setText(
            "ctciBirthDate",
            formatDate(data.ngaySinh)
        );

        setText(
            "ctciAge",
            calculateAge(data.ngaySinh)
        );

        setText(
            "ctciPhone",
            data.soDienThoai
        );

        setText(
            "ctciAddress",
            data.diaChi
        );
    }

    // =====================================================
    // 10. HIỂN THỊ HỒ SƠ BỆNH ÁN VÀ LỊCH KHÁM
    // =====================================================

    function renderMedicalRecord(data) {
        setText(
            "ctciRecordCode",
            formatCode(
                "HSBA",
                data.maHoSoBenhAn
            )
        );

        setText(
            "ctciDepartment",
            data.tenKhoa
        );

        setText(
            "ctciAppointmentDate",
            formatDate(data.ngayKham)
        );

        setText(
            "ctciAppointmentTime",
            formatTime(data.gioKham)
        );

        setText(
            "ctciVisitDoctor",
            data.bacSiChiDinh
        );
    }

    // =====================================================
    // 11. HIỂN THỊ THÔNG TIN CHỈ ĐỊNH Y TẾ
    // =====================================================

    function renderOrder(data) {
        setText(
            "ctciOrderCode",
            formatCode("CD", data.maChiDinh)
        );

        setText(
            "ctciDoctor",
            data.bacSiChiDinh
        );

        setText(
            "ctciServiceName",
            data.dichVu
        );

        setText(
            "ctciServiceCode",
            data.maDichVu
        );

        setText(
            "ctciRoom",
            data.tenPhong
        );

        setText(
            "ctciOrderDate",
            formatDate(
                data.ngayChiDinh,
                true
            )
        );

        const note = data.ghiChuBacSi;

        setText(
            "ctciDoctorNote",
            typeof note === "string" &&
            note.trim()
                ? note
                : "Chưa có ghi chú của bác sĩ " +
                  "trong dữ liệu chỉ định."
        );
    }

    // =====================================================
    // 12. HIỂN THỊ TOÀN BỘ DỮ LIỆU
    // =====================================================

    function renderDetail(data) {
        currentDetail = data;

        renderPatient(data);

        renderMedicalRecord(data);

        renderOrder(data);

        updateClsActions(data);
    }

    // =====================================================
    // 13. TẢI CHI TIẾT CHỈ ĐỊNH
    // =====================================================

    async function loadDetail() {
        clearError();

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
            const data = await apiRequest(
                API_CHI_TIET +
                "/" +
                encodeURIComponent(maChiDinh)
            );

            if (
                !data ||
                Number(data.maChiDinh) !== maChiDinh
            ) {
                throw new Error(
                    "Dữ liệu chi tiết chỉ định không hợp lệ."
                );
            }

            renderDetail(data);

            clearError();

        } catch (error) {
            currentDetail = null;

            if (startClsButton) {
                startClsButton.hidden = true;
            }

            if (resultLink) {
                resultLink.hidden = true;
                resultLink.removeAttribute("href");
            }

            if (statusElement) {
                statusElement.textContent =
                    "Không thể tải trạng thái";

                statusElement.className =
                    "ctci-cls-status other";
            }

            showError(error.message);
        }
    }

    // =====================================================
    // 14. POPUP XÁC NHẬN
    // =====================================================

    // Nếu HTML đã có popup thì dùng popup có sẵn.
    // Nếu chưa có, tạo popup trong JS để tránh
    // lỗi do Thymeleaf loại bỏ phần ngoài fragment.

    function getConfirmDialog() {
        let dialog = $("ctciConfirmDialog");

        if (dialog) {
            document.body.appendChild(dialog);
            return dialog;
        }

        dialog = document.createElement("dialog");

        dialog.id = "ctciConfirmDialog";
        dialog.className = "ctci-confirm-dialog";

        dialog.setAttribute(
            "aria-labelledby",
            "ctciConfirmTitle"
        );

        dialog.innerHTML = `
            <div class="ctci-confirm-icon">
                <i class="fa-solid fa-stethoscope"></i>
            </div>

            <h3 id="ctciConfirmTitle">
                Xác nhận thực hiện CLS
            </h3>

            <p id="ctciConfirmMessage">
                Bạn có chắc chắn muốn bắt đầu
                thực hiện cận lâm sàng?
            </p>

            <div class="ctci-confirm-actions">
                <button
                    type="button"
                    id="ctciCancelStart"
                    class="ctci-btn ctci-btn-secondary">
                    Hủy
                </button>

                <button
                    type="button"
                    id="ctciAcceptStart"
                    class="ctci-btn ctci-btn-primary">
                    Xác nhận
                </button>
            </div>
        `;

        document.body.appendChild(dialog);

        return dialog;
    }

    const confirmDialog = getConfirmDialog();

    const cancelStartButton =
        $("ctciCancelStart");

    const acceptStartButton =
        $("ctciAcceptStart");

    const confirmMessage =
        $("ctciConfirmMessage");

    // =====================================================
    // 15. MỞ POPUP BẮT ĐẦU CLS
    // =====================================================

    function openStartConfirm() {
        if (
            isStartingCls ||
            !currentDetail
        ) {
            return;
        }

        const data = currentDetail;

        // Kiểm tra lại trạng thái trên dữ liệu
        // đang hiển thị. Backend sẽ kiểm tra
        // chính thức khi gọi API POST.
        if (
            data.trangThaiLuotKham !== "ChoCLS" ||
            data.trangThaiChiDinh === "DaHoanThanh"
        ) {
            showError(
                "Lượt khám không còn ở trạng thái " +
                "cho phép bắt đầu CLS."
            );

            return;
        }

        clearError();

        if (confirmMessage) {
            confirmMessage.textContent =
                "Bạn có chắc chắn muốn bắt đầu " +
                "thực hiện cận lâm sàng cho bệnh nhân " +
                (data.tenBenhNhan || "này") +
                "?";
        }

        if (
            confirmDialog &&
            !confirmDialog.open
        ) {
            confirmDialog.showModal();
        }
    }

    // =====================================================
    // 16. ĐÓNG POPUP
    // =====================================================

    function closeStartConfirm() {
        if (
            confirmDialog &&
            confirmDialog.open &&
            !isStartingCls
        ) {
            confirmDialog.close();
        }
    }

    // =====================================================
    // 17. THỰC HIỆN CLS
    // ChoCLS -> DangCLS
    // =====================================================

    async function startCls() {
        if (
            isStartingCls ||
            !currentDetail
        ) {
            return;
        }

        const data = currentDetail;

        if (
            data.trangThaiLuotKham !== "ChoCLS" ||
            data.trangThaiChiDinh === "DaHoanThanh"
        ) {
            if (confirmDialog.open) {
                confirmDialog.close();
            }

            showError(
                "Không thể bắt đầu CLS vì trạng thái " +
                "chỉ định hoặc lượt khám không phù hợp."
            );

            return;
        }

        isStartingCls = true;

        if (startClsButton) {
            startClsButton.disabled = true;
        }

        if (cancelStartButton) {
            cancelStartButton.disabled = true;
        }

        if (acceptStartButton) {
            acceptStartButton.disabled = true;
            acceptStartButton.textContent =
                "Đang xử lý...";
        }

        try {
            // API có sẵn trong
            // ChuyenTrachLuotKhamController.
            // Backend kiểm tra ChoCLS và cập nhật DangCLS.

            const result = await apiRequest(
                API_LUOT_KHAM +
                "/" +
                encodeURIComponent(data.maLichKham) +
                "/bat-dau",
                "POST"
            );

            // Nếu API có trả trạng thái thì kiểm tra
            // để tránh chuyển trang khi dữ liệu bất thường.
            if (
                result.trangThai &&
                result.trangThai !== "DangCLS"
            ) {
                throw new Error(
                    "API không xác nhận trạng thái DangCLS."
                );
            }

            if (confirmDialog.open) {
                confirmDialog.close();
            }

            // Chỉ chuyển trang khi POST thành công.
            window.location.assign(
                getResultUrl(data)
            );

        } catch (error) {
            console.error(
                "Lỗi bắt đầu CLS:",
                error
            );

            if (confirmDialog.open) {
                confirmDialog.close();
            }

            showError(error.message);

            // Tải lại trạng thái thực tế,
            // tránh sử dụng dữ liệu cũ.
            await loadDetail();

        } finally {
            isStartingCls = false;

            if (cancelStartButton) {
                cancelStartButton.disabled = false;
            }

            if (acceptStartButton) {
                acceptStartButton.disabled = false;
                acceptStartButton.textContent =
                    "Xác nhận";
            }

            if (
                startClsButton &&
                currentDetail
            ) {
                updateClsActions(currentDetail);
            }
        }
    }

    // =====================================================
    // 18. ĐĂNG KÝ SỰ KIỆN
    // =====================================================

    if (startClsButton) {
        startClsButton.addEventListener(
            "click",
            openStartConfirm
        );
    }

    if (cancelStartButton) {
        cancelStartButton.addEventListener(
            "click",
            closeStartConfirm
        );
    }

    if (acceptStartButton) {
        acceptStartButton.addEventListener(
            "click",
            startCls
        );
    }

    // Đóng popup khi nhấn Escape,
    // trừ lúc API đang cập nhật.
    if (confirmDialog) {
        confirmDialog.addEventListener(
            "cancel",
            event => {
                if (isStartingCls) {
                    event.preventDefault();
                }
            }
        );
    }

    // =====================================================
    // 19. KHỞI TẠO TRANG
    // =====================================================

    // Ẩn nút cho đến khi có dữ liệu thật.
    if (startClsButton) {
        startClsButton.hidden = true;
    }

    if (resultLink) {
        resultLink.hidden = true;
        resultLink.removeAttribute("href");
    }

    loadDetail();
});
