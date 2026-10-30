
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
            ThongBaoService thongBaoService) {

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
    }

    @Transactional
    public DatLichKhamResponse datLichKham(
            DatLichKhamRequest request,
            Authentication authentication) {

        // 1. Kiểm tra người dùng đăng nhập
        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getName())) {
            throw new IllegalArgumentException(
                    "Vui lòng đăng nhập trước khi đặt lịch.");
        }

        if (request.getMaLichLamViec() == null) {
            throw new IllegalArgumentException(
                    "Vui lòng chọn lịch làm việc của bác sĩ.");
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

        // Kiểm tra giờ khám được chọn
        LocalTime gioKham = request.getGioKham();

        if (gioKham == null) {
            throw new IllegalArgumentException(
                    "Vui lòng chọn khung giờ khám.");
        }

        // 2. Lấy tài khoản đang đăng nhập
        String tenDangNhap = authentication.getName();

        NguoiDung nguoiDung = nguoiDungRepository
                .findByTenDangNhap(tenDangNhap)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy tài khoản đăng nhập."));

        // 3. Tìm hồ sơ bệnh nhân của tài khoản
        BenhNhan benhNhan = benhNhanRepository
                .findByNguoiDung_MaNguoiDung(
                        nguoiDung.getMaNguoiDung())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Tài khoản chưa có hồ sơ bệnh nhân."));

        // 4. Lấy lịch làm việc thực tế từ database
        LichLamViec lichLamViec = lichLamViecRepository
                .findById(request.getMaLichLamViec())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Lịch làm việc không tồn tại."));

        // 5. Kiểm tra lịch làm việc còn hiệu lực
        if (!"DangLamViec".equals(lichLamViec.getTrangThai())) {
            throw new IllegalArgumentException(
                    "Lịch làm việc này hiện không khả dụng.");
        }

        LocalDate ngayKham = lichLamViec.getNgayLamViec();

        // Kiểm tra giờ khám nằm trong ca làm việc
        LocalTime gioBatDau = lichLamViec.getGioBatDau();
        LocalTime gioKetThuc = lichLamViec.getGioKetThuc();

        if (gioKham.isBefore(gioBatDau)
                || !gioKham.isBefore(gioKetThuc)) {
            throw new IllegalArgumentException(
                    "Khung giờ khám không nằm trong ca làm việc của bác sĩ.");
        }

        // Không cho đặt giờ đã qua trong ngày hiện tại
        if (ngayKham.equals(LocalDate.now())
                && !gioKham.isAfter(LocalTime.now())) {
            throw new IllegalArgumentException(
                    "Khung giờ khám đã qua. Vui lòng chọn giờ khác.");
        }

        if (ngayKham.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException(
                    "Không thể đặt lịch trong quá khứ.");
        }

        // 6. Lấy bác sĩ và khoa từ lịch làm việc
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

        /*
         * 7. Lấy giá khám từ bảng Khoa.
         * Không nhận giá khám từ Flutter.
         */
        BigDecimal giaKham = khoa.getGiaKham();

        if (giaKham == null || giaKham.signum() < 0) {
            throw new IllegalArgumentException(
                    "Giá khám của khoa chưa được cấu hình hợp lệ.");
        }

        // 8. Tìm số thứ tự cuối cùng của khoa trong ngày khám
        Integer soThuTuCuoi = soThuTuRepository
                .findTopByKhoa_MaKhoaAndNgayCapSoOrderBySoThuTuDesc(
                        khoa.getMaKhoa(), ngayKham)
                .map(SoThuTu::getSoThuTu)
                .orElse(0);

        int soThuTuMoi = soThuTuCuoi + 1;

        // 9. Tạo số thứ tự
        SoThuTu soThuTu = new SoThuTu();
        soThuTu.setSoThuTu(soThuTuMoi);
        soThuTu.setKhoa(khoa);
        soThuTu.setNgayCapSo(ngayKham);
        soThuTu.setTrangThai("ChoGoi");
        soThuTu.setThoiGianTao(LocalDateTime.now());

        soThuTu = soThuTuRepository.saveAndFlush(soThuTu);

        // 10. Tạo lịch khám
        //        LichDangKyKham lich = new LichDangKyKham();
        //        lich.setBenhNhan(benhNhan);
        //        lich.setBacSi(bacSi);
        //        lich.setKhoa(khoa);
        //        lich.setSoThuTu(soThuTu);
        //        lich.setNgayKham(ngayKham);
        //        lich.setGioKham(gioKham);
        //        lich.setLyDoKham(request.getLyDoKham().trim());
        //        lich.setNgayTao(LocalDateTime.now());
        //        lich.setTrangThai("ChoGoi");
        //
        //        lich = lichRepository.saveAndFlush(lich);
        // 10. Tạo lịch khám
        LocalDateTime ngayTao = LocalDateTime.now();

        LichDangKyKham lich = new LichDangKyKham();

        lich.setBenhNhan(benhNhan);
        lich.setBacSi(bacSi);
        lich.setKhoa(khoa);
        lich.setSoThuTu(soThuTu);

        lich.setNgayKham(ngayKham);
        lich.setGioKham(gioKham);
        lich.setLyDoKham(request.getLyDoKham().trim());

        // Thời gian tạo lịch
        lich.setNgayTao(ngayTao);

            // Hạn thanh toán sau 24 giờ
        lich.setHanThanhToan(ngayTao.plusHours(24));

        // Trạng thái lịch khám
        // Giữ nguyên trạng thái đang sử dụng trong project
        lich.setTrangThai("ChoGoi");

        // Trạng thái thanh toán
        lich.setTrangThaiThanhToan("ChuaThanhToan");

        // Chưa gửi thông báo nhắc
        lich.setDaNhacThanhToan12h(false);
        lich.setDaNhacThanhToan23h(false);

        lich = lichRepository.saveAndFlush(lich);

        // 11. Tạo hóa đơn cho lịch khám
//        HoaDon hoaDon = new HoaDon();
//        hoaDon.setBenhNhan(benhNhan);
//        hoaDon.setLichDangKyKham(lich);
//        hoaDon.setNgayLapHoaDon(LocalDateTime.now());
//        hoaDon.setTongTien(giaKham);
//        hoaDon.setTrangThai("ChuaThanhToan");
//
//        hoaDon = hoaDonRepository.saveAndFlush(hoaDon);

        // 12. Tạo chi tiết hóa đơn
//        CTHoaDon chiTiet = new CTHoaDon();
//        chiTiet.setHoaDon(hoaDon);
//        chiTiet.setNoiDung("Phí khám - " + khoa.getTenKhoa());
//        chiTiet.setSoLuong(1);
//        chiTiet.setDonGia(giaKham);
//        chiTiet.setThanhTien(giaKham);
//
//        ctHoaDonRepository.save(chiTiet);

        // 11. Tạo hóa đơn phí khám ban đầu
        // Tạo hóa đơn phí khám
        HoaDon hoaDon = new HoaDon();
        hoaDon.setBenhNhan(benhNhan);
        hoaDon.setLichDangKyKham(lich);
        hoaDon.setNgayLapHoaDon(LocalDateTime.now());
        hoaDon.setLoaiHoaDon("PhiKham");
        hoaDon.setTongTien(giaKham);
        hoaDon.setTrangThai("ChuaThanhToan");

        hoaDon = hoaDonRepository.saveAndFlush(hoaDon);

        // Tạo chi tiết hóa đơn phí khám
        CTHoaDon chiTiet = new CTHoaDon();
        chiTiet.setHoaDon(hoaDon);
        chiTiet.setNoiDung("Phí khám - " + khoa.getTenKhoa());
        chiTiet.setSoLuong(1);
        chiTiet.setDonGia(giaKham);
        chiTiet.setThanhTien(giaKham);

        ctHoaDonRepository.save(chiTiet);

        // 14. Tạo thông báo đặt lịch thành công
        thongBaoService.taoThongBao(
                nguoiDung.getMaNguoiDung(),
                "Đặt lịch thành công",
                "Lịch khám của bạn đã được ghi nhận. Vui lòng theo dõi trạng thái lịch khám.",
                "DAT_LICH"
        );


        // 13. Trả kết quả cho Flutter
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
    //
    // =========================================


    @Transactional(readOnly = true)
    public List<LichKhamCuaToiResponse> layLichKhamCuaToi(
            Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getName())) {
            throw new IllegalArgumentException(
                    "Vui lòng đăng nhập để xem lịch khám.");
        }

        String tenDangNhap = authentication.getName();

        NguoiDung nguoiDung = nguoiDungRepository
                .findByTenDangNhap(tenDangNhap)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy tài khoản đăng nhập."));

        benhNhanRepository.findByNguoiDung_MaNguoiDung(
                nguoiDung.getMaNguoiDung()
        ).orElseThrow(() -> new IllegalArgumentException(
                "Tài khoản chưa có hồ sơ bệnh nhân."));

        List<LichDangKyKham> danhSach =
                lichRepository
                        .findByBenhNhan_NguoiDung_MaNguoiDungOrderByNgayKhamDescGioKhamDesc(
                                nguoiDung.getMaNguoiDung());

        return danhSach.stream()
                .map(lich -> {
                    SoThuTu stt = lich.getSoThuTu();

                    List<HoaDon> danhSachHoaDon =
                            hoaDonRepository.findByLichDangKyKham_MaLichKham(
                                    lich.getMaLichKham());

                    List<HoaDon> hoaDonHopLe = danhSachHoaDon.stream()
                            .filter(h -> !"DaHuy".equals(h.getTrangThai()))
                            .toList();

                    BigDecimal tongChiPhi = hoaDonHopLe.stream()
                            .map(HoaDon::getTongTien)
                            .filter(t -> t != null)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    BigDecimal tongDaThanhToan =
                            thanhToanRepository.tinhTongDaThanhToanTheoLichKham(
                                    lich.getMaLichKham(),
                                    "DaThanhToan"
                            );

                    if (tongDaThanhToan == null) {
                        tongDaThanhToan = BigDecimal.ZERO;
                    }

                    BigDecimal soTienConLai =
                            tongChiPhi.subtract(tongDaThanhToan);

                    if (soTienConLai.signum() < 0) {
                        soTienConLai = BigDecimal.ZERO;
                    }

                    String tenPhong = null;

                    if (lich.getBacSi() != null && lich.getNgayKham() != null
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
                            tenPhong = cacCaLamViec.get(0).getPhong().getTenPhong();
                        }
                    }

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
}
