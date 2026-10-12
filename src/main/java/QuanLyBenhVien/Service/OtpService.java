package QuanLyBenhVien.Service;

import QuanLyBenhVien.Entity.RegistrationOtp;
import QuanLyBenhVien.Repository.RegistrationOtpRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;

@Service
public class OtpService {

    private final RegistrationOtpRepository registrationOtpRepository;
    private final EmailService emailService;
    private final SecureRandom secureRandom = new SecureRandom();

    public OtpService(
            RegistrationOtpRepository registrationOtpRepository,
            EmailService emailService) {
        this.registrationOtpRepository = registrationOtpRepository;
        this.emailService = emailService;
    }

    /**
     * Gửi OTP đăng ký:
     * - OTP gồm 6 chữ số.
     * - OTP có hiệu lực 2 phút.
     * - Chỉ cho gửi lại sau 30 giây.
     */
    @Transactional
    public void sendRegistrationOtp(String email) {
        String normalizedEmail = normalizeEmail(email);

        Optional<RegistrationOtp> existing =
                registrationOtpRepository.findByEmailIgnoreCase(
                        normalizedEmail);

        LocalDateTime now = LocalDateTime.now();

        if (existing.isPresent()) {
            RegistrationOtp oldOtp = existing.get();

            if (oldOtp.getCreatedAt() != null
                    && oldOtp.getCreatedAt().isAfter(
                    now.minusSeconds(30))) {
                throw new RuntimeException(
                        "Vui lòng chờ 30 giây trước khi gửi lại OTP.");
            }

            registrationOtpRepository.delete(oldOtp);
            registrationOtpRepository.flush();
        }

        String otp = String.format(
                "%06d", secureRandom.nextInt(1_000_000));

        RegistrationOtp registrationOtp = new RegistrationOtp();
        registrationOtp.setEmail(normalizedEmail);
        registrationOtp.setOtp(otp);
        registrationOtp.setVerified(false);
        registrationOtp.setCreatedAt(now);
        registrationOtp.setExpiresAt(now.plusMinutes(2));

        // Lưu OTP vào MySQL trước khi gửi email.
        registrationOtpRepository.saveAndFlush(registrationOtp);

        // Dùng email đăng ký, không dùng hàm OTP quên mật khẩu.
        emailService.sendRegistrationOtpEmail(normalizedEmail, otp);
    }

    /**
     * Xác minh OTP đăng ký.
     * OTP đúng thì đánh dấu Verified = true.
     * Chưa xóa bản ghi tại bước này.
     */
    @Transactional
    public void verifyRegistrationOtp(String email, String otp) {
        String normalizedEmail = normalizeEmail(email);

        if (otp == null || !otp.matches("\\d{6}")) {
            throw new RuntimeException("OTP phải gồm 6 chữ số.");
        }

        RegistrationOtp registrationOtp =
                registrationOtpRepository
                        .findByEmailIgnoreCase(normalizedEmail)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Không tìm thấy OTP. Vui lòng gửi OTP mới."));

        LocalDateTime now = LocalDateTime.now();

        if (registrationOtp.isVerified()) {
            throw new RuntimeException(
                    "Email đã được xác minh OTP.");
        }

        if (registrationOtp.getExpiresAt() == null
                || !registrationOtp.getExpiresAt().isAfter(now)) {
            registrationOtpRepository.delete(registrationOtp);
            throw new RuntimeException(
                    "OTP đã hết hạn. Vui lòng yêu cầu OTP mới.");
        }

        if (!registrationOtp.getOtp().equals(otp)) {
            throw new RuntimeException("OTP không chính xác.");
        }

        registrationOtp.setVerified(true);

        // Cho người dùng thêm tối đa 10 phút để hoàn tất đăng ký.
        // OTP chỉ có hiệu lực 2 phút để nhập và xác minh.
        registrationOtp.setExpiresAt(now.plusMinutes(10));

        registrationOtpRepository.save(registrationOtp);
    }

    /**
     * Kiểm tra email đã xác minh và thời gian hoàn tất đăng ký còn hạn.
     */
    @Transactional(readOnly = true)
    public boolean isEmailVerified(String email) {
        String normalizedEmail = normalizeEmail(email);

        return registrationOtpRepository
                .findByEmailIgnoreCase(normalizedEmail)
                .filter(RegistrationOtp::isVerified)
                .filter(otp -> otp.getExpiresAt() != null)
                .filter(otp -> otp.getExpiresAt().isAfter(
                        LocalDateTime.now()))
                .isPresent();
    }

    /**
     * Xóa OTP sau khi tài khoản và hồ sơ bệnh nhân được tạo thành công.
     */
    @Transactional
    public boolean consumeEmailVerification(String email) {
        String normalizedEmail = normalizeEmail(email);

        Optional<RegistrationOtp> optional =
                registrationOtpRepository.findByEmailIgnoreCase(
                        normalizedEmail);

        if (optional.isEmpty()) {
            return false;
        }

        RegistrationOtp registrationOtp = optional.get();

        if (!registrationOtp.isVerified()
                || registrationOtp.getExpiresAt() == null
                || !registrationOtp.getExpiresAt().isAfter(
                LocalDateTime.now())) {
            return false;
        }

        registrationOtpRepository.delete(registrationOtp);
        return true;
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new RuntimeException("Email không được để trống.");
        }

        return email.trim().toLowerCase(Locale.ROOT);
    }
}
