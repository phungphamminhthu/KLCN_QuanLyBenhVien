
package QuanLyBenhVien.Controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class BacSiThongBaoPageController {

    @GetMapping("/auth/bac-si/thong-bao")
    public String trangThongBao() {
        return "BacSi/thong-bao";
    }
}
