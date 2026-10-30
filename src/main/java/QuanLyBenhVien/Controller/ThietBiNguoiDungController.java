package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.DangKyThietBiRequest;
import QuanLyBenhVien.Service.ThietBiNguoiDungService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/thiet-bi")
public class ThietBiNguoiDungController {

    private final ThietBiNguoiDungService thietBiService;

    public ThietBiNguoiDungController(
            ThietBiNguoiDungService thietBiService
    ) {
        this.thietBiService = thietBiService;
    }

    @PostMapping("/dang-ky")
    public ResponseEntity<?> dangKy(
            @RequestBody DangKyThietBiRequest request,
            Authentication authentication
    ) {
        thietBiService.dangKyThietBi(
                authentication.getName(),
                request.fcmToken(),
                request.loaiThietBi()
        );

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Đăng ký thiết bị nhận thông báo thành công."
        ));
    }

    @PostMapping("/huy-dang-ky")
    public ResponseEntity<?> huyDangKy(
            @RequestBody DangKyThietBiRequest request,
            Authentication authentication
    ) {
        thietBiService.huyDangKyThietBi(
                authentication.getName(),
                request.fcmToken()
        );

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Đã ngừng đăng ký thiết bị."
        ));
    }
}