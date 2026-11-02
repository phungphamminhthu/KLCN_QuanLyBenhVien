
package QuanLyBenhVien.Controller;

import QuanLyBenhVien.Service.TiepNhanHoaDonService;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;

@RestController
public class SePayQrController {

    private final JdbcTemplate jdbcTemplate;
    private final TiepNhanHoaDonService hoaDonService;

    @Value("${sepay.bank-account-number:}")
    private String bankAccountNumber;

    public SePayQrController(
            JdbcTemplate jdbcTemplate,
            TiepNhanHoaDonService hoaDonService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.hoaDonService = hoaDonService;
    }

    // =====================================================
    // LẤY THÔNG TIN QR CHUYỂN KHOẢN PHÍ KHÁM
    // =====================================================

    @GetMapping(
            "/api/tiepnhan/hoa-don/{maHoaDon}/sepay-qr"
    )
    public ResponseEntity<?> layThongTinQr(
            @PathVariable Integer maHoaDon,
            Authentication authentication
    ) {

        // 1. Chỉ nhân viên tiếp nhận được sử dụng.
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getAuthorities().stream()
                .noneMatch(authority ->
                        "ROLE_TIEPNHAN".equals(
                                authority.getAuthority()
                        ))) {

            return ResponseEntity.status(403).body(
                    Map.of(
                            "success", false,
                            "message", "Không có quyền truy cập."
                    )
            );
        }

        // 2. Kiểm tra mã hóa đơn.
        if (maHoaDon == null || maHoaDon <= 0) {
            return ResponseEntity.badRequest().body(
                    Map.of(
                            "success", false,
                            "message", "Mã hóa đơn không hợp lệ."
                    )
            );
        }

        // 3. Kiểm tra cấu hình tài khoản SePay.
        if (bankAccountNumber == null
                || bankAccountNumber.isBlank()) {

            return ResponseEntity.internalServerError().body(
                    Map.of(
                            "success", false,
                            "message",
                            "Chưa cấu hình tài khoản SePay."
                    )
            );
        }

        // 4. Lấy thông tin hóa đơn từ database.
        List<HoaDonQr> danhSach = jdbcTemplate.query(
                """
                SELECT
                    h.MaHoaDon,
                    h.MaLichKham,
                    h.LoaiHoaDon,
                    h.TrangThai AS TrangThaiHoaDon,
                    h.TongTien,
                    l.TrangThai AS TrangThaiLichKham,
                    l.TrangThaiThanhToan,
                    l.NgayKham,
                    (
                        SELECT COUNT(*)
                        FROM ThanhToan t
                        WHERE t.MaHoaDon = h.MaHoaDon
                          AND (
                              t.TrangThai IS NULL
                              OR t.TrangThai <> 'ThatBai'
                          )
                    ) AS SoGiaoDich
                FROM HoaDon h
                JOIN LichDangKyKham l
                    ON h.MaLichKham = l.MaLichKham
                WHERE h.MaHoaDon = ?
                """,
                (rs, rowNum) -> new HoaDonQr(
                        rs.getInt("MaHoaDon"),
                        rs.getInt("MaLichKham"),
                        rs.getString("LoaiHoaDon"),
                        rs.getString("TrangThaiHoaDon"),
                        rs.getBigDecimal("TongTien"),
                        rs.getString("TrangThaiLichKham"),
                        rs.getString("TrangThaiThanhToan"),
                        rs.getDate("NgayKham").toLocalDate(),
                        rs.getInt("SoGiaoDich")
                ),
                maHoaDon
        );

        if (danhSach.isEmpty()) {
            return ResponseEntity.status(404).body(
                    Map.of(
                            "success", false,
                            "message", "Không tìm thấy hóa đơn."
                    )
            );
        }

        HoaDonQr hoaDon = danhSach.get(0);

        // 5. Kiểm tra quyền với lịch khám.
        // Service hiện tại của nhóm kiểm tra
        // quyền phân công của nhân viên tiếp nhận.
        hoaDonService.layDanhSachHoaDon(
                hoaDon.maLichKham(),
                authentication
        );

