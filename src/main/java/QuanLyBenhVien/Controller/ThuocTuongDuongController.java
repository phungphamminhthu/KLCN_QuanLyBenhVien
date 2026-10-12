package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.ThuocTuongDuongRequest;
import QuanLyBenhVien.DTO.ThuocTuongDuongResponse;
import QuanLyBenhVien.Entity.ThuocTuongDuong;
import QuanLyBenhVien.Service.ThuocTuongDuongService;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/thuoc-tuong-duong")
public class ThuocTuongDuongController {

    private final ThuocTuongDuongService service;


    public ThuocTuongDuongController(
            ThuocTuongDuongService service) {

        this.service = service;
    }


    @GetMapping
    public ResponseEntity<Page<ThuocTuongDuongResponse>>
    getAll(

            @RequestParam(
                    defaultValue = ""
            )
            String keyword,

            @RequestParam(
                    defaultValue = "0"
            )
            int page,

            @RequestParam(
                    defaultValue = "10"
            )
            int size) {

        return ResponseEntity.ok(
                service.getAll(
                        keyword,
                        page,
                        size
                )
        );
    }


    @GetMapping("/{id}")
    public ResponseEntity<ThuocTuongDuong>
    getById(
            @PathVariable Integer id) {

        return ResponseEntity.ok(
                service.getById(id)
        );
    }


    @PostMapping
    public ResponseEntity<ThuocTuongDuong>
    create(
            @RequestBody
            ThuocTuongDuongRequest request) {

        return ResponseEntity.ok(
                service.create(request)
        );
    }


    @PutMapping("/{id}")
    public ResponseEntity<ThuocTuongDuong>
    update(
            @PathVariable Integer id,

            @RequestBody
            ThuocTuongDuongRequest request) {

        return ResponseEntity.ok(
                service.update(
                        id,
                        request
                )
        );
    }


    @DeleteMapping("/{id}")
    public ResponseEntity<Void>
    delete(
            @PathVariable Integer id) {

        service.delete(id);

        return ResponseEntity
                .noContent()
                .build();
    }
}