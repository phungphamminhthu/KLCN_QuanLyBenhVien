
package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.SePayWebhookRequest;
import QuanLyBenhVien.Entity.HoaDon;
import QuanLyBenhVien.Entity.CTHoaDon;
import QuanLyBenhVien.Entity.CTThanhToan;
import QuanLyBenhVien.Entity.ThanhToan;

import QuanLyBenhVien.Repository.HoaDonRepository;
import QuanLyBenhVien.Repository.CTHoaDonRepository;
import QuanLyBenhVien.Repository.CTThanhToanRepository;
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
    private final JdbcTemplate jdbcTemplate;

    @Value("${sepay.webhook-api-key:}")
    private String webhookApiKey;

    // Số tài khoản ngân hàng nhận tiền trong SePay.
    // Sẽ cấu hình ở bước tiếp theo.
    @Value("${sepay.bank-account-number:}")
    private String bankAccountNumber;

    // SePay đã cấu hình:
    // Prefix MED, theo sau là 6 đến 8 chữ số.
    // Ví dụ: MED000123
    private static final Pattern MA_HOA_DON_PATTERN =
            Pattern.compile("(?i)MED([0-9]{6,8})(?![0-9])");

    public SePayService(
            HoaDonRepository hoaDonRepository,
            CTHoaDonRepository ctHoaDonRepository,
            ThanhToanRepository thanhToanRepository,
            CTThanhToanRepository ctThanhToanRepository,
            JdbcTemplate jdbcTemplate
    ) {
        this.hoaDonRepository = hoaDonRepository;
        this.ctHoaDonRepository = ctHoaDonRepository;
        this.thanhToanRepository = thanhToanRepository;
        this.ctThanhToanRepository = ctThanhToanRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    // =====================================================
    // 1. XÁC THỰC WEBHOOK SEPAY BẰNG API KEY
    // =====================================================

    public boolean xacThucApiKey(String authorization) {

        if (webhookApiKey == null
                || webhookApiKey.isBlank()
                || authorization == null) {
            return false;
        }

        String expected = "Apikey " + webhookApiKey.trim();

        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                authorization.getBytes(StandardCharsets.UTF_8)
        );
    }

    // =====================================================
    // 2. XỬ LÝ GIAO DỊCH TỪ SEPAY
    // =====================================================

    @Transactional(
            rollbackFor = Exception.class,
            isolation = Isolation.READ_COMMITTED
    )
    public String xuLyWebhook(SePayWebhookRequest request) {

        // -------------------------------------------------
        // BƯỚC 1: KIỂM TRA DỮ LIỆU WEBHOOK
        // -------------------------------------------------

        if (request == null
                || request.id() == null
                || request.id() <= 0
                || request.transferAmount() == null
                || request.transferType() == null) {

            throw new IllegalArgumentException(
                    "Webhook thiếu thông tin giao dịch."
            );
        }

        if (!"in".equalsIgnoreCase(request.transferType())) {
            throw new IllegalArgumentException(
                    "Chỉ tiếp nhận giao dịch tiền vào."
            );
        }

        if (request.transferAmount()
                .compareTo(BigDecimal.ZERO) <= 0) {

            throw new IllegalArgumentException(
                    "Số tiền chuyển khoản không hợp lệ."
            );
        }

        // -------------------------------------------------
        // BƯỚC 2: KIỂM TRA TÀI KHOẢN NHẬN TIỀN
        // -------------------------------------------------

        // Không chấp nhận Webhook nếu chưa cấu hình
        // tài khoản ngân hàng nhận tiền.
        if (bankAccountNumber == null
                || bankAccountNumber.isBlank()) {

            throw new IllegalStateException(
                    "Chưa cấu hình tài khoản nhận tiền SePay."
            );
        }

        if (request.accountNumber() == null
                || !bankAccountNumber.trim().equals(
                request.accountNumber().trim()
        )) {

            throw new IllegalArgumentException(
                    "Tài khoản nhận tiền không khớp."
            );
        }

        // -------------------------------------------------
        // BƯỚC 3: XÁC ĐỊNH HÓA ĐƠN THEO MÃ MED
        // -------------------------------------------------

        Integer maHoaDon = layMaHoaDon(request);

        String maGiaoDich = String.valueOf(request.id());

        // -------------------------------------------------
        // BƯỚC 4: KHÓA HÓA ĐƠN
        // -------------------------------------------------

        HoaDon hoaDon = hoaDonRepository
                .timHoaDonDeXuLyThanhToan(maHoaDon)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy hóa đơn " + maHoaDon
                ));

        // -------------------------------------------------
        // BƯỚC 5: KIỂM TRA WEBHOOK GỬI LẠI
        // -------------------------------------------------

        Optional<ThanhToan> giaoDichCu =
                thanhToanRepository.findByMaGiaoDich(
                        maGiaoDich
                );

        if (giaoDichCu.isPresent()) {

            ThanhToan daLuu = giaoDichCu.get();

            if (!maHoaDon.equals(daLuu.getMaHoaDon())) {
                throw new IllegalArgumentException(
                        "Mã giao dịch đã thuộc hóa đơn khác."
                );
            }

            return "Giao dịch MED"
                    + maHoaDon
                    + " đã được ghi nhận trước đó.";
        }

        // -------------------------------------------------
        // BƯỚC 6: KIỂM TRA TRẠNG THÁI HÓA ĐƠN
        // -------------------------------------------------

        if ("DaThanhToan".equals(hoaDon.getTrangThai())) {
            throw new IllegalArgumentException(
                    "Hóa đơn đã thanh toán bằng giao dịch khác."
            );
        }

        if (!"ChuaThanhToan".equals(
                hoaDon.getTrangThai())) {

            throw new IllegalArgumentException(
                    "Hóa đơn không ở trạng thái ChuaThanhToan."
            );
        }

        String loaiHoaDon = hoaDon.getLoaiHoaDon();

        if (!"PhiKham".equals(loaiHoaDon)
                && !"CanLamSang".equals(loaiHoaDon)
                && !"TienThuoc".equals(loaiHoaDon)) {

            throw new IllegalArgumentException(
                    "Loại hóa đơn chưa được hỗ trợ thanh toán."
            );
        }

        // -------------------------------------------------
        // BƯỚC 7: KIỂM TRA LỊCH KHÁM
        // -------------------------------------------------

        List<ThongTinLichKham> danhSachLich =
                jdbcTemplate.query(
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
                        (rs, rowNum) -> new ThongTinLichKham(
                                rs.getInt("MaLichKham"),
                                rs.getInt("MaBenhNhan"),
                                rs.getString("TrangThai"),
                                rs.getString("TrangThaiThanhToan")
                        ),
                        maHoaDon
                );

        if (danhSachLich.isEmpty()) {
            throw new IllegalArgumentException(
                    "Hóa đơn chưa liên kết với lịch khám."
            );
        }

        ThongTinLichKham lich = danhSachLich.get(0);

        // Đảm bảo hóa đơn thực sự thuộc bệnh nhân
        // của lịch khám.
        Integer maBenhNhanHoaDon =
                jdbcTemplate.queryForObject(
                        """
                        SELECT MaBenhNhan
                        FROM HoaDon
                        WHERE MaHoaDon = ?
                        """,
                        Integer.class,
                        maHoaDon
                );

        if (!lich.maBenhNhan().equals(
                maBenhNhanHoaDon)) {

            throw new IllegalArgumentException(
                    "Hóa đơn không khớp bệnh nhân."
            );
        }

        if ("DaHuy".equals(lich.trangThai())
                || "KhongDen".equals(lich.trangThai())) {

            throw new IllegalArgumentException(
                    "Lịch khám đã hủy hoặc bệnh nhân không đến."
            );
        }

        // -------------------------------------------------
        // BƯỚC 8: KIỂM TRA NGHIỆP VỤ TỪNG LOẠI HÓA ĐƠN
        // -------------------------------------------------

        if ("PhiKham".equals(loaiHoaDon)) {

            // Bệnh nhân phải được gọi trước khi thu phí khám.
            if (!"DaGoi".equals(lich.trangThai())) {
                throw new IllegalArgumentException(
                        "Bệnh nhân phải được gọi trước khi thanh toán phí khám."
                );
            }

            if ("DaThanhToan".equals(
                    lich.trangThaiThanhToan())) {

                throw new IllegalArgumentException(
                        "Lịch khám đã ghi nhận thanh toán phí khám."
                );
            }

            // Không cho thu nếu tồn tại nhiều hóa đơn
            // phí khám còn hiệu lực.
            Integer soHoaDonPhiKham =
                    jdbcTemplate.queryForObject(
                            """
                            SELECT COUNT(*)
                            FROM HoaDon
                            WHERE MaLichKham = ?
                              AND LoaiHoaDon = 'PhiKham'
                              AND (
                                  TrangThai IS NULL
                                  OR TrangThai <> 'DaHuy'
                              )
                            """,
                            Integer.class,
                            lich.maLichKham()
                    );

            if (soHoaDonPhiKham == null
                    || soHoaDonPhiKham != 1) {

                throw new IllegalArgumentException(
                        "Có nhiều hóa đơn phí khám hoặc dữ liệu chưa hợp lệ."
                );
            }
        }

        // Thanh toán CLS là nghiệp vụ riêng.
        // Không yêu cầu trạng thái DaGoi.
        if ("CanLamSang".equals(loaiHoaDon)
                && !"ChoThanhToan".equals(
                lich.trangThai())) {

            throw new IllegalArgumentException(
                    "Chỉ thanh toán CLS khi lịch khám đang ChoThanhToan."
            );
        }

        // Hóa đơn thuốc giữ luồng xử lý riêng,
        // không yêu cầu lịch khám ở trạng thái DaGoi.

        // -------------------------------------------------
        // BƯỚC 9: KIỂM TRA SỐ TIỀN
        // -------------------------------------------------

        BigDecimal tongTien = hoaDon.getTongTien();

        if (tongTien == null
                || tongTien.compareTo(BigDecimal.ZERO) <= 0) {

            throw new IllegalArgumentException(
                    "Tổng tiền hóa đơn không hợp lệ."
            );
        }

        if (tongTien.compareTo(
                request.transferAmount()) != 0) {

            throw new IllegalArgumentException(
                    "Số tiền chuyển khoản không khớp hóa đơn."
            );
        }

        List<CTHoaDon> chiTiet =
                ctHoaDonRepository.findByHoaDon_MaHoaDon(
                        maHoaDon
                );

        if (chiTiet.isEmpty()) {
            throw new IllegalArgumentException(
                    "Hóa đơn chưa có chi tiết."
            );
        }

        // Đối chiếu với tổng thành tiền chi tiết.
        BigDecimal tongChiTiet =
                jdbcTemplate.queryForObject(
                        """
                        SELECT COALESCE(SUM(ThanhTien), 0)
                        FROM CTHoaDon
                        WHERE MaHoaDon = ?
                        """,
                        BigDecimal.class,
                        maHoaDon
                );

        if (tongChiTiet == null
                || tongChiTiet.compareTo(tongTien) != 0) {

            throw new IllegalArgumentException(
                    "Tổng tiền chi tiết hóa đơn không khớp."
            );
        }

        // -------------------------------------------------
        // BƯỚC 10: CHỐNG GHI NHẬN THANH TOÁN TRÙNG
        // -------------------------------------------------

        Integer soGiaoDichKhongThatBai =
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
                        Integer.class,
                        maHoaDon
                );

        if (soGiaoDichKhongThatBai != null
                && soGiaoDichKhongThatBai > 0) {

            throw new IllegalArgumentException(
                    "Hóa đơn đã có giao dịch thanh toán. Cần đối soát."
            );
        }

        // -------------------------------------------------
        // BƯỚC 11: LƯU GIAO DỊCH SEPAY
        // -------------------------------------------------

        ThanhToan thanhToan = new ThanhToan();

        thanhToan.setMaHoaDon(maHoaDon);
        thanhToan.setNgayThanhToan(
                LocalDateTime.now()
        );
        thanhToan.setSoTien(
                request.transferAmount()
        );
        thanhToan.setPhuongThucThanhToan(
                "Chuyển khoản"
        );

        // Theo quy ước ưu tiên của nhóm.
        // Các giao dịch tiền mặt ThanhCong cũ
        // vẫn giữ nguyên, không sửa dữ liệu.
        thanhToan.setTrangThai("DaThanhToan");

        thanhToan.setMaGiaoDich(maGiaoDich);

        // SePay xác nhận tự động, không có nhân viên thu.
        thanhToan.setNguoiThu(null);

        thanhToan =
                thanhToanRepository.saveAndFlush(
                        thanhToan
                );

        // -------------------------------------------------
        // BƯỚC 12: LIÊN KẾT CHI TIẾT THANH TOÁN
        // -------------------------------------------------

        for (CTHoaDon ct : chiTiet) {

            CTThanhToan ctThanhToan =
                    new CTThanhToan();

            ctThanhToan.setMaThanhToan(
                    thanhToan.getMaThanhToan()
            );

            ctThanhToan.setMaCTHoaDon(
                    ct.getMaCTHoaDon()
            );

            ctThanhToanRepository.save(
                    ctThanhToan
            );
        }

        // -------------------------------------------------
        // BƯỚC 13: CẬP NHẬT HÓA ĐƠN
        // -------------------------------------------------

        hoaDon.setTrangThai("DaThanhToan");

        hoaDonRepository.saveAndFlush(hoaDon);

        // -------------------------------------------------
        // BƯỚC 14: CẬP NHẬT TRẠNG THÁI THANH TOÁN LỊCH KHÁM
        // -------------------------------------------------

        if ("PhiKham".equals(loaiHoaDon)) {

            int updated = jdbcTemplate.update(
                    """
                    UPDATE LichDangKyKham
                    SET TrangThaiThanhToan = 'DaThanhToan'
                    WHERE MaLichKham = ?
                      AND TrangThai = 'DaGoi'
                    """,
                    lich.maLichKham()
            );

            if (updated != 1) {
                throw new IllegalStateException(
                        "Không cập nhật được trạng thái thanh toán lịch khám."
                );
            }

            // KHÔNG tự chuyển trạng thái khám sang DaTiepNhan.
            // Việc tiếp nhận vẫn phải đáp ứng điều kiện
            // sinh hiệu và các nghiệp vụ hiện tại.
        }

        // Thanh toán CLS xong thì chuyển sang chờ CLS.
        // Không sửa trạng thái thanh toán phí khám.
        if ("CanLamSang".equals(loaiHoaDon)) {

            int updated = jdbcTemplate.update(
                    """
                    UPDATE LichDangKyKham
                    SET TrangThai = 'ChoCLS'
                    WHERE MaLichKham = ?
                      AND TrangThai = 'ChoThanhToan'
                    """,
                    lich.maLichKham()
            );

            if (updated != 1) {
                throw new IllegalStateException(
                        "Không cập nhật được trạng thái lịch khám sau thanh toán CLS."
                );
            }
        }

        // -------------------------------------------------
        // KẾT QUẢ
        // -------------------------------------------------

        return "Thanh toán hóa đơn MED"
                + String.format("%06d", maHoaDon)
                + " thành công.";
    }

    // =====================================================
    // 3. TÁCH MÃ HÓA ĐƠN TỪ NỘI DUNG CHUYỂN KHOẢN
    // =====================================================

    private Integer layMaHoaDon(
            SePayWebhookRequest request
    ) {

        // Ưu tiên code do SePay nhận diện.
        Integer maHoaDon = timMaHoaDonTrongChuoi(
                request.code()
        );

        // Nếu SePay không tách được code,
        // tiếp tục tìm trong nội dung chuyển khoản.
        if (maHoaDon == null) {
            maHoaDon = timMaHoaDonTrongChuoi(
                    request.content()
            );
        }

        if (maHoaDon == null) {
            throw new IllegalArgumentException(
                    "Không tìm thấy mã thanh toán MED hợp lệ."
            );
        }

        return maHoaDon;
    }

    private Integer timMaHoaDonTrongChuoi(
            String noiDung
    ) {

        if (noiDung == null || noiDung.isBlank()) {
            return null;
        }

        Matcher matcher =
                MA_HOA_DON_PATTERN.matcher(noiDung);

        if (!matcher.find()) {
            return null;
        }

        try {
            long maHoaDon =
                    Long.parseLong(matcher.group(1));

            if (maHoaDon <= 0
                    || maHoaDon > Integer.MAX_VALUE) {
                return null;
            }

            return (int) maHoaDon;

        } catch (NumberFormatException ex) {
            return null;
        }
    }

    // =====================================================
    // 4. THÔNG TIN LỊCH KHÁM PHỤC VỤ KIỂM TRA
    // =====================================================

    private record ThongTinLichKham(
            Integer maLichKham,
            Integer maBenhNhan,
            String trangThai,
            String trangThaiThanhToan
    ) {
    }
}
