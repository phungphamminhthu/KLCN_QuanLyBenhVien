const API_BASE = "/api/bac-si/kham-benh";


/* =====================================================
   BIẾN
===================================================== */

let danhSachLichSu = [];
let danhSachBenhNhan = [];
let benhNhanDangChon = null;
let vitalsRequestVersion = 0;
let sectionRequestVersion = 0;
let clsImageObjectUrls = [];
let clsImageAbortController = null;
let clsLightboxEscapeHandler = null;
let danhSachChiDinhHienTai = [];



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

                if (timeB !== timeA) {
                    return timeB - timeA;
                }

                return (Number(b.maLichKham) || 0) - (Number(a.maLichKham) || 0);
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

                const maBenhNhanHienThi =
                    formatPatientCode(
                        patient.maBenhNhan
                    ).toLowerCase();

                return (
                    hoTen.includes(
                        keyword
                    ) ||
                    maBenhNhan.includes(
                        keyword
                    ) ||
                    maBenhNhanHienThi.includes(
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

function renderChiSoTuHoSo(duLieu, ngayKham) {
    hienThiSoDo("detailCanNang", duLieu?.canNang);
    hienThiSoDo("detailChieuCao", duLieu?.chieuCao);
    hienThiSoDo("detailHuyetApTamThu", duLieu?.huyetApTamThu);
    hienThiSoDo("detailHuyetApTamTruong", duLieu?.huyetApTamTruong);

    const vitalsDate = document.getElementById("vitalsDate");

    if (vitalsDate) {
        const coSoDo = [
            duLieu?.canNang,
            duLieu?.chieuCao,
            duLieu?.huyetApTamThu,
            duLieu?.huyetApTamTruong
        ].some(value =>
            value !== null &&
            value !== undefined &&
            value !== ""
        );

        vitalsDate.textContent =
            coSoDo && ngayKham
                ? "Ngày khám: " + formatDate(ngayKham)
                : "Chưa có số đo";
    }
}

async function hienThiChiSoSucKhoe(benhNhan) {
    const version = ++vitalsRequestVersion;
    const lichKham = benhNhan?.lanKhamGanNhat;

    if (!lichKham || lichKham.maLichKham == null) {
        renderChiSoTuHoSo(null, null);
        return;
    }

    if (lichKham._daTaiChiSo) {
        renderChiSoTuHoSo(lichKham, lichKham.ngayKham);
        return;
    }

    hienThiSoDo("detailCanNang", null);
    hienThiSoDo("detailChieuCao", null);
    hienThiSoDo("detailHuyetApTamThu", null);
    hienThiSoDo("detailHuyetApTamTruong", null);

    const vitalsDate = document.getElementById("vitalsDate");

    if (vitalsDate) {
        vitalsDate.textContent = "Đang tải số đo...";
    }

    try {
        const hoSo = await apiFetch(
            `${API_BASE}/${lichKham.maLichKham}/ho-so`
        );

        if (
            version !== vitalsRequestVersion ||
            !benhNhanDangChon ||
            Number(benhNhanDangChon.maBenhNhan) !== Number(benhNhan.maBenhNhan)
        ) {
            return;
        }

        lichKham.canNang = hoSo?.canNang ?? null;
        lichKham.chieuCao = hoSo?.chieuCao ?? null;
        lichKham.huyetApTamThu = hoSo?.huyetApTamThu ?? null;
        lichKham.huyetApTamTruong = hoSo?.huyetApTamTruong ?? null;
        lichKham._daTaiChiSo = true;

        renderChiSoTuHoSo(
            lichKham,
            hoSo?.ngayKham || lichKham.ngayKham
        );
    } catch (error) {
        console.error("Lỗi tải chỉ số sức khỏe:", error);

        if (
            version !== vitalsRequestVersion ||
            !benhNhanDangChon ||
            Number(benhNhanDangChon.maBenhNhan) !== Number(benhNhan.maBenhNhan)
        ) {
            return;
        }

        renderChiSoTuHoSo(null, null);

        if (vitalsDate) {
            vitalsDate.textContent = "Không thể tải số đo";
        }
    }
}


/* =====================================================
   QUAY LẠI DANH SÁCH BỆNH NHÂN
===================================================== */

function quayLaiDanhSachBenhNhan() {

    vitalsRequestVersion++;
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

    datMucDangMo(btnShowVisits);

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

    const maLichHienThi = item.maLichKham != null
        ? `LK${String(item.maLichKham).padStart(6, "0")}`
        : "";

    return `

        <button
            type="button"
            class="visit-item"
            onclick="xemChiTietLanKham(${Number(item.maLichKham)})"
        >

            <div class="visit-date">

                <strong>
                    ${formatDate(
                        item.ngayKham
                    )}
                </strong>

                <span>
                    <i class="fa-regular fa-clock"></i>
                    ${formatTime(
                        item.gioKham
                    )}
                </span>

            </div>


            <div class="visit-summary">

                <div class="visit-summary-top">
                    <strong>
                        ${escapeHtml(
                            item.lyDoKham ||
                            "Khám bệnh"
                        )}
                    </strong>

                    ${
                        maLichHienThi
                            ? `<span class="lsk-code-pill">${escapeHtml(maLichHienThi)}</span>`
                            : ""
                    }
                </div>

                <span class="visit-summary-sub">
                    ${escapeHtml(
                        item.chanDoan ||
                        "Bấm để xem chi tiết hồ sơ khám"
                    )}
                </span>

            </div>


            <span class="badge-completed visit-status-badge">
                ${escapeHtml(formatTrangThaiLichKham(item.trangThai))}
            </span>


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

    if (!benhNhanDangChon || !timLanKham(maLichKham)) {
        return;
    }

    const version = ++sectionRequestVersion;

    try {

        sectionDetailContent.innerHTML =
            taoLoadingSection(
                "Đang tải hồ sơ khám..."
            );


        const data =
            await apiFetch(
                `${API_BASE}/${maLichKham}/ho-so`
            );

        if (version !== sectionRequestVersion) {
            return;
        }


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

                    ${
                        data.tenKhoa
                            ? `
                                <div>
                                    <span>Chuyên khoa</span>
                                    <strong>${escapeHtml(data.tenKhoa)}</strong>
                                </div>
                            `
                            : ""
                    }

                    ${
                        data.tenBacSi
                            ? `
                                <div>
                                    <span>Bác sĩ khám</span>
                                    <strong>${escapeHtml(data.tenBacSi)}</strong>
                                </div>
                            `
                            : ""
                    }


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


                <div class="section-detail-footer">

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

        if (version !== sectionRequestVersion) {
            return;
        }

        console.error(error);


        sectionDetailContent.innerHTML = `
            ${taoEmptySection(
                "fa-solid fa-triangle-exclamation",
                "Không thể tải hồ sơ",
                error.message
            )}

            <div class="section-detail-footer section-detail-footer-padded">
                <button
                    type="button"
                    class="btn-secondary"
                    onclick="hienThiCacLanKham()"
                >
                    <i class="fa-solid fa-arrow-left"></i>
                    Quay lại các lần khám
                </button>
            </div>
        `;


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

    datMucDangMo(btnShowClinicalResults);

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
                item => {
                    const maLichHienThi = item.maLichKham != null
                        ? `LK${String(item.maLichKham).padStart(6, "0")}`
                        : "";

                    return `

                    <button
                        type="button"
                        class="visit-item"
                        onclick="xemCanLamSangTheoLanKham(${Number(item.maLichKham)})"
                    >

                        <div class="visit-date">

                            <strong>
                                ${formatDate(
                                    item.ngayKham
                                )}
                            </strong>

                            <span>
                                <i class="fa-regular fa-clock"></i>
                                ${formatTime(
                                    item.gioKham
                                )}
                            </span>

                        </div>


                        <div class="visit-summary">

                            <div class="visit-summary-top">
                                <strong>
                                    ${escapeHtml(
                                        item.lyDoKham ||
                                        "Khám bệnh"
                                    )}
                                </strong>

                                ${
                                    maLichHienThi
                                        ? `<span class="lsk-code-pill">${escapeHtml(maLichHienThi)}</span>`
                                        : ""
                                }
                            </div>

                            <span class="visit-summary-sub">
                                Xem các chỉ định và kết quả cận lâm sàng
                            </span>

                        </div>


                        <i
                            class="fa-solid fa-chevron-right visit-arrow"
                        ></i>

                    </button>

                `;
                }
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

    if (!benhNhanDangChon || !timLanKham(maLichKham)) {
        return;
    }

    const version = ++sectionRequestVersion;
    donDepAnhKetQuaCLS();
    danhSachChiDinhHienTai = [];

    try {

        sectionDetailContent.innerHTML =
            taoLoadingSection(
                "Đang tải kết quả cận lâm sàng..."
            );


        const data =
            await apiFetch(
                `${API_BASE}/${maLichKham}/chi-dinh`
            );

        if (version !== sectionRequestVersion) {
            return;
        }


        const list =
            Array.isArray(data)
                ? data
                : [];

        danhSachChiDinhHienTai = list;


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
                )} • ${list.length} chỉ định`
                : "Danh sách chỉ định cận lâm sàng";


        if (list.length === 0) {

            sectionDetailContent.innerHTML = `
                ${taoEmptySection(
                    "fa-solid fa-flask",
                    "Không có chỉ định",
                    "Lần khám này không có chỉ định cận lâm sàng."
                )}

                <div class="section-detail-footer section-detail-footer-padded">
                    <button
                        type="button"
                        class="btn-secondary"
                        onclick="hienThiKetQuaCanLamSang()"
                    >
                        <i class="fa-solid fa-arrow-left"></i>
                        Quay lại các lần khám
                    </button>
                </div>
            `;

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


            <div class="section-detail-footer section-detail-footer-padded">

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

        if (version !== sectionRequestVersion) {
            return;
        }

        console.error(error);


        sectionDetailContent.innerHTML = `
            ${taoEmptySection(
                "fa-solid fa-triangle-exclamation",
                "Không thể tải cận lâm sàng",
                error.message
            )}

            <div class="section-detail-footer section-detail-footer-padded">
                <button
                    type="button"
                    class="btn-secondary"
                    onclick="hienThiKetQuaCanLamSang()"
                >
                    <i class="fa-solid fa-arrow-left"></i>
                    Quay lại các lần khám
                </button>
            </div>
        `;


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

function layClassTrangThaiChiDinh(trangThai) {
    switch (trangThai) {
        case "DaHoanThanh":
            return "done";

        case "DangThucHien":
            return "processing";

        case "ChoThanhToan":
            return "unpaid";

        default:
            return "waiting";
    }
}

function taoHtmlChiDinh(
    maLichKham,
    chiDinh
) {

    const tenDichVu =
        chiDinh.tenDichVu ||
        chiDinh.dichVuYTe?.tenDichVu ||
        "Dịch vụ cận lâm sàng";

    const loaiDichVu =
        chiDinh.loaiDichVu ||
        chiDinh.loaiChiDinh ||
        "";

    const trangThai =
        chiDinh.trangThai || "";

    const statusClass =
        layClassTrangThaiChiDinh(trangThai);

    const metaParts = [
        loaiDichVu,
        chiDinh.ngayChiDinh ? formatDateTime(chiDinh.ngayChiDinh) : ""
    ].filter(Boolean);

    return `
        <button
            type="button"
            class="clinical-result-item"
            onclick="xemKetQuaChiDinh(
                ${Number(maLichKham)},
                ${Number(chiDinh.maChiDinh)}
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
                    ${escapeHtml(metaParts.join(" • ") || "---")}
                </span>

            </div>


            <span
                class="result-status ${statusClass}"
            >

                ${escapeHtml(formatTrangThaiChiDinh(
                    trangThai
                ))}

            </span>


            <i
                class="fa-solid fa-chevron-right visit-arrow"
            ></i>

        </button>
    `;
}


/* =====================================================
   HÌNH ẢNH KẾT QUẢ CẬN LÂM SÀNG (TỪ API SẴN CÓ)
===================================================== */

function dongLightboxAnhCLS() {
    document.getElementById("lskImageLightbox")?.remove();

    if (clsLightboxEscapeHandler) {
        document.removeEventListener("keydown", clsLightboxEscapeHandler);
        clsLightboxEscapeHandler = null;
    }
}

function donDepAnhKetQuaCLS() {
    if (clsImageAbortController) {
        clsImageAbortController.abort();
        clsImageAbortController = null;
    }

    clsImageObjectUrls.forEach(url => {
        URL.revokeObjectURL(url);
    });

    clsImageObjectUrls = [];
    dongLightboxAnhCLS();
}

function moAnhPhongToCLS(src, tenAnh) {
    dongLightboxAnhCLS();

    const overlay = document.createElement("div");
    overlay.id = "lskImageLightbox";
    overlay.className = "lsk-image-lightbox";

    overlay.innerHTML = `
        <div class="lsk-image-lightbox-content">
            <button type="button"
                    class="lsk-image-lightbox-close"
                    aria-label="Đóng ảnh">
                <i class="fa-solid fa-xmark"></i>
            </button>

            <img src="${escapeAttribute(src)}"
                 alt="${escapeAttribute(tenAnh)}">

            <div class="lsk-image-lightbox-caption">
                ${escapeHtml(tenAnh)}
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.addEventListener("click", event => {
        if (
            event.target === overlay ||
            event.target.closest(".lsk-image-lightbox-close")
        ) {
            dongLightboxAnhCLS();
        }
    });

    clsLightboxEscapeHandler = event => {
        if (event.key === "Escape") {
            dongLightboxAnhCLS();
        }
    };

    document.addEventListener("keydown", clsLightboxEscapeHandler);
}

async function taiMotAnhKetQuaCLS(maLichKham, maChiDinh, maAnh, signal) {
    const token = layToken();
    const headers = {};

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const url =
        `${API_BASE}/${encodeURIComponent(maLichKham)}` +
        `/chi-dinh/${encodeURIComponent(maChiDinh)}` +
        `/ket-qua/anh/${encodeURIComponent(maAnh)}`;

    const response = await fetch(url, {
        method: "GET",
        headers,
        signal
    });

    if (!response.ok) {
        throw new Error(`Không tải được ảnh (HTTP ${response.status})`);
    }

    const blob = await response.blob();

    if (!blob.size) {
        throw new Error("Ảnh không có dữ liệu.");
    }

    return URL.createObjectURL(blob);
}

function taoLinkFileAnToan(fileURL) {
    if (!fileURL || typeof fileURL !== "string") {
        return "";
    }

    try {
        const parsed = new URL(fileURL, window.location.origin);

        if (!["http:", "https:"].includes(parsed.protocol)) {
            return "";
        }

        // Chỉ mở trực tiếp nếu là URL đầy đủ hoặc đường dẫn hợp lệ, tránh key R2 thô
        if (!/^https?:\/\//i.test(fileURL.trim()) && !fileURL.trim().startsWith("/")) {
            return "";
        }

        return `
            <div class="lsk-file-attachment">
                <a
                    href="${escapeAttribute(parsed.href)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn-view lsk-file-link"
                >
                    <i class="fa-solid fa-file-arrow-down"></i>
                    Xem file kết quả
                </a>
            </div>
        `;
    } catch (_) {
        return "";
    }
}

async function taiVaHienThiAnhKetQuaCLS(
    container,
    danhSachAnh,
    maLichKham,
    maChiDinh,
    expectedVersion,
    expectedBenhNhanId
) {
    if (!container || !Array.isArray(danhSachAnh) || danhSachAnh.length === 0) {
        return;
    }

    const controller = new AbortController();
    clsImageAbortController = controller;
    const localUrls = [];

    const isStale = () =>
        controller.signal.aborted ||
        expectedVersion !== sectionRequestVersion ||
        !benhNhanDangChon ||
        Number(benhNhanDangChon.maBenhNhan) !== expectedBenhNhanId ||
        !container.isConnected;

    try {
        const ketQuaAnh = await Promise.all(
            danhSachAnh.map(async (anh, index) => {
                const maAnh = anh?.maAnh ?? anh?.MaAnh;
                const tenAnh = anh?.tenFile || anh?.TenFile || `Hình ảnh ${index + 1}`;

                if (maAnh === null || maAnh === undefined) {
                    return { tenAnh, error: "Không tìm thấy mã ảnh." };
                }

                try {
                    const objectUrl = await taiMotAnhKetQuaCLS(
                        maLichKham,
                        maChiDinh,
                        maAnh,
                        controller.signal
                    );

                    localUrls.push(objectUrl);

                    return { tenAnh, src: objectUrl };
                } catch (error) {
                    if (error.name === "AbortError") {
                        throw error;
                    }

                    console.error("Lỗi tải ảnh kết quả CLS:", maAnh, error);
                    return { tenAnh, error: error.message || "Không tải được ảnh." };
                }
            })
        );

        if (isStale()) {
            localUrls.forEach(url => URL.revokeObjectURL(url));
            return;
        }

        localUrls.forEach(url => clsImageObjectUrls.push(url));

        container.innerHTML = `
            <div class="lsk-image-grid">
                ${ketQuaAnh.map(anh => `
                    <div class="lsk-image-card">
                        ${
                            anh.src
                                ? `
                                    <button type="button"
                                            class="lsk-image-button"
                                            data-image-src="${escapeAttribute(anh.src)}"
                                            data-image-name="${escapeAttribute(anh.tenAnh)}">
                                        <img src="${escapeAttribute(anh.src)}"
                                             alt="${escapeAttribute(anh.tenAnh)}"
                                             loading="lazy">
                                        <span class="lsk-image-zoom">
                                            <i class="fa-solid fa-magnifying-glass-plus"></i>
                                            Phóng to
                                        </span>
                                    </button>
                                `
                                : `
                                    <div class="lsk-image-error">
                                        <i class="fa-regular fa-image"></i>
                                        <span>${escapeHtml(anh.error)}</span>
                                    </div>
                                `
                        }
                        <div class="lsk-image-name" title="${escapeAttribute(anh.tenAnh)}">
                            ${escapeHtml(anh.tenAnh)}
                        </div>
                    </div>
                `).join("")}
            </div>
            <p class="lsk-image-note">
                <i class="fa-solid fa-circle-info"></i>
                Nhấn vào hình ảnh để xem kích thước lớn hơn.
            </p>
        `;

        container.querySelectorAll(".lsk-image-button").forEach(button => {
            button.addEventListener("click", () => {
                moAnhPhongToCLS(
                    button.dataset.imageSrc,
                    button.dataset.imageName
                );
            });
        });
    } catch (error) {
        localUrls.forEach(url => URL.revokeObjectURL(url));

        if (error.name === "AbortError" || isStale()) {
            return;
        }

        console.error("Lỗi hiển thị danh sách ảnh kết quả CLS:", error);
        container.innerHTML = `
            <div class="lsk-image-error lsk-image-error-inline">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <span>Không thể tải hình ảnh kết quả cận lâm sàng.</span>
            </div>
        `;
    } finally {
        if (clsImageAbortController === controller) {
            clsImageAbortController = null;
        }
    }
}


/* =====================================================
   XEM KẾT QUẢ MỘT CHỈ ĐỊNH
===================================================== */

async function xemKetQuaChiDinh(
    maLichKham,
    maChiDinh
) {

    if (!benhNhanDangChon || !timLanKham(maLichKham)) {
        return;
    }

    const expectedBenhNhanId = Number(benhNhanDangChon.maBenhNhan);
    const version = ++sectionRequestVersion;
    donDepAnhKetQuaCLS();

    const chiDinhInfo = danhSachChiDinhHienTai.find(
        item => Number(item.maChiDinh) === Number(maChiDinh)
    );

    const tenDichVu =
        chiDinhInfo?.tenDichVu ||
        chiDinhInfo?.dichVuYTe?.tenDichVu ||
        `Chỉ định #${maChiDinh}`;

    try {

        sectionDetailContent.innerHTML =
            taoLoadingSection(
                "Đang tải chi tiết kết quả..."
            );


        const data =
            await apiFetch(
                `${API_BASE}/${maLichKham}/chi-dinh/${maChiDinh}/ket-qua`
            );

        if (
            version !== sectionRequestVersion ||
            !benhNhanDangChon ||
            Number(benhNhanDangChon.maBenhNhan) !== expectedBenhNhanId
        ) {
            return;
        }


        /* =================================================
           CHƯA CÓ KẾT QUẢ HOẶC CHƯA HOÀN TẤT
        ================================================= */

        if (
            !data ||
            data.coKetQua === false ||
            (data.trangThai && data.trangThai !== "DaHoanThanh")
        ) {

            sectionDetailTitle.textContent =
                "Chi tiết kết quả cận lâm sàng";

            sectionDetailDescription.textContent =
                tenDichVu;

            sectionDetailContent.innerHTML = `

                ${taoEmptySection(
                    "fa-regular fa-clock",
                    "Chưa có kết quả",
                    "Chỉ định này đang chờ bộ phận chuyên trách trả kết quả."
                )}


                <div class="section-detail-footer section-detail-footer-padded">

                    <button
                        type="button"
                        class="btn-secondary"
                        onclick="xemCanLamSangTheoLanKham(${Number(maLichKham)})"
                    >

                        <i
                            class="fa-solid fa-arrow-left"
                        ></i>

                        Quay lại danh sách chỉ định

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

        const danhSachAnh =
            Array.isArray(data.anhKetQua)
                ? data.anhKetQua.filter(item => item != null)
                : [];

        const lanKham = timLanKham(maLichKham);

        sectionDetailTitle.textContent =
            tenDichVu;


        sectionDetailDescription.textContent =
            lanKham
                ? `Lần khám ${formatDate(lanKham.ngayKham)} • Chỉ định #${maChiDinh}`
                : `Kết quả chỉ định #${maChiDinh}`;


        sectionDetailContent.innerHTML = `

            <div class="result-detail">

                <div class="result-detail-header">
                    <div>
                        <h4>${escapeHtml(tenDichVu)}</h4>
                        <span>
                            ${
                                data.maKetQua != null
                                    ? `Mã kết quả: KQ${String(data.maKetQua).padStart(6, "0")} • `
                                    : ""
                            }Ngày có kết quả: ${escapeHtml(formatDateTime(data.ngayCoKetQua))}
                        </span>
                    </div>

                    <span class="result-status ${layClassTrangThaiChiDinh(data.trangThai)}">
                        ${escapeHtml(formatTrangThaiChiDinh(data.trangThai))}
                    </span>
                </div>


                <div class="result-detail-grid">


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
                        ? `
                            <div class="lsk-subsection">
                                <div class="lsk-subsection-header">
                                    <h4>
                                        <i class="fa-solid fa-chart-simple"></i>
                                        Chi tiết chỉ số xét nghiệm
                                    </h4>
                                    <span class="lsk-count-badge">${chiTiet.length} chỉ số</span>
                                </div>
                                ${taoBangChiTietKetQua(chiTiet)}
                            </div>
                        `
                        : ""
                }


                ${
                    danhSachAnh.length > 0
                        ? `
                            <div class="lsk-subsection lsk-result-images">
                                <div class="lsk-subsection-header">
                                    <h4>
                                        <i class="fa-solid fa-images"></i>
                                        Hình ảnh kết quả
                                    </h4>
                                    <span class="lsk-count-badge">${danhSachAnh.length} ảnh</span>
                                </div>
                                <div id="lskResultImagesContainer">
                                    <div class="lsk-images-loading">
                                        <i class="fa-solid fa-spinner fa-spin"></i>
                                        <span>Đang tải ${danhSachAnh.length} hình ảnh kết quả...</span>
                                    </div>
                                </div>
                            </div>
                        `
                        : ""
                }


                ${taoLinkFileAnToan(data.fileURL)}


                <div class="section-detail-footer">

                    <button
                        type="button"
                        class="btn-secondary"
                        onclick="xemCanLamSangTheoLanKham(${Number(maLichKham)})"
                    >

                        <i
                            class="fa-solid fa-arrow-left"
                        ></i>

                        Quay lại danh sách chỉ định

                    </button>

                </div>


            </div>
        `;

        if (danhSachAnh.length > 0) {
            const imagesContainer =
                document.getElementById("lskResultImagesContainer");

            void taiVaHienThiAnhKetQuaCLS(
                imagesContainer,
                danhSachAnh,
                maLichKham,
                maChiDinh,
                version,
                expectedBenhNhanId
            );
        }

    } catch (error) {

        if (version !== sectionRequestVersion) {
            return;
        }

        console.error(error);


        sectionDetailContent.innerHTML = `
            ${taoEmptySection(
                "fa-solid fa-triangle-exclamation",
                "Không thể tải kết quả",
                error.message
            )}

            <div class="section-detail-footer section-detail-footer-padded">
                <button
                    type="button"
                    class="btn-secondary"
                    onclick="xemCanLamSangTheoLanKham(${Number(maLichKham)})"
                >
                    <i class="fa-solid fa-arrow-left"></i>
                    Quay lại danh sách chỉ định
                </button>
            </div>
        `;


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

    datMucDangMo(btnShowPrescriptions);

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
            ${list.map(item => {
                const maLichHienThi = item.maLichKham != null
                    ? `LK${String(item.maLichKham).padStart(6, "0")}`
                    : "";

                return `
                <button
                    type="button"
                    class="visit-item"
                    onclick="xemDonThuocTheoLanKham(${Number(item.maLichKham)})"
                >
                    <div class="visit-date">
                        <strong>${formatDate(item.ngayKham)}</strong>
                        <span>
                            <i class="fa-regular fa-clock"></i>
                            ${formatTime(item.gioKham)}
                        </span>
                    </div>

                    <div class="visit-summary">
                        <div class="visit-summary-top">
                            <strong>
                                ${escapeHtml(item.lyDoKham || "Khám bệnh")}
                            </strong>
                            ${
                                maLichHienThi
                                    ? `<span class="lsk-code-pill">${escapeHtml(maLichHienThi)}</span>`
                                    : ""
                            }
                        </div>
                        <span class="visit-summary-sub">Xem đơn thuốc của lần khám</span>
                    </div>

                    <i class="fa-solid fa-chevron-right visit-arrow"></i>
                </button>
            `;
            }).join("")}
        </div>
    `;
}
async function xemDonThuocTheoLanKham(maLichKham) {

    if (!benhNhanDangChon || !timLanKham(maLichKham)) {
        return;
    }

    const version = ++sectionRequestVersion;

    sectionDetailContent.innerHTML =
        taoLoadingSection("Đang tải đơn thuốc...");

    try {
        const data = await apiFetch(
            `${API_BASE}/${maLichKham}/don-thuoc`
        );

        if (version !== sectionRequestVersion) {
            return;
        }

        sectionDetailTitle.textContent = "Chi tiết đơn thuốc";

        const lanKham = timLanKham(maLichKham);

        sectionDetailDescription.textContent =
            lanKham
                ? `Lần khám ${formatDate(lanKham.ngayKham)} - ${formatTime(lanKham.gioKham)}`
                : "Thông tin đơn thuốc";

        if (!data || data.coDonThuoc === false) {
            sectionDetailContent.innerHTML = `
                ${taoEmptySection(
                    "fa-solid fa-pills",
                    "Chưa có đơn thuốc",
                    "Lần khám này chưa được kê đơn thuốc."
                )}

                <div class="section-detail-footer section-detail-footer-padded">
                    <button type="button"
                            class="btn-secondary"
                            onclick="hienThiDonThuoc()">
                        <i class="fa-solid fa-arrow-left"></i>
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

        const maDonHienThi = data.maDonThuoc != null
            ? `DT${String(data.maDonThuoc).padStart(6, "0")}`
            : "---";

        sectionDetailContent.innerHTML = `
            <div class="visit-detail">

                <div class="visit-detail-header">
                    <div>
                        <h3>Đơn thuốc ${escapeHtml(maDonHienThi)}</h3>
                        <p>Ngày kê thuốc: ${escapeHtml(formatDateTime(data.ngayKeThuoc))}</p>
                    </div>

                    ${
                        data.trangThai
                            ? `<span class="badge-completed">${escapeHtml(formatTrangThaiDonThuoc(data.trangThai))}</span>`
                            : ""
                    }
                </div>

                <div class="medical-record-grid">
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

                <div class="lsk-subsection">
                    <div class="lsk-subsection-header">
                        <h4>
                            <i class="fa-solid fa-pills"></i>
                            Danh sách thuốc
                        </h4>
                        <span class="lsk-count-badge">${danhSachThuoc.length} loại thuốc</span>
                    </div>

                    ${
                        danhSachThuoc.length > 0
                            ? `
                                <div class="table-wrapper lsk-table-box">
                                    <table class="lsk-drug-table">
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
                                                    <td class="lsk-drug-name">${escapeHtml(thuoc.tenThuoc || "---")}</td>
                                                    <td class="lsk-drug-qty">${escapeHtml(thuoc.soLuong ?? "---")}</td>
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
                </div>

                <div class="section-detail-footer">
                    <button type="button"
                            class="btn-secondary"
                            onclick="hienThiDonThuoc()">
                        <i class="fa-solid fa-arrow-left"></i>
                        Quay lại các lần khám
                    </button>
                </div>

            </div>
        `;

    } catch (error) {

        if (version !== sectionRequestVersion) {
            return;
        }

        console.error(error);

        sectionDetailContent.innerHTML = `
            ${taoEmptySection(
                "fa-solid fa-triangle-exclamation",
                "Không thể tải đơn thuốc",
                error.message
            )}

            <div class="section-detail-footer section-detail-footer-padded">
                <button
                    type="button"
                    class="btn-secondary"
                    onclick="hienThiDonThuoc()"
                >
                    <i class="fa-solid fa-arrow-left"></i>
                    Quay lại các lần khám
                </button>
            </div>
        `;

        showToast(
            "Lỗi tải đơn thuốc",
            error.message,
            true
        );
    }
}

/* =====================================================
   ĐÁNH DẤU MỤC ĐANG MỞ
===================================================== */

function datMucDangMo(activeButton) {
    [
        btnShowVisits,
        btnShowClinicalResults,
        btnShowPrescriptions
    ].forEach(btn => {
        if (!btn) return;
        btn.classList.toggle("active", btn === activeButton);
    });
}


/* =====================================================
   MỞ NỘI DUNG HỒ SƠ
===================================================== */

function moNoiDungHoSo(
    title,
    description
) {

    sectionRequestVersion++;
    donDepAnhKetQuaCLS();

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

    sectionRequestVersion++;
    donDepAnhKetQuaCLS();
    danhSachChiDinhHienTai = [];
    datMucDangMo(null);

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
        String(value).replace(" ", "T");

    if (!stringValue.includes("T")) {
        return formatDate(stringValue);
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

        case "ChoThanhToan":
            return "Chờ thanh toán";

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

function formatTrangThaiLichKham(trangThai) {

    switch (trangThai) {

        case "HoanTat":
        case "DaKham":
            return "Đã khám";

        case "DangKham":
            return "Đang khám";

        case "ChoCLS":
            return "Chờ CLS";

        default:
            return trangThai || "Đã khám";
    }
}

function formatTrangThaiDonThuoc(trangThai) {

    switch (trangThai) {

        case "ChoLayThuoc":
            return "Chờ lấy thuốc";

        case "DaCapThuoc":
        case "DaHoanThanh":
            return "Đã cấp thuốc";

        case "DaHuy":
            return "Đã hủy";

        default:
            return trangThai || "---";
    }
}

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
window.hienThiDonThuoc =
    hienThiDonThuoc;
window.xemDonThuocTheoLanKham = xemDonThuocTheoLanKham;