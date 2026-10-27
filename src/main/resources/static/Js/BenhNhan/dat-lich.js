
document.addEventListener("DOMContentLoaded", () => {
    // ==============================================
    // TRẠNG THÁI ĐẶT LỊCH
    // ==============================================
    const state = {
        step: 1,
        department: null,
        date: null,
        doctor: null,
        selectedTime: null,
        schedule: null, // Lịch làm việc đã chọn
        expandedDoctorId: null,
        doctors: [],
        calendarDate: new Date()
    };

    let departments = [];

    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => document.querySelectorAll(selector);

    const pad = (n) => String(n).padStart(2, "0");

    // ==============================================
    // HÀM HỖ TRỢ
    // ==============================================
    function formatDate(date) {
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }

    function formatVietnameseDate(dateString) {
        if (!dateString) return "Chưa chọn";

        const [year, month, day] = dateString.split("-");
        return `${day}/${month}/${year}`;
    }

    function showError(id, message) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = message || "";
        }
    }

    function getStoredValue(key) {
        return sessionStorage.getItem(key) || localStorage.getItem(key);
    }

    function getDepartmentId(department) {
        return department.maKhoa ?? department.MaKhoa;
    }

    function getDepartmentName(department) {
        return department.tenKhoa ?? department.TenKhoa ?? "";
    }

    function getDepartmentDescription(department) {
        return department.moTa ?? department.MoTa ?? "";
    }

    function getDepartmentPrice(department) {
        return department.giaKham ?? department.GiaKham ?? null;
    }

    // ==============================================
    // ĐỊNH DẠNG GIÁ KHÁM
    // ==============================================
    function formatDepartmentPrice(price) {
        if (price === null || price === undefined || price === "") {
            return "Chưa có giá";
        }

        // Hỗ trợ cả dữ liệu số và chuỗi số từ API.
        const amount = Number(price);

        if (!Number.isFinite(amount)) {
            return "Chưa có giá";
        }

        return `${new Intl.NumberFormat("vi-VN", {
            maximumFractionDigits: 2
        }).format(amount)} đ`;
    }

    // ==============================================
    // ICON VÀ MÀU CHUYÊN KHOA
    // ==============================================
    function getDepartmentIcon(name) {
        const value = (name || "")
            .normalize("NFC")
            .toLocaleLowerCase("vi");

        if (value.includes("nội")) return "🏢";
        if (value.includes("ngoại")) return "✂";
        if (value.includes("tim")) return "♥";
        if (value.includes("thần kinh")) return "✺";
        if (value.includes("tai") || value.includes("mũi")) return "♬";
        if (value.includes("da liễu")) return "☀";
        if (value.includes("nhi")) return "🧸";
        if (value.includes("sản")) return "🌸";
        if (value.includes("mắt")) return "👁";

        return "✚";
    }

    function getDepartmentColor(index) {
        const colors = [
            "blue",
            "green",
            "rose",
            "sky",
            "teal",
            "amber"
        ];

        return colors[Math.max(0, index) % colors.length];
    }

    // ==============================================
    // TẢI DANH SÁCH CHUYÊN KHOA
    // ==============================================
    async function loadDepartments() {
        const list = $("#departmentList");

        if (!list) {
            console.error("Không tìm thấy phần tử #departmentList.");
            return;
        }

        list.replaceChildren();

        const loading = document.createElement("div");
        loading.className = "loading-state";
        loading.textContent = "Đang tải danh sách chuyên khoa...";
        list.appendChild(loading);

        try {
            const token = getStoredValue("Token");

            const headers = {
                Accept: "application/json"
            };

            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }

            const response = await fetch("/api/khoa", {
                method: "GET",
                headers
            });

            if (!response.ok) {
                throw new Error(
                    response.status === 403
                        ? "Bạn chưa có quyền truy cập danh sách chuyên khoa (403). Hãy kiểm tra SecurityConfig."
                        : `Không thể tải danh sách chuyên khoa (HTTP ${response.status}).`
                );
            }

            const data = await response.json();

            if (!Array.isArray(data)) {
                throw new Error("Dữ liệu API khoa không đúng định dạng danh sách.");
            }

            departments = data;

            console.log("Danh sách khoa từ API:", departments);

            // Kiểm tra giá khám được trả về từ backend.
            departments.forEach((department) => {
                console.log(
                    `Khoa: ${getDepartmentName(department)} | Giá khám:`,
                    getDepartmentPrice(department)
                );
            });

            renderDepartments(getFilteredDepartments());
            showError("departmentError", "");

        } catch (error) {
            console.error("Lỗi tải danh sách khoa:", error);

            list.replaceChildren();

            const errorBox = document.createElement("div");
            errorBox.className = "empty-state";
            errorBox.textContent =
                error.message || "Không thể tải danh sách chuyên khoa.";

            list.appendChild(errorBox);

            const nextButton =
                $('[data-next="2"]') || $("#nextDepartment");

            if (nextButton) {
                nextButton.disabled = true;
            }
        }
    }

    // ==============================================
    // LỌC DANH SÁCH CHUYÊN KHOA
    // ==============================================
    function getFilteredDepartments() {
        const keyword = ($("#departmentSearch")?.value || "")
            .trim()
            .toLocaleLowerCase("vi");

        return departments.filter((department) => {
            const name = getDepartmentName(department);
            const description = getDepartmentDescription(department);

            return (
                name.toLocaleLowerCase("vi").includes(keyword) ||
                description.toLocaleLowerCase("vi").includes(keyword)
            );
        });
    }

    // ==============================================
    // HIỂN THỊ DANH SÁCH CHUYÊN KHOA
    // Chỉ sử dụng MỘT hàm renderDepartments duy nhất.
    // ==============================================
    function renderDepartments(items) {
        const list = $("#departmentList");

        if (!list) return;

        list.replaceChildren();

        const nextButton =
            $('[data-next="2"]') || $("#nextDepartment");

        if (!Array.isArray(items) || items.length === 0) {
            const empty = document.createElement("div");
            empty.className = "empty-state";
            empty.textContent = "Không tìm thấy chuyên khoa phù hợp.";

            list.appendChild(empty);

            if (nextButton) {
                nextButton.disabled = !state.department;
            }

            return;
        }

        items.forEach((department) => {
            const id = getDepartmentId(department);
            const name = getDepartmentName(department);
            const description = getDepartmentDescription(department);
            const price = getDepartmentPrice(department);

            if (id == null || !name) return;

            const selected =
                state.department !== null &&
                String(state.department.id) === String(id);

            // Nút chọn khoa.
            const button = document.createElement("button");
            button.type = "button";
            button.className = "department-option";
            button.classList.toggle("selected", selected);
            button.setAttribute("aria-pressed", String(selected));

            // Icon khoa.
            const icon = document.createElement("span");
            icon.className = "option-icon";

            const originalIndex = departments.findIndex(
                (item) =>
                    String(getDepartmentId(item)) === String(id)
            );

            icon.dataset.color = getDepartmentColor(originalIndex);
            icon.textContent = getDepartmentIcon(name);
            icon.setAttribute("aria-hidden", "true");

            // Nội dung khoa.
            const details = document.createElement("span");
            details.className = "option-details";

            // Dòng tên khoa + giá khám.
            const titleRow = document.createElement("span");
            titleRow.className = "department-title-row";

            const title = document.createElement("strong");
            title.className = "department-name";
            title.textContent = name;

            // Hiển thị giá khám ngay bên cạnh tên khoa.
            const priceElement = document.createElement("span");
            priceElement.className = "department-price";
            priceElement.textContent = formatDepartmentPrice(price);
            priceElement.setAttribute(
                "aria-label",
                `Giá khám: ${formatDepartmentPrice(price)}`
            );

            titleRow.append(title, priceElement);

            // Mô tả khoa.
            const descriptionElement = document.createElement("span");
            descriptionElement.className = "department-description";
            descriptionElement.textContent =
                description.trim() || `Khám và điều trị tại ${name}`;

            details.append(titleRow, descriptionElement);

            // Dấu tích khi chọn khoa.
            const check = document.createElement("span");
            check.className = "option-check";
            check.textContent = "✓";
            check.hidden = !selected;
            check.setAttribute("aria-label", "Đã chọn");

            button.append(icon, details, check);

            // Sự kiện chọn khoa.
            button.addEventListener("click", () => {
                state.department = {
                    id,
                    name,
                    price
                };

                // Đổi khoa thì bỏ ngày khám và bác sĩ cũ.
                state.date = null;
                state.doctor = null;
                state.doctors = [];
                state.schedule = null;
                state.selectedTime = null;

                renderDepartments(getFilteredDepartments());
                updateSummary();

                const selectedLabel = $("#selectedDepartmentLabel");
                if (selectedLabel) {
                    selectedLabel.textContent = name;
                }

                showError("departmentError", "");
                showError("dateError", "");
                showError("doctorError", "");

                const nextDateButton = $("#nextDate");
                if (nextDateButton) {
                    nextDateButton.disabled = true;
                }
            });

            list.appendChild(button);
        });

        if (nextButton) {
            nextButton.disabled = !state.department;
        }
    }

    // ==============================================
    // CẬP NHẬT THÔNG TIN TÓM TẮT
    // ==============================================
    function updateSummary() {
        const summaryDepartment = $("#summaryDepartment");
        const summaryDate = $("#summaryDate");
        const summaryDoctor = $("#summaryDoctor");
        const summaryTime = $("#summaryTime");

        if (summaryDepartment) {
            summaryDepartment.textContent =
                state.department?.name || "Chưa chọn";
        }

        if (summaryDate) {
            summaryDate.textContent =
                formatVietnameseDate(state.date);
        }

        if (summaryDoctor) {
            summaryDoctor.textContent = state.doctor
                ? getDoctorName(state.doctor)
                : "Chưa chọn";
        }

        if (summaryTime) {
            summaryTime.textContent = state.selectedTime
                ? `${state.selectedTime.gioBatDau} - ${state.selectedTime.gioKetThuc}`
                : "Chưa chọn";
        }
    }

    // ==============================================
    // BƯỚC 3: CHỌN BÁC SĨ
    // ==============================================

    function getDoctorId(doctor) {
        return doctor.maBacSi ?? doctor.MaBacSi;
    }

    function getDoctorName(doctor) {
        return doctor.hoTen ?? doctor.HoTen ?? "Bác sĩ";
    }

    function getDoctorDegree(doctor) {
        return doctor.trinhDo ?? doctor.TrinhDo ?? "";
    }

    function getDoctorSpecialty(doctor) {
        return doctor.chuyenMon ?? doctor.ChuyenMon ?? "";
    }

    function getDoctorImage(doctor) {
        // Chỉ trả về fileKey lấy từ CSDL, KHÔNG tạo URL API ở đây.
        const value = doctor.anhDaiDien ?? doctor.AnhDaiDien ?? "";

        return typeof value === "string" ? value.trim() : "";
    }

    function getDoctorRoom(doctor) {
        return doctor.tenPhong ?? doctor.TenPhong ?? "";
    }

    function getDoctorScheduleId(doctor) {
        return doctor.maLichLamViec ?? doctor.MaLichLamViec;
    }

    // ==========================================
    // load anh bac si
    // ==========================================
    async function loadDoctorImage(img, fileKey, fallbackIcon) {
        if (!fileKey) {
            img.remove();
            fallbackIcon.textContent = "⚕";
            return;
        }

        try {
            const token = getStoredValue("Token");

            const response = await fetch(
                `/api/images/view?fileKey=${encodeURIComponent(fileKey)}`,
                {
                    method: "GET",
                    headers: {
                        Accept: "image/*",
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Không tải được ảnh: HTTP ${response.status}`);
            }

            const imageBlob = await response.blob();

            if (!imageBlob.type.startsWith("image/")) {
                throw new Error("API không trả về dữ liệu ảnh.");
            }

            img.src = URL.createObjectURL(imageBlob);
            img.hidden = false;
        } catch (error) {
            console.error("Lỗi tải ảnh bác sĩ:", {
                fileKey,
                error
            });

            img.remove();
            fallbackIcon.textContent = "⚕";
        }
    }

    // ========================================
    // lay khung gio
    // ========================================
    async function fetchDoctorTimeSlots(maBacSi) {
        const token = getStoredValue("Token");

        const params = new URLSearchParams({
            maBacSi: String(maBacSi),
            ngayKham: state.date
        });

        const response = await fetch(
            `/api/bac-si/lich-lam-viec/khung-gio?${params}`,
            {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Không thể tải khung giờ (HTTP ${response.status}).`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("Dữ liệu khung giờ không hợp lệ.");
        }

        return data;
    }
    // =========================================
    // load bac si
    // =========================================
    async function loadDoctors() {
        const list = $("#doctorList");
        const nextButton = $("#nextDoctor");

        if (!list || !state.department || !state.date) {
            return;
        }

        // Chỉ xóa lựa chọn khi tải danh sách cho khoa/ngày mới.
        state.doctor = null;
        state.doctors = [];

        if (nextButton) {
            nextButton.disabled = true;
        }

        showError("doctorError", "");

        list.replaceChildren();

        const loading = document.createElement("div");
        loading.className = "loading-state";
        loading.textContent = "Đang tải danh sách bác sĩ...";
        list.appendChild(loading);

        const params = new URLSearchParams({
            maKhoa: String(state.department.id),
            ngayLamViec: state.date
        });

        try {

            const token = getStoredValue("Token");

            if (!token) {
                throw new Error("Bạn cần đăng nhập để xem danh sách bác sĩ.");
            }

            const response = await fetch(
                `/api/bac-si/lich-lam-viec/danh-sach?${params.toString()}`,
                {
                    method: "GET",
                    headers: {
                        Accept: "application/json",
                        Authorization: `Bearer ${token}`
                    }
                }
            );



            if (!response.ok) {
                throw new Error(
                    `Không thể tải danh sách bác sĩ (HTTP ${response.status}).`
                );
            }

            const data = await response.json();

            if (!Array.isArray(data)) {
                throw new Error("Dữ liệu danh sách bác sĩ không hợp lệ.");
            }

            state.doctors = data;
            renderDoctors(getFilteredDoctors());

        } catch (error) {
            console.error("Lỗi tải bác sĩ:", error);

            list.replaceChildren();

            const empty = document.createElement("div");
            empty.className = "empty-state";
            empty.textContent =
                error.message || "Không thể tải danh sách bác sĩ.";

            list.appendChild(empty);
        }
    }

    function getFilteredDoctors() {
        const keyword = ($("#doctorSearch")?.value || "")
            .trim()
            .toLocaleLowerCase("vi");

        return state.doctors.filter((doctor) => {
            const content = [
                getDoctorName(doctor),
                getDoctorDegree(doctor),
                getDoctorSpecialty(doctor),
                getDoctorRoom(doctor)
            ].join(" ").toLocaleLowerCase("vi");

            return content.includes(keyword);
        });
    }

    // =====================================
    // lịch làm việc của cùng một bác sĩ, tạo nút mở rộng, tải giờ khám và hiển thị thông tin chi tiết.
    // =====================================
    function renderDoctors(doctors) {
        const list = $("#doctorList");
        const nextButton = $("#nextDoctor");

        if (!list) return;

        list.replaceChildren();

        // Một bác sĩ có thể có nhiều lịch làm việc trong ngày.
        const uniqueDoctors = [
            ...new Map(
                doctors.map(doctor => [String(getDoctorId(doctor)), doctor])
            ).values()
        ];

        if (!uniqueDoctors.length) {
            const empty = document.createElement("div");
            empty.className = "empty-state";
            empty.textContent = "Không có bác sĩ có lịch làm việc trong ngày đã chọn.";
            list.appendChild(empty);

            if (nextButton) nextButton.disabled = true;
            return;
        }

        uniqueDoctors.forEach(doctor => {
            const doctorId = getDoctorId(doctor);
            if (doctorId == null) return;

            const selected = state.doctor &&
                String(getDoctorId(state.doctor)) === String(doctorId);

            const card = document.createElement("div");
            card.className = "doctor-card";

            const button = document.createElement("button");
            button.type = "button";
            button.className = "doctor-option";
            button.classList.toggle("selected", Boolean(selected));
            button.setAttribute("aria-expanded",
                String(String(state.expandedDoctorId) === String(doctorId)));

            const icon = document.createElement("span");
            icon.className = "option-icon";

            const fileKey = getDoctorImage(doctor);

            if (fileKey) {
                const img = document.createElement("img");
                img.alt = "";
                img.loading = "lazy";
                img.hidden = true;
                icon.appendChild(img);
                loadDoctorImage(img, fileKey, icon);
            } else {
                icon.textContent = "⚕";
            }

            const details = document.createElement("span");
            details.className = "option-details";

            const name = document.createElement("strong");
            name.textContent = getDoctorName(doctor);

            const specialty = document.createElement("small");
            specialty.textContent = [
                getDoctorDegree(doctor),
                getDoctorSpecialty(doctor)
            ].filter(Boolean).join(" · ") || "Chưa cập nhật chuyên môn";

            const room = document.createElement("small");
            room.textContent = getDoctorRoom(doctor)
                ? `Phòng khám: ${getDoctorRoom(doctor)}`
                : "Phòng khám: Chưa cập nhật";

            details.append(name, specialty, room);

            const arrow = document.createElement("span");
            arrow.className = "doctor-expand-arrow";
            arrow.textContent =
                String(state.expandedDoctorId) === String(doctorId) ? "⌃" : "⌄";

            arrow.setAttribute("aria-hidden", "true");

            button.append(icon, details, arrow);

            const extra = document.createElement("div");
            extra.className = "doctor-card-extra";
            extra.hidden = String(state.expandedDoctorId) !== String(doctorId);

            const infoButton = document.createElement("button");
            infoButton.type = "button";
            infoButton.className = "doctor-detail-link";
            infoButton.textContent = "ⓘ Thông tin bác sĩ";

            infoButton.addEventListener("click", event => {
                event.stopPropagation();
                showDoctorDetail(doctor);
            });

            const timeHeading = document.createElement("div");
            timeHeading.className = "doctor-time-heading";
            timeHeading.textContent = "KHUNG GIỜ KHÁM";

            const timeGrid = document.createElement("div");
            timeGrid.className = "doctor-time-grid";
            timeGrid.innerHTML =
                '<p class="loading-state">Đang tải khung giờ...</p>';

            extra.append(infoButton, timeHeading, timeGrid);

            button.addEventListener("click", async () => {
                const isExpanded =
                    String(state.expandedDoctorId) === String(doctorId);

                state.expandedDoctorId = isExpanded ? null : doctorId;

                if (!isExpanded) {
                    // Chỉ chọn bác sĩ khi người dùng chọn giờ cụ thể.
                    renderDoctors(getFilteredDoctors());

                    const currentExtra = [...list.querySelectorAll(".doctor-card")]
                        .find(el => {
                            const b = el.querySelector(".doctor-option");
                            return b?.getAttribute("aria-expanded") === "true"
                                && b.querySelector(".option-details strong")?.textContent
                                    === getDoctorName(doctor);
                        })?.querySelector(".doctor-time-grid");

                    if (!currentExtra) return;

                    try {
                        const slots = await fetchDoctorTimeSlots(doctorId);

                        // Kiểm tra thẻ vẫn đang mở trước khi cập nhật.
                        if (String(state.expandedDoctorId) !== String(doctorId)) return;

                        renderDoctorTimeSlots(currentExtra, doctor, slots);
                    } catch (error) {
                        currentExtra.replaceChildren();

                        const errorText = document.createElement("p");
                        errorText.className = "error-message";
                        errorText.textContent = error.message;
                        currentExtra.appendChild(errorText);
                    }
                } else {
                    renderDoctors(getFilteredDoctors());
                }
            });

            card.append(button, extra);
            list.appendChild(card);
        });

        if (nextButton) {
            nextButton.disabled = !state.doctor || !state.selectedTime;
        }
    }

    // ============================================
    // render khung gio
    // ============================================
    function renderDoctorTimeSlots(container, doctor, slots) {
        container.replaceChildren();

        if (!slots.length) {
            const empty = document.createElement("p");
            empty.textContent = "Bác sĩ chưa có khung giờ khám trong ngày này.";
            container.appendChild(empty);
            return;
        }

        const now = new Date();
        const todayString = formatDate(now);

        slots.forEach(slot => {
            const start = String(slot.gioBatDau ?? "").slice(0, 5);
            const end = String(slot.gioKetThuc ?? "").slice(0, 5);

            if (!start || !end) return;

            const isPast = state.date < todayString ||
                (state.date === todayString &&
                 start <= `${pad(now.getHours())}:${pad(now.getMinutes())}`);

            const isFull = Boolean(slot.hetCho) ||
                Number(slot.conTrong ?? 1) <= 0;

            const isSelected = state.selectedTime &&
                String(getDoctorId(state.doctor)) === String(getDoctorId(doctor)) &&
                state.selectedTime.gioBatDau === start &&
                state.selectedTime.gioKetThuc === end;

            const button = document.createElement("button");
            button.type = "button";
            button.className = "doctor-time-slot";
            button.classList.toggle("selected", Boolean(isSelected));
            button.disabled = isPast || isFull;

            const time = document.createElement("strong");
            time.textContent = `${start} - ${end}`;

            const status = document.createElement("small");
            status.textContent = isPast
                ? "Đã qua giờ"
                : isFull
                    ? "Đã hết chỗ"
                    : `Còn ${slot.conTrong ?? "?"} chỗ`;

            button.append(time, status);

            button.addEventListener("click", () => {
                if (button.disabled) return;


            state.doctor = doctor;

            // Lấy mã lịch làm việc từ khung giờ API trả về.
            // Ưu tiên mã nằm trên slot vì một bác sĩ có thể có nhiều ca.
            const maLichLamViec =
                slot.maLichLamViec ??
                slot.MaLichLamViec ??
                getDoctorScheduleId(doctor);

            if (maLichLamViec == null) {
                showError(
                    "doctorError",
                    "Khung giờ chưa có mã lịch làm việc. Vui lòng kiểm tra API khung giờ."
                );
                return;
            }

            state.schedule = {
                maLichLamViec: Number(maLichLamViec)
            };

            state.selectedTime = {
                gioBatDau: start,
                gioKetThuc: end
            };


                showError("doctorError", "");
                updateSummary();

                // Cập nhật nút giờ đang chọn trực tiếp,
                // không render lại toàn bộ danh sách bác sĩ.
                container.querySelectorAll(".doctor-time-slot").forEach(slotButton => {
                    slotButton.classList.remove("selected");
                    slotButton.setAttribute("aria-pressed", "false");
                });

                button.classList.add("selected");
                button.setAttribute("aria-pressed", "true");

                // Cập nhật trạng thái chọn bác sĩ.
                document.querySelectorAll("#doctorList .doctor-option").forEach(doctorButton => {
                    const detailsName = doctorButton.querySelector(
                        ".option-details strong"
                    );

                    const isSelected =
                        detailsName?.textContent === getDoctorName(doctor);

                    doctorButton.classList.toggle("selected", isSelected);
                    doctorButton.setAttribute("aria-pressed", String(isSelected));
                });

                // Cập nhật giờ đã chọn.
                const selectedBox = $("#selectedTimeBox");
                const selectedLabel = $("#selectedTimeLabel");

                if (selectedBox) selectedBox.hidden = false;

                if (selectedLabel) {
                    selectedLabel.textContent = `${start} - ${end}`;
                }

                const confirmTime = $("#confirmTime");
                if (confirmTime) {
                    confirmTime.textContent = `${start} - ${end}`;
                }

                const nextButton = $("#nextDoctor");
                if (nextButton) nextButton.disabled = false;
            });

            container.appendChild(button);
        });
    }

    // =============================================
    // xem thông tin bác sĩ
    // =============================================
    function showDoctorDetail(doctor) {
        document.querySelector(".doctor-detail-modal")?.remove();

        const overlay = document.createElement("div");
        overlay.className = "doctor-detail-modal";

        const dialog = document.createElement("div");
        dialog.className = "doctor-detail-dialog";
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");

        const title = document.createElement("h3");
        title.textContent = getDoctorName(doctor);

        const fields = [
            ["Trình độ", getDoctorDegree(doctor)],
            ["Chuyên môn", getDoctorSpecialty(doctor)],
            ["Phòng khám", getDoctorRoom(doctor)],
            ["Số chứng chỉ hành nghề",
                doctor.soChungChiHanhNghe ?? doctor.SoChungChiHanhNghe ?? ""]
        ];

        dialog.appendChild(title);

        fields.forEach(([label, value]) => {
            if (!value) return;

            const p = document.createElement("p");
            p.textContent = `${label}: ${value}`;
            dialog.appendChild(p);
        });

        const close = document.createElement("button");
        close.type = "button";
        close.className = "button button-primary";
        close.textContent = "Đóng";
        close.addEventListener("click", () => overlay.remove());

        dialog.appendChild(close);
        overlay.appendChild(dialog);

        overlay.addEventListener("click", event => {
            if (event.target === overlay) overlay.remove();
        });

        document.body.appendChild(overlay);
        close.focus();
    }
    // ==============================================
    // lấy chỗ
    // ==============================================
    async function loadDoctorTimeSlots(maBacSi, ngayKham) {
        const token = getStoredValue("Token");

        const params = new URLSearchParams({
            maBacSi: String(maBacSi),
            ngayKham: ngayKham
        });

        const response = await fetch(
            `/api/bac-si/lich-lam-viec/khung-gio?${params.toString()}`,
            {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    ...(token
                        ? { Authorization: `Bearer ${token}` }
                        : {})
                }
            }
        );

        if (!response.ok) {
            throw new Error(
                `Không thể tải khung giờ khám (HTTP ${response.status}).`
            );
        }

        return await response.json();
    }

    // ==============================================
    // CHUYỂN BƯỚC ĐẶT LỊCH
    // ==============================================

    function showStep(step) {
        state.step = step;

        // Hiển thị nội dung của bước hiện tại.
        $$(".booking-step").forEach((panel) => {
            const active = Number(panel.dataset.step) === step;
            panel.hidden = !active;
            panel.classList.toggle("active", active);
        });

        // Cập nhật thanh tiến trình theo HTML hiện tại.
        $$(".stepper .step").forEach((item) => {
            const number = Number(item.dataset.stepIndicator);
            const numberElement = item.querySelector(".step-number");

            item.classList.toggle("active", number === step);
            item.classList.toggle("completed", number < step);

            if (numberElement) {
                numberElement.textContent =
                    number < step ? "✓" : String(number);
            }
        });

        updateSummary();

        if (step === 2) {
            const label = $("#selectedDepartmentLabel");
            if (label) {
                label.textContent = state.department?.name || "Chưa chọn";
            }

            renderCalendar();
        }

        if (step === 3) {
            const label = $("#selectedDateLabel");
            if (label) {
                label.textContent = formatVietnameseDate(state.date);
            }
            loadDoctors();
        }

        if (step === 4) {
            const department = $("#confirmDepartment");
            const date = $("#confirmDate");
            const doctor = $("#confirmDoctor");
            const timeRoom = $("#confirmTimeRoom");
            const confirmPrice = $("#confirmPrice");

            if (department) {
                department.textContent = state.department?.name || "—";
            }

            if (date) {
                date.textContent = formatVietnameseDate(state.date);
            }

            if (doctor) {
                doctor.textContent = state.doctor
                    ? getDoctorName(state.doctor)
                    : "—";
            }

            if (timeRoom) {
                const time = state.selectedTime
                    ? `${state.selectedTime.gioBatDau} - ${state.selectedTime.gioKetThuc}`
                    : "";

                const room = state.doctor
                    ? getDoctorRoom(state.doctor)
                    : "";

                timeRoom.textContent = [time, room].filter(Boolean).join(", ") || "—";
            }

            if (confirmPrice) {
                confirmPrice.textContent = formatDepartmentPrice(
                    state.department?.price
                );
            }
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
    }


    // ==============================================
    // LỊCH KHÁM
    // ==============================================

    function renderCalendar() {
        const monthElement = $("#calendarMonth");
        const daysElement = $("#calendarDays");

        if (!monthElement || !daysElement) return;

        const year = state.calendarDate.getFullYear();
        const month = state.calendarDate.getMonth();

        // Hiển thị tháng, ví dụ: Tháng 10, 2026.
        monthElement.textContent = `Tháng ${month + 1}, ${year}`;

        daysElement.replaceChildren();

        // JavaScript: Chủ nhật = 0, thứ hai = 1, ..., thứ bảy = 6.
        // Khớp với thứ tự S M T W T F S.
        const firstWeekday = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Tạo ô trống trước ngày đầu tiên của tháng.
        for (let i = 0; i < firstWeekday; i++) {
            const blank = document.createElement("span");
            blank.className = "calendar-empty";
            blank.setAttribute("aria-hidden", "true");
            daysElement.appendChild(blank);
        }

        // Tạo các ngày trong tháng.
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateString = formatDate(date);

            const button = document.createElement("button");
            button.type = "button";
            button.className = "calendar-day";
            button.textContent = String(day);

            const isPast = date < today;
            const isToday = date.getTime() === today.getTime();
            const isSelected = state.date === dateString;

            // Không cho chọn ngày trong quá khứ.
            button.disabled = isPast;

            button.setAttribute(
                "aria-label",
                date.toLocaleDateString("vi-VN")
            );

            button.setAttribute("aria-pressed", String(isSelected));

            if (isToday) {
                button.classList.add("today");
            }

            if (isSelected) {
                button.classList.add("selected");
            }

            button.addEventListener("click", () => {
                if (button.disabled) return;

                // Lưu ngày đã chọn theo định dạng YYYY-MM-DD.
                state.date = dateString;

                // Khi đổi ngày, bỏ chọn bác sĩ cũ.
                state.doctor = null;

                // Khi đổi ngày, xóa lịch làm việc và giờ khám cũ.
                state.schedule = null;
                state.selectedTime = null;

                // Cập nhật giao diện và thông tin tóm tắt.
                renderCalendar();
                updateSummary();

                const selectedDateLabel = $("#selectedDateLabel");

                if (selectedDateLabel) {
                    selectedDateLabel.textContent =
                        formatVietnameseDate(state.date);
                }

                const nextDateButton = $("#nextDate");

                if (nextDateButton) {
                    nextDateButton.disabled = false;
                }

                showError("dateError", "");
                showError("doctorError", "");
            });

            daysElement.appendChild(button);
        }

        // Không cho quay về tháng trước tháng hiện tại.
        const previousMonthButton = $("#previousMonth");

        if (previousMonthButton) {
            previousMonthButton.disabled =
                year === today.getFullYear() &&
                month <= today.getMonth();
        }

        // Chỉ bật Tiếp tục khi đã chọn ngày.
        const nextDateButton = $("#nextDate");

        if (nextDateButton) {
            nextDateButton.disabled = !state.date;
        }
    }


    // ==============================================
    // ĐIỀU HƯỚNG THÁNG
    // ==============================================
    $("#previousMonth")?.addEventListener("click", () => {
        state.calendarDate = new Date(
            state.calendarDate.getFullYear(),
            state.calendarDate.getMonth() - 1,
            1
        );

        renderCalendar();
    });

    $("#nextMonth")?.addEventListener("click", () => {
        state.calendarDate = new Date(
            state.calendarDate.getFullYear(),
            state.calendarDate.getMonth() + 1,
            1
        );

        renderCalendar();
    });

    // ==============================================
    // NÚT TIẾP TỤC
    // ==============================================
    $$("[data-next]").forEach((button) => {
        button.addEventListener("click", () => {
            const target = Number(button.dataset.next);

            if (target === 2 && !state.department) {
                showError(
                    "departmentError",
                    "Vui lòng chọn chuyên khoa."
                );
                return;
            }

            if (target === 3 && !state.date) {
                showError(
                    "dateError",
                    "Vui lòng chọn ngày khám."
                );
                return;
            }

            if (target === 4 && (!state.doctor || !state.selectedTime)) {
                showError("doctorError", "Vui lòng chọn bác sĩ và khung giờ khám.");
                return;
            }

            showStep(target);
        });
    });

    // =============================================
    // mo rong bac si  css
    // =============================================
    function addDoctorBookingStyles() {
        if (document.getElementById("doctor-booking-extra-styles")) return;

        const style = document.createElement("style");
        style.id = "doctor-booking-extra-styles";

        style.textContent = `
            .doctor-option {
                width: 100%;
                text-align: left;
            }

            .doctor-card-extra {
                padding: 18px 20px;
                border: 1px solid #dbeafe;
                border-top: 0;
                border-radius: 0 0 16px 16px;
                background: #fff;
                margin: -8px 0 14px;
            }

            .doctor-detail-link {
                border: 0;
                padding: 8px 0;
                background: transparent;
                color: #2563eb;
                cursor: pointer;
                font: inherit;
            }

            .doctor-time-heading {
                margin: 14px 0 12px;
                font-weight: 700;
                color: #1e293b;
            }

            .doctor-time-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 10px;

                /* Thanh cuộn riêng cho danh sách khung giờ */
                max-height: 320px;
                overflow-y: auto;
                overflow-x: hidden;

                /* Tạo khoảng trống để nút giờ không sát thanh cuộn */
                padding: 2px 8px 8px 2px;
                overscroll-behavior: contain;
                scrollbar-width: thin;
                scrollbar-color: #93c5fd #f1f5f9;
            }

            .doctor-time-grid::-webkit-scrollbar {
                width: 6px;
            }

            .doctor-time-grid::-webkit-scrollbar-track {
                background: #f1f5f9;
                border-radius: 10px;
            }

            .doctor-time-grid::-webkit-scrollbar-thumb {
                background: #93c5fd;
                border-radius: 10px;
            }

            .doctor-time-grid::-webkit-scrollbar-thumb:hover {
                background: #2563eb;
            }

            .doctor-time-slot {
                min-height: 76px;
                padding: 12px 8px;
                border: 1px solid #dbe3ee;
                border-radius: 15px;
                background: #fff;
                color: #2563eb;
                cursor: pointer;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 7px;
            }

            .doctor-time-slot strong {
                font-size: 14px;
            }

            .doctor-time-slot small {
                color: #64748b;
            }

            .doctor-time-slot:hover:not(:disabled),
            .doctor-time-slot.selected {
                border: 2px solid #2563eb;
                background: #dbeafe;
                color: #1e293b;
            }

            .doctor-time-slot.selected small {
                color: #2563eb;
            }

            .doctor-time-slot:disabled {
                color: #b8c4d4;
                background: #f1f5f9;
                border-color: #e8edf4;
                cursor: not-allowed;
            }

            .doctor-time-slot:disabled small {
                color: #b8c4d4;
            }

            .doctor-detail-modal {
                position: fixed;
                inset: 0;
                z-index: 9999;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 20px;
                background: rgb(15 23 42 / 50%);
            }

            .doctor-detail-dialog {
                width: min(480px, 100%);
                max-height: 85vh;
                overflow: auto;
                padding: 24px;
                border-radius: 20px;
                background: #fff;
                box-shadow: 0 20px 60px rgb(15 23 42 / 20%);
            }

            .doctor-detail-dialog h3 {
                margin-top: 0;
                color: #2563eb;
            }

            .doctor-detail-dialog p {
                color: #475569;
                line-height: 1.6;
                overflow-wrap: anywhere;
            }

            @media (max-width: 480px) {
                .doctor-time-grid {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }

                .doctor-card-extra {
                    padding: 14px 12px;
                }
            }

            .doctor-expand-arrow {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                width: auto;
                height: auto;
                padding: 0;
                border: none;
                border-radius: 0;
                background: transparent;
                color: #475569;
                font-size: 23px;
                font-weight: 400;
                line-height: 1;
            }

            .doctor-option.selected .doctor-expand-arrow {
                background: transparent;
                color: #475569;
            }
        `;

        document.head.appendChild(style);
    }
    // ==============================================
    // NÚT QUAY LẠI
    // ==============================================
    $$("[data-back]").forEach((button) => {
        button.addEventListener("click", () => {
            showStep(Number(button.dataset.back));
        });
    });

    // ==============================================
    // TÌM KIẾM CHUYÊN KHOA
    // ==============================================
    $("#departmentSearch")?.addEventListener("input", () => {
        renderDepartments(getFilteredDepartments());
        showError("departmentError", "");
    });

    // ==============================================
    // TÌM KIẾM BÁC SĨ
    // ==============================================
   $("#doctorSearch")?.addEventListener("input", () => {
       renderDoctors(getFilteredDoctors());
       showError("doctorError", "");
   });

    // ==============================================
    // LÝ DO KHÁM
    // ==============================================
    $("#reason")?.addEventListener("input", (event) => {
        const reasonCount = $("#reasonCount");

        if (reasonCount) {
            reasonCount.textContent = event.target.value.length;
        }
    });


    // ==============================================
    // XÁC NHẬN ĐẶT LỊCH
    // ==============================================

    $("#submitBooking")?.addEventListener("click", async () => {
        const button = $("#submitBooking");
        const lyDoKham = $("#reason")?.value.trim() ?? "";

        if (!lyDoKham) {
            showError("submitError", "Vui lòng nhập lý do khám.");
            $("#reason")?.focus();
            return;
        }

        if (lyDoKham.length > 255) {
            showError("submitError", "Lý do khám không được vượt quá 255 ký tự.");
            return;
        }

        const maLichLamViec = state.schedule?.maLichLamViec;
        const gioKham = state.selectedTime?.gioBatDau;

        if (
            maLichLamViec == null ||
            !gioKham ||
            !state.date ||
            !state.department ||
            !state.doctor
        ) {
            showError(
                "submitError",
                "Vui lòng chọn đầy đủ chuyên khoa, ngày khám, bác sĩ và khung giờ."
            );
            return;
        }

        if (button.disabled) return;

        button.disabled = true;
        const originalText = button.textContent;
        button.textContent = "Đang gửi yêu cầu...";
        showError("submitError", "");

        try {
            const token = getStoredValue("Token");

            const response = await fetch("/api/lich-kham/dat-lich", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    maLichLamViec: Number(maLichLamViec),
                    lyDoKham,
                    gioKham: `${gioKham}:00`
                })
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    `Đặt lịch thất bại (HTTP ${response.status}).`
                );
            }

            renderBookingSuccess({
                ...data,
                ngayKham: state.date,
                tenKhoa: state.department.name,
                tenBacSi: getDoctorName(state.doctor),
                gioBatDau: state.selectedTime.gioBatDau,
                gioKetThuc: state.selectedTime.gioKetThuc,
                tenPhong: getDoctorRoom(state.doctor),
                lyDoKham
            });

            showStep(5);

        } catch (error) {
            console.error("Lỗi đặt lịch khám:", error);
            showError(
                "submitError",
                error.message || "Không thể kết nối máy chủ. Vui lòng thử lại."
            );
        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    });



    addDoctorBookingStyles();

    $("#changeTimeButton")?.addEventListener("click", () => {
        if (state.doctor) {
            state.expandedDoctorId = getDoctorId(state.doctor);
            renderDoctors(getFilteredDoctors());
        }
    });

    function renderBookingSuccess(booking) {
        const value = (v, fallback = "—") =>
            v == null || String(v).trim() === "" ? fallback : String(v);

        const setText = (id, text) => {
            const element = document.getElementById(id);
            if (element) element.textContent = text;
        };

        const formatMoney = (amount) => {
            if (amount == null || amount === "") return "Chưa có giá";

            const number = Number(amount);
            if (!Number.isFinite(number)) return "—";

            return `${new Intl.NumberFormat("vi-VN").format(number)}đ`;
        };

        const statusMap = {
            ChoGoi: "Chờ khám",
            DaDat: "Đã đặt",
            DaXacNhan: "Đã xác nhận",
            DaTiepNhan: "Đã tiếp nhận",
            DangKham: "Đang khám",
            HoanThanh: "Hoàn thành",
            DaHuy: "Đã hủy",
            KhongDen: "Không đến"
        };

        const paymentMap = {
            ChuaThanhToan: "Chưa thanh toán",
            DaThanhToan: "Đã thanh toán",
            DaHuy: "Đã hủy"
        };

        setText("successQueueNumber",
            value(booking.soThuTu));

        setText("successDate",
            formatVietnameseDate(value(booking.ngayKham, "")));

        setText("successDepartment",
            value(booking.tenKhoa));

        setText("successDoctor",
            value(booking.tenBacSi));

        setText("successTime",
            `${value(booking.gioBatDau)} - ${value(booking.gioKetThuc)}`);

        setText("successRoom",
            value(booking.tenPhong));

        setText("successReason",
            value(booking.lyDoKham, "Không có"));

        setText("successPrice",
            formatMoney(booking.tongTien));

        setText("successStatus",
            statusMap[booking.trangThaiLichKham] ??
            value(booking.trangThaiLichKham));

        setText("successPayment",
            paymentMap[booking.trangThaiHoaDon] ??
            value(booking.trangThaiHoaDon));
    }

    // ==============================================
    // KHỞI TẠO
    // ==============================================
    renderCalendar();
    updateSummary();
    loadDepartments();
});
