package QuanLyBenhVien.Controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class BacSiPageController {

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
    // LỊCH SỬ KHÁM
    // =========================================================
    @GetMapping("/auth/bac-si/lich-su-kham")
    public String lichSuKham() {

        return "BacSi/lich-su-kham";
    }
}