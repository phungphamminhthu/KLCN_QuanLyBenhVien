package QuanLyBenhVien.Controller;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.server.ResponseStatusException;

@Controller
@RequestMapping("/TiepNhan")
public class TiepNhanHoSoPageController {

    @GetMapping("/ho-so-benh-nhan/{maBenhNhan}")
    public String hoSoBenhNhan(
            @PathVariable("maBenhNhan") Integer maBenhNhan,

            @RequestParam(
                    name = "maLichKham",
                    required = false
            ) Integer maLichKham,

            @RequestParam(
                    name = "from",
                    defaultValue = "checkin"
            ) String from,

            Model model
    ) {
        if (maBenhNhan <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Mã bệnh nhân không hợp lệ."
            );
        }

        if (maLichKham != null && maLichKham <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Mã lịch khám không hợp lệ."
            );
        }

        // Chỉ cho phép quay lại các trang của phân hệ tiếp nhận.
        String trangNguon = switch (from) {
            case "dashboard" -> "dashboard";
            case "patients" -> "patients";
            case "appointment-history" -> "appointment-history";
            default -> "checkin";
        };

        model.addAttribute("maBenhNhan", maBenhNhan);
        model.addAttribute("maLichKham", maLichKham);
        model.addAttribute("trangNguon", trangNguon);
        model.addAttribute(
                "duongDanQuayLai",
                "/TiepNhan/" + trangNguon
        );

        return "TiepNhan/patient-detail";
    }
}