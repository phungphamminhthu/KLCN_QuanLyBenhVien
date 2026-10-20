package QuanLyBenhVien.Entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "Khoa")
public class Khoa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaKhoa")
    private Integer maKhoa;

    @Column(name = "TenKhoa", nullable = false, length = 100)
    private String tenKhoa;

    @Column(name = "MoTa", length = 255)
    private String moTa;

    @Column(name = "GiaKham", nullable = false, precision = 12, scale = 2)
    private BigDecimal giaKham = BigDecimal.ZERO;

    public Khoa() {
    }

    public Khoa(String tenKhoa, String moTa) {
        this.tenKhoa = tenKhoa;
        this.moTa = moTa;
        this.giaKham = BigDecimal.ZERO;
    }

    public Integer getMaKhoa() {
        return maKhoa;
    }

    public void setMaKhoa(Integer maKhoa) {
        this.maKhoa = maKhoa;
    }

    public String getTenKhoa() {
        return tenKhoa;
    }

    public void setTenKhoa(String tenKhoa) {
        this.tenKhoa = tenKhoa;
    }

    public String getMoTa() {
        return moTa;
    }

    public void setMoTa(String moTa) {
        this.moTa = moTa;
    }

    public BigDecimal getGiaKham() {
        return giaKham;
    }

    public void setGiaKham(BigDecimal giaKham) {
        this.giaKham = giaKham;
    }
}
