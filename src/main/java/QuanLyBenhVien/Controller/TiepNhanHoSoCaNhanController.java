package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.TiepNhanHoSoCaNhanDTO;
import QuanLyBenhVien.Service.TiepNhanHoSoCaNhanService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/tiepnhan/ho-so-ca-nhan")
public class TiepNhanHoSoCaNhanController {

    private static final Logger logger =
            LoggerFactory.getLogger(
                    TiepNhanHoSoCaNhanController.class
            );

    private final TiepNhanHoSoCaNhanService service;

    public TiepNhanHoSoCaNhanController(
            TiepNhanHoSoCaNhanService service
    ) {
        this.service = service;
    }

    // =====================================================
    // LẤY HỒ SƠ CỦA NHÂN VIÊN ĐANG ĐĂNG NHẬP
    // GET /api/tiepnhan/ho-so-ca-nhan
    // =====================================================

    @GetMapping
    public ResponseEntity<TiepNhanHoSoCaNhanDTO> layHoSo(
            Authentication authentication
    ) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(service.layHoSo(authentication));
    }

    // =====================================================
    // CẬP NHẬT HỒ SƠ CỦA NHÂN VIÊN ĐANG ĐĂNG NHẬP
    // PUT /api/tiepnhan/ho-so-ca-nhan
    // =====================================================

    @PutMapping
    public ResponseEntity<TiepNhanHoSoCaNhanDTO> capNhatHoSo(
            Authentication authentication,
            @RequestBody
            TiepNhanHoSoCaNhanDTO.CapNhatRequest request
    ) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(
                        service.capNhatHoSo(
                                authentication,
                                request
                        )
                );
    }

    // =====================================================
    // LỖI ĐĂNG NHẬP, PHÂN QUYỀN VÀ KIỂM TRA DỮ LIỆU
    // =====================================================

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> xuLyLoiNghiepVu(
            ResponseStatusException exception
    ) {
        String message = exception.getReason();

        if (message == null || message.isBlank()) {
            message = "Không thể xử lý yêu cầu hồ sơ cá nhân.";
        }

        return taoPhanHoiLoi(
                exception.getStatusCode(),
                message
        );
    }

    // =====================================================
    // LỖI NỘI DUNG JSON GỬI LÊN
    // =====================================================

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> xuLyDuLieuKhongHopLe(
            HttpMessageNotReadableException exception
    ) {
        return taoPhanHoiLoi(
                HttpStatus.BAD_REQUEST,
                "Dữ liệu cập nhật không hợp lệ. "
                        + "Vui lòng kiểm tra lại thông tin."
        );
    }

    // =====================================================
    // LỖI TRUY CẬP DATABASE
    // =====================================================

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String, Object>> xuLyLoiDatabase(
            DataAccessException exception
    ) {
        logger.error(
                "Lỗi truy cập database khi xử lý "
                        + "hồ sơ cá nhân tiếp nhận",
                exception
        );

        return taoPhanHoiLoi(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Không thể xử lý dữ liệu hồ sơ lúc này. "
                        + "Vui lòng làm mới để kiểm tra."
        );
    }

    // =====================================================
    // PHẢN HỒI LỖI CHO JAVASCRIPT
    // =====================================================

    private ResponseEntity<Map<String, Object>> taoPhanHoiLoi(
            HttpStatusCode status,
            String message
    ) {
        Map<String, Object> body = Map.of(
                "success", false,
                "message", message
        );

        return ResponseEntity.status(status)
                .cacheControl(CacheControl.noStore())
                .body(body);
    }
}