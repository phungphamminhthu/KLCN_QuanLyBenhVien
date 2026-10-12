package QuanLyBenhVien.Entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "KhoThuoc")
public class KhoThuoc {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaKhoThuoc")
    private Integer maKhoThuoc;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "MaThuoc", nullable = false)
    private Thuoc thuoc;

    @Column(name = "SoLuongTon", nullable = false)
    private Integer soLuongTon = 0;

    @Column(name = "SoLo", nullable = false, length = 100)
    private String soLo;

    @Column(name = "HanSuDung", nullable = false)
    private LocalDate hanSuDung;

    @Column(name = "SoLuongToiThieu", nullable = false)
    private Integer soLuongToiThieu = 0;

    @Column(
            name = "ThoiGianCapNhatCuoi",
            nullable = false,
            insertable = false,
            updatable = false
    )
    private LocalDateTime thoiGianCapNhatCuoi;

    public Integer getMaKhoThuoc() {
        return maKhoThuoc;
    }

    public void setMaKhoThuoc(Integer maKhoThuoc) {
        this.maKhoThuoc = maKhoThuoc;
    }

    public Thuoc getThuoc() {
        return thuoc;
    }

    public void setThuoc(Thuoc thuoc) {
        this.thuoc = thuoc;
    }

    public Integer getSoLuongTon() {
        return soLuongTon;
    }

    public void setSoLuongTon(Integer soLuongTon) {
        this.soLuongTon = soLuongTon;
    }

    public String getSoLo() {
        return soLo;
    }

    public void setSoLo(String soLo) {
        this.soLo = soLo;
    }

    public LocalDate getHanSuDung() {
        return hanSuDung;
    }

    public void setHanSuDung(LocalDate hanSuDung) {
        this.hanSuDung = hanSuDung;
    }

    public Integer getSoLuongToiThieu() {
        return soLuongToiThieu;
    }

    public void setSoLuongToiThieu(Integer soLuongToiThieu) {
        this.soLuongToiThieu = soLuongToiThieu;
    }

    public LocalDateTime getThoiGianCapNhatCuoi() {
        return thoiGianCapNhatCuoi;
    }

    public void setThoiGianCapNhatCuoi(LocalDateTime thoiGianCapNhatCuoi) {
        this.thoiGianCapNhatCuoi = thoiGianCapNhatCuoi;
    }
}
