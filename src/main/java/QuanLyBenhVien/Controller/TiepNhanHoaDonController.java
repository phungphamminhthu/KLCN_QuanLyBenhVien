package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.TiepNhanHoaDonDTO;
import QuanLyBenhVien.DTO.TiepNhanThuTienDTO;
import QuanLyBenhVien.Service.TiepNhanHoaDonService;
import QuanLyBenhVien.Service.TiepNhanThuTienService;
import QuanLyBenhVien.Service.TiepNhanThuTienService.KetQuaThuTien;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.dao.ConcurrencyFailureException;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;

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
    private final TiepNhanThuTienService thuTienService;

    public TiepNhanHoaDonController(
            TiepNhanHoaDonService hoaDonService,
            TiepNhanThuTienService thuTienService
    ) {
        this.hoaDonService = hoaDonService;
        this.thuTienService = thuTienService;
    }

    // =====================================================
    // ĐỌC DANH SÁCH HÓA ĐƠN CỦA MỘT LỊCH KHÁM
    // =====================================================

    @GetMapping("/lich-kham/{maLichKham}")
    public ResponseEntity<TiepNhanHoaDonDTO> layDanhSachHoaDon(
            @PathVariable("maLichKham") Integer maLichKham,
            Authentication authentication
    ) {
        if (maLichKham == null || maLichKham <= 0) {
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
    // XÁC NHẬN THU ĐỦ MỘT HÓA ĐƠN
    //
    // POST /api/tiepnhan/hoa-don/{maHoaDon}/thanh-toan
    //
    // Nhân viên thu được xác định từ tài khoản đăng nhập.
    // =====================================================

    @PostMapping(
            value = "/{maHoaDon}/thanh-toan",
            consumes = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<KetQuaThuTien> xacNhanThuTien(
            @PathVariable("maHoaDon") Integer maHoaDon,
            @RequestBody TiepNhanThuTienDTO input,
            Authentication authentication
    ) {
        if (maHoaDon == null || maHoaDon <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Mã hóa đơn phải là số nguyên dương."
            );
        }

        KetQuaThuTien ketQua =
                thuTienService.xacNhanThuTien(
                        maHoaDon,
                        input,
                        authentication
                );

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(ketQua);
    }

    // =====================================================
    // LỖI NGHIỆP VỤ VÀ PHÂN QUYỀN
    // =====================================================

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> xuLyLoiNghiepVu(
            ResponseStatusException exception
    ) {
        String message = exception.getReason();

        if (message == null || message.isBlank()) {
            message = "Không thể xử lý thông tin viện phí.";
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
    // MÃ LỊCH KHÁM / HÓA ĐƠN KHÔNG ĐÚNG KIỂU
    // =====================================================

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> xuLySaiMa(
            MethodArgumentTypeMismatchException exception
    ) {
        return phanHoiLoi(
                HttpStatus.BAD_REQUEST,
                "Mã lịch khám hoặc hóa đơn không hợp lệ. "
                        + "Hãy chọn lại từ danh sách."
        );
    }

    // =====================================================
    // JSON KHÔNG HỢP LỆ
    // =====================================================

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> xuLySaiDuLieu(
            HttpMessageNotReadableException exception
    ) {
        return phanHoiLoi(
                HttpStatus.BAD_REQUEST,
                "Dữ liệu gửi lên không hợp lệ. "
                        + "Hãy kiểm tra số tiền và thông tin thanh toán."
        );
    }

    // =====================================================
    // XUNG ĐỘT KHI NHIỀU YÊU CẦU CÙNG XỬ LÝ
    // =====================================================

    @ExceptionHandler(ConcurrencyFailureException.class)
    public ResponseEntity<Map<String, Object>> xuLyXungDot(
            ConcurrencyFailureException exception
    ) {
        log.warn(
                "Xung đột khi xử lý viện phí",
                exception
        );

        return phanHoiLoi(
                HttpStatus.CONFLICT,
                "Dữ liệu đang được xử lý bởi yêu cầu khác. "
                        + "Hãy tải lại hóa đơn để kiểm tra "
                        + "trước khi xác nhận lại."
        );
    }

    // =====================================================
    // VI PHẠM RÀNG BUỘC DATABASE
    // =====================================================

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> xuLyRangBuoc(
            DataIntegrityViolationException exception
    ) {
        log.error(
                "Vi phạm ràng buộc khi xử lý viện phí",
                exception
        );

        return phanHoiLoi(
                HttpStatus.CONFLICT,
                "Không thể ghi nhận thanh toán do dữ liệu "
                        + "không đáp ứng ràng buộc database. "
                        + "Hãy tải lại hóa đơn và kiểm tra log máy chủ."
        );
    }

    // =====================================================
    // LỖI DATABASE KHÁC
    // =====================================================

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String, Object>> xuLyLoiDatabase(
            DataAccessException exception
    ) {
        log.error(
                "Không thể xử lý viện phí từ database",
                exception
        );

        return phanHoiLoi(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Không thể hoàn tất yêu cầu viện phí. "
                        + "Hãy tải lại hóa đơn và lịch sử thanh toán "
                        + "để kiểm tra kết quả trước khi thử lại."
        );
    }

    // =====================================================
    // PHẢN HỒI LỖI DÙNG CHUNG
    // =====================================================

    private ResponseEntity<Map<String, Object>> phanHoiLoi(
            HttpStatus status,
            String message
    ) {
        return ResponseEntity.status(status)
                .cacheControl(CacheControl.noStore())
                .body(
                        Map.of(
                                "success", false,
                                "message", message
                        )
                );
    }
}