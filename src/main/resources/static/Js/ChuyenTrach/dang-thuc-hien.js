
/**
 * DANH SÁCH BỆNH NHÂN ĐANG THỰC HIỆN CLS
 *
 * Chức năng:
 * - Lấy dữ liệu từ API
 * - Chỉ hiển thị bệnh nhân DangCLS do API cung cấp
 * - Tìm kiếm bệnh nhân
 * - Lọc theo phòng
 * - Hiển thị bảng cuộn, không phân trang
 * - Tiếp tục nhập kết quả CLS
 *
 * Không có nút Làm mới riêng.
 */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // ============================================
    // 1. LẤY CÁC PHẦN TỬ GIAO DIỆN
    // ============================================

    const tableBody =
        document.getElementById('ctdoingTableBody');

    const searchInput =
        document.getElementById('ctdoingSearch');

    const roomSelect =
        document.getElementById('ctdoingRoom');

    const countText =
        document.getElementById('ctdoingCount');

    const pageInfo =
        document.getElementById('ctdoingPageInfo');

    if (
        !tableBody ||
        !searchInput ||
        !roomSelect ||
        !countText ||
        !pageInfo
    ) {
        return;
    }

    let allRows = [];
    let loading = false;

    // ============================================
    // 2. TẠO PHẦN TỬ HTML AN TOÀN
    // ============================================

    function createElement(tag, text, className = '') {
        const el = document.createElement(tag);

        el.textContent =
            text === null ||
            text === undefined ||
            text === ''
                ? '—'
                : String(text);

        if (className) {
            el.className = className;
        }

        return el;
    }

    // ============================================
    // 3. HIỂN THỊ THÔNG BÁO TRONG BẢNG
    // ============================================

    function showMessage(message) {
        const tr = document.createElement('tr');

        const td = createElement(
            'td',
            message,
            'ctdoing-message'
        );

        td.colSpan = 7;

        tr.appendChild(td);

        tableBody.replaceChildren(tr);
    }

    // ============================================
    // 4. ĐỊNH DẠNG NGÀY
    // ============================================

    function formatDate(value) {
        if (!value) {
            return '—';
        }

        const parts = String(value)
            .slice(0, 10)
            .split('-');

        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }

        return String(value);
    }

    // ============================================
    // 5. LẤY DANH SÁCH PHÒNG KHÔNG TRÙNG
    // ============================================

    function uniqueRooms(rows) {
        const map = new Map();

        rows.forEach(row => {
            const rooms = String(
                row.danhSachPhong || ''
            )
                .split('|')
                .filter(Boolean);

            rooms.forEach(pair => {
                const separator = pair.indexOf(':');

                if (separator === -1) {
                    return;
                }

                const id = pair
                    .slice(0, separator)
                    .trim();

                const name = pair
                    .slice(separator + 1)
                    .trim();

                if (id && !map.has(id)) {
                    map.set(
                        id,
                        name || `Phòng ${id}`
                    );
                }
            });
        });

        return [...map.entries()]
            .sort(
                ([a], [b]) => Number(a) - Number(b)
            );
    }

    // ============================================
    // 6. CẬP NHẬT DROPDOWN PHÒNG
    // ============================================

    function updateRoomOptions() {
        const selected = roomSelect.value;

        roomSelect.replaceChildren(
            new Option(
                'Tất cả phòng chuyên trách',
                ''
            )
        );

        const rooms = uniqueRooms(allRows);

        rooms.forEach(([id, name]) => {
            roomSelect.add(
                new Option(name, id)
            );
        });

        const exists = [...roomSelect.options]
            .some(
                option => option.value === selected
            );

        roomSelect.value = exists
            ? selected
            : '';
    }

    // ============================================
    // 7. LỌC DỮ LIỆU
    // ============================================

    function getFilteredRows() {
        const keyword = searchInput.value
            .trim()
            .toLocaleLowerCase('vi-VN');

        const roomId = roomSelect.value;

        return allRows.filter(row => {
            // Lọc phòng
            if (roomId) {
                const roomIds = String(
                    row.danhSachMaPhong || ''
                ).split(',');

                if (!roomIds.includes(roomId)) {
                    return false;
                }
            }

            // Không có từ khóa tìm kiếm
            if (!keyword) {
                return true;
            }

            const searchableValues = [
                row.maLichKham,
                row.maBenhNhan,
                row.tenBenhNhan,
                row.dichVu,
                row.phongThucHien,
                row.bacSiPhuTrach
            ];

            return searchableValues.some(value =>
                String(value ?? '')
                    .toLocaleLowerCase('vi-VN')
                    .includes(keyword)
            );
        });
    }

    // ============================================
    // 8. HIỂN THỊ DỮ LIỆU RA BẢNG
    // ============================================

    function renderTable() {
        const rows = getFilteredRows();

        // Số lượng bệnh nhân
        countText.textContent =
            `${rows.length} bệnh nhân`;

        // Footer
        pageInfo.textContent =
            `Hiển thị ${rows.length}/${allRows.length} ` +
            `bệnh nhân đang thực hiện CLS hôm nay`;

        // Không có dữ liệu
        if (rows.length === 0) {
            showMessage(
                'Không có bệnh nhân đang thực hiện CLS phù hợp.'
            );
            return;
        }

        const fragment =
            document.createDocumentFragment();

        rows.forEach((row, index) => {
            const tr = document.createElement('tr');

            // ==================================
            // STT
            // ==================================

            tr.appendChild(
                createElement('td', index + 1)
            );

            // ==================================
            // THÔNG TIN BỆNH NHÂN
            // ==================================

            const patientCell =
                document.createElement('td');

            const patientName = createElement(
                'span',
                row.tenBenhNhan,
                'ctdoing-patient-name'
            );

            const patientCode = createElement(
                'span',
                row.maBenhNhan == null
                    ? null
                    : `BN${String(row.maBenhNhan).padStart(6, '0')}`,
                'ctdoing-patient-code'
            );

            patientCell.append(
                patientName,
                patientCode
            );

            tr.appendChild(patientCell);

            // ==================================
            // DỊCH VỤ
            // ==================================

            const serviceCell =
                document.createElement('td');

            const serviceName = createElement(
                'span',
                row.dichVu,
                'ctdoing-service'
            );

            serviceName.title = row.dichVu || '';

            serviceCell.appendChild(serviceName);

            tr.appendChild(serviceCell);

            // ==================================
            // PHÒNG THỰC HIỆN
            // ==================================

            const roomCell =
                document.createElement('td');

            const roomName = createElement(
                'span',
                row.phongThucHien || 'Chưa phân phòng',
                'ctdoing-room-tag'
            );

            roomName.title =
                row.phongThucHien || 'Chưa phân phòng';

            roomCell.appendChild(roomName);

            tr.appendChild(roomCell);

            // ==================================
            // THỜI GIAN KHÁM
            // ==================================

            const timeCell =
                document.createElement('td');

            const timeText = createElement(
                'span',
                row.gioKham
                    ? String(row.gioKham).slice(0, 5)
                    : null,
                'ctdoing-time'
            );

            const dateText = createElement(
                'span',
                formatDate(row.ngayKham),
                'ctdoing-date'
            );

            timeCell.append(
                timeText,
                dateText
            );

            tr.appendChild(timeCell);

            // ==================================
            // TRẠNG THÁI
            // ==================================

            const statusCell =
                document.createElement('td');

            const status = createElement(
                'span',
                'Đang thực hiện',
                'ctdoing-status'
            );

            statusCell.appendChild(status);

            tr.appendChild(statusCell);

            // ==================================
            // THAO TÁC TIẾP TỤC
            // ==================================

            const actionCell =
                document.createElement('td');

            const link = createElement(
                'a',
                'Tiếp tục',
                'ctdoing-go'
            );

            link.title =
                'Tiếp tục nhập kết quả cận lâm sàng';

            // Phải có lượt khám và chỉ định
            if (
                row.maLichKham != null &&
                row.maChiDinh != null
            ) {
                link.href =
                    '/ChuyenTrach/nhap-ket-qua/' +
                    encodeURIComponent(
                        row.maLichKham
                    ) +
                    '?maChiDinh=' +
                    encodeURIComponent(
                        row.maChiDinh
                    );
            } else {
                link.removeAttribute('href');

                link.setAttribute(
                    'aria-disabled',
                    'true'
                );

                link.title =
                    'Lượt khám không có chỉ định hợp lệ';
            }

            actionCell.appendChild(link);

            tr.appendChild(actionCell);

            fragment.appendChild(tr);
        });

        tableBody.replaceChildren(fragment);
    }

    // ============================================
    // 9. LẤY TOKEN ĐĂNG NHẬP
    // ============================================

    function getToken() {
        return (
            sessionStorage.getItem('Token') ||
            localStorage.getItem('Token')
        );
    }

    // ============================================
    // 10. TẢI DỮ LIỆU TỪ API
    // ============================================

    async function loadData() {
        if (loading) {
            return;
        }

        const token = getToken();

        if (!token) {
            countText.textContent = '0 bệnh nhân';
            pageInfo.textContent =
                'Không tải được dữ liệu';

            showMessage(
                'Phiên đăng nhập đã hết hạn. ' +
                'Vui lòng đăng nhập lại.'
            );

            return;
        }

        loading = true;

        showMessage(
            'Đang tải dữ liệu từ MySQL...'
        );

        try {
            const response = await fetch(
                '/api/chuyen-trach/dang-thuc-hien/hom-nay',
                {
                    method: 'GET',

                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },

                    cache: 'no-store'
                }
            );

            if (!response.ok) {
                throw new Error(
                    `Không thể tải danh sách (HTTP ${response.status}).`
                );
            }

            const data = await response.json();

            if (!Array.isArray(data)) {
                throw new Error(
                    'Dữ liệu API trả về không hợp lệ.'
                );
            }

            allRows = data;

            updateRoomOptions();

            renderTable();

        } catch (error) {
            console.error(
                'Lỗi tải bệnh nhân đang thực hiện:',
                error
            );

            countText.textContent = '0 bệnh nhân';

            pageInfo.textContent =
                'Không tải được dữ liệu';

            showMessage(
                error.message ||
                'Đã xảy ra lỗi khi tải dữ liệu.'
            );

        } finally {
            loading = false;
        }
    }

    // ============================================
    // 11. SỰ KIỆN TÌM KIẾM VÀ LỌC PHÒNG
    // ============================================

    searchInput.addEventListener(
        'input',
        renderTable
    );

    roomSelect.addEventListener(
        'change',
        renderTable
    );

    // ============================================
    // 12. TẢI DỮ LIỆU KHI MỞ TRANG
    // ============================================

    loadData();
});
