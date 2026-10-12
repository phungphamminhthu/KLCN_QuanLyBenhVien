package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.RegisterRequest;
import QuanLyBenhVien.Entity.BenhNhan;
import QuanLyBenhVien.Entity.NguoiDung;
import QuanLyBenhVien.Entity.VaiTro;
import QuanLyBenhVien.Repository.BenhNhanRepository;
import QuanLyBenhVien.Repository.NguoiDungRepository;
import QuanLyBenhVien.Repository.VaiTroRepository;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.time.LocalDate;

@Service
public class RegistrationService {

    private final NguoiDungRepository nguoiDungRepository;
    private final BenhNhanRepository benhNhanRepository;
    private final VaiTroRepository vaiTroRepository;
    private final PasswordEncoder passwordEncoder;
    private final OtpService otpService;

    public RegistrationService(
            NguoiDungRepository nguoiDungRepository,
            BenhNhanRepository benhNhanRepository,
            VaiTroRepository vaiTroRepository,
            PasswordEncoder passwordEncoder,
            OtpService otpService) {

        this.nguoiDungRepository = nguoiDungRepository;
        this.benhNhanRepository = benhNhanRepository;
        this.vaiTroRepository = vaiTroRepository;
        this.passwordEncoder = passwordEncoder;
        this.otpService = otpService;
    }

    @Transactional
    public NguoiDung registerPatient(RegisterRequest request) {

        if (request == null) {
            throw new IllegalArgumentException(
                    "Thông tin đăng ký không được để trống.");
        }

        if (request.getEmail() == null
                || request.getEmail().isBlank()) {
            throw new IllegalArgumentException(
                    "Vui lòng nhập email.");
        }

        if (request.getTenDangNhap() == null
                || request.getTenDangNhap().isBlank()) {
            throw new IllegalArgumentException(
                    "Vui lòng nhập tên đăng nhập.");
        }

        if (request.getHoTen() == null
                || request.getHoTen().isBlank()) {
            throw new IllegalArgumentException(
                    "Vui lòng nhập họ tên.");
        }

        if (request.getMatKhau() == null
                || request.getMatKhau().length() < 8) {
            throw new IllegalArgumentException(
                    "Mật khẩu phải có ít nhất 8 ký tự.");
        }

        String email = request.getEmail()
                .trim().toLowerCase(Locale.ROOT);

        String tenDangNhap = request.getTenDangNhap().trim();

        String soDienThoai = request.getSoDienThoai() == null
                ? ""
                : request.getSoDienThoai().trim();

        // 1. Kiểm tra xác minh OTP.
        if (!otpService.isEmailVerified(email)) {
            throw new IllegalArgumentException(
                    "Email chưa được xác minh OTP hoặc OTP đã hết hạn.");
        }

        // 2. Kiểm tra dữ liệu trùng.
        if (nguoiDungRepository.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException(
                    "Email này đã được sử dụng.");
        }

        if (nguoiDungRepository.existsByTenDangNhap(tenDangNhap)) {
            throw new IllegalArgumentException(
                    "Tên đăng nhập đã được sử dụng.");
        }

        if (!soDienThoai.isEmpty()
                && nguoiDungRepository.existsBySoDienThoai(soDienThoai)) {
            throw new IllegalArgumentException(
                    "Số điện thoại này đã được sử dụng.");
        }

        // 3. Tìm vai trò bệnh nhân.
        VaiTro vaiTro = vaiTroRepository
                .findByTenVaiTroIgnoreCase("BENHNHAN")
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Không tìm thấy vai trò BENHNHAN."));

        // 4. Tạo tài khoản người dùng.
        NguoiDung nguoiDung = new NguoiDung();
        nguoiDung.setEmail(email);
        nguoiDung.setTenDangNhap(tenDangNhap);
        nguoiDung.setMatKhau(
                passwordEncoder.encode(request.getMatKhau()));
        nguoiDung.setHoTen(request.getHoTen().trim());
        nguoiDung.setSoDienThoai(
                soDienThoai.isEmpty() ? null : soDienThoai);
        nguoiDung.setVaiTro(vaiTro);
        nguoiDung.setTrangThai(true);

        NguoiDung savedUser =
                nguoiDungRepository.saveAndFlush(nguoiDung);


        // 5. Tạo hồ sơ bệnh nhân và lưu thông tin từ DTO.
        BenhNhan benhNhan = new BenhNhan();

        // Liên kết hồ sơ với tài khoản vừa tạo.
        benhNhan.setNguoiDung(savedUser);

        // Ngày sinh.
        benhNhan.setNgaySinh(request.getNgaySinh());

        // Giới tính.
        benhNhan.setGioiTinh(
                request.getGioiTinh() == null
                        ? null
                        : request.getGioiTinh().trim()
        );

        // Địa chỉ.
        benhNhan.setDiaChi(
                request.getDiaChi() == null
                        ? null
                        : request.getDiaChi().trim()
        );

        // Số điện thoại liên hệ khẩn cấp.
        benhNhan.setSoDienThoaiKhanCap(
                request.getSoDienThoaiKhanCap() == null
                        ? null
                        : request.getSoDienThoaiKhanCap().trim()
        );

        // Tiền sử bệnh.
        benhNhan.setTienSuBenh(
                request.getTienSuBenh() == null
                        ? null
                        : request.getTienSuBenh().trim()
        );

        // Lưu hồ sơ bệnh nhân.
        benhNhanRepository.saveAndFlush(benhNhan);
//        benhNhan.setSoDienThoaiKhanCap(
//                request.getSoDienThoaiKhanCap()
//        );
        // 6. Xóa OTP sau khi tạo tài khoản và hồ sơ thành công.
        if (!otpService.consumeEmailVerification(email)) {
            throw new IllegalArgumentException(
                    "Xác minh email đã hết hạn. Vui lòng đăng ký lại.");
        }

        return savedUser;
    }
}
