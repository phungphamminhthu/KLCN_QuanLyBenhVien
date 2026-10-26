package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.TiepNhanHoaDonDTO;
import QuanLyBenhVien.DTO.TiepNhanHoaDonDTO.HoaDonItemDTO;
import QuanLyBenhVien.DTO.TiepNhanThuTienDTO;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
public class TiepNhanThuTienService {

    private static final ZoneId MUI_GIO =
            ZoneId.of("Asia/Ho_Chi_Minh");

    private final JdbcTemplate jdbcTemplate;
    private final TiepNhanHoaDonService hoaDonService;
    private final TiepNhanPhanCongService phanCongService;

    public TiepNhanThuTienService(
            JdbcTemplate jdbcTemplate,
            TiepNhanHoaDonService hoaDonService,
            TiepNhanPhanCongService phanCongService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.hoaDonService = hoaDonService;
        this.phanCongService = phanCongService;
    }

    // =====================================================
    // XÁC NHẬN THU ĐỦ MỘT HÓA ĐƠN
    // =====================================================

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public KetQuaThuTien xacNhanThuTien(
            Integer maHoaDon,
            TiepNhanThuTienDTO input,
            Authentication authentication
    ) {
        if (
                maHoaDon == null
                        || maHoaDon <= 0
                        || input == null
                        || input.getMaLichKham() == null
                        || input.getMaLichKham() <= 0
        ) {
            throw loi(
                    HttpStatus.BAD_REQUEST,
                    "Mã hóa đơn hoặc lịch khám không hợp lệ."
            );
        }

        BigDecimal soTien = kiemTraSoTien(input.getSoTien());

        String phuongThuc = switch (
                chuoi(input.getPhuongThucThanhToan())
                ) {
            case "TIEN_MAT" -> "Tiền mặt";
            case "CHUYEN_KHOAN" -> "Chuyển khoản";
            default -> throw loi(
                    HttpStatus.BAD_REQUEST,
                    "Phương thức thanh toán không hợp lệ."
            );
        };

        String maGiaoDich = chuoi(input.getMaGiaoDich());

        if ("Chuyển khoản".equals(phuongThuc)) {
            if (
                    maGiaoDich.isEmpty()
                            || maGiaoDich.length() > 255
            ) {
                throw loi(
                        HttpStatus.BAD_REQUEST,
                        "Nhập mã giao dịch chuyển khoản, "
                                + "tối đa 255 ký tự."
                );
            }
        } else {
            maGiaoDich = null;
        }

        int maLich = input.getMaLichKham();

        var ca = phanCongService.kiemTraQuyenVoiLichKham(
                authentication,
                maLich
        );

        // Khóa lịch trước, sau đó khóa các hóa đơn.
        List<LichThu> lichRows = jdbcTemplate.query(
                """
                SELECT MaBenhNhan, MaKhoa, NgayKham, TrangThai
                FROM lichdangkykham
                WHERE MaLichKham = ?
                FOR UPDATE
                """,
                (rs, n) -> new LichThu(
                        rs.getInt("MaBenhNhan"),
                        rs.getInt("MaKhoa"),
                        rs.getObject("NgayKham", LocalDate.class),
                        rs.getString("TrangThai")
                ),
                maLich
        );

        if (lichRows.isEmpty()) {
            throw loi(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy lịch khám."
            );
        }

        LichThu lich = lichRows.get(0);

        if (lich.maKhoa() != ca.maKhoa()) {
            throw loi(
                    HttpStatus.FORBIDDEN,
                    "Lịch khám không thuộc khoa đang phụ trách."
            );
        }

        if (!LocalDate.now(MUI_GIO).equals(lich.ngayKham())) {
            throw loi(
                    HttpStatus.CONFLICT,
                    "Chỉ thu tiền cho lịch khám trong ngày hiện tại."
            );
        }

        List<Integer> hoaDonIds = khoaDanhSach(
                """
                SELECT MaHoaDon
                FROM hoadon
                WHERE MaLichKham = ?
                ORDER BY MaHoaDon
                FOR UPDATE
                """,
                maLich
        );

        if (!hoaDonIds.contains(maHoaDon)) {
            throw loi(
                    HttpStatus.NOT_FOUND,
                    "Hóa đơn không thuộc lịch khám đang mở."
            );
        }

        // Khóa chi tiết trước khi kiểm tra lại số tiền.
        khoaDanhSach(
                """
                SELECT ct.MaCTHoaDon
                FROM cthoadon ct
                JOIN hoadon hd ON hd.MaHoaDon = ct.MaHoaDon
                WHERE hd.MaLichKham = ?
                ORDER BY ct.MaCTHoaDon
                FOR UPDATE
                """,
                maLich
        );

        khoaDanhSach(
                """
                SELECT tt.MaThanhToan
                FROM thanhtoan tt
                JOIN hoadon hd ON hd.MaHoaDon = tt.MaHoaDon
                WHERE hd.MaLichKham = ?
                ORDER BY tt.MaThanhToan
                FOR UPDATE
                """,
                maLich
        );

        khoaDanhSach(
                """
                SELECT MaNguoiDung
                FROM nguoidung
                WHERE MaNguoiDung = ?
                FOR UPDATE
                """,
                ca.maNhanVienTiepNhan()
        );

        khoaDanhSach(
                """
                SELECT MaPhanCong
                FROM phancongtiepnhan
                WHERE MaPhanCong = ?
                FOR UPDATE
                """,
                ca.maPhanCong()
        );

        var caMoi = phanCongService.kiemTraQuyenVoiLichKham(
                authentication,
                maLich
        );

        if (
                !Objects.equals(
                        ca.maPhanCong(),
                        caMoi.maPhanCong()
                )
                        || !Objects.equals(
                        ca.maNhanVienTiepNhan(),
                        caMoi.maNhanVienTiepNhan()
                )
        ) {
            throw loi(
                    HttpStatus.CONFLICT,
                    "Ca trực đã thay đổi. Hãy tải lại viện phí."
            );
        }

        TiepNhanHoaDonDTO truoc =
                hoaDonService.layDanhSachHoaDon(
                        maLich,
                        authentication
                );

        HoaDonItemDTO hd = truoc.danhSachHoaDon()
                .stream()
                .filter(x -> maHoaDon.equals(x.maHoaDon()))
                .findFirst()
                .orElseThrow(() -> loi(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy hóa đơn."
                ));

        if (
                !Set.of("PhiKham", "CanLamSang")
                        .contains(chuoi(hd.loaiHoaDon()))
        ) {
            throw loi(
                    HttpStatus.CONFLICT,
                    "Tiếp nhận chỉ thu phí khám và phí cận lâm sàng."
            );
        }

        if (!hd.choPhepThanhToan()) {
            throw loi(
                    HttpStatus.CONFLICT,
                    "Hóa đơn chưa cho phép thu tiền. "
                            + chuoi(hd.thongBao())
            );
        }

        if (
                !"ChuaThanhToan".equals(hd.trangThai())
                        || hd.daThanhToan().signum() != 0
        ) {
            throw loi(
                    HttpStatus.CONFLICT,
                    "Hóa đơn đã thu tiền hoặc cần đối soát. "
                            + "Hãy tải lại."
            );
        }

        if (
                soTien.compareTo(hd.tongTien()) != 0
                        || soTien.compareTo(hd.conPhaiThu()) != 0
        ) {
            throw loi(
                    HttpStatus.CONFLICT,
                    "Số tiền đã thay đổi. Hãy tải lại hóa đơn."
            );
        }

        boolean laCLS = "CanLamSang".equals(hd.loaiHoaDon());

        if (laCLS) {
            if (
                    !"ChoThanhToan".equals(lich.trangThai())
                            || !truoc.daThanhToanPhiKham()
            ) {
                throw loi(
                        HttpStatus.CONFLICT,
                        "Cần thanh toán đủ phí khám và lịch "
                                + "ở trạng thái Chờ thanh toán CLS."
                );
            }
        } else if (!"DaGoi".equals(chuoi(lich.trangThai()))) {
            // Chặn tại backend, kể cả khi gọi API trực tiếp.
            throw loi(
                    HttpStatus.CONFLICT,
                    "Hãy gọi bệnh nhân trước khi thu phí khám."
            );
        }

        kiemTraNguonChiTiet(hd, maLich);

        if (
                dem(
                        """
                        SELECT COUNT(*)
                        FROM ctthanhtoan p
                        JOIN cthoadon ct
                            ON ct.MaCTHoaDon = p.MaCTHoaDon
                        WHERE ct.MaHoaDon = ?
                        """,
                        maHoaDon
                ) > 0
        ) {
            throw loi(
                    HttpStatus.CONFLICT,
                    "Chi tiết hóa đơn đã có phân bổ thanh toán. "
                            + "Cần đối soát."
            );
        }

        LocalDateTime lucThu = LocalDateTime.now(MUI_GIO);
        KeyHolder key = new GeneratedKeyHolder();
        String giaoDich = maGiaoDich;

        int soDong = jdbcTemplate.update(
                connection -> {
                    var ps = connection.prepareStatement(
                            """
                            INSERT INTO thanhtoan (
                                MaHoaDon,
                                NgayThanhToan,
                                SoTien,
                                PhuongThucThanhToan,
                                TrangThai,
                                MaGiaoDich,
                                MaNguoiThu
                            )
                            VALUES (?, ?, ?, ?, 'ThanhCong', ?, ?)
                            """,
                            Statement.RETURN_GENERATED_KEYS
                    );

                    ps.setInt(1, maHoaDon);
                    ps.setTimestamp(2, Timestamp.valueOf(lucThu));
                    ps.setBigDecimal(3, hd.tongTien());
                    ps.setString(4, phuongThuc);
                    ps.setString(5, giaoDich);
                    ps.setInt(6, ca.maNhanVienTiepNhan());

                    return ps;
                },
                key
        );

        Number maThanhToan = key.getKey();

        if (soDong != 1 || maThanhToan == null) {
            throw loi(
                    HttpStatus.CONFLICT,
                    "Chưa ghi nhận được giao dịch thanh toán."
            );
        }

        int maTT = maThanhToan.intValue();

        int soPhanBo = jdbcTemplate.update(
                """
                INSERT INTO ctthanhtoan (MaThanhToan, MaCTHoaDon)
                SELECT ?, MaCTHoaDon
                FROM cthoadon
                WHERE MaHoaDon = ?
                """,
                maTT,
                maHoaDon
        );

        if (soPhanBo != hd.chiTiet().size()) {
            throw loi(
                    HttpStatus.CONFLICT,
                    "Chi tiết hóa đơn đã thay đổi. "
                            + "Chưa hoàn tất thu tiền."
            );
        }

        int soHoaDonCapNhat = jdbcTemplate.update(
                """
                UPDATE hoadon
                SET TrangThai = 'DaThanhToan'
                WHERE MaHoaDon = ?
                  AND MaLichKham = ?
                  AND TrangThai = 'ChuaThanhToan'
                """,
                maHoaDon,
                maLich
        );

        if (soHoaDonCapNhat != 1) {
            throw loi(
                    HttpStatus.CONFLICT,
                    "Trạng thái hóa đơn đã thay đổi."
            );
        }

        // Thu phí khám không tự xác nhận tiếp nhận.
        String trangThaiLich = lich.trangThai();

        if (
                laCLS
                        && daDuDieuKienChoCLS(
                        maLich,
                        authentication
                )
        ) {
            int soLichCapNhat = jdbcTemplate.update(
                    """
                    UPDATE lichdangkykham
                    SET TrangThai = 'ChoCLS'
                    WHERE MaLichKham = ?
                      AND MaKhoa = ?
                      AND TrangThai = 'ChoThanhToan'
                    """,
                    maLich,
                    ca.maKhoa()
            );

            if (soLichCapNhat != 1) {
                throw loi(
                        HttpStatus.CONFLICT,
                        "Lịch khám đã đổi trạng thái."
                );
            }

            trangThaiLich = "ChoCLS";
        }

        List<PhongCanDen> danhSachPhong =
                layPhongCanDen(maHoaDon, maLich, laCLS);

        String huongDan;

        if (!laCLS) {
            huongDan = "Tiếp tục nhập số đo và xác nhận tiếp nhận.";
        } else if (!"ChoCLS".equals(trangThaiLich)) {
            huongDan = "Chưa đủ điều kiện thực hiện CLS. "
                    + "Kiểm tra các khoản còn lại.";
        } else if (
                danhSachPhong.isEmpty()
                        || danhSachPhong.stream().anyMatch(p ->
                        p.maPhong() == null
                                || chuoi(p.tenPhong()).isEmpty()
                )
        ) {
            huongDan = "Cần kiểm tra phân phòng CLS.";
        } else {
            huongDan = "Đến phòng CLS để chờ thực hiện.";
        }

        // Kiểm tra ca và ngày trước khi hoàn tất transaction.
        var caCuoi = phanCongService.kiemTraQuyenVoiLichKham(
                authentication,
                maLich
        );

        if (
                !Objects.equals(
                        ca.maPhanCong(),
                        caCuoi.maPhanCong()
                )
                        || !LocalDate.now(MUI_GIO)
                        .equals(lich.ngayKham())
        ) {
            throw loi(
                    HttpStatus.CONFLICT,
                    "Ca trực hoặc ngày làm việc đã thay đổi. "
                            + "Giao dịch chưa được lưu."
            );
        }

        return new KetQuaThuTien(
                true,
                "Đã ghi nhận thanh toán thành công.",
                maTT,
                maHoaDon,
                maLich,
                hd.tongTien(),
                trangThaiLich,
                huongDan,
                danhSachPhong
        );
    }

