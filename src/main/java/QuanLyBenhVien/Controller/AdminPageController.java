package QuanLyBenhVien.Controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/Admin")
public class AdminPageController {

    //trang dashboard
    @GetMapping("/dashboard")
    public String dashboard() {
        return "Admin/dashboard";
    }

    //trang tài khoản của quản lý tài khoản
    @GetMapping("/tai-khoan")
    public String taiKhoan() {
        return "Admin/tai-khoan";
    }

    // trang hồ sơ cá nhân
    @GetMapping("/profile")
    public String profile(){
        return "Admin/profile";
    }

    // trang danh mục tin tức của quản lý tin tức
    @GetMapping("/danh-muc-tin-tuc")
    public String danhMucTinTuc() {

        return "Admin/danh-muc-tin-tuc";
    }

    // trang danh sách tin tức của quản lý tin tức
    @GetMapping("/danh-sach-tin-tuc")
    public String danhSachTinTuc(){
        return "Admin/danh-sach-tin-tuc";
    }

    // trang thêm tin tức của quản lý tin tức
    @GetMapping("/them-tin-tuc")
    public String themTinTuc() {
        return "Admin/them-tin-tuc";
    }

    // trang khoa của quản lý bệnh viện
    @GetMapping("/khoa")
    public String khoaPage() {
        return "Admin/khoa";
    }

    // trang phòng chuyên trách của quản lý bệnh viện
    @GetMapping("/phong")
    public String phongPage() {
        return "Admin/phong";
    }

    // trang thuốc của quản lý thuốc
    @GetMapping("/medicines")
    public String thuocPage() {
        return "Admin/medicines";
    }

    //trang kho thuốc của quản lý thuốc
    @GetMapping("/kho-thuoc")
    public String khoThuocPage() {
        return "Admin/kho-thuoc";
    }

    //trang kho thuốc của quản lý thuốc
    @GetMapping("/thuoc-tuong-duong")
    public String thuocTuongDuongPage() {
        return "Admin/thuoc-tuong-duong";
    }

    // trang thống kê và báo cáo
    @GetMapping("/thong-ke-bao-cao")
    public String thongKeBaoCao() {
        return "Admin/thong-ke-bao-cao";
    }

    // trang auditlog
    @GetMapping("/audit-log")
    public String auditLog() {
        return "Admin/audit-log";
    }

    // phân công tiếp nhận
    @GetMapping("/phan-cong-tiep-nhan")
    public String phanCongTiepNhan() {
        return "Admin/phan-cong-tiep-nhan";
    }

    @ModelAttribute
    public void addCurrentUri(
            HttpServletRequest request,
            Model model
    ) {
        model.addAttribute("currentUri", request.getRequestURI());
    }
}
