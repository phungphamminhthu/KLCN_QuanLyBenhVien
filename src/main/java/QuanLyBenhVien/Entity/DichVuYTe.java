package QuanLyBenhVien.Entity;

import jakarta.persistence.*;

import java.math.BigDecimal;

@Entity
@Table(name = "DichVuYTe")
public class DichVuYTe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaDichVu")
    private Integer maDichVu;

    @Column(name = "TenDichVu", nullable = false, length = 255)
    private String tenDichVu;

    @Column(name = "LoaiDichVu", length = 100)
    private String loaiDichVu;

    @Column(name = "MoTa", length = 255)
    private String moTa;

    @Column(name = "Gia", nullable = false, precision = 15, scale = 2)
    private BigDecimal gia;

    public DichVuYTe() {
    }

    public Integer getMaDichVu() {
        return maDichVu;
    }

    public void setMaDichVu(Integer maDichVu) {
        this.maDichVu = maDichVu;
    }

    public String getTenDichVu() {
        return tenDichVu;
    }

    public void setTenDichVu(String tenDichVu) {
        this.tenDichVu = tenDichVu;
    }

    public String getLoaiDichVu() {
        return loaiDichVu;
    }

    public void setLoaiDichVu(String loaiDichVu) {
        this.loaiDichVu = loaiDichVu;
    }

    public String getMoTa() {
        return moTa;
    }

    public void setMoTa(String moTa) {
        this.moTa = moTa;
    }

    public BigDecimal getGia() {
        return gia;
    }

    public void setGia(BigDecimal gia) {
        this.gia = gia;
    }
}