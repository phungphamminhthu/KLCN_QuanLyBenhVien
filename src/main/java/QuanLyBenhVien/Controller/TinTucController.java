package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.TinTucRequest;
import QuanLyBenhVien.DTO.TinTucResponse;
import QuanLyBenhVien.Service.TinTucService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tin-tuc")
public class TinTucController {

    private final TinTucService tinTucService;


    public TinTucController(
            TinTucService tinTucService
    ) {
        this.tinTucService = tinTucService;
    }


    // =====================================================
    // LẤY TẤT CẢ TIN TỨC
    // =====================================================

    @GetMapping
    public ResponseEntity<List<TinTucResponse>> getAll() {

        return ResponseEntity.ok(
                tinTucService.getAll()
        );
    }


    // =====================================================
    // LẤY TIN TỨC THEO ID
    // =====================================================

    @GetMapping("/{id}")
    public ResponseEntity<TinTucResponse> getById(
            @PathVariable Integer id
    ) {

        return ResponseEntity.ok(
                tinTucService.getById(id)
        );
    }


    // =====================================================
    // THÊM TIN TỨC
    // POST /api/tin-tuc
    // =====================================================

    @PostMapping
    public ResponseEntity<TinTucResponse> create(
            @RequestBody TinTucRequest request,
            HttpServletRequest httpRequest
    ) {

        return ResponseEntity.ok(
                tinTucService.create(
                        request,
                        httpRequest
                )
        );
    }


    // =====================================================
    // SỬA TIN TỨC
    // PUT /api/tin-tuc/{id}
    // =====================================================

    @PutMapping("/{id}")
    public ResponseEntity<TinTucResponse> update(
            @PathVariable Integer id,
            @RequestBody TinTucRequest request,
            HttpServletRequest httpRequest
    ) {

        return ResponseEntity.ok(
                tinTucService.update(
                        id,
                        request,
                        httpRequest
                )
        );
    }


    // =====================================================
    // XÓA TIN TỨC
    // DELETE /api/tin-tuc/{id}
    // =====================================================

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(
            @PathVariable Integer id,
            HttpServletRequest httpRequest
    ) {

        tinTucService.delete(
                id,
                httpRequest
        );

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Xóa tin tức thành công."
                )
        );
    }
}