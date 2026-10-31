package QuanLyBenhVien.Entity;

import jakarta.persistence.*;

@Entity
@Table(name = "NhomQuyen")
public class Quyen {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaQuyen")
    private Integer MaQuyen;

    @Column(name = "TenQuyen", nullable = false, length = 100)
    private String TenQuyen;

    @Column(name = "MoTa", length = 255)
    private String MoTa;

    public Integer getMaQuyen() {
        return MaQuyen;
    }

    public void setMaQuyen(Integer maQuyen) {
        this.MaQuyen = maQuyen;
    }

    public String getTenQuyen() {
        return TenQuyen;
    }

    public void setTenQuyen(String tenQuyen) {
        this.TenQuyen = tenQuyen;
    }

    public String getMoTa() {
        return MoTa;
    }

    public void setMoTa(String moTa) {
        this.MoTa = moTa;
    }
}