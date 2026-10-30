
package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.SePayWebhookRequest;
import QuanLyBenhVien.Entity.HoaDon;
import QuanLyBenhVien.Repository.HoaDonRepository;
import QuanLyBenhVien.Entity.CTHoaDon;
import QuanLyBenhVien.Entity.CTThanhToan;
import QuanLyBenhVien.Entity.ThanhToan;
import QuanLyBenhVien.Repository.CTHoaDonRepository;
import QuanLyBenhVien.Repository.CTThanhToanRepository;
import QuanLyBenhVien.Repository.ThanhToanRepository;
import java.time.LocalDateTime;
import java.util.List;
import QuanLyBenhVien.Entity.LichDangKyKham;
import QuanLyBenhVien.Repository.LichDangKyKhamRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class SePayService {

    private final HoaDonRepository hoaDonRepository;
    private final CTHoaDonRepository ctHoaDonRepository;
    private final ThanhToanRepository thanhToanRepository;
    private final CTThanhToanRepository ctThanhToanRepository;
    private final LichDangKyKhamRepository lichDangKyKhamRepository;

    @Value("${sepay.webhook-api-key:}")
    private String webhookApiKey;

    private static final Pattern MA_HOA_DON_PATTERN =
            Pattern.compile("(?i)\\bBV([0-9]+)\\b");

    public SePayService(HoaDonRepository hoaDonRepository,
                        CTHoaDonRepository ctHoaDonRepository,
                        ThanhToanRepository thanhToanRepository,
                        CTThanhToanRepository ctThanhToanRepository,
                        LichDangKyKhamRepository lichDangKyKhamRepository) {
        this.hoaDonRepository = hoaDonRepository;
        this.ctHoaDonRepository = ctHoaDonRepository;
        this.thanhToanRepository = thanhToanRepository;
        this.ctThanhToanRepository = ctThanhToanRepository;
        this.lichDangKyKhamRepository = lichDangKyKhamRepository;
    }


    /**
     * Xác thực header Authorization: Apikey <key>
     */
    public boolean xacThucApiKey(String authorization) {

        System.out.println(
                "SePay API key configured: "
                        + (webhookApiKey != null && !webhookApiKey.isBlank())
        );

        System.out.println(
                "Authorization header received: "
                        + (authorization != null
                        && authorization.startsWith("Apikey "))
        );

        if (webhookApiKey == null || webhookApiKey.isBlank()
                || authorization == null) {
            return false;
        }

        String expected = "Apikey " + webhookApiKey;

        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                authorization.getBytes(StandardCharsets.UTF_8)
        );
    }

    /**
     * Xử lý giao dịch và cập nhật trạng thái hóa đơn.
     */
