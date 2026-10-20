package QuanLyBenhVien.Service;

import QuanLyBenhVien.Security.CustomUserDetails;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Service
public class TiepNhanPhanCongService {

    private static final ZoneId MUI_GIO_VIET_NAM =
            ZoneId.of("Asia/Ho_Chi_Minh");

    private final JdbcTemplate jdbcTemplate;

    public TiepNhanPhanCongService(
            JdbcTemplate jdbcTemplate
    ) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /*
     * Lấy ca trực hiện tại của nhân viên đang đăng nhập.
     *
     * Ca có hiệu lực khi:
     * - Chưa bị hủy.
     * - Thời gian hiện tại >= thời gian bắt đầu.
     * - Thời gian hiện tại < thời gian kết thúc.
     */
    @Transactional(readOnly = true)
    public CaTrucHienTai layCaTrucHienTai(
            Authentication authentication
    ) {
        TaiKhoanTiepNhan taiKhoan =
                layTaiKhoanTiepNhan(authentication);

        LocalDateTime hienTai =
                LocalDateTime.now(MUI_GIO_VIET_NAM);

        String sql = """
                SELECT
                    pc.MaPhanCong,
                    pc.MaNhanVienTiepNhan,
                    pc.MaKhoa,
                    k.TenKhoa,
                    pc.ThoiGianBatDau,
                    pc.ThoiGianKetThuc
                FROM phancongtiepnhan pc
                JOIN khoa k
                  ON k.MaKhoa = pc.MaKhoa
                WHERE pc.MaNhanVienTiepNhan = ?
                  AND pc.TrangThai = 1
                  AND pc.ThoiGianBatDau <= ?
                  AND pc.ThoiGianKetThuc > ?
                ORDER BY
                    pc.ThoiGianBatDau,
                    pc.MaPhanCong
                LIMIT 2
                """;

        List<CaTrucHienTai> danhSach =
                jdbcTemplate.query(
                        sql,
                        (rs, rowNum) -> new CaTrucHienTai(
                                rs.getInt("MaPhanCong"),
                                rs.getInt("MaNhanVienTiepNhan"),
                                taiKhoan.tenDangNhap(),
                                taiKhoan.hoTen(),
                                rs.getInt("MaKhoa"),
                                rs.getString("TenKhoa"),
                                rs.getObject(
                                        "ThoiGianBatDau",
                                        LocalDateTime.class
                                ),
                                rs.getObject(
                                        "ThoiGianKetThuc",
                                        LocalDateTime.class
                                )
                        ),
                        taiKhoan.maNguoiDung(),
                        hienTai,
                        hienTai
                );

        if (danhSach.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Bạn chưa được phân công ca tiếp nhận hiện tại."
            );
        }

        // Không tự chọn một ca bất kỳ nếu có ca trùng giờ.
        if (danhSach.size() > 1) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Tài khoản đang có nhiều ca tiếp nhận trùng giờ. "
                            + "Vui lòng liên hệ admin để điều chỉnh phân công."
            );
        }

        return danhSach.get(0);
    }

    /*
     * Kiểm tra lịch khám có thuộc khoa đang phụ trách không.
     *
     * Điều kiện ngày khám, số đo và trạng thái
     * sẽ được kiểm tra thêm trong nghiệp vụ tương ứng.
     */
    @Transactional(readOnly = true)
    public CaTrucHienTai kiemTraQuyenVoiLichKham(
            Authentication authentication,
            Integer maLichKham
    ) {
        if (maLichKham == null || maLichKham <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Mã lịch khám không hợp lệ."
            );
        }

        CaTrucHienTai caTruc =
                layCaTrucHienTai(authentication);

        String sql = """
                SELECT MaKhoa
                FROM lichdangkykham
                WHERE MaLichKham = ?
                """;

        List<Integer> danhSachKhoa =
                jdbcTemplate.query(
                        sql,
                        (rs, rowNum) -> rs.getInt("MaKhoa"),
                        maLichKham
                );

        if (danhSachKhoa.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy lịch khám."
            );
        }

        if (!caTruc.maKhoa().equals(danhSachKhoa.get(0))) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Lịch khám không thuộc khoa bạn đang được phân công."
            );
        }

        return caTruc;
    }

    /*
     * Xác định nhân viên từ tài khoản đã được
     * Spring Security xác thực.
     */
    private TaiKhoanTiepNhan layTaiKhoanTiepNhan(
            Authentication authentication
    ) {
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Bạn cần đăng nhập để sử dụng chức năng tiếp nhận."
            );
        }

        if (!(authentication.getPrincipal()
                instanceof CustomUserDetails userDetails)) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Không xác định được tài khoản đăng nhập. "
                            + "Vui lòng đăng nhập lại."
            );
        }

        boolean coQuyen = authentication.getAuthorities()
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

        String tenDangNhap =
                userDetails.getUsername();

        if (tenDangNhap == null || tenDangNhap.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Không xác định được tên đăng nhập. "
                            + "Vui lòng đăng nhập lại."
            );
        }

        /*
         * Kiểm tra lại trạng thái và vai trò trong database.
         * Không chỉ dựa vào thông tin của phiên đăng nhập cũ.
         */
        String sql = """
                SELECT
                    nd.MaNguoiDung,
                    nd.TenDangNhap,
                    nd.HoTen
                FROM nguoidung nd
                JOIN vaitro vt
                  ON vt.MaVaiTro = nd.MaVaiTro
                WHERE nd.TenDangNhap = ?
                  AND nd.TrangThai = 1
                  AND vt.TenVaiTro = 'TIEPNHAN'
                """;

        List<TaiKhoanTiepNhan> danhSach =
                jdbcTemplate.query(
                        sql,
                        (rs, rowNum) -> new TaiKhoanTiepNhan(
                                rs.getInt("MaNguoiDung"),
                                rs.getString("TenDangNhap"),
                                rs.getString("HoTen")
                        ),
                        tenDangNhap
                );

        if (danhSach.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Tài khoản đã bị khóa hoặc không còn quyền tiếp nhận."
            );
        }

        return danhSach.get(0);
    }

    /*
     * Thông tin ca trực trả về cho các chức năng tiếp nhận.
     */
    public record CaTrucHienTai(
            Integer maPhanCong,
            Integer maNhanVienTiepNhan,
            String tenDangNhap,
            String hoTen,
            Integer maKhoa,
            String tenKhoa,
            LocalDateTime thoiGianBatDau,
            LocalDateTime thoiGianKetThuc
    ) {
    }

    /*
     * Thông tin tài khoản dùng nội bộ trong service.
     */
    private record TaiKhoanTiepNhan(
            Integer maNguoiDung,
            String tenDangNhap,
            String hoTen
    ) {
    }
}