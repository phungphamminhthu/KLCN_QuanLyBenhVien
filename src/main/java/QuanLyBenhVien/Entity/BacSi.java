package QuanLyBenhVien.Entity;

import jakarta.persistence.*;

@Entity
@Table(name = "BacSi")
public class BacSi {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaBacSi")
    private Integer maBacSi;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(
            name = "MaNguoiDung",
            nullable = false,
            unique = true,
            foreignKey = @ForeignKey(name = "FK_BacSi_NguoiDung")
    )
    private NguoiDung nguoiDung;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(
            name = "MaKhoa",
            nullable = false,
            foreignKey = @ForeignKey(name = "FK_BacSi_Khoa")
    )
    private Khoa khoa;

    @Column(name = "ChuyenMon", length = 255)
    private String chuyenMon;

    @Column(name = "TrinhDo", length = 100)
    private String trinhDo;

    @Column(name = "SoChungChiHanhNghe", length = 100)
    private String soChungChiHanhNghe;

    @Column(name = "TrangThai", nullable = false)
    private Boolean trangThai = true;

    public Integer getMaBacSi() {
        return maBacSi;
    }

    public void setMaBacSi(Integer maBacSi) {
        this.maBacSi = maBacSi;
    }

    public NguoiDung getNguoiDung() {
        return nguoiDung;
    }

    public void setNguoiDung(NguoiDung nguoiDung) {
        this.nguoiDung = nguoiDung;
    }

    public Khoa getKhoa() {
        return khoa;
    }

    public void setKhoa(Khoa khoa) {
        this.khoa = khoa;
    }

    public String getChuyenMon() {
        return chuyenMon;
    }

    public void setChuyenMon(String chuyenMon) {
        this.chuyenMon = chuyenMon;
    }

    public String getTrinhDo() {
        return trinhDo;
    }

    public void setTrinhDo(String trinhDo) {
        this.trinhDo = trinhDo;
    }

    public String getSoChungChiHanhNghe() {
        return soChungChiHanhNghe;
    }

    public void setSoChungChiHanhNghe(String soChungChiHanhNghe) {
        this.soChungChiHanhNghe = soChungChiHanhNghe;
    }

    public Boolean getTrangThai() {
        return trangThai;
    }

    public void setTrangThai(Boolean trangThai) {
        this.trangThai = trangThai;
    }
}