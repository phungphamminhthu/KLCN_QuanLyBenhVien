package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.TiepNhanHoaDonDTO;
import QuanLyBenhVien.Service.TiepNhanHoaDonService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.dao.DataAccessException;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping(
        value = "/api/tiepnhan/hoa-don",
        produces = MediaType.APPLICATION_JSON_VALUE
)
public class TiepNhanHoaDonController {

    private static final Logger log =
            LoggerFactory.getLogger(
                    TiepNhanHoaDonController.class
            );

    private final TiepNhanHoaDonService hoaDonService;

    public TiepNhanHoaDonController(
            TiepNhanHoaDonService hoaDonService
    ) {
        this.hoaDonService = hoaDonService;
    }

    // =====================================================
    // ĐỌC VIỆN PHÍ CỦA MỘT LỊCH KHÁM
    //
    // Bao gồm:
    // - Danh sách hóa đơn.
    // - Chi tiết dịch vụ/thuốc.
    // - Lịch sử thanh toán và người thu.
    // =====================================================

    @GetMapping("/lich-kham/{maLichKham}")
    public ResponseEntity<TiepNhanHoaDonDTO> layDanhSachHoaDon(
            @PathVariable("maLichKham") Integer maLichKham,
            Authentication authentication
    ) {
        if (maLichKham <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Mã lịch khám phải là số nguyên dương."
            );
        }

        TiepNhanHoaDonDTO ketQua =
                hoaDonService.layDanhSachHoaDon(
                        maLichKham,
                        authentication
                );

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(ketQua);
    }

    // =====================================================
    // LỖI NGHIỆP VỤ VÀ PHÂN QUYỀN TỪ SERVICE
    // =====================================================

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> xuLyLoiNghiepVu(
            ResponseStatusException exception
    ) {
        String message = exception.getReason();

        if (message == null || message.isBlank()) {
            message = "Không thể tải thông tin viện phí.";
        }

        return ResponseEntity.status(
                        exception.getStatusCode()
                )
                .cacheControl(CacheControl.noStore())
                .body(
                        Map.of(
                                "success", false,
                                "message", message
                        )
                );
    }

    // =====================================================
    // MÃ LỊCH KHÁM KHÔNG PHẢI SỐ NGUYÊN HỢP LỆ
    // =====================================================

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> xuLySaiMaLichKham(
            MethodArgumentTypeMismatchException exception
    ) {
        return ResponseEntity.badRequest()
                .cacheControl(CacheControl.noStore())
                .body(
                        Map.of(
                                "success", false,
                                "message",
                                "Mã lịch khám không hợp lệ. "
                                        + "Hãy chọn lại từ danh sách."
                        )
                );
    }

    // =====================================================
    // LỖI TRUY VẤN DATABASE
    // =====================================================

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String, Object>> xuLyLoiDatabase(
            DataAccessException exception
    ) {
        log.error(
                "Không thể truy vấn thông tin viện phí",
                exception
        );

        return ResponseEntity.status(
                        HttpStatus.INTERNAL_SERVER_ERROR
                )
                .cacheControl(CacheControl.noStore())
                .body(
                        Map.of(
                                "success", false,
                                "message",
                                "Không thể tải viện phí từ database. "
                                        + "Vui lòng kiểm tra log máy chủ "
                                        + "hoặc thử lại sau."
                        )
                );
    }
}