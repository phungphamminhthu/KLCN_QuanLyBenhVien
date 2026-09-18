package QuanLyBenhVien.Service;

import QuanLyBenhVien.Entity.NguoiDung;
import QuanLyBenhVien.Entity.PasswordResetOtp;
import QuanLyBenhVien.Repository.NguoiDungRepository;
import QuanLyBenhVien.Repository.PasswordResetOtpRepository;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.time.LocalDateTime;
import java.util.Random;
import java.util.UUID;

@Service
public class PasswordResetService {
    //UUID - Universally Unique Identifier
    // — hiểu đơn giản là một chuỗi định danh được tạo ngẫu nhiên để gần như không trùng nhau.

    //THUỘC TÍNH
    private final NguoiDungRepository nguoiDungRepository;
    private final PasswordResetOtpRepository otpRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;


    // KHAI BÁO
    public PasswordResetService(
            NguoiDungRepository nguoiDungRepository,
            PasswordResetOtpRepository otpRepository,
            EmailService emailService,
            PasswordEncoder passwordEncoder) {

        this.nguoiDungRepository = nguoiDungRepository;
        this.otpRepository = otpRepository;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
    }

    // GỬI MÃ OTP
    public void sendOtp(String email) {

        // 1. Kiểm tra email có tồn tại trong hệ thống
        if (!nguoiDungRepository.existsByEmail(email)) {
            throw new RuntimeException(
                    "Email chưa được đăng ký trong hệ thống"
            );
        }

        // 2. Tạo OTP 6 số
        String otp = String.format(
                "%06d",
                new Random().nextInt(1000000)
        );

        // 3. Tạo đối tượng OTP
        PasswordResetOtp passwordResetOtp =
                new PasswordResetOtp();

        passwordResetOtp.setEmail(email);
        passwordResetOtp.setOtp(otp);
        passwordResetOtp.setCreatedAt(LocalDateTime.now());

        // OTP có hiệu lực 2 phút
        passwordResetOtp.setExpiresAt(
                LocalDateTime.now().plusMinutes(2)
        );

        passwordResetOtp.setVerified(false);

        // 4. Lưu OTP vào MySQL
        otpRepository.save(passwordResetOtp);

        // 5. Gửi OTP qua email
        emailService.sendOtpEmail(email, otp);
    }


    // ==========================================
    // XÁC MINH MÃ OTP
    // ==========================================
    //
    // Nếu OTP đúng:
    // 1. Đánh dấu OTP đã xác thực
    // 2. Tạo resetToken ngẫu nhiên
    // 3. Thiết lập thời gian hết hạn resetToken
    // 4. Lưu xuống database
    // 5. Trả resetToken về cho Controller
    //
    // resetToken sẽ được frontend sử dụng ở bước
    // đặt lại mật khẩu.
    // ==========================================

