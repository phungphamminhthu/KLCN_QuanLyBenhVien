package QuanLyBenhVien.Controller;

import QuanLyBenhVien.Service.PasswordResetService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class PasswordResetController {
    private final PasswordResetService passwordResetService;

    public PasswordResetController(
            PasswordResetService passwordResetService) {

        this.passwordResetService = passwordResetService;
    }

    // GỬI OTP
    @PostMapping("/forgot-password")
    public ResponseEntity<String> forgotPassword(
            @RequestParam String email) {

        passwordResetService.sendOtp(email);

        return ResponseEntity.ok(
                "OTP đã được gửi đến email"
        );
    }

    // ==========================================
    // XÁC MINH OTP
    // ==========================================
    //
    // Nếu OTP đúng:
    // - Service đánh dấu verified = true
    // - Service tạo resetToken
    // - Service lưu resetToken vào database
    // - Service trả resetToken về đây
    //
    // Sau đó Controller trả resetToken về frontend.
    // ==========================================

    @PostMapping("/verify-otp")
    public ResponseEntity<Map<String, String>> verifyOtp(
            @RequestParam String email,
            @RequestParam String otp) {

        // Gọi Service xác thực OTP
        // và nhận resetToken do backend tạo
        String resetToken =
                passwordResetService.verifyOtp(email, otp);


        // ==========================================
        // TẠO RESPONSE TRẢ VỀ FRONTEND
        // ==========================================

        Map<String, String> response = new HashMap<>();

        // Thông báo xác thực thành công
        response.put(
                "message",
                "Xác thực OTP thành công"
        );

        // Token dùng cho bước đặt lại mật khẩu
        response.put(
                "resetToken",
                resetToken
        );


        // Trả JSON về frontend
        return ResponseEntity.ok(response);
    }

    // ==========================================
    // ĐẶT LẠI MẬT KHẨU
    // ==========================================
    //
    // Frontend gửi lên:
    // - email
    // - resetToken
    // - mật khẩu mới
    // - mật khẩu xác nhận
    //
    // Controller nhận các thông tin này và
    // truyền xuống PasswordResetService.
    //
    // Việc kiểm tra resetToken có hợp lệ hay không
    // sẽ được thực hiện ở Service.
    // ==========================================

    @PostMapping("/reset-password")
    public ResponseEntity<String> resetPassword(

            // Email của tài khoản cần đổi mật khẩu
            @RequestParam String email,

            // Token được backend cấp sau khi
            // người dùng xác thực OTP thành công
            @RequestParam String resetToken,

            // Mật khẩu mới
            @RequestParam String matKhauMoi,

            // Mật khẩu xác nhận
            @RequestParam String matKhauXacNhan) {


        // Gọi Service để:
        // 1. Kiểm tra resetToken
        // 2. Kiểm tra token còn hạn
        // 3. Kiểm tra OTP đã được xác thực
        // 4. Kiểm tra email
        // 5. Kiểm tra mật khẩu
        // 6. Cập nhật mật khẩu
        passwordResetService.resetPassword(
                email,
                resetToken,
                matKhauMoi,
                matKhauXacNhan
        );


        // Nếu không có exception xảy ra,
        // nghĩa là đổi mật khẩu thành công.
        return ResponseEntity.ok(
                "Đặt lại mật khẩu thành công"
        );
    }


}
