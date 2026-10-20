
package QuanLyBenhVien.Entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "CTHoaDon")
public class CTHoaDon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaCTHoaDon")
    private Integer maCTHoaDon;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "MaHoaDon", nullable = false)
    private HoaDon hoaDon;

    @Column(name = "MaChiDinh")
    private Integer maChiDinh;

    @Column(name = "MaCTDonThuoc")
    private Integer maCTDonThuoc;

    @Column(name = "NoiDung", length = 255)
    private String noiDung;

    @Column(name = "SoLuong", nullable = false)
    private Integer soLuong = 1;

    @Column(name = "DonGia", nullable = false,
            precision = 15, scale = 2)
    private BigDecimal donGia = BigDecimal.ZERO;

    @Column(name = "ThanhTien", nullable = false,
            precision = 15, scale = 2)
    private BigDecimal thanhTien = BigDecimal.ZERO;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "MaDichVu")
    private DichVuYTe dichVuYTe;

    public Integer getMaCTHoaDon() {
        return maCTHoaDon;
    }

    public void setMaCTHoaDon(Integer maCTHoaDon) {
        this.maCTHoaDon = maCTHoaDon;
    }

    public HoaDon getHoaDon() {
        return hoaDon;
    }

    public void setHoaDon(HoaDon hoaDon) {
        this.hoaDon = hoaDon;
    }

    public Integer getMaChiDinh() {
        return maChiDinh;
    }

    public void setMaChiDinh(Integer maChiDinh) {
        this.maChiDinh = maChiDinh;
    }

    public Integer getMaCTDonThuoc() {
        return maCTDonThuoc;
    }

    public void setMaCTDonThuoc(Integer maCTDonThuoc) {
        this.maCTDonThuoc = maCTDonThuoc;
    }

    public String getNoiDung() {
        return noiDung;
    }

    public void setNoiDung(String noiDung) {
        this.noiDung = noiDung;
    }

    public Integer getSoLuong() {
        return soLuong;
    }

    public void setSoLuong(Integer soLuong) {
        this.soLuong = soLuong;
    }

    public BigDecimal getDonGia() {
        return donGia;
    }

    public void setDonGia(BigDecimal donGia) {
        this.donGia = donGia;
    }

    public BigDecimal getThanhTien() {
        return thanhTien;
    }

    public void setThanhTien(BigDecimal thanhTien) {
        this.thanhTien = thanhTien;
    }

    public DichVuYTe getDichVuYTe() {
        return dichVuYTe;
    }

    public void setDichVuYTe(DichVuYTe dichVuYTe) {
        this.dichVuYTe = dichVuYTe;
    }
}
