
package QuanLyBenhVien.DTO;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

public class PhanCongChuyenTrachResponse {

    private Integer maPhanCong;
    private Integer maNguoiDung;
    private String tenNhanVien;
    private LocalDate ngayLamViec;
    private LocalTime gioBatDau;
    private LocalTime gioKetThuc;
    private String ghiChu;
    private String tenNguoiPhanCong;
    private Byte trangThai;
    private LocalDateTime ngayTao;

    public PhanCongChuyenTrachResponse(
            Integer maPhanCong,
            Integer maNguoiDung,
            String tenNhanVien,
            LocalDate ngayLamViec,
            LocalTime gioBatDau,
            LocalTime gioKetThuc,
            String ghiChu,
            String tenNguoiPhanCong,
            Byte trangThai,
            LocalDateTime ngayTao
    ) {
        this.maPhanCong = maPhanCong;
        this.maNguoiDung = maNguoiDung;
        this.tenNhanVien = tenNhanVien;
        this.ngayLamViec = ngayLamViec;
        this.gioBatDau = gioBatDau;
        this.gioKetThuc = gioKetThuc;
        this.ghiChu = ghiChu;
        this.tenNguoiPhanCong = tenNguoiPhanCong;
        this.trangThai = trangThai;
        this.ngayTao = ngayTao;
    }

    public Integer getMaPhanCong() {
        return maPhanCong;
    }

    public Integer getMaNguoiDung() {
        return maNguoiDung;
    }

    public String getTenNhanVien() {
        return tenNhanVien;
    }

    public LocalDate getNgayLamViec() {
        return ngayLamViec;
    }

    public LocalTime getGioBatDau() {
        return gioBatDau;
    }

    public LocalTime getGioKetThuc() {
        return gioKetThuc;
    }

    public String getGhiChu() {
        return ghiChu;
    }

    public String getTenNguoiPhanCong() {
        return tenNguoiPhanCong;
    }

    public Byte getTrangThai() {
        return trangThai;
    }

    public LocalDateTime getNgayTao() {
        return ngayTao;
    }
}
