const API_BASE = "/api/bac-si/kham-benh";


/* =====================================================
   BIẾN
===================================================== */

let danhSachLichSu = [];
let danhSachBenhNhan = [];
let benhNhanDangChon = null;



/* =====================================================
   DOM - DANH SÁCH BỆNH NHÂN
===================================================== */

const patientListPage =
    document.getElementById("patientListPage");

const patientDetailPage =
    document.getElementById("patientDetailPage");

const patientTableBody =
    document.getElementById("patientTableBody");

const loadingState =
    document.getElementById("loadingState");

const emptyState =
    document.getElementById("emptyState");

const totalPatients =
    document.getElementById("totalPatients");

const patientSearch =
    document.getElementById("patientSearch");

const btnRefresh =
    document.getElementById("btnRefresh");


/* =====================================================
   DOM - CHI TIẾT BỆNH NHÂN
===================================================== */

const btnBackPatientList =
    document.getElementById("btnBackPatientList");

const detailPatientName =
    document.getElementById("detailPatientName");

const detailPatientCode =
    document.getElementById("detailPatientCode");

const detailBirthDate =
    document.getElementById("detailBirthDate");

const detailGender =
    document.getElementById("detailGender");

const detailVisitCount =
    document.getElementById("detailVisitCount");

const detailLastVisit =
    document.getElementById("detailLastVisit");

const detailMedicalHistory =
    document.getElementById("detailMedicalHistory");


/* =====================================================
   DOM - CÁC MỤC TRONG HỒ SƠ
===================================================== */

const btnShowVisits =
    document.getElementById("btnShowVisits");

const btnShowClinicalResults =
    document.getElementById("btnShowClinicalResults");

const btnShowPrescriptions =
    document.getElementById("btnShowPrescriptions");

const patientSectionDetail =
    document.getElementById("patientSectionDetail");

const sectionDetailTitle =
    document.getElementById("sectionDetailTitle");

const sectionDetailDescription =
    document.getElementById("sectionDetailDescription");

const sectionDetailContent =
    document.getElementById("sectionDetailContent");

const btnCloseSection =
    document.getElementById("btnCloseSection");


/* =====================================================
   DOM - ĐĂNG XUẤT
===================================================== */

const btnLogout =
    document.getElementById("btnLogout");


/* =====================================================
   TOKEN
===================================================== */

function layToken() {

    return localStorage.getItem("token")
        || localStorage.getItem("Token")
        || sessionStorage.getItem("token")
        || sessionStorage.getItem("Token");
}


/* =====================================================
   FETCH
===================================================== */

async function apiFetch(url, options = {}) {

    const token = layToken();

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token) {

        headers["Authorization"] =
            `Bearer ${token}`;
    }

    const response =
        await fetch(
            url,
            {
                ...options,
                headers
            }
        );

    const contentType =
        response.headers.get(
            "content-type"
        );

    let data;

    if (
        contentType &&
        contentType.includes(
            "application/json"
        )
    ) {

        data =
            await response.json();

    } else {

        data = {
            message:
                await response.text()
        };
    }

    if (!response.ok) {

        throw new Error(
            data?.message ||
            "Không thể xử lý yêu cầu."
        );
    }

    return data;
}


///* =====================================================
//   THÔNG TIN BÁC SĨ
//===================================================== */
//
//function hienThiThongTinBacSi() {
//
//    const hoTen =
//        localStorage.getItem("HoTen")
//        || sessionStorage.getItem("HoTen")
//        || "Bác sĩ";
//
//    if (doctorName) {
//
//        doctorName.textContent =
//            hoTen;
//    }
//
//    const words =
//        hoTen
//            .trim()
//            .split(/\s+/);
//
//    if (
//        doctorAvatar &&
//        words.length > 0
//    ) {
//
//        const lastName =
//            words[
//                words.length - 1
//            ];
//
//        doctorAvatar.textContent =
//            lastName
//                .substring(0, 2)
//                .toUpperCase();
//    }
//}
//

/* =====================================================
   LOAD DỮ LIỆU
===================================================== */

async function loadDanhSachBenhNhan() {

    hienThiLoading(true);

    if (emptyState) {

        emptyState.classList.add(
            "hidden"
        );
    }

    if (patientTableBody) {

        patientTableBody.innerHTML =
            "";
    }

    try {

        const data =
            await apiFetch(
                `${API_BASE}/lich-su`
            );

        danhSachLichSu =
            Array.isArray(data)
                ? data
                : [];

        danhSachBenhNhan =
            gomLichSuTheoBenhNhan(
                danhSachLichSu
            );

        renderDanhSachBenhNhan(
            danhSachBenhNhan
        );

    } catch (error) {

        console.error(error);

        danhSachLichSu = [];
        danhSachBenhNhan = [];

        renderDanhSachBenhNhan(
            []
        );

        showToast(
            "Không thể tải hồ sơ bệnh nhân",
            error.message,
            true
        );

    } finally {

        hienThiLoading(false);
    }
}


/* =====================================================
   HIỂN THỊ LOADING
===================================================== */

function hienThiLoading(show) {

    if (!loadingState) {
        return;
    }

    if (show) {

        loadingState.classList.remove(
            "hidden"
        );

    } else {

        loadingState.classList.add(
            "hidden"
        );
    }
}


