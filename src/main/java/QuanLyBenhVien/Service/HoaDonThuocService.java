package QuanLyBenhVien.Service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class HoaDonThuocService {

    private final JdbcTemplate jdbcTemplate;

    public HoaDonThuocService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private record ChiTietThuoc(
            Integer maCTDonThuoc,
            Integer maThuoc,
            String tenThuoc,
            Integer soLuong,
            BigDecimal donGia
    ) {}

    private record HoaDonCu(
            Integer maHoaDon,
            String trangThai
    ) {}

    /**
     * Tạo hóa đơn thuốc hoặc cập nhật hóa đơn chưa thanh toán
     * theo đơn thuốc hiện tại.
     *
     * @return MaHoaDon để tạo QR thanh toán.
     */
    @Transactional
    public Integer taoHoaDonThuoc(Integer maDonThuoc) {

        if (maDonThuoc == null || maDonThuoc <= 0) {
            throw new IllegalArgumentException(
                    "Mã đơn thuốc không hợp lệ."
            );
        }

        // 1. Khóa đơn thuốc để tránh lập hóa đơn đồng thời.
        List<String> trangThais = jdbcTemplate.query(
                """
                SELECT TrangThai
                FROM DonThuoc
                WHERE MaDonThuoc = ?
                FOR UPDATE
                """,
                (rs, rowNum) -> rs.getString("TrangThai"),
                maDonThuoc
        );

        if (trangThais.isEmpty()) {
            throw new IllegalArgumentException(
                    "Không tìm thấy đơn thuốc."
            );
        }

        String trangThaiDon = trangThais.get(0);

        if (!"ChoLayThuoc".equals(trangThaiDon)
                && !"DangLayThuoc".equals(trangThaiDon)) {
            throw new IllegalStateException(
                    "Đơn thuốc không ở trạng thái được phép lập hóa đơn."
            );
        }

        // 2. Lấy lịch khám và bệnh nhân của đơn thuốc.
        List<int[]> thongTin = jdbcTemplate.query(
                """
                SELECT lk.MaLichKham, lk.MaBenhNhan
                FROM DonThuoc d
                JOIN HoSoBenhAn hs
                    ON hs.MaHoSoBenhAn = d.MaHoSoBenhAn
                JOIN LichDangKyKham lk
                    ON lk.MaLichKham = hs.MaLichKham
                WHERE d.MaDonThuoc = ?
                """,
                (rs, rowNum) -> new int[]{
                        rs.getInt("MaLichKham"),
                        rs.getInt("MaBenhNhan")
                },
                maDonThuoc
        );

        if (thongTin.isEmpty()) {
            throw new IllegalStateException(
                    "Không xác định được bệnh nhân hoặc lịch khám."
            );
        }

        int maLichKham = thongTin.get(0)[0];
        int maBenhNhan = thongTin.get(0)[1];

        // 3. Lấy chi tiết đơn thuốc đã lưu trong CSDL.
        //        List<ChiTietThuoc> chiTiet = jdbcTemplate.query(
        //                """
        //                SELECT
        //                    ct.MaCTDonThuoc,
        //                    ct.MaThuoc,
        //                    t.TenThuoc,
        //                    ct.SoLuong,
        //                    ct.DonGiaBan
        //                FROM CTDonThuoc ct
        //                JOIN Thuoc t ON t.MaThuoc = ct.MaThuoc
        //                WHERE ct.MaDonThuoc = ?
        //                ORDER BY ct.MaCTDonThuoc
        //                """,
        //                (rs, rowNum) -> new ChiTietThuoc(
        //                        rs.getInt("MaCTDonThuoc"),
        //                        rs.getInt("MaThuoc"),
        //                        rs.getString("TenThuoc"),
        //                        rs.getInt("SoLuong"),
        //                        rs.getBigDecimal("DonGiaBan")
        //                ),
        //                maDonThuoc
        //        );

        List<ChiTietThuoc> chiTiet = jdbcTemplate.query(
                """
                SELECT
                    ct.MaCTDonThuoc,
                    COALESCE(
                        ct.MaThuocThucCap,
                        ct.MaThuoc
                    ) AS MaThuocThucCap,
                    t.TenThuoc,
                    ct.SoLuong,
                    CASE
                        WHEN ct.MaThuocThucCap IS NOT NULL
                            THEN t.Gia
                        ELSE ct.DonGiaBan
                    END AS DonGiaThucCap
                FROM CTDonThuoc ct
                JOIN Thuoc t
                    ON t.MaThuoc = COALESCE(
                        ct.MaThuocThucCap,
                        ct.MaThuoc
                    )
                WHERE ct.MaDonThuoc = ?
                ORDER BY ct.MaCTDonThuoc
                """,
                (rs, rowNum) -> new ChiTietThuoc(
                        rs.getInt("MaCTDonThuoc"),
                        rs.getInt("MaThuocThucCap"),
                        rs.getString("TenThuoc"),
                        rs.getInt("SoLuong"),
                        rs.getBigDecimal("DonGiaThucCap")
                ),
                maDonThuoc
        );

        if (chiTiet.isEmpty()) {
            throw new IllegalStateException(
                    "Đơn thuốc chưa có chi tiết thuốc."
            );
        }


        // Kiểm tra thuốc thay thế trước khi lập hoặc cập nhật hóa đơn.
        Integer soThuocThayTheKhongHopLe = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM CTDonThuoc ct
                LEFT JOIN ThuocTuongDuong tt
                    ON tt.MaThuoc = ct.MaThuoc
                   AND tt.MaThuocThayThe = ct.MaThuocThucCap
                   AND tt.TrangThai = 'Đang áp dụng'
                LEFT JOIN Thuoc t
                    ON t.MaThuoc = ct.MaThuocThucCap
                WHERE ct.MaDonThuoc = ?
                  AND ct.MaThuocThucCap IS NOT NULL
                  AND (
                      tt.MaThuocTuongDuong IS NULL
                      OR t.MaThuoc IS NULL
                      OR t.TrangThai <> TRUE
                  )
                """,
                Integer.class,
                maDonThuoc
        );

        if (soThuocThayTheKhongHopLe != null
                && soThuocThayTheKhongHopLe > 0) {
            throw new IllegalStateException(
                    "Có thuốc thay thế không hợp lệ hoặc đã ngừng áp dụng. "
                            + "Vui lòng kiểm tra lại đơn thuốc."
            );
        }


        Set<Integer> daXuLy = new HashSet<>();
        BigDecimal tongTien = BigDecimal.ZERO;

        for (ChiTietThuoc ct : chiTiet) {
            if (ct.maCTDonThuoc() == null
                    || !daXuLy.add(ct.maCTDonThuoc())) {
                throw new IllegalStateException(
                        "Chi tiết đơn thuốc bị trùng hoặc không hợp lệ."
                );
            }

            if (ct.soLuong() == null || ct.soLuong() <= 0) {
                throw new IllegalStateException(
                        "Số lượng thuốc phải lớn hơn 0."
                );
            }

            if (ct.donGia() == null
                    || ct.donGia().compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalStateException(
                        "Đơn giá thuốc không hợp lệ: "
                                + ct.tenThuoc()
                );
            }

            tongTien = tongTien.add(
                    ct.donGia().multiply(
                            BigDecimal.valueOf(ct.soLuong())
                    )
            );
        }

        tongTien = tongTien.setScale(
                2,
                java.math.RoundingMode.HALF_UP
        );

        final BigDecimal tongTienHoaDon = tongTien;

        // 4. Tìm hóa đơn thuốc đã liên kết với đơn này.
        List<HoaDonCu> hoaDonCu = jdbcTemplate.query(
                """
                SELECT DISTINCT
                    hd.MaHoaDon,
                    hd.TrangThai
                FROM HoaDon hd
                JOIN CTHoaDon cth
                    ON cth.MaHoaDon = hd.MaHoaDon
                JOIN CTDonThuoc ct
                    ON ct.MaCTDonThuoc = cth.MaCTDonThuoc
                WHERE ct.MaDonThuoc = ?
                  AND hd.LoaiHoaDon = 'Thuoc'
                ORDER BY hd.MaHoaDon DESC
                """,
                (rs, rowNum) -> new HoaDonCu(
                        rs.getInt("MaHoaDon"),
                        rs.getString("TrangThai")
                ),
                maDonThuoc
        );

        if (hoaDonCu.size() > 1) {
            throw new IllegalStateException(
                    "Đơn thuốc đang liên kết với nhiều hóa đơn thuốc. "
                            + "Cần kiểm tra dữ liệu trước khi tiếp tục."
            );
        }

        Integer maHoaDon;

        if (!hoaDonCu.isEmpty()) {
            HoaDonCu cu = hoaDonCu.get(0);
            maHoaDon = cu.maHoaDon();

            if ("DaThanhToan".equals(cu.trangThai())) {
                throw new IllegalStateException(
                        "Hóa đơn đã thanh toán, không thể lập lại."
                );
            }

            if (!"ChuaThanhToan".equals(cu.trangThai())) {
                throw new IllegalStateException(
                        "Trạng thái hóa đơn không cho phép cập nhật."
                );
            }

            // Không thay đổi hóa đơn nếu đã có bản ghi thanh toán.
            Integer soGiaoDich = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM ThanhToan
                    WHERE MaHoaDon = ?
                    """,
                    Integer.class,
                    maHoaDon
            );

            if (soGiaoDich != null && soGiaoDich > 0) {
                throw new IllegalStateException(
                        "Hóa đơn đã có bản ghi thanh toán. "
                                + "Không thể tự động thay đổi hóa đơn."
                );
            }

            jdbcTemplate.update(
                    """
                    UPDATE HoaDon
                    SET MaBenhNhan = ?,
                        MaLichKham = ?,
                        TongTien = ?,
                        TrangThai = 'ChuaThanhToan',
                        NgayLapHoaDon = CURRENT_TIMESTAMP
                    WHERE MaHoaDon = ?
                      AND TrangThai = 'ChuaThanhToan'
                    """,
                    maBenhNhan,
                    maLichKham,
                    tongTien,
                    maHoaDon
            );

            jdbcTemplate.update(
                    """
                    DELETE FROM CTHoaDon
                    WHERE MaHoaDon = ?
                    """,
                    maHoaDon
            );

        } else {
            // 5. Tạo hóa đơn mới.
            KeyHolder keyHolder = new GeneratedKeyHolder();

            jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement(
                        """
                        INSERT INTO HoaDon (
                            MaBenhNhan,
                            MaLichKham,
                            NgayLapHoaDon,
                            TongTien,
                            TrangThai,
                            LoaiHoaDon
                        )
                        VALUES (?, ?, CURRENT_TIMESTAMP, ?,
                                'ChuaThanhToan', 'Thuoc')
                        """,
                        Statement.RETURN_GENERATED_KEYS
                );

                ps.setInt(1, maBenhNhan);
                ps.setInt(2, maLichKham);
                ps.setBigDecimal(3, tongTienHoaDon);

                return ps;
            }, keyHolder);

            Number generatedKey = keyHolder.getKey();

            if (generatedKey == null) {
                throw new IllegalStateException(
                        "Không lấy được mã hóa đơn vừa tạo."
                );
            }

            maHoaDon = generatedKey.intValue();
        }

        // 6. Lưu các dòng chi tiết hóa đơn.
        for (ChiTietThuoc ct : chiTiet) {
            BigDecimal thanhTien = ct.donGia().multiply(
                    BigDecimal.valueOf(ct.soLuong())
            ).setScale(2, java.math.RoundingMode.HALF_UP);

            jdbcTemplate.update(
                    """
                    INSERT INTO CTHoaDon (
                        MaHoaDon,
                        MaCTDonThuoc,
                        NoiDung,
                        SoLuong,
                        DonGia,
                        ThanhTien
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    maHoaDon,
                    ct.maCTDonThuoc(),
                    ct.tenThuoc(),
                    ct.soLuong(),
                    ct.donGia(),
                    thanhTien
            );
        }

        return maHoaDon;
    }
}
