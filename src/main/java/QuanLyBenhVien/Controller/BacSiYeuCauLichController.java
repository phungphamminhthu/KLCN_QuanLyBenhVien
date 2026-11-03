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
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bac-si/yeu-cau-lich")
public class BacSiYeuCauLichController {

    private final BacSiService bacSiService;
    private final YeuCauDieuChinhLichService yeuCauService;

    public BacSiYeuCauLichController(
            BacSiService bacSiService,
            YeuCauDieuChinhLichService yeuCauService) {
        this.bacSiService = bacSiService;
        this.yeuCauService = yeuCauService;
    }

    @PostMapping("/{maLich}")
    public ResponseEntity<?> taoYeuCau(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Integer maLich,
            @RequestBody YeuCauDieuChinhRequest request) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Vui lòng đăng nhập."));
        }

        try {
            Integer maNguoiDung =
                    userDetails.getNguoiDung().getMaNguoiDung();

            BacSi bacSi = bacSiService
                    .timBacSiTheoMaNguoiDung(maNguoiDung)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Không tìm thấy hồ sơ bác sĩ."));

            YeuCauDieuChinhLich yc = yeuCauService.taoYeuCau(
                    bacSi.getMaBacSi(), maLich, request);

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(toResponse(yc));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> layYeuCauCuaToi(
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Vui lòng đăng nhập."));
        }

        try {
            Integer maNguoiDung =
                    userDetails.getNguoiDung().getMaNguoiDung();

            BacSi bacSi = bacSiService
                    .timBacSiTheoMaNguoiDung(maNguoiDung)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Không tìm thấy hồ sơ bác sĩ."));

            List<Map<String, Object>> result =
                    yeuCauService.layYeuCauCuaBacSi(bacSi.getMaBacSi())
                            .stream()
                            .map(this::toResponse)
                            .toList();

            return ResponseEntity.ok(result);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    private Map<String, Object> toResponse(YeuCauDieuChinhLich yc) {
        Map<String, Object> item = new LinkedHashMap<>();

        item.put("maYeuCau", yc.getMaYeuCau());
        item.put("maLichLamViec",
                yc.getLichLamViec() != null
                        ? yc.getLichLamViec().getMaLichLamViec()
                        : null);
        item.put("loaiYeuCau", yc.getLoaiYeuCau());
        item.put("lyDo", yc.getLyDo());
        item.put("trangThai", yc.getTrangThai());
        item.put("ngayTao", yc.getNgayTao());
        item.put("ngayXuLy", yc.getNgayXuLy());
        item.put("ghiChuXuLy", yc.getGhiChuXuLy());
        item.put("ngayLamViecMoi", yc.getNgayLamViecMoi());
        item.put("gioBatDauMoi", yc.getGioBatDauMoi());
        item.put("gioKetThucMoi", yc.getGioKetThucMoi());
        item.put("maPhongMoi",
                yc.getPhongMoi() != null
                        ? yc.getPhongMoi().getMaPhong()
                        : null);
        item.put("noiDungDieuPhoi", yc.getNoiDungDieuPhoi());

        return item;
    }
}