package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.EmailRequest;
import QuanLyBenhVien.DTO.LoginRequest;
import QuanLyBenhVien.Entity.NguoiDung;
import QuanLyBenhVien.Repository.BenhNhanRepository;
import QuanLyBenhVien.Repository.NguoiDungRepository;
import QuanLyBenhVien.Security.CustomUserDetails;
import QuanLyBenhVien.Security.CustomUserDetailsService;
import QuanLyBenhVien.Security.JwtService;

import QuanLyBenhVien.Service.OtpService;
import QuanLyBenhVien.DTO.VerifyOtpRequest;
import QuanLyBenhVien.Service.RegistrationService;
import QuanLyBenhVien.DTO.RegisterRequest;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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
    private final NguoiDungRepository nguoiDungRepository;
    private final OtpService otpService;
    private final RegistrationService registrationService;
    private final BenhNhanRepository benhNhanRepository;

    public AuthController(
            CustomUserDetailsService CustomUserDetailsService,
            PasswordEncoder PasswordEncoder,
            JwtService JwtService,
            NguoiDungRepository nguoiDungRepository,
            OtpService otpService,
            RegistrationService registrationService,
            BenhNhanRepository benhNhanRepository) {

        this.CustomUserDetailsService = CustomUserDetailsService;
        this.PasswordEncoder = PasswordEncoder;
        this.JwtService = JwtService;
        this.nguoiDungRepository = nguoiDungRepository;
        this.otpService = otpService;
        this.registrationService = registrationService;
        this.benhNhanRepository = benhNhanRepository;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody LoginRequest request) {

        System.out.println(
                "DEBUG Backend username = [" + request.getTenDangNhap() + "]"
        );

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
                    "AnhDaiDien",
                    NguoiDung.getAnhDaiDien()
            );


            response.put(
                    "Token",
                    Token
            );

            return ResponseEntity.ok(response);

        }  catch (Exception e) {

        e.printStackTrace();

        return ResponseEntity
                .badRequest()
                .body("Đăng nhập thất bại. Kiểm tra log Backend.");
    }
    }

    // ===========================================
    // KIỂM TRA EMAIL
    // ===========================================
    @PostMapping("/check-email")
    public ResponseEntity<?> checkEmail(
            @RequestBody EmailRequest request) {

        if (request.getEmail() == null
                || request.getEmail().trim().isEmpty()) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "success", false,
                            "message", "Vui lòng nhập email."
                    ));
        }

        String email = request.getEmail().trim();

        if (nguoiDungRepository.existsByEmailIgnoreCase(email)) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "success", false,
                            "message", "Email này đã được sử dụng."
                    ));
        }

        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "message", "Email hợp lệ, có thể tiếp tục."
                )
        );
    }


    // ===========================================
    // ĐĂNG KÝ
    // ===========================================

    @PostMapping("/register")
    public ResponseEntity<?> register(
            @RequestBody RegisterRequest request) {
        try {
            NguoiDung user = registrationService.registerPatient(request);

            return ResponseEntity.status(HttpStatus.CREATED).body(
                    Map.of(
                            "success", true,
                            "message", "Đăng ký tài khoản thành công."
                    )
            );

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(
                    Map.of(
                            "success", false,
                            "message", e.getMessage()
                    )
            );

        } catch (Exception e) {
            e.printStackTrace();

            return ResponseEntity.status(
                    HttpStatus.INTERNAL_SERVER_ERROR
            ).body(
                    Map.of(
                            "success", false,
                            "message", "Không thể đăng ký tài khoản. Vui lòng thử lại."
                    )
            );
        }
    }


    // ============================================
    // GỬI MÃ OTP
    //============================================
    @PostMapping("/register/send-otp")
    public ResponseEntity<?> sendRegistrationOtp(
            @RequestBody EmailRequest request) {

        if (request.getEmail() == null
                || request.getEmail().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(
                    Map.of(
                            "success", false,
                            "message", "Vui lòng nhập email."
                    )
            );
        }

        String email = request.getEmail().trim();

        if (nguoiDungRepository.existsByEmailIgnoreCase(email)) {
            return ResponseEntity.badRequest().body(
                    Map.of(
                            "success", false,
                            "message", "Email này đã được sử dụng."
                    )
            );
        }

        try {
            otpService.sendRegistrationOtp(email);

            return ResponseEntity.ok(
                    Map.of(
                            "success", true,
                            "message", "Mã OTP đã được gửi đến email."
                    )
            );

        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(
                    Map.of(
                            "success", false,
                            "message", e.getMessage()
                    )
            );

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(
                    Map.of(
                            "success", false,
                            "message", "Không thể gửi email. Vui lòng thử lại."
                    )
            );
        }
    }

    //=================================
    // XÁC MINH OTP
    // ================================

    @PostMapping("/register/verify-otp")
    public ResponseEntity<?> verifyRegistrationOtp(
            @RequestBody VerifyOtpRequest request) {

        if (request.getEmail() == null
                || request.getEmail().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(
                    Map.of(
                            "success", false,
                            "message", "Vui lòng nhập email."
                    )
            );
        }

        if (request.getOtp() == null
                || request.getOtp().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(
                    Map.of(
                            "success", false,
                            "message", "Vui lòng nhập mã OTP."
                    )
            );
        }

        String email = request.getEmail().trim();

        try {
            otpService.verifyRegistrationOtp(
                    email,
                    request.getOtp()
            );

            return ResponseEntity.ok(
                    Map.of(
                            "success", true,
                            "message", "Xác minh email thành công."
                    )
            );

        } catch (IllegalArgumentException
                 | IllegalStateException e) {

            return ResponseEntity.badRequest().body(
                    Map.of(
                            "success", false,
                            "message", e.getMessage()
                    )
            );
        }
    }


    // ===========================================
    // LẤY THÔNG TIN NGƯỜI DÙNG ĐANG ĐĂNG NHẬP
    // ===========================================

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(
            Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()
                || !(authentication.getPrincipal()
                instanceof CustomUserDetails)) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "success", false,
                            "message", "Vui lòng đăng nhập lại."
                    ));
        }

        CustomUserDetails userDetails =
                (CustomUserDetails) authentication.getPrincipal();

        NguoiDung user = userDetails.getNguoiDung();

        Map<String, Object> response = new HashMap<>();

        // Thông tin tài khoản từ bảng NguoiDung
        response.put("success", true);
        response.put("MaNguoiDung", user.getMaNguoiDung());
        response.put("TenDangNhap", user.getTenDangNhap());
        response.put("HoTen", user.getHoTen());
        response.put("Email", user.getEmail());
        response.put("SoDienThoai", user.getSoDienThoai());
        response.put("AnhDaiDien", user.getAnhDaiDien());

        // Tìm hồ sơ bệnh nhân theo tài khoản đang đăng nhập
        benhNhanRepository
                .findByNguoiDung_MaNguoiDung(user.getMaNguoiDung())
                .ifPresentOrElse(benhNhan -> {

                    response.put(
                            "MaBenhNhan",
                            benhNhan.getMaBenhNhan()
                    );

                    response.put(
                            "NgaySinh",
                            benhNhan.getNgaySinh()
                    );

                    response.put(
                            "GioiTinh",
                            benhNhan.getGioiTinh()
                    );

                    response.put(
                            "DiaChi",
                            benhNhan.getDiaChi()
                    );

                    response.put(
                            "SoDienThoaiKhanCap",
                            benhNhan.getSoDienThoaiKhanCap()
                    );

                    response.put(
                            "TienSuBenh",
                            benhNhan.getTienSuBenh()
                    );

                }, () -> {
                    // Tài khoản chưa có hồ sơ bệnh nhân
                    response.put("MaBenhNhan", null);
                    response.put("NgaySinh", null);
                    response.put("GioiTinh", null);
                    response.put("DiaChi", null);
                    response.put("SoDienThoaiKhanCap", null);
                    response.put("TienSuBenh", null);
                });

        return ResponseEntity.ok(response);
    }


    // ===========================================
    // ĐỔI MẬT KHẨU KHI ĐÃ ĐĂNG NHẬP
    // ===========================================
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(
            Authentication authentication,
            @RequestBody Map<String, String> request) {

        // 1. Xác thực tài khoản đăng nhập
        if (authentication == null
                || !authentication.isAuthenticated()
                || !(authentication.getPrincipal()
                instanceof CustomUserDetails)) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "success", false,
                            "message", "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại."
                    ));
        }

        String currentPassword = request.get("matKhauHienTai");
        String newPassword = request.get("matKhauMoi");
        String confirmPassword = request.get("matKhauXacNhan");

        // 2. Kiểm tra dữ liệu đầu vào
        if (currentPassword == null || currentPassword.isEmpty()
                || newPassword == null || newPassword.isEmpty()
                || confirmPassword == null || confirmPassword.isEmpty()) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "success", false,
                            "message", "Vui lòng nhập đầy đủ thông tin mật khẩu."
                    ));
        }

        if (newPassword.length() < 8) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "success", false,
                            "message", "Mật khẩu mới phải có ít nhất 8 ký tự."
                    ));
        }

        if (!newPassword.equals(confirmPassword)) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "success", false,
                            "message", "Mật khẩu xác nhận không khớp."
                    ));
        }

        // 3. Lấy tài khoản hiện tại từ JWT
        CustomUserDetails userDetails =
                (CustomUserDetails) authentication.getPrincipal();

        NguoiDung user = userDetails.getNguoiDung();

        // 4. Xác minh mật khẩu hiện tại
        if (!PasswordEncoder.matches(
                currentPassword,
                user.getMatKhau())) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "success", false,
                            "message", "Mật khẩu hiện tại không chính xác."
                    ));
        }

        // 5. Không cho dùng lại mật khẩu hiện tại
        if (PasswordEncoder.matches(
                newPassword,
                user.getMatKhau())) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "success", false,
                            "message", "Mật khẩu mới phải khác mật khẩu hiện tại."
                    ));
        }

        // 6. Mã hóa và lưu mật khẩu mới
        user.setMatKhau(PasswordEncoder.encode(newPassword));
        nguoiDungRepository.save(user);

        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "message", "Đổi mật khẩu thành công."
                )
        );
    }

}