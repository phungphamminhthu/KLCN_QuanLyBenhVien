package QuanLyBenhVien.Entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "PasswordResetOtp")
public class PasswordResetOtp {

    // ==========================================
    // KHÓA CHÍNH
    // ==========================================

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    // ==========================================
    // EMAIL CỦA TÀI KHOẢN YÊU CẦU ĐẶT LẠI MẬT KHẨU
    // ==========================================

    @Column(nullable = false)
    private String email;


    // ==========================================
    // MÃ OTP 6 SỐ ĐƯỢC GỬI QUA EMAIL
    // ==========================================

    @Column(nullable = false, length = 6)
    private String otp;


    // ==========================================
    // THỜI GIAN HẾT HẠN CỦA OTP
    // OTP hiện tại có hiệu lực trong 2 phút
    // ==========================================

    @Column(nullable = false)
    private LocalDateTime expiresAt;


    // ==========================================
    // TRẠNG THÁI XÁC THỰC OTP
    //
    // false = chưa xác thực
    // true  = đã xác thực
    // ==========================================

    @Column(nullable = false)
    private boolean verified;


    // ==========================================
    // THỜI GIAN TẠO OTP
    // Dùng để lấy OTP mới nhất của email
    // ==========================================

    @Column(nullable = false)
    private LocalDateTime createdAt;


    // ==========================================
    // RESET TOKEN
    //
    // Sau khi OTP được xác thực thành công,
    // backend tạo một token tạm thời.
    //
    // Token này dùng để chứng minh rằng người dùng
    // đã xác thực OTP trước khi được phép đổi mật khẩu.
    // ==========================================

    @Column(unique = true)
    private String resetToken;


    // ==========================================
    // THỜI GIAN HẾT HẠN CỦA RESET TOKEN
    //
    // Sau khi OTP xác thực thành công,
    // resetToken chỉ có hiệu lực trong một khoảng thời gian.
    //
    // Ví dụ: resetToken có hiệu lực trong 5 phút.
    // Sau thời gian này, người dùng không thể dùng token
    // để đổi mật khẩu.
    // ==========================================

    @Column
    private LocalDateTime resetTokenExpiresAt;


    // ==========================================
    // CONSTRUCTOR
    // ==========================================

    public PasswordResetOtp() {
    }


    // ==========================================
    // GETTER / SETTER
    // ==========================================

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }


    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }


    public String getOtp() {
        return otp;
    }

    public void setOtp(String otp) {
        this.otp = otp;
    }


    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(LocalDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }


    public boolean isVerified() {
        return verified;
    }

    public void setVerified(boolean verified) {
        this.verified = verified;
    }


    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }


    public String getResetToken() {
        return resetToken;
    }

    public void setResetToken(String resetToken) {
        this.resetToken = resetToken;
    }

    // Lấy thời gian hết hạn của resetToken
    public LocalDateTime getResetTokenExpiresAt() {
        return resetTokenExpiresAt;
    }

    // Gán thời gian hết hạn cho resetToken
    public void setResetTokenExpiresAt(LocalDateTime resetTokenExpiresAt) {
        this.resetTokenExpiresAt = resetTokenExpiresAt;
    }
}