
package QuanLyBenhVien.Controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PublicAboutController {

    @GetMapping("/about")
    public String aboutPage() {
        return "Public/about";
    }
}
