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

    // =========================================================
    // TRANG HỒ SƠ BỆNH NHÂN
    // =========================================================

    @GetMapping("/ho-so-benh-nhan/{maBenhNhan}")
    public String hoSoBenhNhan(
            @PathVariable("maBenhNhan")
            Integer maBenhNhan,

            @RequestParam(
                    name = "maLichKham",
                    required = false
            )
            Integer maLichKham,

            @RequestParam(
                    name = "from",
                    defaultValue = "checkin"
            )
            String from,

            Model model
    ) {
        kiemTraMa(
                maBenhNhan,
                "Mã bệnh nhân không hợp lệ."
        );

        if (maLichKham != null) {
            kiemTraMa(
                    maLichKham,
                    "Mã lịch khám không hợp lệ."
            );
        }

        String trangNguon = chuanHoaTrangNguon(from);

        model.addAttribute(
                "maBenhNhan",
                maBenhNhan
        );

        model.addAttribute(
                "maLichKham",
                maLichKham
        );

        model.addAttribute(
                "trangNguon",
                trangNguon
        );

        model.addAttribute(
                "duongDanQuayLai",
                "/TiepNhan/" + trangNguon
        );

        return "TiepNhan/patient-detail";
    }

    // =========================================================
    // TRANG CHI TIẾT MỘT LỊCH KHÁM
    //
    // Ví dụ:
    // /TiepNhan/chi-tiet-lich-kham/94/130?from=dashboard
    // =========================================================

    @GetMapping(
            "/chi-tiet-lich-kham/{maBenhNhan}/{maLichKham}"
    )
    public String chiTietLichKham(
            @PathVariable("maBenhNhan")
            Integer maBenhNhan,

            @PathVariable("maLichKham")
            Integer maLichKham,

            @RequestParam(
                    name = "from",
                    defaultValue = "checkin"
            )
            String from,

            Model model
    ) {
        kiemTraMa(
                maBenhNhan,
                "Mã bệnh nhân không hợp lệ."
        );

        kiemTraMa(
                maLichKham,
                "Mã lịch khám không hợp lệ."
        );

        String trangNguon = chuanHoaTrangNguon(from);

        // Quay lại đúng hồ sơ bệnh nhân.
        String duongDanHoSo =
                "/TiepNhan/ho-so-benh-nhan/"
                        + maBenhNhan
                        + "?maLichKham="
                        + maLichKham
                        + "&from="
                        + trangNguon;

        model.addAttribute(
                "maBenhNhan",
                maBenhNhan
        );

        model.addAttribute(
                "maLichKham",
                maLichKham
        );

        model.addAttribute(
                "trangNguon",
                trangNguon
        );

        model.addAttribute(
                "duongDanQuayLai",
                duongDanHoSo
        );

        /*
         * Controller này chỉ mở giao diện.
         * API lấy dữ liệu chi tiết phải kiểm tra:
         * - Tài khoản đăng nhập.
         * - Khoa đang được phân công.
         * - Lịch khám thuộc đúng bệnh nhân.
         */
        return "TiepNhan/appointmentdetail";
    }

    // =========================================================
    // CHỈ CHẤP NHẬN TRANG NGUỒN HỢP LỆ
    // =========================================================

    private String chuanHoaTrangNguon(String from) {
        if (from == null) {
            return "checkin";
        }

        return switch (from) {
            case "dashboard" -> "dashboard";
            case "patients" -> "patients";
            case "appointment-history" -> "appointment-history";
            default -> "checkin";
        };
    }

    // =========================================================
    // KIỂM TRA MÃ
    // =========================================================

    private void kiemTraMa(
            Integer ma,
            String thongBao
    ) {
        if (ma == null || ma <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    thongBao
            );
        }
    }
}