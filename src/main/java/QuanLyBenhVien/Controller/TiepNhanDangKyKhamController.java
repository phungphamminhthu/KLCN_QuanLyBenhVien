package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.TiepNhanDangKyKhamDTO;
import QuanLyBenhVien.DTO.TiepNhanDangKyKhamKetQuaDTO;
import QuanLyBenhVien.Service.TiepNhanDangKyKhamService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.dao.DataAccessException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.dao.PessimisticLockingFailureException;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;

import org.springframework.security.core.Authentication;

import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tiepnhan/dang-ky-kham")
public class TiepNhanDangKyKhamController {

    private static final Logger LOGGER =
            LoggerFactory.getLogger(
                    TiepNhanDangKyKhamController.class
            );

    private final TiepNhanDangKyKhamService service;

    public TiepNhanDangKyKhamController(
            TiepNhanDangKyKhamService service
    ) {
        this.service = service;
    }

    // Lấy các khoa còn lịch bác sĩ làm việc hôm nay.
    @GetMapping("/khoa")
    public List<Map<String, Object>> layDanhSachKhoa(
            Authentication authentication
    ) {
        kiemTraQuyenTiepNhan(authentication);

        return service.layDanhSachKhoa();
    }

    // Lấy lịch làm việc của bác sĩ theo khoa.
    @GetMapping("/lich-bac-si")
    public List<Map<String, Object>> layLichBacSi(
            @RequestParam("maKhoa") Integer maKhoa,
            Authentication authentication
    ) {
        kiemTraQuyenTiepNhan(authentication);

        return service.layLichBacSi(maKhoa);
    }

    // Tạo lịch khám và cấp số thứ tự cho bệnh nhân.
    @PostMapping
    public ResponseEntity<TiepNhanDangKyKhamKetQuaDTO> dangKyKham(
            @RequestBody TiepNhanDangKyKhamDTO request,
            Authentication authentication
    ) {
        kiemTraQuyenTiepNhan(authentication);

        TiepNhanDangKyKhamKetQuaDTO ketQua =
                service.dangKyKham(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ketQua);
    }

    private void kiemTraQuyenTiepNhan(
            Authentication authentication
    ) {
        if (authentication == null
                || !authentication.isAuthenticated()) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Bạn cần đăng nhập để thực hiện chức năng này."
            );
        }

        boolean coQuyenTiepNhan =
                authentication.getAuthorities()
                        .stream()
                        .anyMatch(authority ->
                                "ROLE_TIEPNHAN".equals(
                                        authority.getAuthority()
                                )
                        );

        if (!coQuyenTiepNhan) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Bạn không có quyền sử dụng chức năng tiếp nhận."
            );
        }
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> xuLyLoiNghiepVu(
            ResponseStatusException exception
    ) {
        String message = exception.getReason();

        if (message == null || message.isBlank()) {
            message = "Không thể thực hiện yêu cầu.";
        }

        return ResponseEntity
                .status(exception.getStatusCode())
                .body(Map.of("message", message));
    }

    @ExceptionHandler({
            HttpMessageNotReadableException.class,
            MethodArgumentTypeMismatchException.class,
            MissingServletRequestParameterException.class
    })
    public ResponseEntity<Map<String, String>> xuLyDuLieuKhongHopLe(
            Exception exception
    ) {
        return ResponseEntity
                .badRequest()
                .body(Map.of(
                        "message",
                        "Dữ liệu gửi lên không hợp lệ. "
                                + "Vui lòng kiểm tra khoa, bác sĩ "
                                + "và giờ khám."
                ));
    }

    @ExceptionHandler(DuplicateKeyException.class)
    public ResponseEntity<Map<String, String>> xuLyTrungDuLieu(
            DuplicateKeyException exception
    ) {
        LOGGER.warn(
                "Xung đột dữ liệu khi đăng ký khám tại quầy.",
                exception
        );

        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(Map.of(
                        "message",
                        "Dữ liệu đăng ký bị trùng. "
                                + "Vui lòng kiểm tra lịch khám "
                                + "của bệnh nhân trước khi đăng ký lại."
                ));
    }

    @ExceptionHandler(PessimisticLockingFailureException.class)
    public ResponseEntity<Map<String, String>> xuLyXungDotKhoa(
            PessimisticLockingFailureException exception
    ) {
        LOGGER.warn(
                "Xung đột khóa dữ liệu khi đăng ký khám.",
                exception
        );

        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(Map.of(
                        "message",
                        "Hệ thống đang xử lý một lượt đăng ký khác. "
                                + "Vui lòng kiểm tra lịch khám "
                                + "rồi thử lại."
                ));
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String, String>> xuLyLoiDatabase(
            DataAccessException exception
    ) {
        LOGGER.error(
                "Lỗi database trong chức năng đăng ký khám tại quầy.",
                exception
        );

        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of(
                        "message",
                        "Không thể xử lý dữ liệu lúc này. "
                                + "Vui lòng kiểm tra lịch khám "
                                + "trước khi gửi lại yêu cầu."
                ));
    }
}