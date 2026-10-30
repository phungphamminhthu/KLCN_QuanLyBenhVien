
package QuanLyBenhVien.Controller;

import QuanLyBenhVien.Entity.NguoiDung;
import QuanLyBenhVien.Entity.ThongBao;
import QuanLyBenhVien.Repository.NguoiDungRepository;
import QuanLyBenhVien.Service.ThongBaoService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/thong-bao")
public class ThongBaoController {

    private final ThongBaoService thongBaoService;
    private final NguoiDungRepository nguoiDungRepository;

    public ThongBaoController(
            ThongBaoService thongBaoService,
            NguoiDungRepository nguoiDungRepository) {
        this.thongBaoService = thongBaoService;
        this.nguoiDungRepository = nguoiDungRepository;
    }

    private NguoiDung layNguoiDungDangNhap(
            Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getName())) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Bạn chưa đăng nhập");
        }

        return nguoiDungRepository
                .findByTenDangNhap(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Không tìm thấy tài khoản đăng nhập"));
    }

    @GetMapping
    public List<Map<String, Object>> layDanhSach(
            Authentication authentication,
            @RequestParam(defaultValue = "20") int limit) {

        NguoiDung nguoiDung = layNguoiDungDangNhap(authentication);

        return thongBaoService.layThongBao(
                nguoiDung.getMaNguoiDung(), limit);
    }

    @GetMapping("/chua-doc")
    public Map<String, Long> demChuaDoc(
            Authentication authentication) {

        NguoiDung nguoiDung = layNguoiDungDangNhap(authentication);

        return Map.of(
                "count",
                thongBaoService.demChuaDoc(
                        nguoiDung.getMaNguoiDung()));
    }

    @PatchMapping("/{id}/da-doc")
    public ResponseEntity<Void> danhDauDaDoc(
            Authentication authentication,
            @PathVariable Integer id) {

        NguoiDung nguoiDung = layNguoiDungDangNhap(authentication);

        boolean thanhCong = thongBaoService.danhDauDaDoc(
                nguoiDung.getMaNguoiDung(), id);

        if (!thanhCong) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/da-doc-tat-ca")
    public Map<String, Integer> danhDauTatCaDaDoc(
            Authentication authentication) {

        NguoiDung nguoiDung = layNguoiDungDangNhap(authentication);

        int soLuong = thongBaoService.danhDauTatCaDaDoc(
                nguoiDung.getMaNguoiDung());

        return Map.of("updated", soLuong);
    }

    // ====================================
    // test fcm
    // ====================================
    @PostMapping("/test-fcm")
    public ResponseEntity<?> testFcm(
            @RequestBody Map<String, Integer> request
    ) {
        Integer maNguoiDung = request.get("maNguoiDung");

        if (maNguoiDung == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Thiếu maNguoiDung"));
        }

        ThongBao thongBao = thongBaoService.taoThongBao(
                maNguoiDung,
                "Kiểm tra thông báo",
                "Đây là thông báo thử nghiệm từ hệ thống bệnh viện.",
                "TEST"
        );

        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "message", "Đã tạo thông báo thử nghiệm",
                        "id", thongBao.getMaThongBao()
                )
        );
    }
}
