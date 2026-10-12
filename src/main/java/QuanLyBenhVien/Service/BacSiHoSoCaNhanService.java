package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.*;
import QuanLyBenhVien.Entity.BacSi;
import QuanLyBenhVien.Entity.NguoiDung;
import QuanLyBenhVien.Repository.BacSiRepository;
import QuanLyBenhVien.Repository.NguoiDungRepository;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BacSiHoSoCaNhanService {

    private final BacSiRepository bacSiRepository;
    private final NguoiDungRepository nguoiDungRepository;
    private final PasswordEncoder passwordEncoder;

    public BacSiHoSoCaNhanService(
            BacSiRepository bacSiRepository,
            NguoiDungRepository nguoiDungRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.bacSiRepository = bacSiRepository;
        this.nguoiDungRepository = nguoiDungRepository;
        this.passwordEncoder = passwordEncoder;
    }

    private BacSi layBacSiDangNhap(Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Chưa đăng nhập"
            );
        }

        String tenDangNhap = authentication.getName();

        NguoiDung nguoiDung = nguoiDungRepository
                .findByTenDangNhapHoacEmail(tenDangNhap)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Không tìm thấy tài khoản đăng nhập"
                ));

        if (!Boolean.TRUE.equals(nguoiDung.getTrangThai())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Tài khoản đã bị khóa"
            );
        }

        BacSi bacSi = bacSiRepository
                .timTheoMaNguoiDung(nguoiDung.getMaNguoiDung())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Tài khoản không thuộc bác sĩ"
                ));

        if (!Boolean.TRUE.equals(bacSi.getTrangThai())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Bác sĩ đã ngừng hoạt động"
            );
        }

        return bacSi;
    }

    private BacSiHoSoCaNhanDTO taoDTO(BacSi bacSi) {

        NguoiDung nd = bacSi.getNguoiDung();

        return new BacSiHoSoCaNhanDTO(
                bacSi.getMaBacSi(),
                nd.getHoTen(),
                nd.getTenDangNhap(),
                nd.getEmail(),
                nd.getSoDienThoai(),
                nd.getAnhDaiDien(),
                bacSi.getKhoa() != null
                        ? bacSi.getKhoa().getTenKhoa() : null,
                bacSi.getChuyenMon(),
                bacSi.getTrinhDo(),
                bacSi.getSoChungChiHanhNghe()
        );
    }

    @Transactional(readOnly = true)
    public BacSiHoSoCaNhanDTO xemHoSo(
            Authentication authentication
    ) {
        return taoDTO(layBacSiDangNhap(authentication));
    }

    @Transactional
    public BacSiHoSoCaNhanDTO capNhat(
            Authentication authentication,
            CapNhatHoSoCaNhanRequest request
    ) {

        BacSi bacSi = layBacSiDangNhap(authentication);
        NguoiDung nd = bacSi.getNguoiDung();

        String hoTen = request.hoTen() == null
                ? "" : request.hoTen().trim();

        if (hoTen.isBlank() || hoTen.length() > 255) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Họ tên không hợp lệ"
            );
        }

        String email = request.email() == null
                ? "" : request.email().trim();

        if (!email.isBlank()) {

            if (email.length() > 255
                    || !email.matches(
                    "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"
            )) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "Email không hợp lệ"
                );
            }

            NguoiDung taiKhoanKhac =
                    nguoiDungRepository.findByEmail(email)
                            .orElse(null);

            if (taiKhoanKhac != null
                    && !taiKhoanKhac.getMaNguoiDung()
                    .equals(nd.getMaNguoiDung())) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Email đã được sử dụng"
                );
            }
        }

        String soDienThoai = request.soDienThoai() == null
                ? "" : request.soDienThoai().trim();

        if (!soDienThoai.isBlank()
                && !soDienThoai.matches("^0[0-9]{9}$")) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0"
            );
        }

        nd.setHoTen(hoTen);
        nd.setEmail(email.isBlank() ? null : email);
        nd.setSoDienThoai(
                soDienThoai.isBlank() ? null : soDienThoai
        );

        nguoiDungRepository.save(nd);

        return taoDTO(bacSi);
    }

    @Transactional
    public void doiMatKhau(
            Authentication authentication,
            DoiMatKhauRequest request
    ) {

        NguoiDung nd = layBacSiDangNhap(authentication).getNguoiDung();

        if (request.matKhauCu() == null
                || request.matKhauMoi() == null
                || request.xacNhanMatKhau() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Vui lòng nhập đầy đủ thông tin"
            );
        }

        if (!passwordEncoder.matches(
                request.matKhauCu(), nd.getMatKhau()
        )) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Mật khẩu hiện tại không đúng"
            );
        }

        if (request.matKhauMoi().length() < 8) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Mật khẩu mới phải có ít nhất 8 ký tự"
            );
        }

        if (!request.matKhauMoi()
                .equals(request.xacNhanMatKhau())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Xác nhận mật khẩu không khớp"
            );
        }

        if (passwordEncoder.matches(
                request.matKhauMoi(), nd.getMatKhau()
        )) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Mật khẩu mới phải khác mật khẩu cũ"
            );
        }

        nd.setMatKhau(
                passwordEncoder.encode(request.matKhauMoi())
        );

        nguoiDungRepository.save(nd);
    }
}