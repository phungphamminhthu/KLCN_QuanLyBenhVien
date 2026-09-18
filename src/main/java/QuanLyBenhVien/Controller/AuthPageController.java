package QuanLyBenhVien.Controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/auth")
public class AuthPageController {

    //điều hướng URL → đến file HTML tương ứng
    @GetMapping("/login")
    public String loginPage() {
        return "Auth/login";
    }

    @GetMapping("/forgot-password")
    public String forgotPasswordPage() {
        return "Auth/forgot-password";
    }

    @GetMapping("/reset-password")
    public String resetPasswordPage() {
        return "Auth/reset-password";
    }

    @GetMapping("/verify-otp")
    public String verifyOtpPage() {
        return "Auth/verify-otp";
    }
}
