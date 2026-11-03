
package QuanLyBenhVien.Service;

import QuanLyBenhVien.Entity.BacSi;
import QuanLyBenhVien.Entity.LichLamViec;
import QuanLyBenhVien.Entity.PhongChuyenTrach;
import QuanLyBenhVien.Repository.BacSiRepository;
import QuanLyBenhVien.Repository.LichLamViecRepository;
import QuanLyBenhVien.Repository.PhongChuyenTrachRepository;

import QuanLyBenhVien.Repository.YeuCauDieuChinhLichRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Service
@Transactional
public class LichLamViecService {

    //  giờ test xuyên suốt

    // ra hội đồng
    //07:00 – 11:30 → hợp lệ
    //13:00 – 17:30 → hợp lệ

    private final LichLamViecRepository lichLamViecRepository;
    private final BacSiRepository bacSiRepository;
    private final PhongChuyenTrachRepository phongRepository;
    private  final YeuCauDieuChinhLichRepository yeuCauDieuChinhLichRepository;

    //private static final LocalTime GIO_BAT_DAU_CHO_PHEP = LocalTime.of(7, 0);
    //private static final LocalTime GIO_KET_THUC_CHO_PHEP = LocalTime.of(17, 30);

    public LichLamViecService(
            LichLamViecRepository lichLamViecRepository,
            BacSiRepository bacSiRepository,
            PhongChuyenTrachRepository phongRepository,
            YeuCauDieuChinhLichRepository yeuCauDieuChinhLichRepository) {
        this.lichLamViecRepository = lichLamViecRepository;
        this.bacSiRepository = bacSiRepository;
        this.phongRepository = phongRepository;
        this.yeuCauDieuChinhLichRepository = yeuCauDieuChinhLichRepository;
    }
    // ===============================
    // KIỂM TRA TRÙNG LỊCH
    // ===============================
    private boolean biTrungGio(
            LocalTime gioBatDauMoi,
            LocalTime gioKetThucMoi,
            LocalTime gioBatDauCu,
            LocalTime gioKetThucCu) {

        return gioBatDauMoi.isBefore(gioKetThucCu)
                && gioKetThucMoi.isAfter(gioBatDauCu);
    }

    // =================================
    // THÊM LỊCH LÀM VIỆC
    // =================================
    public LichLamViec themLichLamViec(
            Integer maBacSi,
            Integer maPhong,
            LocalDate ngay,
            LocalTime batDau,
            LocalTime ketThuc) {

        BacSi bacSi = layBacSiHopLe(maBacSi);
        PhongChuyenTrach phong = layPhongHopLe(maPhong);

        kiemTraDuLieu(ngay, batDau, ketThuc);
        kiemTraCungKhoa(bacSi, phong);

        // Kiểm tra trùng lịch bác sĩ và phòng
        kiemTraTrungLich(
                maBacSi, maPhong, ngay, batDau, ketThuc, null);

        LichLamViec lich = new LichLamViec();
        lich.setBacSi(bacSi);
        lich.setPhong(phong);
        lich.setNgayLamViec(ngay);
        lich.setGioBatDau(batDau);
        lich.setGioKetThuc(ketThuc);
        lich.setTrangThai("DangLamViec");

        return lichLamViecRepository.save(lich);
    }

    // =========================================
    // CAP NHAT LICH LAM VIEC
    // =========================================
    public LichLamViec capNhatLichLamViec(
            Integer maLich,
            Integer maBacSi,
            Integer maPhong,
            LocalDate ngay,
            LocalTime batDau,
            LocalTime ketThuc) {

        LichLamViec lich = lichLamViecRepository.findById(maLich)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy lịch làm việc."));

        // Không cho bác sĩ sửa lịch thuộc bác sĩ khác.
        if (lich.getBacSi() == null
                || !lich.getBacSi().getMaBacSi().equals(maBacSi)) {
            throw new IllegalArgumentException(
                    "Bạn không có quyền sửa lịch làm việc này.");
        }

        BacSi bacSi = layBacSiHopLe(maBacSi);
        PhongChuyenTrach phong = layPhongHopLe(maPhong);

        kiemTraDuLieu(ngay, batDau, ketThuc);
        kiemTraCungKhoa(bacSi, phong);
        kiemTraTrungLich(
                maBacSi, maPhong, ngay, batDau, ketThuc, maLich);

        lich.setPhong(phong);
        lich.setNgayLamViec(ngay);
        lich.setGioBatDau(batDau);
        lich.setGioKetThuc(ketThuc);

        return lichLamViecRepository.save(lich);
    }

    private BacSi layBacSiHopLe(Integer maBacSi) {
        if (maBacSi == null) {
            throw new IllegalArgumentException(
                    "Không xác định được bác sĩ.");
        }

        BacSi bacSi = bacSiRepository.findById(maBacSi)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy bác sĩ."));

        if (!Boolean.TRUE.equals(bacSi.getTrangThai())) {
            throw new IllegalArgumentException(
                    "Bác sĩ hiện không hoạt động.");
        }

        if (bacSi.getKhoa() == null) {
            throw new IllegalArgumentException(
                    "Bác sĩ chưa được phân công khoa.");
        }

        return bacSi;
    }

