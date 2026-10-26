package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.TiepNhanTraCuuSoDienThoaiDTO;
import QuanLyBenhVien.Service.TiepNhanTraCuuSoDienThoaiService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tiepnhan/benh-nhan")
public class TiepNhanTraCuuSoDienThoaiController {

    private static final Logger logger =
            LoggerFactory.getLogger(
                    TiepNhanTraCuuSoDienThoaiController.class
            );

    private final TiepNhanTraCuuSoDienThoaiService service;

    public TiepNhanTraCuuSoDienThoaiController(
            TiepNhanTraCuuSoDienThoaiService service
    ) {
        this.service = service;
    }

    // GET /api/tiepnhan/benh-nhan/tra-cuu-so-dien-thoai
    //     ?soDienThoai=0901234567
    @GetMapping("/tra-cuu-so-dien-thoai")
    public ResponseEntity<List<TiepNhanTraCuuSoDienThoaiDTO>>
    traCuu(
            @RequestParam(
                    name = "soDienThoai",
                    defaultValue = ""
            )
            String soDienThoai,
            Authentication authentication
    ) {
        // Service kiểm tra tài khoản và ca trực trước khi truy vấn.
        List<TiepNhanTraCuuSoDienThoaiDTO> danhSach =
                service.traCuu(
                        soDienThoai,
                        authentication
                );

        return ResponseEntity
                .ok()
                .cacheControl(CacheControl.noStore())
                .body(danhSach);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>>
    xuLyLoiNghiepVu(
            ResponseStatusException exception
    ) {
        String thongBao = exception.getReason();

        if (thongBao == null || thongBao.isBlank()) {
            thongBao = "Không thể tra cứu hồ sơ bệnh nhân.";
        }

        return ResponseEntity
                .status(exception.getStatusCode())
                .cacheControl(CacheControl.noStore())
                .body(Map.<String, Object>of(
                        "success", false,
                        "message", thongBao
                ));
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String, Object>>
    xuLyLoiDatabase(
            DataAccessException exception
    ) {
        logger.error(
                "Lỗi database khi tra cứu hồ sơ bệnh nhân.",
                exception
        );

        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .cacheControl(CacheControl.noStore())
                .body(Map.<String, Object>of(
                        "success", false,
                        "message",
                        "Không thể tra cứu hồ sơ bệnh nhân. "
                                + "Vui lòng thử lại sau."
                ));
    }
}