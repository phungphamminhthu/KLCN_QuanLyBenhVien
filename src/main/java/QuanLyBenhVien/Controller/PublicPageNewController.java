package QuanLyBenhVien.Controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PublicPageNewController {

    @GetMapping("/news")
    public String newsPage() {
        return "Public/news";
    }
}