//    @Transactional
//    public String xuLyWebhook(SePayWebhookRequest request) {
//
//        if (request == null) {
//            throw new IllegalArgumentException(
//                    "Dữ liệu webhook không hợp lệ."
//            );
//        }
//
//        if (request.id() == null
//                || request.transferAmount() == null
//                || request.transferType() == null) {
//            throw new IllegalArgumentException(
//                    "Webhook thiếu mã giao dịch, số tiền hoặc loại giao dịch."
//            );
//        }
//
//        // Chỉ xử lý tiền vào
//        if (!"in".equalsIgnoreCase(request.transferType())) {
//            throw new IllegalArgumentException(
//                    "Giao dịch không phải tiền vào."
//            );
//        }
//
//        if (request.transferAmount().compareTo(BigDecimal.ZERO) <= 0) {
//            throw new IllegalArgumentException(
//                    "Số tiền giao dịch phải lớn hơn 0."
//            );
//        }
//
//        // Ưu tiên trường code, sau đó tìm trong content.
//        String noiDung = request.code();
//
//        if (noiDung == null || noiDung.isBlank()) {
//            noiDung = request.content();
//        }
//
//        if (noiDung == null || noiDung.isBlank()) {
//            throw new IllegalArgumentException(
//                    "Không có mã hóa đơn trong giao dịch."
//            );
//        }
//
//        Matcher matcher = MA_HOA_DON_PATTERN.matcher(noiDung);
//
//        if (!matcher.find()) {
//            throw new IllegalArgumentException(
//                    "Không tìm thấy mã hóa đơn dạng BV5 trong giao dịch."
//            );
//        }
//
//        Integer maHoaDon;
//
//        try {
//            maHoaDon = Integer.valueOf(matcher.group(1));
//        } catch (NumberFormatException ex) {
//            throw new IllegalArgumentException(
//                    "Mã hóa đơn không hợp lệ."
//            );
//        }
//
//        HoaDon hoaDon = hoaDonRepository.findById(maHoaDon)
//                .orElseThrow(() -> new IllegalArgumentException(
//                        "Không tìm thấy hóa đơn có mã " + maHoaDon + "."
//                ));
//
//        // Webhook có thể được SePay gửi lại.
//        if ("DaThanhToan".equalsIgnoreCase(hoaDon.getTrangThai())) {
//            return "Hóa đơn đã được thanh toán trước đó.";
//        }
//
//        if (!"ChuaThanhToan".equalsIgnoreCase(hoaDon.getTrangThai())) {
//            throw new IllegalArgumentException(
//                    "Trạng thái hóa đơn không cho phép thanh toán."
//            );
//        }
//
//        if (hoaDon.getTongTien() == null
//                || hoaDon.getTongTien().compareTo(
//                request.transferAmount()) != 0) {
//            throw new IllegalArgumentException(
//                    "Số tiền giao dịch không khớp tổng tiền hóa đơn."
//            );
//        }
//
//        hoaDon.setTrangThai("DaThanhToan");
//        hoaDonRepository.save(hoaDon);
//
//        return "Thanh toán hóa đơn BV" + maHoaDon + " thành công.";
//    }

    @Transactional
    public String xuLyWebhook(SePayWebhookRequest request) {

        if (request == null
                || request.id() == null
                || request.transferAmount() == null
                || request.transferType() == null) {
            throw new IllegalArgumentException(
                    "Webhook thiếu thông tin giao dịch.");
        }

        if (!"in".equalsIgnoreCase(request.transferType())) {
            throw new IllegalArgumentException(
                    "Giao dịch không phải tiền vào.");
        }

        if (request.transferAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(
                    "Số tiền giao dịch phải lớn hơn 0.");
        }

        //        String noiDung = request.code();
        //
        //        if (noiDung == null || noiDung.isBlank()) {
        //            noiDung = request.content();
        //        }
        //
        //        if (noiDung == null || noiDung.isBlank()) {
        //            throw new IllegalArgumentException(
        //                    "Không có mã hóa đơn trong giao dịch.");
        //        }
        //
        //        Matcher matcher = MA_HOA_DON_PATTERN.matcher(noiDung);
        //
        //        if (!matcher.find()) {
        //            throw new IllegalArgumentException(
        //                    "Không tìm thấy mã hóa đơn dạng BV5.");
        //        }
        //
        //        Integer maHoaDon;
        //
        //        try {
        //            maHoaDon = Integer.valueOf(matcher.group(1));
        //        } catch (NumberFormatException ex) {
        //            throw new IllegalArgumentException(
        //                    "Mã hóa đơn không hợp lệ.");
        //        }


        String noiDung = request.code();
        Matcher matcher = null;

        // Tìm mã hóa đơn trong trường code trước
        if (noiDung != null && !noiDung.isBlank()) {
            matcher = MA_HOA_DON_PATTERN.matcher(noiDung);
        }

        // Nếu code không chứa mã BV..., tìm tiếp trong content
        if (matcher == null || !matcher.find()) {
            noiDung = request.content();

            if (noiDung == null || noiDung.isBlank()) {
                throw new IllegalArgumentException(
                        "Không có mã hóa đơn trong giao dịch."
                );
            }

            matcher = MA_HOA_DON_PATTERN.matcher(noiDung);

            if (!matcher.find()) {
                throw new IllegalArgumentException(
                        "Không tìm thấy mã hóa đơn dạng BV trong giao dịch."
                );
            }
        }

        Integer maHoaDon;

        try {
            maHoaDon = Integer.valueOf(matcher.group(1));
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException(
                    "Mã hóa đơn không hợp lệ."
            );
        }


        // Kiểm tra hóa đơn
        //        HoaDon hoaDon = hoaDonRepository.findById(maHoaDon)
        //                .orElseThrow(() -> new IllegalArgumentException(
        //                        "Không tìm thấy hóa đơn " + maHoaDon));
        //
        ////        if (!"Thuoc".equalsIgnoreCase(hoaDon.getLoaiHoaDon())) {
        ////            throw new IllegalArgumentException(
        ////                    "Mã hóa đơn này không phải hóa đơn thuốc."
        ////            );
        ////        }
        //        // Chặn xử lý lại giao dịch đã lưu
        //        String maGiaoDich = String.valueOf(request.id());
        //
        //        if (thanhToanRepository.existsByMaGiaoDich(maGiaoDich)) {
        //            return "Giao dịch đã được xử lý trước đó.";
        //        }
        //
        //        if ("DaThanhToan".equalsIgnoreCase(hoaDon.getTrangThai())) {
        //            throw new IllegalArgumentException(
        //                    "Hóa đơn đã được thanh toán.");
        //        }
        //
        //        if (!"ChuaThanhToan".equalsIgnoreCase(hoaDon.getTrangThai())) {
        //            throw new IllegalArgumentException(
        //                    "Trạng thái hóa đơn không cho phép thanh toán.");
        //        }
        //
        //        if (hoaDon.getTongTien() == null
        //                || hoaDon.getTongTien().compareTo(
        //                request.transferAmount()) != 0) {
        //            throw new IllegalArgumentException(
        //                    "Số tiền giao dịch không khớp hóa đơn.");
        //        }
        //
        //        // Lấy chi tiết hóa đơn đã được lập trước đó
        //        List<CTHoaDon> chiTiet =
        //                ctHoaDonRepository.findByHoaDon_MaHoaDon(
        //                        hoaDon.getMaHoaDon());
        //
        //        if (chiTiet.isEmpty()) {
        //            throw new IllegalArgumentException(
        //                    "Hóa đơn chưa có chi tiết để liên kết thanh toán.");
        //        }
        //
        //        // 1. Tạo bản ghi ThanhToan
        //        ThanhToan thanhToan = new ThanhToan();
        //        thanhToan.setMaHoaDon(maHoaDon);
        //        thanhToan.setNgayThanhToan(LocalDateTime.now());
        //        thanhToan.setSoTien(request.transferAmount());
        //        thanhToan.setPhuongThucThanhToan("Chuyển khoản");
        //        thanhToan.setTrangThai("DaThanhToan");
        //        thanhToan.setMaGiaoDich(maGiaoDich);
        //
        //        thanhToan = thanhToanRepository.saveAndFlush(thanhToan);
        //
        //        // 2. Tạo các liên kết CTThanhToan
        //        for (CTHoaDon ct : chiTiet) {
        //            CTThanhToan ctThanhToan = new CTThanhToan();
        //
        //            ctThanhToan.setMaThanhToan(
        //                    thanhToan.getMaThanhToan());
        //
        //            ctThanhToan.setMaCTHoaDon(
        //                    ct.getMaCTHoaDon());
        //
        //            ctThanhToanRepository.save(ctThanhToan);
        //        }
        //
        //        // 3. Cập nhật hóa đơn
        //        hoaDon.setTrangThai("DaThanhToan");
        //        hoaDonRepository.save(hoaDon);
        //
        //        return "Thanh toán hóa đơn BV"
        //                + maHoaDon + " thành công.";
        // 1. Tìm hóa đơn ban đầu để lấy mã lịch khám
        HoaDon hoaDonBanDau = hoaDonRepository.findById(maHoaDon)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy hóa đơn " + maHoaDon
                ));

        if (hoaDonBanDau.getLichDangKyKham() == null) {
            throw new IllegalArgumentException(
                    "Hóa đơn không liên kết với lịch khám."
            );
        }

        Integer maLichKham =
                hoaDonBanDau.getLichDangKyKham().getMaLichKham();

        // 2. Khóa lịch khám trước
        LichDangKyKham lich = lichDangKyKhamRepository
                .findByIdForUpdate(maLichKham)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy lịch khám."
                ));

        // 3. Khóa hóa đơn sau khi đã khóa lịch khám
        HoaDon hoaDon = hoaDonRepository
                .findByIdForUpdate(maHoaDon)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy hóa đơn."
                ));

        // 4. Chặn thanh toán nếu lịch đã bị hủy
        if ("DaHuy".equalsIgnoreCase(lich.getTrangThai())
                || "DaHuy".equalsIgnoreCase(lich.getTrangThaiThanhToan())
                || "DaHuy".equalsIgnoreCase(hoaDon.getTrangThai())) {

            throw new IllegalArgumentException(
                    "Lịch khám đã bị hủy. Giao dịch cần được kiểm tra và xử lý riêng."
            );
        }

        // 5. Kiểm tra webhook trùng
        String maGiaoDich = String.valueOf(request.id());

        if (thanhToanRepository.existsByMaGiaoDich(maGiaoDich)) {
            return "Giao dịch đã được xử lý trước đó.";
        }

        // 6. Kiểm tra trạng thái hóa đơn
        if ("DaThanhToan".equalsIgnoreCase(hoaDon.getTrangThai())) {
            throw new IllegalArgumentException(
                    "Hóa đơn đã được thanh toán."
            );
        }

        if (!"ChuaThanhToan".equalsIgnoreCase(hoaDon.getTrangThai())) {
            throw new IllegalArgumentException(
                    "Trạng thái hóa đơn không cho phép thanh toán."
            );
        }

        // 8. Kiểm tra số tiền
        if (hoaDon.getTongTien() == null
                || hoaDon.getTongTien().compareTo(
                request.transferAmount()) != 0) {

            throw new IllegalArgumentException(
                    "Số tiền giao dịch không khớp hóa đơn."
            );
        }

        // 9. Lấy chi tiết hóa đơn
        List<CTHoaDon> chiTiet =
                ctHoaDonRepository.findByHoaDon_MaHoaDon(maHoaDon);

        if (chiTiet.isEmpty()) {
            throw new IllegalArgumentException(
                    "Hóa đơn chưa có chi tiết để liên kết thanh toán."
            );
        }

        // 10. Tạo bản ghi thanh toán
        ThanhToan thanhToan = new ThanhToan();

        thanhToan.setMaHoaDon(maHoaDon);
        thanhToan.setNgayThanhToan(LocalDateTime.now());
        thanhToan.setSoTien(request.transferAmount());
        thanhToan.setPhuongThucThanhToan("Chuyển khoản");
        thanhToan.setTrangThai("DaThanhToan");
        thanhToan.setMaGiaoDich(maGiaoDich);

        thanhToan = thanhToanRepository.saveAndFlush(thanhToan);

        // 11. Tạo liên kết chi tiết thanh toán
        for (CTHoaDon ct : chiTiet) {

            CTThanhToan ctThanhToan = new CTThanhToan();

            ctThanhToan.setMaThanhToan(
                    thanhToan.getMaThanhToan()
            );

            ctThanhToan.setMaCTHoaDon(
                    ct.getMaCTHoaDon()
            );

            ctThanhToanRepository.save(ctThanhToan);
        }

        // 12. Cập nhật hóa đơn
        hoaDon.setTrangThai("DaThanhToan");
        hoaDonRepository.save(hoaDon);

        // 13. Cập nhật lịch khám
        lich.setTrangThaiThanhToan("DaThanhToan");

        lichDangKyKhamRepository.save(lich);

        return "Thanh toán hóa đơn BV"
                + maHoaDon + " thành công.";
    }
}
