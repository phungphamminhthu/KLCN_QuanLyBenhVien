package QuanLyBenhVien.Controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/benh-nhan")
public class BenhNhanPageController {

    @GetMapping("/trang-chu")
    public String trangChu() {
        return "BenhNhan/patient-home";
    }
}