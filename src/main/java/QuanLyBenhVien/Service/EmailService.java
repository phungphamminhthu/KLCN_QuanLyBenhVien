package QuanLyBenhVien.Service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {
    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    // ==============================
    // TEST GỬI EMAIL
    // ==============================
    public void sendTestEmail(String emailNhan) {

        SimpleMailMessage message = new SimpleMailMessage();

        message.setTo(emailNhan);
        message.setSubject("Test gửi email - Quản lý bệnh viện");

        message.setText(
                "Xin chào,\n\n" +
                        "Đây là email kiểm tra chức năng gửi email " +
                        "của hệ thống quản lý bệnh viện.\n\n" +
                        "Nếu bạn nhận được email này thì cấu hình Gmail SMTP đã hoạt động."
        );

        mailSender.send(message);
    }

    // ==============================
    // GỬI OTP ĐẶT LẠI MẬT KHẨU
    // ==============================
    public void sendOtpEmail(String emailNhan, String otp) {

        SimpleMailMessage message = new SimpleMailMessage();

        message.setTo(emailNhan);

        message.setSubject(
                "Mã OTP đặt lại mật khẩu - Quản lý bệnh viện"
        );

        message.setText(
                "Xin chào,\n\n" +
                        "Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản " +
                        "trên hệ thống Quản lý bệnh viện.\n\n" +

                        "Mã OTP của bạn là: " + otp + "\n\n" +

                        "Mã OTP có hiệu lực trong 2 phút.\n" +
                        "Vui lòng không cung cấp mã OTP này cho người khác.\n\n" +

                        "Nếu bạn không thực hiện yêu cầu này, " +
                        "vui lòng bỏ qua email.\n\n" +

                        "Trân trọng,\n" +
                        "Hệ thống Quản lý bệnh viện"
        );

        mailSender.send(message);
    }
}
