package QuanLyBenhVien.Entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "ThanhToan")
public class ThanhToan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaThanhToan")
    private Integer maThanhToan;

    @Column(name = "MaHoaDon", nullable = false)
    private Integer maHoaDon;

    @Column(name = "NgayThanhToan", nullable = false)
    private LocalDateTime ngayThanhToan;

    @Column(name = "SoTien", nullable = false, precision = 15, scale = 2)
    private BigDecimal soTien;

    @Column(name = "PhuongThucThanhToan", nullable = false, length = 50)
    private String phuongThucThanhToan;

    @Column(name = "TrangThai", length = 50)
    private String trangThai;

    @Column(name = "MaGiaoDich", length = 255)
    private String maGiaoDich;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "MaNguoiThu")
    private NguoiDung nguoiThu;

    @PrePersist
    protected void onCreate() {
        if (ngayThanhToan == null) {
            ngayThanhToan = LocalDateTime.now();
        }
    }

    public Integer getMaThanhToan() { return maThanhToan; }
    public void setMaThanhToan(Integer maThanhToan) { this.maThanhToan = maThanhToan; }

    public Integer getMaHoaDon() { return maHoaDon; }
    public void setMaHoaDon(Integer maHoaDon) { this.maHoaDon = maHoaDon; }

    public LocalDateTime getNgayThanhToan() { return ngayThanhToan; }
    public void setNgayThanhToan(LocalDateTime ngayThanhToan) { this.ngayThanhToan = ngayThanhToan; }

    public BigDecimal getSoTien() { return soTien; }
    public void setSoTien(BigDecimal soTien) { this.soTien = soTien; }

    public String getPhuongThucThanhToan() { return phuongThucThanhToan; }
    public void setPhuongThucThanhToan(String phuongThucThanhToan) {
        this.phuongThucThanhToan = phuongThucThanhToan;
    }

    public String getTrangThai() { return trangThai; }
    public void setTrangThai(String trangThai) { this.trangThai = trangThai; }

    public String getMaGiaoDich() { return maGiaoDich; }
    public void setMaGiaoDich(String maGiaoDich) { this.maGiaoDich = maGiaoDich; }

    public NguoiDung getNguoiThu() {
        return nguoiThu;
    }

    public void setNguoiThu(NguoiDung nguoiThu) {
        this.nguoiThu = nguoiThu;
    }
}