
/* =========================================
   CHI TIẾT KẾT QUẢ CẬN LÂM SÀNG
   BÁC SĨ - CHỈ XEM KẾT QUẢ
========================================= */

(() => {
    "use strict";

    const el = id => document.getElementById(id);

    const API_BASE = "/api/bac-si/kham-benh";

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
            headers
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

        alert.textContent = message;
        alert.hidden = false;
    }

    /* TRẠNG THÁI */

    function updateStatus(status, hasResult) {
        const badge = el("clsStatus");

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

        /* CHỈ SỐ XÉT NGHIỆM */

        const rows = pick(
            data,
            "chiTiet",
            "ChiTiet"
        );

        const tbody = el("clsIndexesBody");
        tbody.replaceChildren();

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

                tbody.appendChild(tr);
            });

            el("clsIndexesPanel").hidden = false;

        } else {
            el("clsIndexesPanel").hidden = true;
        }

        /* FILE ĐÍNH KÈM */

        const fileUrl = safeLink(
            pick(data, "fileURL", "FileURL")
        );

        el("clsFilePanel").hidden = !fileUrl;

        if (fileUrl) {
            el("clsFileLink").href = fileUrl;
        }
    }

    /* TẢI TOÀN BỘ DỮ LIỆU */

    async function loadData() {
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

            el("clsBack").addEventListener(
                "click",
                () => location.assign(pageCLS())
            );

            el("clsBackBottom").addEventListener(
                "click",
                () => location.assign(pageCLS())
            );

            el("clsGoExam").addEventListener(
                "click",
                () => location.assign(pageExam())
            );

            el("clsReload").addEventListener(
                "click",
                loadData
            );

            loadData();
        }
    );

})();
