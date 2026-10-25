
package QuanLyBenhVien.Service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@Service
public class DuocSiThanhToanService {

    private final JdbcTemplate jdbcTemplate;

    @Value("${sepay.bank-code:}")
    private String bankCode;

    @Value("${sepay.account-number:}")
    private String accountNumber;

    @Value("${sepay.account-name:}")
    private String accountName;

    public DuocSiThanhToanService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private Map<String, Object> timHoaDonTheoDonThuoc(
            Integer maDonThuoc
    ) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                """
                SELECT DISTINCT
                    hd.MaHoaDon,
                    hd.TongTien,
                    hd.TrangThai,
                    hd.LoaiHoaDon
                FROM HoaDon hd
                JOIN CTHoaDon cth
                    ON cth.MaHoaDon = hd.MaHoaDon
                JOIN CTDonThuoc ct
                    ON ct.MaCTDonThuoc = cth.MaCTDonThuoc
                WHERE ct.MaDonThuoc = ?
                  AND hd.LoaiHoaDon = 'Thuoc'
                ORDER BY hd.MaHoaDon DESC
                LIMIT 1
                """,
                maDonThuoc
        );

        if (rows.isEmpty()) {
            throw new IllegalArgumentException(
                    "Không tìm thấy hóa đơn thuốc của đơn thuốc này."
            );
        }

        return rows.get(0);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> taoQR(Integer maDonThuoc) {
        Map<String, Object> hd = timHoaDonTheoDonThuoc(maDonThuoc);

        String trangThai = String.valueOf(hd.get("TrangThai"));

        if (!"ChuaThanhToan".equalsIgnoreCase(trangThai)) {
            if ("DaThanhToan".equalsIgnoreCase(trangThai)) {
                throw new IllegalStateException(
                        "Hóa đơn này đã được thanh toán."
                );
            }

            throw new IllegalStateException(
                    "Trạng thái hóa đơn không cho phép thanh toán."
            );
        }

        Object rawAmount = hd.get("TongTien");

        if (!(rawAmount instanceof Number)) {
            throw new IllegalStateException(
                    "Không xác định được tổng tiền hóa đơn."
            );
        }

        BigDecimal tongTien = new BigDecimal(rawAmount.toString());

        if (tongTien.signum() <= 0
                || tongTien.stripTrailingZeros().scale() > 0) {
            throw new IllegalStateException(
                    "Tổng tiền hóa đơn phải là số nguyên dương tính bằng VND."
            );
        }

        if (bankCode == null || bankCode.isBlank()
                || accountNumber == null || accountNumber.isBlank()
                || accountName == null || accountName.isBlank()) {
            throw new IllegalStateException(
                    "Chưa cấu hình tài khoản nhận tiền SePay/VietQR."
            );
        }

        int maHoaDon = ((Number) hd.get("MaHoaDon")).intValue();
        long soTien = tongTien.longValueExact();
        String noiDung = "BV" + maHoaDon;

        String qrUrl = "https://img.vietqr.io/image/"
                + encode(bankCode.trim()) + "-"
                + encode(accountNumber.trim())
                + "-compact2.png?amount=" + soTien
                + "&addInfo=" + encode(noiDung)
                + "&accountName=" + encode(accountName.trim());

        return Map.of(
                "success", true,
                "maDonThuoc", maDonThuoc,
                "maHoaDon", maHoaDon,
                "tongTien", tongTien,
                "noiDung", noiDung,
                "qrUrl", qrUrl,
                "trangThai", trangThai
        );
    }

    @Transactional(readOnly = true)
    public Map<String, Object> layTrangThai(Integer maDonThuoc) {
        Map<String, Object> hd = timHoaDonTheoDonThuoc(maDonThuoc);

        return Map.of(
                "success", true,
                "maDonThuoc", maDonThuoc,
                "maHoaDon", ((Number) hd.get("MaHoaDon")).intValue(),
                "tongTien", hd.get("TongTien"),
                "trangThai", String.valueOf(hd.get("TrangThai"))
        );
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
