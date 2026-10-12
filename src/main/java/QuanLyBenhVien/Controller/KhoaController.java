package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.KhoaRequest;
import QuanLyBenhVien.DTO.KhoaResponse;
import QuanLyBenhVien.Service.KhoaService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/khoa")
public class KhoaController {

    private final KhoaService khoaService;

    public KhoaController(KhoaService khoaService) {
        this.khoaService = khoaService;
    }

    // =====================================================
    // GET ALL
    // =====================================================

    @GetMapping
    public ResponseEntity<List<KhoaResponse>> getAll() {

        return ResponseEntity.ok(
                khoaService.getAll()
        );
    }

    // =====================================================
    // GET BY ID
    // =====================================================

    @GetMapping("/{id}")
    public ResponseEntity<KhoaResponse> getById(
            @PathVariable Integer id
    ) {

        return ResponseEntity.ok(
                khoaService.getById(id)
        );
    }

    // =====================================================
    // CREATE
    // =====================================================

    @PostMapping
    public ResponseEntity<KhoaResponse> create(
            @RequestBody KhoaRequest request,
            HttpServletRequest httpRequest
    ) {

        return ResponseEntity.ok(
                khoaService.create(
                        request,
                        httpRequest
                )
        );
    }

    // =====================================================
    // UPDATE
    // =====================================================

    @PutMapping("/{id}")
    public ResponseEntity<KhoaResponse> update(
            @PathVariable Integer id,
            @RequestBody KhoaRequest request,
            HttpServletRequest httpRequest
    ) {

        return ResponseEntity.ok(
                khoaService.update(
                        id,
                        request,
                        httpRequest
                )
        );
    }

    // =====================================================
    // DELETE
    // =====================================================

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(
            @PathVariable Integer id,
            HttpServletRequest httpRequest
    ) {

        khoaService.delete(
                id,
                httpRequest
        );

        return ResponseEntity.ok(
                "Xóa khoa thành công."
        );
    }
}