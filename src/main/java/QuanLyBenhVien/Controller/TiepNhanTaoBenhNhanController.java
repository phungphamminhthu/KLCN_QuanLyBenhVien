package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.TiepNhanTaoBenhNhanDTO;
import QuanLyBenhVien.Service.TiepNhanTaoBenhNhanService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/tiepnhan/benh-nhan")
public class TiepNhanTaoBenhNhanController {

    private static final Logger logger =
            LoggerFactory.getLogger(
                    TiepNhanTaoBenhNhanController.class
            );

    private final TiepNhanTaoBenhNhanService service;

    public TiepNhanTaoBenhNhanController(
            TiepNhanTaoBenhNhanService service
    ) {
        this.service = service;
    }

    // =====================================================
    // TẠO HỒ SƠ BỆNH NHÂN TẠI QUẦY
    // POST /api/tiepnhan/benh-nhan
    //
    // API tra cứu số điện thoại được quản lý riêng tại
    // TiepNhanTraCuuSoDienThoaiController.
    // =====================================================

    @PostMapping
    public ResponseEntity<Map<String, Object>> taoBenhNhan(
            @RequestBody TiepNhanTaoBenhNhanDTO dto,
            Authentication authentication
    ) {
        kiemTraQuyen(authentication);

        Integer maBenhNhan = service.taoBenhNhan(dto);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .cacheControl(CacheControl.noStore())
                .body(Map.<String, Object>of(
                        "success", true,
                        "message",
                        "Tạo hồ sơ bệnh nhân thành công.",
                        "maBenhNhan", maBenhNhan
                ));
    }

    // =====================================================
    // KIỂM TRA ĐĂNG NHẬP VÀ VAI TRÒ
    // =====================================================

    private void kiemTraQuyen(
            Authentication authentication
    ) {
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication
                instanceof AnonymousAuthenticationToken) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Vui lòng đăng nhập để tiếp tục."
            );
        }

        boolean laNhanVienTiepNhan =
                authentication.getAuthorities()
                        .stream()
                        .anyMatch(authority ->
                                "ROLE_TIEPNHAN".equals(
                                        authority.getAuthority()
                                )
                        );

        if (!laNhanVienTiepNhan) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Bạn không có quyền tạo hồ sơ "
                            + "bệnh nhân tại quầy."
            );
        }
    }

    // =====================================================
    // XỬ LÝ LỖI NGHIỆP VỤ
    // =====================================================

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>>
    xuLyLoiNghiepVu(
            ResponseStatusException exception
    ) {
        String thongBao = exception.getReason();

        if (thongBao == null || thongBao.isBlank()) {
            thongBao = "Không thể tạo hồ sơ bệnh nhân.";
        }

        return ResponseEntity
                .status(exception.getStatusCode())
                .cacheControl(CacheControl.noStore())
                .body(Map.<String, Object>of(
                        "success", false,
                        "message", thongBao
                ));
    }

    // =====================================================
    // XỬ LÝ LỖI DATABASE
    // =====================================================

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String, Object>>
    xuLyLoiDatabase(
            DataAccessException exception
    ) {
        logger.error(
                "Lỗi database khi tạo hồ sơ bệnh nhân tại quầy.",
                exception
        );

        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .cacheControl(CacheControl.noStore())
                .body(Map.<String, Object>of(
                        "success", false,
                        "message",
                        "Không thể lưu hồ sơ bệnh nhân. "
                                + "Vui lòng thử lại sau."
                ));
    }
}