    // =====================================================
    // KIỂM TRA NGUỒN CHI TIẾT HÓA ĐƠN
    // =====================================================

    private void kiemTraNguonChiTiet(
            HoaDonItemDTO hd,
            int maLich
    ) {
        if (hd.chiTiet().isEmpty()) {
            throw loi(
                    HttpStatus.CONFLICT,
                    "Hóa đơn chưa có chi tiết."
            );
        }

        for (var ct : hd.chiTiet()) {
            if ("PhiKham".equals(hd.loaiHoaDon())) {
                if (
                        ct.maDichVu() == null
                                || ct.maChiDinh() != null
                                || ct.maCTDonThuoc() != null
                ) {
                    throw loi(
                            HttpStatus.CONFLICT,
                            "Nguồn phí khám không hợp lệ."
                    );
                }

                if (
                        dem(
                                """
                                SELECT COUNT(*)
                                FROM dichvuyte
                                WHERE MaDichVu = ?
                                """,
                                ct.maDichVu()
                        ) != 1
                ) {
                    throw loi(
                            HttpStatus.CONFLICT,
                            "Dịch vụ phí khám không tồn tại."
                    );
                }
            } else {
                if (
                        ct.maChiDinh() == null
                                || ct.maDichVu() != null
                                || ct.maCTDonThuoc() != null
                ) {
                    throw loi(
                            HttpStatus.CONFLICT,
                            "Nguồn phí CLS không hợp lệ."
                    );
                }

                List<Integer> chiDinh = khoaDanhSach(
                        """
                        SELECT cd.MaChiDinh
                        FROM chidinhyte cd
                        JOIN hosobenhan hs
                            ON hs.MaHoSoBenhAn = cd.MaHoSoBenhAn
                        WHERE cd.MaChiDinh = ?
                          AND hs.MaLichKham = ?
                          AND cd.TrangThai = 'ChoThucHien'
                        FOR UPDATE
                        """,
                        ct.maChiDinh(),
                        maLich
                );

                if (chiDinh.size() != 1) {
                    throw loi(
                            HttpStatus.CONFLICT,
                            "Chỉ định không thuộc lịch khám "
                                    + "hoặc không còn chờ thực hiện."
                    );
                }

                long soChiTiet = dem(
                        """
                        SELECT COUNT(*)
                        FROM cthoadon ct
                        JOIN hoadon hd ON hd.MaHoaDon = ct.MaHoaDon
                        WHERE ct.MaChiDinh = ?
                          AND (
                              hd.TrangThai IS NULL
                              OR hd.TrangThai <> 'DaHuy'
                          )
                        """,
                        ct.maChiDinh()
                );

                if (soChiTiet != 1) {
                    throw loi(
                            HttpStatus.CONFLICT,
                            "Chỉ định được lập hóa đơn trùng. "
                                    + "Cần đối soát."
                    );
                }
            }
        }
    }

