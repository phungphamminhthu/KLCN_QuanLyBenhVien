
package QuanLyBenhVien.Entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "PhanCongChuyenTrach")
public class PhanCongChuyenTrach {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaPhanCongChuyenTrach")
    private Integer maPhanCongChuyenTrach;

    @Column(name = "MaNguoiDung", nullable = false)
    private Integer maNguoiDung;

    @Column(name = "MaNguoiPhanCong", nullable = false)
    private Integer maNguoiPhanCong;

    @Column(name = "NgayLamViec", nullable = false)
    private LocalDate ngayLamViec;

    @Column(name = "GioBatDau", nullable = false)
    private LocalTime gioBatDau;

    @Column(name = "GioKetThuc", nullable = false)
    private LocalTime gioKetThuc;

    @Column(name = "GhiChu", length = 500)
    private String ghiChu;

    @Column(name = "TrangThai", nullable = false)
    private Byte trangThai = 1;

    @Column(
            name = "NgayTao",
            nullable = false,
            insertable = false,
            updatable = false
    )
    private LocalDateTime ngayTao;

    public Integer getMaPhanCongChuyenTrach() {
        return maPhanCongChuyenTrach;
    }

    public void setMaPhanCongChuyenTrach(Integer maPhanCongChuyenTrach) {
        this.maPhanCongChuyenTrach = maPhanCongChuyenTrach;
    }

    public Integer getMaNguoiDung() {
        return maNguoiDung;
    }

    public void setMaNguoiDung(Integer maNguoiDung) {
        this.maNguoiDung = maNguoiDung;
    }

    public Integer getMaNguoiPhanCong() {
        return maNguoiPhanCong;
    }

    public void setMaNguoiPhanCong(Integer maNguoiPhanCong) {
        this.maNguoiPhanCong = maNguoiPhanCong;
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

    public String getGhiChu() {
        return ghiChu;
    }

    public void setGhiChu(String ghiChu) {
        this.ghiChu = ghiChu;
    }

    public Byte getTrangThai() {
        return trangThai;
    }

    public void setTrangThai(Byte trangThai) {
        this.trangThai = trangThai;
    }

    public LocalDateTime getNgayTao() {
        return ngayTao;
    }

    public void setNgayTao(LocalDateTime ngayTao) {
        this.ngayTao = ngayTao;
    }
}
