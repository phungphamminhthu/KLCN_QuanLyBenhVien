const API_BASE = "/api/bac-si/kham-benh";


/* =====================================================
   BIẾN
===================================================== */

let danhSachLichSu = [];


/* =====================================================
   DOM
===================================================== */

const historyTableBody =
    document.getElementById("historyTableBody");

const loadingState =
    document.getElementById("loadingState");

const emptyState =
    document.getElementById("emptyState");

const totalHistory =
    document.getElementById("totalHistory");

const patientSearch =
    document.getElementById("patientSearch");

const fromDate =
    document.getElementById("fromDate");

const toDate =
    document.getElementById("toDate");

const btnFilter =
    document.getElementById("btnFilter");

const btnClearFilter =
    document.getElementById("btnClearFilter");

const btnRefresh =
    document.getElementById("btnRefresh");

const doctorName =
    document.getElementById("doctorName");

const doctorAvatar =
    document.getElementById("doctorAvatar");


/* MODAL */

const historyModal =
    document.getElementById("historyModal");

const btnCloseModal =
    document.getElementById("btnCloseModal");

const btnModalCloseBottom =
    document.getElementById("btnModalCloseBottom");

const modalPatientName =
    document.getElementById("modalPatientName");

const modalPatientId =
    document.getElementById("modalPatientId");

const modalBirthDate =
    document.getElementById("modalBirthDate");

const modalGender =
    document.getElementById("modalGender");

const modalExamDate =
    document.getElementById("modalExamDate");

const modalExamTime =
    document.getElementById("modalExamTime");

const modalReason =
    document.getElementById("modalReason");

const modalSymptoms =
    document.getElementById("modalSymptoms");

const modalDiagnosis =
    document.getElementById("modalDiagnosis");

const modalConclusion =
    document.getElementById("modalConclusion");

const modalTreatment =
    document.getElementById("modalTreatment");

const modalReExamDate =
    document.getElementById("modalReExamDate");