    // =====================================================
    // KIỂM TRA ĐỦ ĐIỀU KIỆN CHUYỂN SANG CHỜ CLS
    // =====================================================

    private boolean daDuDieuKienChoCLS(
            int maLich,
            Authentication authentication
    ) {
        TiepNhanHoaDonDTO data =
                hoaDonService.layDanhSachHoaDon(
                        maLich,
                        authentication
                );

        List<HoaDonItemDTO> cacHD = data.danhSachHoaDon()
                .stream()
                .filter(hd ->
                        "CanLamSang".equals(hd.loaiHoaDon())
                                && !"DaHuy".equals(hd.trangThai())
                )
                .toList();

        if (!data.daThanhToanPhiKham() || cacHD.isEmpty()) {
            return false;
        }

        for (var hd : cacHD) {
            if (
                    !"DaThanhToan".equals(hd.trangThai())
                            || !"Đã thanh toán".equals(
                            hd.trangThaiHienThi()
                    )
                            || hd.tongTien().signum() <= 0
                            || hd.daThanhToan()
                            .compareTo(hd.tongTien()) != 0
                            || hd.conPhaiThu().signum() != 0
            ) {
                return false;
            }

            long chiTietChuaPhanBoDung = dem(
                    """
                    SELECT COUNT(*)
                    FROM cthoadon ct
                    WHERE ct.MaHoaDon = ?
                      AND 1 <> (
                          SELECT COUNT(*)
                          FROM ctthanhtoan p
                          JOIN thanhtoan tt
                              ON tt.MaThanhToan = p.MaThanhToan
                          WHERE p.MaCTHoaDon = ct.MaCTHoaDon
                            AND tt.MaHoaDon = ct.MaHoaDon
                            AND tt.TrangThai = 'ThanhCong'
                      )
                    """,
                    hd.maHoaDon()
            );

            if (chiTietChuaPhanBoDung > 0) {
                return false;
            }
        }

        long soChiDinh = dem(
                """
                SELECT COUNT(*)
                FROM chidinhyte cd
                JOIN hosobenhan hs
                    ON hs.MaHoSoBenhAn = cd.MaHoSoBenhAn
                WHERE hs.MaLichKham = ?
                  AND cd.TrangThai = 'ChoThucHien'
                """,
                maLich
        );

        long chuaDu = dem(
                """
                SELECT COUNT(*)
                FROM chidinhyte cd
                JOIN hosobenhan hs
                    ON hs.MaHoSoBenhAn = cd.MaHoSoBenhAn
                WHERE hs.MaLichKham = ?
                  AND (
                      cd.TrangThai IS NULL
                      OR cd.TrangThai NOT IN (
                          'ChoThucHien',
                          'DangThucHien',
                          'DaHoanThanh',
                          'DaHuy'
                      )
                      OR (
                          cd.TrangThai = 'ChoThucHien'
                          AND 1 <> (
                              SELECT COUNT(*)
                              FROM cthoadon ct
                              JOIN hoadon hd
                                  ON hd.MaHoaDon = ct.MaHoaDon
                              WHERE ct.MaChiDinh = cd.MaChiDinh
                                AND hd.MaLichKham = hs.MaLichKham
                                AND hd.LoaiHoaDon = 'CanLamSang'
                                AND hd.TrangThai = 'DaThanhToan'
                          )
                      )
                  )
                """,
                maLich
        );

        return soChiDinh > 0 && chuaDu == 0;
    }

