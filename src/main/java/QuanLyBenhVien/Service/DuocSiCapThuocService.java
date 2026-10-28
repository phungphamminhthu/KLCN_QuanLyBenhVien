package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.DuocSiCapThuocRequest;
import QuanLyBenhVien.Entity.NguoiDung;
import QuanLyBenhVien.Repository.NguoiDungRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class DuocSiCapThuocService {

    private final JdbcTemplate jdbcTemplate;
    private final NguoiDungRepository nguoiDungRepository;
    private final ThongBaoWebSocketService thongBaoWebSocketService;

    public DuocSiCapThuocService(
            JdbcTemplate jdbcTemplate,
            NguoiDungRepository nguoiDungRepository,
            ThongBaoWebSocketService thongBaoWebSocketService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.nguoiDungRepository = nguoiDungRepository;
        this.thongBaoWebSocketService = thongBaoWebSocketService;
    }

    // =====================================================
    // thuoc cap thuc te
    // =====================================================
    private record ThuocCapThucTe(
            Integer maThuocThucCap,
            Integer soLuong,
            BigDecimal donGia
    ) {}

    // =====================================================
    // XÁC NHẬN CẤP THUỐC
    // Chỉ cấp thuốc khi đơn đang DangLayThuoc và hóa đơn
    // thuốc đã được thanh toán.
    // =====================================================

    //    @Transactional
    //    public void capThuoc(
    //            Integer maDonThuoc,
    //            DuocSiCapThuocRequest request,
    //            String tenDangNhap
    //    ) {
    //        if (maDonThuoc == null || maDonThuoc <= 0) {
    //            throw new IllegalArgumentException("Mã đơn thuốc không hợp lệ.");
    //        }
    //
    //        if (tenDangNhap == null || tenDangNhap.isBlank()) {
    //            throw new IllegalArgumentException("Không xác định được tài khoản dược sĩ.");
    //        }
    //
    //        // 1. Khóa đơn thuốc để ngăn hai yêu cầu cấp cùng một đơn đồng thời.
    //        List<String> statuses = jdbcTemplate.query(
    //                """
    //                SELECT TrangThai
    //                FROM DonThuoc
    //                WHERE MaDonThuoc = ?
    //                FOR UPDATE
    //                """,
    //                (rs, rowNum) -> rs.getString("TrangThai"),
    //                maDonThuoc
    //        );
    //
    //        if (statuses.isEmpty()) {
    //            throw new IllegalArgumentException("Không tìm thấy đơn thuốc.");
    //        }
    //
    //        String trangThaiDon = statuses.get(0);
    //
    //        if (!"DangLayThuoc".equals(trangThaiDon)) {
    //            throw new IllegalStateException(
    //                    "Đơn thuốc phải ở trạng thái đang lấy thuốc mới được xác nhận cấp thuốc."
    //            );
    //        }
    //
    //        // 2. Kiểm tra hóa đơn thuốc đã thanh toán đầy đủ cho đơn này.
    //        // Hóa đơn phải thuộc đúng lịch khám và chứa đầy đủ chi tiết đơn thuốc.
    //        List<Integer> hoaDonDaThanhToan = jdbcTemplate.query(
    //                """
    //                SELECT hd.MaHoaDon
    //                FROM HoaDon hd
    //                JOIN CTHoaDon cth
    //                    ON cth.MaHoaDon = hd.MaHoaDon
    //                JOIN CTDonThuoc ct
    //                    ON ct.MaCTDonThuoc = cth.MaCTDonThuoc
    //                JOIN DonThuoc d
    //                    ON d.MaDonThuoc = ct.MaDonThuoc
    //                JOIN HoSoBenhAn hs
    //                    ON hs.MaHoSoBenhAn = d.MaHoSoBenhAn
    //                WHERE d.MaDonThuoc = ?
    //                  AND hd.MaLichKham = hs.MaLichKham
    //                  AND hd.TrangThai = 'DaThanhToan'
    //                  AND hd.LoaiHoaDon = 'Thuoc'
    //                GROUP BY hd.MaHoaDon
    //                HAVING COUNT(DISTINCT cth.MaCTDonThuoc) = (
    //                    SELECT COUNT(*)
    //                    FROM CTDonThuoc
    //                    WHERE MaDonThuoc = ?
    //                )
    //                LIMIT 1
    //                """,
    //                (rs, rowNum) -> rs.getInt("MaHoaDon"),
    //                maDonThuoc,
    //                maDonThuoc
    //        );
    //
    //        if (hoaDonDaThanhToan.isEmpty()) {
    //            throw new IllegalStateException(
    //                    "Đơn thuốc chưa có hóa đơn thuốc đã thanh toán đầy đủ. "
    //                            + "Vui lòng kiểm tra thanh toán trước khi cấp thuốc."
    //            );
    //        }
    //
    //        // 3. Tìm tài khoản dược sĩ đang thực hiện.
    //        List<Integer> nguoiDungIds = jdbcTemplate.query(
    //                """
    //                SELECT MaNguoiDung
    //                FROM Nguoidung
    //                WHERE TenDangNhap = ?
    //                """,
    //                (rs, rowNum) -> rs.getInt("MaNguoiDung"),
    //                tenDangNhap
    //        );
    //
    //        if (nguoiDungIds.isEmpty()) {
    //            throw new IllegalArgumentException(
    //                    "Không tìm thấy tài khoản dược sĩ."
    //            );
    //        }
    //
    //        Integer maNguoiCap = nguoiDungIds.get(0);
    //
    //        // 4. Kiểm tra dữ liệu yêu cầu.
    //        if (request == null
    //                || request.getChiTiet() == null
    //                || request.getChiTiet().isEmpty()) {
    //            throw new IllegalArgumentException(
    //                    "Đơn thuốc chưa có thuốc cần cấp."
    //            );
    //        }
    //
    //        // Lấy danh sách thuốc thực tế được kê trong đơn.
    //        List<Integer> maThuocTrongDon = jdbcTemplate.query(
    //                """
    //                SELECT MaThuoc
    //                FROM CTDonThuoc
    //                WHERE MaDonThuoc = ?
    //                """,
    //                (rs, rowNum) -> rs.getInt("MaThuoc"),
    //                maDonThuoc
    //        );
    //
    //        if (maThuocTrongDon.isEmpty()) {
    //            throw new IllegalStateException(
    //                    "Đơn thuốc chưa có chi tiết thuốc."
    //            );
    //        }
    //
    //        Set<Integer> maThuocTrongDonSet =
    //                new HashSet<>(maThuocTrongDon);
    //
    //        Set<Integer> maThuocTrongRequest = new HashSet<>();
    //
    //        for (DuocSiCapThuocRequest.ChiTietCapThuoc item
    //                : request.getChiTiet()) {
    //
    //            if (item == null
    //                    || item.getMaThuoc() == null
    //                    || item.getSoLuongThucCap() == null
    //                    || item.getSoLuongThucCap() <= 0) {
    //                throw new IllegalArgumentException(
    //                        "Thông tin thuốc hoặc số lượng thực cấp không hợp lệ."
    //                );
    //            }
    //
    //            if (!maThuocTrongRequest.add(item.getMaThuoc())) {
    //                throw new IllegalArgumentException(
    //                        "Danh sách cấp thuốc có mã thuốc bị lặp."
    //                );
    //            }
    //        }
    //
    //        // Không cho bỏ sót hoặc tự thêm thuốc ngoài đơn.
    //        if (!maThuocTrongRequest.equals(maThuocTrongDonSet)) {
    //            throw new IllegalStateException(
    //                    "Danh sách cấp thuốc phải đầy đủ và khớp với đơn thuốc."
    //            );
    //        }
    //
    //        BigDecimal tongTien = BigDecimal.ZERO;
    //        LocalDateTime thoiGianCap = LocalDateTime.now();
    //
    //        // 5. Kiểm tra số lượng, khóa các lô kho và trừ kho.
    //        for (DuocSiCapThuocRequest.ChiTietCapThuoc item
    //                : request.getChiTiet()) {
    //
    //            Integer maThuoc = item.getMaThuoc();
    //            int soLuongCanCap = item.getSoLuongThucCap();
    //
    //            // 5.1. Kiểm tra thuốc và số lượng được kê.
    //            List<Integer> soLuongKeList = jdbcTemplate.query(
    //                    """
    //                    SELECT SoLuong
    //                    FROM CTDonThuoc
    //                    WHERE MaDonThuoc = ?
    //                      AND MaThuoc = ?
    //                    """,
    //                    (rs, rowNum) -> rs.getInt("SoLuong"),
    //                    maDonThuoc,
    //                    maThuoc
    //            );
    //
    //            if (soLuongKeList.isEmpty()) {
    //                throw new IllegalArgumentException(
    //                        "Thuốc không thuộc đơn thuốc."
    //                );
    //            }
    //
    //            int soLuongKe = soLuongKeList.get(0);
    //
    //            if (soLuongCanCap != soLuongKe) {
    //                throw new IllegalStateException(
    //                        "Số lượng thực cấp phải khớp số lượng đã kê. "
    //                                + "Nếu cần thay đổi, hãy điều chỉnh đơn thuốc "
    //                                + "và lập lại hóa đơn trước khi thanh toán."
    //                );
    //            }
    //
    //            // 5.2. Khóa các lô thuốc còn tồn, ưu tiên lô hết hạn sớm.
    //            List<KhoLot> lots = jdbcTemplate.query(
    //                    """
    //                    SELECT MaKhoThuoc, SoLuongTon
    //                    FROM KhoThuoc
    //                    WHERE MaThuoc = ?
    //                      AND SoLuongTon > 0
    //                    ORDER BY HanSuDung ASC, MaKhoThuoc ASC
    //                    FOR UPDATE
    //                    """,
    //                    (rs, rowNum) -> new KhoLot(
    //
    //                            rs.getInt("MaKhoThuoc"),
    //                            rs.getInt("SoLuongTon")
    //                    ),
    //                    maThuoc
    //            );
    //
    //            int tongTon = lots.stream()
    //                    .mapToInt(lot -> lot.soLuongTon)
    //                    .sum();
    //
    //            if (tongTon < soLuongCanCap) {
    //                String tenThuoc = jdbcTemplate.query(
    //                        """
    //                        SELECT TenThuoc
    //                        FROM Thuoc
    //                        WHERE MaThuoc = ?
    //                        """,
    //                        rs -> rs.next() ? rs.getString("TenThuoc") : "không xác định",
    //                        maThuoc
    //                );
    //
    //                throw new IllegalStateException(
    //                        "Thuốc " + tenThuoc
    //                                + " không đủ tồn kho. Tồn kho: " + tongTon
    //                                + ", số lượng cần cấp: " + soLuongCanCap + "."
    //                );
    //            }
    //
    //            // 5.3. Lấy đơn giá theo chi tiết đơn thuốc.
    //            BigDecimal donGia = jdbcTemplate.query(
    //                    """
    //                    SELECT DonGiaBan
    //                    FROM CTDonThuoc
    //                    WHERE MaDonThuoc = ?
    //                      AND MaThuoc = ?
    //                    """,
    //                    rs -> rs.next() ? rs.getBigDecimal("DonGiaBan") : null,
    //                    maDonThuoc,
    //                    maThuoc
    //            );
    //
    //            if (donGia == null || donGia.signum() < 0) {
    //                throw new IllegalStateException(
    //                        "Đơn giá thuốc không hợp lệ."
    //                );
    //            }
    //
    //            tongTien = tongTien.add(
    //                    donGia.multiply(BigDecimal.valueOf(soLuongCanCap))
    //            );
    //
    //            // 5.4. Trừ kho theo từng lô, từ hạn sử dụng sớm đến muộn.
    //            int conLai = soLuongCanCap;
    //
    //            for (KhoLot lot : lots) {
    //                if (conLai <= 0) {
    //                    break;
    //                }
    //
    //                int soLuongTru = Math.min(conLai, lot.soLuongTon);
    //
    //                int soDongCapNhat = jdbcTemplate.update(
    //                        """
    //                        UPDATE KhoThuoc
    //                        SET SoLuongTon = SoLuongTon - ?,
    //                            ThoiGianCapNhatCuoi = ?
    //                        WHERE MaKhoThuoc = ?
    //                          AND SoLuongTon >= ?
    //                        """,
    //                        soLuongTru,
    //                        Timestamp.valueOf(thoiGianCap),
    //                        lot.maKhoThuoc,
    //                        soLuongTru
    //                );
    //
    //                if (soDongCapNhat != 1) {
    //                    throw new IllegalStateException(
    //                            "Không thể cập nhật tồn kho. Vui lòng tải lại dữ liệu kho."
    //                    );
    //                }
    //
    //                conLai -= soLuongTru;
    //            }
    //
    //            if (conLai > 0) {
    //                throw new IllegalStateException(
    //                        "Không thể trừ đủ số lượng tồn kho."
    //                );
    //            }
    //        }
    //
    //        // 6. Tạo phiếu cấp thuốc.
    //        jdbcTemplate.update(
    //                """
    //                INSERT INTO PhieuCapThuoc (
    //                    MaDonThuoc,
    //                    MaNguoiCap,
    //                    ThoiGianCap,
    //                    TongTien,
    //                    TrangThai
    //                )
    //                VALUES (?, ?, ?, ?, 'DaCapThuoc')
    //                """,
    //                maDonThuoc,
    //                maNguoiCap,
    //                Timestamp.valueOf(thoiGianCap),
    //                tongTien
    //        );
    //
    //        // 7. Cập nhật trạng thái đơn thuốc.
    //        jdbcTemplate.update(
    //                """
    //                UPDATE DonThuoc
    //                SET TrangThai = 'DaCapThuoc'
    //                WHERE MaDonThuoc = ?
    //                  AND TrangThai = 'DangLayThuoc'
    //                """,
    //                maDonThuoc
    //        );
    //
    //        // 8. Tạo thông báo cho dược sĩ.
    //        NguoiDung nguoiDung = nguoiDungRepository.findById(maNguoiCap)
    //                .orElseThrow(() ->
    //                        new IllegalStateException(
    //                                "Không tìm thấy người dùng dược sĩ."
    //                        )
    //                );
    //
    //        String maHienThi = jdbcTemplate.query(
    //                """
    //                SELECT CONCAT('DP', LPAD(MaDonThuoc, 5, '0'))
    //                FROM DonThuoc
    //                WHERE MaDonThuoc = ?
    //                """,
    //                rs -> rs.next() ? rs.getString(1) : null,
    //                maDonThuoc
    //        );
    //
    //        String tenBenhNhan = jdbcTemplate.query(
    //                """
    //                SELECT nd.HoTen
    //                FROM DonThuoc d
    //                JOIN HoSoBenhAn hs
    //                    ON hs.MaHoSoBenhAn = d.MaHoSoBenhAn
    //                JOIN LichDangKyKham lk
    //                    ON lk.MaLichKham = hs.MaLichKham
    //                JOIN BenhNhan bn
    //                    ON bn.MaBenhNhan = lk.MaBenhNhan
    //                JOIN Nguoidung nd
    //                    ON nd.MaNguoiDung = bn.MaNguoiDung
    //                WHERE d.MaDonThuoc = ?
    //                """,
    //                rs -> rs.next() ? rs.getString("HoTen") : "bệnh nhân",
    //                maDonThuoc
    //        );
    //
    //        thongBaoWebSocketService.taoThongBao(
    //                nguoiDung,
    //                "Cấp thuốc thành công",
    //                "Đơn thuốc " + maHienThi
    //                        + " của bệnh nhân " + tenBenhNhan
    //                        + " đã được cấp thuốc.",
    //                "CAP_THUOC",
    //                "DaCapThuoc"
    //        );
    //
    //        // Chỉ gửi thông báo WebSocket sau khi transaction commit.
    //        if (TransactionSynchronizationManager.isSynchronizationActive()) {
    //            TransactionSynchronizationManager.registerSynchronization(
    //                    new TransactionSynchronization() {
    //                        @Override
    //                        public void afterCommit() {
    //                            thongBaoWebSocketService
    //                                    .guiSoThongBaoChuaDoc(nguoiDung);
    //                        }
    //                    }
    //            );
    //        } else {
    //            thongBaoWebSocketService.guiSoThongBaoChuaDoc(nguoiDung);
    //        }
    //    }
    @Transactional
    public void capThuoc(
            Integer maDonThuoc,
            DuocSiCapThuocRequest request,
            String tenDangNhap
    ) {
        if (maDonThuoc == null || maDonThuoc <= 0) {
            throw new IllegalArgumentException("Mã đơn thuốc không hợp lệ.");
        }

        if (tenDangNhap == null || tenDangNhap.isBlank()) {
            throw new IllegalArgumentException("Không xác định được tài khoản dược sĩ.");
        }

        // 1. Khóa đơn thuốc để ngăn hai yêu cầu cấp cùng một đơn đồng thời.
        List<String> statuses = jdbcTemplate.query(
                """
                SELECT TrangThai
                FROM DonThuoc
                WHERE MaDonThuoc = ?
                FOR UPDATE
                """,
                (rs, rowNum) -> rs.getString("TrangThai"),
                maDonThuoc
        );

        if (statuses.isEmpty()) {
            throw new IllegalArgumentException("Không tìm thấy đơn thuốc.");
        }

        String trangThaiDon = statuses.get(0);

        if (!"DangLayThuoc".equals(trangThaiDon)) {
            throw new IllegalStateException(
                    "Đơn thuốc phải ở trạng thái đang lấy thuốc mới được xác nhận cấp thuốc."
            );
        }

        // 2. Kiểm tra hóa đơn thuốc đã thanh toán đầy đủ cho đơn này.
        // Hóa đơn phải thuộc đúng lịch khám và chứa đầy đủ chi tiết đơn thuốc.
        List<Integer> hoaDonDaThanhToan = jdbcTemplate.query(
                """
                SELECT hd.MaHoaDon
                FROM HoaDon hd
                JOIN CTHoaDon cth
                    ON cth.MaHoaDon = hd.MaHoaDon
                JOIN CTDonThuoc ct
                    ON ct.MaCTDonThuoc = cth.MaCTDonThuoc
                JOIN DonThuoc d
                    ON d.MaDonThuoc = ct.MaDonThuoc
                JOIN HoSoBenhAn hs
                    ON hs.MaHoSoBenhAn = d.MaHoSoBenhAn
                WHERE d.MaDonThuoc = ?
                  AND hd.MaLichKham = hs.MaLichKham
                  AND hd.TrangThai = 'DaThanhToan'
                  AND hd.LoaiHoaDon = 'Thuoc'
                GROUP BY hd.MaHoaDon
                HAVING COUNT(DISTINCT cth.MaCTDonThuoc) = (
                    SELECT COUNT(*)
                    FROM CTDonThuoc
                    WHERE MaDonThuoc = ?
                )
                LIMIT 1
                """,
                (rs, rowNum) -> rs.getInt("MaHoaDon"),
                maDonThuoc,
                maDonThuoc
        );

        if (hoaDonDaThanhToan.isEmpty()) {
            throw new IllegalStateException(
                    "Đơn thuốc chưa có hóa đơn thuốc đã thanh toán đầy đủ. "
                            + "Vui lòng kiểm tra thanh toán trước khi cấp thuốc."
            );
        }


        // 2.1. Kiểm tra chi tiết hóa đơn đã thanh toán
        // phải khớp với thuốc thực cấp trong đơn thuốc.
        Integer maHoaDonDaThanhToan = hoaDonDaThanhToan.get(0);

        Integer soDongKhongKhop = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM CTDonThuoc ct
                LEFT JOIN CTHoaDon cth
                    ON cth.MaCTDonThuoc = ct.MaCTDonThuoc
                   AND cth.MaHoaDon = ?
                LEFT JOIN Thuoc t
                    ON t.MaThuoc = COALESCE(
                        ct.MaThuocThucCap,
                        ct.MaThuoc
                    )
                WHERE ct.MaDonThuoc = ?
                  AND (
                      cth.MaCTDonThuoc IS NULL
                      OR cth.SoLuong <> ct.SoLuong
                      OR cth.DonGia <> CASE
                          WHEN ct.MaThuocThucCap IS NOT NULL
                              THEN t.Gia
                          ELSE ct.DonGiaBan
                      END
                      OR NOT (cth.NoiDung <=> t.TenThuoc)
                  )
                """,
                Integer.class,
                maHoaDonDaThanhToan,
                maDonThuoc
        );

        if (soDongKhongKhop == null || soDongKhongKhop > 0) {
            throw new IllegalStateException(
                    "Chi tiết hóa đơn đã thanh toán không khớp với "
                            + "thuốc thực cấp. Không thể cấp thuốc. "
                            + "Vui lòng kiểm tra lại hóa đơn."
            );
        }

        // 2.2. Kiểm tra tổng tiền hóa đơn khớp tổng chi tiết.
        Integer tongTienKhongKhop = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM HoaDon hd
                WHERE hd.MaHoaDon = ?
                  AND ABS(
                      hd.TongTien - COALESCE(
                          (
                              SELECT SUM(cth.ThanhTien)
                              FROM CTHoaDon cth
                              WHERE cth.MaHoaDon = hd.MaHoaDon
                          ),
                          0
                      )
                  ) > 0.01
                """,
                Integer.class,
                maHoaDonDaThanhToan
        );

        if (tongTienKhongKhop == null || tongTienKhongKhop > 0) {
            throw new IllegalStateException(
                    "Tổng tiền hóa đơn không khớp chi tiết hóa đơn. "
                            + "Không thể cấp thuốc."
            );
        }


        // 3. Tìm tài khoản dược sĩ đang thực hiện.
        List<Integer> nguoiDungIds = jdbcTemplate.query(
                """
                SELECT MaNguoiDung
                FROM Nguoidung
                WHERE TenDangNhap = ?
                """,
                (rs, rowNum) -> rs.getInt("MaNguoiDung"),
                tenDangNhap
        );

        if (nguoiDungIds.isEmpty()) {
            throw new IllegalArgumentException(
                    "Không tìm thấy tài khoản dược sĩ."
            );
        }

        Integer maNguoiCap = nguoiDungIds.get(0);

        // 4. Kiểm tra dữ liệu yêu cầu.
        if (request == null
                || request.getChiTiet() == null
                || request.getChiTiet().isEmpty()) {
            throw new IllegalArgumentException(
                    "Đơn thuốc chưa có thuốc cần cấp."
            );
        }

        // Lấy danh sách thuốc thực tế được kê trong đơn.
        List<Integer> maThuocTrongDon = jdbcTemplate.query(
                """
                SELECT MaThuoc
                FROM CTDonThuoc
                WHERE MaDonThuoc = ?
                """,
                (rs, rowNum) -> rs.getInt("MaThuoc"),
                maDonThuoc
        );

        if (maThuocTrongDon.isEmpty()) {
            throw new IllegalStateException(
                    "Đơn thuốc chưa có chi tiết thuốc."
            );
        }

        Set<Integer> maThuocTrongDonSet =
                new HashSet<>(maThuocTrongDon);

        Set<Integer> maThuocTrongRequest = new HashSet<>();

        for (DuocSiCapThuocRequest.ChiTietCapThuoc item
                : request.getChiTiet()) {

            if (item == null
                    || item.getMaThuoc() == null
                    || item.getSoLuongThucCap() == null
                    || item.getSoLuongThucCap() <= 0) {
                throw new IllegalArgumentException(
                        "Thông tin thuốc hoặc số lượng thực cấp không hợp lệ."
                );
            }

            if (!maThuocTrongRequest.add(item.getMaThuoc())) {
                throw new IllegalArgumentException(
                        "Danh sách cấp thuốc có mã thuốc bị lặp."
                );
            }
        }

        // Không cho bỏ sót hoặc tự thêm thuốc ngoài đơn.
        if (!maThuocTrongRequest.equals(maThuocTrongDonSet)) {
            throw new IllegalStateException(
                    "Danh sách cấp thuốc phải đầy đủ và khớp với đơn thuốc."
            );
        }

        BigDecimal tongTien = BigDecimal.ZERO;
        LocalDateTime thoiGianCap = LocalDateTime.now();

        // 5. Kiểm tra số lượng, khóa các lô kho và trừ kho.
//        for (DuocSiCapThuocRequest.ChiTietCapThuoc item
//                : request.getChiTiet()) {
//
//                //            Integer maThuoc = item.getMaThuoc();
//                //            int soLuongCanCap = item.getSoLuongThucCap();
//                //
//                //            // 5.1. Kiểm tra thuốc và số lượng được kê.
//                //            List<Integer> soLuongKeList = jdbcTemplate.query(
//                //                    """
//                //                    SELECT SoLuong
//                //                    FROM CTDonThuoc
//                //                    WHERE MaDonThuoc = ?
//                //                      AND MaThuoc = ?
//                //                    """,
//                //                    (rs, rowNum) -> rs.getInt("SoLuong"),
//                //                    maDonThuoc,
//                //                    maThuoc
//                //            );
//                //
//                //            if (soLuongKeList.isEmpty()) {
//                //                throw new IllegalArgumentException(
//                //                        "Thuốc không thuộc đơn thuốc."
//                //                );
//                //            }
//                //
//                //            int soLuongKe = soLuongKeList.get(0);
//                //
//                //            if (soLuongCanCap != soLuongKe) {
//                //                throw new IllegalStateException(
//                //                        "Số lượng thực cấp phải khớp số lượng đã kê. "
//                //                                + "Nếu cần thay đổi, hãy điều chỉnh đơn thuốc "
//                //                                + "và lập lại hóa đơn trước khi thanh toán."
//                //                );
//                //            }
//                //
//                //            // 5.2. Khóa các lô thuốc còn tồn, ưu tiên lô hết hạn sớm.
//                //            List<KhoLot> lots = jdbcTemplate.query(
//                //                    """
//                //                    SELECT MaKhoThuoc, SoLuongTon
//                //                    FROM KhoThuoc
//                //                    WHERE MaThuoc = ?
//                //                      AND SoLuongTon > 0
//                //                      AND HanSuDung >= CURDATE()
//                //                    ORDER BY HanSuDung ASC, MaKhoThuoc ASC
//                //                    FOR UPDATE
//                //                    """,
//                //                    (rs, rowNum) -> new KhoLot(
//                //                            rs.getInt("MaKhoThuoc"),
//                //                            rs.getInt("SoLuongTon")
//                //                    ),
//                //                    maThuoc
//                //            );
//                //
//                //            int tongTon = lots.stream()
//                //                    .mapToInt(lot -> lot.soLuongTon)
//                //                    .sum();
//                //
//                //            if (tongTon < soLuongCanCap) {
//                //                String tenThuoc = jdbcTemplate.query(
//                //                        """
//                //                        SELECT TenThuoc
//                //                        FROM Thuoc
//                //                        WHERE MaThuoc = ?
//                //                        """,
//                //                        rs -> rs.next() ? rs.getString("TenThuoc") : "không xác định",
//                //                        maThuoc
//                //                );
//                //
//                //                throw new IllegalStateException(
//                //                        "Thuốc " + tenThuoc
//                //                                + " không đủ tồn kho. Tồn kho: " + tongTon
//                //                                + ", số lượng cần cấp: " + soLuongCanCap + "."
//                //                );
//                //            }
//                //
//                //            // 5.3. Lấy đơn giá theo chi tiết đơn thuốc.
//                //            BigDecimal donGia = jdbcTemplate.query(
//                //                    """
//                //                    SELECT DonGiaBan
//                //                    FROM CTDonThuoc
//                //                    WHERE MaDonThuoc = ?
//                //                      AND MaThuoc = ?
//                //                    """,
//                //                    rs -> rs.next() ? rs.getBigDecimal("DonGiaBan") : null,
//                //                    maDonThuoc,
//                //                    maThuoc
//                //            );
//                //
//                //            if (donGia == null || donGia.signum() < 0) {
//                //                throw new IllegalStateException(
//                //                        "Đơn giá thuốc không hợp lệ."
//                //                );
//                //            }
//                //
//                //            tongTien = tongTien.add(
//                //                    donGia.multiply(BigDecimal.valueOf(soLuongCanCap))
//                //            );
//
//            Integer maThuocGoc = item.getMaThuoc();
//            int soLuongCanCap = item.getSoLuongThucCap();
//
//            // 5.1. Lấy thuốc thực cấp đã được lưu trong chi tiết đơn.
//            List<ThuocCapThucTe> chiTietThucTe = jdbcTemplate.query(
//                    """
//                    SELECT
//                        COALESCE(ct.MaThuocThucCap, ct.MaThuoc)
//                            AS MaThuocThucCap,
//                        ct.SoLuong,
//                        CASE
//                            WHEN ct.MaThuocThucCap IS NOT NULL
//                                THEN t.Gia
//                            ELSE ct.DonGiaBan
//                        END AS DonGia
//                    FROM CTDonThuoc ct
//                    JOIN Thuoc t
//                        ON t.MaThuoc = COALESCE(
//                            ct.MaThuocThucCap,
//                            ct.MaThuoc
//                        )
//                    WHERE ct.MaDonThuoc = ?
//                      AND ct.MaThuoc = ?
//                    FOR UPDATE
//                    """,
//                    (rs, rowNum) -> new ThuocCapThucTe(
//                            rs.getInt("MaThuocThucCap"),
//                            rs.getInt("SoLuong"),
//                            rs.getBigDecimal("DonGia")
//                    ),
//                    maDonThuoc,
//                    maThuocGoc
//            );
//
//            if (chiTietThucTe.isEmpty()) {
//                throw new IllegalArgumentException(
//                        "Không tìm thấy thuốc gốc trong đơn thuốc."
//                );
//            }
//
//            ThuocCapThucTe ct = chiTietThucTe.get(0);
//            Integer maThuoc = ct.maThuocThucCap();
//
//            // Nếu dùng thuốc thay thế, xác minh lại quan hệ tương đương.
//            if (!maThuoc.equals(maThuocGoc)) {
//                Integer hopLe = jdbcTemplate.queryForObject(
//                        """
//                        SELECT COUNT(*)
//                        FROM ThuocTuongDuong tt
//                        JOIN Thuoc t
//                            ON t.MaThuoc = tt.MaThuocThayThe
//                        WHERE tt.MaThuoc = ?
//                          AND tt.MaThuocThayThe = ?
//                          AND tt.TrangThai = 'Đang áp dụng'
//                          AND t.TrangThai = TRUE
//                        """,
//                        Integer.class,
//                        maThuocGoc,
//                        maThuoc
//                );
//
//                if (hopLe == null || hopLe == 0) {
//                    throw new IllegalStateException(
//                            "Thuốc thực cấp không còn hợp lệ hoặc "
//                                    + "không nằm trong danh sách thay thế được áp dụng."
//                    );
//                }
//            }
//
//            // 5.2. Số lượng thực cấp phải bằng số lượng đã điều chỉnh.
//            int soLuongKe = ct.soLuong();
//
//            if (soLuongCanCap != soLuongKe) {
//                throw new IllegalStateException(
//                        "Số lượng thực cấp phải khớp số lượng đã lưu trong đơn."
//                );
//            }
//
//            // 5.3. Kiểm tra đơn giá.
//            BigDecimal donGia = ct.donGia();
//
//            if (donGia == null || donGia.signum() < 0) {
//                throw new IllegalStateException(
//                        "Đơn giá thuốc thực cấp không hợp lệ."
//                );
//            }
//
//            tongTien = tongTien.add(
//                    donGia.multiply(BigDecimal.valueOf(soLuongCanCap))
//            );
//
//
//            // 5.4. Trừ kho theo từng lô, từ hạn sử dụng sớm đến muộn.
//            int conLai = soLuongCanCap;
//
//            for (KhoLot lot : lots) {
//                if (conLai <= 0) {
//                    break;
//                }
//
//                int soLuongTru = Math.min(conLai, lot.soLuongTon);
//
//                int soDongCapNhat = jdbcTemplate.update(
//                        """
//                        UPDATE KhoThuoc
//                        SET SoLuongTon = SoLuongTon - ?,
//                            ThoiGianCapNhatCuoi = ?
//                        WHERE MaKhoThuoc = ?
//                          AND SoLuongTon >= ?
//                        """,
//                        soLuongTru,
//                        Timestamp.valueOf(thoiGianCap),
//                        lot.maKhoThuoc,
//                        soLuongTru
//                );
//
//                if (soDongCapNhat != 1) {
//                    throw new IllegalStateException(
//                            "Không thể cập nhật tồn kho. Vui lòng tải lại dữ liệu kho."
//                    );
//                }
//
//                conLai -= soLuongTru;
//            }
//
//            if (conLai > 0) {
//                throw new IllegalStateException(
//                        "Không thể trừ đủ số lượng tồn kho."
//                );
//            }
//        }


        // 5. Kiểm tra số lượng, khóa các lô kho và trừ kho.
        for (DuocSiCapThuocRequest.ChiTietCapThuoc item
                : request.getChiTiet()) {

            // Mã thuốc được kê ban đầu.
            Integer maThuocGoc = item.getMaThuoc();
            int soLuongCanCap = item.getSoLuongThucCap();

            // 5.1. Lấy thuốc thực tế cần cấp.
            // Nếu không chọn thuốc thay thế thì sử dụng MaThuoc gốc.
            List<ThuocCapThucTe> chiTietThucTe = jdbcTemplate.query(
                    """
                    SELECT
                        COALESCE(ct.MaThuocThucCap, ct.MaThuoc)
                            AS MaThuocThucCap,
                        ct.SoLuong,
                        CASE
                            WHEN ct.MaThuocThucCap IS NOT NULL
                                THEN t.Gia
                            ELSE ct.DonGiaBan
                        END AS DonGia
                    FROM CTDonThuoc ct
                    JOIN Thuoc t
                        ON t.MaThuoc = COALESCE(
                            ct.MaThuocThucCap,
                            ct.MaThuoc
                        )
                    WHERE ct.MaDonThuoc = ?
                      AND ct.MaThuoc = ?
                    FOR UPDATE
                    """,
                    (rs, rowNum) -> new ThuocCapThucTe(
                            rs.getInt("MaThuocThucCap"),
                            rs.getInt("SoLuong"),
                            rs.getBigDecimal("DonGia")
                    ),
                    maDonThuoc,
                    maThuocGoc
            );

            if (chiTietThucTe.isEmpty()) {
                throw new IllegalArgumentException(
                        "Không tìm thấy thuốc gốc trong đơn thuốc."
                );
            }

            ThuocCapThucTe ct = chiTietThucTe.get(0);

            // Mã thuốc thực tế sẽ dùng để kiểm tra và trừ kho.
            Integer maThuoc = ct.maThuocThucCap();

            // 5.2. Nếu có thuốc thay thế, kiểm tra quan hệ tương đương.
            if (!maThuoc.equals(maThuocGoc)) {
                Integer hopLe = jdbcTemplate.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM ThuocTuongDuong tt
                        JOIN Thuoc t
                            ON t.MaThuoc = tt.MaThuocThayThe
                        WHERE tt.MaThuoc = ?
                          AND tt.MaThuocThayThe = ?
                          AND tt.TrangThai = 'Đang áp dụng'
                          AND t.TrangThai = TRUE
                        """,
                        Integer.class,
                        maThuocGoc,
                        maThuoc
                );

                if (hopLe == null || hopLe == 0) {
                    throw new IllegalStateException(
                            "Thuốc thay thế không còn hợp lệ "
                                    + "hoặc không được phép áp dụng."
                    );
                }
            }

            // 5.3. Kiểm tra số lượng thực cấp.
            int soLuongKe = ct.soLuong();

            if (soLuongCanCap != soLuongKe) {
                throw new IllegalStateException(
                        "Số lượng thực cấp phải khớp số lượng "
                                + "đã lưu trong đơn thuốc."
                );
            }

            // 5.4. Kiểm tra đơn giá của thuốc thực cấp.
            BigDecimal donGia = ct.donGia();

            if (donGia == null || donGia.signum() < 0) {
                throw new IllegalStateException(
                        "Đơn giá thuốc thực cấp không hợp lệ."
                );
            }

            tongTien = tongTien.add(
                    donGia.multiply(
                            BigDecimal.valueOf(soLuongCanCap)
                    )
            );

            // 5.5. Lấy và khóa các lô tồn kho của thuốc THỰC CẤP.
            // Ưu tiên lô có hạn sử dụng sớm nhất.
            List<KhoLot> lots = jdbcTemplate.query(
                    """
                    SELECT MaKhoThuoc, SoLuongTon
                    FROM KhoThuoc
                    WHERE MaThuoc = ?
                      AND SoLuongTon > 0
                      AND HanSuDung >= CURDATE()
                    ORDER BY HanSuDung ASC, MaKhoThuoc ASC
                    FOR UPDATE
                    """,
                    (rs, rowNum) -> new KhoLot(
                            rs.getInt("MaKhoThuoc"),
                            rs.getInt("SoLuongTon")
                    ),
                    maThuoc
            );

            // Tính tổng tồn kho của các lô còn hạn.
            int tongTon = lots.stream()
                    .mapToInt(lot -> lot.soLuongTon)
                    .sum();

            if (tongTon < soLuongCanCap) {
                String tenThuoc = jdbcTemplate.query(
                        """
                        SELECT TenThuoc
                        FROM Thuoc
                        WHERE MaThuoc = ?
                        """,
                        rs -> rs.next()
                                ? rs.getString("TenThuoc")
                                : "không xác định",
                        maThuoc
                );

                throw new IllegalStateException(
                        "Thuốc " + tenThuoc
                                + " không đủ tồn kho. Tồn kho: "
                                + tongTon
                                + ", số lượng cần cấp: "
                                + soLuongCanCap + "."
                );
            }

            // 5.6. Trừ kho theo từng lô.
            int conLai = soLuongCanCap;

            for (KhoLot lot : lots) {
                if (conLai <= 0) {
                    break;
                }

                int soLuongTru = Math.min(
                        conLai,
                        lot.soLuongTon
                );

                int soDongCapNhat = jdbcTemplate.update(
                        """
                        UPDATE KhoThuoc
                        SET SoLuongTon = SoLuongTon - ?,
                            ThoiGianCapNhatCuoi = ?
                        WHERE MaKhoThuoc = ?
                          AND SoLuongTon >= ?
                        """,
                        soLuongTru,
                        Timestamp.valueOf(thoiGianCap),
                        lot.maKhoThuoc,
                        soLuongTru
                );

                if (soDongCapNhat != 1) {
                    throw new IllegalStateException(
                            "Không thể cập nhật tồn kho. "
                                    + "Vui lòng tải lại dữ liệu kho."
                    );
                }

                conLai -= soLuongTru;
            }

            if (conLai > 0) {
                throw new IllegalStateException(
                        "Không thể trừ đủ số lượng tồn kho."
                );
            }
        }

        // 6. Tạo phiếu cấp thuốc.
        jdbcTemplate.update(
                """
                INSERT INTO PhieuCapThuoc (
                    MaDonThuoc,
                    MaNguoiCap,
                    ThoiGianCap,
                    TongTien,
                    TrangThai
                )
                VALUES (?, ?, ?, ?, 'DaCapThuoc')
                """,
                maDonThuoc,
                maNguoiCap,
                Timestamp.valueOf(thoiGianCap),
                tongTien
        );

        // 7. Hoàn tất luồng cấp thuốc.
        // Chỉ chuyển sang HoanTat sau khi đã kiểm tra, trừ kho và tạo phiếu cấp thuốc.
        Integer maLichKham = jdbcTemplate.query(
                """
                SELECT hs.MaLichKham
                FROM DonThuoc d
                JOIN HoSoBenhAn hs ON hs.MaHoSoBenhAn = d.MaHoSoBenhAn
                WHERE d.MaDonThuoc = ?
                """,
                rs -> rs.next() ? rs.getInt("MaLichKham") : null,
                maDonThuoc
        );

        if (maLichKham == null) {
            throw new IllegalStateException(
                    "Không tìm thấy lịch khám liên kết với đơn thuốc."
            );
        }

        int soDongDonThuoc = jdbcTemplate.update(
                """
                UPDATE DonThuoc
                SET TrangThai = 'HoanTat'
                WHERE MaDonThuoc = ?
                  AND TrangThai = 'DangLayThuoc'
                """,
                maDonThuoc
        );

        if (soDongDonThuoc != 1) {
            throw new IllegalStateException(
                    "Không thể hoàn tất đơn thuốc. Vui lòng tải lại dữ liệu."
            );
        }

        // 8. Tạo thông báo cho dược sĩ.
        NguoiDung nguoiDung = nguoiDungRepository.findById(maNguoiCap)
                .orElseThrow(() ->
                        new IllegalStateException(
                                "Không tìm thấy người dùng dược sĩ."
                        )
                );

        String maHienThi = jdbcTemplate.query(
                """
                SELECT CONCAT('DP', LPAD(MaDonThuoc, 5, '0'))
                FROM DonThuoc
                WHERE MaDonThuoc = ?
                """,
                rs -> rs.next() ? rs.getString(1) : null,
                maDonThuoc
        );

        String tenBenhNhan = jdbcTemplate.query(
                """
                SELECT nd.HoTen
                FROM DonThuoc d
                JOIN HoSoBenhAn hs
                    ON hs.MaHoSoBenhAn = d.MaHoSoBenhAn
                JOIN LichDangKyKham lk
                    ON lk.MaLichKham = hs.MaLichKham
                JOIN BenhNhan bn
                    ON bn.MaBenhNhan = lk.MaBenhNhan
                JOIN Nguoidung nd
                    ON nd.MaNguoiDung = bn.MaNguoiDung
                WHERE d.MaDonThuoc = ?
                """,
                rs -> rs.next() ? rs.getString("HoTen") : "bệnh nhân",
                maDonThuoc
        );

        thongBaoWebSocketService.taoThongBao(
                nguoiDung,
                "Cấp thuốc thành công",
                "Đơn thuốc " + maHienThi
                        + " của bệnh nhân " + tenBenhNhan
                        + " đã được cấp thuốc.",
                "CAP_THUOC",
                "DaCapThuoc"
        );

        // Chỉ gửi thông báo WebSocket sau khi transaction commit.
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(
                    new TransactionSynchronization() {
                        @Override
                        public void afterCommit() {
                            thongBaoWebSocketService
                                    .guiSoThongBaoChuaDoc(nguoiDung);
                        }
                    }
            );
        } else {
            thongBaoWebSocketService.guiSoThongBaoChuaDoc(nguoiDung);
        }
    }

    // =====================================================
    // BẮT ĐẦU CẤP THUỐC
    // ChoLayThuoc -> DangLayThuoc
    // =====================================================

    //    @Transactional
    //    public void batDauCapThuoc(Integer maDonThuoc) {
    //
    //        if (maDonThuoc == null || maDonThuoc <= 0) {
    //            throw new IllegalArgumentException("Mã đơn thuốc không hợp lệ.");
    //        }
    //
    //        // 1. Khóa đơn thuốc và kiểm tra trạng thái hiện tại.
    //        List<String> statuses = jdbcTemplate.query(
    //                """
    //                SELECT TrangThai
    //                FROM DonThuoc
    //                WHERE MaDonThuoc = ?
    //                FOR UPDATE
    //                """,
    //                (rs, rowNum) -> rs.getString("TrangThai"),
    //                maDonThuoc
    //        );
    //
    //        if (statuses.isEmpty()) {
    //            throw new IllegalArgumentException("Không tìm thấy đơn thuốc.");
    //        }
    //
    //        String trangThaiDon = statuses.get(0);
    //
    //        if (!"ChoLayThuoc".equals(trangThaiDon)) {
    //            throw new IllegalStateException(
    //                    "Đơn thuốc không ở trạng thái chờ lấy thuốc."
    //            );
    //        }
    //
    //        // 2. Tìm lịch khám liên kết với đơn thuốc.
    //        Integer maLichKham = jdbcTemplate.query(
    //                """
    //                SELECT hs.MaLichKham
    //                FROM DonThuoc d
    //                JOIN HoSoBenhAn hs
    //                    ON hs.MaHoSoBenhAn = d.MaHoSoBenhAn
    //                WHERE d.MaDonThuoc = ?
    //                """,
    //                rs -> rs.next() ? rs.getInt("MaLichKham") : null,
    //                maDonThuoc
    //        );
    //
    //        if (maLichKham == null) {
    //            throw new IllegalStateException(
    //                    "Không tìm thấy lịch khám liên kết với đơn thuốc."
    //            );
    //        }
    //
    //        // 3. Kiểm tra bản tiếp nhận mới nhất của lịch khám.
    //        List<String> trangThaiTiepNhan = jdbcTemplate.query(
    //                """
    //                SELECT TrangThai
    //                FROM TiepNhanBenhNhan
    //                WHERE MaTiepNhan = (
    //                    SELECT MaTiepNhan
    //                    FROM (
    //                        SELECT MaTiepNhan
    //                        FROM TiepNhanBenhNhan
    //                        WHERE MaLichKham = ?
    //                        ORDER BY ThoiGianTiepNhan DESC, MaTiepNhan DESC
    //                        LIMIT 1
    //                    ) AS latest
    //                )
    //                """,
    //                (rs, rowNum) -> rs.getString("TrangThai"),
    //                maLichKham
    //        );
    //
    //        if (trangThaiTiepNhan.isEmpty()) {
    //            throw new IllegalStateException(
    //                    "Không tìm thấy thông tin tiếp nhận của lịch khám."
    //            );
    //        }
    //
    //        String trangThaiTN = trangThaiTiepNhan.get(0);
    //
    //        if (!"ChoLayThuoc".equals(trangThaiTN)) {
    //            throw new IllegalStateException(
    //                    "Trạng thái tiếp nhận không phải Chờ lấy thuốc."
    //            );
    //        }
    //
    //        // 4. Chuyển đơn thuốc sang Đang lấy thuốc.
    //        int soDongDonThuoc = jdbcTemplate.update(
    //                """
    //                UPDATE DonThuoc
    //                SET TrangThai = 'DangLayThuoc'
    //                WHERE MaDonThuoc = ?
    //                  AND TrangThai = 'ChoLayThuoc'
    //                """,
    //                maDonThuoc
    //        );
    //
    //        if (soDongDonThuoc != 1) {
    //            throw new IllegalStateException(
    //                    "Không thể bắt đầu lấy thuốc. Vui lòng tải lại dữ liệu."
    //            );
    //        }
    //
    //        // 5. Chuyển bản tiếp nhận mới nhất sang Đang lấy thuốc.
    //        int soDongTiepNhan = jdbcTemplate.update(
    //                """
    //                UPDATE TiepNhanBenhNhan
    //                SET TrangThai = 'DangLayThuoc'
    //                WHERE MaTiepNhan = (
    //                    SELECT MaTiepNhan
    //                    FROM (
    //                        SELECT MaTiepNhan
    //                        FROM TiepNhanBenhNhan
    //                        WHERE MaLichKham = ?
    //                        ORDER BY ThoiGianTiepNhan DESC, MaTiepNhan DESC
    //                        LIMIT 1
    //                    ) AS latest
    //                )
    //                  AND TrangThai = 'ChoLayThuoc'
    //                """,
    //                maLichKham
    //        );
    //
    //        if (soDongTiepNhan != 1) {
    //            throw new IllegalStateException(
    //                    "Không thể cập nhật trạng thái tiếp nhận bệnh nhân."
    //            );
    //        }
    //
    //        // 6. Chuyển lịch khám sang Đang lấy thuốc.
    //        int soDongLichKham = jdbcTemplate.update(
    //                """
    //                UPDATE LichDangKyKham
    //                SET TrangThai = 'DangLayThuoc'
    //                WHERE MaLichKham = ?
    //                  AND TrangThai = 'DangKham'
    //                """,
    //                maLichKham
    //        );
    //
    //        if (soDongLichKham != 1) {
    //            throw new IllegalStateException(
    //                    "Không thể cập nhật trạng thái lịch khám. "
    //                            + "Vui lòng kiểm tra trạng thái lịch khám."
    //            );
    //        }
    //    }

//    @Transactional
//    public void batDauCapThuoc(Integer maDonThuoc) {
//
//        if (maDonThuoc == null || maDonThuoc <= 0) {
//            throw new IllegalArgumentException("Mã đơn thuốc không hợp lệ.");
//        }
//
//        // Khóa đơn thuốc để tránh hai yêu cầu bắt đầu lấy thuốc cùng lúc.
//        List<String> statuses = jdbcTemplate.query(
//                """
//                SELECT TrangThai
//                FROM DonThuoc
//                WHERE MaDonThuoc = ?
//                FOR UPDATE
//                """,
//                (rs, rowNum) -> rs.getString("TrangThai"),
//                maDonThuoc
//        );
//
//        if (statuses.isEmpty()) {
//            throw new IllegalArgumentException("Không tìm thấy đơn thuốc.");
//        }
//
//        if (!"ChoLayThuoc".equals(statuses.get(0))) {
//            throw new IllegalStateException(
//                    "Đơn thuốc không ở trạng thái Chờ lấy thuốc."
//            );
//        }
//
//        // Lấy lịch khám liên kết với đơn thuốc.
//        Integer maLichKham = jdbcTemplate.query(
//                """
//                SELECT hs.MaLichKham
//                FROM DonThuoc d
//                JOIN HoSoBenhAn hs ON hs.MaHoSoBenhAn = d.MaHoSoBenhAn
//                WHERE d.MaDonThuoc = ?
//                """,
//                rs -> rs.next() ? rs.getInt("MaLichKham") : null,
//                maDonThuoc
//        );
//
//        if (maLichKham == null) {
//            throw new IllegalStateException(
//                    "Không tìm thấy lịch khám liên kết với đơn thuốc."
//            );
//        }
//
//        // Xác nhận bản tiếp nhận mới nhất đang chờ lấy thuốc.
//        List<String> trangThaiTiepNhan = jdbcTemplate.query(
//                """
//                SELECT TrangThai
//                FROM TiepNhanBenhNhan
//                WHERE MaTiepNhan = (
//                    SELECT MaTiepNhan
//                    FROM (
//                        SELECT MaTiepNhan
//                        FROM TiepNhanBenhNhan
//                        WHERE MaLichKham = ?
//                        ORDER BY ThoiGianTiepNhan DESC, MaTiepNhan DESC
//                        LIMIT 1
//                    ) AS latest
//                )
//                """,
//                (rs, rowNum) -> rs.getString("TrangThai"),
//                maLichKham
//        );
//
//        if (trangThaiTiepNhan.isEmpty()
//                || !"ChoLayThuoc".equals(trangThaiTiepNhan.get(0))) {
//            throw new IllegalStateException(
//                    "Thông tin tiếp nhận không ở trạng thái Chờ lấy thuốc."
//            );
//        }
//
//        // Bước 1: ChoLayThuoc -> DangLayThuoc ở đơn thuốc.
//        int soDongDonThuoc = jdbcTemplate.update(
//                """
//                UPDATE DonThuoc
//                SET TrangThai = 'DangLayThuoc'
//                WHERE MaDonThuoc = ?
//                  AND TrangThai = 'ChoLayThuoc'
//                """,
//                maDonThuoc
//        );
//
//        if (soDongDonThuoc != 1) {
//            throw new IllegalStateException(
//                    "Không thể bắt đầu lấy thuốc. Vui lòng tải lại dữ liệu."
//            );
//        }
//
//        // Bước 2: cập nhật bản tiếp nhận mới nhất.
//        int soDongTiepNhan = jdbcTemplate.update(
//                """
//                UPDATE TiepNhanBenhNhan
//                SET TrangThai = 'DangLayThuoc'
//                WHERE MaTiepNhan = (
//                    SELECT MaTiepNhan
//                    FROM (
//                        SELECT MaTiepNhan
//                        FROM TiepNhanBenhNhan
//                        WHERE MaLichKham = ?
//                        ORDER BY ThoiGianTiepNhan DESC, MaTiepNhan DESC
//                        LIMIT 1
//                    ) AS latest
//                )
//                  AND TrangThai = 'ChoLayThuoc'
//                """,
//                maLichKham
//        );
//
//        if (soDongTiepNhan != 1) {
//            throw new IllegalStateException(
//                    "Không thể cập nhật trạng thái tiếp nhận bệnh nhân."
//            );
//        }
//
//        // Bước 3: lịch khám phải đang DangKham trước khi chuyển sang DangLayThuoc.
//        int soDongLichKham = jdbcTemplate.update(
//                """
//                UPDATE LichDangKyKham
//                SET TrangThai = 'DangLayThuoc'
//                WHERE MaLichKham = ?
//                  AND TrangThai = 'DangKham'
//                """,
//                maLichKham
//        );
//
//        if (soDongLichKham != 1) {
//            throw new IllegalStateException(
//                    "Không thể cập nhật trạng thái lịch khám. "
//                            + "Lịch khám cần ở trạng thái DangKham."
//            );
//        }
//    }

    // ===============================================
    // BẮT ĐẦU CẤP THUỐC
    // ===============================================
    @Transactional
    public void batDauCapThuoc(Integer maDonThuoc) {

        if (maDonThuoc == null || maDonThuoc <= 0) {
            throw new IllegalArgumentException(
                    "Mã đơn thuốc không hợp lệ."
            );
        }

        // 1. Khóa đơn thuốc để tránh hai yêu cầu xử lý đồng thời.
        List<String> statuses = jdbcTemplate.query(
                """
                SELECT TrangThai
                FROM DonThuoc
                WHERE MaDonThuoc = ?
                FOR UPDATE
                """,
                (rs, rowNum) -> rs.getString("TrangThai"),
                maDonThuoc
        );

        if (statuses.isEmpty()) {
            throw new IllegalArgumentException(
                    "Không tìm thấy đơn thuốc."
            );
        }

        // 2. Chỉ cho phép bắt đầu lấy thuốc khi đơn đang chờ lấy thuốc.
        String trangThaiDon = statuses.get(0);

        if (!"ChoLayThuoc".equals(trangThaiDon)) {
            throw new IllegalStateException(
                    "Đơn thuốc không ở trạng thái Chờ lấy thuốc."
            );
        }

        // 3. Chuyển trạng thái đơn thuốc:
        // ChoLayThuoc -> DangLayThuoc.
        int soDongCapNhat = jdbcTemplate.update(
                """
                UPDATE DonThuoc
                SET TrangThai = 'DangLayThuoc'
                WHERE MaDonThuoc = ?
                  AND TrangThai = 'ChoLayThuoc'
                """,
                maDonThuoc
        );

        if (soDongCapNhat != 1) {
            throw new IllegalStateException(
                    "Không thể bắt đầu lấy thuốc. "
                            + "Vui lòng tải lại dữ liệu."
            );
        }
    }



    // =====================================================
    // ĐẠI DIỆN MỘT LÔ THUỐC TRONG KHO
    // =====================================================

    private static class KhoLot {
        private final Integer maKhoThuoc;
        private final Integer soLuongTon;

        private KhoLot(Integer maKhoThuoc, Integer soLuongTon) {
            this.maKhoThuoc = maKhoThuoc;
            this.soLuongTon = soLuongTon;
        }
    }
}
