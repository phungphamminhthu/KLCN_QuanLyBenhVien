
package QuanLyBenhVien.Controller;

import QuanLyBenhVien.Entity.DichVuYTe;
import QuanLyBenhVien.Repository.DichVuYTeRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/dich-vu-y-te")
public class DichVuYTeApiController {

    private final DichVuYTeRepository dichVuYTeRepository;

    public DichVuYTeApiController(
            DichVuYTeRepository dichVuYTeRepository) {
        this.dichVuYTeRepository = dichVuYTeRepository;
    }

    // Lấy danh sách tất cả dịch vụ y tế
    @GetMapping
    public ResponseEntity<List<DichVuYTe>> getAll() {
        List<DichVuYTe> danhSach =
                dichVuYTeRepository.findAll();

        return ResponseEntity.ok(danhSach);
    }

    // Lấy thông tin một dịch vụ theo mã
    @GetMapping("/{id}")
    public ResponseEntity<DichVuYTe> getById(
            @PathVariable Integer id) {

        return dichVuYTeRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
