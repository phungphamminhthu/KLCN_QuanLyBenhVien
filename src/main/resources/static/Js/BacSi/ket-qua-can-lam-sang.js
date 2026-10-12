
const API_BASE = "/api/bac-si/kham-benh";

let danhSachKetQua = [];

let boLocHienTai = "all";

let tuKhoaTimKiem = "";


/* =====================================================
   KHỞI TẠO
===================================================== */

document.addEventListener("DOMContentLoaded", function () {

    khoiTaoBoLoc();

    khoiTaoTimKiem();

    khoiTaoModal();

    //khoiTaoDangXuat();

    taiDanhSachKetQua();

});


/* =====================================================
   BỘ LỌC
===================================================== */

function khoiTaoBoLoc() {

    const buttons =
        document.querySelectorAll(".filter-btn");

    buttons.forEach(function (button) {

        button.addEventListener("click", function () {

            buttons.forEach(function (item) {

                item.classList.remove("active");

            });

            button.classList.add("active");

            boLocHienTai =
                button.dataset.filter;

            hienThiDanhSach();

        });

    });

}


/* =====================================================
   TÌM KIẾM
===================================================== */

function khoiTaoTimKiem() {

    const searchInput =
        document.getElementById("searchInput");

    const headerSearch =
        document.getElementById("headerSearch");


    if (searchInput) {

        searchInput.addEventListener(
            "input",
            function () {

                tuKhoaTimKiem =
                    chuanHoa(searchInput.value);

                if (headerSearch) {
                    headerSearch.value =
                        searchInput.value;
                }

                hienThiDanhSach();

            }
        );

    }


    if (headerSearch) {

        headerSearch.addEventListener(
            "input",
            function () {

                tuKhoaTimKiem =
                    chuanHoa(headerSearch.value);

                if (searchInput) {
                    searchInput.value =
                        headerSearch.value;
                }

                hienThiDanhSach();

            }
        );

    }

}


/* =====================================================
   MODAL
===================================================== */

function khoiTaoModal() {

    const modal =
        document.getElementById("detailModal");

    const closeButton =
        document.getElementById("closeModal");


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            dongModal
        );

    }


    if (modal) {

        modal.addEventListener(
            "click",
            function (event) {

                if (event.target === modal) {

                    dongModal();

                }

            }
        );

    }


    document.addEventListener(
        "keydown",
        function (event) {

            if (event.key === "Escape") {

                dongModal();

            }

        }
    );

}


/* =====================================================
   LOAD DANH SÁCH
===================================================== */

async function taiDanhSachKetQua() {

    const tbody =
        document.getElementById(
            "resultTableBody"
        );


    if (!tbody) {
        return;
    }


    tbody.innerHTML = `
        <tr>
            <td colspan="7"
                class="empty">
                Đang tải dữ liệu...
            </td>
        </tr>
    `;


    try {

        const response =
            await fetch(
                API_BASE +
                "/ket-qua-can-lam-sang"
            );


        if (!response.ok) {

            const error =
                await docJson(response);

            throw new Error(
                error?.message ||
                "Không thể tải kết quả cận lâm sàng."
            );

        }


        const data =
            await response.json();


        if (Array.isArray(data)) {

            danhSachKetQua = data;

        } else {

            danhSachKetQua = [];

        }


        capNhatThongKe();

        hienThiDanhSach();


    } catch (error) {

        console.error(error);

        tbody.innerHTML = `
            <tr>
                <td colspan="7"
                    class="empty">
                    ${escapeHtml(error.message)}
                </td>
            </tr>
        `;

    }

}


/* =====================================================
   KIỂM TRA CÓ KẾT QUẢ
===================================================== */

function coKetQua(item) {

    if (
        typeof item.coKetQua === "boolean"
    ) {

        return item.coKetQua;

    }


    if (item.maKetQua != null) {

        return true;

    }


    return false;

}


/* =====================================================
   THỐNG KÊ
===================================================== */

function capNhatThongKe() {

    const tong =
        danhSachKetQua.length;


    const daCoKetQua =
        danhSachKetQua.filter(
            function (item) {

                return coKetQua(item);

            }
        ).length;


    const dangCho =
        tong - daCoKetQua;


    const totalCount =
        document.getElementById("totalCount");

    const resultCount =
        document.getElementById("resultCount");

    const waitingCount =
        document.getElementById("waitingCount");


    if (totalCount) {
        totalCount.textContent = tong;
    }

    if (resultCount) {
        resultCount.textContent = daCoKetQua;
    }

    if (waitingCount) {
        waitingCount.textContent = dangCho;
    }

}


