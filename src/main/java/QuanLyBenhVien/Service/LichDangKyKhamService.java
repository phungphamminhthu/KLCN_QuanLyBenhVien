
package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.DatLichKhamRequest;
import QuanLyBenhVien.DTO.LichKhamCuaToiResponse;
import QuanLyBenhVien.DTO.DatLichKhamResponse;
import QuanLyBenhVien.Entity.*;
import QuanLyBenhVien.Repository.*;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;

@Service
public class LichDangKyKhamService {

    private final LichDangKyKhamRepository lichRepository;
    private final LichLamViecRepository lichLamViecRepository;
    private final SoThuTuRepository soThuTuRepository;
    private final BenhNhanRepository benhNhanRepository;
    private final NguoiDungRepository nguoiDungRepository;
    private final HoaDonRepository hoaDonRepository;
    private final CTHoaDonRepository ctHoaDonRepository;
    private final DichVuYTeRepository dichVuYTeRepository;
    private final ThanhToanRepository thanhToanRepository;
    private final ThongBaoService thongBaoService;
    private final PhanCongTiepNhanRepository  phanCongTiepNhanRepository;


    //CTHoaDonRepository ctHoaDonRepository
    public LichDangKyKhamService(
            LichDangKyKhamRepository lichRepository,
            LichLamViecRepository lichLamViecRepository,
            SoThuTuRepository soThuTuRepository,
            BenhNhanRepository benhNhanRepository,
            NguoiDungRepository nguoiDungRepository,
            HoaDonRepository hoaDonRepository,
            CTHoaDonRepository ctHoaDonRepository,
            DichVuYTeRepository dichVuYTeRepository,
            ThanhToanRepository thanhToanRepository,
            ThongBaoService thongBaoService,
            PhanCongTiepNhanRepository phanCongTiepNhanRepository) {

        this.lichRepository = lichRepository;
        this.lichLamViecRepository = lichLamViecRepository;
        this.soThuTuRepository = soThuTuRepository;
        this.benhNhanRepository = benhNhanRepository;
        this.nguoiDungRepository = nguoiDungRepository;
        this.hoaDonRepository = hoaDonRepository;
        this.ctHoaDonRepository = ctHoaDonRepository;
        this.dichVuYTeRepository = dichVuYTeRepository;
        this.thanhToanRepository = thanhToanRepository;
        this.thongBaoService = thongBaoService;
        this.phanCongTiepNhanRepository = phanCongTiepNhanRepository;
    }