const modalReExamNote =
    document.getElementById("modalReExamNote");


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
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers
    });


    const contentType =
        response.headers.get("content-type");

    let data;


    if (
        contentType &&
        contentType.includes("application/json")
    ) {

        data = await response.json();

    } else {

        data = {
            message: await response.text()
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


/* =====================================================
   THÔNG TIN BÁC SĨ
===================================================== */

function hienThiThongTinBacSi() {

    const hoTen =
        localStorage.getItem("HoTen")
        || sessionStorage.getItem("HoTen")
        || "Bác sĩ";


    doctorName.textContent =
        hoTen;


    const words =
        hoTen.trim().split(/\s+/);


    if (words.length > 0) {

        const lastName =
            words[words.length - 1];

        doctorAvatar.textContent =
            lastName
                .substring(0, 2)
                .toUpperCase();
    }
}


/* =====================================================
   LOAD LỊCH SỬ
===================================================== */

async function loadLichSu() {

    loadingState.classList.remove("hidden");

    emptyState.classList.add("hidden");

    historyTableBody.innerHTML = "";


    try {

        let url =
            `${API_BASE}/lich-su`;


        const tuNgay =
            fromDate.value;

        const denNgay =
            toDate.value;


        if (
            (tuNgay && !denNgay) ||
            (!tuNgay && denNgay)
        ) {

            showToast(
                "Thiếu ngày",
                "Vui lòng chọn đầy đủ từ ngày và đến ngày.",
                true
            );

            return;
        }


        if (
            tuNgay &&
            denNgay
        ) {

            if (tuNgay > denNgay) {

                showToast(
                    "Ngày không hợp lệ",
                    "Từ ngày không được lớn hơn đến ngày.",
                    true
                );

                return;
            }


            url +=
                `?tuNgay=${encodeURIComponent(tuNgay)}` +
                `&denNgay=${encodeURIComponent(denNgay)}`;
        }


        const data =
            await apiFetch(url);


        danhSachLichSu =
            Array.isArray(data)
                ? data
                : [];


        renderLichSu(
            danhSachLichSu
        );


    } catch (error) {

        console.error(error);

        danhSachLichSu = [];

        renderLichSu([]);


        showToast(
            "Không thể tải lịch sử",
            error.message,
            true
        );

    } finally {

        loadingState.classList.add("hidden");
    }
}


/* =====================================================
   RENDER
===================================================== */

function renderLichSu(list) {

    historyTableBody.innerHTML = "";

    totalHistory.textContent =
        list.length;


    if (!list || list.length === 0) {

        emptyState.classList.remove("hidden");

        return;
    }


    emptyState.classList.add("hidden");


    list.forEach((item, index) => {

        const tr =
            document.createElement("tr");


        tr.innerHTML = `

            <td>
                ${index + 1}
            </td>


            <td>

                <div class="patient-name">

                    <strong>
                        ${escapeHtml(item.hoTen)}
                    </strong>

                    <span>
                        BN${String(
                            item.maBenhNhan ?? ""
                        ).padStart(6, "0")}
                    </span>

                </div>

            </td>


            <td>
                ${formatDate(item.ngayKham)}
            </td>


            <td>
                ${formatTime(item.gioKham)}
            </td>


            <td
                class="reason"
                title="${escapeHtml(
                    item.lyDoKham
                )}">

                ${escapeHtml(
                    item.lyDoKham || "---"
                )}

            </td>


            <td>

                <span class="badge-completed">
                    Đã khám
                </span>

            </td>


            <td>

                <button
                    type="button"
                    class="btn-view"
                    onclick="xemHoSo(${item.maLichKham})">

                    <i class="fa-regular fa-eye"></i>

                    Xem hồ sơ

                </button>

            </td>

        `;


        historyTableBody.appendChild(tr);
    });
}


/* =====================================================
   TÌM KIẾM
===================================================== */

function timKiem() {

    const keyword =
        patientSearch.value
            .trim()
            .toLowerCase();


    if (!keyword) {

        renderLichSu(
            danhSachLichSu
        );

        return;
    }


    const filtered =
        danhSachLichSu.filter(
            item => {

                const hoTen =
                    String(
                        item.hoTen || ""
                    ).toLowerCase();

                const maBenhNhan =
                    String(
                        item.maBenhNhan || ""
                    );


                return (
                    hoTen.includes(keyword) ||
                    maBenhNhan.includes(keyword)
                );
            }
        );


    renderLichSu(filtered);
}


/* =====================================================
   XEM HỒ SƠ
===================================================== */

async function xemHoSo(maLichKham) {

    try {

        const data =
            await apiFetch(
                `${API_BASE}/${maLichKham}/ho-so`
            );


        modalPatientName.textContent =
            data.hoTen || "---";


        modalPatientId.textContent =
            data.maBenhNhan
                ? `BN${String(
                    data.maBenhNhan
                ).padStart(6, "0")}`
                : "---";


        modalBirthDate.textContent =
            formatDate(
                data.ngaySinh
            );


        modalGender.textContent =
            data.gioiTinh || "---";


        modalExamDate.textContent =
            formatDate(
                data.ngayKham
            );


        modalExamTime.textContent =
            formatTime(
                data.gioKham
            );


        modalReason.textContent =
            data.lyDoKham || "---";


        modalSymptoms.value =
            data.trieuChung || "";


        modalDiagnosis.value =
            data.chanDoan || "";


        modalConclusion.value =
            data.ketLuan || "";


        modalTreatment.value =
            data.huongDieuTri || "";


        modalReExamDate.value =
            data.ngayTaiKham
                ? formatDate(data.ngayTaiKham)
                : "---";


        modalReExamNote.value =
            data.ghiChuTaiKham || "---";


        moModal();


    } catch (error) {

        showToast(
            "Không thể xem hồ sơ",
            error.message,
            true
        );
    }
}


/* =====================================================
   MODAL
===================================================== */

function moModal() {

    historyModal.classList.remove(
        "hidden"
    );

    document.body.style.overflow =
        "hidden";
}


function dongModal() {

    historyModal.classList.add(
        "hidden"
    );

    document.body.style.overflow =
        "";
}


/* =====================================================
   FORMAT
===================================================== */

function formatDate(dateString) {

    if (!dateString) {
        return "---";
    }


    const parts =
        dateString.split("-");


    if (parts.length !== 3) {
        return dateString;
    }


    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}


function formatTime(time) {

    if (!time) {
        return "---";
    }


    return time.substring(0, 5);
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
   TOAST
===================================================== */

let toastTimer;


function showToast(
    title,
    message,
    error = false
) {

    const toast =
        document.getElementById("toast");

    const toastTitle =
        document.getElementById("toastTitle");

    const toastMessage =
        document.getElementById("toastMessage");

    const toastIcon =
        document.getElementById("toastIcon");


    toastTitle.textContent =
        title;

    toastMessage.textContent =
        message;


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


    clearTimeout(toastTimer);


    toastTimer =
        setTimeout(
            () => {

                toast.classList.add(
                    "hidden"
                );

            },
            3500
        );
}


/* =====================================================
   EVENTS
===================================================== */

patientSearch.addEventListener(
    "input",
    timKiem
);


btnFilter.addEventListener(
    "click",
    loadLichSu
);


btnClearFilter.addEventListener(
    "click",
    function () {

        fromDate.value = "";
        toDate.value = "";
        patientSearch.value = "";

        loadLichSu();
    }
);


btnRefresh.addEventListener(
    "click",
    loadLichSu
);


btnCloseModal.addEventListener(
    "click",
    dongModal
);


btnModalCloseBottom.addEventListener(
    "click",
    dongModal
);


historyModal.addEventListener(
    "click",
    function (event) {

        if (
            event.target === historyModal
        ) {

            dongModal();
        }
    }
);


document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Escape" &&
            !historyModal.classList.contains(
                "hidden"
            )
        ) {

            dongModal();
        }
    }
);


/* =====================================================
   INIT
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        hienThiThongTinBacSi();

        loadLichSu();
    }
);