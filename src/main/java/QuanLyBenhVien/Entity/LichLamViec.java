package QuanLyBenhVien.Entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "LichLamViec")
public class LichLamViec {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaLichLamViec")
    private Integer maLichLamViec;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "MaBacSi", nullable = false)
    private BacSi bacSi;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "MaPhong", nullable = false)
    private PhongChuyenTrach phong;

    @Column(name = "NgayLamViec", nullable = false)
    private LocalDate ngayLamViec;

    @Column(name = "GioBatDau", nullable = false)
    private LocalTime gioBatDau;

    @Column(name = "GioKetThuc", nullable = false)
    private LocalTime gioKetThuc;

    @Column(name = "TrangThai", length = 30)
    private String trangThai;

    // Generate getters và setters

    public Integer getMaLichLamViec() {
        return maLichLamViec;
    }

    public void setMaLichLamViec(Integer maLichLamViec) {
        this.maLichLamViec = maLichLamViec;
    }

    public BacSi getBacSi() {
        return bacSi;
    }

    public void setBacSi(BacSi bacSi) {
        this.bacSi = bacSi;
    }

    public PhongChuyenTrach getPhong() {
        return phong;
    }

    public void setPhong(PhongChuyenTrach phong) {
        this.phong = phong;
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

    public String getTrangThai() {
        return trangThai;
    }

    public void setTrangThai(String trangThai) {
        this.trangThai = trangThai;
    }

}
