package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.XuLyYeuCauLichDTO;
import QuanLyBenhVien.Entity.YeuCauDieuChinhLich;
import QuanLyBenhVien.Service.YeuCauDieuChinhLichAdminService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/yeu-cau-dieu-chinh-lich")
public class YeuCauDieuChinhLichAdminApiController {

    private final YeuCauDieuChinhLichAdminService service;

    public YeuCauDieuChinhLichAdminApiController(
            YeuCauDieuChinhLichAdminService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<?> layDanhSach(
            @RequestParam(required = false) String trangThai) {
        try {
            List<YeuCauDieuChinhLich> danhSach =
                    service.layDanhSach(trangThai);

            return ResponseEntity.ok(danhSach);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Không thể tải danh sách yêu cầu."));
        }
    }

    @GetMapping("/{maYeuCau}")
    public ResponseEntity<?> layChiTiet(@PathVariable Integer maYeuCau) {
        try {
            return ResponseEntity.ok(service.layChiTiet(maYeuCau));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{maYeuCau}/xu-ly")
    public ResponseEntity<?> xuLy(
            @PathVariable Integer maYeuCau,
            @RequestBody XuLyYeuCauLichDTO request) {
        try {
            YeuCauDieuChinhLich result = service.xuLy(maYeuCau, request);

            return ResponseEntity.ok(Map.of(
                    "message", "Đã xử lý yêu cầu thành công.",
                    "maYeuCau", result.getMaYeuCau(),
                    "trangThai", result.getTrangThai()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", e.getMessage()));
        }
    }
}