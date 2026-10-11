'use strict';

let globalQueueData = [];
let currentCallItem = null;
let dashboardLoading = false;
let callingPatient = false;

let patientProfileRequestVersion = 0;
let currentProfileAppointment = null;
let patientProfileLoading = false;
let patientProfileSaving = false;
let patientProfileTrigger = null;

const CALLABLE_STATUSES = new Set([
    'Chờ gọi',
    'Lịch đã xác nhận',
    'Đã gọi'
]);

const KPI_FIELDS = {
    'kpi-tong-bn': 'tongBnHienTai',
    'kpi-lich-hen': 'lichHenHomNay',
    'kpi-dang-cho': 'bnDangCho',
    'kpi-dang-kham': 'dangTrongPhongKham'
};

// =========================================================
// HÀM DÙNG CHUNG
// =========================================================

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value ?? '';
}

function setInputValue(id, value) {
    const input = document.getElementById(id);
    if (input) input.value = value ?? '';
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

function getToken() {
    return sessionStorage.getItem('Token')
        || localStorage.getItem('Token');
}

async function requestApi(url, options = {}) {
    const token = getToken();

    if (!token) {
        throw new Error('Bạn cần đăng nhập để sử dụng Dashboard.');
    }

    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Accept', 'application/json');

    const response = await fetch(url, {
        ...options,
        headers
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        let message = data?.message;

        if (!message) {
            if (response.status === 401) {
                message =
                    'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
            } else if (response.status === 403) {
                message =
                    'Tài khoản không có quyền truy cập chức năng này.';
            } else {
                message =
                    'Không thể xử lý yêu cầu. Vui lòng thử lại.';
            }
        }

        throw new Error(message);
    }

    if (!data || typeof data !== 'object') {
        throw new Error('Máy chủ trả về dữ liệu không hợp lệ.');
    }

    return data;
}

function showDashboardMessage(message = '', isError = false) {
    const element = document.getElementById('dashboard-message');

    if (!element) {
        if (message && isError) window.alert(message);
        return;
    }

    element.textContent = message;
    element.className = isError
        ? 'alert alert-danger py-2'
        : 'alert alert-info py-2';
    element.hidden = !message;
}

function updateCurrentHeaderDate() {
    const formatted = new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(new Date());

    setText('header-date-display', formatted);
}

function statusClass(status) {
    switch (status) {
        case 'Đang khám':
            return 'bg-success-subtle text-success';
        case 'Hoàn tất':
            return 'bg-success-subtle text-success';
        case 'Đã hủy':
        case 'Không đến':
            return 'bg-danger-subtle text-danger';
        case 'Đã gọi':
            return 'bg-info-subtle text-info-emphasis';
        default:
            return 'bg-warning-subtle text-warning-emphasis';
    }
}

function hasValidAppointmentId(item) {
    return Number.isInteger(item?.maLichKham)
        && item.maLichKham > 0;
}

function hasValidPatientProfileIds(item) {
    return Number.isInteger(item?.maBenhNhan)
        && item.maBenhNhan > 0
        && hasValidAppointmentId(item);
}

function canCallPatient(item) {
    return CALLABLE_STATUSES.has(item.trangThai)
        && hasValidAppointmentId(item)
        && Boolean(item.phong)
        && item.phong !== 'Chưa phân công';
}

function renderPatientName(container, item) {
    if (!container) return;

    container.textContent = item.tenBenhNhan || 'Bệnh nhân';
    container.style.cursor = 'default';
}

// =========================================================
// SẮP XẾP THEO TRẠNG THÁI
// =========================================================

function queueStatusPriority(status) {
    if (['Đã gọi', 'DaGoi'].includes(status)) {
        return 0;
    }

    if ([
        'Chờ gọi',
        'Chờ gọi vào',
        'ChoKham',
        'Lịch đã xác nhận',
        'DaXacNhan'
    ].includes(status)) {
        return 1;
    }

    if (['Đang khám', 'DangKham'].includes(status)) {
        return 3;
    }

    return 2;
}

function compareQueueAppointments(a, b) {
    const priority =
        queueStatusPriority(a.trangThai)
        - queueStatusPriority(b.trangThai);

    if (priority) return priority;

    const timeA = /^\d{2}:\d{2}$/.test(a.gioHen || '')
        ? a.gioHen : '99:99';

    const timeB = /^\d{2}:\d{2}$/.test(b.gioHen || '')
        ? b.gioHen : '99:99';

    const time = timeA.localeCompare(timeB);
    if (time) return time;

    const sequence = item => {
        const raw = String(item.stt ?? '')
            .replace(/^#/, '')
            .trim();

        return /^\d+$/.test(raw)
            ? Number(raw)
            : Number.MAX_SAFE_INTEGER;
    };

    return sequence(a) - sequence(b)
        || Number(a.maLichKham || 0) - Number(b.maLichKham || 0);
}

// =========================================================
// TẢI VÀ TỰ ĐỘNG CẬP NHẬT DASHBOARD
// =========================================================

function refreshDashboardWhenIdle() {
    if (
        document.hidden
        || dashboardLoading
        || callingPatient
        || patientProfileLoading
        || patientProfileSaving
        || document.querySelector('.modal.show')
    ) {
        return;
    }

    void loadDashboardRealData(true);
}

async function loadDashboardRealData(silent = false) {
    if (dashboardLoading) return false;

    dashboardLoading = true;

    const refreshButton = document.getElementById(
        'refresh-dashboard-button'
    );

    if (refreshButton) refreshButton.disabled = true;

    updateCurrentHeaderDate();

    try {
        const data = await requestApi('/api/tiepnhan/dashboard-data');

        if (!Array.isArray(data.hangDoiKham)) {
            throw new Error('Danh sách lịch khám trả về không hợp lệ.');
        }

        Object.entries(KPI_FIELDS).forEach(([id, field]) => {
            setText(id, data[field] ?? 0);
        });

        globalQueueData = data.hangDoiKham;

        updateFilterOptions();
        applyFiltersAndRender();
        renderUpcomingAppointments();

        if (!silent) showDashboardMessage();

        return true;
    } catch (error) {
        if (!silent) {
            showDashboardMessage(
                `${error.message} Dữ liệu trên màn hình chưa được cập nhật.`,
                true
            );
        }

        return false;
    } finally {
        dashboardLoading = false;
        if (refreshButton) refreshButton.disabled = false;
    }
}

// =========================================================
// TÌM KIẾM VÀ BỘ LỌC
// =========================================================

function populateSelect(select, values, allLabel) {
    if (!select) return;

    const previous = select.value;
    select.replaceChildren(new Option(allLabel, ''));

    [...new Set(values.filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'vi'))
        .forEach(value => {
            select.add(new Option(value, value));
        });

    select.value = [...select.options].some(
        option => option.value === previous
    ) ? previous : '';
}

function updateFilterOptions() {
    populateSelect(
        document.getElementById('room-filter'),
        globalQueueData.map(item => item.phong),
        'Tất cả phòng'
    );

    populateSelect(
        document.getElementById('status-filter'),
        globalQueueData.map(item => item.trangThai),
        'Tất cả trạng thái'
    );
}

function normalizeSearch(value) {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase()
        .trim();
}

function applyFiltersAndRender() {
    const room =
        document.getElementById('room-filter')?.value || '';

    const status =
        document.getElementById('status-filter')?.value || '';

    const search = normalizeSearch(
        document.getElementById('queue-search')?.value
    );

    const filtered = globalQueueData.filter(item => {
        const searchable = [
            item.tenBenhNhan,
            item.maBn,
            item.maLichKham,
            item.stt,
            item.khoa,
            item.bacSi,
            item.phong
        ].map(normalizeSearch).join(' ');

        return (!room || item.phong === room)
            && (!status || item.trangThai === status)
            && (!search || searchable.includes(search));
    });

    filtered.sort(compareQueueAppointments);
    renderQueueTable(filtered);
}

// =========================================================
// BẢNG HÀNG ĐỢI
// =========================================================

function renderQueueTable(list) {
    const tbody = document.getElementById('hang-doi-table-body');
    if (!tbody) return;

    tbody.replaceChildren();

    if (list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-4">
                    Không có lịch khám phù hợp.
                </td>
            </tr>
        `;
    }

    list.forEach(item => {
        const row = document.createElement('tr');
        const name = String(item.tenBenhNhan || 'Bệnh nhân');

        row.innerHTML = `
            <td>
                <span class="badge-stt-purple">
                    ${escapeHtml(item.stt)}
                </span>
            </td>
            <td class="fw-bold text-primary">
                ${escapeHtml(item.maBn)}
            </td>
            <td>
                <div class="d-flex align-items-center">
                    <span class="avatar-initial"
                          style="background-color: #4F46E5;">
                        ${escapeHtml(name.charAt(0))}
                    </span>
                    <div style="min-width: 0; flex: 1;">
                        <div class="patient-name-container fw-bold"></div>
                        <div class="text-muted">
                            ${escapeHtml(item.thongTinPhu)}
                        </div>
                    </div>
                </div>
            </td>
            <td>
                <div class="fw-semibold">
                    ${escapeHtml(item.khoa)}
                </div>
                <div class="text-muted">
                    ${escapeHtml(item.bacSi)}
                </div>
            </td>
            <td class="text-center">
                ${escapeHtml(item.phong)}
            </td>
            <td>
                ${escapeHtml(item.gioHen)}
            </td>
            <td class="text-center">
                <span class="status-pill ${statusClass(item.trangThai)}">
                    ${escapeHtml(item.trangThai)}
                </span>
            </td>
            <td class="text-center">
                <div class="queue-actions"></div>
            </td>
        `;

        renderPatientName(
            row.querySelector('.patient-name-container'),
            item
        );

        const actions = row.querySelector('.queue-actions');

        Object.assign(actions.style, {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            flexWrap: 'nowrap'
        });

        // Luôn giữ nút gọi, làm mờ khi không được phép gọi.
        {
            const button = document.createElement('button');
            const allowed = canCallPatient(item);

            let label = item.trangThai === 'Đã gọi'
                ? 'Gọi lại bệnh nhân'
                : 'Gọi bệnh nhân';

            if (['Đang khám', 'DangKham'].includes(item.trangThai)) {
                label = 'Bệnh nhân đang khám, không thể gọi lại.';
            } else if (!CALLABLE_STATUSES.has(item.trangThai)) {
                label = 'Trạng thái hiện tại không cho phép gọi bệnh nhân.';
            } else if (!allowed) {
                label = 'Lịch khám chưa có phòng hoặc mã lịch hợp lệ.';
            } else if (callingPatient || patientProfileSaving) {
                label = 'Đang xử lý, vui lòng chờ.';
            }

            button.type = 'button';
            button.className = 'btn-action-call-compact';
            button.title = label;
            button.setAttribute('aria-label', label);

            button.disabled = callingPatient
                || patientProfileSaving
                || !allowed;

            Object.assign(button.style, {
                width: '30px',
                height: '30px',
                padding: '0',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: '0',
                opacity: button.disabled ? '0.35' : '1',
                cursor: button.disabled ? 'not-allowed' : 'pointer'
            });

            const icon = document.createElement('i');
            icon.className = 'fa-solid fa-volume-high';
            icon.setAttribute('aria-hidden', 'true');
            button.appendChild(icon);

            button.addEventListener('click', () => {
                if (button.disabled) return;
                handleCallPatient(item.maLichKham);
            });

            actions.appendChild(button);
        }

        // Bệnh nhân đang khám vẫn xem được hồ sơ.
        if (hasValidPatientProfileIds(item)) {
            const button = document.createElement('button');

            const label = item.trangThai === 'Đã gọi'
                ? 'Xem hồ sơ và chỉnh sửa số đo trước khám'
                : 'Xem hồ sơ bệnh nhân';

            button.type = 'button';
            button.className = 'btn-action-vitals-compact';
            button.title = label;
            button.setAttribute('aria-label', label);
            button.setAttribute('aria-haspopup', 'dialog');
            button.setAttribute(
                'aria-controls',
                'modalHoSoBenhNhan'
            );

            Object.assign(button.style, {
                width: '30px',
                height: '30px',
                padding: '0',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: '0'
            });

            const icon = document.createElement('i');
            icon.className = 'fa-solid fa-file-medical';
            icon.setAttribute('aria-hidden', 'true');
            button.appendChild(icon);

            button.disabled = callingPatient || patientProfileSaving;

            button.addEventListener('click', () => {
                openPatientProfileModal(item, button);
            });

            actions.appendChild(button);
        }

        tbody.appendChild(row);
    });

    setText(
        'table-record-count',
        `Hiển thị ${list.length}/${globalQueueData.length} lịch khám hôm nay`
    );
}

// =========================================================
// LỊCH KHÁM CHỜ GỌI
// =========================================================

function renderUpcomingAppointments() {
    const container = document.getElementById(
        'lich-kham-sap-toi-container'
    );

    if (!container) return;

    const upcoming = globalQueueData
        .filter(item => [
            'Chờ gọi',
            'Lịch đã xác nhận'
        ].includes(item.trangThai))
        .sort((a, b) => {
            const timeA = /^\d{2}:\d{2}$/.test(a.gioHen || '')
                ? a.gioHen : '99:99';

            const timeB = /^\d{2}:\d{2}$/.test(b.gioHen || '')
                ? b.gioHen : '99:99';

            return timeA.localeCompare(timeB)
                || a.maLichKham - b.maLichKham;
        })
        .slice(0, 5);

    container.replaceChildren();

    if (upcoming.length === 0) {
        container.textContent =
            'Không còn lịch khám chưa gọi trong ngày.';
        return;
    }

    upcoming.forEach(item => {
        const element = document.createElement('div');
        element.className = 'schedule-item';

        element.innerHTML = `
            <div class="schedule-stt-box">
                <small>STT</small>
                <div class="fw-bold">${escapeHtml(item.stt)}</div>
            </div>
            <div class="flex-grow-1" style="min-width: 0;">
                <div class="patient-name-container fw-bold"></div>
                <div class="text-muted mt-1">
                    ${escapeHtml(item.gioHen)}
                    • ${escapeHtml(item.bacSi)}
                </div>
                <div class="text-muted">
                    ${escapeHtml(item.khoa)}
                    • ${escapeHtml(item.phong)}
                </div>
            </div>
        `;

        renderPatientName(
            element.querySelector('.patient-name-container'),
            item
        );

        container.appendChild(element);
    });
}

// =========================================================
// GỌI BỆNH NHÂN
// =========================================================

async function handleCallPatient(maLichKham) {
    if (callingPatient || patientProfileSaving) return;

    const item = globalQueueData.find(
        row => row.maLichKham === maLichKham
    );

    if (!item || !canCallPatient(item)) {
        showDashboardMessage(
            'Lịch khám này chưa đủ điều kiện gọi.',
            true
        );
        return;
    }

    callingPatient = true;
    applyFiltersAndRender();

    try {
        const result = await requestApi(
            '/api/tiepnhan/call-patient',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ maLichKham })
            }
        );

        if (result.success !== true) {
            throw new Error(
                result.message || 'Không thể gọi bệnh nhân.'
            );
        }

        item.trangThai = 'Đã gọi';

        currentCallItem = {
            maLichKham,
            stt: result.soThuTu ?? item.stt,
            ten: result.tenBenhNhan ?? item.tenBenhNhan,
            phong: result.phong ?? item.phong,
            khoa: result.khoa ?? item.khoa
        };

        setText('modal-stt', `STT ${currentCallItem.stt}`);
        setText('modal-ten', currentCallItem.ten);
        setText(
            'modal-phong',
            `Mời đến khu vực chờ trước ${currentCallItem.phong}`
        );

        const modalElement = document.getElementById('modalGoiKham');

        if (modalElement && window.bootstrap?.Modal) {
            bootstrap.Modal.getOrCreateInstance(modalElement).show();
        }

        speakAnnouncement(currentCallItem);
        await loadDashboardRealData();
    } catch (error) {
        showDashboardMessage(error.message, true);
    } finally {
        callingPatient = false;
        applyFiltersAndRender();
        renderUpcomingAppointments();
    }
}

function replayVoice() {
    if (currentCallItem) {
        handleCallPatient(currentCallItem.maLichKham);
    }
}

function speakAnnouncement(item) {
    if (!('speechSynthesis' in window)) {
        setText(
            'voice-status',
            'Trình duyệt không hỗ trợ đọc thông báo. Vui lòng gọi trực tiếp.'
        );
        return;
    }

    const sequence = String(item.stt ?? '')
        .replace(/^#/, '')
        .replace(/^0+(?=\d)/, '');

    const sequenceText = sequence && sequence !== '—'
        ? `, số thứ tự ${sequence}`
        : '';

    const announcement = new SpeechSynthesisUtterance(
        `Xin mời bệnh nhân ${item.ten}${sequenceText}, `
        + `đến khu vực chờ trước ${item.phong}, `
        + `khoa ${item.khoa}, để kiểm tra thông tin trước khi khám.`
    );

    announcement.lang = 'vi-VN';
    announcement.rate = 0.9;

    const vietnameseVoice = window.speechSynthesis.getVoices().find(
        voice => voice.lang.toLowerCase().startsWith('vi')
    );

    if (vietnameseVoice) announcement.voice = vietnameseVoice;

    announcement.onstart = () => {
        setText(
            'voice-status',
            'Đang phát thông báo gọi bệnh nhân...'
        );
    };

    announcement.onend = () => {
        setText('voice-status', 'Đã phát xong thông báo.');
    };

    announcement.onerror = () => {
        setText(
            'voice-status',
            'Không phát được thông báo. Kiểm tra âm thanh hoặc gọi trực tiếp.'
        );
    };

    window.speechSynthesis.cancel();
    setText('voice-status', 'Đang chuẩn bị phát thông báo...');
    window.speechSynthesis.speak(announcement);
}

// =========================================================
// HỒ SƠ BỆNH NHÂN
// =========================================================

function showPatientProfileMessage(message = '', isError = false) {
    const element = document.getElementById(
        'patient-profile-modal-message'
    );

    if (!element) return;

    element.textContent = message;
    element.className = isError
        ? 'alert alert-danger'
        : 'alert alert-info';
    element.hidden = !message;
}

function patientProfileText(value) {
    return value === null
        || value === undefined
        || String(value).trim() === ''
        ? 'Chưa cập nhật'
        : String(value);
}

function formatPatientProfileDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(
        String(value ?? '')
    );

    return match
        ? `${match[3]}/${match[2]}/${match[1]}`
        : 'Chưa cập nhật';
}

function getPatientProfileToday() {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(new Date());

    const values = Object.fromEntries(
        parts.map(part => [part.type, part.value])
    );

    return `${values.year}-${values.month}-${values.day}`;
}

function canEditPatientProfileVitals() {
    return currentProfileAppointment !== null
        && currentProfileAppointment.ngayKham === getPatientProfileToday()
        && currentProfileAppointment.trangThai === 'Đã gọi';
}

function updatePatientProfileControls() {
    const editable = canEditPatientProfileVitals();

    const disabled = !editable
        || patientProfileLoading
        || patientProfileSaving;

    const fields = document.getElementById(
        'patient-profile-vitals-fields'
    );

    const saveButton = document.getElementById(
        'patient-profile-save-button'
    );

    const closeButton = document.querySelector(
        '#modalHoSoBenhNhan .btn-close'
    );

    if (fields) fields.disabled = disabled;

    if (saveButton) {
        saveButton.disabled = disabled;
        saveButton.textContent = patientProfileSaving
            ? 'Đang lưu...'
            : 'Lưu hồ sơ';
    }

    if (closeButton) closeButton.disabled = patientProfileSaving;

    let note;

    if (patientProfileLoading) {
        note = 'Đang tải hồ sơ và số đo đã lưu...';
    } else if (!currentProfileAppointment) {
        note = 'Chưa tải được lần khám để nhập số đo.';
    } else if (editable) {
        note = 'Nhập hoặc chỉnh sửa số đo của lần khám này.';
    } else if (
        currentProfileAppointment.ngayKham !== getPatientProfileToday()
    ) {
        note = 'Lần khám khác ngày hôm nay: chỉ xem số đo.';
    } else if (
        currentProfileAppointment.trangThai === 'Chờ gọi'
        || currentProfileAppointment.trangThai === 'Lịch đã xác nhận'
    ) {
        note = 'Hãy gọi bệnh nhân trước khi nhập số đo.';
    } else {
        note = 'Trạng thái lần khám này chỉ cho phép xem số đo.';
    }

    setText('patient-profile-edit-note', note);
}

function renderPatientProfileModal(profile, appointment) {
    const patientFields = {
        'patient-modal-name': profile.hoTen,
        'patient-modal-id': profile.maBenhNhan,
        'patient-modal-gender': profile.gioiTinh,
        'patient-modal-phone': profile.soDienThoai,
        'patient-modal-emergency-phone': profile.soDienThoaiKhanCap,
        'patient-modal-email': profile.email,
        'patient-modal-address': profile.diaChi,
        'patient-modal-medical-history': profile.tienSuBenh
    };

    Object.entries(patientFields).forEach(([id, value]) => {
        setText(id, patientProfileText(value));
    });

    setText(
        'patient-modal-birth-date',
        formatPatientProfileDate(profile.ngaySinh)
    );

    setText(
        'patient-modal-appointment-id',
        appointment.maLichKham
    );

    setText(
        'patient-modal-appointment-date',
        formatPatientProfileDate(appointment.ngayKham)
    );

    setText(
        'patient-modal-appointment-time',
        appointment.gioKham
            ? String(appointment.gioKham).slice(0, 5)
            : 'Chưa cập nhật'
    );

    setText(
        'patient-modal-sequence-number',
        Number.isInteger(appointment.soThuTu)
            ? `#${String(appointment.soThuTu).padStart(3, '0')}`
            : 'Chưa cấp số'
    );

    setText(
        'patient-modal-department',
        patientProfileText(appointment.khoa)
    );

    setText(
        'patient-modal-doctor',
        patientProfileText(appointment.bacSi)
    );

    setText(
        'patient-modal-room',
        appointment.phong || 'Chưa phân công'
    );

    setText(
        'patient-modal-reason',
        patientProfileText(appointment.lyDoKham)
    );

    const status = document.getElementById('patient-modal-status');

    if (status) {
        status.textContent = patientProfileText(appointment.trangThai);
        status.className =
            `badge ${statusClass(appointment.trangThai)}`;
    }

    setInputValue(
        'patient-profile-weight-input',
        appointment.canNang
    );

    setInputValue(
        'patient-profile-height-input',
        appointment.chieuCao
    );

    setInputValue(
        'patient-profile-systolic-input',
        appointment.huyetApTamThu
    );

    setInputValue(
        'patient-profile-diastolic-input',
        appointment.huyetApTamTruong
    );
}

async function openPatientProfileModal(item, triggerButton) {
    if (patientProfileSaving || callingPatient) return;

    if (!hasValidPatientProfileIds(item)) {
        showDashboardMessage(
            'Mã bệnh nhân hoặc lịch khám không hợp lệ.',
            true
        );
        return;
    }

    const modalElement = document.getElementById('modalHoSoBenhNhan');

    const content = document.getElementById(
        'patient-profile-modal-content'
    );

    const form = document.getElementById(
        'patient-profile-vitals-form'
    );

    if (
        !modalElement
        || !content
        || !form
        || !window.bootstrap?.Modal
    ) {
        showDashboardMessage(
            'Chưa tìm thấy form hồ sơ. Kiểm tra lại dashboard.html.',
            true
        );
        return;
    }

    const requestVersion = ++patientProfileRequestVersion;

    patientProfileTrigger = triggerButton;
    currentProfileAppointment = null;
    patientProfileLoading = true;

    form.reset();
    content.hidden = true;

    updatePatientProfileControls();
    showPatientProfileMessage('Đang tải hồ sơ bệnh nhân...');

    bootstrap.Modal.getOrCreateInstance(modalElement).show();

    try {
        const profile = await requestApi(
            `/api/tiepnhan/ho-so-benh-nhan/${item.maBenhNhan}`
        );

        if (requestVersion !== patientProfileRequestVersion) return;

        if (
            profile.maBenhNhan !== item.maBenhNhan
            || !Array.isArray(profile.danhSachLanKham)
        ) {
            throw new Error('Hồ sơ trả về không đúng bệnh nhân.');
        }

        const appointment = profile.danhSachLanKham.find(
            visit => visit.maLichKham === item.maLichKham
        );

        if (!appointment) {
            throw new Error('Không tìm thấy lần khám đã chọn.');
        }

        renderPatientProfileModal(profile, appointment);
        currentProfileAppointment = appointment;
        content.hidden = false;
        showPatientProfileMessage();
    } catch (error) {
        if (requestVersion !== patientProfileRequestVersion) return;

        currentProfileAppointment = null;
        content.hidden = true;
        showPatientProfileMessage(error.message, true);
    } finally {
        if (requestVersion === patientProfileRequestVersion) {
            patientProfileLoading = false;
            updatePatientProfileControls();
        }
    }
}

// =========================================================
// KIỂM TRA SỐ ĐO
// =========================================================

function readOptionalNumber(id) {
    const input = document.getElementById(id);

    if (!input) {
        throw new Error('Form số đo thiếu trường nhập liệu.');
    }

    if (input.value.trim() === '') return null;

    const value = input.valueAsNumber;

    if (!Number.isFinite(value)) {
        throw new Error('Số đo phải là số hợp lệ.');
    }

    return value;
}

function validateDecimal(value, label) {
    if (value === null) return;

    if (value <= 0 || value > 999.99) {
        throw new Error(
            `${label} phải lớn hơn 0 và không vượt quá 999,99.`
        );
    }

    const scaled = value * 100;

    if (Math.abs(scaled - Math.round(scaled)) > 0.000001) {
        throw new Error(
            `${label} chỉ được có tối đa 2 chữ số thập phân.`
        );
    }
}

function validateBloodPressure(value, label) {
    if (value === null) return;

    if (!Number.isInteger(value) || value < 1 || value > 65535) {
        throw new Error(
            `${label} phải là số nguyên từ 1 đến 65535.`
        );
    }
}

function buildPatientProfileVitalsPayload() {
    if (!canEditPatientProfileVitals()) {
        throw new Error(
            'Chỉ nhập số đo cho lịch khám hôm nay đã gọi bệnh nhân.'
        );
    }

    const payload = {
        maLichKham: currentProfileAppointment.maLichKham,
        canNang: readOptionalNumber('patient-profile-weight-input'),
        chieuCao: readOptionalNumber('patient-profile-height-input'),
        huyetApTamThu: readOptionalNumber(
            'patient-profile-systolic-input'
        ),
        huyetApTamTruong: readOptionalNumber(
            'patient-profile-diastolic-input'
        )
    };

    validateDecimal(payload.canNang, 'Cân nặng');
    validateDecimal(payload.chieuCao, 'Chiều cao');
    validateBloodPressure(payload.huyetApTamThu, 'Huyết áp tâm thu');

    validateBloodPressure(
        payload.huyetApTamTruong,
        'Huyết áp tâm trương'
    );

    if (
        (payload.huyetApTamThu === null)
        !== (payload.huyetApTamTruong === null)
    ) {
        throw new Error(
            'Nhập đủ huyết áp tâm thu và tâm trương, '
            + 'hoặc để trống cả hai nếu chưa đo.'
        );
    }

    if (
        payload.canNang === null
        && payload.chieuCao === null
        && payload.huyetApTamThu === null
        && payload.huyetApTamTruong === null
    ) {
        throw new Error(
            'Hãy nhập ít nhất một loại số đo trước khi lưu.'
        );
    }

    return payload;
}

// =========================================================
// LƯU SỐ ĐO
// =========================================================

async function handleSavePatientProfile(event) {
    event.preventDefault();

    if (
        patientProfileLoading
        || patientProfileSaving
        || callingPatient
    ) {
        return;
    }

    const form = document.getElementById(
        'patient-profile-vitals-form'
    );

    if (!form || !form.reportValidity()) return;

    let payload;

    try {
        payload = buildPatientProfileVitalsPayload();
    } catch (error) {
        showPatientProfileMessage(error.message, true);
        return;
    }

    patientProfileSaving = true;
    updatePatientProfileControls();
    applyFiltersAndRender();
    showPatientProfileMessage('Đang lưu số đo vào hồ sơ...');

    let saved = false;

    try {
        const result = await requestApi(
            '/api/tiepnhan/chi-so-truoc-kham',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            }
        );

        if (result.success !== true) {
            throw new Error(
                result.message || 'Không thể lưu số đo.'
            );
        }

        Object.assign(currentProfileAppointment, payload);
        saved = true;
        showPatientProfileMessage('Đã lưu số đo của lần khám này.');
    } catch (error) {
        showPatientProfileMessage(error.message, true);
    } finally {
        patientProfileSaving = false;
        updatePatientProfileControls();
        applyFiltersAndRender();
    }

    if (saved) {
        const refreshed = await loadDashboardRealData();

        if (!refreshed) {
            showDashboardMessage(
                'Số đo đã lưu thành công, nhưng chưa tải lại được Dashboard.',
                true
            );
        }
    }
}

// =========================================================
// KHỞI TẠO
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('refresh-dashboard-button')
        ?.addEventListener('click', () => {
            void loadDashboardRealData();
        });

    document.getElementById('room-filter')
        ?.addEventListener('change', applyFiltersAndRender);

    document.getElementById('status-filter')
        ?.addEventListener('change', applyFiltersAndRender);

    document.getElementById('queue-search')
        ?.addEventListener('input', applyFiltersAndRender);

    document.getElementById('replay-voice-button')
        ?.addEventListener('click', replayVoice);

    document.getElementById('patient-profile-vitals-form')
        ?.addEventListener('submit', handleSavePatientProfile);

    const profileModal = document.getElementById(
        'modalHoSoBenhNhan'
    );

    profileModal?.addEventListener('hide.bs.modal', event => {
        if (patientProfileSaving) {
            event.preventDefault();
            return;
        }

        patientProfileRequestVersion++;
        patientProfileLoading = false;
    });

    profileModal?.addEventListener('hidden.bs.modal', () => {
        currentProfileAppointment = null;

        document.getElementById('patient-profile-vitals-form')
            ?.reset();

        const content = document.getElementById(
            'patient-profile-modal-content'
        );

        if (content) content.hidden = true;

        showPatientProfileMessage();
        updatePatientProfileControls();

        if (patientProfileTrigger?.isConnected) {
            patientProfileTrigger.focus();
        }

        patientProfileTrigger = null;
    });

    updatePatientProfileControls();
    void loadDashboardRealData();

    // Tạm ngừng cập nhật tự động khi đang mở form hoặc xử lý.
    window.setInterval(refreshDashboardWhenIdle, 15000);

    document.addEventListener(
        'visibilitychange',
        refreshDashboardWhenIdle
    );

    window.addEventListener('focus', refreshDashboardWhenIdle);
});