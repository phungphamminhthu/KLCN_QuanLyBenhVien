package QuanLyBenhVien.Controller;


import QuanLyBenhVien.Service.EmailService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/test-email")
public class EmailTestController {

    private final EmailService emailService;

    public EmailTestController(EmailService emailService) {
        this.emailService = emailService;
    }

    @PostMapping
    public ResponseEntity<String> sendTestEmail(
            @RequestParam String email) {

        emailService.sendTestEmail(email);

        return ResponseEntity.ok(
                "Đã gửi email kiểm tra"
        );
    }
}
