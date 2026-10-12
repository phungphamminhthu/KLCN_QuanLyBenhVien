package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.ThuocRequest;
import QuanLyBenhVien.DTO.ThuocResponse;
import QuanLyBenhVien.Service.ThuocService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/medicines")
public class ThuocController {

    private final ThuocService thuocService;


    public ThuocController(
            ThuocService thuocService) {

        this.thuocService = thuocService;
    }


    // =========================
    // GET ALL
    // GET /api/medicines
    // =========================

    @GetMapping
    public ResponseEntity<List<ThuocResponse>> getAll() {

        return ResponseEntity.ok(
                thuocService.getAll()
        );
    }


    // =========================
    // GET BY ID
    // GET /api/medicines/{id}
    // =========================

    @GetMapping("/{id}")
    public ResponseEntity<ThuocResponse> getById(
            @PathVariable Integer id) {

        return ResponseEntity.ok(
                thuocService.getById(id)
        );
    }


    // =========================
    // CREATE
    // POST /api/medicines
    // =========================

    @PostMapping
    public ResponseEntity<ThuocResponse> create(
            @RequestBody ThuocRequest request) {

        return ResponseEntity.ok(
                thuocService.create(request)
        );
    }


    // =========================
    // UPDATE
    // PUT /api/medicines/{id}
    // =========================

    @PutMapping("/{id}")
    public ResponseEntity<ThuocResponse> update(
            @PathVariable Integer id,
            @RequestBody ThuocRequest request) {

        return ResponseEntity.ok(
                thuocService.update(id, request)
        );
    }


    // =========================
    // DELETE
    // DELETE /api/medicines/{id}
    // =========================

//    @DeleteMapping("/{id}")
//    public ResponseEntity<?> delete(
//            @PathVariable Integer id) {
//
//        thuocService.delete(id);
//
//        return ResponseEntity.ok(
//                "Xóa thuốc thành công."
//        );
//    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Integer id) {

        String message = thuocService.delete(id);

        return ResponseEntity.ok(message);
    }
}