    // =====================================================
    // PHÒNG THEO HÓA ĐƠN VỪA THANH TOÁN
    // =====================================================

    private List<PhongCanDen> layPhongCanDen(
            int maHoaDon,
            int maLich,
            boolean laCLS
    ) {
        if (laCLS) {
            return jdbcTemplate.query(
                    """
                    SELECT
                        cd.MaChiDinh,
                        COALESCE(
                            NULLIF(TRIM(ct.NoiDung), ''),
                            dv.TenDichVu
                        ) AS NoiDung,
                        p.MaPhong,
                        p.TenPhong,
                        p.ViTri
                    FROM cthoadon ct
                    JOIN hoadon hd
                        ON hd.MaHoaDon = ct.MaHoaDon
                    JOIN chidinhyte cd
                        ON cd.MaChiDinh = ct.MaChiDinh
                    JOIN hosobenhan hs
                        ON hs.MaHoSoBenhAn = cd.MaHoSoBenhAn
                    JOIN dichvuyte dv
                        ON dv.MaDichVu = cd.MaDichVu
                    LEFT JOIN phongchuyentrach p
                        ON p.MaPhong = cd.MaPhong
                       AND p.TrangThai = 1
                    WHERE ct.MaHoaDon = ?
                      AND hd.MaLichKham = ?
                      AND hs.MaLichKham = hd.MaLichKham
                      AND hd.LoaiHoaDon = 'CanLamSang'
                    ORDER BY ct.MaCTHoaDon
                    """,
                    (rs, n) -> new PhongCanDen(
                            rs.getObject("MaChiDinh", Integer.class),
                            rs.getString("NoiDung"),
                            rs.getObject("MaPhong", Integer.class),
                            rs.getString("TenPhong"),
                            rs.getString("ViTri")
                    ),
                    maHoaDon,
                    maLich
            );
        }

        List<PhongCanDen> rooms = jdbcTemplate.query(
                """
                SELECT DISTINCT p.MaPhong, p.TenPhong, p.ViTri
                FROM lichdangkykham l
                JOIN lichlamviec lv
                    ON lv.MaBacSi = l.MaBacSi
                   AND lv.NgayLamViec = l.NgayKham
                   AND l.GioKham >= lv.GioBatDau
                   AND l.GioKham < lv.GioKetThuc
                JOIN phongchuyentrach p
                    ON p.MaPhong = lv.MaPhong
                   AND p.MaKhoa = l.MaKhoa
                   AND p.TrangThai = 1
                WHERE l.MaLichKham = ?
                ORDER BY p.MaPhong
                """,
                (rs, n) -> new PhongCanDen(
                        null,
                        "Khám bệnh",
                        rs.getObject("MaPhong", Integer.class),
                        rs.getString("TenPhong"),
                        rs.getString("ViTri")
                ),
                maLich
        );

        return rooms.size() == 1
                ? rooms
                : List.of(
                new PhongCanDen(
                        null, "Khám bệnh", null, null, null
                )
        );
    }

