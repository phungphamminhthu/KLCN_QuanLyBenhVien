package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.SePayWebhookRequest;
import QuanLyBenhVien.Entity.CTHoaDon;
import QuanLyBenhVien.Entity.CTThanhToan;
import QuanLyBenhVien.Entity.HoaDon;
import QuanLyBenhVien.Entity.LichDangKyKham;
import QuanLyBenhVien.Entity.ThanhToan;
import QuanLyBenhVien.Repository.CTHoaDonRepository;
import QuanLyBenhVien.Repository.CTThanhToanRepository;
import QuanLyBenhVien.Repository.HoaDonRepository;
import QuanLyBenhVien.Repository.LichDangKyKhamRepository;
import QuanLyBenhVien.Repository.ThanhToanRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class SePayService {

    private final HoaDonRepository hoaDonRepository;
    private final CTHoaDonRepository ctHoaDonRepository;
    private final ThanhToanRepository thanhToanRepository;
    private final CTThanhToanRepository ctThanhToanRepository;
    private final LichDangKyKhamRepository lichDangKyKhamRepository;
    private final JdbcTemplate jdbcTemplate;

    // Chấp nhận cả mã BV... cũ và MED... mới; phần số là MaHoaDon.
    private static final Pattern MA_HOA_DON_PATTERN =
            Pattern.compile("(?i)\\b(?:BV|MED)([0-9]+)\\b");

    @Value("${sepay.webhook-api-key:}")
    private String webhookApiKey;

    // Tài khoản nhận tiền dùng để đối chiếu webhook.
    @Value("${sepay.bank-account-number:${sepay.account-number:}}")
    private String bankAccountNumber;

    public SePayService(HoaDonRepository hoaDonRepository,
                        CTHoaDonRepository ctHoaDonRepository,
                        ThanhToanRepository thanhToanRepository,
                        CTThanhToanRepository ctThanhToanRepository,
                        LichDangKyKhamRepository lichDangKyKhamRepository,
                        JdbcTemplate jdbcTemplate) {
        this.hoaDonRepository = hoaDonRepository;
        this.ctHoaDonRepository = ctHoaDonRepository;
        this.thanhToanRepository = thanhToanRepository;
        this.ctThanhToanRepository = ctThanhToanRepository;
        this.lichDangKyKhamRepository = lichDangKyKhamRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    /** Xác thực header Authorization: Apikey <key>. */
    public boolean xacThucApiKey(String authorization) {
        if (webhookApiKey == null || webhookApiKey.isBlank()
                || authorization == null) {
            return false;
        }
        String expected = "Apikey " + webhookApiKey.trim();
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                authorization.trim().getBytes(StandardCharsets.UTF_8));
    }

    /** Xử lý webhook SePay trong một transaction duy nhất. */
    @Transactional(rollbackFor = Exception.class, isolation = Isolation.READ_COMMITTED)
    public String xuLyWebhook(SePayWebhookRequest request) {
        // 1. Kiểm tra payload và giao dịch tiền vào.
        if (request == null || request.id() == null || request.id() <= 0
                || request.transferAmount() == null
                || request.transferType() == null) {
            throw new IllegalArgumentException("Webhook thiếu thông tin giao dịch.");
        }
        if (!"in".equalsIgnoreCase(request.transferType())) {
            throw new IllegalArgumentException("Chỉ tiếp nhận giao dịch tiền vào.");
        }
        BigDecimal soTienChuyen = request.transferAmount();
        if (soTienChuyen.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Số tiền giao dịch phải lớn hơn 0.");
        }

        // 2. Đối chiếu tài khoản nhận tiền.
        if (bankAccountNumber == null || bankAccountNumber.isBlank()) {
            throw new IllegalStateException("Chưa cấu hình tài khoản nhận tiền SePay.");
        }
        if (request.accountNumber() == null
                || !bankAccountNumber.trim().equals(request.accountNumber().trim())) {
            throw new IllegalArgumentException("Tài khoản nhận tiền không khớp.");
        }

        // 3. Lấy mã hóa đơn từ code trước, sau đó content; hỗ trợ BV và MED.
        Integer maHoaDon = layMaHoaDon(request);
        String maGiaoDich = String.valueOf(request.id());

        // 4. Lấy hóa đơn ban đầu để xác định lịch, sau đó khóa lịch trước hóa đơn.
        HoaDon hoaDonBanDau = hoaDonRepository.findById(maHoaDon)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy hóa đơn " + maHoaDon + "."));
        if (hoaDonBanDau.getLichDangKyKham() == null) {
            throw new IllegalArgumentException("Hóa đơn không liên kết với lịch khám.");
        }
        Integer maLichKham = hoaDonBanDau.getLichDangKyKham().getMaLichKham();
        LichDangKyKham lich = lichDangKyKhamRepository.findByIdForUpdate(maLichKham)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lịch khám."));
        HoaDon hoaDon = hoaDonRepository.findByIdForUpdate(maHoaDon)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy hóa đơn."));

        // 5. Idempotency: webhook gửi lại cùng mã giao dịch thì không ghi lần nữa.
        Optional<ThanhToan> giaoDichCu = thanhToanRepository.findByMaGiaoDich(maGiaoDich);
        if (giaoDichCu.isPresent()) {
            ThanhToan daLuu = giaoDichCu.get();
            if (!maHoaDon.equals(daLuu.getMaHoaDon())) {
                throw new IllegalArgumentException("Mã giao dịch đã thuộc hóa đơn khác.");
            }
            return "Giao dịch đã được xử lý trước đó.";
        }

        // 6. Chặn lịch/hóa đơn bị hủy và trạng thái không hợp lệ.
        if (equalsStatus(lich.getTrangThai(), "DaHuy")
                || equalsStatus(lich.getTrangThai(), "KhongDen")
                || equalsStatus(lich.getTrangThaiThanhToan(), "DaHuy")
                || equalsStatus(hoaDon.getTrangThai(), "DaHuy")) {
            throw new IllegalArgumentException(
                    "Lịch khám hoặc hóa đơn đã hủy/không đến; cần đối soát giao dịch riêng.");
        }
        if (equalsStatus(hoaDon.getTrangThai(), "DaThanhToan")) {
            throw new IllegalArgumentException("Hóa đơn đã được thanh toán bằng giao dịch khác.");
        }
        if (!equalsStatus(hoaDon.getTrangThai(), "ChuaThanhToan")) {
            throw new IllegalArgumentException("Trạng thái hóa đơn không cho phép thanh toán.");
        }

        // 7. Chỉ xử lý các loại hóa đơn đang được hỗ trợ.
        String loaiHoaDon = hoaDon.getLoaiHoaDon();
        if (!equalsStatus(loaiHoaDon, "PhiKham")
                && !equalsStatus(loaiHoaDon, "CanLamSang")
                && !equalsStatus(loaiHoaDon, "Thuoc")) {
            throw new IllegalArgumentException("Loại hóa đơn chưa được hỗ trợ thanh toán SePay.");
        }
        // 8. Kiểm tra lịch và bệnh nhân liên kết với hóa đơn.
        ThongTinLichKham thongTinLich = jdbcTemplate.query(
                """
                SELECT
                    l.MaLichKham,
                    l.MaBenhNhan,
                    l.TrangThai,
                    l.TrangThaiThanhToan
                FROM LichDangKyKham l
                JOIN HoaDon h
                    ON h.MaLichKham = l.MaLichKham
                WHERE h.MaHoaDon = ?
                """,
                rs -> rs.next() ? new ThongTinLichKham(
                        rs.getInt("MaLichKham"),
                        rs.getInt("MaBenhNhan"),
                        rs.getString("TrangThai"),
                        rs.getString("TrangThaiThanhToan")
                ) : null,
                maHoaDon
        );

        if (thongTinLich == null) {
            throw new IllegalArgumentException(
                    "Hóa đơn chưa liên kết với lịch khám."
            );
        }

        // Kiểm tra bệnh nhân trên hóa đơn có khớp lịch khám không.
        Integer maBenhNhanHoaDon = jdbcTemplate.queryForObject(
                """
                SELECT MaBenhNhan
                FROM HoaDon
                WHERE MaHoaDon = ?
                """,
                Integer.class,
                maHoaDon
        );

        if (maBenhNhanHoaDon == null
                || !maBenhNhanHoaDon.equals(thongTinLich.maBenhNhan())) {
            throw new IllegalArgumentException(
                    "Hóa đơn không khớp bệnh nhân của lịch khám."
            );
        }

        // Kiểm tra chi tiết hóa đơn thuốc thuộc đúng lịch khám.
        if (equalsStatus(loaiHoaDon, "Thuoc")) {

            Integer soChiTietKhongHopLe = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM CTHoaDon cth
                    LEFT JOIN CTDonThuoc ctdt
                        ON ctdt.MaCTDonThuoc = cth.MaCTDonThuoc
                    LEFT JOIN DonThuoc dt
                        ON dt.MaDonThuoc = ctdt.MaDonThuoc
                    LEFT JOIN HoSoBenhAn hs
                        ON hs.MaHoSoBenhAn = dt.MaHoSoBenhAn
                    WHERE cth.MaHoaDon = ?
                      AND (
                            cth.MaCTDonThuoc IS NULL
                            OR ctdt.MaCTDonThuoc IS NULL
                            OR dt.MaDonThuoc IS NULL
                            OR hs.MaHoSoBenhAn IS NULL
                            OR hs.MaLichKham <> ?
                      )
                    """,
                    Integer.class,
                    maHoaDon,
                    maLichKham
            );

            if (soChiTietKhongHopLe == null
                    || soChiTietKhongHopLe > 0) {
                throw new IllegalArgumentException(
                        "Chi tiết hóa đơn thuốc không thuộc đúng đơn thuốc của lịch khám."
                );
            }
        }

        // 9. Nghiệp vụ riêng từng loại hóa đơn.
        // Phí khám: cho phép thanh toán online trước khi bệnh nhân đến bệnh viện.
        // Không yêu cầu lịch phải ở trạng thái DaGoi.
        if (equalsStatus(loaiHoaDon, "PhiKham")) {

            if (equalsStatus(lich.getTrangThaiThanhToan(), "DaThanhToan")) {
                throw new IllegalArgumentException(
                        "Lịch khám đã ghi nhận thanh toán phí khám.");
            }

            Integer soHoaDonPhiKham = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM HoaDon " +
                            "WHERE MaLichKham=? " +
                            "AND LoaiHoaDon='PhiKham' " +
                            "AND (TrangThai IS NULL OR TrangThai<>'DaHuy')",
                    Integer.class,
                    maLichKham
            );

            if (soHoaDonPhiKham == null || soHoaDonPhiKham != 1) {
                throw new IllegalArgumentException(
                        "Có nhiều hóa đơn phí khám hoặc dữ liệu hóa đơn chưa hợp lệ.");
            }

        }
        //        else if (equalsStatus(loaiHoaDon, "CanLamSang")) {
        //
        //            // Cho phép thanh toán CLS khi đang chờ thanh toán
        //            // hoặc đã chuyển ChoCLS nhưng tiếp nhận chưa được đồng bộ.
        //            if (!equalsStatus(lich.getTrangThai(), "ChoThanhToan")
        //                    && !equalsStatus(lich.getTrangThai(), "ChoCLS")) {
        //                throw new IllegalArgumentException(
        //                        "Chỉ thanh toán CLS khi lịch khám đang ChoThanhToan hoặc ChoCLS.");
        //            }
        //        }

        // TienThuoc không yêu cầu lịch ở trạng thái DaGoi/ChoThanhToan.

        // 10. Kiểm tra tổng tiền hóa đơn và chi tiết.
        BigDecimal tongTien = hoaDon.getTongTien();
        if (tongTien == null || tongTien.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Tổng tiền hóa đơn không hợp lệ.");
        }
        if (tongTien.compareTo(soTienChuyen) != 0) {
            throw new IllegalArgumentException("Số tiền chuyển khoản không khớp hóa đơn.");
        }
        List<CTHoaDon> chiTiet = ctHoaDonRepository.findByHoaDon_MaHoaDon(maHoaDon);
        if (chiTiet == null || chiTiet.isEmpty()) {
            throw new IllegalArgumentException("Hóa đơn chưa có chi tiết để liên kết thanh toán.");
        }
        BigDecimal tongChiTiet = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(ThanhTien),0) FROM CTHoaDon WHERE MaHoaDon=?",
                BigDecimal.class, maHoaDon);
        if (tongChiTiet == null || tongChiTiet.compareTo(tongTien) != 0) {
            throw new IllegalArgumentException("Tổng tiền chi tiết hóa đơn không khớp tổng hóa đơn.");
        }

        // 11. Chặn một hóa đơn được ghi nhận nhiều giao dịch thành công.
        Integer soGiaoDich = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM ThanhToan WHERE MaHoaDon=? " +
                        "AND (TrangThai IS NULL OR TrangThai<>'ThatBai')",
                Integer.class, maHoaDon);
        if (soGiaoDich != null && soGiaoDich > 0) {
            throw new IllegalArgumentException(
                    "Hóa đơn đã có giao dịch thanh toán; cần đối soát trước khi ghi nhận thêm.");
        }

        // 12. Lưu thanh toán và các liên kết chi tiết.
        ThanhToan thanhToan = new ThanhToan();
        thanhToan.setMaHoaDon(maHoaDon);
        thanhToan.setNgayThanhToan(LocalDateTime.now());
        thanhToan.setSoTien(soTienChuyen);
        thanhToan.setPhuongThucThanhToan("Chuyển khoản");
        thanhToan.setTrangThai("DaThanhToan");
        thanhToan.setMaGiaoDich(maGiaoDich);
        thanhToan.setNguoiThu(null);
        thanhToan = thanhToanRepository.saveAndFlush(thanhToan);

        for (CTHoaDon ct : chiTiet) {
            CTThanhToan ctThanhToan = new CTThanhToan();
            ctThanhToan.setMaThanhToan(thanhToan.getMaThanhToan());
            ctThanhToan.setMaCTHoaDon(ct.getMaCTHoaDon());
            ctThanhToanRepository.save(ctThanhToan);
        }

        // 13. Cập nhật hóa đơn.
        hoaDon.setTrangThai("DaThanhToan");
        hoaDonRepository.saveAndFlush(hoaDon);

        // 14. Cập nhật lịch theo đúng loại hóa đơn.
        if (equalsStatus(loaiHoaDon, "PhiKham")) {

            int updated = jdbcTemplate.update(
                    "UPDATE LichDangKyKham " +
                            "SET TrangThaiThanhToan='DaThanhToan' " +
                            "WHERE MaLichKham=? " +
                            "AND (TrangThaiThanhToan IS NULL " +
                            "OR TrangThaiThanhToan<>'DaThanhToan')",
                    maLichKham
            );

            if (updated != 1) {
                throw new IllegalStateException(
                        "Không cập nhật được trạng thái thanh toán lịch khám.");
            }

        } else if (equalsStatus(loaiHoaDon, "CanLamSang")) {

            int soChiDinhDuocMo = jdbcTemplate.update(
                    """
                    UPDATE ChiDinhYTe cd
                    JOIN CTHoaDon ct
                        ON ct.MaChiDinh = cd.MaChiDinh
                    SET cd.TrangThai = 'ChoThucHien'
                    WHERE ct.MaHoaDon = ?
                      AND cd.TrangThai = 'ChoThanhToan'
                    """,
                    maHoaDon
            );

            if (soChiDinhDuocMo <= 0) {
                throw new IllegalStateException(
                        "Không tìm thấy chỉ định CLS hợp lệ "
                                + "thuộc hóa đơn cần thanh toán."
                );
            }
        }

        // TienThuoc: không tự thay đổi trạng thái lịch khám.

        return "Thanh toán hóa đơn " + maHoaDon + " thành công.";
    }

    private Integer layMaHoaDon(SePayWebhookRequest request) {
        Integer maHoaDon = timMaHoaDonTrongChuoi(request.code());
        if (maHoaDon == null) {
            maHoaDon = timMaHoaDonTrongChuoi(request.content());
        }
        if (maHoaDon == null) {
            throw new IllegalArgumentException("Không tìm thấy mã hóa đơn BV hoặc MED hợp lệ.");
        }
        return maHoaDon;
    }

    private Integer timMaHoaDonTrongChuoi(String noiDung) {
        if (noiDung == null || noiDung.isBlank()) return null;
        Matcher matcher = MA_HOA_DON_PATTERN.matcher(noiDung);
        if (!matcher.find()) return null;
        try {
            long ma = Long.parseLong(matcher.group(1));
            if (ma <= 0 || ma > Integer.MAX_VALUE) return null;
            return (int) ma;
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private boolean equalsStatus(String actual, String expected) {
        return actual != null && expected.equalsIgnoreCase(actual.trim());
    }

    private record ThongTinLichKham(
            Integer maLichKham,
            Integer maBenhNhan,
            String trangThai,
            String trangThaiThanhToan) {}
}
