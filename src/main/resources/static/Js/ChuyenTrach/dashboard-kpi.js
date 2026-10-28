/**
 * Bổ sung các thẻ KPI có thể click và thống kê hoàn thành từ MySQL.
 * Độc lập với dashboard.js hiện có của nhóm để không ghi đè nghiệp vụ.
 */
document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    const root = document.getElementById('statCards');
    if (!root) return;

    const cardsConfig = [
        {
            title: 'Tổng lượt CLS hôm nay',
            key: 'tongLuotCLS',
            note: 'Lượt khám có chỉ định',
            href: '/ChuyenTrach/benh-nhan',
            hint: 'Xem danh sách bệnh nhân'
        },
        {
            title: 'Chờ thực hiện',
            key: 'choThucHien',
            note: 'Bệnh nhân',
            href: '/ChuyenTrach/benh-nhan-cho',
            hint: 'Xem bệnh nhân đang chờ CLS'
        },
        {
            title: 'Đang thực hiện',
            key: 'dangThucHien',
            note: 'Bệnh nhân',
            href: '/ChuyenTrach/dang-thuc-hien',
            hint: 'Xem danh sách chỉ định'
        },
        {
            title: 'Đã hoàn thành',
            key: 'daHoanThanh',
            note: 'Lượt CLS hoàn thành',
            href: '/ChuyenTrach/ket-qua-da-thuc-hien',
            hint: 'Xem kết quả đã thực hiện'
        }
    ];

    let lastResponse = null;
    let requestVersion = 0;

    function renderCardsData(cards, response) {
        cardsConfig.forEach((config, index) => {
            const card = cards[index];
            if (!card) return;

            const label = card.querySelector('.ct-stat-label, .ct-stat-title');
            const value = card.querySelector('.ct-stat-value');
            const note = card.querySelector('.ct-stat-note, .ct-stat-sub');

            if (label) label.textContent = config.title;
            if (note) note.textContent = config.note;

            if (value) {
                const number = response?.[config.key];
                value.textContent = Number.isFinite(Number(number))
                    && number !== null && number !== undefined
                    ? String(Number(number))
                    : '—';
            }
        });
    }

    function activateCards() {
        const cards = [...root.querySelectorAll('.ct-stat-card')];
        if (cards.length !== 4) return false;

        cards.forEach((card, index) => {
            if (card.dataset.kpiLinkReady === 'true') return;

            const config = cardsConfig[index];
            card.dataset.kpiLinkReady = 'true';
            card.classList.add('ct-stat-clickable');
            card.setAttribute('role', 'link');
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-label', config.hint);
            card.title = config.hint;

            // Capture để tránh click cũ trong dashboard.js dẫn thẳng
            // vào một bệnh nhân DangCLS bất kỳ.
            const navigate = (event) => {
                event.preventDefault();
                event.stopImmediatePropagation();
                window.location.assign(config.href);
            };

            card.addEventListener('click', navigate, true);
            card.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                navigate(event);
            }, true);
        });

        // Sau khi dashboard.js cập nhật DOM, không cho hiện lại số ảo.
        renderCardsData(cards, lastResponse);
        return true;
    }

    async function refreshFromDatabase() {
        const version = ++requestVersion;
        const token = sessionStorage.getItem('Token')
            || localStorage.getItem('Token');

        if (!token) return;

        try {
            const response = await fetch('/api/chuyen-trach/thong-ke/hom-nay', {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                cache: 'no-store'
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (version !== requestVersion) return;

            lastResponse = data;
            const cards = [...root.querySelectorAll('.ct-stat-card')];
            if (cards.length === 4) renderCardsData(cards, data);
        } catch (error) {
            console.error('Không tải được KPI CLS:', error);
            lastResponse = null; // Không hiển thị 0 khi API lỗi.
            activateCards();
        }
    }

    // Dashboard cũ xóa và tạo lại 4 ô mỗi lần nhấn "Làm mới".
    // Theo dõi đúng sự kiện render để cập nhật lại link và dữ liệu.
    const observer = new MutationObserver(() => {
        if (activateCards()) void refreshFromDatabase();
    });
    observer.observe(root, { childList: true });

    if (activateCards()) void refreshFromDatabase();
});
