package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.TiepNhanHoSoCaNhanDTO;
import QuanLyBenhVien.Security.CustomUserDetails;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.regex.Pattern;

@Service
public class TiepNhanHoSoCaNhanService {

    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private static final Pattern PHONE_PATTERN =
            Pattern.compile("^\\+?[0-9]{9,14}$");

    private final JdbcTemplate jdbcTemplate;

    public TiepNhanHoSoCaNhanService(
            JdbcTemplate jdbcTemplate
    ) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // =====================================================
    // ĐỌC HỒ SƠ CỦA NGƯỜI ĐANG ĐĂNG NHẬP
    // =====================================================

    @Transactional(readOnly = true)
    public TiepNhanHoSoCaNhanDTO layHoSo(
            Authentication authentication
    ) {
        String tenDangNhap = layTenDangNhap(authentication);

        return docHoSo(tenDangNhap, false);
    }

    // =====================================================
    // CẬP NHẬT HỒ SƠ CÁ NHÂN
    // =====================================================

    @Transactional
    public TiepNhanHoSoCaNhanDTO capNhatHoSo(
            Authentication authentication,
            TiepNhanHoSoCaNhanDTO.CapNhatRequest request
    ) {
        String tenDangNhap = layTenDangNhap(authentication);

        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Vui lòng cung cấp thông tin cần cập nhật."
            );
        }

        String hoTen = chuanHoa(request.hoTen());
        String email = chuanHoa(request.email());
        String soDienThoai = chuanHoa(request.soDienThoai());

        // Kiểm tra họ tên.
        if (hoTen == null || hoTen.length() > 255) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Họ tên phải có từ 1 đến 255 ký tự."
            );
        }

        // Email được phép bỏ trống.
        if (
                email != null
                        && (
                        email.length() > 255
                                || !EMAIL_PATTERN.matcher(email).matches()
                )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Email không hợp lệ."
            );
        }

        // Số điện thoại được phép bỏ trống.
        if (
                soDienThoai != null
                        && !PHONE_PATTERN.matcher(soDienThoai).matches()
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Số điện thoại cần có 9–14 chữ số, "
                            + "có thể bắt đầu bằng dấu +."
            );
        }

        // Khóa tài khoản đang cập nhật và kiểm tra lại quyền.
        TiepNhanHoSoCaNhanDTO hienTai =
                docHoSo(tenDangNhap, true);

        // Kiểm tra email đã thuộc tài khoản khác hay chưa.
        if (email != null) {
            Long soTaiKhoanTrungEmail =
                    jdbcTemplate.queryForObject(
                            """
                            SELECT COUNT(*)
                            FROM nguoidung
                            WHERE Email = ?
                              AND MaNguoiDung <> ?
                            """,
                            Long.class,
                            email,
                            hienTai.maNguoiDung()
                    );

            if (
                    soTaiKhoanTrungEmail != null
                            && soTaiKhoanTrungEmail > 0
            ) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Email này đã được tài khoản khác sử dụng."
                );
            }
        }

        try {
            // Chỉ cập nhật ba trường được phép chỉnh sửa.
            jdbcTemplate.update(
                    """
                    UPDATE nguoidung
                    SET HoTen = ?,
                        Email = ?,
                        SoDienThoai = ?
                    WHERE MaNguoiDung = ?
                    """,
                    hoTen,
                    email,
                    soDienThoai,
                    hienTai.maNguoiDung()
            );
        } catch (DuplicateKeyException exception) {
            // Xử lý trường hợp hai tài khoản lưu cùng email
            // vào cùng thời điểm.
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Email này đã được tài khoản khác sử dụng."
            );
        }

        // Trả lại thông tin thực tế vừa lưu trong database.
        return docHoSo(tenDangNhap, false);
    }

    // =====================================================
    // XÁC ĐỊNH TÀI KHOẢN TỪ AUTHENTICATION
    // =====================================================

    private String layTenDangNhap(
            Authentication authentication
    ) {
        if (
                authentication == null
                        || !authentication.isAuthenticated()
                        || authentication
                        instanceof AnonymousAuthenticationToken
        ) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Bạn cần đăng nhập để xem hồ sơ cá nhân."
            );
        }

        if (
                !(authentication.getPrincipal()
                        instanceof CustomUserDetails userDetails)
        ) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Không xác định được tài khoản đăng nhập. "
                            + "Vui lòng đăng nhập lại."
            );
        }

        boolean coQuyen = authentication
                .getAuthorities()
                .stream()
                .anyMatch(authority ->
                        "ROLE_TIEPNHAN".equals(
                                authority.getAuthority()
                        )
                );

        if (!coQuyen) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Tài khoản không có quyền nhân viên tiếp nhận."
            );
        }

        String tenDangNhap = userDetails.getUsername();

        if (
                tenDangNhap == null
                        || tenDangNhap.isBlank()
        ) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Không xác định được tên đăng nhập. "
                            + "Vui lòng đăng nhập lại."
            );
        }

        return tenDangNhap;
    }

    // =====================================================
    // TRUY VẤN HỒ SƠ VÀ KIỂM TRA QUYỀN TRONG DATABASE
    // =====================================================

    private TiepNhanHoSoCaNhanDTO docHoSo(
            String tenDangNhap,
            boolean khoaBanGhi
    ) {
        String sql = """
                SELECT nd.MaNguoiDung,
                       nd.TenDangNhap,
                       nd.HoTen,
                       nd.Email,
                       nd.SoDienThoai,
                       nd.AnhDaiDien
                FROM nguoidung nd
                JOIN vaitro vt
                     ON vt.MaVaiTro = nd.MaVaiTro
                WHERE nd.TenDangNhap = ?
                  AND nd.TrangThai = 1
                  AND vt.TenVaiTro = 'TIEPNHAN'
                """;

        if (khoaBanGhi) {
            sql += " FOR UPDATE";
        }

        List<TiepNhanHoSoCaNhanDTO> danhSach =
                jdbcTemplate.query(
                        sql,
                        (rs, rowNum) ->
                                new TiepNhanHoSoCaNhanDTO(
                                        rs.getInt("MaNguoiDung"),
                                        rs.getString("TenDangNhap"),
                                        rs.getString("HoTen"),
                                        rs.getString("Email"),
                                        rs.getString("SoDienThoai"),
                                        rs.getString("AnhDaiDien")
                                ),
                        tenDangNhap
                );

        if (danhSach.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Tài khoản đã bị khóa "
                            + "hoặc không còn quyền tiếp nhận."
            );
        }

        return danhSach.get(0);
    }

    // =====================================================
    // CHUẨN HÓA CHUỖI NHẬP
    // =====================================================

    private String chuanHoa(String value) {
        if (value == null) {
            return null;
        }

        String ketQua = value.trim();

        return ketQua.isEmpty() ? null : ketQua;
    }
}