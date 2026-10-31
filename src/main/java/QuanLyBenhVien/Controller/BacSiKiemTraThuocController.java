package QuanLyBenhVien.Controller;

import QuanLyBenhVien.Service.KhamBenhService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/bac-si/kham-benh/thuoc")
public class BacSiKiemTraThuocController {

    private final KhamBenhService khamBenhService;

    public BacSiKiemTraThuocController(
            KhamBenhService khamBenhService
    ) {
        this.khamBenhService = khamBenhService;
    }

    @GetMapping("/kiem-tra")
    public Map<String, Object> kiemTra(
            @RequestParam Integer maThuoc,
            @RequestParam Integer soLuong
    ) {
        return khamBenhService.kiemTraThuoc(
                maThuoc,
                soLuong
        );
    }
}