package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.CapNhatPhanQuyenRequest;
import QuanLyBenhVien.Service.PhanQuyenService;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

@Controller
@RequestMapping("/api/phan-quyen")
public class PhanQuyenController {

    private final PhanQuyenService PhanQuyenService;

    public PhanQuyenController(PhanQuyenService PhanQuyenService) {
        this.PhanQuyenService = PhanQuyenService;
    }

    @GetMapping("/{MaVaiTro}/quyen")
    @ResponseBody
    public ResponseEntity<?> layQuyenTheoVaiTro(
            @PathVariable Integer MaVaiTro
    ) {
        return ResponseEntity.ok(
                PhanQuyenService.layQuyenTheoVaiTro(MaVaiTro)
        );
    }

    @PostMapping("/{MaVaiTro}/luu")
    @ResponseBody
    public ResponseEntity<?> luuPhanQuyen(
            @PathVariable Integer MaVaiTro,
            @RequestBody CapNhatPhanQuyenRequest Request
    ) {
        PhanQuyenService.capNhatPhanQuyen(
                MaVaiTro,
                Request.getDanhSachQuyen()
        );

        return ResponseEntity.ok(
                java.util.Map.of(
                        "message",
                        "Lưu phân quyền thành công"
                )
        );
    }
}