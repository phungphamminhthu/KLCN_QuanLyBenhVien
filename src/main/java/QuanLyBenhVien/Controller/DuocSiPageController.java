package QuanLyBenhVien.Controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/DuocSi")
public class DuocSiPageController {

    // =====================================================
    // DASHBOARD
    // =====================================================

    @GetMapping("/dashboard")
    public String dashboard() {
        return "DuocSi/dashboard";
    }


    // =====================================================
    // ĐƠN THUỐC
    // =====================================================

    // Đơn thuốc chờ cấp
    @GetMapping("/cho-cap-thuoc")
    public String choCapThuoc() {
        return "DuocSi/cho-cap-thuoc";
    }


    // Lịch sử cấp thuốc
    @GetMapping("/lich-su-cap-thuoc")
    public String lichSuCapThuoc() {
        return "DuocSi/lich-su-cap-thuoc";
    }


    // =====================================================
    // KHO THUỐC
    // =====================================================

    // Danh sách thuốc
    @GetMapping("/danh-sach-thuoc")
    public String danhSachThuoc() {
        return "DuocSi/danh-sach-thuoc";
    }


    // Tồn kho
    @GetMapping("/ton-kho")
    public String tonKho() {
        return "DuocSi/ton-kho";
    }


    // Thuốc sắp hết hạn
    @GetMapping("/thuoc-sap-het-han")
    public String thuocSapHetHan() {
        return "DuocSi/thuoc-sap-het-han";
    }


    // Thuốc hết hạn
    @GetMapping("/thuoc-het-han")
    public String thuocHetHan() {
        return "DuocSi/thuoc-het-han";
    }


    // =====================================================
    // HỒ SƠ CÁ NHÂN
    // =====================================================

    @GetMapping("/profile")
    public String profile() {
        return "DuocSi/profile";
    }


    // =====================================================
    // THÔNG BÁO
    // =====================================================

    @GetMapping("/thong-bao")
    public String thongBao() {
        return "DuocSi/thong-bao";
    }


    // =====================================================
    // CURRENT URI
    // =====================================================

    @ModelAttribute
    public void addCurrentUri(
            HttpServletRequest request,
            Model model
    ) {

        model.addAttribute(
                "currentUri",
                request.getRequestURI()
        );

    }

    // ==================================================
    // CHI TIẾT ĐƠN THUỐC
    // ==================================================
    @GetMapping("/cho-cap-thuoc/{id}")
    public String chiTietChoCapThuoc(
            @PathVariable("id") Integer id
    ) {
        return "DuocSi/chi-tiet-cap-thuoc";
    }

    // =================================================
    // CẤP THUỐC
    // =================================================
    @GetMapping("/cap-thuoc/{id}")
    public String capThuoc(
            @PathVariable Integer id
    ) {
        return "DuocSi/cap-thuoc";
    }

    // ====================================
    // CẤP THUỐC THÀNH CÔNG
    // ====================================
    @GetMapping("/cap-thuoc-thanh-cong/{id}")
    public String capThuocThanhCong(
            @PathVariable("id") Integer id,
            Model model
    ) {
        model.addAttribute("maDonThuoc", id);

        return "DuocSi/cap-thuoc-thanh-cong";
    }

    //===============================================
    // LỊCH SỬ CẤP THUÔC CHI TIẾT
    // ==============================================
    @GetMapping("/lich-su-cap-thuoc/{id}")
    public String lichSuCapThuocChiTiet(
            @PathVariable("id") Integer id,
            Model model) {

        model.addAttribute("maDonThuoc", id);

        return "DuocSi/lich-su-cap-thuoc-chi-tiet";
    }

}