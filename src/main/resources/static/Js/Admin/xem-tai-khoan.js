document.addEventListener("DOMContentLoaded", function () {

    const Modal = document.getElementById("viewAccountModal");
    const CloseButton = document.getElementById("closeViewAccountModal");
    const CloseButtonFooter = document.getElementById("closeViewAccountButton");

    const Avatar = document.getElementById("viewAccountAvatar");

    const HoTen = document.getElementById("viewHoTen");
    const HoTenDetail = document.getElementById("viewHoTenDetail");

    const TenDangNhap = document.getElementById("viewTenDangNhap");
    const Email = document.getElementById("viewEmail");
    const SoDienThoai = document.getElementById("viewSoDienThoai");
    const VaiTro = document.getElementById("viewVaiTro");

    const TrangThai = document.getElementById("viewTrangThai");
    const TrangThaiDetail = document.getElementById("viewTrangThaiDetail");

    const DEFAULT_AVATAR =
        "images/2b1261cf-87ab-4b5c-9097-50cd95b2fc24.jpg";


    function closeModal() {
        if (!Modal) return;

        Modal.classList.remove("show");
        document.body.style.overflow = "";
    }


    function formatValue(Value) {
        if (Value === null || Value === undefined || Value === "") {
            return "---";
        }

        return Value;
    }


    function setStatus(IsActive) {

        if (!TrangThai || !TrangThaiDetail) return;

        const Text = IsActive ? "Đang hoạt động" : "Đã khóa";
        const ClassName = IsActive ? "active" : "locked";

        TrangThai.textContent = Text;
        TrangThai.className = "view-status " + ClassName;

        TrangThaiDetail.textContent = Text;
    }


    function setAvatar(FileKey) {

        if (!Avatar) return;

        if (FileKey && FileKey.trim() != "") {

        //Có ảnh trong CSDL -> Lấy ảnh đó từ R2
            Avatar.src =
                "/api/images/view?fileKey="
                + encodeURIComponent(FileKey);

        } else {

        // AnhDaiDien null/rỗng → dùng ảnh mặc định trên R2
            Avatar.src =
                "/api/images/view?fileKey="
                + encodeURIComponent(DEFAULT_AVATAR);
        }
    }


    if (Avatar) {

        Avatar.addEventListener("error", function () {

            this.src =
                "/api/images/view?fileKey="
                + encodeURIComponent(DEFAULT_AVATAR);

        });
    }


    /*
     * Hàm này được tai-khoan.js gọi
     */
    window.openViewAccountModal = function (Account) {

        if (!Modal || !Account) return;

        HoTen.textContent =
            formatValue(Account.hoTen);

        HoTenDetail.textContent =
            formatValue(Account.hoTen);

        TenDangNhap.textContent =
            formatValue(Account.tenDangNhap);

        Email.textContent =
            formatValue(Account.email);

        SoDienThoai.textContent =
            formatValue(Account.soDienThoai);

        VaiTro.textContent =
            formatValue(Account.vaiTro);

        setStatus(Boolean(Account.trangThai));

         // Lấy AnhDaiDien từ CSDL
        setAvatar(Account.anhDaiDien);

        Modal.classList.add("show");

        document.body.style.overflow = "hidden";
    };


    if (CloseButton) {
        CloseButton.addEventListener("click", closeModal);
    }

    if (CloseButtonFooter) {
        CloseButtonFooter.addEventListener("click", closeModal);
    }


    /*
     * Click ra ngoài modal
     */
    if (Modal) {

        Modal.addEventListener("click", function (Event) {

            if (Event.target === Modal) {
                closeModal();
            }

        });
    }


    /*
     * ESC để đóng
     */
    document.addEventListener("keydown", function (Event) {

        if (Event.key === "Escape"
            && Modal
            && Modal.classList.contains("show")) {

            closeModal();
        }

    });

});