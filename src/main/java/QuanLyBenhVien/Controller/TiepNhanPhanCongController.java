package QuanLyBenhVien.Controller;

import QuanLyBenhVien.Service.TiepNhanPhanCongService;
import QuanLyBenhVien.Service.TiepNhanPhanCongService.CaTrucHienTai;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/tiepnhan/phan-cong")
public class TiepNhanPhanCongController {

    private static final Logger logger =
            LoggerFactory.getLogger(
                    TiepNhanPhanCongController.class
            );

    private final TiepNhanPhanCongService phanCongService;

    public TiepNhanPhanCongController(
            TiepNhanPhanCongService phanCongService
    ) {
        this.phanCongService = phanCongService;
    }

    /*
     * GET /api/tiepnhan/phan-cong/hien-tai
     *
     * Tài khoản được lấy từ phiên đăng nhập đã xác thực.
     * Không nhận mã nhân viên hoặc mã khoa từ giao diện.
     */
    @GetMapping("/hien-tai")
    public ResponseEntity<CaTrucHienTai> layCaTrucHienTai(
            Authentication authentication
    ) {
        CaTrucHienTai caTruc =
                phanCongService.layCaTrucHienTai(
                        authentication
                );

        return ResponseEntity
                .ok()
                .cacheControl(CacheControl.noStore())
                .body(caTruc);
    }

    /*
     * Trả về lỗi đăng nhập, thiếu quyền,
     * chưa có ca trực hoặc ca trực trùng giờ.
     */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> xuLyLoiNghiepVu(
            ResponseStatusException exception
    ) {
        String message = exception.getReason();

        if (message == null || message.isBlank()) {
            message =
                    "Không thể xác định ca tiếp nhận hiện tại.";
        }

        return ResponseEntity
                .status(exception.getStatusCode())
                .cacheControl(CacheControl.noStore())
                .body(Map.of(
                        "success", false,
                        "message", message
                ));
    }

    /*
     * Ghi chi tiết lỗi vào log.
     * Giao diện chỉ nhận thông báo chung.
     */
    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String, Object>> xuLyLoiDatabase(
            DataAccessException exception
    ) {
        logger.error(
                "Lỗi truy vấn phân công tiếp nhận.",
                exception
        );

        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .cacheControl(CacheControl.noStore())
                .body(Map.of(
                        "success", false,
                        "message",
                        "Không thể tải thông tin ca trực. Vui lòng thử lại."
                ));
    }
}