    // =====================================================
    // HÀM HỖ TRỢ
    // =====================================================

    private List<Integer> khoaDanhSach(
            String sql,
            Object... params
    ) {
        return jdbcTemplate.query(
                sql,
                (rs, n) -> rs.getInt(1),
                params
        );
    }

    private long dem(String sql, Object... params) {
        Long n = jdbcTemplate.queryForObject(
                sql,
                Long.class,
                params
        );
        return n == null ? 0 : n;
    }

    private BigDecimal kiemTraSoTien(BigDecimal value) {
        if (
                value == null
                        || value.signum() <= 0
                        || value.compareTo(
                        new BigDecimal("9999999999999.99")
                ) > 0
        ) {
            throw loi(
                    HttpStatus.BAD_REQUEST,
                    "Số tiền không hợp lệ."
            );
        }

        try {
            return value.setScale(2, RoundingMode.UNNECESSARY);
        } catch (ArithmeticException e) {
            throw loi(
                    HttpStatus.BAD_REQUEST,
                    "Số tiền chỉ được có tối đa hai chữ số thập phân."
            );
        }
    }

    private static String chuoi(String value) {
        return value == null ? "" : value.trim();
    }

    private static ResponseStatusException loi(
            HttpStatus status,
            String message
    ) {
        return new ResponseStatusException(status, message);
    }

    private record LichThu(
            int maBenhNhan,
            int maKhoa,
            LocalDate ngayKham,
            String trangThai
    ) {
    }

    public record PhongCanDen(
            Integer maChiDinh,
            String noiDung,
            Integer maPhong,
            String tenPhong,
            String viTri
    ) {
    }

    public record KetQuaThuTien(
            boolean success,
            String message,
            Integer maThanhToan,
            Integer maHoaDon,
            Integer maLichKham,
            BigDecimal soTien,
            String trangThaiLichKham,
            String huongDan,
            List<PhongCanDen> danhSachPhong
    ) {
    }
}