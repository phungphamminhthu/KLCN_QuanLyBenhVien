package QuanLyBenhVien.Controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/TiepNhan")
public class TiepNhanPageController {

    @GetMapping("/dashboard")
    public String dashboard() {
        return "TiepNhan/dashboard";
    }

    @GetMapping("/checkin")
    public String checkin() {
        return "TiepNhan/checkin";
    }

    @GetMapping("/patients")
    public String patients() {
        return "TiepNhan/patients";
    }
}