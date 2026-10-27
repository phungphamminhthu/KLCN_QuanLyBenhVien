
package QuanLyBenhVien.Controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class BacSiTaoChiDinhPageController {

    // Hiển thị trang tạo phiếu chỉ định
    @GetMapping("/auth/bac-si/tao-chi-dinh")
    public String trangTaoChiDinh() {

        return "BacSi/tao-chi-dinh";
    }
}
