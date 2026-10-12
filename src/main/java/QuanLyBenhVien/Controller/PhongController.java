package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.PhongRequest;
import QuanLyBenhVien.DTO.PhongResponse;
import QuanLyBenhVien.Service.PhongService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/phong")
public class PhongController {

    private final PhongService phongService;


    public PhongController(
            PhongService phongService
    ) {

        this.phongService =
                phongService;

    }


    // =========================
    // GET ALL
    // =========================

    @GetMapping
    public ResponseEntity<List<PhongResponse>> getAll() {

        return ResponseEntity.ok(
                phongService.getAll()
        );

    }


    // =========================
    // GET BY ID
    // =========================

    @GetMapping("/{id}")
    public ResponseEntity<PhongResponse> getById(
            @PathVariable Integer id
    ) {

        return ResponseEntity.ok(
                phongService.getById(id)
        );

    }


    // =========================
    // CREATE
    // =========================

    @PostMapping
    public ResponseEntity<PhongResponse> create(
            @RequestBody PhongRequest request
    ) {

        return ResponseEntity.ok(
                phongService.create(request)
        );

    }


    // =========================
    // UPDATE
    // =========================

    @PutMapping("/{id}")
    public ResponseEntity<PhongResponse> update(
            @PathVariable Integer id,
            @RequestBody PhongRequest request
    ) {

        return ResponseEntity.ok(
                phongService.update(
                        id,
                        request
                )
        );

    }


    // =========================
    // DELETE
    // =========================

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(
            @PathVariable Integer id
    ) {

        phongService.delete(id);

        return ResponseEntity.ok(
                "Xóa phòng thành công."
        );

    }
}
