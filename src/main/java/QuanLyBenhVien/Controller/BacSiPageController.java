package QuanLyBenhVien.Controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@Controller
public class BacSiPageController {


    @GetMapping("/auth/bac-si/ho-so-ca-nhan")
    public String hoSoCaNhan() {
        return "BacSi/ho-so-ca-nhan";
    }


    // =========================================================
    // TRANG CHỦ BÁC SĨ
    // =========================================================

    @GetMapping("/auth/bac-si/trang-chu")
    public String trangChuBacSi() {

        return "BacSi/trang-chu";
    }


    // =========================================================
    // DANH SÁCH CHỜ KHÁM
    // =========================================================

    @GetMapping("/auth/bac-si/kham-benh")
    public String trangKhamBenh() {

        return "BacSi/kham-benh";
    }


    // =========================================================
    // TRANG KHÁM BỆNH CHI TIẾT
    // =========================================================

    @GetMapping("/auth/bac-si/kham-benh/{maLichKham}")
    public String chiTietKhamBenh(
            @PathVariable Integer maLichKham
    ) {

        return "BacSi/chi-tiet-kham-benh";
    }

    // =========================================================
// TRANG CHỈ ĐỊNH CẬN LÂM SÀNG CỦA LƯỢT KHÁM
// =========================================================

    @GetMapping("/auth/bac-si/kham-benh/{maLichKham}/can-lam-sang")
    public String trangCanLamSang(
            @PathVariable Integer maLichKham
    ) {
        return "BacSi/chi-dinh-can-lam-sang";
    }


    // =========================================================
    // HỒ SƠ BỆNH NHÂN
    // =========================================================

    @GetMapping("/auth/bac-si/lich-su-kham")
    public String lichSuKham() {

        return "BacSi/lich-su-kham";
    }


    // =========================================================
    // QUẢN LÝ CHỈ ĐỊNH CẬN LÂM SÀNG
    // =========================================================

    @GetMapping("/auth/bac-si/chi-dinh")
    public String chiDinh() {

        return "BacSi/chi-dinh";
    }


    // =========================================================
    // KẾT QUẢ CẬN LÂM SÀNG
    // =========================================================

    @GetMapping("/auth/bac-si/ket-qua-can-lam-sang")
    public String ketQuaCanLamSang() {

        return "BacSi/ket-qua-can-lam-sang";
    }
}