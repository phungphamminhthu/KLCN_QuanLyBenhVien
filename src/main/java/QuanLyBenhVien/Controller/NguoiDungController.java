package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.UserRequest;
import QuanLyBenhVien.DTO.UserResponse;
import QuanLyBenhVien.Service.NguoiDungService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

import QuanLyBenhVien.DTO.ChangePasswordRequest;
@RestController
@RequestMapping("/api/users")
public class NguoiDungController {

    private final NguoiDungService nguoiDungService;


    public NguoiDungController(
            NguoiDungService nguoiDungService) {

        this.nguoiDungService =
                nguoiDungService;
    }


    // =====================================================
    // GET /api/users
    // =====================================================

    @GetMapping
    public ResponseEntity<List<UserResponse>> getAll() {

        return ResponseEntity.ok(
                nguoiDungService.getAll()
        );
    }


    // =====================================================
    // GET /api/users/{id}
    // =====================================================

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getById(
            @PathVariable Integer id) {

        return ResponseEntity.ok(
                nguoiDungService.getById(id)
        );
    }


    // =====================================================
    // POST /api/users
    // =====================================================

    @PostMapping
    public ResponseEntity<UserResponse> create(
            @RequestBody UserRequest request,
            HttpServletRequest httpRequest
    ) {

        return ResponseEntity.ok(
                nguoiDungService.create(
                        request,
                        httpRequest
                )
        );
    }


    // =====================================================
    // PUT /api/users/{id}
    // =====================================================

    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> update(
            @PathVariable Integer id,
            @RequestBody UserRequest request,
            HttpServletRequest httpRequest
    ) {

        return ResponseEntity.ok(
                nguoiDungService.update(
                        id,
                        request,
                        httpRequest
                )
        );
    }


    // =====================================================
    // DELETE /api/users/{id}
    // =====================================================

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Integer id,
            HttpServletRequest httpRequest
    ) {

        nguoiDungService.delete(
                id,
                httpRequest
        );

        return ResponseEntity.noContent().build();
    }

    // =====================================================
    // CHANGE PASSWORD
    // =====================================================

//    @PutMapping("/{id}/change-password")
//    public ResponseEntity<?> changePassword(
//            @PathVariable Integer id,
//            @RequestBody ChangePasswordRequest request) {
//
//        nguoiDungService.changePassword(
//                id,
//                request.getMatKhauCu(),
//                request.getMatKhauMoi()
//        );
//
//        return ResponseEntity.ok(
//                "Đổi mật khẩu thành công"
//        );
//    }
@PutMapping("/{id}/change-password")
public ResponseEntity<?> changePassword(
        @PathVariable Integer id,
        @RequestBody ChangePasswordRequest request,
        HttpServletRequest httpRequest) {

    try {
        nguoiDungService.changePassword(
                id,
                request.getMatKhauCu(),
                request.getMatKhauMoi(),
                httpRequest
        );

        return ResponseEntity.ok(
                Map.of("message", "Đổi mật khẩu thành công.")
        );

    } catch (RuntimeException e) {
        return ResponseEntity.badRequest().body(
                Map.of("message", e.getMessage())
        );
    }
}
}
