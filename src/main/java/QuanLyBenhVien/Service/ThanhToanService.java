
package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.ThongTinQRResponse;
import QuanLyBenhVien.Entity.HoaDon;
import QuanLyBenhVien.Repository.HoaDonRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Service
public class ThanhToanService {

    private final HoaDonRepository hoaDonRepository;

    @Value("${sepay.bank-code:}")
    private String bankCode;

    @Value("${sepay.bank-account-number:}")
    private String accountNumber;

    @Value("${sepay.account-name:}")
    private String accountName;

    public ThanhToanService(HoaDonRepository hoaDonRepository) {
        this.hoaDonRepository = hoaDonRepository;
    }

    // =========================================
    // TẠO THÔNG TIN QR THEO HỒ SƠ BỆNH NHÂN
    // =========================================
    @Transactional(readOnly = true)
    public ThongTinQRResponse taoThongTinQR(
            Integer maHoaDon,
            Integer maBenhNhan) {

        // 1. Kiểm tra dữ liệu đầu vào
        if (maHoaDon == null || maHoaDon <= 0) {
            throw new IllegalArgumentException(
                    "Mã hóa đơn không hợp lệ."
            );
        }

        if (maBenhNhan == null || maBenhNhan <= 0) {
            throw new IllegalArgumentException(
                    "Mã hồ sơ bệnh nhân không hợp lệ."
            );
        }

        // 2. Tìm hóa đơn thuộc đúng hồ sơ bệnh nhân
        HoaDon hoaDon = hoaDonRepository
                .timHoaDonTheoMaVaBenhNhan(
                        maHoaDon,
                        maBenhNhan
                )
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Không tìm thấy hóa đơn thuộc hồ sơ bệnh nhân này."
                        )
                );

        // 3. Kiểm tra trạng thái hóa đơn
        String trangThai = hoaDon.getTrangThai();

        if ("DaHuy".equalsIgnoreCase(trangThai)) {
            throw new IllegalArgumentException(
                    "Hóa đơn đã bị hủy, không thể thanh toán."
            );
        }

        if (!"ChuaThanhToan".equalsIgnoreCase(trangThai)) {
            throw new IllegalArgumentException(
                    "Hóa đơn không ở trạng thái chờ thanh toán."
            );
        }

        // 4. Kiểm tra số tiền
        if (hoaDon.getTongTien() == null
                || hoaDon.getTongTien().signum() <= 0) {

            throw new IllegalArgumentException(
                    "Số tiền hóa đơn không hợp lệ."
            );
        }

        // 5. Kiểm tra cấu hình ngân hàng
        if (bankCode == null || bankCode.isBlank()
                || accountNumber == null || accountNumber.isBlank()
                || accountName == null || accountName.isBlank()) {

            throw new IllegalArgumentException(
                    "Chưa cấu hình tài khoản nhận tiền để tạo QR."
            );
        }

        // 6. Tạo nội dung chuyển khoản
        String noiDung = "BV" + hoaDon.getMaHoaDon();

        // 7. Tạo URL QR VietQR
        String qrUrl = "https://img.vietqr.io/image/"
                + encode(bankCode) + "-"
                + encode(accountNumber)
                + "-compact2.png?amount="
                + hoaDon.getTongTien()
                .stripTrailingZeros()
                .toPlainString()
                + "&addInfo="
                + encode(noiDung)
                + "&accountName="
                + encode(accountName);

        // 8. Trả thông tin QR về Flutter
        return new ThongTinQRResponse(
                hoaDon.getMaHoaDon(),
                hoaDon.getTongTien(),
                noiDung,
                bankCode,
                accountNumber,
                accountName,
                qrUrl,
                hoaDon.getTrangThai()
        );
    }

    // =========================================
    // ENCODE
    // =========================================
    private String encode(String value) {
        return URLEncoder.encode(
                value,
                StandardCharsets.UTF_8
        );
    }
}
