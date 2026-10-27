package QuanLyBenhVien.Controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/benh-nhan")
public class BenhNhanPageController {

    // =====================================
    // TRANG CHỦ
    // =====================================
    @GetMapping("/trang-chu")
    public String trangChu() {
        return "BenhNhan/patient-home";
    }

    // =====================================
    // ĐẶT LỊCH
    // =====================================
    @GetMapping("/dat-lich")
    public String datLich() {
        return "BenhNhan/dat-lich";
    }

    // ====================================
    // LỊCH SỬ
    // ====================================
    @GetMapping("/lich-su")
    public String lichSuDatKham() {
        return "BenhNhan/lich-su";
    }

    // ======================================
    // CHI TIẾT LỊCH KHÁM
    // ======================================
    @GetMapping("/lich-su/chi-tiet")
    public String chiTietLichKham() {
        return "BenhNhan/chi-tiet-lich-kham";
    }
}