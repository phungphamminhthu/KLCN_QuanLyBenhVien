
/* =====================================================
   MEDCARE - TẠO PHIẾU CHỈ ĐỊNH CẬN LÂM SÀNG

   - Xét nghiệm theo danh mục mới trong MySQL
   - 3 cột cố định giống phiếu giấy
   - Không hiển thị chỉ số KTV
   - Không hiển thị giá
   - Tổng kết và lưu chỉ định
===================================================== */

document.addEventListener("DOMContentLoaded", async () => {

    "use strict";

    const API = "/api/bac-si/kham-benh";

    const $ = id => document.getElementById(id);

    const maLichKham = Number(
        new URLSearchParams(location.search)
            .get("maLichKham")
    );

    const tabs = [
        "Xét nghiệm",
        "Siêu âm",
        "X-quang",
        "CT",
        "Nội soi",
        "Thăm dò chức năng",
        "Khác"
    ];

    const danhMuc = [];

    // Lưu dịch vụ bác sĩ đã chọn.
    // Calci TP xuất hiện hai nhóm nhưng chỉ tạo
    // một chỉ định do dùng chung MaDichVu.
    const daChon = new Map();

    let tabDangXem = "Xét nghiệm";

    let duocChon = false;

    let dangLuu = false;


    /* =====================================================
       1. TOKEN VÀ API
    ===================================================== */

    function token() {

        return localStorage.getItem("Token")
            || localStorage.getItem("token")
            || sessionStorage.getItem("Token")
            || sessionStorage.getItem("token");
    }

    async function api(url, options = {}) {

        const headers = {
            ...(options.headers || {})
        };

        const jwt = token();

        if (jwt) {
            headers.Authorization = `Bearer ${jwt}`;
        }

        const response = await fetch(url, {
            credentials: "same-origin",
            ...options,
            headers
        });

        const raw = await response.text();

        let data;

        try {
            data = raw ? JSON.parse(raw) : null;
        } catch {
            data = raw;
        }

        if (!response.ok) {

            throw new Error(
                data?.message ||
                data?.thongBao ||
                `HTTP ${response.status}`
            );
        }

        return data;
    }


    /* =====================================================
       2. TIỆN ÍCH
    ===================================================== */

    function html(s) {

        return String(s ?? "").replace(
            /[&<>"']/g,
            c => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            })[c]
        );
    }

    function chuanHoa(s) {

        return String(s ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/gi, "d")
            .toLowerCase()
            .trim();
    }

    function baoLoi(message) {

        const alert = $("orderAlert");

        if (!alert) return;

        alert.textContent = message || "";

        alert.hidden = !message;
    }


    /* =====================================================
       3. PHÂN LOẠI CÁC DỊCH VỤ KHÁC
    ===================================================== */

    function xacDinhTab(dv) {

        const ten = chuanHoa(dv.tenDichVu);

        const loai = chuanHoa(dv.loaiDichVu);

        const s = `${loai} ${ten}`;

        // Xét nghiệm chỉ lấy từ danh mục mới,
        // không sử dụng dịch vụ xét nghiệm cũ.
        if (
            /xet nghiem|xetnghiem|\bxn\b/.test(s) ||
            loai.includes("kham chuyen khoa")
        ) {
            return null;
        }

        if (s.includes("sieu am")) {
            return "Siêu âm";
        }

        if (
            s.includes("x-quang") ||
            s.includes("x quang")
        ) {
            return "X-quang";
        }

        if (/\bct\b/.test(s)) {
            return "CT";
        }

        if (s.includes("noi soi")) {
            return "Nội soi";
        }

        if (
            /tham do chuc nang|dien tim|dien nao|ho hap ky/
                .test(s)
        ) {
            return "Thăm dò chức năng";
        }

        return null;
    }


    /* =====================================================
       4. THÊM DỊCH VỤ VÀO DANH MỤC
    ===================================================== */

    function themMuc(row, tab) {

        const ma = Number(row.maDichVu);

        if (
            !Number.isInteger(ma) ||
            ma <= 0
        ) {
            return;
        }

        danhMuc.push({

            key: `dv:${ma}`,

            maDichVu: ma,

            ten: String(
                row.tenDichVu || "Dịch vụ"
            ),

            nhom: String(
                row.nhom || tab
            ),

            cot: Number(row.cot || 1),

            thuTu: Number(row.thuTu || 0),

            maMuc: Number(row.maMuc || 0),

            tab
        });
    }


    /* =====================================================
       5. LẤY DANH MỤC TỪ MYSQL
    ===================================================== */

    async function taiDanhMuc() {

        const [xetNghiem, dichVuKhac] =
            await Promise.all([

                api(
                    `${API}/dich-vu/phieu-xet-nghiem`
                ),

                api(
                    `${API}/dich-vu`
                )

            ]);

        if (
            !Array.isArray(xetNghiem) ||
            xetNghiem.length === 0
        ) {

            throw new Error(
                "Chưa có danh mục xét nghiệm. " +
                "Kiểm tra SQL và API phieu-xet-nghiem."
            );
        }

        if (!Array.isArray(dichVuKhac)) {

            throw new Error(
                "Danh sách dịch vụ không hợp lệ."
            );
        }

        // Danh mục xét nghiệm mới
        xetNghiem.forEach(row => {

            themMuc(
                row,
                "Xét nghiệm"
            );

        });

        const maXetNghiem = new Set(

            xetNghiem.map(
                row => Number(row.maDichVu)
            )

        );

        // Giữ các tab Siêu âm, X-quang...
        // Không lấy xét nghiệm cũ vào giao diện
        for (const row of dichVuKhac) {

            if (
                maXetNghiem.has(
                    Number(row.maDichVu)
                )
            ) {
                continue;
            }

            const tab = xacDinhTab(row);

            if (tab) {

                themMuc({
                    ...row,
                    nhom: tab
                }, tab);

            }
        }
    }


    /* =====================================================
       6. HIỂN THỊ TAB
    ===================================================== */

    function veTabs() {

        const hienThi = tabs.filter(tab =>

            danhMuc.some(
                x => x.tab === tab
            )

        );

        if (!hienThi.includes(tabDangXem)) {

            tabDangXem =
                hienThi[0] || "Xét nghiệm";
        }

        $("serviceTabs").innerHTML =
            hienThi.map(tab => `

                <button
                    type="button"
                    class="service-tab ${
                        tab === tabDangXem
                            ? "active"
                            : ""
                    }"
                    data-tab="${html(tab)}">

                    ${html(tab)}

                </button>

            `).join("");
    }


    /* =====================================================
       7. TẠO CHECKBOX
    ===================================================== */

    function checkbox(item) {

        return `
            <label
                class="service-option medcare-paper-option">

                <input
                    type="checkbox"

                    data-key="${html(item.key)}"

                    data-ma-muc="${item.maMuc}"

                    ${
                        daChon.has(item.key)
                            ? "checked"
                            : ""
                    }

                    ${
                        duocChon
                            ? ""
                            : "disabled"
                    }
                >

                <span class="service-info">

                    <strong>
                        ${html(item.ten)}
                    </strong>

                </span>

            </label>
        `;
    }


    /* =====================================================
       8. HIỂN THỊ DANH MỤC 3 CỘT
    ===================================================== */

    function veDanhMuc() {

        const tuKhoa = chuanHoa(
            $("serviceSearch")?.value
        );

        $("catalogTitle").textContent =
            `PHIẾU CHỈ ĐỊNH ${tabDangXem.toUpperCase()}`;

        const ds = danhMuc.filter(item =>

            item.tab === tabDangXem &&

            (
                !tuKhoa ||

                chuanHoa(
                    `${item.nhom} ${item.ten}`
                ).includes(tuKhoa)
            )

        );

        // Mỗi cột có các nhóm cố định
        const cot = [
            new Map(),
            new Map(),
            new Map()
        ];

        for (const item of ds) {

            let i;

            if (tabDangXem === "Xét nghiệm") {

                // Đúng cột được lưu trong MySQL
                i = Math.min(
                    2,
                    Math.max(0, item.cot - 1)
                );

            } else {

                i = 0;
            }

            if (!cot[i].has(item.nhom)) {

                cot[i].set(
                    item.nhom,
                    []
                );
            }

            cot[i].get(item.nhom)
                .push(item);
        }

        // Nhóm Dị ứng chỉ là chữ
        const coDiUng =
            tabDangXem === "Xét nghiệm" &&

            (
                !tuKhoa ||

                chuanHoa(
                    "Dị ứng PANEL 64 dị nguyên"
                ).includes(tuKhoa)
            );

        if (
            ds.length === 0 &&
            !coDiUng
        ) {

            $("serviceGroups").innerHTML =
                "<p>Không có xét nghiệm phù hợp.</p>";

            return;
        }


$("serviceGroups").innerHTML =
    cot
        .map((nhomCot, i) => ({
            nhomCot,
            i
        }))
        .filter(({ nhomCot, i }) =>
            tabDangXem === "Xét nghiệm" ||
            nhomCot.size > 0 ||
            (i === 2 && coDiUng)
        )
        .map(({ nhomCot, i }) => {

                const noiDung =
                    [...nhomCot.entries()]
                        .map(([tenNhom, rows]) => {

                            const itemsHTML =
                                rows.map(item => {

                                    const phuDe =
                                        tabDangXem ===
                                            "Xét nghiệm" &&

                                        tenNhom ===
                                            "CÁC XÉT NGHIỆM KHÁC" &&

                                        item.thuTu === 4

                                            ? `
                                                <p class="medcare-paper-subtitle">
                                                    * XN Tế bào âm đạo -
                                                    cổ tử cung:
                                                </p>
                                            `
                                            : "";

                                    return phuDe +
                                        checkbox(item);

                                }).join("");

                            return `

                                <section
                                    class="service-group medcare-paper-group">

                                    <h3 class="group-heading">
                                        ${html(tenNhom)}
                                    </h3>

                                    <div class="group-body">
                                        ${itemsHTML}
                                    </div>

                                </section>

                            `;

                        }).join("");

                return `

                    <div
                        class="service-column medcare-paper-column"

                        data-column="${i + 1}">

                        ${noiDung}

                        ${
                            i === 2 && coDiUng
                                ? `
                                    <section
                                        class="service-group medcare-paper-group">

                                        <h3 class="group-heading">
                                            DỊ ỨNG
                                        </h3>

                                        <div
                                            class="group-body medcare-paper-static">

                                            PANEL 64 dị nguyên

                                        </div>

                                    </section>
                                `
                                : ""
                        }

                    </div>

                `;

            }).join("");
    }


    /* =====================================================
       9. ĐỒNG BỘ CHECKBOX
    ===================================================== */

    function dongBoCheckbox() {

        $("serviceGroups")
            .querySelectorAll(
                "input[data-key]"
            )
            .forEach(input => {

                input.checked =
                    daChon.has(
                        input.dataset.key
                    );

            });
    }


    /* =====================================================
       10. TẠO DANH SÁCH TỔNG KẾT
    ===================================================== */

    function nhomDaChon(coNutXoa = true) {

        const groups = new Map();

        for (const item of daChon.values()) {

            const tenNhom =
                item.tab === "Xét nghiệm"
                    ? item.nhom
                    : item.tab;

            if (!groups.has(tenNhom)) {

                groups.set(
                    tenNhom,
                    []
                );
            }

            groups.get(tenNhom)
                .push(item);
        }

        return [...groups.entries()]
            .map(([tenNhom, rows]) => `

                <section class="selected-group">

                    <h3 class="selected-group-title">
                        ${html(tenNhom)}
                    </h3>

                    <div class="selected-group-list">

                        ${rows.map(item => `

                            <div class="selected-item">

                                <div class="selected-item-info">

                                    <strong>
                                        ${html(item.ten)}
                                    </strong>

                                </div>

                                ${
                                    coNutXoa

                                        ? `
                                            <button
                                                type="button"

                                                class="remove-service"

                                                data-key="${html(item.key)}"

                                                aria-label="Bỏ ${html(item.ten)}">

                                                ×
                                            </button>
                                        `

                                        : ""
                                }

                            </div>

                        `).join("")}

                    </div>

                </section>

            `).join("");
    }


    /* =====================================================
       11. CẬP NHẬT TỔNG KẾT
    ===================================================== */

    function veTongKet() {

        const soLuong = daChon.size;

        $("selectedBadge").textContent =
            soLuong;

        $("serviceCount").textContent =
            soLuong;

        $("selectedServices").innerHTML =
            soLuong

                ? nhomDaChon()

                : `
                    <div class="selected-empty">
                        Chưa chọn xét nghiệm nào.
                    </div>
                `;

        $("btnSubmitOrders").disabled =
            !duocChon ||
            soLuong === 0 ||
            dangLuu;
    }


    /* =====================================================
       12. GHI CHÚ CUỐI PHIẾU
    ===================================================== */

    function taoCuoiPhieu() {

        if ($("medcarePaperFoot")) {
            return;
        }

        const el =
            document.createElement("div");

        el.id = "medcarePaperFoot";

        el.className =
            "medcare-paper-foot";

        el.innerHTML = `

            <label class="medcare-extra-request">

                <span>
                    Các xét nghiệm khác theo yêu cầu:
                </span>

                <textarea
                    id="medcareExtraText"

                    rows="2"

                    maxlength="1500"

                    placeholder="Ghi thêm xét nghiệm theo yêu cầu (nếu có)...">
                </textarea>

            </label>

            <div class="medcare-doctor-sign">

                <span>
                    Ngày ${
                        new Date()
                            .toLocaleDateString("vi-VN")
                    }
                </span>

                <strong>
                    BÁC SĨ CHỈ ĐỊNH
                </strong>

                <span id="medcarePaperDoctor"></span>

            </div>
        `;

        $("serviceGroups")
            .insertAdjacentElement(
                "afterend",
                el
            );

        el.hidden =
            tabDangXem !== "Xét nghiệm";

        $("medcarePaperDoctor").textContent =
            $("doctorNameInOrder")?.textContent || "";
    }

    function capNhatCuoiPhieu() {

        if ($("medcarePaperFoot")) {

            $("medcarePaperFoot").hidden =
                tabDangXem !== "Xét nghiệm";
        }
    }


    /* =====================================================
       13. CHUYỂN TAB
    ===================================================== */

    $("serviceTabs").addEventListener(
        "click",
        event => {

            const btn = event.target.closest(
                "button[data-tab]"
            );

            if (!btn) {
                return;
            }

            tabDangXem = btn.dataset.tab;

            $("serviceSearch").value = "";

            veTabs();

            veDanhMuc();

            capNhatCuoiPhieu();
        }
    );


    /* =====================================================
       14. TÌM KIẾM
    ===================================================== */

    $("serviceSearch").addEventListener(
        "input",
        veDanhMuc
    );


    /* =====================================================
       15. CHỌN XÉT NGHIỆM
    ===================================================== */

    $("serviceGroups").addEventListener(
        "change",
        event => {

            const input =
                event.target.closest(
                    "input[data-key]"
                );

            if (
                !input ||
                !duocChon
            ) {
                return;
            }

            // Tìm đúng checkbox theo mã mục
            const item =
                danhMuc.find(row =>

                    row.key ===
                        input.dataset.key &&

                    row.maMuc ===
                        Number(input.dataset.maMuc)

                ) ||

                danhMuc.find(row =>
                    row.key === input.dataset.key
                );

            if (!item) {
                return;
            }

            if (input.checked) {

                daChon.set(
                    item.key,
                    item
                );

            } else {

                daChon.delete(
                    item.key
                );
            }

            // Đồng bộ checkbox trùng dịch vụ
            // Không vẽ lại giao diện 3 cột
            dongBoCheckbox();

            veTongKet();
        }
    );


    /* =====================================================
       16. BỎ MỤC TRONG TỔNG KẾT
    ===================================================== */

    $("selectedServices").addEventListener(
        "click",
        event => {

            const btn =
                event.target.closest(
                    "button[data-key]"
                );

            if (!btn) {
                return;
            }

            daChon.delete(
                btn.dataset.key
            );

            dongBoCheckbox();

            veTongKet();
        }
    );


    /* =====================================================
       17. POPUP XÁC NHẬN PHIẾU
    ===================================================== */

    const dialog =
        $("confirmOrderDialog");

    function dongXacNhan() {

        if (dialog) {
            dialog.hidden = true;
        }
    }

    $("btnSubmitOrders").addEventListener(
        "click",
        event => {

            event.preventDefault();

            if (
                !duocChon ||
                daChon.size === 0
            ) {
                return;
            }

            const note =
                $("medcareExtraText")
                    ?.value.trim() || "";

            $("confirmOrderMessage").textContent =
                `Xác nhận tạo phiếu gồm ${daChon.size} ` +
                `xét nghiệm/dịch vụ cho lượt khám ${maLichKham}?`;

            $("confirmOrderSummary").innerHTML =
                nhomDaChon(false) +

                (
                    note

                        ? `
                            <p class="medcare-preview-note">

                                <strong>
                                    Yêu cầu thêm:
                                </strong>

                                ${html(note)}

                            </p>
                        `

                        : ""
                );

            dialog.hidden = false;
        }
    );

    $("btnCancelConfirm").addEventListener(
        "click",
        dongXacNhan
    );

    dialog.addEventListener(
        "click",
        event => {

            if (event.target === dialog) {
                dongXacNhan();
            }
        }
    );

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                !dangLuu
            ) {
                dongXacNhan();
            }
        }
    );


    /* =====================================================
       18. LƯU PHIẾU VÀO MYSQL
    ===================================================== */

    $("btnConfirmSubmit").addEventListener(
        "click",
        async event => {

            event.preventDefault();

            if (
                !duocChon ||
                daChon.size === 0 ||
                dangLuu
            ) {
                return;
            }

            const danhSach = [...daChon.values()];

            const ghiChuKhac =
                $("medcareExtraText")?.value.trim() || "";

            if (danhSach.length === 0) {
                dongXacNhan();
                baoLoi("Vui lòng chọn ít nhất một dịch vụ.");
                return;
            }

            // Tránh lưu nửa chừng qua hai API
            //            if (
            //                lab.length &&
            //                others.length
            //            ) {
            //
            //                dongXacNhan();
            //
            //                baoLoi(
            //                    "Hãy tạo phiếu xét nghiệm và " +
            //                    "chỉ định Siêu âm/X-quang thành " +
            //                    "hai lần riêng."
            //                );
            //
            //                return;
            //            }

            dangLuu = true;

            const btn =
                $("btnConfirmSubmit");

            const btnCancel =
                $("btnCancelConfirm");

            btn.disabled = true;

            btnCancel.disabled = true;

            btn.textContent =
                "Đang lưu...";

            veTongKet();

            try {


                    await api(`${API}/${maLichKham}/chi-dinh-hon-hop`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            maDichVu: danhSach.map(x => x.maDichVu),
                            ghiChuKhac
                        })
                    });


                // Trở về trang khám
                location.href =
                    `/auth/bac-si/kham-benh/${maLichKham}/can-lam-sang`;

            } catch (error) {

                dongXacNhan();

                baoLoi(
                    "Không thể lưu phiếu: " +
                    error.message
                );

            } finally {

                dangLuu = false;

                btn.disabled = false;

                btnCancel.disabled = false;

                btn.textContent =
                    "Xác nhận tạo phiếu";

                veTongKet();
            }
        }
    );


    /* =====================================================
       19. KHÔNG HIỂN THỊ GIÁ
    ===================================================== */

    const totalPrice = $("totalPrice");

    if (totalPrice) {

        const row =
            totalPrice.parentElement;

        if (
            row &&
            row !== $("selectedServices")
        ) {

            row.hidden = true;

        } else {

            totalPrice.hidden = true;
        }
    }


    /* =====================================================
       20. KHỞI TẠO TRANG
    ===================================================== */

    if (
        !Number.isInteger(maLichKham) ||
        maLichKham <= 0
    ) {

        baoLoi(
            "Mã lượt khám trên URL không hợp lệ."
        );

        return;
    }

    $("visitId").textContent =
        maLichKham;

    $("backToExam").href =
        `/auth/bac-si/kham-benh/${maLichKham}/can-lam-sang`;

    $("orderCurrentDate").textContent =
        new Date()
            .toLocaleDateString("vi-VN");

    try {

        // Lấy hồ sơ bệnh nhân
        const hoSo = await api(
            `${API}/${maLichKham}/ho-so`
        );

        $("patientName").textContent =
            hoSo.hoTen || "---";

        $("patientId").textContent =
            hoSo.maBenhNhan != null

                ? "BN" +
                  String(
                      hoSo.maBenhNhan
                  ).padStart(6, "0")

                : "---";

        $("patientBirthYear").textContent =
            hoSo.namSinh ||

            (
                hoSo.ngaySinh

                    ? String(
                        hoSo.ngaySinh
                    ).slice(0, 4)

                    : "---"
            );

        $("patientGender").textContent =
            hoSo.gioiTinh || "---";

        $("doctorNameInOrder").textContent =
            hoSo.tenBacSi || "Bác sĩ";

        $("diagnosisText").textContent =
            hoSo.chanDoan ||
            "Chưa có chẩn đoán";

        // Kiểm tra điều kiện tạo chỉ định
        duocChon =
            hoSo.trangThai === "DangKham" &&

            [
                "DangKham",
                "ChoCLS"
            ].includes(
                hoSo.trangThaiLichKham
            );

        if (!duocChon) {

            baoLoi(
                "Ca khám chưa ở trạng thái " +
                "cho phép tạo chỉ định."
            );
        }

        // Tải danh mục thật từ database mới
        await taiDanhMuc();

        veTabs();

        veDanhMuc();

        veTongKet();

        taoCuoiPhieu();

    } catch (error) {

        baoLoi(
            "Không tải được dữ liệu: " +
            error.message
        );
    }

});
