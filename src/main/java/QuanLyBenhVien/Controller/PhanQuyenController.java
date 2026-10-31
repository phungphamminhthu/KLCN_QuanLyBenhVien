package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.CapNhatPhanQuyenRequest;
import QuanLyBenhVien.Service.PhanQuyenService;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

import java.util.Map;

@Controller
@RequestMapping("/api/phan-quyen")
public class PhanQuyenController {

    private final PhanQuyenService phanQuyenService;

    public PhanQuyenController(PhanQuyenService phanQuyenService) {
        this.phanQuyenService = phanQuyenService;
    }

    // Lấy danh sách vai trò
    @GetMapping("/vai-tro")
    @ResponseBody
    public ResponseEntity<?> layDanhSachVaiTro() {
        return ResponseEntity.ok(
                phanQuyenService.layDanhSachVaiTro()
        );
    }

    // Lấy danh sách tất cả quyền
    @GetMapping("/quyen")
    @ResponseBody
    public ResponseEntity<?> layDanhSachQuyen() {
        return ResponseEntity.ok(
                phanQuyenService.layDanhSachQuyen()
        );
    }

    // Lấy quyền của một vai trò
    @GetMapping("/{MaVaiTro}/quyen")
    @ResponseBody
    public ResponseEntity<?> layQuyenTheoVaiTro(
            @PathVariable Integer MaVaiTro
    ) {
        return ResponseEntity.ok(
                phanQuyenService.layQuyenTheoVaiTro(MaVaiTro)
        );
    }

    // Cập nhật phân quyền
    @PostMapping("/{MaVaiTro}/luu")
    @ResponseBody
    public ResponseEntity<?> luuPhanQuyen(
            @PathVariable Integer MaVaiTro,
            @RequestBody CapNhatPhanQuyenRequest request
    ) {
        phanQuyenService.capNhatPhanQuyen(
                MaVaiTro,
                request.getDanhSachQuyen()
        );

        return ResponseEntity.ok(
                Map.of("message", "Lưu phân quyền thành công")
        );
    }
}