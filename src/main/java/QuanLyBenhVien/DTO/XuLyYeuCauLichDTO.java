package QuanLyBenhVien.DTO;

import java.time.LocalDate;
import java.time.LocalTime;

public class XuLyYeuCauLichDTO {

    private String thaoTac;
    private String ghiChuXuLy;
    private Integer maNguoiXuLy;

    private Integer maBacSiMoi;
    private LocalDate ngayLamViecMoi;
    private LocalTime gioBatDauMoi;
    private LocalTime gioKetThucMoi;
    private Integer maPhongMoi;

    public String getThaoTac() {
        return thaoTac;
    }

    public void setThaoTac(String thaoTac) {
        this.thaoTac = thaoTac;
    }

    public String getGhiChuXuLy() {
        return ghiChuXuLy;
    }

    public void setGhiChuXuLy(String ghiChuXuLy) {
        this.ghiChuXuLy = ghiChuXuLy;
    }

    public Integer getMaNguoiXuLy() {
        return maNguoiXuLy;
    }

    public void setMaNguoiXuLy(Integer maNguoiXuLy) {
        this.maNguoiXuLy = maNguoiXuLy;
    }

    public Integer getMaBacSiMoi() {
        return maBacSiMoi;
    }

    public void setMaBacSiMoi(Integer maBacSiMoi) {
        this.maBacSiMoi = maBacSiMoi;
    }

    public LocalDate getNgayLamViecMoi() {
        return ngayLamViecMoi;
    }

    public void setNgayLamViecMoi(LocalDate ngayLamViecMoi) {
        this.ngayLamViecMoi = ngayLamViecMoi;
    }

    public LocalTime getGioBatDauMoi() {
        return gioBatDauMoi;
    }

    public void setGioBatDauMoi(LocalTime gioBatDauMoi) {
        this.gioBatDauMoi = gioBatDauMoi;
    }

    public LocalTime getGioKetThucMoi() {
        return gioKetThucMoi;
    }

    public void setGioKetThucMoi(LocalTime gioKetThucMoi) {
        this.gioKetThucMoi = gioKetThucMoi;
    }

    public Integer getMaPhongMoi() {
        return maPhongMoi;
    }

    public void setMaPhongMoi(Integer maPhongMoi) {
        this.maPhongMoi = maPhongMoi;
    }
}