/* =====================================================
   GOM LỊCH SỬ THEO BỆNH NHÂN
===================================================== */
function gomLichSuTheoBenhNhan(danhSach) {

    const patientMap = new Map();

    danhSach.forEach(item => {

        const maBenhNhan = item.maBenhNhan;

        if (
            maBenhNhan === null ||
            maBenhNhan === undefined
        ) {
            return;
        }

        const key = String(maBenhNhan);

        if (!patientMap.has(key)) {

            patientMap.set(key, {

                maBenhNhan: maBenhNhan,

                hoTen:
                    item.hoTen ||
                    "---",

                ngaySinh:
                    item.ngaySinh ||
                    null,

                gioiTinh:
                    item.gioiTinh ||
                    "---",

                tienSuBenh:
                    item.tienSuBenh ||
                    "",

                // Danh sách tất cả lần khám
                danhSachLanKham: [],

                // Tổng số lần khám
                soLanKham: 0,

                // Lần khám gần nhất
                lanKhamGanNhat: null
            });
        }

        patientMap
            .get(key)
            .danhSachLanKham
            .push(item);
    });


    const result =
        Array.from(
            patientMap.values()
        );


    result.forEach(patient => {

        // Sắp xếp lần khám mới nhất lên đầu
        patient.danhSachLanKham.sort(
            (a, b) => {

                const timeA =
                    taoThoiGianLichKham(a);

                const timeB =
                    taoThoiGianLichKham(b);

                return timeB - timeA;
            }
        );


        // Tổng số lần khám
        patient.soLanKham =
            patient.danhSachLanKham.length;


        // Lần khám gần nhất
        patient.lanKhamGanNhat =
            patient.danhSachLanKham.length > 0
                ? patient.danhSachLanKham[0]
                : null;
    });


    // Sắp xếp bệnh nhân theo lần khám gần nhất
    result.sort((a, b) => {

        return (
            taoThoiGianLichKham(
                b.lanKhamGanNhat
            )
            -
            taoThoiGianLichKham(
                a.lanKhamGanNhat
            )
        );
    });


    return result;
}
/* =====================================================
   TẠO THỜI GIAN TỪ LỊCH KHÁM
===================================================== */

function taoThoiGianLichKham(
    item
) {

    if (!item) {
        return 0;
    }

    const ngay =
        item.ngayKham;

    const gio =
        item.gioKham ||
        "00:00:00";

    if (!ngay) {
        return 0;
    }

    const date =
        new Date(
            `${ngay}T${gio}`
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return 0;
    }

    return date.getTime();
}


/* =====================================================
   RENDER DANH SÁCH BỆNH NHÂN
===================================================== */

function renderDanhSachBenhNhan(danhSach) {

    if (!patientTableBody) {
        return;
    }

    patientTableBody.innerHTML = "";

    if (
        !danhSach ||
        danhSach.length === 0
    ) {

        if (emptyState) {
            emptyState.classList.remove("hidden");
        }

        if (totalPatients) {
            totalPatients.textContent = "0";
        }

        return;
    }

    if (emptyState) {
        emptyState.classList.add("hidden");
    }

    if (totalPatients) {
        totalPatients.textContent = danhSach.length;
    }

    danhSach.forEach(
        (patient, index) => {

            const lanKhamGanNhat =
                patient.lanKhamGanNhat;

            const row =
                document.createElement("tr");

            row.innerHTML = `

                <!-- STT -->
                <td>
                    ${index + 1}
                </td>

                <!-- BỆNH NHÂN -->
                <td>

                    <div class="patient-name">

                        <strong>
                            ${escapeHtml(
                                patient.hoTen
                            )}
                        </strong>

                        <span>
                            BN${String(
                                patient.maBenhNhan
                            ).padStart(
                                6,
                                "0"
                            )}
                        </span>

                    </div>

                </td>

                <!-- NGÀY SINH -->
                <td>
                    ${formatDate(
                        patient.ngaySinh
                    )}
                </td>

                <!-- GIỚI TÍNH -->
                <td>
                    ${escapeHtml(
                        patient.gioiTinh
                    )}
                </td>

                <!-- LẦN KHÁM GẦN NHẤT -->
                <td>
                    ${formatDate(
                        lanKhamGanNhat?.ngayKham
                    )}
                </td>

                <!-- SỐ LẦN KHÁM -->
                <td>
                    ${patient.soLanKham}
                </td>

                <!-- THAO TÁC -->
                <td>

                    <button
                        type="button"
                        class="action-button"
                        onclick="moHoSoBenhNhan(${Number(
                            patient.maBenhNhan
                        )})"
                    >
                        Xem hồ sơ
                    </button>

                </td>

            `;

            patientTableBody.appendChild(
                row
            );
        }
    );
}

/* =====================================================
   TÌM KIẾM BỆNH NHÂN
===================================================== */

function timKiemBenhNhan() {

    if (!patientSearch) {
        return;
    }

    const keyword =
        patientSearch.value
            .trim()
            .toLowerCase();

    if (!keyword) {

        renderDanhSachBenhNhan(
            danhSachBenhNhan
        );

        return;
    }

    const filtered =
        danhSachBenhNhan.filter(
            patient => {

                const hoTen =
                    String(
                        patient.hoTen ||
                        ""
                    ).toLowerCase();

                const maBenhNhan =
                    String(
                        patient.maBenhNhan ||
                        ""
                    );

                return (
                    hoTen.includes(
                        keyword
                    ) ||
                    maBenhNhan.includes(
                        keyword
                    )
                );
            }
        );

    renderDanhSachBenhNhan(
        filtered
    );
}
/* =====================================================
   MỞ HỒ SƠ BỆNH NHÂN
===================================================== */