        // 6. Chỉ triển khai QR cho phí khám
        // tại bước tích hợp giao diện này.
        if (!"PhiKham".equals(hoaDon.loaiHoaDon())) {
            return ResponseEntity.status(409).body(
                    Map.of(
                            "success", false,
                            "message",
                            "QR này chỉ dành cho phí khám."
                    )
            );
        }

        // 7. Kiểm tra điều kiện thanh toán.
        if (!"ChuaThanhToan".equals(
                hoaDon.trangThaiHoaDon())
                || !"DaGoi".equals(
                hoaDon.trangThaiLichKham())
                || !"ChuaThanhToan".equals(
                hoaDon.trangThaiThanhToan())
                || hoaDon.soGiaoDich() > 0) {

            return ResponseEntity.status(409).body(
                    Map.of(
                            "success", false,
                            "message",
                            "Hóa đơn chưa đủ điều kiện tạo QR."
                    )
            );
        }

        // 8. Chỉ tạo QR cho lịch khám hôm nay.
        LocalDate homNay = LocalDate.now(
                ZoneId.of("Asia/Ho_Chi_Minh")
        );

        if (!homNay.equals(hoaDon.ngayKham())) {
            return ResponseEntity.status(409).body(
                    Map.of(
                            "success", false,
                            "message",
                            "Không phải lịch khám trong ngày."
                    )
            );
        }

        // 9. Không tạo QR khi hóa đơn không hợp lệ.
        BigDecimal soTien = hoaDon.tongTien();

        if (soTien == null
                || soTien.compareTo(BigDecimal.ZERO) <= 0) {

            return ResponseEntity.status(409).body(
                    Map.of(
                            "success", false,
                            "message", "Số tiền không hợp lệ."
                    )
            );
        }

        // SePay sử dụng 6-8 chữ số sau tiền tố MED.
        if (maHoaDon > 99999999) {
            return ResponseEntity.status(409).body(
                    Map.of(
                            "success", false,
                            "message",
                            "Mã hóa đơn vượt giới hạn mã MED."
                    )
            );
        }

        final long soTienVnd;

        try {
            soTienVnd = soTien.longValueExact();
        } catch (ArithmeticException ex) {
            return ResponseEntity.status(409).body(
                    Map.of(
                            "success", false,
                            "message",
                            "Số tiền phải là số nguyên VND."
                    )
            );
        }

        // 10. Tạo nội dung chuyển khoản.
        String maThanhToan = String.format(
                "MED%06d",
                maHoaDon
        );

        String soTaiKhoan = bankAccountNumber.trim();

        // 11. Tạo đường dẫn ảnh VietQR.
        // Không chứa API Key của Webhook.
        String qrUrl =
                "https://vietqr.app/img"
                        + "?acc=" + URLEncoder.encode(
                        soTaiKhoan,
                        StandardCharsets.UTF_8
                )
                        + "&bank=MB"
                        + "&amount=" + soTienVnd
                        + "&des=" + URLEncoder.encode(
                        maThanhToan,
                        StandardCharsets.UTF_8
                )
                        + "&template=compact";

        // 12. Chỉ trả thông tin cần thiết cho popup.
        // Không ghi nhận thanh toán tại đây.
        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "maHoaDon", maHoaDon,
                        "maLichKham", hoaDon.maLichKham(),
                        "nganHang", "MBBank",
                        "soTaiKhoan", soTaiKhoan,
                        "soTien", soTienVnd,
                        "noiDung", maThanhToan,
                        "qrUrl", qrUrl,
                        "trangThai", "ChuaThanhToan"
                )
        );
    }

    // =====================================================
    // DỮ LIỆU ĐỌC TỪ DATABASE
    // =====================================================

    private record HoaDonQr(
            Integer maHoaDon,
            Integer maLichKham,
            String loaiHoaDon,
            String trangThaiHoaDon,
            BigDecimal tongTien,
            String trangThaiLichKham,
            String trangThaiThanhToan,
            LocalDate ngayKham,
            Integer soGiaoDich
    ) {
    }
}
