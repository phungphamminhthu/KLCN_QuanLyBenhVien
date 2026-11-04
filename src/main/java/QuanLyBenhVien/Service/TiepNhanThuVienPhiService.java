
package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.TiepNhanHoaDonDTO;
import QuanLyBenhVien.DTO.TiepNhanHoaDonDTO.HoaDonItemDTO;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;

@Service
public class TiepNhanThuVienPhiService {

    private final JdbcTemplate jdbcTemplate;
    private final TiepNhanHoaDonService hoaDonService;

    public TiepNhanThuVienPhiService(
            JdbcTemplate jdbcTemplate,
            TiepNhanHoaDonService hoaDonService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.hoaDonService = hoaDonService;
    }

    public record KetQuaThuTien(
            boolean success,
            Integer maHoaDon,
            Integer maThanhToan,
            Integer maNguoiThu,
            String tenNguoiThu,
            BigDecimal soTien,
            String trangThaiHoaDon,
            String message
    ) {}

    private record HoaDonRow(
            Integer maHoaDon,
            Integer maLichKham,
            String loaiHoaDon,
            String trangThai,
            BigDecimal tongTien
    ) {}

    private record NguoiThuRow(
            Integer maNguoiDung,
            String hoTen
    ) {}

    // =====================================================
    // THU TIỀN MẶT
    // =====================================================

