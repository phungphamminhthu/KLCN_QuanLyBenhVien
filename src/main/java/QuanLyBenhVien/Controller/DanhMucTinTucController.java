package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.DanhMucTinTucRequest;
import QuanLyBenhVien.Entity.DanhMucTinTuc;
import QuanLyBenhVien.Service.DanhMucTinTucService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/danh-muc-tin-tuc")
public class DanhMucTinTucController {

    private final DanhMucTinTucService service;

    public DanhMucTinTucController(
            DanhMucTinTucService service) {

        this.service = service;
    }

    // GET /api/danh-muc-tin-tuc
    @GetMapping
    public ResponseEntity<List<DanhMucTinTuc>> getAll() {

        return ResponseEntity.ok(
                service.getAll()
        );
    }

    // GET /api/danh-muc-tin-tuc/1
    @GetMapping("/{id}")
    public ResponseEntity<DanhMucTinTuc> getById(
            @PathVariable Integer id) {

        return ResponseEntity.ok(
                service.getById(id)
        );
    }

    // POST /api/danh-muc-tin-tuc
    @PostMapping
    public ResponseEntity<DanhMucTinTuc> create(
            @RequestBody DanhMucTinTucRequest request) {

        return ResponseEntity.ok(
                service.create(request)
        );
    }

    // PUT /api/danh-muc-tin-tuc/1
    @PutMapping("/{id}")
    public ResponseEntity<DanhMucTinTuc> update(
            @PathVariable Integer id,
            @RequestBody DanhMucTinTucRequest request) {

        return ResponseEntity.ok(
                service.update(id, request)
        );
    }

    // DELETE /api/danh-muc-tin-tuc/1
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(
            @PathVariable Integer id) {

        service.delete(id);

        return ResponseEntity.ok(
                "Xóa danh mục thành công."
        );
    }
}
