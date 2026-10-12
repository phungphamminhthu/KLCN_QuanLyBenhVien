package QuanLyBenhVien.Entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "TiepNhanBenhNhan")
public class TiepNhanBenhNhan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaTiepNhan")
    private Integer maTiepNhan;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "MaLichKham", nullable = false)
    private LichDangKyKham lichDangKyKham;

    @Column(name = "ThoiGianTiepNhan", nullable = false)
    private LocalDateTime thoiGianTiepNhan;

    @Column(name = "TrangThai", length = 50)
    private String trangThai;

    @Column(name = "GhiChu", length = 255)
    private String ghiChu;

    public Integer getMaTiepNhan() {
        return maTiepNhan;
    }

    public void setMaTiepNhan(Integer maTiepNhan) {
        this.maTiepNhan = maTiepNhan;
    }

    public LichDangKyKham getLichDangKyKham() {
        return lichDangKyKham;
    }

    public void setLichDangKyKham(LichDangKyKham lichDangKyKham) {
        this.lichDangKyKham = lichDangKyKham;
    }

    public LocalDateTime getThoiGianTiepNhan() {
        return thoiGianTiepNhan;
    }

    public void setThoiGianTiepNhan(LocalDateTime thoiGianTiepNhan) {
        this.thoiGianTiepNhan = thoiGianTiepNhan;
    }

    public String getTrangThai() {
        return trangThai;
    }

    public void setTrangThai(String trangThai) {
        this.trangThai = trangThai;
    }

    public String getGhiChu() {
        return ghiChu;
    }

    public void setGhiChu(String ghiChu) {
        this.ghiChu = ghiChu;
    }
}