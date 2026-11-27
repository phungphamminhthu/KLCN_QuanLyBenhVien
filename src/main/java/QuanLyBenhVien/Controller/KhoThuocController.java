package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.KhoThuocRequest;
import QuanLyBenhVien.DTO.KhoThuocResponse;
import QuanLyBenhVien.Service.KhoThuocService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/kho-thuoc")
public class KhoThuocController {

    private final KhoThuocService khoThuocService;

    public KhoThuocController(KhoThuocService khoThuocService) {
        this.khoThuocService = khoThuocService;
    }

    // =====================================================
    // GET ALL
    // =====================================================

    @GetMapping
    public ResponseEntity<List<KhoThuocResponse>> getAll() {

        debugAuthentication("GET /api/kho-thuoc");

        return ResponseEntity.ok(
                khoThuocService.getAll()
        );
    }


    // =====================================================
    // GET BY ID
    // =====================================================

    @GetMapping("/{id}")
    public ResponseEntity<KhoThuocResponse> getById(
            @PathVariable Integer id
    ) {

        debugAuthentication(
                "GET /api/kho-thuoc/" + id
        );

        return ResponseEntity.ok(
                khoThuocService.getById(id)
        );
    }


    // =====================================================
    // CREATE - NHẬP KHO
    // =====================================================

    @PostMapping
    public ResponseEntity<KhoThuocResponse> create(
            @RequestBody KhoThuocRequest request
    ) {

        debugAuthentication("POST /api/kho-thuoc");

        return ResponseEntity.ok(
                khoThuocService.create(request)
        );
    }


    // =====================================================
    // UPDATE
    // =====================================================

    @PutMapping("/{id}")
    public ResponseEntity<KhoThuocResponse> update(
            @PathVariable Integer id,
            @RequestBody KhoThuocRequest request
    ) {

        debugAuthentication(
                "PUT /api/kho-thuoc/" + id
        );

        return ResponseEntity.ok(
                khoThuocService.update(id, request)
        );
    }


    // =====================================================
    // DELETE
    // =====================================================

    @DeleteMapping("/{id}")
    public ResponseEntity<String> delete(
            @PathVariable Integer id
    ) {

        debugAuthentication(
                "DELETE /api/kho-thuoc/" + id
        );

        khoThuocService.delete(id);

        return ResponseEntity.ok(
                "Đã xóa kho thuốc thành công."
        );
    }


    // =====================================================
    // DEBUG AUTHENTICATION
    // =====================================================

    private void debugAuthentication(String requestName) {

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        System.out.println();
        System.out.println("======================================");
        System.out.println("KHO THUỐC - SECURITY DEBUG");
        System.out.println("Request: " + requestName);

        if (authentication == null) {

            System.out.println(
                    "Authentication: NULL"
            );

        } else {

            System.out.println(
                    "Username: "
                            + authentication.getName()
            );

            System.out.println(
                    "Authorities: "
                            + authentication.getAuthorities()
            );

            System.out.println(
                    "Authenticated: "
                            + authentication.isAuthenticated()
            );
        }

        System.out.println("======================================");
        System.out.println();
    }

    // =====================================================
    // THÔNG BÁO SAU KHI XUẤT FILE TỒN KHO
    // =====================================================

    @PostMapping("/thong-bao-xuat-file")
    public ResponseEntity<String> thongBaoXuatFile() {

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()) {

            return ResponseEntity.status(401)
                    .body("Chưa đăng nhập.");
        }

        String tenDangNhap =
                authentication.getName();

        khoThuocService.thongBaoXuatFile(
                tenDangNhap
        );

        return ResponseEntity.ok(
                "Đã tạo thông báo xuất file."
        );
    }

    // =====================================================
    // THÔNG BÁO SAU KHI XUẤT FILE THUỐC SẮP HẾT HẠN
    // =====================================================
    @PostMapping("/thong-bao-xuat-file-sap-het-han")
    public ResponseEntity<String> thongBaoXuatFileSapHetHan() {

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()) {

            return ResponseEntity.status(401)
                    .body("Chưa đăng nhập.");
        }

        String tenDangNhap = authentication.getName();

        khoThuocService.thongBaoXuatFileSapHetHan(
                tenDangNhap
        );

        return ResponseEntity.ok(
                "Đã tạo thông báo xuất file thuốc sắp hết hạn."
        );
    }

    // =====================================================
    // THÔNG BÁO SAU KHI XUẤT FILE THUỐC HẾT HẠN
    // =====================================================
    @PostMapping("/thong-bao-xuat-file-het-han")
    public ResponseEntity<String> thongBaoXuatFileHetHan() {

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()) {

            return ResponseEntity.status(401)
                    .body("Chưa đăng nhập.");
        }

        String tenDangNhap =
                authentication.getName();

        khoThuocService.thongBaoXuatFileHetHan(
                tenDangNhap
        );

        return ResponseEntity.ok(
                "Đã tạo thông báo xuất file thuốc hết hạn."
        );
    }

    // =====================================================
    // DƯỢC SĨ GỬI THÔNG BÁO THUỐC SẮP HẾT ĐẾN ADMIN
    // =====================================================
    @PostMapping("/thong-bao-sap-het/{maThuoc}")
    public ResponseEntity<Map<String, Object>> thongBaoThuocSapHet(
            @PathVariable Integer maThuoc
    ) {
        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getName())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "success", false,
                            "message", "Phiên đăng nhập không hợp lệ hoặc đã hết hạn."
                    ));
        }

        try {
            Map<String, Object> result =
                    khoThuocService.thongBaoThuocSapHetDenAdmin(
                            maThuoc,
                            authentication.getName()
                    );

            return ResponseEntity.ok(result);

        } catch (ResponseStatusException ex) {
            String message = ex.getReason() != null
                    ? ex.getReason()
                    : "Không thể gửi thông báo thuốc sắp hết.";
            boolean isDuplicate =
                    ex.getStatusCode().value() == HttpStatus.CONFLICT.value();

            return ResponseEntity.status(ex.getStatusCode())
                    .body(Map.of(
                            "success", false,
                            "duplicate", isDuplicate,
                            "message", message
                    ));
        }
    }
}