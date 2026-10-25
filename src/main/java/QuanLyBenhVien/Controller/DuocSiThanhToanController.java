
package QuanLyBenhVien.Controller;

import QuanLyBenhVien.Service.DuocSiThanhToanService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/duocsi/cho-cap-thuoc")
public class DuocSiThanhToanController {

    private final DuocSiThanhToanService thanhToanService;

    public DuocSiThanhToanController(
            DuocSiThanhToanService thanhToanService
    ) {
        this.thanhToanService = thanhToanService;
    }

    @GetMapping("/{id}/hoa-don/qr")
    public ResponseEntity<?> taoQR(@PathVariable("id") Integer id) {
        try {
            return ResponseEntity.ok(thanhToanService.taoQR(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(
                    Map.of("success", false, "message", e.getMessage())
            );
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(
                    Map.of("success", false, "message", e.getMessage())
            );
        }
    }

    @GetMapping("/{id}/hoa-don/trang-thai")
    public ResponseEntity<?> layTrangThai(
            @PathVariable("id") Integer id
    ) {
        try {
            return ResponseEntity.ok(thanhToanService.layTrangThai(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(
                    Map.of("success", false, "message", e.getMessage())
            );
        }
    }
}
