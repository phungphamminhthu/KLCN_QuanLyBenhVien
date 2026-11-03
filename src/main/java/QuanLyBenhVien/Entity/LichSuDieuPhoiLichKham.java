package QuanLyBenhVien.Entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "LichSuDieuPhoiLichKham")
public class LichSuDieuPhoiLichKham {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaLichSuDieuPhoi")
    private Integer maLichSuDieuPhoi;

    @Column(name = "MaLichKham", nullable = false)
    private Integer maLichKham;

    @Column(name = "MaBacSiCu", nullable = false)
    private Integer maBacSiCu;

    @Column(name = "MaBacSiMoi", nullable = false)
    private Integer maBacSiMoi;

    @Column(name = "MaAdminThucHien")
    private Integer maAdminThucHien;

    @Column(name = "TenAdminThucHien", length = 150)
    private String tenAdminThucHien;

    @Column(name = "LyDo", length = 500)
    private String lyDo;

    @Column(name = "NgayDieuPhoi", nullable = false)
    private LocalDateTime ngayDieuPhoi;

    @PrePersist
    public void prePersist() {
        if (ngayDieuPhoi == null) {
            ngayDieuPhoi = LocalDateTime.now();
        }
    }

    public Integer getMaLichSuDieuPhoi() {
        return maLichSuDieuPhoi;
    }

    public Integer getMaLichKham() {
        return maLichKham;
    }

    public void setMaLichKham(Integer maLichKham) {
        this.maLichKham = maLichKham;
    }

    public Integer getMaBacSiCu() {
        return maBacSiCu;
    }

    public void setMaBacSiCu(Integer maBacSiCu) {
        this.maBacSiCu = maBacSiCu;
    }

    public Integer getMaBacSiMoi() {
        return maBacSiMoi;
    }

    public void setMaBacSiMoi(Integer maBacSiMoi) {
        this.maBacSiMoi = maBacSiMoi;
    }

    public Integer getMaAdminThucHien() {
        return maAdminThucHien;
    }

    public void setMaAdminThucHien(Integer maAdminThucHien) {
        this.maAdminThucHien = maAdminThucHien;
    }

    public String getTenAdminThucHien() {
        return tenAdminThucHien;
    }

    public void setTenAdminThucHien(String tenAdminThucHien) {
        this.tenAdminThucHien = tenAdminThucHien;
    }

    public String getLyDo() {
        return lyDo;
    }

    public void setLyDo(String lyDo) {
        this.lyDo = lyDo;
    }

    public LocalDateTime getNgayDieuPhoi() {
        return ngayDieuPhoi;
    }

    public void setNgayDieuPhoi(LocalDateTime ngayDieuPhoi) {
        this.ngayDieuPhoi = ngayDieuPhoi;
    }
}