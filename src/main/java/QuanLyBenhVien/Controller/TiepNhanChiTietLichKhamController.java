package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.TiepNhanChiTietLichKhamDTO;
import QuanLyBenhVien.Service.TiepNhanChiTietLichKhamService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.dao.DataAccessException;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/tiepnhan/chi-tiet-lich-kham")
public class TiepNhanChiTietLichKhamController {

    private static final Logger logger =
            LoggerFactory.getLogger(
                    TiepNhanChiTietLichKhamController.class
            );

    private final TiepNhanChiTietLichKhamService chiTietService;

    public TiepNhanChiTietLichKhamController(
            TiepNhanChiTietLichKhamService chiTietService
    ) {
        this.chiTietService = chiTietService;
    }

    // =====================================================
    // LẤY CHI TIẾT LỊCH KHÁM
    //
    // GET /api/tiepnhan/chi-tiet-lich-kham/{maBenhNhan}/{maLichKham}
    // =====================================================

    @GetMapping("/{maBenhNhan}/{maLichKham}")
    public ResponseEntity<TiepNhanChiTietLichKhamDTO> layChiTiet(
            @PathVariable("maBenhNhan") Integer maBenhNhan,
            @PathVariable("maLichKham") Integer maLichKham,
            Authentication authentication
    ) {
        /*
         * Service kiểm tra:
         * - Tài khoản và ca trực.
         * - Lịch khám thuộc khoa được phân công.
         * - Lịch khám thuộc đúng bệnh nhân.
         */
        TiepNhanChiTietLichKhamDTO ketQua =
                chiTietService.layChiTiet(
                        maBenhNhan,
                        maLichKham,
                        authentication
                );

        return ResponseEntity
                .ok()
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
            message = "Không thể tải chi tiết lịch khám.";
        }

        return ResponseEntity
                .status(exception.getStatusCode())
                .cacheControl(CacheControl.noStore())
                .body(Map.of(
                        "success", false,
                        "message", message
                ));
    }

    // =====================================================
    // LỖI TRUY VẤN DATABASE
    // =====================================================

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String, Object>> xuLyLoiDatabase(
            DataAccessException exception
    ) {
        logger.error(
                "Lỗi truy vấn chi tiết lịch khám.",
                exception
        );

        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .cacheControl(CacheControl.noStore())
                .body(Map.of(
                        "success", false,
                        "message",
                        "Không thể tải chi tiết lịch khám. "
                                + "Vui lòng thử lại hoặc kiểm tra log máy chủ."
                ));
    }
}