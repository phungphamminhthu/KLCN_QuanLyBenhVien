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

//    @Value("${sepay.bank-code}")
//    private String bankCode;
//
//    @Value("${sepay.account-number}")
//    private String accountNumber;
//
//    @Value("${sepay.account-name}")
//    private String accountName;
    @Value("${sepay.bank-code:}")
    private String bankCode;

    @Value("${sepay.account-number:}")
    private String accountNumber;

    @Value("${sepay.account-name:}")
    private String accountName;

    public ThanhToanService(HoaDonRepository hoaDonRepository) {
        this.hoaDonRepository = hoaDonRepository;
    }

    @Transactional(readOnly = true)
    public ThongTinQRResponse taoThongTinQR(
            Integer maHoaDon,
            String tenDangNhap) {

        HoaDon hoaDon = hoaDonRepository
                .timHoaDonCuaBenhNhan(maHoaDon, tenDangNhap)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Không tìm thấy hóa đơn hoặc bạn không có quyền truy cập."
                        ));

        if (!"ChuaThanhToan".equalsIgnoreCase(
                hoaDon.getTrangThai())) {
            throw new IllegalArgumentException(
                    "Hóa đơn không ở trạng thái chờ thanh toán."
            );
        }

        if (hoaDon.getTongTien() == null
                || hoaDon.getTongTien().signum() <= 0) {
            throw new IllegalArgumentException(
                    "Số tiền hóa đơn không hợp lệ."
            );
        }

        String noiDung = "BV" + hoaDon.getMaHoaDon();

        if (bankCode == null || bankCode.isBlank()
                || accountNumber == null || accountNumber.isBlank()
                || accountName == null || accountName.isBlank()) {

            throw new IllegalArgumentException(
                    "Chưa cấu hình tài khoản nhận tiền để tạo QR."
            );
        }

        String qrUrl = "https://img.vietqr.io/image/"
                + encode(bankCode) + "-"
                + encode(accountNumber)
                + "-compact2.png?amount="
                + hoaDon.getTongTien().stripTrailingZeros()
                .toPlainString()
                + "&addInfo="
                + encode(noiDung)
                + "&accountName="
                + encode(accountName);

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

    private String encode(String value) {
        return URLEncoder.encode(
                value,
                StandardCharsets.UTF_8
        );
    }
}