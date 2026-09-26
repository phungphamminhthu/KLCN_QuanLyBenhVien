package QuanLyBenhVien.Entity;

import jakarta.persistence.*;

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
}