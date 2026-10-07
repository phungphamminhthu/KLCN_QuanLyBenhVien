package QuanLyBenhVien.Entity;

import jakarta.persistence.*;

import java.math.BigDecimal;

@Entity
@Table(name = "ChiTietKetQua")
public class ChiTietKetQua {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaChiTietKetQua")
    private Integer maChiTietKetQua;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "MaKetQua", nullable = false)
    private KetQuaDichVu ketQuaDichVu;

    @Column(name = "TenChiSo", nullable = false, length = 255)
    private String tenChiSo;

    @Column(name = "GiaTri", precision = 15, scale = 4)
    private BigDecimal giaTri;

    @Column(name = "DonVi", length = 50)
    private String donVi;

    @Column(name = "GiaTriThamChieu", length = 255)
    private String giaTriThamChieu;

    @Column(name = "TrangThai", length = 50)
    private String trangThai;

    public ChiTietKetQua() {
    }

    public Integer getMaChiTietKetQua() {
        return maChiTietKetQua;
    }

    public void setMaChiTietKetQua(Integer maChiTietKetQua) {
        this.maChiTietKetQua = maChiTietKetQua;
    }

    public KetQuaDichVu getKetQuaDichVu() {
        return ketQuaDichVu;
    }

    public void setKetQuaDichVu(KetQuaDichVu ketQuaDichVu) {
        this.ketQuaDichVu = ketQuaDichVu;
    }

    public String getTenChiSo() {
        return tenChiSo;
    }

    public void setTenChiSo(String tenChiSo) {
        this.tenChiSo = tenChiSo;
    }

    public BigDecimal getGiaTri() {
        return giaTri;
    }

    public void setGiaTri(BigDecimal giaTri) {
        this.giaTri = giaTri;
    }

    public String getDonVi() {
        return donVi;
    }

    public void setDonVi(String donVi) {
        this.donVi = donVi;
    }

    public String getGiaTriThamChieu() {
        return giaTriThamChieu;
    }

    public void setGiaTriThamChieu(String giaTriThamChieu) {
        this.giaTriThamChieu = giaTriThamChieu;
    }

    public String getTrangThai() {
        return trangThai;
    }

    public void setTrangThai(String trangThai) {
        this.trangThai = trangThai;
    }
}