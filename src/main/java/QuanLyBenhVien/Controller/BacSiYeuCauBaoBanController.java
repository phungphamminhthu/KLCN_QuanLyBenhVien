package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.YeuCauDieuChinhRequest;
import QuanLyBenhVien.Entity.BacSi;
import QuanLyBenhVien.Entity.YeuCauDieuChinhLich;
import QuanLyBenhVien.Security.CustomUserDetails;
import QuanLyBenhVien.Service.BacSiService;
import QuanLyBenhVien.Service.YeuCauDieuChinhLichService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/bac-si/lich-lam-viec")
public class BacSiYeuCauBaoBanController {

    private final BacSiService bacSiService;
    private final YeuCauDieuChinhLichService yeuCauService;

    public BacSiYeuCauBaoBanController(
            BacSiService bacSiService,
            YeuCauDieuChinhLichService yeuCauService) {
        this.bacSiService = bacSiService;
        this.yeuCauService = yeuCauService;
    }

    @PostMapping("/{maLich}/yeu-cau")
    public ResponseEntity<?> guiYeuCau(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Integer maLich,
            @RequestBody YeuCauDieuChinhRequest request) {

        if (userDetails == null || userDetails.getNguoiDung() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Vui lòng đăng nhập để gửi yêu cầu."));
        }

        try {
            Integer maNguoiDung =
                    userDetails.getNguoiDung().getMaNguoiDung();

            BacSi bacSi = bacSiService
                    .timBacSiTheoMaNguoiDung(maNguoiDung)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Không tìm thấy hồ sơ bác sĩ."));

            YeuCauDieuChinhLich yeuCau = yeuCauService.taoYeuCau(
                    bacSi.getMaBacSi(),
                    maLich,
                    request
            );

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("message", "Đã gửi yêu cầu. Vui lòng chờ Admin xử lý.");
            response.put("maYeuCau", yeuCau.getMaYeuCau());
            response.put("maLichLamViec",
                    yeuCau.getLichLamViec() != null
                            ? yeuCau.getLichLamViec().getMaLichLamViec()
                            : null);
            response.put("loaiYeuCau", yeuCau.getLoaiYeuCau());
            response.put("trangThai", yeuCau.getTrangThai());
            response.put("ngayTao", yeuCau.getNgayTao());

            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }
}