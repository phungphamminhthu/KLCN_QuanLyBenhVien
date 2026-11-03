package QuanLyBenhVien.DTO;

import java.time.LocalDate;
import java.time.LocalTime;

public class LichLamViecAdminRequest {

    private Integer maBacSi;
    private Integer maPhong;
    private LocalDate ngayLamViec;
    private LocalTime gioBatDau;
    private LocalTime gioKetThuc;

    public Integer getMaBacSi() {
        return maBacSi;
    }

    public void setMaBacSi(Integer maBacSi) {
        this.maBacSi = maBacSi;
    }

    public Integer getMaPhong() {
        return maPhong;
    }

    public void setMaPhong(Integer maPhong) {
        this.maPhong = maPhong;
    }

    public LocalDate getNgayLamViec() {
        return ngayLamViec;
    }

    public void setNgayLamViec(LocalDate ngayLamViec) {
        this.ngayLamViec = ngayLamViec;
    }

    public LocalTime getGioBatDau() {
        return gioBatDau;
    }

    public void setGioBatDau(LocalTime gioBatDau) {
        this.gioBatDau = gioBatDau;
    }

    public LocalTime getGioKetThuc() {
        return gioKetThuc;
    }

    public void setGioKetThuc(LocalTime gioKetThuc) {
        this.gioKetThuc = gioKetThuc;
    }
}