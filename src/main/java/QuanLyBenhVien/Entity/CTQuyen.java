package QuanLyBenhVien.Entity;

import jakarta.persistence.*;

@Entity
@Table(
        name = "CTQuyen",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "UQ_CTQuyen_VaiTro_Quyen",
                        columnNames = {"MaVaiTro", "MaQuyen"}
                )
        }
)
public class CTQuyen {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaChiTietQuyen")
    private Integer MaChiTietQuyen;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "MaVaiTro", nullable = false)
    private VaiTro VaiTro;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "MaQuyen", nullable = false)
    private Quyen Quyen;

    @Column(name = "QuyenXem", nullable = false)
    private Boolean QuyenXem = false;

    @Column(name = "QuyenThem", nullable = false)
    private Boolean QuyenThem = false;

    @Column(name = "QuyenSua", nullable = false)
    private Boolean QuyenSua = false;

    @Column(name = "QuyenXoa", nullable = false)
    private Boolean QuyenXoa = false;

    public Integer getMaChiTietQuyen() {
        return MaChiTietQuyen;
    }

    public void setMaChiTietQuyen(Integer maChiTietQuyen) {
        this.MaChiTietQuyen = maChiTietQuyen;
    }

    public VaiTro getVaiTro() { return VaiTro; }
    public void setVaiTro(VaiTro VaiTro) { this.VaiTro = VaiTro; }

    public Quyen getQuyen() { return Quyen; }
    public void setQuyen(Quyen Quyen) { this.Quyen = Quyen; }

    public Boolean getQuyenXem() { return QuyenXem; }
    public void setQuyenXem(Boolean QuyenXem) { this.QuyenXem = QuyenXem; }

    public Boolean getQuyenThem() { return QuyenThem; }
    public void setQuyenThem(Boolean QuyenThem) { this.QuyenThem = QuyenThem; }

    public Boolean getQuyenSua() { return QuyenSua; }
    public void setQuyenSua(Boolean QuyenSua) { this.QuyenSua = QuyenSua; }

    public Boolean getQuyenXoa() { return QuyenXoa; }
    public void setQuyenXoa(Boolean QuyenXoa) { this.QuyenXoa = QuyenXoa; }
}