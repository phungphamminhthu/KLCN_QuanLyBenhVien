package QuanLyBenhVien.Controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
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
}
