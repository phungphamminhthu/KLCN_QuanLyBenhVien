
package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.PhanCongTiepNhanRequest;
import QuanLyBenhVien.DTO.PhanCongTiepNhanResponse;
import QuanLyBenhVien.Entity.Khoa;
import QuanLyBenhVien.Entity.NguoiDung;
import QuanLyBenhVien.Security.CustomUserDetails;
import QuanLyBenhVien.Service.PhanCongTiepNhanService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/phan-cong-tiep-nhan")
public class PhanCongTiepNhanController {

    private final PhanCongTiepNhanService service;

    public PhanCongTiepNhanController(
            PhanCongTiepNhanService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<PhanCongTiepNhanResponse>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @GetMapping("/nhan-vien")
    public ResponseEntity<List<Map<String, Object>>> getNhanVien() {
        List<Map<String, Object>> result =
                service.getNhanVienTiepNhan()
                        .stream()
                        .map(nd -> Map.<String, Object>of(
                                "maNguoiDung", nd.getMaNguoiDung(),
                                "hoTen", nd.getHoTen(),
                                "tenDangNhap", nd.getTenDangNhap(),
                                "email", nd.getEmail() == null
                                        ? "" : nd.getEmail()
                        ))
                        .toList();

        return ResponseEntity.ok(result);
    }

    @GetMapping("/khoa")
    public ResponseEntity<List<Map<String, Object>>> getKhoa() {
        List<Khoa> khoaList = service.getDanhSachKhoa();

        List<Map<String, Object>> result = khoaList.stream()
                .map(k -> Map.<String, Object>of(
                        "maKhoa", k.getMaKhoa(),
                        "tenKhoa", k.getTenKhoa()
                ))
                .toList();

        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<PhanCongTiepNhanResponse> create(
            @RequestBody PhanCongTiepNhanRequest request) {

        Integer maAdmin = getMaAdminDangNhap();

        PhanCongTiepNhanResponse response =
                service.create(request, maAdmin);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(response);
    }

    private Integer getMaAdminDangNhap() {
        Authentication authentication =
                SecurityContextHolder.getContext()
                        .getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || !(authentication.getPrincipal()
                instanceof CustomUserDetails userDetails)) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Vui lòng đăng nhập bằng tài khoản Admin.");
        }

        NguoiDung nguoiDung = userDetails.getNguoiDung();

        if (nguoiDung.getVaiTro() == null
                || !"ADMIN".equalsIgnoreCase(
                nguoiDung.getVaiTro().getTenVaiTro())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Bạn không có quyền phân công tiếp nhận.");
        }

        return nguoiDung.getMaNguoiDung();
    }
}
