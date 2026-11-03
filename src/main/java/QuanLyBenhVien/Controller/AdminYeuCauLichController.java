package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.XuLyYeuCauLichRequest;
import QuanLyBenhVien.Entity.YeuCauDieuChinhLich;
import QuanLyBenhVien.Security.CustomUserDetails;
import QuanLyBenhVien.Service.YeuCauDieuChinhLichService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/yeu-cau-lich")
public class AdminYeuCauLichController {

    private final YeuCauDieuChinhLichService yeuCauService;

    public AdminYeuCauLichController(
            YeuCauDieuChinhLichService yeuCauService) {
        this.yeuCauService = yeuCauService;
    }

    @GetMapping
    public ResponseEntity<?> layDanhSach(
            @RequestParam(required = false) String trangThai) {

        List<Map<String, Object>> result =
                yeuCauService.adminLayYeuCau(trangThai)
                        .stream()
                        .map(this::toResponse)
                        .toList();

        return ResponseEntity.ok(result);
    }

    @PutMapping("/{maYeuCau}/duyet")
    public ResponseEntity<?> duyet(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Integer maYeuCau,
            @RequestBody(required = false) XuLyYeuCauLichRequest request) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Vui lòng đăng nhập."));
        }

        try {
            Integer maNguoiXuLy =
                    userDetails.getNguoiDung().getMaNguoiDung();

            if (request == null) {
                request = new XuLyYeuCauLichRequest();
            }

            YeuCauDieuChinhLich yc = yeuCauService.adminDuyet(
                    maYeuCau,
                    maNguoiXuLy,
                    request.getMaBacSiMoi(),
                    request.getGhiChuXuLy());

            return ResponseEntity.ok(toResponse(yc));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{maYeuCau}/tu-choi")
    public ResponseEntity<?> tuChoi(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Integer maYeuCau,
            @RequestBody XuLyYeuCauLichRequest request) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Vui lòng đăng nhập."));
        }

        try {
            Integer maNguoiXuLy =
                    userDetails.getNguoiDung().getMaNguoiDung();

            YeuCauDieuChinhLich yc = yeuCauService.adminTuChoi(
                    maYeuCau,
                    maNguoiXuLy,
                    request != null ? request.getGhiChuXuLy() : null);

            return ResponseEntity.ok(toResponse(yc));

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
        item.put("maBacSi",
                yc.getBacSi() != null ? yc.getBacSi().getMaBacSi() : null);
        item.put("hoTenBacSi",
                yc.getBacSi() != null
                        && yc.getBacSi().getNguoiDung() != null
                        ? yc.getBacSi().getNguoiDung().getHoTen()
                        : null);
        item.put("loaiYeuCau", yc.getLoaiYeuCau());
        item.put("lyDo", yc.getLyDo());
        item.put("trangThai", yc.getTrangThai());
        item.put("ngayTao", yc.getNgayTao());
        item.put("ngayXuLy", yc.getNgayXuLy());
        item.put("ghiChuXuLy", yc.getGhiChuXuLy());

        item.put("ngayLamViecCu",
                yc.getLichLamViec() != null
                        ? yc.getLichLamViec().getNgayLamViec()
                        : null);
        item.put("gioBatDauCu",
                yc.getLichLamViec() != null
                        ? yc.getLichLamViec().getGioBatDau()
                        : null);
        item.put("gioKetThucCu",
                yc.getLichLamViec() != null
                        ? yc.getLichLamViec().getGioKetThuc()
                        : null);

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