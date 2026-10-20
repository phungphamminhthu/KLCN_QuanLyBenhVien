
package QuanLyBenhVien.Entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "HoaDon")
public class HoaDon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaHoaDon")
    private Integer maHoaDon;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "MaBenhNhan", nullable = false)
    private BenhNhan benhNhan;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "MaLichKham", nullable = false)
    private LichDangKyKham lichDangKyKham;

    @Column(name = "NgayLapHoaDon", nullable = false)
    private LocalDateTime ngayLapHoaDon;

    @Column(name = "TongTien", nullable = false,
            precision = 12, scale = 2)
    private BigDecimal tongTien;

    @Column(name = "TrangThai", nullable = false, length = 30)
    private String trangThai;


    @Column(name = "LoaiHoaDon", length = 30)
    private String loaiHoaDon;

    @PrePersist
    protected void onCreate() {
        if (ngayLapHoaDon == null) {
            ngayLapHoaDon = LocalDateTime.now();
        }

        if (tongTien == null) {
            tongTien = BigDecimal.ZERO;
        }

        if (trangThai == null) {
            trangThai = "ChuaThanhToan";
        }
    }

    public Integer getMaHoaDon() {
        return maHoaDon;
    }

    public void setMaHoaDon(Integer maHoaDon) {
        this.maHoaDon = maHoaDon;
    }

    public BenhNhan getBenhNhan() {
        return benhNhan;
    }

    public void setBenhNhan(BenhNhan benhNhan) {
        this.benhNhan = benhNhan;
    }

    public LichDangKyKham getLichDangKyKham() {
        return lichDangKyKham;
    }

    public void setLichDangKyKham(LichDangKyKham lichDangKyKham) {
        this.lichDangKyKham = lichDangKyKham;
    }

    public LocalDateTime getNgayLapHoaDon() {
        return ngayLapHoaDon;
    }

    public void setNgayLapHoaDon(LocalDateTime ngayLapHoaDon) {
        this.ngayLapHoaDon = ngayLapHoaDon;
    }

    public BigDecimal getTongTien() {
        return tongTien;
    }

    public void setTongTien(BigDecimal tongTien) {
        this.tongTien = tongTien;
    }

    public String getTrangThai() {
        return trangThai;
    }

    public void setTrangThai(String trangThai) {
        this.trangThai = trangThai;
    }

    public String getLoaiHoaDon() {
        return loaiHoaDon;
    }

    public void setLoaiHoaDon(String loaiHoaDon) {
        this.loaiHoaDon = loaiHoaDon;
    }
}