    private PhongChuyenTrach layPhongHopLe(Integer maPhong) {
        if (maPhong == null) {
            throw new IllegalArgumentException(
                    "Vui lòng chọn phòng khám.");
        }

        PhongChuyenTrach phong = phongRepository.findById(maPhong)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy phòng khám."));

        if (!Boolean.TRUE.equals(phong.getTrangThai())) {
            throw new IllegalArgumentException(
                    "Phòng khám hiện không hoạt động.");
        }

        if (phong.getKhoa() == null) {
            throw new IllegalArgumentException(
                    "Phòng khám chưa được phân công khoa.");
        }

        return phong;
    }

    // =======================================================
    // kiểm tra du lieu dau vao
    // =======================================================
    //    private void kiemTraDuLieu(
    //            LocalDate ngay,
    //            LocalTime batDau,
    //            LocalTime ketThuc) {
    //
    //        if (ngay == null || batDau == null || ketThuc == null) {
    //            throw new IllegalArgumentException(
    //                    "Vui lòng nhập đầy đủ ngày và giờ làm việc.");
    //        }
    //
    //        if (ngay.isBefore(LocalDate.now())) {
    //            throw new IllegalArgumentException(
    //                    "Ngày làm việc không được ở trong quá khứ.");
    //        }
    //
    //        // Giờ bắt đầu phải từ 07:00 trở đi
    //        if (batDau.isBefore(GIO_BAT_DAU_CHO_PHEP)) {
    //            throw new IllegalArgumentException(
    //                    "Giờ bắt đầu làm việc không được trước 07:00.");
    //        }
    //
    //        // Giờ kết thúc không được sau 17:30
    //        if (ketThuc.isAfter(GIO_KET_THUC_CHO_PHEP)) {
    //            throw new IllegalArgumentException(
    //                    "Giờ kết thúc làm việc không được sau 17:30.");
    //        }
    //
    //        // Giờ kết thúc phải sau giờ bắt đầu
    //        if (!ketThuc.isAfter(batDau)) {
    //            throw new IllegalArgumentException(
    //                    "Giờ kết thúc phải sau giờ bắt đầu.");
    //        }
    //    }

    private void kiemTraDuLieu(
            LocalDate ngay,
            LocalTime batDau,
            LocalTime ketThuc) {

        if (ngay == null || batDau == null || ketThuc == null) {
            throw new IllegalArgumentException(
                    "Vui lòng nhập đầy đủ ngày và giờ làm việc.");
        }

        if (ngay.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException(
                    "Ngày làm việc không được ở trong quá khứ.");
        }

        // Giữ kiểm tra giờ kết thúc phải sau giờ bắt đầu
        if (!ketThuc.isAfter(batDau)) {
            throw new IllegalArgumentException(
                    "Giờ kết thúc phải sau giờ bắt đầu.");
        }
    }
    private void kiemTraCungKhoa(
            BacSi bacSi,
            PhongChuyenTrach phong) {

        if (!bacSi.getKhoa().getMaKhoa()
                .equals(phong.getKhoa().getMaKhoa())) {
            throw new IllegalArgumentException(
                    "Phòng khám phải thuộc khoa của bác sĩ.");
        }
    }

    private void kiemTraTrungLich(
            Integer maBacSi,
            Integer maPhong,
            LocalDate ngay,
            LocalTime batDau,
            LocalTime ketThuc,
            Integer maLichBoQua) {

        if (lichLamViecRepository.existsXungDotBacSi(
                maBacSi, ngay, batDau, ketThuc, maLichBoQua)) {
            throw new IllegalArgumentException(
                    "Bác sĩ đã có lịch làm việc trùng giờ.");
        }

        if (lichLamViecRepository.existsXungDotPhong(
                maPhong, ngay, batDau, ketThuc, maLichBoQua)) {
            throw new IllegalArgumentException(
                    "Phòng khám đã có lịch làm việc trùng giờ.");
        }
    }

