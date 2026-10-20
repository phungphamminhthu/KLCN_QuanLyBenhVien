package QuanLyBenhVien.DTO;

import QuanLyBenhVien.Entity.LichLamViec;

import java.time.LocalDate;
import java.time.LocalTime;

public record LichLamViecResponse(
        Integer maLichLamViec,
        Integer maBacSi,
        Integer maPhong,
        String tenPhong,
        String tenKhoa,
        LocalDate ngayLamViec,
        LocalTime gioBatDau,
        LocalTime gioKetThuc,
        String trangThai
) {
    public static LichLamViecResponse from(LichLamViec lich) {
        return new LichLamViecResponse(
                lich.getMaLichLamViec(),
                lich.getBacSi().getMaBacSi(),
                lich.getPhong().getMaPhong(),
                lich.getPhong().getTenPhong(),
                lich.getPhong().getKhoa().getTenKhoa(),
                lich.getNgayLamViec(),
                lich.getGioBatDau(),
                lich.getGioKetThuc(),
                lich.getTrangThai()
        );
    }
}