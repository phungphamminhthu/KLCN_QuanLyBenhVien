package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.UserRequest;
import QuanLyBenhVien.DTO.UserResponse;
import QuanLyBenhVien.Entity.NguoiDung;
import QuanLyBenhVien.Entity.VaiTro;
import QuanLyBenhVien.Repository.NguoiDungRepository;
import QuanLyBenhVien.Repository.VaiTroRepository;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NguoiDungService {

    private final NguoiDungRepository nguoiDungRepository;
    private final VaiTroRepository vaiTroRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;
    private final ThongBaoService thongBaoService;

    @Value("${cloudflare.r2.default-avatar}")
    private String defaultAvatar;


    // =====================================================
    // CONSTRUCTOR
    // =====================================================

    public NguoiDungService(
            NguoiDungRepository nguoiDungRepository,
            VaiTroRepository vaiTroRepository,
            PasswordEncoder passwordEncoder,
            AuditLogService auditLogService,
            ThongBaoService thongBaoService
    ) {
        this.nguoiDungRepository = nguoiDungRepository;
        this.vaiTroRepository = vaiTroRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditLogService = auditLogService;
        this.thongBaoService = thongBaoService;
    }


    // =====================================================
    // GET ALL
    // =====================================================

    public List<UserResponse> getAll() {

        return nguoiDungRepository
                .findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }


    // =====================================================
    // GET BY ID
    // =====================================================

    public UserResponse getById(Integer id) {

        NguoiDung nguoiDung =
                nguoiDungRepository
                        .findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Không tìm thấy tài khoản"
                                )
                        );

        return toResponse(nguoiDung);
    }


    // =====================================================
    // CREATE
    // =====================================================

    @Transactional
    public UserResponse create(
            UserRequest request,
            HttpServletRequest httpRequest
    ) {

        // =================================================
        // KIỂM TRA DỮ LIỆU
        // =================================================

        if (request == null) {

            throw new RuntimeException(
                    "Dữ liệu tài khoản không hợp lệ."
            );
        }


        // =================================================
        // KIỂM TRA TÊN ĐĂNG NHẬP
        // =================================================

        if (request.getTenDangNhap() == null
                || request.getTenDangNhap().isBlank()) {

            throw new RuntimeException(
                    "Tên đăng nhập không được để trống."
            );
        }


        if (nguoiDungRepository
                .existsByTenDangNhap(
                        request.getTenDangNhap()
                )) {

            throw new RuntimeException(
                    "Tên đăng nhập đã tồn tại"
            );
        }


        // =================================================
        // KIỂM TRA EMAIL
        // =================================================

        if (request.getEmail() != null
                && !request.getEmail().isBlank()
                && nguoiDungRepository.existsByEmail(
                request.getEmail()
        )) {

            throw new RuntimeException(
                    "Email đã tồn tại"
            );
        }


        // =================================================
        // KIỂM TRA VAI TRÒ
        // =================================================

        if (request.getMaVaiTro() == null) {

            throw new RuntimeException(
                    "Vui lòng chọn vai trò."
            );
        }


        VaiTro vaiTro =
                vaiTroRepository
                        .findById(
                                request.getMaVaiTro()
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Không tìm thấy vai trò"
                                )
                        );


        // =================================================
        // KIỂM TRA MẬT KHẨU
        // =================================================

        if (request.getMatKhau() == null
                || request.getMatKhau().isBlank()) {

            throw new RuntimeException(
                    "Mật khẩu không được để trống."
            );
        }


        // =================================================
        // TẠO ENTITY
        // =================================================

        NguoiDung nguoiDung =
                new NguoiDung();

        nguoiDung.setVaiTro(vaiTro);

        nguoiDung.setTenDangNhap(
                request.getTenDangNhap().trim()
        );

        nguoiDung.setHoTen(
                request.getHoTen()
        );

        nguoiDung.setEmail(
                request.getEmail()
        );

        nguoiDung.setSoDienThoai(
                request.getSoDienThoai()
        );


        // =================================================
        // MẬT KHẨU
        // =================================================

        nguoiDung.setMatKhau(
                passwordEncoder.encode(
                        request.getMatKhau()
                )
        );


        // =================================================
        // AVATAR
        // =================================================

        if (request.getAnhDaiDien() == null
                || request.getAnhDaiDien().isBlank()) {

            nguoiDung.setAnhDaiDien(
                    defaultAvatar
            );

        } else {

            nguoiDung.setAnhDaiDien(
                    request.getAnhDaiDien()
            );
        }


        // =================================================
        // TRẠNG THÁI
        // =================================================

        if (request.getTrangThai() == null) {

            nguoiDung.setTrangThai(true);

        } else {

            nguoiDung.setTrangThai(
                    request.getTrangThai()
            );
        }


        // =================================================
        // SAVE DATABASE
        // =================================================

        NguoiDung saved =
                nguoiDungRepository.save(
                        nguoiDung
                );


        // =================================================
        // AUDIT LOG
        // =================================================

        auditLogService.log(
                "Thêm",
                "Tài khoản",
                String.valueOf(
                        saved.getMaNguoiDung()
                ),
                "Thêm tài khoản: "
                        + saved.getTenDangNhap(),
                httpRequest
        );


        // =================================================
        // THÔNG BÁO
        // =================================================

        thongBaoService.taoThongBaoTheoVaiTro(
                List.of("ADMIN"),
                "Tài khoản mới được tạo",
                "Tài khoản \""
                        + saved.getTenDangNhap()
                        + "\" đã được tạo trong hệ thống.",
                "TAI_KHOAN"
        );


        return toResponse(saved);
    }


    // =====================================================
    // UPDATE
    // =====================================================

    @Transactional
    public UserResponse update(
            Integer id,
            UserRequest request,
            HttpServletRequest httpRequest
    ) {

        // =================================================
        // KIỂM TRA DỮ LIỆU
        // =================================================

        if (request == null) {

            throw new RuntimeException(
                    "Dữ liệu tài khoản không hợp lệ."
            );
        }


        // =================================================
        // TÌM TÀI KHOẢN
        // =================================================

        NguoiDung nguoiDung =
                nguoiDungRepository
                        .findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Không tìm thấy tài khoản"
                                )
                        );


        // =================================================
        // VAI TRÒ
        // =================================================
        // Nếu request có MaVaiTro thì mới cập nhật.
        // Profile cá nhân không gửi MaVaiTro
        // thì giữ nguyên vai trò cũ.

        if (request.getMaVaiTro() != null) {

            VaiTro vaiTro =
                    vaiTroRepository
                            .findById(
                                    request.getMaVaiTro()
                            )
                            .orElseThrow(() ->
                                    new RuntimeException(
                                            "Không tìm thấy vai trò"
                                    )
                            );

            nguoiDung.setVaiTro(
                    vaiTro
            );
        }


        // =================================================
        // THÔNG TIN CÁ NHÂN
        // =================================================

        if (request.getHoTen() != null
                && !request.getHoTen().isBlank()) {

            nguoiDung.setHoTen(
                    request.getHoTen().trim()
            );
        }


        // =================================================
        // EMAIL
        // =================================================

        if (request.getEmail() != null
                && !request.getEmail().isBlank()) {

            String EmailMoi =
                    request.getEmail().trim();

            String EmailCu =
                    nguoiDung.getEmail() == null
                            ? ""
                            : nguoiDung.getEmail().trim();

            // Chỉ kiểm tra trùng nếu email thực sự thay đổi
            if (!EmailMoi.equalsIgnoreCase(EmailCu)) {

                boolean EmailDaTonTai =
                        nguoiDungRepository
                                .existsByEmail(EmailMoi);

                if (EmailDaTonTai) {

                    throw new RuntimeException(
                            "Email đã tồn tại."
                    );
                }
            }

            nguoiDung.setEmail(
                    EmailMoi
            );
        }


        // =================================================
        // SỐ ĐIỆN THOẠI
        // =================================================

        if (request.getSoDienThoai() != null
                && !request.getSoDienThoai().isBlank()) {

            nguoiDung.setSoDienThoai(
                    request.getSoDienThoai().trim()
            );
        }


        // =================================================
        // AVATAR
        // =================================================

        if (request.getAnhDaiDien() != null
                && !request.getAnhDaiDien().isBlank()) {

            nguoiDung.setAnhDaiDien(
                    request.getAnhDaiDien()
            );
        }


        // =================================================
        // TRẠNG THÁI
        // =================================================

        if (request.getTrangThai() != null) {

            nguoiDung.setTrangThai(
                    request.getTrangThai()
            );
        }


        // =================================================
        // MẬT KHẨU
        // =================================================

        if (request.getMatKhau() != null
                && !request.getMatKhau().isBlank()) {

            if (request.getMatKhau().length() < 8) {

                throw new RuntimeException(
                        "Mật khẩu mới phải có ít nhất 8 ký tự."
                );
            }

            nguoiDung.setMatKhau(
                    passwordEncoder.encode(
                            request.getMatKhau()
                    )
            );
        }


        // =================================================
        // SAVE DATABASE
        // =================================================

        NguoiDung saved =
                nguoiDungRepository.save(
                        nguoiDung
                );


        // =================================================
        // AUDIT LOG
        // =================================================

        auditLogService.log(
                "Sửa",
                "Tài khoản",
                String.valueOf(
                        saved.getMaNguoiDung()
                ),
                "Sửa tài khoản: "
                        + saved.getTenDangNhap(),
                httpRequest
        );


        // =================================================
        // THÔNG BÁO CHO CHÍNH TÀI KHOẢN
        // =================================================
        //
        // Khi:
        // - Đổi ảnh
        // - Đổi họ tên
        // - Đổi email
        // - Đổi số điện thoại
        // - Đổi vai trò
        // - Đổi trạng thái
        //
        // đều tạo thông báo cho chính tài khoản.
        //
        // ThongBaoService sẽ xử lý việc gửi WebSocket
        // để chuông có thể cập nhật số chưa đọc.

        thongBaoService.taoThongBao(
                saved.getMaNguoiDung(),
                "Thông tin tài khoản được cập nhật",
                "Thông tin hồ sơ của bạn đã được cập nhật thành công.",
                "TAI_KHOAN"
        );


        return toResponse(saved);
    }


    // =====================================================
    // DELETE
    // =====================================================

    @Transactional
    public void delete(
            Integer id,
            HttpServletRequest httpRequest
    ) {

        // =================================================
        // TÌM TÀI KHOẢN
        // =================================================

        NguoiDung nguoiDung =
                nguoiDungRepository
                        .findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Không tìm thấy tài khoản"
                                )
                        );


        // =================================================
        // LƯU THÔNG TIN TRƯỚC KHI XÓA
        // =================================================

        String tenDangNhap =
                nguoiDung.getTenDangNhap();


        // =================================================
        // XÓA
        // =================================================

        nguoiDungRepository.delete(
                nguoiDung
        );


        // =================================================
        // AUDIT LOG
        // =================================================

        auditLogService.log(
                "Xóa",
                "Tài khoản",
                String.valueOf(id),
                "Xóa tài khoản: "
                        + tenDangNhap,
                httpRequest
        );


        // =================================================
        // THÔNG BÁO
        // =================================================

        thongBaoService.taoThongBaoTheoVaiTro(
                List.of("ADMIN"),
                "Tài khoản đã bị xóa",
                "Tài khoản \""
                        + tenDangNhap
                        + "\" đã được xóa khỏi hệ thống.",
                "TAI_KHOAN"
        );
    }


    // =====================================================
    // ENTITY -> RESPONSE
    // =====================================================

    private UserResponse toResponse(
            NguoiDung nguoiDung
    ) {

        UserResponse response =
                new UserResponse();


        response.setMaNguoiDung(
                nguoiDung.getMaNguoiDung()
        );

        response.setTenDangNhap(
                nguoiDung.getTenDangNhap()
        );

        response.setHoTen(
                nguoiDung.getHoTen()
        );

        response.setEmail(
                nguoiDung.getEmail()
        );

        response.setSoDienThoai(
                nguoiDung.getSoDienThoai()
        );

        response.setAnhDaiDien(
                nguoiDung.getAnhDaiDien()
        );

        response.setTrangThai(
                nguoiDung.getTrangThai()
        );


        if (nguoiDung.getVaiTro() != null) {

            response.setMaVaiTro(
                    nguoiDung
                            .getVaiTro()
                            .getMaVaiTro()
            );

            response.setTenVaiTro(
                    nguoiDung
                            .getVaiTro()
                            .getTenVaiTro()
            );
        }


        return response;
    }


    // =====================================================
    // CHANGE PASSWORD
    // =====================================================

    @Transactional
    public void changePassword(
            Integer id,
            String matKhauCu,
            String matKhauMoi,
            HttpServletRequest httpRequest
    ) {

        // =================================================
        // TÌM NGƯỜI DÙNG
        // =================================================

        NguoiDung nguoiDung =
                nguoiDungRepository
                        .findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Không tìm thấy người dùng."
                                )
                        );


        // =================================================
        // KIỂM TRA MẬT KHẨU CŨ
        // =================================================

        if (matKhauCu == null
                || matKhauCu.isBlank()) {

            throw new RuntimeException(
                    "Mật khẩu cũ không được để trống."
            );
        }


        if (!passwordEncoder.matches(
                matKhauCu,
                nguoiDung.getMatKhau()
        )) {

            throw new RuntimeException(
                    "Mật khẩu cũ không chính xác."
            );
        }


        // =================================================
        // KIỂM TRA MẬT KHẨU MỚI
        // =================================================

        if (matKhauMoi == null
                || matKhauMoi.isBlank()) {

            throw new RuntimeException(
                    "Mật khẩu mới không được để trống."
            );
        }


        if (matKhauMoi.length() < 8) {

            throw new RuntimeException(
                    "Mật khẩu mới phải có ít nhất 8 ký tự."
            );
        }


        if (!matKhauMoi.matches(
                ".*[A-Z].*"
        )) {

            throw new RuntimeException(
                    "Mật khẩu mới phải có ít nhất 1 chữ hoa."
            );
        }


        if (!matKhauMoi.matches(
                ".*[a-z].*"
        )) {

            throw new RuntimeException(
                    "Mật khẩu mới phải có ít nhất 1 chữ thường."
            );
        }


        if (!matKhauMoi.matches(
                ".*\\d.*"
        )) {

            throw new RuntimeException(
                    "Mật khẩu mới phải có ít nhất 1 chữ số."
            );
        }


        // =================================================
        // KHÔNG CHO DÙNG LẠI MẬT KHẨU CŨ
        // =================================================

        if (passwordEncoder.matches(
                matKhauMoi,
                nguoiDung.getMatKhau()
        )) {

            throw new RuntimeException(
                    "Mật khẩu mới phải khác mật khẩu cũ."
            );
        }


        // =================================================
        // MÃ HÓA MẬT KHẨU MỚI
        // =================================================

        nguoiDung.setMatKhau(
                passwordEncoder.encode(
                        matKhauMoi
                )
        );


        // =================================================
        // SAVE DATABASE
        // =================================================

        NguoiDung saved =
                nguoiDungRepository.save(
                        nguoiDung
                );


        // =================================================
        // AUDIT LOG
        // =================================================

        auditLogService.log(
                "Đổi mật khẩu",
                "Tài khoản",
                String.valueOf(
                        saved.getMaNguoiDung()
                ),
                "Đổi mật khẩu tài khoản: "
                        + saved.getTenDangNhap(),
                httpRequest
        );


        // =================================================
        // THÔNG BÁO CHO CHÍNH NGƯỜI DÙNG
        // =================================================

        thongBaoService.taoThongBao(
                saved.getMaNguoiDung(),
                "Mật khẩu đã được thay đổi",
                "Mật khẩu tài khoản của bạn đã được thay đổi thành công. "
                        + "Nếu bạn không thực hiện thao tác này, "
                        + "hãy liên hệ quản trị viên ngay.",
                "BAO_MAT"
        );
    }
}