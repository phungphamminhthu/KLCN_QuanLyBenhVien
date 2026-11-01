package QuanLyBenhVien.Service;

import QuanLyBenhVien.Entity.BacSi;
import QuanLyBenhVien.Entity.LichLamViec;
import QuanLyBenhVien.Entity.YeuCauDieuChinhLich;
import QuanLyBenhVien.Repository.LichLamViecRepository;
import QuanLyBenhVien.Repository.YeuCauDieuChinhLichRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;

@Service
@Transactional
public class YeuCauDieuChinhLichService {

    private final YeuCauDieuChinhLichRepository yeuCauRepository;
    private final LichLamViecRepository lichLamViecRepository;

    public YeuCauDieuChinhLichService(
            YeuCauDieuChinhLichRepository yeuCauRepository,
            LichLamViecRepository lichLamViecRepository) {
        this.yeuCauRepository = yeuCauRepository;
        this.lichLamViecRepository = lichLamViecRepository;
    }

    public YeuCauDieuChinhLich guiYeuCauBaoBan(
            Integer maBacSi,
            Integer maLichLamViec,
            String lyDo) {

        if (maBacSi == null) {
            throw new IllegalArgumentException(
                    "Không xác định được bác sĩ đang đăng nhập.");
        }

        if (maLichLamViec == null) {
            throw new IllegalArgumentException(
                    "Vui lòng chọn lịch làm việc cần báo bận.");
        }

        if (lyDo == null || lyDo.trim().isEmpty()) {
            throw new IllegalArgumentException(
                    "Vui lòng nhập lý do báo bận.");
        }

        lyDo = lyDo.trim();

        if (lyDo.length() > 500) {
            throw new IllegalArgumentException(
                    "Lý do báo bận không được vượt quá 500 ký tự.");
        }

        LichLamViec lich = lichLamViecRepository.findById(maLichLamViec)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy lịch làm việc."));

        BacSi bacSiCuaLich = lich.getBacSi();

        if (bacSiCuaLich == null
                || !maBacSi.equals(bacSiCuaLich.getMaBacSi())) {
            throw new IllegalArgumentException(
                    "Bạn không có quyền gửi yêu cầu cho lịch này.");
        }

        LocalDate ngay = lich.getNgayLamViec();
        LocalTime gioBatDau = lich.getGioBatDau();

        if (ngay == null || gioBatDau == null) {
            throw new IllegalArgumentException(
                    "Thông tin ngày giờ của lịch không hợp lệ.");
        }

        if (ngay.isBefore(LocalDate.now())
                || (ngay.isEqual(LocalDate.now())
                && !gioBatDau.isAfter(LocalTime.now()))) {
            throw new IllegalArgumentException(
                    "Không thể báo bận cho lịch đã diễn ra.");
        }

        if (yeuCauRepository
                .existsYeuCauTheoLichVaTrangThai(
                        maLichLamViec, "CHO_XU_LY")) {
            throw new IllegalArgumentException(
                    "Lịch này đã có yêu cầu báo bận đang chờ xử lý.");
        }

        YeuCauDieuChinhLich yeuCau = new YeuCauDieuChinhLich();
        yeuCau.setLichLamViec(lich);
        yeuCau.setBacSi(bacSiCuaLich);
        yeuCau.setLyDo(lyDo);
        yeuCau.setTrangThai("CHO_XU_LY");

        return yeuCauRepository.save(yeuCau);
    }
}