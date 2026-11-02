
package QuanLyBenhVien.Controller;

import QuanLyBenhVien.Service.TiepNhanThuVienPhiService;
import QuanLyBenhVien.Service.TiepNhanThuVienPhiService.KetQuaThuTien;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.dao.DataAccessException;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/tiepnhan/hoa-don")
public class TiepNhanThuVienPhiController {

    private static final Logger log =
            LoggerFactory.getLogger(
                    TiepNhanThuVienPhiController.class
            );

    private final TiepNhanThuVienPhiService service;

    public TiepNhanThuVienPhiController(
            TiepNhanThuVienPhiService service
    ) {
        this.service = service;
    }

    // =====================================================
    // GHI NHẬN THU TIỀN MẶT
    //
    // POST /api/tiepnhan/hoa-don/{maHoaDon}/thu-tien-mat
    //
    // Không nhận MaNguoiThu hay SoTien từ frontend.
    // =====================================================

    @PostMapping("/{maHoaDon}/thu-tien-mat")
    public ResponseEntity<KetQuaThuTien> thuTienMat(
            @PathVariable Integer maHoaDon,
            Authentication authentication
    ) {
        KetQuaThuTien ketQua =
                service.thuTienMat(
                        maHoaDon,
                        authentication
                );

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(ketQua);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> loiNghiepVu(
            ResponseStatusException ex
    ) {
        return ResponseEntity
                .status(ex.getStatusCode())
                .cacheControl(CacheControl.noStore())
                .body(Map.of(
                        "success", false,
                        "message",
                        ex.getReason() == null
                                ? "Không thể thu tiền."
                                : ex.getReason()
                ));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> loiMaHoaDon(
            MethodArgumentTypeMismatchException ex
    ) {
        return ResponseEntity.badRequest()
                .cacheControl(CacheControl.noStore())
                .body(Map.of(
                        "success", false,
                        "message",
                        "Mã hóa đơn không hợp lệ."
                ));
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String, Object>> loiDatabase(
            DataAccessException ex
    ) {
        log.error(
                "Lỗi database khi thu viện phí",
                ex
        );

        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .cacheControl(CacheControl.noStore())
                .body(Map.of(
                        "success", false,
                        "message",
                        "Không thể ghi nhận giao dịch. "
                                + "Hãy tải lại viện phí "
                                + "trước khi thử lại."
                ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> loiKhac(
            Exception ex
    ) {
        log.error(
                "Lỗi hệ thống khi thu viện phí",
                ex
        );

        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .cacheControl(CacheControl.noStore())
                .body(Map.of(
                        "success", false,
                        "message",
                        "Có lỗi khi xử lý thanh toán. "
                                + "Hãy kiểm tra lại hóa đơn."
                ));
    }
}