    @Transactional(
            rollbackFor = Exception.class,
            isolation = Isolation.READ_COMMITTED
    )
    public KetQuaThuTien thuTienMat(
            Integer maHoaDon,
            Authentication authentication
    ) {
        kiemTraQuyen(authentication);

        if (maHoaDon == null || maHoaDon <= 0) {
            throw loi(
                    HttpStatus.BAD_REQUEST,
                    "Mã hóa đơn không hợp lệ."
            );
        }

        // 1. Lấy nhân viên thực tế đăng nhập.
        NguoiThuRow nguoiThu =
                layNguoiThu(authentication);

        // 2. Khóa hóa đơn để tránh hai yêu cầu
        // cùng thu một hóa đơn.
        List<HoaDonRow> rows = jdbcTemplate.query(
                """
                SELECT
                    MaHoaDon,
                    MaLichKham,
                    LoaiHoaDon,
                    TrangThai,
                    TongTien
                FROM HoaDon
                WHERE MaHoaDon = ?
                FOR UPDATE
                """,
                (rs, rowNum) -> new HoaDonRow(
                        rs.getInt("MaHoaDon"),
                        rs.getInt("MaLichKham"),
                        rs.getString("LoaiHoaDon"),
                        rs.getString("TrangThai"),
                        rs.getBigDecimal("TongTien")
                ),
                maHoaDon
        );

        if (rows.isEmpty()) {
            throw loi(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy hóa đơn."
            );
        }

        HoaDonRow hoaDon = rows.get(0);

        if (!"PhiKham".equals(hoaDon.loaiHoaDon())
                && !"CanLamSang".equals(hoaDon.loaiHoaDon())) {
            throw loi(
                    HttpStatus.BAD_REQUEST,
                    "Chỉ hỗ trợ thu phí khám và phí cận lâm sàng."
            );
        }

        if (!"ChuaThanhToan".equals(
                hoaDon.trangThai()
        )) {
            throw loi(
                    HttpStatus.CONFLICT,
                    "Hóa đơn không còn ở trạng thái chưa thanh toán. "
                            + "Vui lòng tải lại viện phí."
            );
        }

        BigDecimal tongTien = hoaDon.tongTien();

        if (tongTien == null
                || tongTien.compareTo(BigDecimal.ZERO) <= 0) {
            throw loi(
                    HttpStatus.CONFLICT,
                    "Số tiền hóa đơn không hợp lệ."
            );
        }

        // 3. Kiểm tra quyền phân công, ngày khám,
        // chi tiết hóa đơn, trạng thái và cảnh báo.
        // Đây là Service đang được popup viện phí sử dụng.
        TiepNhanHoaDonDTO vienPhi =
                hoaDonService.layDanhSachHoaDon(
                        hoaDon.maLichKham(),
                        authentication
                );

        HoaDonItemDTO thongTinHoaDon =
                vienPhi.danhSachHoaDon()
                        .stream()
                        .filter(item ->
                                maHoaDon.equals(item.maHoaDon())
                        )
                        .findFirst()
                        .orElseThrow(() -> loi(
                                HttpStatus.NOT_FOUND,
                                "Hóa đơn không thuộc lịch khám."
                        ));

        if (!thongTinHoaDon.choPhepThanhToan()) {
            throw loi(
                    HttpStatus.CONFLICT,
                    "Hóa đơn chưa đủ điều kiện thu tiền. "
                            + (
                            thongTinHoaDon.thongBao() == null
                                    ? ""
                                    : thongTinHoaDon.thongBao()
                    )
            );
        }

        if (thongTinHoaDon.daThanhToan()
                .compareTo(BigDecimal.ZERO) != 0) {
            throw loi(
                    HttpStatus.CONFLICT,
                    "Hóa đơn đã có tiền thu trước đó. "
                            + "Cần kiểm tra trước khi thu thêm."
            );
        }

        if (thongTinHoaDon.conPhaiThu()
                .compareTo(tongTien) != 0) {
            throw loi(
                    HttpStatus.CONFLICT,
                    "Số tiền còn thu không khớp tổng hóa đơn."
            );
        }

        // 4. Kiểm tra chi tiết khoản thu.
        BigDecimal tongChiTiet =
                jdbcTemplate.queryForObject(
                        """
                        SELECT COALESCE(
                            SUM(ThanhTien), 0
                        )
                        FROM CTHoaDon
                        WHERE MaHoaDon = ?
                        """,
                        BigDecimal.class,
                        maHoaDon
                );

        if (tongChiTiet == null
                || tongChiTiet.compareTo(tongTien) != 0) {
            throw loi(
                    HttpStatus.CONFLICT,
                    "Tổng chi tiết không khớp tổng hóa đơn. "
                            + "Cần đối soát."
            );
        }

        // 5. Chống thu trùng.
        // ThanhCong là trạng thái thanh toán
        // thực tế database nhóm đang sử dụng.
        // Giao dịch đang xử lý cũng không được thu lại.
        Long soGiaoDichKhongThatBai =
                jdbcTemplate.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM ThanhToan
                        WHERE MaHoaDon = ?
                          AND (
                              TrangThai IS NULL
                              OR TrangThai <> 'ThatBai'
                          )
                        """,
                        Long.class,
                        maHoaDon
                );

        if (soGiaoDichKhongThatBai != null
                && soGiaoDichKhongThatBai > 0) {
            throw loi(
                    HttpStatus.CONFLICT,
                    "Hóa đơn đã có giao dịch thanh toán "
                            + "hoặc giao dịch đang xử lý. "
                            + "Không được thu trùng."
            );
        }

        // 6. Tạo giao dịch với giá trị ĐÚNG
        // CHECK constraint trong MySQL:
        //
        // PhuongThucThanhToan = 'Tiền mặt'
        // TrangThai = 'ThanhCong'
        //
        // MaNguoiThu lấy từ tài khoản đăng nhập.
        KeyHolder keyHolder = new GeneratedKeyHolder();

        int inserted = jdbcTemplate.update(
                connection -> {
                    PreparedStatement ps =
                            connection.prepareStatement(
                                    """
                                    INSERT INTO ThanhToan (
                                        MaHoaDon,
                                        MaNguoiThu,
                                        NgayThanhToan,
                                        SoTien,
                                        PhuongThucThanhToan,
                                        TrangThai,
                                        MaGiaoDich
                                    )
                                    VALUES (
                                        ?, ?, NOW(), ?,
                                        'Tiền mặt',
                                        'ThanhCong',
                                        NULL
                                    )
                                    """,
                                    Statement.RETURN_GENERATED_KEYS
                            );

                    ps.setInt(1, maHoaDon);
                    ps.setInt(2, nguoiThu.maNguoiDung());
                    ps.setBigDecimal(3, tongTien);

                    return ps;
                },
                keyHolder
        );

        if (inserted != 1
                || keyHolder.getKey() == null) {
            throw loi(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Không tạo được giao dịch thanh toán."
            );
        }

        Integer maThanhToan =
                keyHolder.getKey().intValue();

        // 7. Trạng thái HÓA ĐƠN là DaThanhToan.
        // Khác với ThanhToan.TrangThai = ThanhCong.
        int updated = jdbcTemplate.update(
                """
                UPDATE HoaDon
                SET TrangThai = 'DaThanhToan'
                WHERE MaHoaDon = ?
                  AND TrangThai = 'ChuaThanhToan'
                """,
                maHoaDon
        );

        if (updated != 1) {
            throw loi(
                    HttpStatus.CONFLICT,
                    "Không cập nhật được trạng thái hóa đơn."
            );
        }

        // 8. Nếu thu tiền hóa đơn CLS thành công,
// chuyển lịch khám và tiếp nhận sang ChoCLS.
// Hóa đơn PhiKham không thay đổi trạng thái lịch khám.
        if ("CanLamSang".equals(hoaDon.loaiHoaDon())) {

            // Lịch khám có thể đã là ChoCLS (ví dụ dữ liệu
            // hiện tại), hoặc vẫn đang ChoThanhToan.
            jdbcTemplate.update(
                    """
                    UPDATE LichDangKyKham
                    SET TrangThai = 'ChoCLS'
                    WHERE MaLichKham = ?
                      AND TrangThai IN ('ChoThanhToan', 'ChoCLS')
                    """,
                    hoaDon.maLichKham()
            );

            // Đồng bộ trạng thái tiếp nhận bệnh nhân.
            jdbcTemplate.update(
                    """
                    UPDATE TiepNhanBenhNhan
                    SET TrangThai = 'ChoCLS'
                    WHERE MaLichKham = ?
                      AND TrangThai IN ('ChoThanhToan', 'ChoCLS')
                    """,
                    hoaDon.maLichKham()
            );
        }

        // Nếu lỗi bất kỳ xảy ra trong transaction,
        // cả INSERT và UPDATE đều được rollback.
        return new KetQuaThuTien(
                true,
                maHoaDon,
                maThanhToan,
                nguoiThu.maNguoiDung(),
                nguoiThu.hoTen(),
                tongTien,
                "DaThanhToan",
                "Đã ghi nhận thu tiền mặt thành công."
        );
    }

    // =====================================================
    // LẤY NGƯỜI THU TỪ DATABASE
    // =====================================================

    private NguoiThuRow layNguoiThu(
            Authentication authentication
    ) {
        String tenDangNhap = authentication.getName();

        if (tenDangNhap == null
                || tenDangNhap.isBlank()) {
            throw loi(
                    HttpStatus.UNAUTHORIZED,
                    "Không xác định được tài khoản đăng nhập."
            );
        }

        List<NguoiThuRow> rows = jdbcTemplate.query(
                """
                SELECT
                    nd.MaNguoiDung,
                    nd.HoTen
                FROM NguoiDung nd
                JOIN VaiTro vt
                    ON vt.MaVaiTro = nd.MaVaiTro
                WHERE nd.TenDangNhap = ?
                  AND nd.TrangThai = 1
                  AND UPPER(vt.TenVaiTro) LIKE '%TIEPNHAN%'
                """,
                (rs, rowNum) -> new NguoiThuRow(
                        rs.getInt("MaNguoiDung"),
                        rs.getString("HoTen")
                ),
                tenDangNhap
        );

        if (rows.size() != 1) {
            throw loi(
                    HttpStatus.FORBIDDEN,
                    "Không xác định được nhân viên tiếp nhận "
                            + "đang đăng nhập."
            );
        }

        return rows.get(0);
    }

    // =====================================================
    // KIỂM TRA VAI TRÒ ĐĂNG NHẬP
    // =====================================================

    private void kiemTraQuyen(
            Authentication authentication
    ) {
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication
                instanceof AnonymousAuthenticationToken) {
            throw loi(
                    HttpStatus.UNAUTHORIZED,
                    "Phiên đăng nhập không hợp lệ."
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
            throw loi(
                    HttpStatus.FORBIDDEN,
                    "Bạn không có quyền thu viện phí."
            );
        }
    }

    private ResponseStatusException loi(
            HttpStatus status,
            String message
    ) {
        return new ResponseStatusException(
                status,
                message
        );
    }
}
