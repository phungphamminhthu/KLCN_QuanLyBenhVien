package QuanLyBenhVien.DTO;

import java.time.LocalDate;
import java.time.LocalTime;

public class YeuCauDieuChinhRequest {

    private String loaiYeuCau;
    private String lyDo;

    private LocalDate ngayLamViecMoi;
    private LocalTime gioBatDauMoi;
    private LocalTime gioKetThucMoi;
    private Integer maPhongMoi;

    private String noiDungDieuPhoi;

    public String getLoaiYeuCau() { return loaiYeuCau; }
    public void setLoaiYeuCau(String loaiYeuCau) { this.loaiYeuCau = loaiYeuCau; }

    public String getLyDo() { return lyDo; }
    public void setLyDo(String lyDo) { this.lyDo = lyDo; }

    public LocalDate getNgayLamViecMoi() { return ngayLamViecMoi; }
    public void setNgayLamViecMoi(LocalDate ngayLamViecMoi) { this.ngayLamViecMoi = ngayLamViecMoi; }

    public LocalTime getGioBatDauMoi() { return gioBatDauMoi; }
    public void setGioBatDauMoi(LocalTime gioBatDauMoi) { this.gioBatDauMoi = gioBatDauMoi; }

    public LocalTime getGioKetThucMoi() { return gioKetThucMoi; }
    public void setGioKetThucMoi(LocalTime gioKetThucMoi) { this.gioKetThucMoi = gioKetThucMoi; }

    public Integer getMaPhongMoi() { return maPhongMoi; }
    public void setMaPhongMoi(Integer maPhongMoi) { this.maPhongMoi = maPhongMoi; }

    public String getNoiDungDieuPhoi() { return noiDungDieuPhoi; }
    public void setNoiDungDieuPhoi(String noiDungDieuPhoi) { this.noiDungDieuPhoi = noiDungDieuPhoi; }
}