    //    @Transactional
    //    public DatLichKhamResponse datLichKham(
    //            DatLichKhamRequest request,
    //            Authentication authentication) {
    //
    //        // 1. Kiểm tra người dùng đăng nhập
    //        if (authentication == null
    //                || !authentication.isAuthenticated()
    //                || "anonymousUser".equals(authentication.getName())) {
    //            throw new IllegalArgumentException(
    //                    "Vui lòng đăng nhập trước khi đặt lịch.");
    //        }
    //
    //        if (request.getMaLichLamViec() == null) {
    //            throw new IllegalArgumentException(
    //                    "Vui lòng chọn lịch làm việc của bác sĩ.");
    //        }
    //
    //        if (request.getLyDoKham() == null
    //                || request.getLyDoKham().trim().isEmpty()) {
    //            throw new IllegalArgumentException(
    //                    "Vui lòng nhập lý do khám.");
    //        }
    //
    //        if (request.getLyDoKham().trim().length() > 255) {
    //            throw new IllegalArgumentException(
    //                    "Lý do khám không được vượt quá 255 ký tự.");
    //        }
    //
    //        // Kiểm tra giờ khám được chọn
    //        LocalTime gioKham = request.getGioKham();
    //
    //        if (gioKham == null) {
    //            throw new IllegalArgumentException(
    //                    "Vui lòng chọn khung giờ khám.");
    //        }
    //
    //        // 2. Lấy tài khoản đang đăng nhập
    //        String tenDangNhap = authentication.getName();
    //
    //        NguoiDung nguoiDung = nguoiDungRepository
    //                .findByTenDangNhap(tenDangNhap)
    //                .orElseThrow(() -> new IllegalArgumentException(
    //                        "Không tìm thấy tài khoản đăng nhập."));
    //
    //        // 3. Tìm hồ sơ bệnh nhân của tài khoản
    //        //        BenhNhan benhNhan = benhNhanRepository
    //        //                .findByNguoiDung_MaNguoiDung(
    //        //                        nguoiDung.getMaNguoiDung())
    //        //                .orElseThrow(() -> new IllegalArgumentException(
    //        //                        "Tài khoản chưa có hồ sơ bệnh nhân."));
    //        // 3. Lấy hồ sơ bệnh nhân được chọn và xác minh thuộc tài khoản đăng nhập
    //        if (request.getMaBenhNhan() == null) {
    //            throw new IllegalArgumentException(
    //                    "Vui lòng chọn hồ sơ bệnh nhân để đặt lịch.");
    //        }
    //
    //        BenhNhan benhNhan = benhNhanRepository
    //                .findByMaBenhNhanAndNguoiDung_MaNguoiDung(
    //                        request.getMaBenhNhan(),
    //                        nguoiDung.getMaNguoiDung()
    //                )
    //                .orElseThrow(() -> new IllegalArgumentException(
    //                        "Hồ sơ bệnh nhân không tồn tại hoặc không thuộc tài khoản của bạn."));
    //
    //        // 4. Lấy lịch làm việc thực tế từ database
    //        LichLamViec lichLamViec = lichLamViecRepository
    //                .findById(request.getMaLichLamViec())
    //                .orElseThrow(() -> new IllegalArgumentException(
    //                        "Lịch làm việc không tồn tại."));
    //
    //        // 5. Kiểm tra lịch làm việc còn hiệu lực
    //        if (!"DangLamViec".equals(lichLamViec.getTrangThai())) {
    //            throw new IllegalArgumentException(
    //                    "Lịch làm việc này hiện không khả dụng.");
    //        }
    //
    //        LocalDate ngayKham = lichLamViec.getNgayLamViec();
    //
    //        // Kiểm tra giờ khám nằm trong ca làm việc
    //        LocalTime gioBatDau = lichLamViec.getGioBatDau();
    //        LocalTime gioKetThuc = lichLamViec.getGioKetThuc();
    //
    //        if (gioKham.isBefore(gioBatDau)
    //                || !gioKham.isBefore(gioKetThuc)) {
    //            throw new IllegalArgumentException(
    //                    "Khung giờ khám không nằm trong ca làm việc của bác sĩ.");
    //        }
    //
    //        // Không cho đặt giờ đã qua trong ngày hiện tại
    //        if (ngayKham.equals(LocalDate.now())
    //                && !gioKham.isAfter(LocalTime.now())) {
    //            throw new IllegalArgumentException(
    //                    "Khung giờ khám đã qua. Vui lòng chọn giờ khác.");
    //        }
    //
    //        if (ngayKham.isBefore(LocalDate.now())) {
    //            throw new IllegalArgumentException(
    //                    "Không thể đặt lịch trong quá khứ.");
    //        }
    //
    //        // 6. Lấy bác sĩ và khoa từ lịch làm việc
    //        BacSi bacSi = lichLamViec.getBacSi();
    //
    //        if (bacSi == null) {
    //            throw new IllegalArgumentException(
    //                    "Lịch làm việc chưa được cấu hình bác sĩ.");
    //        }
    //
    //        Khoa khoa = bacSi.getKhoa();
    //
    //        if (khoa == null) {
    //            throw new IllegalArgumentException(
    //                    "Bác sĩ chưa được cấu hình khoa.");
    //        }
    //
    //        if (!Boolean.TRUE.equals(bacSi.getTrangThai())) {
    //            throw new IllegalArgumentException(
    //                    "Bác sĩ hiện không hoạt động.");
    //        }
    //
    //        /*
    //         * 7. Lấy giá khám từ bảng Khoa.
    //         * Không nhận giá khám từ Flutter.
    //         */
    //        BigDecimal giaKham = khoa.getGiaKham();
    //
    //        if (giaKham == null || giaKham.signum() < 0) {
    //            throw new IllegalArgumentException(
    //                    "Giá khám của khoa chưa được cấu hình hợp lệ.");
    //        }
    //
    //        // 8. Tìm số thứ tự cuối cùng của khoa trong ngày khám
    //        Integer soThuTuCuoi = soThuTuRepository
    //                .findTopByKhoa_MaKhoaAndNgayCapSoOrderBySoThuTuDesc(
    //                        khoa.getMaKhoa(), ngayKham)
    //                .map(SoThuTu::getSoThuTu)
    //                .orElse(0);
    //
    //        int soThuTuMoi = soThuTuCuoi + 1;
    //
    //        // 9. Tạo số thứ tự
    //        SoThuTu soThuTu = new SoThuTu();
    //        soThuTu.setSoThuTu(soThuTuMoi);
    //        soThuTu.setKhoa(khoa);
    //        soThuTu.setNgayCapSo(ngayKham);
    //        soThuTu.setTrangThai("ChoGoi");
    //        soThuTu.setThoiGianTao(LocalDateTime.now());
    //
    //        soThuTu = soThuTuRepository.saveAndFlush(soThuTu);
    //
    //        // 10. Tạo lịch khám
    //        //        LichDangKyKham lich = new LichDangKyKham();
    //        //        lich.setBenhNhan(benhNhan);
    //        //        lich.setBacSi(bacSi);
    //        //        lich.setKhoa(khoa);
    //        //        lich.setSoThuTu(soThuTu);
    //        //        lich.setNgayKham(ngayKham);
    //        //        lich.setGioKham(gioKham);
    //        //        lich.setLyDoKham(request.getLyDoKham().trim());
    //        //        lich.setNgayTao(LocalDateTime.now());
    //        //        lich.setTrangThai("ChoGoi");
    //        //
    //        //        lich = lichRepository.saveAndFlush(lich);
    //        // 10. Tạo lịch khám
    //        LocalDateTime ngayTao = LocalDateTime.now();
    //
    //        LichDangKyKham lich = new LichDangKyKham();
    //
    //        lich.setBenhNhan(benhNhan);
    //        lich.setBacSi(bacSi);
    //        lich.setKhoa(khoa);
    //        lich.setSoThuTu(soThuTu);
    //
    //        lich.setNgayKham(ngayKham);
    //        lich.setGioKham(gioKham);
    //        lich.setLyDoKham(request.getLyDoKham().trim());
    //
    //        // Thời gian tạo lịch
    //        lich.setNgayTao(ngayTao);
    //
    //            // Hạn thanh toán sau 24 giờ
    //        lich.setHanThanhToan(ngayTao.plusHours(24));
    //
    //        // Trạng thái lịch khám
    //        // Giữ nguyên trạng thái đang sử dụng trong project
    //        lich.setTrangThai("ChoGoi");
    //
    //        // Trạng thái thanh toán
    //        lich.setTrangThaiThanhToan("ChuaThanhToan");
    //
    //        // Chưa gửi thông báo nhắc
    //        lich.setDaNhacThanhToan12h(false);
    //        lich.setDaNhacThanhToan23h(false);
    //
    //        lich = lichRepository.saveAndFlush(lich);
    //
    //        // 11. Tạo hóa đơn cho lịch khám
    ////        HoaDon hoaDon = new HoaDon();
    ////        hoaDon.setBenhNhan(benhNhan);
    ////        hoaDon.setLichDangKyKham(lich);
    ////        hoaDon.setNgayLapHoaDon(LocalDateTime.now());
    ////        hoaDon.setTongTien(giaKham);
    ////        hoaDon.setTrangThai("ChuaThanhToan");
    ////
    ////        hoaDon = hoaDonRepository.saveAndFlush(hoaDon);
    //
    //        // 12. Tạo chi tiết hóa đơn
    ////        CTHoaDon chiTiet = new CTHoaDon();
    ////        chiTiet.setHoaDon(hoaDon);
    ////        chiTiet.setNoiDung("Phí khám - " + khoa.getTenKhoa());
    ////        chiTiet.setSoLuong(1);
    ////        chiTiet.setDonGia(giaKham);
    ////        chiTiet.setThanhTien(giaKham);
    ////
    ////        ctHoaDonRepository.save(chiTiet);
    //
    //        // 11. Tạo hóa đơn phí khám ban đầu
    //        // Tạo hóa đơn phí khám
    //        HoaDon hoaDon = new HoaDon();
    //        hoaDon.setBenhNhan(benhNhan);
    //        hoaDon.setLichDangKyKham(lich);
    //        hoaDon.setNgayLapHoaDon(LocalDateTime.now());
    //        hoaDon.setLoaiHoaDon("PhiKham");
    //        hoaDon.setTongTien(giaKham);
    //        hoaDon.setTrangThai("ChuaThanhToan");
    //
    //        hoaDon = hoaDonRepository.saveAndFlush(hoaDon);
    //
    //        // Tạo chi tiết hóa đơn phí khám
    //        CTHoaDon chiTiet = new CTHoaDon();
    //        chiTiet.setHoaDon(hoaDon);
    //        chiTiet.setNoiDung("Phí khám - " + khoa.getTenKhoa());
    //        chiTiet.setSoLuong(1);
    //        chiTiet.setDonGia(giaKham);
    //        chiTiet.setThanhTien(giaKham);
    //
    //        ctHoaDonRepository.save(chiTiet);
    //
    //        // 14. Tạo thông báo đặt lịch thành công
    //        String noiDungThongBao =
    //                "Bạn đã đặt lịch khám thành công cho "
    //                        + benhNhan.getHoTen()
    //                        + " vào ngày "
    //                        + ngayKham
    //                        + " lúc "
    //                        + gioKham
    //                        + ". Vui lòng theo dõi trạng thái lịch khám.";
    //
    //        thongBaoService.taoThongBaoVaGuiRealtime(
    //                nguoiDung.getMaNguoiDung(),
    //                benhNhan,
    //                "Đặt lịch khám thành công",
    //                noiDungThongBao,
    //                "DAT_LICH"
    //        );
    //
    //
    //        // 13. Trả kết quả cho Flutter
    //        return new DatLichKhamResponse(
    //                lich.getMaLichKham(),
    //                soThuTu.getMaSoThuTu(),
    //                soThuTu.getSoThuTu(),
    //                hoaDon.getMaHoaDon(),
    //                hoaDon.getTongTien(),
    //                lich.getTrangThai(),
    //                hoaDon.getTrangThai(),
    //                "Đặt lịch khám thành công."
    //        );
    //    }
    @Transactional
    public DatLichKhamResponse datLichKham(
            DatLichKhamRequest request,
            Authentication authentication) {

        // =========================================================
        // 1. KIỂM TRA ĐĂNG NHẬP
        // =========================================================
        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getName())) {

            throw new IllegalArgumentException(
                    "Vui lòng đăng nhập trước khi đặt lịch.");
        }

        if (request == null) {
            throw new IllegalArgumentException(
                    "Dữ liệu đặt lịch không hợp lệ.");
        }

        if (request.getMaLichLamViec() == null) {
            throw new IllegalArgumentException(
                    "Vui lòng chọn lịch làm việc của bác sĩ.");
        }

        if (request.getMaBenhNhan() == null) {
            throw new IllegalArgumentException(
                    "Vui lòng chọn hồ sơ bệnh nhân để đặt lịch.");
        }

        if (request.getLyDoKham() == null
                || request.getLyDoKham().trim().isEmpty()) {

            throw new IllegalArgumentException(
                    "Vui lòng nhập lý do khám.");
        }

        if (request.getLyDoKham().trim().length() > 255) {
            throw new IllegalArgumentException(
                    "Lý do khám không được vượt quá 255 ký tự.");
        }

        LocalTime gioKham = request.getGioKham();

        if (gioKham == null) {
            throw new IllegalArgumentException(
                    "Vui lòng chọn khung giờ khám.");
        }

        // =========================================================
        // 2. TIMEZONE VIỆT NAM
        // =========================================================
        ZoneId zoneId = ZoneId.of("Asia/Ho_Chi_Minh");

        LocalDate ngayHienTai = LocalDate.now(zoneId);
        LocalTime gioHienTai = LocalTime.now(zoneId);
        LocalDateTime ngayTao = LocalDateTime.now(zoneId);

        // =========================================================
        // 3. LẤY TÀI KHOẢN ĐANG ĐĂNG NHẬP
        // =========================================================
        String tenDangNhap = authentication.getName();

        NguoiDung nguoiDung = nguoiDungRepository
                .findByTenDangNhap(tenDangNhap)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy tài khoản đăng nhập."));

        // =========================================================
        // 4. LẤY HỒ SƠ BỆNH NHÂN THUỘC TÀI KHOẢN
        // =========================================================
        BenhNhan benhNhan = benhNhanRepository
                .findByMaBenhNhanAndNguoiDung_MaNguoiDung(
                        request.getMaBenhNhan(),
                        nguoiDung.getMaNguoiDung()
                )
                .orElseThrow(() -> new IllegalArgumentException(
                        "Hồ sơ bệnh nhân không tồn tại "
                                + "hoặc không thuộc tài khoản của bạn."));

        // =========================================================
        // 5. KHÓA LỊCH LÀM VIỆC ĐỂ TRÁNH ĐẶT VƯỢT CHỖ ĐỒNG THỜI
        // =========================================================
        LichLamViec lichLamViec = lichLamViecRepository
                .findByIdForUpdate(request.getMaLichLamViec())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Lịch làm việc không tồn tại."));

        // =========================================================
        // 6. KIỂM TRA TRẠNG THÁI LỊCH LÀM VIỆC
        // =========================================================
        if (!"DangLamViec".equals(lichLamViec.getTrangThai())) {
            throw new IllegalArgumentException(
                    "Lịch làm việc này hiện không khả dụng.");
        }

        LocalDate ngayKham = lichLamViec.getNgayLamViec();

        LocalTime gioBatDau = lichLamViec.getGioBatDau();
        LocalTime gioKetThuc = lichLamViec.getGioKetThuc();

        if (ngayKham == null
                || gioBatDau == null
                || gioKetThuc == null) {

            throw new IllegalArgumentException(
                    "Lịch làm việc chưa được cấu hình đầy đủ.");
        }

        // =========================================================
        // 7. KIỂM TRA NGÀY KHÁM
        // =========================================================
        if (ngayKham.isBefore(ngayHienTai)) {
            throw new IllegalArgumentException(
                    "Không thể đặt lịch trong quá khứ.");
        }

        // =========================================================
        // 8. KIỂM TRA SLOT 30 PHÚT
        // =========================================================
        if (gioKham.getMinute() % 30 != 0
                || gioKham.getSecond() != 0
                || gioKham.getNano() != 0) {

            throw new IllegalArgumentException(
                    "Khung giờ khám không hợp lệ.");
        }

        LocalTime gioKetThucSlot = gioKham.plusMinutes(30);

        // Slot phải nằm trọn trong ca làm việc
        if (gioKham.isBefore(gioBatDau)
                || gioKetThucSlot.isAfter(gioKetThuc)) {

            throw new IllegalArgumentException(
                    "Khung giờ khám không nằm trong ca làm việc của bác sĩ.");
        }

        // =========================================================
        // 9. KIỂM TRA GIỜ ĐÃ QUA
        // =========================================================
        if (ngayKham.equals(ngayHienTai)
                && !gioKham.isAfter(gioHienTai)) {

            throw new IllegalArgumentException(
                    "Khung giờ khám đã qua. Vui lòng chọn giờ khác.");
        }

        // =========================================================
        // 10. LẤY BÁC SĨ VÀ KHOA
        // =========================================================
        BacSi bacSi = lichLamViec.getBacSi();

        if (bacSi == null) {
            throw new IllegalArgumentException(
                    "Lịch làm việc chưa được cấu hình bác sĩ.");
        }

        Khoa khoa = bacSi.getKhoa();

        if (khoa == null) {
            throw new IllegalArgumentException(
                    "Bác sĩ chưa được cấu hình khoa.");
        }

        if (!Boolean.TRUE.equals(bacSi.getTrangThai())) {
            throw new IllegalArgumentException(
                    "Bác sĩ hiện không hoạt động.");
        }

        // =========================================================
        // 11. KIỂM TRA SỨC CHỨA SLOT
        // =========================================================
        long soLuotDaDat = lichRepository
                .countLuotKhamTrongKhung30Phut(
                        bacSi.getMaBacSi(),
                        ngayKham,
                        gioKham,
                        gioKetThucSlot
                );

        final int SUC_CHUA_SLOT = 10;

        if (soLuotDaDat >= SUC_CHUA_SLOT) {
            throw new IllegalArgumentException(
                    "Khung giờ khám đã hết chỗ. "
                            + "Vui lòng chọn khung giờ khác.");
        }

        // =========================================================
        // 12. LẤY GIÁ KHÁM TỪ KHOA
        // =========================================================
        BigDecimal giaKham = khoa.getGiaKham();

        if (giaKham == null || giaKham.signum() < 0) {
            throw new IllegalArgumentException(
                    "Giá khám của khoa chưa được cấu hình hợp lệ.");
        }

        // =========================================================
        // 13. TẠO SỐ THỨ TỰ
        // =========================================================
        Integer soThuTuCuoi = soThuTuRepository
                .findTopByKhoa_MaKhoaAndNgayCapSoOrderBySoThuTuDesc(
                        khoa.getMaKhoa(),
                        ngayKham
                )
                .map(SoThuTu::getSoThuTu)
                .orElse(0);

        int soThuTuMoi = soThuTuCuoi + 1;

        SoThuTu soThuTu = new SoThuTu();

        soThuTu.setSoThuTu(soThuTuMoi);
        soThuTu.setKhoa(khoa);
        soThuTu.setNgayCapSo(ngayKham);
        soThuTu.setTrangThai("ChoGoi");
        soThuTu.setThoiGianTao(ngayTao);

        soThuTu = soThuTuRepository.saveAndFlush(soThuTu);

        // =========================================================
        // 14. TẠO LỊCH KHÁM
        // =========================================================
        LichDangKyKham lich = new LichDangKyKham();

        lich.setBenhNhan(benhNhan);
        lich.setBacSi(bacSi);
        lich.setKhoa(khoa);
        lich.setSoThuTu(soThuTu);

        lich.setNgayKham(ngayKham);
        lich.setGioKham(gioKham);
        lich.setLyDoKham(request.getLyDoKham().trim());

        lich.setNgayTao(ngayTao);
        lich.setHanThanhToan(ngayTao.plusHours(24));

        lich.setTrangThai("ChoGoi");
        lich.setTrangThaiThanhToan("ChuaThanhToan");

        lich.setDaNhacThanhToan12h(false);
        lich.setDaNhacThanhToan23h(false);

        lich = lichRepository.saveAndFlush(lich);

        // =========================================================
        // 15. TẠO HÓA ĐƠN PHÍ KHÁM
        // =========================================================
        HoaDon hoaDon = new HoaDon();

        hoaDon.setBenhNhan(benhNhan);
        hoaDon.setLichDangKyKham(lich);
        hoaDon.setNgayLapHoaDon(ngayTao);
        hoaDon.setLoaiHoaDon("PhiKham");
        hoaDon.setTongTien(giaKham);
        hoaDon.setTrangThai("ChuaThanhToan");

        hoaDon = hoaDonRepository.saveAndFlush(hoaDon);

        // =========================================================
        // 16. TẠO CHI TIẾT HÓA ĐƠN
        // =========================================================
        CTHoaDon chiTiet = new CTHoaDon();

        chiTiet.setHoaDon(hoaDon);
        chiTiet.setNoiDung("Phí khám - " + khoa.getTenKhoa());
        chiTiet.setSoLuong(1);
        chiTiet.setDonGia(giaKham);
        chiTiet.setThanhTien(giaKham);

        ctHoaDonRepository.save(chiTiet);

        // =========================================================
        // 17. TẠO THÔNG BÁO
        // =========================================================
        String noiDungThongBao =
                "Bạn đã đặt lịch khám thành công cho "
                        + benhNhan.getHoTen()
                        + " vào ngày "
                        + ngayKham
                        + " lúc "
                        + gioKham
                        + ". Vui lòng theo dõi trạng thái lịch khám.";

        thongBaoService.taoThongBaoVaGuiRealtime(
                nguoiDung.getMaNguoiDung(),
                benhNhan,
                "Đặt lịch khám thành công",
                noiDungThongBao,
                "DAT_LICH"
        );

        // =========================================================
        // 17.1 THÔNG BÁO CHO NHÂN VIÊN TIẾP NHẬN
        // =========================================================
        guiThongBaoNhanVienTiepNhan(lich);

        // =========================================================
        // 18. TRẢ RESPONSE
        // =========================================================
        return new DatLichKhamResponse(
                lich.getMaLichKham(),
                soThuTu.getMaSoThuTu(),
                soThuTu.getSoThuTu(),
                hoaDon.getMaHoaDon(),
                hoaDon.getTongTien(),
                lich.getTrangThai(),
                hoaDon.getTrangThai(),
                "Đặt lịch khám thành công."
        );
    }

    // =========================================
    // lay lich kham cua toi
    // =========================================
    @Transactional(readOnly = true)
    public List<LichKhamCuaToiResponse> layLichKhamCuaToi(
            Integer maBenhNhan,
            Authentication authentication) {

        // 1. Kiểm tra đăng nhập
        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getName())) {

            throw new IllegalArgumentException(
                    "Vui lòng đăng nhập để xem lịch khám.");
        }

        // 2. Kiểm tra mã hồ sơ
        if (maBenhNhan == null || maBenhNhan <= 0) {
            throw new IllegalArgumentException(
                    "Vui lòng chọn hồ sơ bệnh nhân.");
        }

        // 3. Lấy tài khoản đang đăng nhập
        String tenDangNhap = authentication.getName();

        NguoiDung nguoiDung = nguoiDungRepository
                .findByTenDangNhap(tenDangNhap)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy tài khoản đăng nhập."));

        // 4. Kiểm tra hồ sơ bệnh nhân có thuộc tài khoản đăng nhập không
        BenhNhan benhNhan = benhNhanRepository
                .findByMaBenhNhanAndNguoiDung_MaNguoiDung(
                        maBenhNhan,
                        nguoiDung.getMaNguoiDung()
                )
                .orElseThrow(() -> new IllegalArgumentException(
                        "Hồ sơ bệnh nhân không tồn tại hoặc không thuộc tài khoản của bạn."));

        // 5. Chỉ lấy lịch khám của hồ sơ đang được chọn
        List<LichDangKyKham> danhSach =
                lichRepository
                        .findByBenhNhan_MaBenhNhanOrderByNgayKhamDescGioKhamDesc(
                                benhNhan.getMaBenhNhan()
                        );

        // 6. Chuyển dữ liệu sang DTO
        return danhSach.stream()
                .map(lich -> {

                    SoThuTu stt = lich.getSoThuTu();

                    // Lấy danh sách hóa đơn của lịch khám
                    List<HoaDon> danhSachHoaDon =
                            hoaDonRepository.findByLichDangKyKham_MaLichKham(
                                    lich.getMaLichKham()
                            );

                    // Loại bỏ hóa đơn đã hủy
                    List<HoaDon> hoaDonHopLe = danhSachHoaDon.stream()
                            .filter(h -> !"DaHuy".equals(h.getTrangThai()))
                            .toList();

                    // Tổng chi phí
                    BigDecimal tongChiPhi = hoaDonHopLe.stream()
                            .map(HoaDon::getTongTien)
                            .filter(t -> t != null)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    // Tổng tiền đã thanh toán
                    BigDecimal tongDaThanhToan =
                            thanhToanRepository.tinhTongDaThanhToanTheoLichKham(
                                    lich.getMaLichKham(),
                                    "DaThanhToan"
                            );

                    if (tongDaThanhToan == null) {
                        tongDaThanhToan = BigDecimal.ZERO;
                    }

                    // Số tiền còn lại
                    BigDecimal soTienConLai =
                            tongChiPhi.subtract(tongDaThanhToan);

                    if (soTienConLai.signum() < 0) {
                        soTienConLai = BigDecimal.ZERO;
                    }

                    // Lấy tên phòng khám
                    String tenPhong = null;

                    if (lich.getBacSi() != null
                            && lich.getNgayKham() != null
                            && lich.getGioKham() != null) {

                        List<LichLamViec> cacCaLamViec =
                                lichLamViecRepository
                                        .findByBacSi_MaBacSiAndNgayLamViecAndGioBatDauLessThanEqualAndGioKetThucGreaterThanEqual(
                                                lich.getBacSi().getMaBacSi(),
                                                lich.getNgayKham(),
                                                lich.getGioKham(),
                                                lich.getGioKham()
                                        );

                        if (!cacCaLamViec.isEmpty()
                                && cacCaLamViec.get(0).getPhong() != null) {

                            tenPhong = cacCaLamViec.get(0)
                                    .getPhong()
                                    .getTenPhong();
                        }
                    }

                    // Trả dữ liệu lịch khám
                    return new LichKhamCuaToiResponse(
                            lich.getMaLichKham(),
                            stt != null ? stt.getMaSoThuTu() : null,
                            stt != null ? stt.getSoThuTu() : null,
                            lich.getNgayKham(),
                            lich.getGioKham(),
                            lich.getKhoa() != null
                                    ? lich.getKhoa().getTenKhoa() : null,
                            lich.getBacSi() != null
                                    && lich.getBacSi().getNguoiDung() != null
                                    ? lich.getBacSi().getNguoiDung().getHoTen()
                                    : null,
                            tenPhong,
                            lich.getLyDoKham(),
                            lich.getTrangThai(),
                            stt != null ? stt.getTrangThai() : null,
                            tongChiPhi,
                            tongDaThanhToan,
                            soTienConLai
                    );
                })
                .toList();
    }

    // ===================================
    // huy lich
    // ===================================

    @Transactional
    public void huyLichKham(
            Integer maLichKham,
            Integer maBenhNhan,
            Authentication authentication) {

        // 1. Kiểm tra đăng nhập
        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getName())) {
            throw new IllegalArgumentException(
                    "Vui lòng đăng nhập để hủy lịch khám."
            );
        }

        // 2. Kiểm tra dữ liệu đầu vào
        if (maLichKham == null || maLichKham <= 0) {
            throw new IllegalArgumentException(
                    "Mã lịch khám không hợp lệ."
            );
        }

        if (maBenhNhan == null || maBenhNhan <= 0) {
            throw new IllegalArgumentException(
                    "Vui lòng chọn hồ sơ bệnh nhân."
            );
        }

        // 3. Lấy tài khoản đăng nhập
        String tenDangNhap = authentication.getName();

        NguoiDung nguoiDung = nguoiDungRepository
                .findByTenDangNhap(tenDangNhap)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy tài khoản đăng nhập."
                ));

        // 4. Xác minh hồ sơ thuộc tài khoản
        BenhNhan benhNhan = benhNhanRepository
                .findByMaBenhNhanAndNguoiDung_MaNguoiDung(
                        maBenhNhan,
                        nguoiDung.getMaNguoiDung()
                )
                .orElseThrow(() -> new IllegalArgumentException(
                        "Hồ sơ bệnh nhân không tồn tại hoặc không thuộc tài khoản của bạn."
                ));

        // 5. Lấy lịch khám
        LichDangKyKham lich = lichRepository
                .findById(maLichKham)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy lịch khám."
                ));

        // 6. Kiểm tra lịch thuộc đúng hồ sơ đang chọn
        if (lich.getBenhNhan() == null
                || !lich.getBenhNhan().getMaBenhNhan()
                .equals(benhNhan.getMaBenhNhan())) {
            throw new IllegalArgumentException(
                    "Lịch khám không thuộc hồ sơ bệnh nhân đang chọn."
            );
        }

        // 7. Chỉ cho phép hủy ở các trạng thái được phép
        String trangThai = lich.getTrangThai();

        List<String> trangThaiChoPhepHuy = List.of(
                "ChoGoi",
                "DaXacNhan",
                "DaTiepNhan"
        );

        if (!trangThaiChoPhepHuy.contains(trangThai)) {
            throw new IllegalArgumentException(
                    "Lịch khám hiện tại không thể hủy."
            );
        }

        // 8. Cập nhật trạng thái lịch khám
        lich.setTrangThai("DaHuy");
        lichRepository.save(lich);

        // 9. Cập nhật số thứ tự
        SoThuTu soThuTu = lich.getSoThuTu();

        if (soThuTu != null) {
            soThuTu.setTrangThai("DaHuy");
            soThuTuRepository.save(soThuTu);
        }

        // 10. Thông báo cho tài khoản bệnh nhân
        String noiDungHuy =
                "Lịch khám của "
                        + benhNhan.getHoTen()
                        + " ngày "
                        + lich.getNgayKham()
                        + " lúc "
                        + lich.getGioKham()
                        + " đã được hủy thành công.";

        thongBaoService.taoThongBaoVaGuiRealtime(
                nguoiDung.getMaNguoiDung(),
                benhNhan,
                "Hủy lịch khám thành công",
                noiDungHuy,
                "HUY_LICH"
        );

        // 11. Thông báo cho bác sĩ
        if (lich.getBacSi() != null
                && lich.getBacSi().getNguoiDung() != null) {

            Integer maNguoiDungBacSi =
                    lich.getBacSi()
                            .getNguoiDung()
                            .getMaNguoiDung();

            thongBaoService.taoThongBaoVaGuiRealtime(
                    maNguoiDungBacSi,
                    benhNhan,
                    "Lịch khám đã bị hủy",
                    "Bệnh nhân " + benhNhan.getHoTen()
                            + " đã hủy lịch khám ngày "
                            + lich.getNgayKham()
                            + " lúc "
                            + lich.getGioKham()
                            + ".",
                    "HUY_LICH"
            );
        }
    }

    // =========================================================
    // GỬI THÔNG BÁO CHO NHÂN VIÊN TIẾP NHẬN ĐANG TRỰC
    // =========================================================
    private void guiThongBaoNhanVienTiepNhan(
            LichDangKyKham lich
    ) {

        if (lich == null || lich.getKhoa() == null) {
            return;
        }

        ZoneId zoneId = ZoneId.of("Asia/Ho_Chi_Minh");

        LocalDateTime thoiDiemHienTai =
                LocalDateTime.now(zoneId);

        Integer maKhoa = lich.getKhoa().getMaKhoa();

        // Tìm nhân viên tiếp nhận đang trực tại khoa
        List<Integer> danhSachMaNhanVien =
                phanCongTiepNhanRepository
                        .findNhanVienDangTruc(
                                maKhoa,
                                thoiDiemHienTai
                        );

        if (danhSachMaNhanVien == null
                || danhSachMaNhanVien.isEmpty()) {
            return;
        }

        BenhNhan benhNhan = lich.getBenhNhan();

        String tenBenhNhan = benhNhan != null
                ? benhNhan.getHoTen()
                : "Bệnh nhân";

        String tenKhoa = lich.getKhoa().getTenKhoa();

        String tenBacSi = "Chưa xác định";

        if (lich.getBacSi() != null
                && lich.getBacSi().getNguoiDung() != null) {

            tenBacSi = lich.getBacSi()
                    .getNguoiDung()
                    .getHoTen();
        }

        String noiDung =
                "Bệnh nhân " + tenBenhNhan
                        + " vừa đăng ký lịch khám tại "
                        + tenKhoa
                        + " vào ngày "
                        + lich.getNgayKham()
                        + " lúc "
                        + lich.getGioKham()
                        + ". Bác sĩ phụ trách: "
                        + tenBacSi
                        + ". Vui lòng kiểm tra thông tin lịch khám.";

        for (Integer maNguoiDung : danhSachMaNhanVien) {

            if (maNguoiDung == null) {
                continue;
            }

            thongBaoService.taoThongBaoVaGuiRealtime(
                    maNguoiDung,
                    benhNhan,
                    "Có bệnh nhân đăng ký khám mới",
                    noiDung,
                    "DAT_LICH_KHAM_MOI"
            );
        }
    }

}
