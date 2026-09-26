package QuanLyBenhVien.Entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "HoSoBenhAn")
public class HoSoBenhAn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaHoSoBenhAn")
    private Integer maHoSoBenhAn;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "MaLichKham", nullable = false, unique = true)
    private LichDangKyKham lichDangKyKham;

    @Column(name = "TrieuChung", columnDefinition = "TEXT")
    private String trieuChung;

    @Column(name = "ChanDoan", columnDefinition = "TEXT")
    private String chanDoan;

    @Column(name = "KetLuan", columnDefinition = "TEXT")
    private String ketLuan;

    @Column(name = "HuongDieuTri", columnDefinition = "TEXT")
    private String huongDieuTri;

    @Column(name = "QRToken", length = 255, unique = true)
    private String qrToken;

    @Column(name = "NgayTaiKham")
    private LocalDate ngayTaiKham;

    @Column(name = "GhiChuTaiKham", length = 255)
    private String ghiChuTaiKham;

    @Column(name = "TrangThai", nullable = false, length = 50)
    private String trangThai;

    public Integer getMaHoSoBenhAn() {
        return maHoSoBenhAn;
    }

    public void setMaHoSoBenhAn(Integer maHoSoBenhAn) {
        this.maHoSoBenhAn = maHoSoBenhAn;
    }

    public LichDangKyKham getLichDangKyKham() {
        return lichDangKyKham;
    }

    public void setLichDangKyKham(LichDangKyKham lichDangKyKham) {
        this.lichDangKyKham = lichDangKyKham;
    }

    public String getTrieuChung() {
        return trieuChung;
    }

    public void setTrieuChung(String trieuChung) {
        this.trieuChung = trieuChung;
    }

    public String getChanDoan() {
        return chanDoan;
    }

    public void setChanDoan(String chanDoan) {
        this.chanDoan = chanDoan;
    }

    public String getKetLuan() {
        return ketLuan;
    }

    public void setKetLuan(String ketLuan) {
        this.ketLuan = ketLuan;
    }

    public String getHuongDieuTri() {
        return huongDieuTri;
    }

    public void setHuongDieuTri(String huongDieuTri) {
        this.huongDieuTri = huongDieuTri;
    }

    public String getQrToken() {
        return qrToken;
    }

    public void setQrToken(String qrToken) {
        this.qrToken = qrToken;
    }

    public LocalDate getNgayTaiKham() {
        return ngayTaiKham;
    }

    public void setNgayTaiKham(LocalDate ngayTaiKham) {
        this.ngayTaiKham = ngayTaiKham;
    }

    public String getGhiChuTaiKham() {
        return ghiChuTaiKham;
    }

    public void setGhiChuTaiKham(String ghiChuTaiKham) {
        this.ghiChuTaiKham = ghiChuTaiKham;
    }

    public String getTrangThai() {
        return trangThai;
    }

    public void setTrangThai(String trangThai) {
        this.trangThai = trangThai;
    }
}