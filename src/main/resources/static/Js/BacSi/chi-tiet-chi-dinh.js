
document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const $ = id => document.getElementById(id);

    const params = new URLSearchParams(window.location.search);

    const maLichKham = Number(params.get("maLichKham"));
    const maPhieuChiDinh = params.get("maPhieuChiDinh");
    const maChiDinh = Number(params.get("maChiDinh"));

    const API_BASE = "/api/bac-si/kham-benh";

    function layToken() {
        return localStorage.getItem("Token")
            || localStorage.getItem("token")
            || sessionStorage.getItem("Token")
            || sessionStorage.getItem("token");
    }

    async function api(url) {
        const token = layToken();

        const response = await fetch(url, {
            headers: {
                ...(token
                    ? { Authorization: `Bearer ${token}` }
                    : {})
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Không thể tải dữ liệu."
            );
        }

        return data;
    }

    function text(id, value) {
        const element = $(id);

        if (!element) return;

        element.textContent =
            value === null ||
            value === undefined ||
            value === ""
                ? "---"
                : String(value);
    }

    function ngay(value) {
        if (!value) return "---";

        const normalized = String(value).replace(" ", "T");
        const [date, time] = normalized.split("T");
        const parts = date.split("-");

        if (parts.length !== 3) return normalized;

        const result =
            `${parts[2]}/${parts[1]}/${parts[0]}`;

        return time
            ? `${result} ${time.substring(0, 5)}`
            : result;
    }

    function tenTrangThai(value) {
        return {
            ChoThucHien: "Chờ thực hiện",
            DangThucHien: "Đang thực hiện",
            DaHoanThanh: "Đã hoàn thành"
        }[value] || value || "---";
    }

    function thongBao(message, isError = false) {
        const element = $("detailAlert");

        if (!element) return;

        element.textContent = message;
        element.classList.toggle("error", isError);
        element.hidden = false;
    }

    // Thêm một dòng vào bảng bằng textContent
    function themDong(tbody, values, isHeader = false) {
        const tr = document.createElement("tr");

        if (isHeader) {
            tr.classList.add("service-group-row");
        }

        values.forEach(value => {
            const td = document.createElement("td");

            td.textContent =
                value === null ||
                value === undefined ||
                value === ""
                    ? "---"
                    : String(value);

            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    }

    // Dòng tiêu đề dịch vụ
    function themTieuDeDichVu(tbody, dichVu, stt) {
        const tr = document.createElement("tr");
        tr.classList.add("service-group-row");

        const td = document.createElement("td");
        td.colSpan = 2;

        const title = document.createElement("strong");

        title.textContent =
            `${stt}. ${dichVu.tenDichVu || "Dịch vụ"}`;

        const status = document.createElement("span");
        status.className = "service-group-status";
        status.textContent =
            ` — ${tenTrangThai(dichVu.trangThai)}`;

        td.appendChild(title);
        td.appendChild(status);

        tr.appendChild(td);
        tbody.appendChild(tr);
    }

function hienThiChiSo(danhSachDichVu) {
    const tbody = $("indexTableBody");
    if (!tbody) return;

    tbody.replaceChildren();

    const nhomXetNghiem = new Map();

    // Gom dịch vụ theo nhóm xét nghiệm
    danhSachDichVu.forEach(dichVu => {
        const nhom = dichVu.nhom || "Dịch vụ khác";

        if (!nhomXetNghiem.has(nhom)) {
            nhomXetNghiem.set(nhom, []);
        }

        nhomXetNghiem.get(nhom).push(dichVu);
    });

    let tongHangMuc = 0;
    let sttNhom = 0;

    nhomXetNghiem.forEach((danhSach, tenNhom) => {
        sttNhom++;
        let sttChiSo = 0;

        // Tiêu đề nhóm lớn
        const trNhom = document.createElement("tr");
        trNhom.className = "service-group-row";

        const tdNhom = document.createElement("td");
        tdNhom.colSpan = 2;
        tdNhom.textContent = `${sttNhom}. ${tenNhom}`;

        trNhom.appendChild(tdNhom);
        tbody.appendChild(trNhom);

        // Các xét nghiệm thuộc nhóm
        danhSach.forEach(dichVu => {
            const chiSo = Array.isArray(dichVu.chiSo)
                ? dichVu.chiSo
                : [];

            const tenDichVu =
                dichVu.tenHienThi ||
                dichVu.tenDichVu ||
                "---";

            if (chiSo.length === 0) {
                tongHangMuc++;

                sttChiSo++;
                themDong(tbody, [
                    sttChiSo,
                    tenDichVu
                ]);
            } else {
                chiSo.forEach(item => {
                    tongHangMuc++;

                    sttChiSo++;
                    themDong(tbody, [
                        sttChiSo,
                        item.tenChiSo || tenDichVu
                    ]);
                });
            }
        });
    });

    text(
        "indexCount",
        `${danhSachDichVu.length} dịch vụ · ${tongHangMuc} chỉ số`
    );
}


    // Phiếu mới: lấy toàn bộ dịch vụ
    async function taiPhieuChiDinh() {
        const url =
            `${API_BASE}/${maLichKham}/phieu-chi-dinh/`
            + encodeURIComponent(maPhieuChiDinh);

        const data = await api(url);

        const danhSach = Array.isArray(data.danhSachDichVu)
            ? data.danhSachDichVu
            : [];

        text(
            "detailCode",
            `Phiếu ${String(data.maPhieuChiDinh).substring(0, 8)}`
        );

        text("patientName", data.hoTen);
        text("examDate", ngay(data.ngayKham));
        text("orderDate", ngay(data.ngayChiDinh));

        text("serviceName", `${danhSach.length} xét nghiệm`);
        text("serviceType", "Phiếu chỉ định xét nghiệm");

        const phong = [
            ...new Set(
                danhSach
                    .map(item => item.maPhong)
                    .filter(value => value != null)
            )
        ];

        text(
            "roomName",
            phong.length
                ? phong.map(ma => `Phòng ${ma}`).join(", ")
                : "Chưa phân phòng"
        );

        text(
            "currentStatus",
            tenTrangThai(data.trangThai)
        );

        hienThiChiSo(danhSach);
    }

    // Chỉ định cũ: vẫn hỗ trợ xem bằng MaChiDinh
    async function taiChiDinhCu() {
        const url =
            `${API_BASE}/${maLichKham}/chi-dinh/`
            + `${maChiDinh}/chi-tiet-day-du`;

        const data = await api(url);

        text("detailCode", `CD${data.maChiDinh}`);
        text("patientName", data.hoTen);
        text("examDate", ngay(data.ngayKham));
        text("orderDate", ngay(data.ngayChiDinh));

        text("serviceName", data.tenDichVu);
        text("serviceType", data.loaiDichVu);

        text(
            "roomName",
            data.maPhong != null
                ? `Phòng ${data.maPhong}`
                : "Chưa phân phòng"
        );

        text(
            "currentStatus",
            tenTrangThai(data.trangThai)
        );

        hienThiChiSo([data]);
    }

    // Kiểm tra tham số URL
    if (!Number.isInteger(maLichKham) || maLichKham <= 0) {
        thongBao("Mã lịch khám không hợp lệ.", true);
        return;
    }

    if (
        !maPhieuChiDinh &&
        (!Number.isInteger(maChiDinh) || maChiDinh <= 0)
    ) {
        thongBao("Không tìm thấy mã phiếu chỉ định.", true);
        return;
    }

    try {
        if (maPhieuChiDinh) {
            await taiPhieuChiDinh();
        } else {
            await taiChiDinhCu();
        }
    } catch (error) {
        console.error(error);

        thongBao(
            "Không thể tải chi tiết: " + error.message,
            true
        );
    }
});