    // ====================================
    // XÓA LỊCH LÀM VIỆC
    // ====================================
    @Transactional
    public void xoaLichLamViec(Integer maLichLamViec, Integer maBacSi) {
        LichLamViec lich = lichLamViecRepository
                .findById(maLichLamViec)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy lịch làm việc."
                ));

        // Chỉ cho phép bác sĩ xóa lịch của chính mình
        if (lich.getBacSi() == null
                || !lich.getBacSi().getMaBacSi().equals(maBacSi)) {
            throw new IllegalArgumentException(
                    "Bạn không có quyền xóa lịch làm việc này."
            );
        }

        lichLamViecRepository.delete(lich);
    }


    @Transactional(readOnly = true)
    public List<LichLamViec> layLichLamViec(
            Integer maBacSi,
            LocalDate tuNgay,
            LocalDate denNgay) {

        if (maBacSi == null) {
            throw new IllegalArgumentException(
                    "Mã bác sĩ không được để trống.");
        }

        if (tuNgay != null && denNgay != null
                && tuNgay.isAfter(denNgay)) {
            throw new IllegalArgumentException(
                    "Ngày bắt đầu không được sau ngày kết thúc.");
        }

        long start = System.currentTimeMillis();

        System.out.println(
                "[LichLamViecService] Query lịch: bacSi="
                        + maBacSi
                        + ", tuNgay=" + tuNgay
                        + ", denNgay=" + denNgay
        );

        List<LichLamViec> danhSach =
                lichLamViecRepository.timLichLamViecTheoKhoangNgay(
                        maBacSi,
                        tuNgay,
                        denNgay
                );

        System.out.println(
                "[LichLamViecService] Query hoàn tất: "
                        + danhSach.size()
                        + " lịch, "
                        + (System.currentTimeMillis() - start)
                        + " ms"
        );

        return danhSach;
    }


    // =========================================
    // LẤY LỊCH BÁC SĨ PHỤC VỤ BỆNH NHÂN ĐẶT KHÁM
    // =========================================
    @Transactional(readOnly = true)
    public List<LichLamViec> layLichBacSiDatKham(
            Integer maKhoa,
            LocalDate ngayKham) {

        if (maKhoa == null || ngayKham == null) {
            throw new IllegalArgumentException(
                    "Vui lòng chọn khoa và ngày khám."
            );
        }

        return lichLamViecRepository.findLichBacSiDatKham(
                maKhoa,
                ngayKham
        );
    }

    // ====================================
    // ADMIN: LẤY DANH SÁCH LỊCH
    // ====================================
    @Transactional(readOnly = true)
    public List<LichLamViec> adminLayDanhSachLich(
            LocalDate tuNgay,
            LocalDate denNgay,
            Integer maBacSi,
            Integer maKhoa) {

        if (tuNgay != null && denNgay != null
                && tuNgay.isAfter(denNgay)) {
            throw new IllegalArgumentException(
                    "Ngày bắt đầu không được sau ngày kết thúc.");
        }

        return lichLamViecRepository.timLichLamViecAdmin(
                tuNgay, denNgay, maBacSi, maKhoa);
    }

    // ====================================
    // ADMIN: THÊM LỊCH
    // ====================================
    public LichLamViec adminThemLichLamViec(
            Integer maBacSi,
            Integer maPhong,
            LocalDate ngay,
            LocalTime batDau,
            LocalTime ketThuc) {

        BacSi bacSi = layBacSiHopLe(maBacSi);
        PhongChuyenTrach phong = layPhongHopLe(maPhong);

        kiemTraDuLieu(ngay, batDau, ketThuc);
        kiemTraCungKhoa(bacSi, phong);
        kiemTraTrungLich(
                maBacSi, maPhong, ngay, batDau, ketThuc, null);

        LichLamViec lich = new LichLamViec();
        lich.setBacSi(bacSi);
        lich.setPhong(phong);
        lich.setNgayLamViec(ngay);
        lich.setGioBatDau(batDau);
        lich.setGioKetThuc(ketThuc);
        lich.setTrangThai("DangLamViec");

        return lichLamViecRepository.save(lich);
    }

    // ====================================
    // ADMIN: CẬP NHẬT LỊCH
    // ====================================
    public LichLamViec adminCapNhatLichLamViec(
            Integer maLich,
            Integer maBacSi,
            Integer maPhong,
            LocalDate ngay,
            LocalTime batDau,
            LocalTime ketThuc) {

        LichLamViec lich = lichLamViecRepository.findById(maLich)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy lịch làm việc."));

        BacSi bacSi = layBacSiHopLe(maBacSi);
        PhongChuyenTrach phong = layPhongHopLe(maPhong);

        kiemTraDuLieu(ngay, batDau, ketThuc);
        kiemTraCungKhoa(bacSi, phong);
        kiemTraTrungLich(
                maBacSi, maPhong, ngay, batDau, ketThuc, maLich);

        lich.setBacSi(bacSi);
        lich.setPhong(phong);
        lich.setNgayLamViec(ngay);
        lich.setGioBatDau(batDau);
        lich.setGioKetThuc(ketThuc);

        return lichLamViecRepository.save(lich);
    }

    // ====================================
    // ADMIN: XÓA LỊCH
    // ====================================
    @Transactional
    public void adminXoaLichLamViec(Integer maLich) {
        LichLamViec lich = lichLamViecRepository.findById(maLich)
                .orElseThrow(() ->
                        new IllegalArgumentException("Không tìm thấy lịch làm việc."));

        boolean coYeuCauDieuChinh =
                yeuCauDieuChinhLichRepository.existsByLichLamViec_MaLichLamViec(maLich);

        if (coYeuCauDieuChinh) {
            throw new IllegalStateException(
                    "Không thể xóa lịch làm việc vì đã có yêu cầu điều chỉnh lịch liên quan."
            );
        }

        lichLamViecRepository.delete(lich);
    }


}
