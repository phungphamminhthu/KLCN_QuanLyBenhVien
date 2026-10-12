package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.TiepNhanHoSoBenhNhanDTO;
import QuanLyBenhVien.DTO.TiepNhanTaoBenhNhanDTO;
import QuanLyBenhVien.Service.TiepNhanHoSoBenhNhanService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;

import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/tiepnhan/ho-so-benh-nhan")
public class TiepNhanHoSoBenhNhanController {

    private static final Logger logger =
            LoggerFactory.getLogger(
                    TiepNhanHoSoBenhNhanController.class
            );

    private final TiepNhanHoSoBenhNhanService hoSoService;

    public TiepNhanHoSoBenhNhanController(
            TiepNhanHoSoBenhNhanService hoSoService
    ) {
        this.hoSoService = hoSoService;
    }

    // =========================================================
    // XEM HỒ SƠ BỆNH NHÂN
    // GET /api/tiepnhan/ho-so-benh-nhan/{maBenhNhan}
    // =========================================================

    @GetMapping("/{maBenhNhan}")
    public TiepNhanHoSoBenhNhanDTO getHoSo(
            @PathVariable("maBenhNhan") Integer maBenhNhan,
            Authentication authentication
    ) {
        kiemTraQuyenTiepNhan(authentication);

        return hoSoService.getHoSo(maBenhNhan);
    }

    // =========================================================
    // CẬP NHẬT THÔNG TIN CÁ NHÂN
    // PUT /api/tiepnhan/ho-so-benh-nhan/{maBenhNhan}
    //
    // Số đo trước khám được lưu bằng API riêng theo mã lịch khám.
    // =========================================================

    @PutMapping("/{maBenhNhan}")
    public ResponseEntity<Map<String, Object>> capNhatHoSo(
            @PathVariable("maBenhNhan") Integer maBenhNhan,
            @RequestBody TiepNhanTaoBenhNhanDTO request,
            Authentication authentication
    ) {
        kiemTraQuyenTiepNhan(authentication);

        hoSoService.capNhatHoSo(maBenhNhan, request);

        return ResponseEntity.ok(
                Map.<String, Object>of(
                        "success", true,
                        "message",
                        "Cập nhật thông tin bệnh nhân thành công.",
                        "maBenhNhan", maBenhNhan
                )
        );
    }

    // =========================================================
    // KIỂM TRA ĐĂNG NHẬP VÀ VAI TRÒ
    // =========================================================

    private void kiemTraQuyenTiepNhan(
            Authentication authentication
    ) {
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Bạn cần đăng nhập để sử dụng hồ sơ bệnh nhân."
            );
        }

        boolean coQuyen = authentication.getAuthorities()
                .stream()
                .anyMatch(authority ->
                        "ROLE_TIEPNHAN".equals(
                                authority.getAuthority()
                        )
                );

        if (!coQuyen) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Tài khoản không có quyền sử dụng hồ sơ "
                            + "tại phân hệ tiếp nhận."
            );
        }
    }

    // =========================================================
    // XỬ LÝ LỖI NGHIỆP VỤ
    // =========================================================

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatus(
            ResponseStatusException exception
    ) {
        String message = exception.getReason();

        if (message == null || message.isBlank()) {
            message = "Không thể xử lý yêu cầu.";
        }

        return ResponseEntity
                .status(exception.getStatusCode())
                .body(Map.<String, Object>of(
                        "success", false,
                        "message", message
                ));
    }

    // =========================================================
    // XỬ LÝ JSON, NGÀY SINH HOẶC MÃ BỆNH NHÂN KHÔNG HỢP LỆ
    // =========================================================

    @ExceptionHandler({
            HttpMessageNotReadableException.class,
            MethodArgumentTypeMismatchException.class
    })
    public ResponseEntity<Map<String, Object>> handleInvalidData(
            Exception exception
    ) {
        return ResponseEntity
                .badRequest()
                .body(Map.<String, Object>of(
                        "success", false,
                        "message",
                        "Dữ liệu gửi lên không hợp lệ. "
                                + "Mã bệnh nhân phải là số nguyên "
                                + "và ngày sinh phải theo dạng yyyy-MM-dd."
                ));
    }

    // =========================================================
    // XỬ LÝ LỖI DATABASE
    // =========================================================

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String, Object>> handleDatabaseError(
            DataAccessException exception
    ) {
        logger.error(
                "Lỗi đọc hoặc cập nhật hồ sơ bệnh nhân.",
                exception
        );

        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.<String, Object>of(
                        "success", false,
                        "message",
                        "Không thể xử lý hồ sơ bệnh nhân lúc này. "
                                + "Vui lòng thử lại sau."
                ));
    }
}