package QuanLyBenhVien.Entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "SoThuTu")
public class SoThuTu {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaSoThuTu")
    private Integer maSoThuTu;

    @Column(name = "SoThuTu", nullable = false)
    private Integer soThuTu;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "MaKhoa", nullable = false)
    private Khoa khoa;

    @Column(name = "NgayCapSo", nullable = false)
    private LocalDate ngayCapSo;

    @Column(name = "TrangThai", length = 50)
    private String trangThai;

    @Column(name = "ThoiGianTao", nullable = false)
    private LocalDateTime thoiGianTao;

    public Integer getMaSoThuTu() {
        return maSoThuTu;
    }

    public void setMaSoThuTu(Integer maSoThuTu) {
        this.maSoThuTu = maSoThuTu;
    }

    public Integer getSoThuTu() {
        return soThuTu;
    }

    public void setSoThuTu(Integer soThuTu) {
        this.soThuTu = soThuTu;
    }

    public Khoa getKhoa() {
        return khoa;
    }

    public void setKhoa(Khoa khoa) {
        this.khoa = khoa;
    }

    public LocalDate getNgayCapSo() {
        return ngayCapSo;
    }

    public void setNgayCapSo(LocalDate ngayCapSo) {
        this.ngayCapSo = ngayCapSo;
    }

    public String getTrangThai() {
        return trangThai;
    }

    public void setTrangThai(String trangThai) {
        this.trangThai = trangThai;
    }

    public LocalDateTime getThoiGianTao() {
        return thoiGianTao;
    }

    public void setThoiGianTao(LocalDateTime thoiGianTao) {
        this.thoiGianTao = thoiGianTao;
    }
}