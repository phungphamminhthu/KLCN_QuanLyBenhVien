package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.LoginRequest;
import QuanLyBenhVien.Entity.NguoiDung;
import QuanLyBenhVien.Repository.NguoiDungRepository;
import QuanLyBenhVien.Security.CustomUserDetails;
import QuanLyBenhVien.Security.CustomUserDetailsService;
import QuanLyBenhVien.Security.JwtService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final CustomUserDetailsService CustomUserDetailsService;
    private final PasswordEncoder PasswordEncoder;
    private final JwtService JwtService;

    public AuthController(
            CustomUserDetailsService CustomUserDetailsService,
            PasswordEncoder PasswordEncoder,
            JwtService JwtService) {

        this.CustomUserDetailsService = CustomUserDetailsService;
        this.PasswordEncoder = PasswordEncoder;
        this.JwtService = JwtService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody LoginRequest request) {

        try {

            // =========================
            // 1. Kiểm tra dữ liệu đầu vào
            // =========================

            if (request.getTenDangNhap() == null
                    || request.getTenDangNhap().trim().isEmpty()) {

                return ResponseEntity
                        .badRequest()
                        .body("Vui lòng nhập tên đăng nhập hoặc email.");
            }

            if (request.getMatKhau() == null
                    || request.getMatKhau().isEmpty()) {

                return ResponseEntity
                        .badRequest()
                        .body("Vui lòng nhập mật khẩu.");
            }


            // =========================
            // 2. Tìm tài khoản
            // =========================

            CustomUserDetails UserDetails =
                    (CustomUserDetails)
                            CustomUserDetailsService.loadUserByUsername(
                                    request.getTenDangNhap().trim()
                            );


            // =========================
            // 3. Kiểm tra tài khoản
            // =========================

            NguoiDung NguoiDung =
                    UserDetails.getNguoiDung();

            if (!NguoiDung.getTrangThai()) {

                return ResponseEntity
                        .badRequest()
                        .body("Tài khoản đã bị khóa.");
            }


            // =========================
            // 4. Kiểm tra mật khẩu
            // =========================

            if (!PasswordEncoder.matches(
                    request.getMatKhau(),
                    UserDetails.getPassword())) {

                return ResponseEntity
                        .badRequest()
                        .body("Tên đăng nhập/email hoặc mật khẩu không đúng.");
            }


            // =========================
            // 5. Tạo JWT
            // =========================

            String Token =
                    JwtService.generateToken(UserDetails);


            // =========================
            // 6. Trả kết quả
            // =========================

            Map<String, Object> response =
                    new HashMap<>();

            response.put(
                    "MaNguoiDung",
                    NguoiDung.getMaNguoiDung()
            );

            response.put(
                    "TenDangNhap",
                    NguoiDung.getTenDangNhap()
            );

            response.put(
                    "HoTen",
                    NguoiDung.getHoTen()
            );

            response.put(
                    "Email",
                    NguoiDung.getEmail()
            );

            response.put(
                    "VaiTro",
                    NguoiDung.getVaiTro().getTenVaiTro()
            );

            response.put(
                    "Token",
                    Token
            );

            return ResponseEntity.ok(response);

        } catch (Exception Exception) {

            return ResponseEntity
                    .badRequest()
                    .body("Tên đăng nhập/email hoặc mật khẩu không đúng.");
        }
    }
}