package QuanLyBenhVien.DTO;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;

public class YeuCauDieuChinhLichAdminDTO {

    private Integer maYeuCau;
    private Integer maLichLamViec;
    private Integer maBacSi;

    private String tenBacSi;
    private String tenKhoa;
    private String tenPhong;

    private LocalDate ngayLamViec;
    private LocalTime gioBatDau;
    private LocalTime gioKetThuc;

    private String loaiYeuCau;
    private String lyDo;
    private String trangThai;
    private LocalDateTime ngayTao;

    private LocalDate ngayLamViecMoi;
    private LocalTime gioBatDauMoi;
    private LocalTime gioKetThucMoi;
    private Integer maPhongMoi;
    private String tenPhongMoi;

    private String noiDungDieuPhoi;
    private String ghiChuXuLy;

    public Integer getMaYeuCau() { return maYeuCau; }
    public void setMaYeuCau(Integer maYeuCau) { this.maYeuCau = maYeuCau; }

    public Integer getMaLichLamViec() { return maLichLamViec; }
    public void setMaLichLamViec(Integer maLichLamViec) { this.maLichLamViec = maLichLamViec; }

    public Integer getMaBacSi() { return maBacSi; }
    public void setMaBacSi(Integer maBacSi) { this.maBacSi = maBacSi; }

    public String getTenBacSi() { return tenBacSi; }
    public void setTenBacSi(String tenBacSi) { this.tenBacSi = tenBacSi; }

    public String getTenKhoa() { return tenKhoa; }
    public void setTenKhoa(String tenKhoa) { this.tenKhoa = tenKhoa; }

    public String getTenPhong() { return tenPhong; }
    public void setTenPhong(String tenPhong) { this.tenPhong = tenPhong; }

    public LocalDate getNgayLamViec() { return ngayLamViec; }
    public void setNgayLamViec(LocalDate ngayLamViec) { this.ngayLamViec = ngayLamViec; }

    public LocalTime getGioBatDau() { return gioBatDau; }
    public void setGioBatDau(LocalTime gioBatDau) { this.gioBatDau = gioBatDau; }

    public LocalTime getGioKetThuc() { return gioKetThuc; }
    public void setGioKetThuc(LocalTime gioKetThuc) { this.gioKetThuc = gioKetThuc; }

    public String getLoaiYeuCau() { return loaiYeuCau; }
    public void setLoaiYeuCau(String loaiYeuCau) { this.loaiYeuCau = loaiYeuCau; }

    public String getLyDo() { return lyDo; }
    public void setLyDo(String lyDo) { this.lyDo = lyDo; }

    public String getTrangThai() { return trangThai; }
    public void setTrangThai(String trangThai) { this.trangThai = trangThai; }

    public LocalDateTime getNgayTao() { return ngayTao; }
    public void setNgayTao(LocalDateTime ngayTao) { this.ngayTao = ngayTao; }

    public LocalDate getNgayLamViecMoi() { return ngayLamViecMoi; }
    public void setNgayLamViecMoi(LocalDate ngayLamViecMoi) { this.ngayLamViecMoi = ngayLamViecMoi; }

    public LocalTime getGioBatDauMoi() { return gioBatDauMoi; }
    public void setGioBatDauMoi(LocalTime gioBatDauMoi) { this.gioBatDauMoi = gioBatDauMoi; }

    public LocalTime getGioKetThucMoi() { return gioKetThucMoi; }
    public void setGioKetThucMoi(LocalTime gioKetThucMoi) { this.gioKetThucMoi = gioKetThucMoi; }

    public Integer getMaPhongMoi() { return maPhongMoi; }
    public void setMaPhongMoi(Integer maPhongMoi) { this.maPhongMoi = maPhongMoi; }

    public String getTenPhongMoi() { return tenPhongMoi; }
    public void setTenPhongMoi(String tenPhongMoi) { this.tenPhongMoi = tenPhongMoi; }

    public String getNoiDungDieuPhoi() { return noiDungDieuPhoi; }
    public void setNoiDungDieuPhoi(String noiDungDieuPhoi) { this.noiDungDieuPhoi = noiDungDieuPhoi; }

    public String getGhiChuXuLy() { return ghiChuXuLy; }
    public void setGhiChuXuLy(String ghiChuXuLy) { this.ghiChuXuLy = ghiChuXuLy; }
}