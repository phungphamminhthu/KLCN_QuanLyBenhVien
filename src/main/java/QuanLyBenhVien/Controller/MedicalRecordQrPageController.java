
package QuanLyBenhVien.Controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class MedicalRecordQrPageController {

    @GetMapping("/medical-records/qr")
    public String showMedicalRecordQrPage(
            @RequestParam(required = false) String token,
            Model model) {

        model.addAttribute("qrToken", token);

        return "BenhNhan/medical-record-qr";
    }
}