function moHoSoBenhNhan(maBenhNhan) {

    const benhNhan =
        danhSachBenhNhan.find(
            item =>
                Number(item.maBenhNhan) ===
                Number(maBenhNhan)
        );

    if (!benhNhan) {

        showToast(
            "Không tìm thấy bệnh nhân",
            "Không tìm thấy thông tin bệnh nhân trong danh sách.",
            true
        );

        return;
    }

    benhNhanDangChon =
        benhNhan;

    hienThiThongTinBenhNhan(
        benhNhan
    );

    dongNoiDungHoSo();

    if (patientListPage) {

        patientListPage.classList.add(
            "hidden"
        );
    }

    if (patientDetailPage) {

        patientDetailPage.classList.remove(
            "hidden"
        );
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =====================================================
   THÔNG TIN BỆNH NHÂN
===================================================== */

function hienThiThongTinBenhNhan(benhNhan) {

    if (detailPatientName) {

        detailPatientName.textContent =
            benhNhan.hoTen || "---";
    }

    if (detailPatientCode) {

        detailPatientCode.textContent =
            formatPatientCode(
                benhNhan.maBenhNhan
            );
    }

    if (detailBirthDate) {

        detailBirthDate.textContent =
            formatDate(
                benhNhan.ngaySinh
            );
    }

    if (detailGender) {

        detailGender.textContent =
            benhNhan.gioiTinh || "---";
    }

    if (detailVisitCount) {

        detailVisitCount.textContent =
            `${benhNhan.soLanKham} lần`;
    }

    if (detailLastVisit) {

        detailLastVisit.textContent =
            formatDate(
                benhNhan
                    .lanKhamGanNhat
                    ?.ngayKham
            );
    }

    if (detailMedicalHistory) {

        detailMedicalHistory.textContent =
            benhNhan.tienSuBenh ||
            "---";
    }
    hienThiChiSoSucKhoe(benhNhan);
}

/* =====================================================
   HIỂN THỊ CHỈ SỐ SỨC KHỎE
===================================================== */

function hienThiSoDo(id, giaTri) {
    const element = document.getElementById(id);

    if (!element) return;

    element.textContent =
        giaTri === null ||
        giaTri === undefined ||
        giaTri === ""
            ? "—"
            : String(giaTri);
}

function hienThiChiSoSucKhoe(benhNhan) {
    const lichKham = benhNhan?.lanKhamGanNhat;

    hienThiSoDo("detailCanNang", lichKham?.canNang);
    hienThiSoDo("detailChieuCao", lichKham?.chieuCao);
    hienThiSoDo("detailHuyetApTamThu", lichKham?.huyetApTamThu);
    hienThiSoDo("detailHuyetApTamTruong", lichKham?.huyetApTamTruong);

    const vitalsDate = document.getElementById("vitalsDate");

    if (vitalsDate) {
        const coSoDo = [
            lichKham?.canNang,
            lichKham?.chieuCao,
            lichKham?.huyetApTamThu,
            lichKham?.huyetApTamTruong
        ].some(value => value !== null && value !== undefined);

        vitalsDate.textContent =
            coSoDo && lichKham?.ngayKham
                ? "Ngày khám: " + formatDate(lichKham.ngayKham)
                : "Chưa có số đo";
    }
}


/* =====================================================
   QUAY LẠI DANH SÁCH BỆNH NHÂN
===================================================== */

function quayLaiDanhSachBenhNhan() {

    benhNhanDangChon =
        null;

    dongNoiDungHoSo();

    if (patientDetailPage) {

        patientDetailPage.classList.add(
            "hidden"
        );
    }

    if (patientListPage) {

        patientListPage.classList.remove(
            "hidden"
        );
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =====================================================
   CÁC LẦN KHÁM
===================================================== */

function hienThiCacLanKham() {

    if (!benhNhanDangChon) {
        return;
    }

    moNoiDungHoSo(
        "Các lần khám",
        `Lịch sử các lần khám của ${benhNhanDangChon.hoTen}`
    );

    const list =
        benhNhanDangChon
            .danhSachLanKham || [];

    if (list.length === 0) {

        sectionDetailContent.innerHTML =
            taoEmptySection(
                "fa-regular fa-calendar-xmark",
                "Chưa có lần khám",
                "Bệnh nhân chưa có lịch sử khám với bác sĩ."
            );

        return;
    }

    sectionDetailContent.innerHTML = `

        <div class="visit-list">

            ${list.map(
                item =>
                    taoHtmlLanKham(item)
            ).join("")}

        </div>
    `;
}


/* =====================================================
   HTML MỘT LẦN KHÁM
===================================================== */

function taoHtmlLanKham(item) {

    return `

        <button
            type="button"
            class="visit-item"
            onclick="xemChiTietLanKham(${item.maLichKham})"
        >

            <div class="visit-date">

                <strong>
                    ${formatDate(
                        item.ngayKham
                    )}
                </strong>

                <span>
                    ${formatTime(
                        item.gioKham
                    )}
                </span>

            </div>


            <div class="visit-summary">

                <strong>
                    ${escapeHtml(
                        item.lyDoKham ||
                        "Khám bệnh"
                    )}
                </strong>

                <span>
                    ${escapeHtml(
                        item.chanDoan ||
                        "Bấm để xem chi tiết hồ sơ khám"
                    )}
                </span>

            </div>


            <i
                class="fa-solid fa-chevron-right visit-arrow"
            ></i>

        </button>
    `;
}


/* =====================================================
   CHI TIẾT MỘT LẦN KHÁM
===================================================== */

async function xemChiTietLanKham(
    maLichKham
) {

    try {

        sectionDetailContent.innerHTML =
            taoLoadingSection(
                "Đang tải hồ sơ khám..."
            );


        const data =
            await apiFetch(
                `${API_BASE}/${maLichKham}/ho-so`
            );


        sectionDetailTitle.textContent =
            "Chi tiết lần khám";


        sectionDetailDescription.textContent =
            `${formatDate(
                data.ngayKham
            )} - ${formatTime(
                data.gioKham
            )}`;


        sectionDetailContent.innerHTML = `

            <div class="visit-detail">


                <div class="visit-detail-header">

                    <div>

                        <h3>
                            ${escapeHtml(
                                data.lyDoKham ||
                                "Khám bệnh"
                            )}
                        </h3>

                        <p>
                            Mã lượt khám:
                            LK${String(
                                data.maLichKham ??
                                maLichKham
                            ).padStart(
                                6,
                                "0"
                            )}
                        </p>

                    </div>


                    <span class="badge-completed">
                        Đã khám
                    </span>

                </div>


                <div class="visit-basic-info">


                    <div>

                        <span>
                            Ngày khám
                        </span>

                        <strong>
                            ${formatDate(
                                data.ngayKham
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Giờ khám
                        </span>

                        <strong>
                            ${formatTime(
                                data.gioKham
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Lý do khám
                        </span>

                        <strong>
                            ${escapeHtml(
                                data.lyDoKham ||
                                "---"
                            )}
                        </strong>

                    </div>


                </div>


                <div class="medical-record-grid">


                    ${taoMedicalRecordItem(
                        "Triệu chứng",
                        data.trieuChung,
                        true
                    )}


                    ${taoMedicalRecordItem(
                        "Chẩn đoán",
                        data.chanDoan,
                        true
                    )}


                    ${taoMedicalRecordItem(
                        "Kết luận",
                        data.ketLuan,
                        true
                    )}


                    ${taoMedicalRecordItem(
                        "Hướng điều trị",
                        data.huongDieuTri,
                        true
                    )}


                    ${taoMedicalRecordItem(
                        "Ngày tái khám",
                        formatDate(
                            data.ngayTaiKham
                        ),
                        false
                    )}


                    ${taoMedicalRecordItem(
                        "Ghi chú tái khám",
                        data.ghiChuTaiKham,
                        false
                    )}


                </div>


                <div
                    style="
                        margin-top: 18px;
                        display: flex;
                        justify-content: flex-start;
                    "
                >

                    <button
                        type="button"
                        class="btn-secondary"
                        onclick="hienThiCacLanKham()"
                    >

                        <i
                            class="fa-solid fa-arrow-left"
                        ></i>

                        Quay lại các lần khám

                    </button>

                </div>


            </div>
        `;

    } catch (error) {

        console.error(error);


        sectionDetailContent.innerHTML =
            taoEmptySection(
                "fa-solid fa-triangle-exclamation",
                "Không thể tải hồ sơ",
                error.message
            );


        showToast(
            "Không thể xem hồ sơ",
            error.message,
            true
        );
    }
}


/* =====================================================
   ITEM HỒ SƠ BỆNH ÁN
===================================================== */

function taoMedicalRecordItem(
    label,
    value,
    fullWidth
) {

    return `

        <div class="
            medical-record-item
            ${fullWidth
                ? "full-width"
                : ""}
        ">

            <span>
                ${escapeHtml(label)}
            </span>

            <p>
                ${escapeHtml(
                    value || "---"
                )}
            </p>

        </div>
    `;
}


/* =====================================================
   KẾT QUẢ CẬN LÂM SÀNG
===================================================== */

function hienThiKetQuaCanLamSang() {

    if (!benhNhanDangChon) {
        return;
    }


    moNoiDungHoSo(
        "Kết quả cận lâm sàng",
        `Chọn một lần khám để xem kết quả cận lâm sàng của ${benhNhanDangChon.hoTen}`
    );


    const list =
        benhNhanDangChon
            .danhSachLanKham || [];


    if (list.length === 0) {

        sectionDetailContent.innerHTML =
            taoEmptySection(
                "fa-solid fa-flask",
                "Chưa có dữ liệu",
                "Bệnh nhân chưa có lần khám để xem kết quả cận lâm sàng."
            );

        return;
    }


    sectionDetailContent.innerHTML = `

        <div class="visit-list">

            ${list.map(
                item => `

                    <button
                        type="button"
                        class="visit-item"
                        onclick="xemCanLamSangTheoLanKham(${item.maLichKham})"
                    >

                        <div class="visit-date">

                            <strong>
                                ${formatDate(
                                    item.ngayKham
                                )}
                            </strong>

                            <span>
                                ${formatTime(
                                    item.gioKham
                                )}
                            </span>

                        </div>


                        <div class="visit-summary">

                            <strong>
                                ${escapeHtml(
                                    item.lyDoKham ||
                                    "Khám bệnh"
                                )}
                            </strong>

                            <span>
                                Xem các chỉ định và kết quả cận lâm sàng
                            </span>

                        </div>


                        <i
                            class="fa-solid fa-chevron-right visit-arrow"
                        ></i>

                    </button>

                `
            ).join("")}

        </div>
    `;
}


/* =====================================================
   CLS THEO LẦN KHÁM
===================================================== */

async function xemCanLamSangTheoLanKham(
    maLichKham
) {

    try {

        sectionDetailContent.innerHTML =
            taoLoadingSection(
                "Đang tải kết quả cận lâm sàng..."
            );


        const data =
            await apiFetch(
                `${API_BASE}/${maLichKham}/chi-dinh`
            );


        const list =
            Array.isArray(data)
                ? data
                : [];


        sectionDetailTitle.textContent =
            "Kết quả cận lâm sàng";


        const lanKham =
            timLanKham(
                maLichKham
            );


        sectionDetailDescription.textContent =
            lanKham
                ? `Lần khám ${formatDate(
                    lanKham.ngayKham
                )} - ${formatTime(
                    lanKham.gioKham
                )}`
                : "Danh sách chỉ định cận lâm sàng";


        if (list.length === 0) {

            sectionDetailContent.innerHTML =
                taoEmptySection(
                    "fa-solid fa-flask",
                    "Không có chỉ định",
                    "Lần khám này không có chỉ định cận lâm sàng."
                );

            return;
        }


        sectionDetailContent.innerHTML = `

            <div class="clinical-result-list">

                ${list.map(
                    item =>
                        taoHtmlChiDinh(
                            maLichKham,
                            item
                        )
                ).join("")}

            </div>


            <div
                style="
                    margin-top: 18px;
                "
            >

                <button
                    type="button"
                    class="btn-secondary"
                    onclick="hienThiKetQuaCanLamSang()"
                >

                    <i
                        class="fa-solid fa-arrow-left"
                    ></i>

                    Quay lại các lần khám

                </button>

            </div>
        `;

    } catch (error) {

        console.error(error);


        sectionDetailContent.innerHTML =
            taoEmptySection(
                "fa-solid fa-triangle-exclamation",
                "Không thể tải cận lâm sàng",
                error.message
            );


        showToast(
            "Không thể tải kết quả cận lâm sàng",
            error.message,
            true
        );
    }
}
/* =====================================================
   HIỂN THỊ MỘT CHỈ ĐỊNH CLS
===================================================== */

function taoHtmlChiDinh(
    maLichKham,
    chiDinh
) {

    const tenDichVu =
        chiDinh.tenDichVu ||
        chiDinh.dichVuYTe?.tenDichVu ||
        "Dịch vụ cận lâm sàng";

    const trangThai =
        chiDinh.trangThai || "";

    const daHoanThanh =
        trangThai === "DaHoanThanh";

    return `
        <button
            type="button"
            class="clinical-result-item"
            onclick="xemKetQuaChiDinh(
                ${maLichKham},
                ${chiDinh.maChiDinh}
            )"
        >

            <div class="clinical-result-icon">

                <i
                    class="fa-solid fa-flask-vial"
                ></i>

            </div>


            <div class="clinical-result-info">

                <strong>
                    ${escapeHtml(
                        tenDichVu
                    )}
                </strong>

                <span>
                    ${formatDateTime(
                        chiDinh.ngayChiDinh
                    )}
                </span>

            </div>


            <span
                class="
                    result-status
                    ${daHoanThanh
                        ? ""
                        : "waiting"}
                "
            >

                ${formatTrangThaiChiDinh(
                    trangThai
                )}

            </span>


            <i
                class="fa-solid fa-chevron-right visit-arrow"
            ></i>

        </button>
    `;
}


/* =====================================================
   XEM KẾT QUẢ MỘT CHỈ ĐỊNH
===================================================== */

async function xemKetQuaChiDinh(
    maLichKham,
    maChiDinh
) {

    try {

        sectionDetailContent.innerHTML =
            taoLoadingSection(
                "Đang tải chi tiết kết quả..."
            );


        const data =
            await apiFetch(
                `${API_BASE}/${maLichKham}/chi-dinh/${maChiDinh}/ket-qua`
            );


        /* =================================================
           CHƯA CÓ KẾT QUẢ
        ================================================= */

        if (
            !data ||
            data.coKetQua === false
        ) {

            sectionDetailContent.innerHTML = `

                ${taoEmptySection(
                    "fa-regular fa-clock",
                    "Chưa có kết quả",
                    "Chỉ định này đang chờ bộ phận chuyên trách trả kết quả."
                )}


                <div
                    style="
                        padding: 0 20px 20px;
                    "
                >

                    <button
                        type="button"
                        class="btn-secondary"
                        onclick="xemCanLamSangTheoLanKham(${maLichKham})"
                    >

                        <i
                            class="fa-solid fa-arrow-left"
                        ></i>

                        Quay lại

                    </button>

                </div>
            `;

            return;
        }


        /* =================================================
           CÓ KẾT QUẢ
        ================================================= */

        const chiTiet =
            Array.isArray(data.chiTiet)
                ? data.chiTiet
                : [];


        sectionDetailTitle.textContent =
            "Chi tiết kết quả cận lâm sàng";


        sectionDetailDescription.textContent =
            `Kết quả chỉ định #${maChiDinh}`;


        sectionDetailContent.innerHTML = `

            <div class="result-detail">


                <div class="result-detail-grid">


                    ${taoResultDetailItem(
                        "Ngày có kết quả",
                        formatDateTime(
                            data.ngayCoKetQua
                        ),
                        false
                    )}


                    ${taoResultDetailItem(
                        "Trạng thái",
                        formatTrangThaiChiDinh(
                            data.trangThai
                        ),
                        false
                    )}


                    ${taoResultDetailItem(
                        "Nội dung kết quả",
                        data.noiDungKetQua,
                        true
                    )}


                    ${taoResultDetailItem(
                        "Kết luận",
                        data.ketLuan,
                        true
                    )}


                </div>


                ${
                    chiTiet.length > 0
                        ? taoBangChiTietKetQua(
                            chiTiet
                        )
                        : ""
                }


                ${
                    data.fileURL
                        ? `

                            <div
                                style="
                                    margin-top: 18px;
                                "
                            >

                                <a
                                    href="${escapeAttribute(
                                        data.fileURL
                                    )}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="btn-view"
                                    style="
                                        display: inline-flex;
                                        align-items: center;
                                        gap: 7px;
                                        text-decoration: none;
                                    "
                                >

                                    <i
                                        class="fa-solid fa-file-arrow-down"
                                    ></i>

                                    Xem file kết quả

                                </a>

                            </div>

                        `
                        : ""
                }


                <div
                    style="
                        margin-top: 18px;
                    "
                >

                    <button
                        type="button"
                        class="btn-secondary"
                        onclick="xemCanLamSangTheoLanKham(${maLichKham})"
                    >

                        <i
                            class="fa-solid fa-arrow-left"
                        ></i>

                        Quay lại

                    </button>

                </div>


            </div>
        `;

    } catch (error) {

        console.error(error);


        sectionDetailContent.innerHTML =
            taoEmptySection(
                "fa-solid fa-triangle-exclamation",
                "Không thể tải kết quả",
                error.message
            );


        showToast(
            "Không thể xem kết quả",
            error.message,
            true
        );
    }
}


/* =====================================================
   ITEM CHI TIẾT KẾT QUẢ
===================================================== */

function taoResultDetailItem(
    label,
    value,
    fullWidth
) {

    return `

        <div
            class="
                result-detail-item
                ${fullWidth
                    ? "full-width"
                    : ""}
            "
        >

            <span>
                ${escapeHtml(label)}
            </span>

            <p>
                ${escapeHtml(
                    value || "---"
                )}
            </p>

        </div>
    `;
}


/* =====================================================
   BẢNG CHI TIẾT KẾT QUẢ
===================================================== */

function taoBangChiTietKetQua(list) {

    return `

        <div
            class="table-wrapper"
            style="
                margin-top: 18px;
                border: 1px solid #e5eaf1;
                border-radius: 9px;
            "
        >

            <table>


                <thead>

                    <tr>

                        <th>
                            Chỉ số
                        </th>

                        <th>
                            Giá trị
                        </th>

                        <th>
                            Đơn vị
                        </th>

                        <th>
                            Tham chiếu
                        </th>

                        <th>
                            Trạng thái
                        </th>

                    </tr>

                </thead>


                <tbody>

                    ${list.map(
                        item => `

                            <tr>

                                <td>
                                    ${escapeHtml(
                                        item.tenChiSo ||
                                        "---"
                                    )}
                                </td>


                                <td>
                                    ${escapeHtml(
                                        item.giaTri ??
                                        "---"
                                    )}
                                </td>


                                <td>
                                    ${escapeHtml(
                                        item.donVi ||
                                        "---"
                                    )}
                                </td>


                                <td>
                                    ${escapeHtml(
                                        item.giaTriThamChieu ||
                                        "---"
                                    )}
                                </td>


                                <td>
                                    ${escapeHtml(
                                        formatTrangThaiKetQua(
                                            item.trangThai
                                        )
                                    )}
                                </td>

                            </tr>

                        `
                    ).join("")}

                </tbody>


            </table>

        </div>
    `;
}


/* =====================================================
   ĐƠN THUỐC
===================================================== */
function hienThiDonThuoc() {

    if (!benhNhanDangChon) {
        return;
    }

    moNoiDungHoSo(
        "Đơn thuốc",
        `Chọn lần khám để xem đơn thuốc của ${benhNhanDangChon.hoTen}`
    );

    const list = benhNhanDangChon.danhSachLanKham || [];

    if (list.length === 0) {
        sectionDetailContent.innerHTML = taoEmptySection(
            "fa-solid fa-pills",
            "Chưa có lần khám",
            "Bệnh nhân chưa có lịch sử khám."
        );
        return;
    }

    sectionDetailContent.innerHTML = `
        <div class="visit-list">
            ${list.map(item => `
                <button
                    type="button"
                    class="visit-item"
                    onclick="xemDonThuocTheoLanKham(${Number(item.maLichKham)})"
                >
                    <div class="visit-date">
                        <strong>${formatDate(item.ngayKham)}</strong>
                        <span>${formatTime(item.gioKham)}</span>
                    </div>

                    <div class="visit-summary">
                        <strong>
                            ${escapeHtml(item.lyDoKham || "Khám bệnh")}
                        </strong>
                        <span>Xem đơn thuốc của lần khám</span>
                    </div>

                    <i class="fa-solid fa-chevron-right visit-arrow"></i>
                </button>
            `).join("")}
        </div>
    `;
}
async function xemDonThuocTheoLanKham(maLichKham) {

    if (!benhNhanDangChon || !timLanKham(maLichKham)) {
        return;
    }

    sectionDetailContent.innerHTML =
        taoLoadingSection("Đang tải đơn thuốc...");

    try {
        const data = await apiFetch(
            `${API_BASE}/${maLichKham}/don-thuoc`
        );

        sectionDetailTitle.textContent = "Chi tiết đơn thuốc";

        const lanKham = timLanKham(maLichKham);

        sectionDetailDescription.textContent =
            `Lần khám ${formatDate(lanKham.ngayKham)}`;

        if (!data || data.coDonThuoc === false) {
            sectionDetailContent.innerHTML = `
                ${taoEmptySection(
                    "fa-solid fa-pills",
                    "Chưa có đơn thuốc",
                    "Lần khám này chưa được kê đơn thuốc."
                )}

                <div style="margin-top:18px">
                    <button type="button"
                            class="btn-secondary"
                            onclick="hienThiDonThuoc()">
                        Quay lại các lần khám
                    </button>
                </div>
            `;
            return;
        }

        const danhSachThuoc =
            Array.isArray(data.danhSachThuoc)
                ? data.danhSachThuoc
                : [];

        sectionDetailContent.innerHTML = `
            <div class="visit-detail">

                <div class="medical-record-grid">
                    ${taoMedicalRecordItem(
                        "Mã đơn thuốc",
                        data.maDonThuoc,
                        false
                    )}

                    ${taoMedicalRecordItem(
                        "Ngày kê thuốc",
                        formatDateTime(data.ngayKeThuoc),
                        false
                    )}

                    ${taoMedicalRecordItem(
                        "Chẩn đoán",
                        data.chanDoan,
                        true
                    )}

                    ${taoMedicalRecordItem(
                        "Ghi chú",
                        data.ghiChu,
                        true
                    )}
                </div>

                <h3 style="margin:24px 0 14px">
                    Danh sách thuốc
                </h3>

                ${
                    danhSachThuoc.length > 0
                        ? `
                            <div class="table-wrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>STT</th>
                                            <th>Tên thuốc</th>
                                            <th>Số lượng</th>
                                            <th>Đơn vị</th>
                                            <th>Liều dùng</th>
                                            <th>Thời gian dùng</th>
                                            <th>Hướng dẫn</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        ${danhSachThuoc.map((thuoc, index) => `
                                            <tr>
                                                <td>${index + 1}</td>
                                                <td>${escapeHtml(thuoc.tenThuoc || "---")}</td>
                                                <td>${escapeHtml(thuoc.soLuong ?? "---")}</td>
                                                <td>${escapeHtml(thuoc.donViTinh || "---")}</td>
                                                <td>${escapeHtml(thuoc.lieuDung || "---")}</td>
                                                <td>${escapeHtml(thuoc.thoiGianDung ?? "---")}</td>
                                                <td>${escapeHtml(thuoc.huongDanSuDung || "---")}</td>
                                            </tr>
                                        `).join("")}
                                    </tbody>
                                </table>
                            </div>
                        `
                        : taoEmptySection(
                            "fa-solid fa-pills",
                            "Không có chi tiết thuốc",
                            "Đơn thuốc chưa có thuốc trong danh sách."
                        )
                }

                <div style="margin-top:18px">
                    <button type="button"
                            class="btn-secondary"
                            onclick="hienThiDonThuoc()">
                        Quay lại các lần khám
                    </button>
                </div>

            </div>
        `;

    } catch (error) {

        console.error(error);

        sectionDetailContent.innerHTML =
            taoEmptySection(
                "fa-solid fa-triangle-exclamation",
                "Không thể tải đơn thuốc",
                error.message
            );

        showToast(
            "Lỗi tải đơn thuốc",
            error.message,
            true
        );
    }
}

/* =====================================================
   MỞ NỘI DUNG HỒ SƠ
===================================================== */

function moNoiDungHoSo(
    title,
    description
) {

    if (!patientSectionDetail) {
        return;
    }


    if (sectionDetailTitle) {

        sectionDetailTitle.textContent =
            title;
    }


    if (sectionDetailDescription) {

        sectionDetailDescription.textContent =
            description || "";
    }


    if (sectionDetailContent) {

        sectionDetailContent.innerHTML =
            "";
    }


    patientSectionDetail.classList.remove(
        "hidden"
    );


    setTimeout(
        function () {

            patientSectionDetail.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        },
        50
    );
}


/* =====================================================
   ĐÓNG NỘI DUNG HỒ SƠ
===================================================== */

function dongNoiDungHoSo() {

    if (!patientSectionDetail) {
        return;
    }


    patientSectionDetail.classList.add(
        "hidden"
    );


    if (sectionDetailContent) {

        sectionDetailContent.innerHTML =
            "";
    }
}


/* =====================================================
   TÌM LẦN KHÁM
===================================================== */

function timLanKham(maLichKham) {

    if (!benhNhanDangChon) {
        return null;
    }


    return (

        benhNhanDangChon
            .danhSachLanKham
            ?.find(
                item =>
                    Number(
                        item.maLichKham
                    ) ===
                    Number(
                        maLichKham
                    )
            )

        || null
    );
}


/* =====================================================
   EMPTY SECTION
===================================================== */

function taoEmptySection(
    icon,
    title,
    message
) {

    return `

        <div class="empty-section">

            <i class="${escapeAttribute(
                icon
            )}"></i>

            <h4>
                ${escapeHtml(
                    title
                )}
            </h4>

            <p>
                ${escapeHtml(
                    message
                )}
            </p>

        </div>
    `;
}


/* =====================================================
   LOADING SECTION
===================================================== */

function taoLoadingSection(message) {

    return `

        <div class="empty-section">

            <i
                class="fa-solid fa-spinner fa-spin"
            ></i>

            <h4>
                Đang tải
            </h4>

            <p>
                ${escapeHtml(
                    message
                )}
            </p>

        </div>
    `;
}
/* =====================================================
   LOADING
===================================================== */

function hienThiLoading(isLoading) {

    if (!loadingState) {
        return;
    }

    if (isLoading) {

        loadingState.classList.remove(
            "hidden"
        );

    } else {

        loadingState.classList.add(
            "hidden"
        );
    }
}


/* =====================================================
   FORMAT MÃ BỆNH NHÂN
===================================================== */

function formatPatientCode(maBenhNhan) {

    if (
        maBenhNhan === null ||
        maBenhNhan === undefined
    ) {
        return "---";
    }

    return `BN${String(
        maBenhNhan
    ).padStart(6, "0")}`;
}


/* =====================================================
   FORMAT NGÀY
===================================================== */

function formatDate(dateString) {

    if (!dateString) {
        return "---";
    }

    const value =
        String(dateString);

    const datePart =
        value.includes("T")
            ? value.split("T")[0]
            : value;

    const parts =
        datePart.split("-");

    if (parts.length !== 3) {
        return value;
    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}


/* =====================================================
   FORMAT GIỜ
===================================================== */

function formatTime(time) {

    if (!time) {
        return "---";
    }

    return String(time)
        .substring(0, 5);
}


/* =====================================================
   FORMAT NGÀY GIỜ
===================================================== */

function formatDateTime(value) {

    if (!value) {
        return "---";
    }

    const stringValue =
        String(value);

    if (!stringValue.includes("T")) {
        return stringValue;
    }

    const parts =
        stringValue.split("T");

    return `${formatDate(
        parts[0]
    )} ${formatTime(
        parts[1]
    )}`;
}


/* =====================================================
   FORMAT TRẠNG THÁI CHỈ ĐỊNH
===================================================== */

function formatTrangThaiChiDinh(trangThai) {

    switch (trangThai) {

        case "ChoThucHien":
            return "Chờ thực hiện";

        case "DangThucHien":
            return "Đang thực hiện";

        case "DaHoanThanh":
            return "Đã hoàn thành";

        default:
            return trangThai || "---";
    }
}


/* =====================================================
   FORMAT TRẠNG THÁI KẾT QUẢ
===================================================== */

function formatTrangThaiKetQua(trangThai) {

    switch (trangThai) {

        case "BinhThuong":
            return "Bình thường";

        case "BatThuong":
            return "Bất thường";

        case "DaHoanThanh":
            return "Đã hoàn thành";

        default:
            return trangThai || "---";
    }
}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =====================================================
   ESCAPE ATTRIBUTE
===================================================== */

function escapeAttribute(value) {

    return escapeHtml(value);
}


/* =====================================================
   TOAST
===================================================== */

let toastTimer;


function showToast(
    title,
    message,
    error = false
) {

    const toast =
        document.getElementById(
            "toast"
        );

    const toastTitle =
        document.getElementById(
            "toastTitle"
        );

    const toastMessage =
        document.getElementById(
            "toastMessage"
        );

    const toastIcon =
        document.getElementById(
            "toastIcon"
        );


    if (
        !toast ||
        !toastTitle ||
        !toastMessage ||
        !toastIcon
    ) {
        return;
    }


    toastTitle.textContent =
        title;

    toastMessage.textContent =
        message || "";


    toast.classList.remove(
        "hidden",
        "error"
    );


    if (error) {

        toast.classList.add(
            "error"
        );

        toastIcon.innerHTML =
            '<i class="fa-solid fa-xmark"></i>';

    } else {

        toastIcon.innerHTML =
            '<i class="fa-solid fa-check"></i>';
    }


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(
            function () {

                toast.classList.add(
                    "hidden"
                );

            },
            3500
        );
}


/* =====================================================
   ĐĂNG XUẤT
===================================================== */

function dangXuat() {

    const dongY =
        confirm(
            "Bạn có muốn đăng xuất không?"
        );

    if (!dongY) {
        return;
    }


    /* LOCAL STORAGE */

    localStorage.removeItem("token");
    localStorage.removeItem("Token");
    localStorage.removeItem("HoTen");
    localStorage.removeItem("VaiTro");
    localStorage.removeItem("MaNguoiDung");
    localStorage.removeItem("TenDangNhap");
    localStorage.removeItem("Email");
    localStorage.removeItem("AnhDaiDien");


    /* SESSION STORAGE */

    sessionStorage.removeItem("token");
    sessionStorage.removeItem("Token");
    sessionStorage.removeItem("HoTen");
    sessionStorage.removeItem("VaiTro");
    sessionStorage.removeItem("MaNguoiDung");
    sessionStorage.removeItem("TenDangNhap");
    sessionStorage.removeItem("Email");
    sessionStorage.removeItem("AnhDaiDien");


    window.location.href =
        "/auth/login";
}


/* =====================================================
   EVENTS
===================================================== */

if (patientSearch) {

    patientSearch.addEventListener(
        "input",
        timKiemBenhNhan
    );
}


if (btnRefresh) {

    btnRefresh.addEventListener(
        "click",
        loadDanhSachBenhNhan
    );
}


if (btnBackPatientList) {

    btnBackPatientList.addEventListener(
        "click",
        quayLaiDanhSachBenhNhan
    );
}


if (btnShowVisits) {

    btnShowVisits.addEventListener(
        "click",
        hienThiCacLanKham
    );
}


if (btnShowClinicalResults) {

    btnShowClinicalResults.addEventListener(
        "click",
        hienThiKetQuaCanLamSang
    );
}


if (btnShowPrescriptions) {

    btnShowPrescriptions.addEventListener(
        "click",
        hienThiDonThuoc
    );
}


if (btnCloseSection) {

    btnCloseSection.addEventListener(
        "click",
        dongNoiDungHoSo
    );
}


if (btnLogout) {

    btnLogout.addEventListener(
        "click",
        dangXuat
    );
}


/* =====================================================
   SIDEBAR - ĐÓNG / MỞ MENU KHÁM BỆNH
===================================================== */

function khoiTaoMenuKhamBenh() {

    const menuGroup =
        document.querySelector(
            ".menu-group, .menu-parent"
        );

    if (!menuGroup) {
        return;
    }


    const children =
        Array.from(
            menuGroup.children
        );


    const menuButton =
        children.find(
            element =>
                element.classList.contains(
                    "menu-item"
                )
        );


    const submenu =
        children.find(
            element =>
                element.classList.contains(
                    "submenu"
                )
        );


    if (
        !menuButton ||
        !submenu
    ) {
        return;
    }


    const arrow =
        menuButton.querySelector(
            ".arrow"
        );


    /*
     * Hồ sơ bệnh nhân nằm trong
     * menu Khám bệnh nên mặc định mở.
     */

    let isOpen = true;


    function capNhatMenu() {

        submenu.style.display =
            isOpen
                ? ""
                : "none";


        menuButton.setAttribute(
            "aria-expanded",
            String(isOpen)
        );


        if (arrow) {

            arrow.style.transform =
                isOpen
                    ? "rotate(0deg)"
                    : "rotate(-90deg)";
        }
    }


    function toggleMenu() {

        isOpen = !isOpen;

        capNhatMenu();
    }


    menuButton.style.cursor =
        "pointer";


    menuButton.setAttribute(
        "role",
        "button"
    );


    menuButton.setAttribute(
        "tabindex",
        "0"
    );


    if (arrow) {

        arrow.style.transition =
            "transform 0.2s ease";
    }


    menuButton.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            toggleMenu();
        }
    );


    menuButton.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Enter" ||
                event.key === " "
            ) {

                event.preventDefault();

                toggleMenu();
            }
        }
    );


    capNhatMenu();
}


/* =====================================================
   KHỞI TẠO TRANG
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        /* THÔNG TIN BÁC SĨ */

//        hienThiThongTinBacSi();


        /* SIDEBAR */

        khoiTaoMenuKhamBenh();


        /* LOAD DANH SÁCH BỆNH NHÂN */

        loadDanhSachBenhNhan();
    }
);


/* =====================================================
   ĐƯA CÁC HÀM ONCLICK RA WINDOW
===================================================== */

window.moHoSoBenhNhan =
    moHoSoBenhNhan;

window.xemChiTietLanKham =
    xemChiTietLanKham;

window.hienThiCacLanKham =
    hienThiCacLanKham;

window.hienThiKetQuaCanLamSang =
    hienThiKetQuaCanLamSang;

window.xemCanLamSangTheoLanKham =
    xemCanLamSangTheoLanKham;

window.xemKetQuaChiDinh =
    xemKetQuaChiDinh;
window.xemDonThuocTheoLanKham = xemDonThuocTheoLanKham;