    public String verifyOtp(String email, String otp) {

        // ==========================================
        // BƯỚC 1: TÌM OTP MỚI NHẤT CỦA EMAIL
        // ==========================================

        PasswordResetOtp passwordResetOtp =
                otpRepository.findTopByEmailOrderByCreatedAtDesc(email)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Không tìm thấy mã OTP"
                                )
                        );


        // ==========================================
        // BƯỚC 2: KIỂM TRA OTP ĐÃ HẾT HẠN CHƯA
        //
        // OTP của hệ thống hiện tại có hiệu lực 2 phút.
        // ==========================================

        if (LocalDateTime.now()
                .isAfter(passwordResetOtp.getExpiresAt())) {

            throw new RuntimeException(
                    "Mã OTP đã hết hạn"
            );
        }


        // ==========================================
        // BƯỚC 3: KIỂM TRA OTP ĐÃ ĐƯỢC SỬ DỤNG CHƯA
        // ==========================================

        if (passwordResetOtp.isVerified()) {

            throw new RuntimeException(
                    "Mã OTP đã được sử dụng"
            );
        }


        // ==========================================
        // BƯỚC 4: KIỂM TRA OTP NGƯỜI DÙNG NHẬP
        // CÓ KHỚP VỚI OTP TRONG DATABASE KHÔNG
        // ==========================================

        if (!passwordResetOtp.getOtp().equals(otp)) {

            throw new RuntimeException(
                    "Mã OTP không chính xác"
            );
        }


        // ==========================================
        // OTP ĐÚNG
        // ==========================================


        // ==========================================
        // BƯỚC 5: ĐÁNH DẤU OTP ĐÃ XÁC THỰC
        // ==========================================

        passwordResetOtp.setVerified(true);


        // ==========================================
        // BƯỚC 6: TẠO RESET TOKEN
        //
        // Backend tự tạo token ngẫu nhiên bằng UUID.
        //
        // Frontend KHÔNG được tự tạo token này.
        // ==========================================

        String resetToken = UUID.randomUUID().toString();

        passwordResetOtp.setResetToken(resetToken);


        // ==========================================
        // BƯỚC 7: THIẾT LẬP THỜI GIAN HẾT HẠN
        // CỦA RESET TOKEN
        //
        // Token có hiệu lực trong 2 phút.
        // ==========================================

        passwordResetOtp.setResetTokenExpiresAt(
                LocalDateTime.now().plusMinutes(2)
        );


        // ==========================================
        // BƯỚC 8: LƯU THÔNG TIN XUỐNG DATABASE
        // ==========================================

        otpRepository.save(passwordResetOtp);


        // ==========================================
        // BƯỚC 9: TRẢ RESET TOKEN VỀ CONTROLLER
        //
        // Controller sẽ trả token này cho frontend.
        // ==========================================

        return resetToken;
    }

    // ==========================================
    // ĐẶT LẠI MẬT KHẨU
    // ==========================================
    //
    // Người dùng chỉ được đổi mật khẩu khi:
    // 1. Có email hợp lệ
    // 2. Có resetToken hợp lệ
    // 3. resetToken đúng với token trong database
    // 4. resetToken chưa hết hạn
    // 5. OTP trước đó đã được xác thực
    // 6. Mật khẩu mới đáp ứng đủ yêu cầu
    // 7. Mật khẩu xác nhận trùng với mật khẩu mới
    //
    // Sau khi đổi mật khẩu thành công,
    // OTP và resetToken sẽ bị xóa khỏi database.
    // ==========================================

    public void resetPassword(
            String email,
            String resetToken,
            String matKhauMoi,
            String matKhauXacNhan) {


        // ==========================================
        // BƯỚC 1: TÌM YÊU CẦU RESET MỚI NHẤT
        // CỦA EMAIL
        // ==========================================

        PasswordResetOtp passwordResetOtp =
                otpRepository.findTopByEmailOrderByCreatedAtDesc(email)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Không tìm thấy yêu cầu đặt lại mật khẩu"
                                )
                        );


        // ==========================================
        // BƯỚC 2: KIỂM TRA OTP ĐÃ ĐƯỢC XÁC THỰC CHƯA
        // ==========================================
        //
        // Nếu verified = false
        // → người dùng chưa xác thực OTP
        // → không được phép đổi mật khẩu.
        // ==========================================

        if (!passwordResetOtp.isVerified()) {

            throw new RuntimeException(
                    "Bạn chưa xác thực OTP"
            );
        }


        // ==========================================
        // BƯỚC 3: KIỂM TRA RESET TOKEN
        // ==========================================
        //
        // So sánh token frontend gửi lên
        // với token backend đã lưu trong database.
        // ==========================================

        if (passwordResetOtp.getResetToken() == null ||
                !passwordResetOtp.getResetToken().equals(resetToken)) {

            throw new RuntimeException(
                    "Reset token không hợp lệ"
            );
        }


        // ==========================================
        // BƯỚC 4: KIỂM TRA RESET TOKEN ĐÃ HẾT HẠN CHƯA
        // ==========================================

        if (passwordResetOtp.getResetTokenExpiresAt() == null ||
                LocalDateTime.now()
                        .isAfter(passwordResetOtp.getResetTokenExpiresAt())) {

            throw new RuntimeException(
                    "Reset token đã hết hạn. Vui lòng thực hiện lại."
            );
        }


        // ==========================================
        // BƯỚC 5: KIỂM TRA EMAIL CÓ TỒN TẠI KHÔNG
        // ==========================================

        NguoiDung nguoiDung =
                nguoiDungRepository.findByEmail(email)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Không tìm thấy tài khoản"
                                )
                        );


        // ==========================================
        // BƯỚC 6: KIỂM TRA MẬT KHẨU KHÔNG ĐƯỢC ĐỂ TRỐNG
        // ==========================================

        if (matKhauMoi == null ||
                matKhauMoi.isBlank()) {

            throw new RuntimeException(
                    "Mật khẩu mới không được để trống"
            );
        }


        // ==========================================
        // BƯỚC 7: MẬT KHẨU PHẢI CÓ ÍT NHẤT 8 KÝ TỰ
        // ==========================================

        if (matKhauMoi.length() < 8) {

            throw new RuntimeException(
                    "Mật khẩu phải có ít nhất 8 ký tự"
            );
        }


        // ==========================================
        // BƯỚC 8: MẬT KHẨU PHẢI CÓ ÍT NHẤT
        // 1 KÝ TỰ IN HOA
        // ==========================================

        if (!matKhauMoi.matches(".*[A-Z].*")) {

            throw new RuntimeException(
                    "Mật khẩu phải chứa ít nhất 1 ký tự in hoa"
            );
        }


        // ==========================================
        // BƯỚC 9: MẬT KHẨU PHẢI CÓ ÍT NHẤT
        // 1 KÝ TỰ IN THƯỜNG
        // ==========================================

        if (!matKhauMoi.matches(".*[a-z].*")) {

            throw new RuntimeException(
                    "Mật khẩu phải chứa ít nhất 1 ký tự in thường"
            );
        }


        // ==========================================
        // BƯỚC 10: MẬT KHẨU PHẢI CÓ ÍT NHẤT
        // 1 CHỮ SỐ
        // ==========================================

        if (!matKhauMoi.matches(".*[0-9].*")) {

            throw new RuntimeException(
                    "Mật khẩu phải chứa ít nhất 1 chữ số"
            );
        }


        // ==========================================
        // BƯỚC 11: KIỂM TRA MẬT KHẨU XÁC NHẬN
        // ==========================================

        if (!matKhauMoi.equals(matKhauXacNhan)) {

            throw new RuntimeException(
                    "Mật khẩu xác nhận không khớp"
            );
        }


        // ==========================================
        // BƯỚC 12: MÃ HÓA MẬT KHẨU
        // ==========================================
        //
        // Không lưu mật khẩu dạng plain text.
        //
        // Ví dụ:
        //
        // Abc12345
        //
        // sẽ được PasswordEncoder mã hóa thành
        // một chuỗi hash trước khi lưu database.
        // ==========================================

        nguoiDung.setMatKhau(
                passwordEncoder.encode(matKhauMoi)
        );


        // ==========================================
        // BƯỚC 13: LƯU MẬT KHẨU MỚI
        // ==========================================

        nguoiDungRepository.save(nguoiDung);


        // ==========================================
        // BƯỚC 14: XÓA OTP VÀ RESET TOKEN
        // ==========================================
        //
        // Sau khi đổi mật khẩu thành công,
        // yêu cầu reset này không được sử dụng lại.
        //
        // Xóa luôn record OTP cũng đồng nghĩa
        // resetToken sẽ bị xóa.
        // ==========================================

        otpRepository.delete(passwordResetOtp);
    }
}
