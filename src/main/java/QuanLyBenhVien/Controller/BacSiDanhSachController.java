package QuanLyBenhVien.Controller;

import QuanLyBenhVien.Entity.BacSi;
import QuanLyBenhVien.Service.BacSiService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bac-si")
public class BacSiDanhSachController {

    private final BacSiService bacSiService;

    public BacSiDanhSachController(BacSiService bacSiService) {
        this.bacSiService = bacSiService;
    }

    // =========================================================
    // LẤY DANH SÁCH BÁC SĨ HOẠT ĐỘNG
    // =========================================================
    @GetMapping("/danh-sach")
    public ResponseEntity<List<BacSi>> layDanhSachBacSi() {

        List<BacSi> danhSach =
                bacSiService.layDanhSachBacSiHoatDong();

        return ResponseEntity.ok(danhSach);
    }
}