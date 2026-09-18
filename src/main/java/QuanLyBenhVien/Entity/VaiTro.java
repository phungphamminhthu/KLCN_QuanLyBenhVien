package QuanLyBenhVien.Entity;

import jakarta.persistence.*;

@Entity
@Table(name = "VaiTro")
public class VaiTro {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaVaiTro")
    private Integer MaVaiTro;

    @Column(name = "TenVaiTro", nullable = false)
    private String TenVaiTro;

    @Column(name = "MoTa")
    private String MoTa;

    public Integer getMaVaiTro() {
        return MaVaiTro;
    }

    public void setMaVaiTro(Integer MaVaiTro) {
        this.MaVaiTro = MaVaiTro;
    }

    public String getTenVaiTro() {
        return TenVaiTro;
    }

    public void setTenVaiTro(String TenVaiTro) {
        this.TenVaiTro = TenVaiTro;
    }

    public String getMoTa() {
        return MoTa;
    }

    public void setMoTa(String MoTa) {
        this.MoTa = MoTa;
    }
}
