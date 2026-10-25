
package QuanLyBenhVien.Service;

import QuanLyBenhVien.Entity.BacSi;
import QuanLyBenhVien.Entity.LichLamViec;
import QuanLyBenhVien.Entity.PhongChuyenTrach;
import QuanLyBenhVien.Repository.BacSiRepository;
import QuanLyBenhVien.Repository.LichLamViecRepository;
import QuanLyBenhVien.Repository.PhongChuyenTrachRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Service
@Transactional
public class LichLamViecService {

    private final LichLamViecRepository lichLamViecRepository;
    private final BacSiRepository bacSiRepository;
    private final PhongChuyenTrachRepository phongRepository;

    public LichLamViecService(
            LichLamViecRepository lichLamViecRepository,
            BacSiRepository bacSiRepository,
            PhongChuyenTrachRepository phongRepository) {
        this.lichLamViecRepository = lichLamViecRepository;
        this.bacSiRepository = bacSiRepository;
        this.phongRepository = phongRepository;
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

        long start = System.currentTimeMillis();

        System.out.println("[LichLamViecService] Bắt đầu");
        System.out.println("[LichLamViecService] maBacSi = " + maBacSi);
        System.out.println("[LichLamViecService] tuNgay = " + tuNgay);
        System.out.println("[LichLamViecService] denNgay = " + denNgay);

        if (maBacSi == null) {
            throw new IllegalArgumentException(
                    "Mã bác sĩ không được để trống.");
        }

        if (tuNgay != null && denNgay != null
                && tuNgay.isAfter(denNgay)) {
            throw new IllegalArgumentException(
                    "Ngày bắt đầu không được sau ngày kết thúc.");
        }

        List<LichLamViec> danhSach;

        long queryStart = System.currentTimeMillis();

        System.out.println("[LichLamViecService] Bắt đầu truy vấn repository");

        if (tuNgay != null && denNgay != null) {
            danhSach = lichLamViecRepository
                    .findByBacSi_MaBacSiAndNgayLamViecBetweenOrderByNgayLamViecAscGioBatDauAsc(
                            maBacSi, tuNgay, denNgay);
        } else {
            danhSach = lichLamViecRepository
                    .findByBacSi_MaBacSiOrderByNgayLamViecAscGioBatDauAsc(
                            maBacSi);

            if (tuNgay != null) {
                danhSach = danhSach.stream()
                        .filter(l -> l.getNgayLamViec() != null
                                && !l.getNgayLamViec().isBefore(tuNgay))
                        .toList();
            }

            if (denNgay != null) {
                danhSach = danhSach.stream()
                        .filter(l -> l.getNgayLamViec() != null
                                && !l.getNgayLamViec().isAfter(denNgay))
                        .toList();
            }
        }

        System.out.println(
                "[LichLamViecService] Repository hoàn tất sau "
                        + (System.currentTimeMillis() - queryStart)
                        + " ms");

        System.out.println(
                "[LichLamViecService] Số lịch = " + danhSach.size());

        System.out.println(
                "[LichLamViecService] Tổng thời gian = "
                        + (System.currentTimeMillis() - start) + " ms");

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


}
