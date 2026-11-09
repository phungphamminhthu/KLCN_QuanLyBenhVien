
package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.PhanCongChuyenTrachRequest;
import QuanLyBenhVien.DTO.PhanCongChuyenTrachResponse;
import QuanLyBenhVien.Entity.NguoiDung;
import QuanLyBenhVien.Security.CustomUserDetails;
import QuanLyBenhVien.Service.PhanCongChuyenTrachService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/phan-cong-chuyen-trach")
public class PhanCongChuyenTrachController {

    private final PhanCongChuyenTrachService service;

    public PhanCongChuyenTrachController(
            PhanCongChuyenTrachService service
    ) {
        this.service = service;
    }

    // =========================================
    // ADMIN: LẤY DANH SÁCH PHÂN CÔNG
    // =========================================
    @GetMapping
    public ResponseEntity<List<PhanCongChuyenTrachResponse>> getAll() {

        getMaAdminDangNhap();

        return ResponseEntity.ok(service.getAll());
    }

    // =========================================
    // ADMIN: LẤY DANH SÁCH TÀI KHOẢN CHUYÊN TRÁCH
    // =========================================
    @GetMapping("/tai-khoan")
    public ResponseEntity<List<Map<String, Object>>> getTaiKhoan() {

        getMaAdminDangNhap();

        List<Map<String, Object>> result =
                service.getTaiKhoanChuyenTrach()
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

    // =========================================
    // ADMIN: TẠO PHÂN CÔNG CHO NHIỀU NHÂN VIÊN
    // =========================================
    @PostMapping
    public ResponseEntity<Map<String, Object>> create(
            @RequestBody PhanCongChuyenTrachRequest request
    ) {

        Integer maAdmin = getMaAdminDangNhap();

        List<PhanCongChuyenTrachResponse> result =
                service.create(request, maAdmin);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of(
                        "success", true,
                        "message", "Đã phân công thành công cho "
                                + result.size()
                                + " nhân viên chuyên trách.",
                        "data", result
                ));
    }

    // =========================================
    // CHUYÊN TRÁCH: XEM LỊCH CỦA TÔI
    // =========================================
    @GetMapping("/cua-toi")
    public ResponseEntity<List<PhanCongChuyenTrachResponse>>
    getLichCuaToi() {

        Integer maNguoiDung = getMaChuyenTrachDangNhap();

        return ResponseEntity.ok(
                service.getLichCuaToi(maNguoiDung)
        );
    }

    // =========================================
    // LẤY ADMIN ĐANG ĐĂNG NHẬP
    // =========================================
    private Integer getMaAdminDangNhap() {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || !(authentication.getPrincipal()
                instanceof CustomUserDetails userDetails)) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Vui lòng đăng nhập bằng tài khoản Admin."
            );
        }

        NguoiDung nguoiDung = userDetails.getNguoiDung();

        if (nguoiDung.getVaiTro() == null
                || !"ADMIN".equalsIgnoreCase(
                nguoiDung.getVaiTro().getTenVaiTro())) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Bạn không có quyền thực hiện chức năng này."
            );
        }

        return nguoiDung.getMaNguoiDung();
    }

    // =========================================
    // LẤY TÀI KHOẢN CHUYÊN TRÁCH ĐANG ĐĂNG NHẬP
    // =========================================
    private Integer getMaChuyenTrachDangNhap() {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || !(authentication.getPrincipal()
                instanceof CustomUserDetails userDetails)) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Vui lòng đăng nhập."
            );
        }

        NguoiDung nguoiDung = userDetails.getNguoiDung();

        if (nguoiDung.getVaiTro() == null
                || !"CHUYENTRACH".equalsIgnoreCase(
                nguoiDung.getVaiTro().getTenVaiTro())) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Bạn không có quyền xem lịch Chuyên trách."
            );
        }

        return nguoiDung.getMaNguoiDung();
    }
}