/* =====================================================
   HIỂN THỊ DANH SÁCH
===================================================== */

function hienThiDanhSach() {

    const tbody =
        document.getElementById(
            "resultTableBody"
        );


    if (!tbody) {
        return;
    }


    const danhSach =
        danhSachKetQua.filter(
            function (item) {

                const daCoKetQua =
                    coKetQua(item);


                /* FILTER */

                if (
                    boLocHienTai === "done" &&
                    !daCoKetQua
                ) {

                    return false;

                }


                if (
                    boLocHienTai === "waiting" &&
                    daCoKetQua
                ) {

                    return false;

                }


                /* SEARCH */

                if (!tuKhoaTimKiem) {

                    return true;

                }


                const benhNhan =
                    chuanHoa(
                        item.hoTen
                    );


                const dichVu =
                    chuanHoa(
                        item.tenDichVu
                    );


                return (
                    benhNhan.includes(
                        tuKhoaTimKiem
                    )
                    ||
                    dichVu.includes(
                        tuKhoaTimKiem
                    )
                );

            }
        );


    if (danhSach.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="7"
                    class="empty">

                    Không có dữ liệu phù hợp.

                </td>
            </tr>
        `;

        return;

    }


    tbody.innerHTML =
        danhSach.map(
            function (item, index) {

                const daCoKetQua =
                    coKetQua(item);


                return `
                    <tr>

                        <td>
                            ${index + 1}
                        </td>


                        <td>
                            ${escapeHtml(
                                item.hoTen || "—"
                            )}
                        </td>


                        <td>
                            ${escapeHtml(
                                item.tenDichVu || "—"
                            )}
                        </td>


                        <td>
                            ${dinhDangNgay(
                                item.ngayChiDinh
                            )}
                        </td>


                        <td>
                            ${
                                daCoKetQua
                                    ? dinhDangNgay(
                                        item.ngayCoKetQua
                                    )
                                    : "—"
                            }
                        </td>


                        <td>

                            <span class="
                                status
                                ${
                                    daCoKetQua
                                        ? "done"
                                        : "waiting"
                                }
                            ">

                                ${
                                    daCoKetQua
                                        ? "Có kết quả"
                                        : "Chờ kết quả"
                                }

                            </span>

                        </td>


                        <td>

                            <button
                                type="button"

                                class="view-btn"

                                data-lich="${
                                    item.maLichKham || ""
                                }"

                                data-chi-dinh="${
                                    item.maChiDinh || ""
                                }"

                                ${
                                    daCoKetQua
                                        ? ""
                                        : "disabled"
                                }
                            >

                                Xem

                            </button>

                        </td>

                    </tr>
                `;

            }
        )
        .join("");


    ganSuKienNutXem();

}


/* =====================================================
   NÚT XEM
===================================================== */

function ganSuKienNutXem() {

    const buttons =
        document.querySelectorAll(
            ".view-btn:not(:disabled)"
        );


    buttons.forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    const maLichKham =
                        button.dataset.lich;


                    const maChiDinh =
                        button.dataset.chiDinh;


                    xemChiTietKetQua(
                        maLichKham,
                        maChiDinh
                    );

                }
            );

        }
    );

}


/* =====================================================
   XEM CHI TIẾT KẾT QUẢ
===================================================== */

async function xemChiTietKetQua(
    maLichKham,
    maChiDinh
) {

    if (!maLichKham || !maChiDinh) {

        alert(
            "Không xác định được lịch khám hoặc chỉ định."
        );

        return;

    }


    try {

        const url =
            API_BASE
            + "/"
            + maLichKham
            + "/chi-dinh/"
            + maChiDinh
            + "/ket-qua";


        const response =
            await fetch(url);


        const data =
            await docJson(response);


        if (!response.ok) {

            throw new Error(
                data?.message ||
                "Không thể tải chi tiết kết quả."
            );

        }


        if (!data.coKetQua) {

            alert(
                data.message ||
                "Chỉ định chưa có kết quả."
            );

            return;

        }


        const item =
            danhSachKetQua.find(
                function (value) {

                    return (
                        String(
                            value.maLichKham
                        )
                        ===
                        String(
                            maLichKham
                        )
                        &&
                        String(
                            value.maChiDinh
                        )
                        ===
                        String(
                            maChiDinh
                        )
                    );

                }
            ) || {};


        document.getElementById(
            "detailPatient"
        ).textContent =
            item.hoTen || "—";


        document.getElementById(
            "detailService"
        ).textContent =
            item.tenDichVu || "—";


        document.getElementById(
            "detailOrderDate"
        ).textContent =
            dinhDangNgay(
                item.ngayChiDinh
            );


        document.getElementById(
            "detailResultDate"
        ).textContent =
            dinhDangNgay(
                data.ngayCoKetQua
            );


        document.getElementById(
            "detailContent"
        ).textContent =
            data.noiDungKetQua || "—";


        document.getElementById(
            "detailConclusion"
        ).textContent =
            data.ketLuan || "—";


        hienThiFile(
            data.fileURL
        );


        hienThiChiTietChiSo(
            data.chiTiet
        );


        moModal();


    } catch (error) {

        console.error(error);

        alert(error.message);

    }

}


/* =====================================================
   FILE KẾT QUẢ
===================================================== */

function hienThiFile(fileURL) {

    const section =
        document.getElementById(
            "fileSection"
        );


    const link =
        document.getElementById(
            "resultFile"
        );


    if (!section || !link) {
        return;
    }


    if (!fileURL) {

        section.classList.add(
            "hidden"
        );

        link.removeAttribute(
            "href"
        );

        return;

    }


    link.href =
        fileURL;


    section.classList.remove(
        "hidden"
    );

}


/* =====================================================
   CHI TIẾT CHỈ SỐ
===================================================== */

function hienThiChiTietChiSo(
    danhSach
) {

    const tbody =
        document.getElementById(
            "detailTableBody"
        );


    if (!tbody) {
        return;
    }


    if (
        !Array.isArray(danhSach)
        ||
        danhSach.length === 0
    ) {

        tbody.innerHTML = `
            <tr>

                <td colspan="5"
                    class="empty">

                    Không có chi tiết chỉ số.

                </td>

            </tr>
        `;

        return;

    }


    tbody.innerHTML =
        danhSach.map(
            function (item) {

                return `
                    <tr>

                        <td>
                            ${escapeHtml(
                                item.tenChiSo || "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                item.giaTri ?? "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                item.donVi || "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                item.giaTriThamChieu || "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                item.trangThai || "—"
                            )}
                        </td>

                    </tr>
                `;

            }
        )
        .join("");

}


/* =====================================================
   MỞ MODAL
===================================================== */

function moModal() {

    const modal =
        document.getElementById(
            "detailModal"
        );


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "hidden"
    );


    document.body.style.overflow =
        "hidden";

}


/* =====================================================
   ĐÓNG MODAL
===================================================== */

function dongModal() {

    const modal =
        document.getElementById(
            "detailModal"
        );


    if (modal) {

        modal.classList.add(
            "hidden"
        );

    }


    document.body.style.overflow =
        "";

}


///* =====================================================
//   ĐĂNG XUẤT
//===================================================== */
//
//function khoiTaoDangXuat() {
//
//    const button =
//        document.getElementById(
//            "btnLogout"
//        );
//
//
//    if (!button) {
//        return;
//    }
//
//
//    button.addEventListener(
//        "click",
//        function () {
//
//            window.location.href =
//                "/logout";
//
//        }
//    );
//
//}


/* =====================================================
   FORMAT NGÀY
===================================================== */

function dinhDangNgay(value) {

    if (!value) {

        return "—";

    }


    const text =
        String(value);


    /*
        LocalDate:
        2026-10-04
    */

    if (
        /^\d{4}-\d{2}-\d{2}$/.test(text)
    ) {

        const parts =
            text.split("-");


        return (
            parts[2]
            + "/"
            + parts[1]
            + "/"
            + parts[0]
        );

    }


    /*
        LocalDateTime
    */

    const date =
        new Date(text);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return text;

    }


    return new Intl.DateTimeFormat(
        "vi-VN",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    ).format(date);

}


/* =====================================================
   CHUẨN HÓA CHUỖI
===================================================== */

function chuanHoa(value) {

    return String(
        value || ""
    )
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase()
        .trim();

}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHtml(value) {

    return String(
        value ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


/* =====================================================
   ĐỌC JSON AN TOÀN
===================================================== */

async function docJson(response) {

    try {

        return await response.json();

    } catch (error) {

        return null;

    }

}