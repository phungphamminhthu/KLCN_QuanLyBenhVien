package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.TiepNhanThanhToanCLSDTO;
import QuanLyBenhVien.DTO.TiepNhanThanhToanCLSDTO.KetQua;
import QuanLyBenhVien.DTO.TiepNhanThanhToanCLSDTO.XacNhanRequest;
import QuanLyBenhVien.Service.TiepNhanThanhToanCLSService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.dao.DataAccessException;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;

import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/tiepnhan/thanh-toan-cls")
public class TiepNhanThanhToanCLSController {

    private static final Logger logger =
            LoggerFactory.getLogger(
                    TiepNhanThanhToanCLSController.class
            );

    private final TiepNhanThanhToanCLSService service;

    public TiepNhanThanhToanCLSController(
            TiepNhanThanhToanCLSService service
    ) {
        this.service = service;
    }

    // =========================================================
    // XEM DANH SÁCH PHÍ CLS CỦA MỘT LỊCH KHÁM
    //
    // GET /api/tiepnhan/thanh-toan-cls/{maLichKham}
    // =========================================================

    @GetMapping("/{maLichKham}")
    public ResponseEntity<TiepNhanThanhToanCLSDTO>
    getThongTinThanhToan(
            @PathVariable("maLichKham") Integer maLichKham,
            Authentication authentication
    ) {
        kiemTraQuyenTiepNhan(authentication);

        TiepNhanThanhToanCLSDTO ketQua =
                service.getThongTinThanhToan(maLichKham);

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(ketQua);
    }

    // =========================================================
    // XÁC NHẬN NHÂN VIÊN ĐÃ THỰC TẾ NHẬN TIỀN
    //
    // POST /api/tiepnhan/thanh-toan-cls/{maLichKham}/xac-nhan
    //
    // Service tự kiểm tra số tiền, danh sách phí và trạng thái.
    // =========================================================

    @PostMapping("/{maLichKham}/xac-nhan")
    public ResponseEntity<KetQua> xacNhanThanhToan(
            @PathVariable("maLichKham") Integer maLichKham,
            @RequestBody XacNhanRequest request,
            Authentication authentication
    ) {
        kiemTraQuyenTiepNhan(authentication);

        KetQua ketQua = service.xacNhanThanhToan(
                maLichKham,
                request
        );

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(ketQua);
    }

    // =========================================================
    // KIỂM TRA ĐĂNG NHẬP VÀ QUYỀN
    // Không phụ thuộc việc có bật method security hay không.
    // =========================================================

    private void kiemTraQuyenTiepNhan(
            Authentication authentication
    ) {
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication
                instanceof AnonymousAuthenticationToken) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Phiên đăng nhập không hợp lệ. "
                            + "Vui lòng đăng nhập lại."
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
                    "Bạn không có quyền thực hiện chức năng này."
            );
        }
    }

    // =========================================================
    // TRẢ LỖI JSON ĐỂ GIAO DIỆN HIỂN THỊ
    // =========================================================

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> xuLyLoiNghiepVu(
            ResponseStatusException exception
    ) {
        String message = exception.getReason();

        if (message == null || message.isBlank()) {
            message = "Không thể thực hiện yêu cầu.";
        }

        return ResponseEntity
                .status(exception.getStatusCode())
                .cacheControl(CacheControl.noStore())
                .body(Map.<String, Object>of(
                        "success", false,
                        "message", message
                ));
    }

    @ExceptionHandler({
            HttpMessageNotReadableException.class,
            MethodArgumentTypeMismatchException.class
    })
    public ResponseEntity<Map<String, Object>> xuLyDuLieuSai(
            Exception exception
    ) {
        return traLoi(
                HttpStatus.BAD_REQUEST,
                "Dữ liệu gửi lên không hợp lệ. "
                        + "Vui lòng kiểm tra lại."
        );
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String, Object>> xuLyLoiDatabase(
            DataAccessException exception
    ) {
        logger.error(
                "Lỗi database khi xử lý thanh toán CLS",
                exception
        );

        return traLoi(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Không thể xử lý thanh toán CLS. "
                        + "Vui lòng tải lại thông tin để kiểm tra "
                        + "trước khi xác nhận lại."
        );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> xuLyLoiKhac(
            Exception exception
    ) {
        logger.error(
                "Lỗi khi xử lý thanh toán CLS",
                exception
        );

        return traLoi(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Có lỗi khi xử lý yêu cầu. "
                        + "Vui lòng tải lại thông tin để kiểm tra."
        );
    }

    private ResponseEntity<Map<String, Object>> traLoi(
            HttpStatus status,
            String message
    ) {
        return ResponseEntity.status(status)
                .cacheControl(CacheControl.noStore())
                .body(Map.<String, Object>of(
                        "success", false,
                        "message", message
                ));
    }
}