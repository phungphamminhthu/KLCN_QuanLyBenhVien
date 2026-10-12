package QuanLyBenhVien.Entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "LichDangKyKham")
public class LichDangKyKham {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaLichKham")
    private Integer maLichKham;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "MaBenhNhan", nullable = false)
    private BenhNhan benhNhan;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "MaBacSi", nullable = false)
    private BacSi bacSi;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "MaKhoa", nullable = false)
    private Khoa khoa;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "MaSoThuTu", nullable = false)
    private SoThuTu soThuTu;

    @Column(name = "NgayKham", nullable = false)
    private LocalDate ngayKham;

    @Column(name = "GioKham", nullable = false)
    private LocalTime gioKham;

    @Column(name = "LyDoKham", length = 255)
    private String lyDoKham;

    @Column(name = "NgayTao", nullable = false)
    private LocalDateTime ngayTao;

    @Column(name = "TrangThai", nullable = false, length = 50)
    private String trangThai;

    public Integer getMaLichKham() {
        return maLichKham;
    }

    public void setMaLichKham(Integer maLichKham) {
        this.maLichKham = maLichKham;
    }

    public BenhNhan getBenhNhan() {
        return benhNhan;
    }

    public void setBenhNhan(BenhNhan benhNhan) {
        this.benhNhan = benhNhan;
    }

    public BacSi getBacSi() {
        return bacSi;
    }

    public void setBacSi(BacSi bacSi) {
        this.bacSi = bacSi;
    }

    public Khoa getKhoa() {
        return khoa;
    }

    public void setKhoa(Khoa khoa) {
        this.khoa = khoa;
    }

    public SoThuTu getSoThuTu() {
        return soThuTu;
    }

    public void setSoThuTu(SoThuTu soThuTu) {
        this.soThuTu = soThuTu;
    }

    public LocalDate getNgayKham() {
        return ngayKham;
    }

    public void setNgayKham(LocalDate ngayKham) {
        this.ngayKham = ngayKham;
    }

    public LocalTime getGioKham() {
        return gioKham;
    }

    public void setGioKham(LocalTime gioKham) {
        this.gioKham = gioKham;
    }

    public String getLyDoKham() {
        return lyDoKham;
    }

    public void setLyDoKham(String lyDoKham) {
        this.lyDoKham = lyDoKham;
    }

    public LocalDateTime getNgayTao() {
        return ngayTao;
    }

    public void setNgayTao(LocalDateTime ngayTao) {
        this.ngayTao = ngayTao;
    }

    public String getTrangThai() {
        return trangThai;
    }

    public void setTrangThai(String trangThai) {
        this.trangThai = trangThai;
    }
}